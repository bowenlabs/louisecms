import { describe, expect, it, vi } from "vitest";
import type { EditorSession } from "../../src/core/auth/index.js";
import {
  createEditSession,
  parseClientMessage,
  presenceMessage,
  REALTIME_PROTOCOL_VERSION,
  type RealtimePeer,
  realtimeRoute,
} from "../../src/core/realtime/index.js";

const noopD1 = { prepare: () => ({ bind: () => ({}) }) } as unknown as D1Database;
const editor: EditorSession = { userId: "u1", email: "e@x.com", name: "Ada", role: "admin" };
const ctx = {} as ExecutionContext;

// ── Route ────────────────────────────────────────────────────────────────────

/** A DO namespace whose stub records the forwarded upgrade request. */
function fakeNamespace() {
  let forwarded: Request | undefined;
  let namedId: string | undefined;
  const ns = {
    idFromName: (name: string) => {
      namedId = name;
      return { name } as unknown as DurableObjectId;
    },
    get: () =>
      ({
        // A real DO answers 101 (Switching Protocols); undici's Response can't
        // represent that outside the Workers runtime, so the fake returns 200 and
        // records the forwarded upgrade instead.
        fetch: async (req: Request) => {
          forwarded = req;
          return new Response(null, { status: 200 });
        },
      }) as unknown as DurableObjectStub,
  } as unknown as DurableObjectNamespace;
  return { ns, forwarded: () => forwarded, namedId: () => namedId };
}

const route = (opts: { editor?: EditorSession | null; ns?: DurableObjectNamespace | undefined }) =>
  realtimeRoute<{ DB: D1Database }>({
    resolveEditor: () => ("editor" in opts ? (opts.editor ?? null) : editor),
    namespace: () => ("ns" in opts ? opts.ns : fakeNamespace().ns),
  });

const wsReq = (path: string, upgrade = true, origin = "https://site.example") =>
  new Request(`https://site.example${path}`, {
    headers: {
      origin,
      ...(upgrade ? { upgrade: "websocket" } : {}),
    },
  });

const env = { DB: noopD1 };

describe("realtimeRoute", () => {
  it("falls through on paths it doesn't own", async () => {
    const r = route({});
    expect(await r(wsReq("/other"), env, ctx)).toBeUndefined();
    expect(await r(wsReq("/api/louise/realtime"), env, ctx)).toBeUndefined();
    expect(await r(wsReq("/api/louise/realtime/pages"), env, ctx)).toBeUndefined();
    expect(await r(wsReq("/api/louise/realtime/pages/1/extra"), env, ctx)).toBeUndefined();
  });

  it("426s a non-WebSocket request", async () => {
    const res = (await route({})(
      wsReq("/api/louise/realtime/pages/1", false),
      env,
      ctx,
    )) as Response;
    expect(res.status).toBe(426);
  });

  it("503s when the DO namespace binding is absent", async () => {
    const res = (await route({ ns: undefined })(
      wsReq("/api/louise/realtime/pages/1"),
      env,
      ctx,
    )) as Response;
    expect(res.status).toBe(503);
  });

  it("denies an unauthenticated upgrade", async () => {
    const res = (await route({ editor: null })(
      wsReq("/api/louise/realtime/pages/1"),
      env,
      ctx,
    )) as Response;
    expect([401, 403]).toContain(res.status);
  });

  it("400s a non-integer id", async () => {
    const res = (await route({})(wsReq("/api/louise/realtime/pages/abc"), env, ctx)) as Response;
    expect(res.status).toBe(400);
  });

  it("forwards to the per-page DO with the server-resolved editor identity", async () => {
    const fake = fakeNamespace();
    const r = realtimeRoute<{ DB: D1Database }>({
      resolveEditor: () => editor,
      namespace: () => fake.ns,
    });
    const res = (await r(wsReq("/api/louise/realtime/pages/42"), env, ctx)) as Response;
    expect(res.status).toBe(200); // the stub's response is returned verbatim (101 in prod)
    expect(fake.namedId()).toBe("pages:42"); // one DO per page
    const fwd = fake.forwarded();
    // The original request is forwarded (upgrade preserved), re-pointed at a URL
    // carrying the server-resolved identity.
    expect(fwd?.headers.get("upgrade")).toBe("websocket");
    const params = new URL(fwd?.url ?? "").searchParams;
    expect(params.get("_eid")).toBe("u1");
    expect(params.get("_ename")).toBe("Ada");
  });
});

