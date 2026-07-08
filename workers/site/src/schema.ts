// Louise CMS tables for the dogfood. The generic framework column sets are
// enough here, so we use the ready-made tables straight from louisecms/db —
// `pages`, `site_settings`, `media`, and `inquiries`. drizzle-kit reads this
// file to generate migrations (see drizzle.config.ts); the Worker's editor
// routes (src/worker.ts) import the same table objects.
export { inquiries, media, pages, siteSettings } from "louisecms/db";
