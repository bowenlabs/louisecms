---
"louise": major
---

Rename the `cms` subsystem to **`content`** so the structured-content engine has
one name everywhere (docs, exports, and identifiers previously drifted between
"cms" and "content").

Breaking changes:

- **Subpath renamed** `louise/cms` → `louise/content`. Update every import
  specifier.
- **Identifiers renamed**: `defineCmsConfig` → `defineContentConfig`, `CmsConfig`
  → `ContentConfig`, `CmsRegistry` → `ContentRegistry`, `cmsConfigToSchema` →
  `contentConfigToSchema`, `CmsRoutesOptions` → `ContentRoutesOptions`.
- **Error renamed** (`louise/errors`): `LouiseCmsError` → `LouiseContentError`,
  and its `code` string `"CMS_ERROR"` → `"CONTENT_ERROR"`. Subclasses
  (`LouiseAccessDeniedError`, `LouiseValidationError`) still extend it, so
  `instanceof LouiseContentError` catches them.

The `louise/stega` subpath is unchanged. Editing-surface names were also
standardized in the docs: the block/slash-menu builder is **Louise Builder**
(was "Page builder") and the component-rendered model is **Louise Sections**
(was "Structured sections").
