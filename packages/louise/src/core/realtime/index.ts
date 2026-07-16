// Copyright (c) 2026 BowenLabs. Louise Toolkit is MIT licensed.
//
// louise-toolkit/realtime — per-page live editing session over a Durable Object
// (ADR 0002 / #71). This is PR 1: the hibernatable-WebSocket **skeleton** plus
// the authed upgrade route. There is NO persistence yet (a later ADR slice) — the
// session broadcasts presence and answers a ping/hello handshake.
//
// Following the louise-toolkit/workflows pattern, the SITE owns the `DurableObject`
// subclass + the wrangler binding (it imports `cloudflare:workers`); this module
// provides the session LOGIC the subclass delegates to (`createEditSession`) and
// the `WorkerRoute` that guards + forwards the upgrade. The runtime types
// (`DurableObjectState`, `DurableObjectNamespace`, `WebSocket`, `WebSocketPair`)
// are ambient (@cloudflare/workers-types), so nothing runtime-only is imported.
//
//   // site worker.ts (owns the class + wrangler `durable_objects` binding):
//   import { DurableObject } from "cloudflare:workers";
//   import { createEditSession } from "louise-toolkit/realtime";
//   export class EditSessionDO extends DurableObject<Env> {
//     #s = createEditSession(this.ctx);
//     fetch(r: Request) { return this.#s.fetch(r); }
//     webSocketMessage(ws: WebSocket, m: string | ArrayBuffer) { this.#s.webSocketMessage(ws, m); }
//     webSocketClose(ws: WebSocket, c: number, r: string, w: boolean) { this.#s.webSocketClose(ws, c, r, w); }
//     webSocketError(ws: WebSocket, e: unknown) { this.#s.webSocketError(ws, e); }
//   }

import type { WorkerRoute } from "../worker/index.js";
import { type EditorRouteEnv, guardEditor, json, type ResolveEditor } from "../editor/shared.js";

/** WS envelope version; bump if the message shape changes (clients check `v`). */
export const REALTIME_PROTOCOL_VERSION = 1;

/** Who is in a session — broadcast for presence. Resolved from the editor session
 *  by the route (see {@link realtimeRoute}), never trusted from the client. */
export interface RealtimePeer {
  id: string;
  name: string;
}

/** Server → client messages. Skeleton set (PR 1): a `welcome` handshake, a
 *  `presence` diff, and a `pong` liveness reply. The change/claim/release
 *  protocol lands with the persistence slice. */
export type RealtimeServerMessage =
  | { v: number; t: "welcome"; you: RealtimePeer; peers: RealtimePeer[] }
  | { v: number; t: "presence"; peers: RealtimePeer[] }
  | { v: number; t: "pong" };

/** Client → server messages (PR 1). */
export type RealtimeClientMessage = { v?: number; t: "hello" } | { v?: number; t: "ping" };

// The route stamps these on the forwarded upgrade URL so the DO can attach the
// server-resolved identity — the client never provides its own presence. Carried
// as query params (not headers): forwarding a WebSocket upgrade must reuse the
// original request so its `Upgrade`/`Connection` headers survive — those are
// forbidden header names, so they can't be re-set on a reconstructed request —
// and the DO is only reachable through this authed route, never by the client.
const EDITOR_ID_PARAM = "_eid";
const EDITOR_NAME_PARAM = "_ename";

const DEFAULT_PEER: RealtimePeer = { id: "", name: "Editor" };

/** The peer attached to a socket (set at accept time), or a safe default. */
function peerOf(ws: WebSocket): RealtimePeer {
  return (ws.deserializeAttachment() as RealtimePeer | null) ?? DEFAULT_PEER;
}

/** The presence message for a set of connected sockets. Exported for tests. */
export function presenceMessage(sockets: readonly WebSocket[]): RealtimeServerMessage {
  return { v: REALTIME_PROTOCOL_VERSION, t: "presence", peers: sockets.map(peerOf) };
}

/** Parse a raw WS frame into a known client message, or `null`. Exported for tests. */
export function parseClientMessage(raw: string | ArrayBuffer): RealtimeClientMessage | null {
  try {
    const text = typeof raw === "string" ? raw : new TextDecoder().decode(raw);
    const msg = JSON.parse(text) as { t?: unknown };
    if (msg && (msg.t === "hello" || msg.t === "ping")) return msg as RealtimeClientMessage;
    return null;
  } catch {
    return null;
  }
}

/** The hibernatable-WebSocket handlers a site's DO subclass delegates to. */
export interface EditSession {
  fetch(request: Request): Response;
  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void;
  webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): void;
  webSocketError(ws: WebSocket, error: unknown): void;
}

/**
 * Build the per-page edit-session logic over a Durable Object's `ctx`
 * (`DurableObjectState`). PR 1 is a presence skeleton:
 *  - **connect** → accept a *hibernatable* socket (`ctx.acceptWebSocket`), attach
 *    the editor identity from the forwarded headers, broadcast presence;
 *  - **`hello`** → reply `welcome` (you + current peers); **`ping`** → `pong`;
 *  - **disconnect** → re-broadcast presence to the remaining sockets.
 *
 * Presence survives hibernation because it's rebuilt from `ctx.getWebSockets()` +
 * each socket's `serializeAttachment`, never in-memory-only state.
 */
