---
"louise-toolkit": minor
---

Add `louise-toolkit/realtime` — the per-page live-editing Durable Object, PR 1 of ADR 0002 (#71): the **hibernatable-WebSocket skeleton** + the authed upgrade route. Presence only for now (no persistence — that's a later slice).

- **`createEditSession(ctx)`** — the DO session logic a site's `DurableObject` subclass delegates to. On connect it accepts a *hibernatable* socket (`ctx.acceptWebSocket`), attaches the editor identity, and broadcasts presence; `hello` → `welcome`, `ping` → `pong`; disconnect re-broadcasts presence to the remaining peers. Presence is rebuilt from `ctx.getWebSockets()` + `serializeAttachment`, so it survives hibernation.
- **`realtimeRoute({ resolveEditor, namespace })`** — `GET /api/louise/realtime/:slug/:id` (a WebSocket handshake), guarded as a same-origin, session-gated mutation, then forwarded to the per-page DO (`idFromName("<slug>:<id>")`) with the **server-resolved** editor identity (the client never provides its own presence). Returns `503` when the DO binding is absent (realtime cleanly off), `426` for a non-upgrade request.

Following the `workflows` pattern, the **site owns the `DurableObject` subclass + the wrangler binding** (it imports `cloudflare:workers`); this module ships the logic + route it wires in. Model-runtime WebSocket behavior isn't exercised by the repo's happy-dom harness — the route, session message-handling (fake ctx/sockets), and protocol helpers are unit-tested; the live `acceptWebSocket` hibernation is verified on deploy.
