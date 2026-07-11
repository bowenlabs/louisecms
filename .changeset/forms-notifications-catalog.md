---
"louisecms": minor
---

Forms Tier 3 (#46) — notifications, a shared submissions catalog, and silent spam
heuristics.

- **Notifications.** A form's `notify` fires after a successful insert, **off the
  response path** (`waitUntil`): `notify.webhook` POSTs `{ form, values }`;
  `notify.email` sends via a `mailer` passed to `formRoute` (wrap your `EMAIL`
  binding — Louise stays decoupled from any transport). A notification failure
  never fails the submission. New `notifySubmission` / `renderSubmissionText`.
- **Silent heuristics.** `spam.honeypot` (a decoy field) and `spam.minSeconds` (a
  too-fast-submit check against the render helper's `louise_ts`) reject a likely
  bot with a fake success and no insert. New `looksLikeSpam`; the `<Form>` helper
  emits the honeypot + timestamp.
- **Form catalog (no new table each time).** New shared `submissions` table
  (`louisecms/db`). `formRoute`'s `genericTable` stores an ad-hoc form as
  `{ form, data }` (no migration per form); the new `submissionsRoute`
  (`louisecms/editor`) reviews one form's rows for a drawer tab.
- Dogfood: the marketing site's contact form gains the honeypot + a 2s minimum.