export function createEditSession(ctx: DurableObjectState): EditSession {
  const send = (ws: WebSocket, msg: RealtimeServerMessage): void => {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      /* socket already gone */
    }
  };
  const broadcast = (sockets: readonly WebSocket[], msg: RealtimeServerMessage): void => {
    const raw = JSON.stringify(msg);
    for (const ws of sockets) {
      try {
        ws.send(raw);
      } catch {
        /* skip a closed socket */
      }
    }
  };

  return {
    fetch(request) {
      if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
        return new Response("Expected a WebSocket upgrade", { status: 426 });
      }
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      const params = new URL(request.url).searchParams;
      const peer: RealtimePeer = {
        id: params.get(EDITOR_ID_PARAM) ?? "",
        name: params.get(EDITOR_NAME_PARAM) || "Editor",
      };
      // Hibernatable accept — the DO can sleep between messages without dropping
      // this client. Attach identity so presence rebuilds after a wake.
      ctx.acceptWebSocket(server);
      server.serializeAttachment(peer);
      broadcast(ctx.getWebSockets(), presenceMessage(ctx.getWebSockets()));
      return new Response(null, { status: 101, webSocket: client });
    },

    webSocketMessage(ws, message) {
      const msg = parseClientMessage(message);
      if (!msg) return;
      if (msg.t === "hello") {
        send(ws, {
          v: REALTIME_PROTOCOL_VERSION,
          t: "welcome",
          you: peerOf(ws),
          peers: ctx.getWebSockets().map(peerOf),
        });
      } else if (msg.t === "ping") {
        send(ws, { v: REALTIME_PROTOCOL_VERSION, t: "pong" });
      }
    },

    webSocketClose(ws, code, reason) {
      try {
        ws.close(code, reason);
      } catch {
        /* already closing */
      }
      // Exclude the closing socket — it may still appear in getWebSockets() here.
      const others = ctx.getWebSockets().filter((s) => s !== ws);
      broadcast(others, presenceMessage(others));
    },

    webSocketError(ws) {
      try {
        ws.close(1011, "error");
      } catch {
        /* already closing */
      }
      const others = ctx.getWebSockets().filter((s) => s !== ws);
      broadcast(others, presenceMessage(others));
    },
  };
}

export interface RealtimeRouteConfig<Env extends EditorRouteEnv = EditorRouteEnv> {
  /** Resolve the editor session (site wraps its own auth). */
  resolveEditor: ResolveEditor<Env>;
  /**
   * The DO namespace binding — typically `(env) => env.EDIT_SESSION`. Return
   * `undefined` (binding not provisioned) and the route answers 503, so realtime
   * is cleanly absent rather than erroring.
   */
  namespace: (env: Env) => DurableObjectNamespace | undefined;
  /** Mount base. Default `/api/louise/realtime`. */
  path?: string;
}

/**
 * Build the realtime upgrade route: `GET /api/louise/realtime/:slug/:id` (a
 * WebSocket handshake). It guards the upgrade as a same-origin, session-gated
 * mutation (a browser sends `Origin` on a WS handshake), then forwards it to the
 * per-page Durable Object (`idFromName("<slug>:<id>")`), stamping the
 * server-resolved editor identity so the DO never trusts the client for presence.
 * Returns `undefined` for a path it doesn't own so `composeWorker` falls through.
 */
export function realtimeRoute<Env extends EditorRouteEnv = EditorRouteEnv>(
  cfg: RealtimeRouteConfig<Env>,
): WorkerRoute<Env> {
  const base = cfg.path ?? "/api/louise/realtime";

  return async (request, env) => {
    const url = new URL(request.url);
    if (!url.pathname.startsWith(`${base}/`)) return undefined;
    const [slug, idStr, ...extra] = url.pathname.slice(base.length + 1).split("/");
    if (!slug || !idStr || extra.length > 0) return undefined;

    if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
      return json({ error: "Expected a WebSocket upgrade" }, 426);
    }
    const ns = cfg.namespace(env);
    if (!ns) return json({ error: "Realtime not available" }, 503);

    const g = await guardEditor(request, env, cfg.resolveEditor, true);
    if ("response" in g) return g.response;

    const id = Number(idStr);
    if (!Number.isInteger(id)) return json({ error: "Bad id" }, 400);

    // One DO per page. Forward the *original* request (so the WebSocket upgrade
    // headers survive), just re-pointed at a URL carrying the resolved identity.
    const stub = ns.get(ns.idFromName(`${slug}:${id}`));
    const doUrl = new URL(url);
    doUrl.searchParams.set(EDITOR_ID_PARAM, g.editor.userId);
    doUrl.searchParams.set(EDITOR_NAME_PARAM, g.editor.name ?? "Editor");
    return stub.fetch(new Request(doUrl, request));
  };
}
