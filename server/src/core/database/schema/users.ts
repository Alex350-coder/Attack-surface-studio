import { pgTable, uuid, text, timestamp, customType } from "drizzle-orm/pg-core";

/**
 * Postgres `citext` (case-insensitive text, `citext` extension) -- `email` is looked up and
 * uniquely constrained on this type so "User@example.com" and "user@example.com" collide at the
 * database level instead of relying on every call site remembering to `.toLowerCase()` (BE-*,
 * data-integrity: case-insensitive identity is a column-level guarantee, not an app convention).
 */
const citext = customType<{ data: string }>({
  dataType: () => "citext",
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: citext("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
