---
"louise-toolkit": minor
---

Add `louise-toolkit/content/define` — the drizzle-free half of the content module: `defineCollection` plus the collection/field types and the `flattenFields`/`flattenDoc`/`nestDoc` helpers.

The `content` barrel re-exports the whole module, and three of its members import `drizzle-orm` as real values: `codegen` (builds Drizzle tables), `localApi` (builds queries), and `validation` (uniqueness queries). Those imports are legitimate, but ESM is eager — so a caller that only wanted `defineCollection` still had to resolve `drizzle-orm` at import time. Because `drizzle-orm` is an *optional* peer, that quietly required consumers to install a package they never asked for, and it shipped a broken `npm create astroid` to npm: Astroid's config generators call `defineCollection` and nothing else, and the CLI died on `Cannot find package 'drizzle-orm'` before writing a file.

Import from `content/define` when you're describing content (config, codegen tools, meta-frameworks); import from `content` when you're also reading or writing it. The barrel still exports everything, so this is a narrower door onto the same rooms, not a second source of truth — nothing is deprecated and nothing breaks. Verified: the built `content/define` entry resolves to four chunks with **zero** external dependencies, while the barrel still pulls `drizzle-orm`.
