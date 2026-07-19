---
"astroidjs": patch
---

Drop the `drizzle-orm` dependency — Astroid no longer needs it at runtime.

`0.1.1` declared `drizzle-orm` to fix a crashing `npm create astroid`, but that was treating the symptom: Astroid only calls `defineCollection`, and the dependency existed solely because importing it from the `louise-toolkit/content` barrel eagerly dragged in the barrel's drizzle-dependent query/codegen chunks. Astroid now imports from the new `louise-toolkit/content/define` entry, which is genuinely free of it, so the declaration is no longer earning its place.

Verified in a clean room: packed all three packages, installed them into an empty directory with `drizzle-orm` absent entirely, and ran a full scaffold plus `astroid doctor` — both succeed. The CI scaffold smoke test now runs exactly this way, so the regression can't come back unnoticed.
