---
"astroidjs": minor
---

Add config → schema generation. `astroidPagesCollection` / `astroidContentConfig`
derive the Louise content config from an Astroid project (the opinionated bit),
and `generateAstroidSchema` emits the Drizzle `schema.ts` a Louise site would
otherwise hand-write — composing `pagesColumns`, the `pages_versions` snapshot
table, and the framework tables the config selects (`inquiries` only when a brand
captures them). Multi-brand adds a `brand` discriminator and a per-brand slug.
This is the first slice that consumes `louise-toolkit` (one-way: astroidjs →
louise-toolkit).
