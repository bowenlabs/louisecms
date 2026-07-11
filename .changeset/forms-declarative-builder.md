---
"louisecms": minor
---

Declarative form builder (`louisecms/forms`) — define a form's fields once and
derive the submission table, the public capture route, validation, and the review
columns from that single definition (#46, Tier 1). `inquiries` is now the
**built-in default form**.

- **`defineForm({ name, fields, spam?, notify? })`** → `{ columns, table,
  reviewColumns }`. Field `type` is `text | email | tel | url | textarea | number
  | select | checkbox | date`; `required` drives both a `NOT NULL` column and a
  required check; `validation` reuses the shared `Rule`/`validateValue` engine, so
  there is one validation definition. `validateSubmission` / `coerceFormValue` run
  it (per-type format checks, select allowlist, number coercion).
- **`formRoute(config)`** (`louisecms/editor`) — the **public** capture companion
  to `inquiriesRoute`: same-origin-guarded (not session-gated), validates + coerces
  (`422` with per-field violations), enforces an opt-in spam guard (KV rate limit +
  Turnstile via `verifyTurnstileToken`), and inserts the row. Mounted at
  `/api/louise/forms/<name>`.
- **Folded inquiries.** `inquiries`/`inquiriesColumns` are now derived from a
  built-in `inquiriesForm` (`louisecms/db`) — same table shape as before, so no
  base migration. The review route + Inquiries panel were already form-agnostic.
- **Dogfood.** The marketing site gains a contact section that POSTs to
  `formRoute`; a submission lands in the Inquiries tab with no hand-rolled handler,
  columns, or validation.

`json()` (`louisecms/editor`) now accepts optional response headers.
