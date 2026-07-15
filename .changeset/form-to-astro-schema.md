---
"louise-toolkit": minor
---

Add `formToAstroSchema` — the forms counterpart to `collectionToAstroSchema` (#92) — so a `defineForm` definition drops straight into an Astro Action's `input`.

`louise-toolkit/astro` now exports `formToAstroSchema(form)`, which maps a form's fields to a Zod schema: `email`/`url` carry their format check, `number`/`date` coerce, `checkbox` normalizes to a boolean (accepts `true`/`1`/`"true"`/`"on"`), `select` options double as the allowlist, and `required` drives optional-vs-required (required string-likes must be non-empty). Like the collection bridge it lives in the `astro` subpath and pulls Zod from `astro/zod`, so the framework-agnostic core takes no Zod dependency.

This closes the gap where form Actions took raw `FormData` + a hand-written interface + manual coercion: the form is the single source of truth, and the client infers the input type for free.

```ts
export const server = {
  inquiry: defineAction({
    input: formToAstroSchema(inquiryForm),
    handler: async (input) => { /* input is typed + validated */ },
  }),
};
```
