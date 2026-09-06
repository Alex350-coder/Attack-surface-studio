import { pgTable, uuid, text, jsonb, boolean, timestamp, unique, index } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { nodes } from "./nodes";
import { toolRuns } from "./toolRuns";

export const edges = pgTable(
  "edges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    targetId: uuid("target_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    animated: boolean("animated").notNull().default(false),
    label: text("label"),
    data: jsonb("data").notNull().default({}),
    sourceRunId: uuid("source_run_id").references(() => toolRuns.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    unique("edges_project_source_target_type_unique").on(
      table.projectId,
      table.sourceId,
      table.targetId,
      table.type,
    ),
    // The unique constraint above covers (projectId, sourceId, ...) lookups, but every reverse
    // traversal -- "what points at this node" (graph-traversal.repository.ts's inbound recursive
    // branch, getCriticalFindingsForAsset) -- filters by targetId, which isn't a leftmost column
    // in any existing index. Without this, those queries force a sequential scan on a table that
    // grows without bound as tool runs accumulate (PERF-004 forbids that).
    index("edges_project_target_idx").on(table.projectId, table.targetId),
  ],
);
