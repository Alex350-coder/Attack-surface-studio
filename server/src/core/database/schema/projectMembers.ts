import { pgTable, uuid, text, timestamp, unique } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { users } from "./users";

export const projectMembers = pgTable(
  "project_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("project_members_project_user_unique").on(table.projectId, table.userId)],
);
