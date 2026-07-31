import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { nodes } from "./nodes";
import { users } from "./users";

export const notes = pgTable("notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  nodeId: uuid("node_id").references(() => nodes.id, { onDelete: "set null" }),
  authorId: uuid("author_id").references(() => users.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
