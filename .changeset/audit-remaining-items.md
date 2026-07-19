---
"louise-toolkit": minor
---

Close out the remaining pre-publish audit findings — security hardening, cache/read efficiency, and the last accessibility gaps.

**Security.** `editorsRoute`'s "can't remove the last editor" guard counted every row in the user table; on a site that also stores customers there (email/password auth shares Better Auth's table) that over-counts, letting the final admin delete themselves and lock everyone out. It now counts `role = 'admin'` — the same test the magic-link allowlist uses. The edit-mode cookie is now `secure` over https (still not a control — the session is re-verified every request — but no reason to ship it plaintext-only).

**Efficiency.** `applySaveDraft` read the full version list from D1 on *every* autosave tick and then discarded it whenever a KV write-buffer existed. The buffer read now comes first and gates that query, so a burst of edits stops paying for a version list per debounce tick (the live-row lookup stays — the 404 check needs it). Separately, the edge cache keyed on the raw URL, so `?utm_source=…` and friends minted a fresh entry per campaign link — exactly the traffic burst a cache should absorb. The new `edgeCacheKeyUrl` strips known tracking params and sorts the rest; only the *key* is normalized, so a page that reads its own query string is unaffected.

**Accessibility.** `role="toolbar"` on the edit bar and the formatting bubble now actually implements arrow-key roving (←/→, Home/End) instead of just advertising it. Icon-only controls get a deliberate `:focus-visible` ring rather than relying on the UA default against coloured fills. The dashboard summary is a real `<h2>`, so the `<h3>` cards below it no longer skip a heading level.

**Docs that were wrong.** `theme/fonts.css` now warns that its inlined face makes the stylesheet render-blocking and is meant for editor surfaces, not public pages. `semanticSearch` documents that it's the one path sending *visitor* text to Workers AI. The `grammar` option documents Harper's ~10MB WASM download. The `louise-dark` theme documents that it does not restyle the injected editor chrome.
