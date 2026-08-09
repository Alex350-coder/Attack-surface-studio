import { pgTable, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { users } from "./users";

export const toolRuns = pgTable(
  "tool_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    adapterId: text("adapter_id").notNull(),
    executionMode: text("execution_mode").notNull(),
    // Kept as its own column (see DATA_MODEL.md §3.4) so the execution-time scope re-check can
    // read it directly, without parsing the `invocation` JSONB blob on every worker pickup.
    target: text("target").notNull(),
    invocation: jsonb("invocation").notNull().default({}),
    status: text("status").notNull().default("queued"),
    queuedAt: timestamp("queued_at", { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    triggeredBy: uuid("triggered_by")
      .notNull()
      .references(() => users.id),
    stats: jsonb("stats"),
    error: jsonb("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("tool_runs_project_status_idx").on(table.projectId, table.status),
    index("tool_runs_project_created_idx").on(table.projectId, table.createdAt),
  ],
);
