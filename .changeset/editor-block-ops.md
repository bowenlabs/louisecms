---
"louise-toolkit": minor
---

The sections editor now wires the **block layer** into the on-canvas chrome (#182 Phase 2 / ADR 0005 §4). `mountSections` passes block actions to `mountSectionChrome`, and two new store ops — reorder and delete a section's blocks — reconcile `state.items[i].blocks` and mirror the change on the already-rendered page (via `moveBlockElement` / `deleteBlockElement`), then stage a draft via autosave. This is the block analogue of the instant section reorder/delete: no server round-trip, and a section's block markers stay aligned. Block **add / swap-type** still need the fragment-render route (Phase 3). Fully additive — a section with no `blocks` renders and edits exactly as before.
