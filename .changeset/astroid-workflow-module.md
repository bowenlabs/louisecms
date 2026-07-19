---
"astroidjs": minor
---

Add the workflow/pipeline module (#256): `defineWorkflow`, a guarded stage advance, an audited sign-off trail, and `<StageBar>`.

**The framing correction first.** The reference this generalizes — ghostfire.coffee's production floor, the "order tracker" — is not queue- or Durable-Object-driven despite the name. It is a synchronous SSR + D1 state machine: an integer `stage` column advanced by sign-off rows, where "liveness" is an email plus a page reload. So this is its own module, distinct from the queues module and from #71's realtime DO. Live push layers on top later; it isn't required for the pattern.

The domain is coffee; the mechanism is general. Fulfillment, onboarding, approval chains, and support tickets are all an ordered stage list, one audit row per completed stage, an advance that survives two operators pressing the button at once, and a per-stage side-effect hook.

**The guarded advance is the part worth having.** A read-then-write advance runs an item forward twice under concurrency and writes two audit rows. `advanceWorkflowStage` makes the write assert its own precondition — `UPDATE … SET stage = ? WHERE id = ? AND stage = ?` — and treats "0 rows changed" as the conflict, so there is no window between checking and moving. Every failure is a status rather than a throw (409 stale, 404 gone, 422 malformed), because two people working at once is an ordinary outcome, not an exception. The 409 names the stage the item is *actually* at, which is what lets an operator recover instead of pressing again.

**Ordering is fixed relative to the reference.** ghostfire's route inserts the sign-off row and *then* runs the guarded update, so a double submit records two sign-offs even though only one advance lands. Here the guarded update goes first and the audit row is written only if the item actually moved — with a unique index on `(entity_id, stage)` as the backstop. There's a test asserting the refused path writes no audit row, and another asserting the very first statement issued is the guarded `UPDATE`.

`overrideWorkflowStage` covers the out-of-band moves and logs them. Sending an item **back** deletes the reopened stage's sign-off, so "a sign-off exists" keeps meaning "that stage is genuinely done" rather than claiming work that was undone.

`generateWorkflowSchema` emits the audit table and override log but deliberately **not** the entity table — Astroid doesn't own `orders`/`applications`/`tickets`, so it returns the `stage` column to paste in instead of generating something that would collide. `generateWorkflowRoute` scaffolds the advance endpoint, with an explicit TODO to gate it rather than silently shipping an open privileged endpoint.

`<StageBar>` renders any N-stage pipeline. The reference hard-coded six segments, the corner radii, brand hex codes, and a mascot image; here the stage list drives the layout, the colours are theme tokens, and the marker is an opt-in prop. It's an ordered list with `aria-current`, so a screen reader gets "step 3 of 6, current" instead of a row of anonymous divs, and the pulse drops under `prefers-reduced-motion`.
