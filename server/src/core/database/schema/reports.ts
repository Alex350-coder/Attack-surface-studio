import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { users } from "./users";

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: text("status").notNull().default("draft"),
  // Set of node/edge ids the report was built from, so it stays reproducible and auditable.
  graphSnapshot: jsonb("graph_snapshot").notNull().default({}),
  contentRef: text("content_ref"),
  generatedBy: uuid("generated_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
