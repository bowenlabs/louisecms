---
"louise-toolkit": minor
---

Add a shell-owned **action footer** to the Louise Settings drawer (#109) — a persistent, context-driven bar so save / cancel / publish / delete are always visible instead of scattered inline and scrolled off.

- New `client/settings/panel-actions.tsx`: `PanelActionsProvider` (a push/pop **stack**, so the deepest active view owns the footer and restores the parent's actions on unmount), `usePanelActions().push(actions, status?)`, `DrawerFooter`, and the `PanelAction` / `SaveStatus` / `ActionKind` types — all exported from `louise-toolkit/client/settings`.
- The shell wraps the drawer body + footer in the provider and installs **Cmd/Ctrl+S → the active frame's primary action**. Buttons are dirty-aware (disabled when unchanged), show a `busyLabel` ("Saving…") while an async `onClick` is pending, and auto-saving surfaces can push a **status pill** instead of buttons. The footer collapses when the active view has neither actions nor a status.
- The framework panels migrate their inline actions into the footer, removing the duplicated inline buttons:
  - **Settings** — Save/Revert (Save dirty-gated; Revert restores the last-loaded snapshot; the pill carries the saved/error result). Sign-out stays in the body.
  - **Pages** — the per-page settings form's Save (dirty-gated) + Delete. The list keeps its inline "+ New page"; the footer collapses on the list.
  - **Media** — the per-asset alt/caption editor's Save/Cancel. Editing is now single-open (one asset at a time) so the footer stack has one unambiguous top; the card's Copy/Alt/Delete stay inline.

Framework panels are always mounted inside the shell (via `mountSettings`), which now provides the footer context; a site-registered collection tab can push its own footer actions with `usePanelActions`.
