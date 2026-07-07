// @ts-check
import cloudflare from "@astrojs/cloudflare";
import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// louisecms.com — a single Astro app deployed to Cloudflare Workers.
//   /        → the marketing landing (src/pages/index.astro)
//   /docs/** → the Starlight documentation
//
// Starlight owns every route generated from its docs collection. To keep those
// routes under /docs while leaving / free for the custom landing page, the docs
// content lives in a `docs/` subdirectory of the collection
// (src/content/docs/docs/**) — Astro's file-based routing does the rest.
// https://astro.build/config
export default defineConfig({
  site: "https://louisecms.com",
  output: "server",
  adapter: cloudflare(),
  // Tailwind v4 + daisyUI power the public landing's `louise` site theme. The
  // plugin only emits into stylesheets that `@import "tailwindcss"` (just
  // src/styles/louise.css, imported by the landing), so Starlight is untouched.
  vite: { plugins: [tailwindcss()] },
  integrations: [
    starlight({
      title: "Louise CMS",
      description:
        "A V8-native, inline edit-on-the-live-page CMS for Cloudflare Workers.",
      logo: { src: "./src/assets/louise-mark.svg", replacesTitle: false },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/bowenlabs/louisecms",
        },
      ],
      editLink: {
        baseUrl:
          "https://github.com/bowenlabs/louisecms/edit/main/workers/site/",
      },
      sidebar: [
        { label: "Guide", items: [{ autogenerate: { directory: "docs/guide" } }] },
        {
          label: "Reference",
          items: [{ autogenerate: { directory: "docs/reference" } }],
        },
      ],
      customCss: ["louisecms/theme/fonts.css", "./src/styles/docs.css"],
    }),
  ],
});
