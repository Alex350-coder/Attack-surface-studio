import { pgTable, uuid, text, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { reports } from "./reports";
import { users } from "./users";

// One row per (report, format) artifact -- independently cacheable/regenerable exports of a
// report. No project_id column: scope is derived through reports.project_id (see the join-based
// RLS policy in 0007_add_report_exports.sql, mirroring raw_outputs' app_can_access_tool_run
// pattern for tables without their own project_id).
export const reportExports = pgTable(
  "report_exports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    format: text("format").notNull(),
    blobRef: text("blob_ref").notNull(),
    checksum: text("checksum").notNull(),
    byteSize: integer("byte_size").notNull(),
    generatedBy: uuid("generated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("report_exports_report_format_unique").on(table.reportId, table.format)],
);
