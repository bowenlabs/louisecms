import { getTableConfig } from "drizzle-orm/sqlite-core";
import { describe, expect, it } from "vitest";
import {
  type EditorActionContext,
  louiseSaveAction,
  louiseSaveDraftAction,
  louiseSettingsAction,
} from "../../src/astro/actions.js";
import { collectionVersionsTable, defineCollection } from "../../src/core/content/index.js";
import { pages, siteSettings } from "../../src/core/db/index.js";

// Fake D1 mirroring test/core/editor.test.ts's makeD1, plus `.raw()`: drizzle's
// `update().set().where().returning()` reads its rows via `stmt.bind(...).raw()`
// (row-arrays, decoded by column index), so `handler` returns those row-arrays —
// a non-empty result means "row updated", `[]` means "not found". Records SQL/binds
// so a test can assert an UPDATE was issued.
function makeD1(handler: (sql: string, binds: unknown[]) => unknown[]) {
  const calls: { sql: string; binds: unknown[] }[] = [];
  const db = {
    prepare(sql: string) {
      return {
        bind(...binds: unknown[]) {
          const record = () => calls.push({ sql, binds });
          return {
            async all() {
              record();
              return { results: handler(sql, binds) };
            },
            // drizzle's D1 driver reads `.returning()` rows through `.raw()`.
            async raw() {
              record();
              return handler(sql, binds);
            },
            async run() {
              record();
              return { success: true, meta: { changes: 1 } };
            },
          };
        },
      };
    },
  };
  return { db: db as unknown as D1Database, calls };
}

// Stand-in for Astro's injected `ActionError`: captures the code/message the
// handler throws, so the mapping is assertable without the virtual `astro:actions`.
class FakeActionError extends Error {
  code: string;
  constructor(opts: { code: string; message?: string }) {
    super(opts.message);
    this.code = opts.code;
  }
}

const editor = { userId: "u1", email: "e@x.com", name: "Ed", role: "admin" };
const collections = {
  pages: { table: pages, fields: ["title", "body"], richFields: ["body"] },
};
const action = louiseSaveAction({ collections, ActionError: FakeActionError });

// A minimal Astro Action context: the middleware-resolved editor + CF bindings,
// both off `locals` (the handler's default `getEditor`/`getEnv` read here).
const makeCtx = (db: D1Database, ed: unknown = editor): EditorActionContext => ({
  locals: { editor: ed, runtime: { env: { DB: db } } },
});

