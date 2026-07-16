---
"louise-toolkit": minor
---

Add `louiseSaveDraftAction` — the editor `saveDraft` mutation (#72) as an Astro Action, completing the editor-mutation Action surface alongside `louiseSaveAction` and `louiseSettingsAction`. A site calls `actions.louise.saveDraft({ id, data })` to stage a versioned-page draft; the input bundles the row `id` with the changed fields (an Action call has no URL to carry the id).

The store path is shared with the raw `versionsRoute` (POST `/:id/versions`) via a new pure `applySaveDraft` — the concurrent-surface merge base (KV buffer → newest pending draft → live row) and the #70 KV write-buffer — so the draft-merge logic lives in one place. `VersionsRouteConfig` now extends a `SaveDraftDeps` base that the Action config also extends. The handler returns the route's JSON body (a created `version`, or `{ buffered: true }` when a write is coalesced). The raw route is unchanged and remains the fallback for the keepalive auto-save client.
