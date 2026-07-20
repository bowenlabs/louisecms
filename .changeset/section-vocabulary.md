---
"astroidjs": minor
"create-astroid": minor
---

Make the section catalog the single source of the section vocabulary (#277).

`SectionKind` was a hand-written union in `config.ts` and the catalog was a separate object, so the two drifted **in both directions**: the union named four kinds with no catalog entry and no component (`marquee`, `featured`, `story`, `visit`), while omitting eight that were real and renderable. Nothing checked the gap, so `create-astroid` wrote archetype defaults listing sections that could never render.

`SectionKind` is now `keyof typeof astroidSectionCatalog` — a **type-only** import, so `config.ts` gains no runtime dependency and the `create-astroid` CLI's import graph is unchanged.

That derivation only works because the catalog is now declared with **`satisfies SectionCatalog`** rather than a `: SectionCatalog` annotation. `SectionCatalog` is `Record<string, SectionDef>`, so annotating widens `keyof typeof` to `string` and throws the literal keys away. Those keys are load-bearing in three places — `SectionKind`, `isRenderableSection`'s narrowing, and `<Section>`'s component-map index — and annotating silently degrades all three to "any string". That is exactly how the dispatcher lost its type safety before (fixed in #276 with a cast; the cast is no longer papering over anything).

**The archetype defaults moved into astroidjs.** They were a plain JS object in `create-astroid`, where a section name that didn't exist was invisible. Typed against `SectionKind`, a stale name is now a compile error — verified by temporarily adding `"marquee"` back and watching the build fail. The four dead kinds are replaced by the sections that actually do their job: a marquee is a `banner`, curated picks are a `productGrid`, a brand-origin block is `aboutIntro`, and "visit" is exactly `locationHours`.

`capturesInquiries`' `sections.includes("contact")` — the one real consumer of `config.sections` — is now checked against that same union, so renaming the catalog's `contact` entry would fail the build instead of silently scaffolding a site with a contact section and no inquiries table behind it.
