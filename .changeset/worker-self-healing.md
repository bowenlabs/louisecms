---
"louise-toolkit": minor
---

Add `withHealing` to `louise-toolkit/worker`: a self-healing wrapper for `WorkerRoute`s that maps typed `LouiseError`s to per-code recovery policy instead of surfacing a 500. Each rule composes three deterministic strategies — `retries` (re-run the route with optional exponential backoff, for transient D1/R2/KV blips), `fallback` (serve a degraded/stale `Response`), and `escalate` (hand the failure off out-of-band via `ctx.waitUntil`, never blocking or breaking the response). Codes with no matching rule (and non-`LouiseError` throws) propagate untouched, so healing is always opt-in.

Also exports `describeFailure`, which turns a healing context into a flat, JSON-serializable `FailureReport` — the payload an `escalate` hook enqueues for out-of-band recovery — and `TRANSIENT_CODES`, the retry-eligible infrastructure error codes. Pure library code with no AI or network coupling: `escalate` is the seam a self-updating pipeline plugs into.
