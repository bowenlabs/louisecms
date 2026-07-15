---
"louise-toolkit": minor
---

Schema-validate commerce webhook payloads and add structured-output parsing (#97, #99).

- `louise-toolkit/schema`: new `s.array(item, { min, max })` builder primitive (element issues re-path under their index, mirroring `s.object`), plus `parseJson`, `extractJson`, and `parseModelJson` — validate a raw JSON string against a schema without throwing, and pull the first balanced JSON object/array out of LLM prose (respecting strings/escapes) instead of slicing on the first/last brace. Malformed JSON and shape mismatches both come back as violations, so callers keep one graceful-degrade branch.
- `louise-toolkit/commerce`: new `parseWebhookEvent(schema, rawBody)` — run it **after** `verify…Signature` to prove the payload's shape (the HMAC only proves the sender). Each provider module exports its event envelope schema: `stripeWebhookEventSchema`, `squareWebhookEventSchema`, and `fourthwallOrderEventSchema`. The Fourthwall order-body aliases stay tolerant in `mapFourthwallOrder` (a strict inner schema would drop a live order on shape drift).
