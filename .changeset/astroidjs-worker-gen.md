---
"astroidjs": minor
---

Add config → Worker + middleware generation. `astroidEditorRoutePlan` encodes the
one collision-free order for the `louise-toolkit/editor` routes (versions/search
before pages) as data, so the "MUST precede pagesRoute" footgun is impossible by
construction. `generateAstroidWorker` emits the Worker entrypoint — editor routes
in that order, an R2 media-asset route, and the `composeWorker` default export
over Astro's SSR handler — with inquiry routes + the contact form included only
when a brand captures inquiries. `generateAstroidMiddleware` emits the Astro
middleware via `createLouiseMiddleware`. Two seams (auth `resolveEditor`, the
section-catalog `validate`) are marked for later slices.
