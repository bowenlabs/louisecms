---
"louisecms": patch
---

Sections version history now flags the currently-live version.

Publishing never demotes a previously-published version's `status`, so several
rows in the version-history list read "Published" identically and you couldn't
tell which one was actually live. `GET /api/louise/pages/:id/versions` now also
returns the page's `publishedVersionId`, and the sections dock uses it to mark
the live version distinctly ("Live", accented row) and disable re-publishing it
("Current" instead of "Restore").
