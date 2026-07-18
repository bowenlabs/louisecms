---
"louise-toolkit": minor
---

Make the inline-edit client **view-transition-aware** (#74), so a host can enable Astro's `<ClientRouter />` and navigate between pages in edit mode without a full reload — the edit bar, drawer, and sections dock re-init on the new page and no pending edits are lost.

- **Flush on `astro:before-swap`** — a soft navigation fires none of `pagehide` / `visibilitychange`, so `mountLouise` and `mountSections` now also flush pending auto-saved edits (via the raw keepalive fetch) before the DOM is swapped away. Without this, an in-flight edit would be dropped on navigation.
- **Re-mount cleanly across swaps** — the `mountLouise` idempotency guard (a runtime `<html>` attribute that survives the swap) is cleared on `astro:after-swap`, and the shared leave/unsaved-guard handlers are wired **once** for the page lifetime rather than per mount, so a re-mount can't stack duplicate `window` listeners.
- **Settings drawer** — `mountSettings` disposes its Solid root on `astro:before-swap`, so its `window` listeners don't leak (and a stale drawer can't be opened) after a navigation.

`astro:*` are plain DOM events; in a non-Astro host they never fire, so the client stays framework-agnostic. Enabling the transitions themselves (adding `<ClientRouter />` + prefetch) remains the host's choice.
