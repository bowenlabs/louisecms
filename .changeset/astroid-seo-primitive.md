---
"astroidjs": minor
"create-astroid": minor
---

Ship the SEO layer as a first-party Astroid primitive (#255): `<Seo>`, `<StructuredData>`, and origin-aware `robots.txt` + `sitemap.xml`. Two sites had hand-built the same thing, and the parts that were subtle in both are now the parts that are encoded once.

**`<Seo>`** emits the tags directly rather than wrapping `astro-seo` — there are about fifteen of them, their shapes are frozen by the OG and Twitter specs, and owning them means `resolvePageSeo` is the only place a value can come from. That resolution has two rules worth stating: an **empty string is unset**, so clearing a field in the editor falls back to the site default instead of publishing a blank `<meta>`; and the title template applies only when a page supplies its own title, so the home page reads `Acme Coffee` rather than `Acme Coffee | Acme Coffee`. `site_settings.disableIndexing` is a site-wide kill switch that beats a page asking to be indexed, which is what makes it usable on staging.

**`<StructuredData>`** emits a schema.org `@graph` — the business, the `WebSite`, and optionally the entity the page is about. The business `@type` is the only genuinely per-site part, so it comes from the archetype (`storefront` → `Store`, `portfolio` → `Person`, otherwise `Organization`) with `seo.businessType` for the many cases where a narrower subtype exists. The business carries a stable `@id` so other nodes reference it instead of restating it. The payload goes through `escapeJsonLd`, not `JSON.stringify`: `stringify` does not escape `<`, so any editor-authored value containing a literal `</script>` would close the tag early and inject markup straight into `<head>`.

**`robots.txt` + `sitemap.xml`** derive their exclusions from one function (`astroidNoindexPaths`), so they cannot disagree about what is crawlable — the editor and its API always, plus the portal and checkout routes when those modules are on. Both are **origin-aware**, built from the serving origin rather than a configured domain: a preview deploy that advertises the production host invites its content to be indexed under the real domain. Sitemap entries are de-duplicated, sorted, and XML-escaped, since a single unescaped `&` in a slug makes the whole document invalid.

The scaffold wires all of it: `Site.astro` reads `site_settings` and renders both components, `index.astro` now passes the page's `seo_*` overrides (distinct from `title`, which is the on-page H1), the login page is `noindex`, and the two route files ship as scaffold-once so a site can add its own URLs.

Verified by building and serving a scaffolded project with **no** bindings provisioned: title, canonical, OG/Twitter, and the JSON-LD graph all render off the config fallback, and `robots.txt`/`sitemap.xml` return valid documents.
