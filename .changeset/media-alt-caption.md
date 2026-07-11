---
"louisecms": minor
---

Media assets now carry first-class **alt/caption** and intrinsic **dimensions**,
so the media library is a described set of assets rather than a wall of
filenames (#16).

- **Dimensions on upload.** `putMedia` reads intrinsic `width`/`height` from the
  image header (new `imageDimensions` — PNG/GIF/JPEG/WebP, no pixel decode; `null`
  for formats it can't read), and `mediaRoute`'s upload records them. `PutMediaResult`
  gains `width`/`height`.
- **Edit alt/caption.** `mediaRoute` gains `PATCH /api/louise/media` (`{ key, alt,
  caption }`) — only those two columns are writable, editor-guarded and
  same-origin-checked. The drawer Media panel gets an inline alt/caption editor per
  asset and shows the real alt (not the filename) on the thumbnail.
- **Alt flows to rendered images.** New `mediaMetaByUrl(db, table, base)` returns a
  `url → { alt, caption, width, height }` map so a render pass can fill an image's
  alt from its asset-level default when no per-usage alt is set (a per-usage value
  always wins). Wired into the dogfood's public section render.

Additive and back-compatible: `width`/`height`/`alt`/`caption` are optional
columns that stay `NULL` until set.
