// Copyright (c) 2026 BowenLabs. Louise (louisecms) is MIT licensed.
//
// Framework-owned `inquiries` — contact-form submissions. The generic column
// set is shared across Louise sites; add site-specific columns (e.g. a
// `clientId` soft link) by composing your own table from `inquiriesColumns`.

import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * The framework-generic `inquiries` columns. Spread into your own
 * `sqliteTable("inquiries", { ...inquiriesColumns, /* extras *​/ })` to extend,
 * or use the ready-made {@link inquiries} table.
 */
export const inquiriesColumns = {
  id: integer("id").primaryKey({ autoIncrement: true }),
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email").notNull(),
  regarding: text("regarding"),
  message: text("message").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
};

/**
 * The ready-made `inquiries` table. Use directly when the generic column set is
 * enough; otherwise compose your own from {@link inquiriesColumns}.
 */
export const inquiries = sqliteTable("inquiries", inquiriesColumns);

export type Inquiry = typeof inquiries.$inferSelect;
export type NewInquiry = typeof inquiries.$inferInsert;
