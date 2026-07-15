import { defineMiddleware } from "astro:middleware";
import { getEditorGate } from "./lib/louise/gate.js";
import { EDIT_COOKIE, resolveEditorFromCookie, SESSION_MAX_AGE } from "./lib/louise/session.js";

// Resolves the editor session per request and derives edit mode, following the
// Louise contract: `locals.editor` authorizes writes (re-checked in the Worker's
// editor routes), while `locals.editMode` only decides whether the page renders
// edit affordances. Edit mode is a sticky cookie toggled by `?louise` /
// `?louise=off`; entering it requires a valid session.
export const onRequest = defineMiddleware(async (context, next) => {
  const editor = await resolveEditorFromCookie(context.request, getEditorGate());

  const url = context.url;
  const secure = url.protocol === "https:";
  let editMode = context.cookies.get(EDIT_COOKIE)?.value === "1";

  if (url.searchParams.has("louise")) {
    if (url.searchParams.get("louise") === "off") {
      context.cookies.delete(EDIT_COOKIE, { path: "/" });
      editMode = false;
    } else if (editor) {
      context.cookies.set(EDIT_COOKIE, "1", {
        path: "/",
        httpOnly: false,
        sameSite: "lax",
        secure,
        maxAge: SESSION_MAX_AGE,
      });
      editMode = true;
    } else {
      return context.redirect(`/louise?next=${encodeURIComponent(url.pathname)}`);
    }
  }

  context.locals.editor = editor;
  context.locals.editMode = editMode && !!editor;
  return next();
});
