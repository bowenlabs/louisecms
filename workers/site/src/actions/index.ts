// ADR 0001, layer 2 — the Astro-native, typed mutation surface. The raw
// /api/louise/* editor routes (src/worker.ts) stay as the framework-agnostic
// path; this is the typed one an Astro island calls directly.
//
// `savePage`'s `input` IS the `pageEditInput` Zod schema (the single source of
// truth), so the handler receives a fully-typed, already-validated `input` — no
// hand-written interface, no `String(x ?? "")` coercion, and the same shape is
// inferred on the client. This is the pattern the sites' existing actions
// (e.g. themidwestartist's `inquiry`) should migrate toward.
import { ActionError, defineAction } from "astro:actions";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { db } from "louise-toolkit/db";
import { getEditorGate } from "../lib/louise/gate.js";
import { pageEditInput } from "../lib/louise/page-schema.js";
import { resolveEditorFromCookie } from "../lib/louise/session.js";
import { pages } from "../schema.js";

export const server = {
  louise: {
    savePage: defineAction({
      input: pageEditInput,
      handler: async (input, context) => {
        // Editor mutations are session-gated (defense in depth — the same gate
        // the /api/louise/* routes enforce). A public visitor gets a typed error.
        const editor = await resolveEditorFromCookie(context.request, getEditorGate());
        if (!editor) {
          throw new ActionError({ code: "UNAUTHORIZED", message: "Sign in to edit." });
        }

        // `input` is `PageEditInput` here — no coercion needed.
        const DB = (env as unknown as CloudflareEnv).DB;
        await db(DB)
          .update(pages)
          .set({
            title: input.title,
            seoTitle: input.seoTitle ?? null,
            seoDescription: input.seoDescription ?? null,
          })
          .where(eq(pages.id, input.id));

        return { ok: true as const, id: input.id };
      },
    }),
  },
};
