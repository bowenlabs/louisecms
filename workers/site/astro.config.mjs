// @ts-check
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, envField } from "astro/config";

// louisetoolkit.com — the marketing landing, itself built with Louise Toolkit, deployed to
// Cloudflare Workers. The Starlight docs used to live here under /docs/**; they
// now have their own static app (workers/docs) served under docs.louisetoolkit.com
// by the *same* Worker — see src/worker.ts, which dispatches by Host.
//
// SSR (`output: server`) because Louise renders per-request edit affordances and
// reads pages from D1. Tailwind v4 + daisyUI power the public `louise` site theme
// (src/styles/louise.css); the plugin only emits into stylesheets that
// `@import "tailwindcss"`.
export default defineConfig({
  site: "https://louisetoolkit.com",
  output: "server",
  adapter: cloudflare(),
  // Typed, validated editor-gate config (astro:env). Values still come from
  // wrangler.jsonc `vars` / `wrangler secret` at runtime; this is the schema +
  // types over them, read via `astro:env/server` at the composition layer
  // (middleware / /louise login / worker resolveEditor) and passed into the
  // env-injected `session.ts` seam, which stays framework-agnostic. Cloudflare
  // *bindings* — and MEDIA_URL, which the framework-agnostic media route reads
  // off the runtime env — stay on `cloudflare:workers`; see src/env.d.ts.
  env: {
    schema: {
      // Fixed editor identity the single-password gate logs in as.
      OWNER_EMAIL: envField.string({
        context: "server",
        access: "public",
        default: "editor@louisetoolkit.com",
      }),
      // Optional so anonymous SSR works before provisioning — verifySession
      // guards on the cookie before it ever needs the key, and the /louise
      // login guards on the password.
      LOUISE_SESSION_SECRET: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      LOUISE_EDITOR_PASSWORD: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
    // `astro preview` runs behind Vite's preview server, which blocks foreign
    // Host headers by default. Allow the two production hosts so the one-Worker
    // Host dispatch (src/worker.ts) can be exercised locally with a Host header.
    preview: { allowedHosts: ["louisetoolkit.com", "docs.louisetoolkit.com"] },
  },
});
