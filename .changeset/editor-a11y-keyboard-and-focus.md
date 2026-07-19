---
"louise-toolkit": minor
---

Make the editor operable without a mouse, closing the two blocking accessibility gaps in the on-canvas chrome and the overlays.

**Structural editing is now keyboard-reachable (WCAG 2.1.1).** The section/block chrome only ever appeared on `mouseover`, so its move / delete / ⚙-inspect actions — and the non-inline fields (image, link URL, layout, `_settings`) that live behind the gear — were unreachable by keyboard. Marked regions are now tab-stops that reveal their toolbar on focus, with `Enter`/`F2` to step into it, `←`/`→` to rove its buttons, `Escape` to step back out, and `Alt+↑`/`Alt+↓` to reorder plus `Delete`/`Backspace` to remove directly. Structural keys only fire when the region itself holds focus, so they never interfere with typing in a field. The affordances are additive — Louise sets `tabindex`/`aria-keyshortcuts` only where the author hasn't, never overwriting a section's own `role`/`aria-label`, and removes exactly what it added on dispose. The toolbars are proper `role="toolbar"`s and their glyph buttons carry real accessible names ("Move up", not "↑").

**Overlays now manage focus (WCAG 2.4.3 / 2.1.2 / 4.1.2).** The Settings drawer, the version-history drawer, and the inspector popover moved no focus on open, could be tabbed straight out of into the page behind, and had no Escape. A new shared `wireDialogA11y` helper marks each `aria-modal`, moves focus in, wraps Tab at both edges, closes on Escape, and restores focus to whatever opened it — with collapsed `<details>` groups correctly excluded from the tab ring. Their decorative scrims are now `aria-hidden`.
