import { pgTable, uuid, text, jsonb, timestamp, unique } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { toolRuns } from "./toolRuns";
import { users } from "./users";

export const nodes = pgTable(
  "nodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    category: text("category").notNull(),
    identityKey: text("identity_key").notNull(),
    label: text("label").notNull(),
    severity: text("severity"),
    data: jsonb("data").notNull().default({}),
    sourceRunId: uuid("source_run_id").references(() => toolRuns.id),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [unique("nodes_project_identity_unique").on(table.projectId, table.identityKey)],
);
