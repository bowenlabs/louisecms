---
"louise-toolkit": minor
---

Astro Content Layer loader — expose Louise D1 collections through native `getCollection()` (#92).

- New `louise-toolkit/astro` exports: `louiseLoader({ collection, read, idOf?, name? })` returns an Astro Content Layer `Loader`, and `collectionToAstroSchema(collection)` derives a Zod schema straight from a `defineCollection`'s fields (text/select/number/date/checkbox/relationship/group → typed; richText/array/json pass through; `hasMany` relationships and bookkeeping columns dropped). Register it with Astro's `defineCollection({ loader })` and read published content via `getCollection`/`getEntry`, typed from the collection's own fields — no hand-written schema.
- Content Layer loaders run at **build time** (in Node, off any Worker binding), so — like `defineCatalogLoader` — the D1 read is injected: a site supplies `read()` (typically the D1 REST API at build, or a snapshot). The result is a build-time snapshot of published content (rebuild on publish to refresh); for request-time freshness, keep reading D1 in an SSR page. The loader owns schema mapping, store population, content digests for incremental builds, and fail-safe error handling (a read failure keeps the last good store rather than emptying the collection).

Site: `workers/site` gains an example — `src/content.config.ts` registers a `publishedPages` collection via `louiseLoader(pagesCollection, readPublishedPages)`, with a D1 REST read (`src/lib/louise/published-pages.ts`) gated on `CF_ACCOUNT_ID` / `CF_D1_DATABASE_ID` / `CF_API_TOKEN` (unset → the collection builds empty).
