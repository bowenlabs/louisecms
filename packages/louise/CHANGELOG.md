# louisecms

## 0.2.0

### Minor Changes

- 4a4f6da: Add an auth-schema generator so sites regenerate their Better Auth migration
  from config instead of hand-rolling DDL (#15). `louisecms/auth` now exports
  `generateAuthSchemaSql` / `authSchemaOptions` (built on Better Auth's
  programmatic `getAuthTables`, no native `@better-auth/cli` dependency), and the
  package ships a `louise` CLI: `louise gen-auth-schema [--config <path>]
[--table-prefix <p>] [--out <file>]`. Supports a same-D1 auth namespace (Option
  B): pass `tablePrefix` (e.g. `"auth_"`) to render prefixed tables + foreign
  keys, and set the matching `LouiseAuthConfig.tablePrefix` so `getLouiseAuth`
  queries them. Prefix omitted → default table names (unchanged behavior).
- 6a99330: Add `louisecms/browser` — edge browser-automation helpers on Cloudflare Browser
  Run, shared across all Louise sites (#5). `ogImage` renders a per-page OG card
  only on a cache miss (content-hashed key via `ogCacheKey`, byte store injected),
  so the second request for unchanged content is served with no browser session;
  `createPuppeteerRenderer` is the thin edge binding (`@cloudflare/puppeteer`, an
  optional peer, dynamically imported). `checkLinks` is a scheduled, fetch-based
  link crawler. Bindings contract: `BROWSER` (`LouiseBrowserEnv`).
- 32022b3: Add the `louisecms/media` module: verified R2 uploads (`putMedia` with magic-byte
  sniffing that never trusts the client MIME), `listMedia`/`deleteMedia`, a
  parameterized delete-safety reference scan (`findMediaReferences`), and pure
  Cloudflare Image-Resizing URL transforms (`cfImage`/`circleImage`) plus a
  per-usage `Crop` + `cropStyle` helper. Ships the `media` asset-registry table
  (`mediaColumns` / `media`) in `louisecms/db` and a `LouiseMediaEnv` bindings
  contract (`MEDIA` R2 bucket + `MEDIA_URL`).
- 09e95c9: `louisecms/cms` patch: `diffDocuments` is now a `_key`-aware deep diff. A changed
  `blocks` array reports the specific sub-field that changed at a segmented path
  (`FieldChange.path` is now `PathSeg[]`, e.g. `["blocks", { key }, "heading"]`)
  instead of one opaque "blocks changed"; reordering blocks with unchanged content
  is a no-op; block add/remove is reported at the block's key path. Adds a
  `formatPath` display helper. The `computePatch`/`applyPatch` write path stays
  top-level field-level (unchanged) — path-addressed write ops remain a future
  Tier-2 concern.
- 430235d: Add stega (steganographic) auto-tagging for visual editing (#23), a companion to
  the manual `editAttr()` path. New `louisecms/stega` export: `stegaEncode` /
  `stegaDecode` / `encodeDocument` / `defaultStegaFilter` embed an invisible
  `EditRef` inside a field's rendered text, so prose becomes a click-to-edit
  target with no wrapper element (built on `@vercel/stega`, an optional peer).
  `mountVisualEditing` gains an injected `resolveStega` for text-node hit-testing
  (hybrid with `data-louise-edit` element targets). The client save path now
  `stegaClean()`s every value (via a dependency-free stripper) so invisible
  payload never round-trips into stored HTML / ProseMirror JSON. Encoding is
  preview-only.
- f89c615: Add `louisecms/worker` `composeWorker` (#10, Tier 2) — build a Cloudflare
  `ExportedHandler` from ordered Louise-owned routes plus a framework SSR fallback,
  with optional `queue`/`scheduled` handlers. On `fetch`, each route runs in order
  and the first `Response` short-circuits; otherwise the SSR fallback handles it.
  Lets a site's `worker.ts` declare `api/louise/*` + OG routes over its Astro
  handler instead of hand-rolling the compose per site.

## 0.1.0

### Minor Changes

- Add `louisecms/commerce/square` — a V8-native Square client (raw `fetch` +
  `crypto.subtle`, no Node SDK) over the Square `/v2` REST surface, pinned to
  `Square-Version: 2026-01-22`. Covers catalog read + mapping, price-verify
  batch retrieve, order creation, Web Payments card charges, customers
  (find-or-create), cards on file, loyalty balances, subscriptions, and
  `verifySquareSignature` for webhooks. Mirrors the existing
  `commerce` (Stripe) and `commerce/fourthwall` modules.