// ── Session logic (fake ctx + sockets) ───────────────────────────────────────

/** A fake hibernatable socket recording sends + carrying an attachment. */
function socket(peer: RealtimePeer) {
  const sent: string[] = [];
  const ws = {
    send: (m: string) => sent.push(m),
    close: vi.fn(),
    serializeAttachment: vi.fn(),
    deserializeAttachment: () => peer,
  } as unknown as WebSocket;
  return { ws, sent };
}

/** A fake DurableObjectState exposing a mutable socket list. */
function fakeCtx(sockets: WebSocket[]) {
  return {
    acceptWebSocket: vi.fn(),
    getWebSockets: () => sockets,
  } as unknown as DurableObjectState;
}

const parse = (raw: string) =>
  JSON.parse(raw) as { t: string; peers?: RealtimePeer[]; you?: RealtimePeer };

describe("createEditSession — presence skeleton", () => {
  it("answers `hello` with a welcome carrying you + all peers", () => {
    const a = socket({ id: "u1", name: "Ada" });
    const b = socket({ id: "u2", name: "Bo" });
    const session = createEditSession(fakeCtx([a.ws, b.ws]));

    session.webSocketMessage(a.ws, JSON.stringify({ t: "hello" }));

    expect(a.sent).toHaveLength(1);
    const msg = parse(a.sent[0]);
    expect(msg.t).toBe("welcome");
    expect(msg.you).toEqual({ id: "u1", name: "Ada" });
    expect(msg.peers).toEqual([
      { id: "u1", name: "Ada" },
      { id: "u2", name: "Bo" },
    ]);
  });

  it("answers `ping` with a pong and ignores unknown frames", () => {
    const a = socket({ id: "u1", name: "Ada" });
    const session = createEditSession(fakeCtx([a.ws]));

    session.webSocketMessage(a.ws, JSON.stringify({ t: "ping" }));
    session.webSocketMessage(a.ws, JSON.stringify({ t: "bogus" }));
    session.webSocketMessage(a.ws, "not json");

    expect(a.sent).toHaveLength(1);
    expect(parse(a.sent[0]).t).toBe("pong");
  });

  it("re-broadcasts presence to the remaining sockets on close, excluding the leaver", () => {
    const a = socket({ id: "u1", name: "Ada" });
    const b = socket({ id: "u2", name: "Bo" });
    const sockets = [a.ws, b.ws];
    const ctxState = {
      acceptWebSocket: vi.fn(),
      // Model the runtime: the leaver may still appear here on close.
      getWebSockets: () => sockets,
    } as unknown as DurableObjectState;
    const session = createEditSession(ctxState);

    session.webSocketClose(a.ws, 1000, "bye", true);

    expect(a.ws.close).toHaveBeenCalled();
    // a (the leaver) got no presence frame; b did, listing only b.
    expect(a.sent).toHaveLength(0);
    expect(b.sent).toHaveLength(1);
    expect(parse(b.sent[0])).toMatchObject({ t: "presence", peers: [{ id: "u2", name: "Bo" }] });
  });

  it("returns 426 for a non-upgrade fetch", () => {
    const session = createEditSession(fakeCtx([]));
    const res = session.fetch(new Request("https://do/", { headers: {} }));
    expect(res.status).toBe(426);
  });
});

// ── Pure helpers ─────────────────────────────────────────────────────────────

describe("parseClientMessage / presenceMessage", () => {
  it("parses hello/ping and rejects everything else", () => {
    expect(parseClientMessage(JSON.stringify({ t: "hello" }))?.t).toBe("hello");
    expect(parseClientMessage(JSON.stringify({ t: "ping" }))?.t).toBe("ping");
    expect(parseClientMessage(JSON.stringify({ t: "change" }))).toBeNull();
    expect(parseClientMessage("{bad json")).toBeNull();
    expect(parseClientMessage(new TextEncoder().encode('{"t":"ping"}').buffer)?.t).toBe("ping");
  });

  it("builds a versioned presence message from sockets", () => {
    const a = socket({ id: "u1", name: "Ada" });
    const msg = presenceMessage([a.ws]);
    expect(msg).toEqual({
      v: REALTIME_PROTOCOL_VERSION,
      t: "presence",
      peers: [{ id: "u1", name: "Ada" }],
    });
  });
});