describe("louiseSaveAction", () => {
  it("input schema requires the routing keys", () => {
    expect(
      action.input.safeParse({ collection: "pages", key: "1", field: "title", value: "x" }).success,
    ).toBe(true);
    expect(action.input.safeParse({ collection: "pages" }).success).toBe(false);
  });

  it("writes the field and returns ok", async () => {
    const { db, calls } = makeD1(() => [[1]]); // returning() yields the row
    const out = await action.handler(
      { collection: "pages", key: "1", field: "title", value: "Hello" },
      makeCtx(db),
    );
    expect(out).toEqual({ ok: true });
    expect(calls).toHaveLength(1);
    expect(calls[0].sql).toMatch(/update/i);
    expect(calls[0].sql).toMatch(/where/i);
    expect(calls[0].binds).toContain("Hello");
  });

  it("sanitizes a rich field before storing", async () => {
    const { db, calls } = makeD1(() => [[1]]);
    await action.handler(
      { collection: "pages", key: "1", field: "body", value: "<b>hi</b><script>x</script>" },
      makeCtx(db),
    );
    // The stored value is the sanitized HTML — the <script> is gone.
    const stored = String(calls[0].binds[0]);
    expect(stored).toContain("<b>hi</b>");
    expect(stored).not.toContain("<script>");
  });

  it("throws UNAUTHORIZED without an editor, and never touches D1", async () => {
    const { db, calls } = makeD1(() => []);
    await expect(
      action.handler(
        { collection: "pages", key: "1", field: "title", value: "x" },
        makeCtx(db, null),
      ),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(calls).toHaveLength(0);
  });

  it("throws BAD_REQUEST for an unknown collection", async () => {
    const { db, calls } = makeD1(() => []);
    await expect(
      action.handler({ collection: "nope", key: "1", field: "title", value: "x" }, makeCtx(db)),
    ).rejects.toMatchObject({ code: "BAD_REQUEST", message: "Unknown collection" });
    expect(calls).toHaveLength(0);
  });

  it("throws BAD_REQUEST for an empty value", async () => {
    const { db } = makeD1(() => []);
    await expect(
      action.handler({ collection: "pages", key: "1", field: "title", value: "" }, makeCtx(db)),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("throws NOT_FOUND when no row is updated", async () => {
    const { db } = makeD1(() => []); // returning() yields nothing
    await expect(
      action.handler({ collection: "pages", key: "999", field: "title", value: "x" }, makeCtx(db)),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

const settingsAction = louiseSettingsAction({
  table: siteSettings,
  columns: ["siteName"],
  customKeys: ["heroHeadline"],
  ActionError: FakeActionError,
});

// One all-null settings row: the singleton read goes through drizzle's `.raw()`,
// and drizzle skips decoding for null cells, so an all-null array of the right
// length decodes to a row of nulls regardless of column types. `[]` = no row.
const settingsRow = [
  Array.from({ length: getTableConfig(siteSettings).columns.length }, () => null),
];

describe("louiseSettingsAction", () => {
  it("patches allowlisted keys and reports the ignored ones", async () => {
    const { db, calls } = makeD1(() => settingsRow);
    const out = await settingsAction.handler({ siteName: "Acme", bogus: "x" }, makeCtx(db));
    expect(out).toEqual({ ok: true, ignored: ["bogus"] });
    expect(calls.some((c) => /update/i.test(c.sql))).toBe(true);
  });

  it("throws UNAUTHORIZED without an editor, and never touches D1", async () => {
    const { db, calls } = makeD1(() => settingsRow);
    await expect(
      settingsAction.handler({ siteName: "Acme" }, makeCtx(db, null)),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(calls).toHaveLength(0);
  });

  it("throws NOT_FOUND when there is no settings row", async () => {
    const { db } = makeD1(() => []);
    await expect(settingsAction.handler({ siteName: "Acme" }, makeCtx(db))).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

const draftConfig = defineCollection({
  slug: "pages",
  fields: { slug: { type: "text" }, title: { type: "text" }, sections: { type: "json" } },
  versions: { drafts: true },
});
const saveDraftAction = louiseSaveDraftAction({
  table: pages,
  versionsTable: collectionVersionsTable(draftConfig),
  config: draftConfig,
  ActionError: FakeActionError,
});

// The merge-base / KV-buffer happy path saves a draft version to D1 and is
// covered by the astro-preview E2E against a real local D1 (there is no async
// in-memory SQLite harness in this repo) — mirroring versions-route.test.ts. These
// cover the Action wrapper contract, which short-circuits before that machinery.
describe("louiseSaveDraftAction", () => {
  it("input schema requires an integer id and a data object", () => {
    expect(saveDraftAction.input.safeParse({ id: 5, data: { title: "x" } }).success).toBe(true);
    expect(saveDraftAction.input.safeParse({ data: { title: "x" } }).success).toBe(false);
    expect(saveDraftAction.input.safeParse({ id: 1.5, data: {} }).success).toBe(false);
  });

  it("throws UNAUTHORIZED without an editor, and never touches D1", async () => {
    const { db, calls } = makeD1(() => []);
    await expect(
      saveDraftAction.handler({ id: 5, data: { title: "x" } }, makeCtx(db, null)),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(calls).toHaveLength(0);
  });

  it("throws NOT_FOUND when the versioned row does not exist", async () => {
    const { db } = makeD1(() => []); // the parent-row select yields nothing
    await expect(
      saveDraftAction.handler({ id: 999, data: { title: "x" } }, makeCtx(db)),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
