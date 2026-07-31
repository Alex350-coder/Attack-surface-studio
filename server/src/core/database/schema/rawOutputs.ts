import { pgTable, uuid, text, bigint, timestamp } from "drizzle-orm/pg-core";
import { toolRuns } from "./toolRuns";

/**
 * Write-once audit trail: never updated, never soft-deleted (see DATA_MODEL.md §5).
 */
export const rawOutputs = pgTable("raw_outputs", {
  id: uuid("id").primaryKey().defaultRandom(),
  toolRunId: uuid("tool_run_id")
    .notNull()
    .references(() => toolRuns.id, { onDelete: "cascade" }),
  format: text("format").notNull(),
  contentRef: text("content_ref").notNull(),
  contentHash: text("content_hash").notNull(),
  byteSize: bigint("byte_size", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
