---
"louisecms": minor
---

Add `louisecms/worker` `composeWorker` (#10, Tier 2) — build a Cloudflare
`ExportedHandler` from ordered Louise-owned routes plus a framework SSR fallback,
with optional `queue`/`scheduled` handlers. On `fetch`, each route runs in order
and the first `Response` short-circuits; otherwise the SSR fallback handles it.
Lets a site's `worker.ts` declare `api/louise/*` + OG routes over its Astro
handler instead of hand-rolling the compose per site.
