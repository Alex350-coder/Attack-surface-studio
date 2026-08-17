import { pgTable, uuid, text, jsonb, timestamp, unique } from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const toolConfigs = pgTable(
  "tool_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    adapterId: text("adapter_id").notNull(),
    executionMode: text("execution_mode").notNull(),
    config: jsonb("config").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("tool_configs_project_adapter_unique").on(table.projectId, table.adapterId)],
);
