import { getTableConfig } from "drizzle-orm/sqlite-core";
import { describe, expect, it } from "vitest";
import { inquiries, pages, siteSettings } from "../../src/core/db/index.js";

const columnNames = (table: Parameters<typeof getTableConfig>[0]): Set<string> =>
  new Set(getTableConfig(table).columns.map((c) => c.name));

const byName = (table: Parameters<typeof getTableConfig>[0]) =>
  Object.fromEntries(getTableConfig(table).columns.map((c) => [c.name, c]));

describe("pages table", () => {
  it("maps to the expected SQLite table + column set", () => {
    expect(getTableConfig(pages).name).toBe("pages");
    expect(columnNames(pages)).toEqual(
      new Set([
        "id",
        "slug",
        "title",
        "body",
        "status",
        "seo_title",
        "seo_description",
        "og_image",
        "noindex",
        "sort_order",
        "created_at",
        "updated_at",
      ]),
    );
  });

  it("pins the key constraints (id primary; slug/title/status not-null)", () => {
    const cols = byName(pages);
    expect(cols.id.primary).toBe(true);
    expect(cols.slug.notNull).toBe(true);
    expect(cols.title.notNull).toBe(true);
    expect(cols.status.notNull).toBe(true);
    expect(cols.noindex.notNull).toBe(true);
  });
});

describe("inquiries table", () => {
  it("maps to the expected SQLite table + column set", () => {
    expect(getTableConfig(inquiries).name).toBe("inquiries");
    expect(columnNames(inquiries)).toEqual(
      new Set(["id", "first_name", "last_name", "email", "regarding", "message", "created_at"]),
    );
  });

  it("requires email + message", () => {
    const cols = byName(inquiries);
    expect(cols.email.notNull).toBe(true);
    expect(cols.message.notNull).toBe(true);
  });
});

describe("siteSettings table (regression)", () => {
  it("is the site_settings singleton", () => {
    expect(getTableConfig(siteSettings).name).toBe("site_settings");
  });
});
