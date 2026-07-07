import { describe, expect, it, vi } from "vitest";
import { composeWorker } from "../../src/core/worker/index.js";

const ctx = { waitUntil() {}, passThroughOnException() {} } as unknown as ExecutionContext;
// The Workers `ExportedHandler.fetch` expects the incoming-request flavor
// (IncomingRequestCfProperties); cast a plain Request to it for the tests.
type IncomingRequest = Parameters<NonNullable<ExportedHandler["fetch"]>>[0];
const req = () => new Request("https://site.example/x") as unknown as IncomingRequest;

describe("composeWorker", () => {
  it("runs routes in order and short-circuits on the first Response", async () => {
    const fallback = vi.fn(async () => new Response("fallback"));
    const r1 = vi.fn(async () => undefined); // pass
    const r2 = vi.fn(async () => new Response("hit"));
    const r3 = vi.fn(async () => new Response("never"));

    const worker = composeWorker({ routes: [r1, r2, r3], fetch: fallback });
    const res = await worker.fetch!(req(), {}, ctx);

    expect(await res.text()).toBe("hit");
    expect(r1).toHaveBeenCalledTimes(1);
    expect(r2).toHaveBeenCalledTimes(1);
    expect(r3).not.toHaveBeenCalled(); // short-circuited
    expect(fallback).not.toHaveBeenCalled();
  });

  it("falls through to the SSR fetch when no route matches", async () => {
    const fallback = vi.fn(async () => new Response("ssr"));
    const worker = composeWorker({ routes: [async () => undefined], fetch: fallback });
    const res = await worker.fetch!(req(), {}, ctx);
    expect(await res.text()).toBe("ssr");
    expect(fallback).toHaveBeenCalledTimes(1);
  });

  it("uses the fetch fallback directly with no routes", async () => {
    const worker = composeWorker({ fetch: async () => new Response("only") });
    expect(await (await worker.fetch!(req(), {}, ctx)).text()).toBe("only");
  });

  it("passes through queue/scheduled only when provided", () => {
    const scheduled = vi.fn();
    const withScheduled = composeWorker({ fetch: async () => new Response(), scheduled });
    expect(withScheduled.scheduled).toBe(scheduled);
    expect(withScheduled.queue).toBeUndefined();

    const bare = composeWorker({ fetch: async () => new Response() });
    expect(bare.scheduled).toBeUndefined();
    expect(bare.queue).toBeUndefined();
  });
});
