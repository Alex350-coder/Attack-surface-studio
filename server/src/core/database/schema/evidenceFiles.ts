import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { nodes } from "./nodes";
import { users } from "./users";

export const evidenceFiles = pgTable("evidence_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  nodeId: uuid("node_id").references(() => nodes.id, { onDelete: "set null" }),
  fileRef: text("file_ref").notNull(),
  contentHash: text("content_hash").notNull(),
  mimeType: text("mime_type").notNull(),
  label: text("label"),
  uploadedBy: uuid("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
