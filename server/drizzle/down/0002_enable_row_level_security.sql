-- Down migration for 0002_enable_row_level_security.sql
-- Hand-authored: drizzle-kit does not generate down migrations natively
-- (see ARCHITECTURE.md ADR "Hand-authored down migrations").
ALTER TABLE "raw_outputs" DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "raw_outputs_insert" ON "raw_outputs";
DROP POLICY IF EXISTS "raw_outputs_delete_isolation" ON "raw_outputs";
DROP POLICY IF EXISTS "raw_outputs_select_isolation" ON "raw_outputs";

ALTER TABLE "reports" DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reports_insert" ON "reports";
DROP POLICY IF EXISTS "reports_delete_isolation" ON "reports";
DROP POLICY IF EXISTS "reports_update_isolation" ON "reports";
DROP POLICY IF EXISTS "reports_select_isolation" ON "reports";

ALTER TABLE "notes" DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notes_insert" ON "notes";
DROP POLICY IF EXISTS "notes_delete_isolation" ON "notes";
DROP POLICY IF EXISTS "notes_update_isolation" ON "notes";
DROP POLICY IF EXISTS "notes_select_isolation" ON "notes";

ALTER TABLE "evidence_files" DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "evidence_files_insert" ON "evidence_files";
DROP POLICY IF EXISTS "evidence_files_delete_isolation" ON "evidence_files";
DROP POLICY IF EXISTS "evidence_files_update_isolation" ON "evidence_files";
DROP POLICY IF EXISTS "evidence_files_select_isolation" ON "evidence_files";

ALTER TABLE "tool_runs" DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tool_runs_insert" ON "tool_runs";
DROP POLICY IF EXISTS "tool_runs_delete_isolation" ON "tool_runs";
DROP POLICY IF EXISTS "tool_runs_update_isolation" ON "tool_runs";
DROP POLICY IF EXISTS "tool_runs_select_isolation" ON "tool_runs";

ALTER TABLE "edges" DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "edges_insert" ON "edges";
DROP POLICY IF EXISTS "edges_delete_isolation" ON "edges";
DROP POLICY IF EXISTS "edges_update_isolation" ON "edges";
DROP POLICY IF EXISTS "edges_select_isolation" ON "edges";

ALTER TABLE "nodes" DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nodes_insert" ON "nodes";
DROP POLICY IF EXISTS "nodes_delete_isolation" ON "nodes";
DROP POLICY IF EXISTS "nodes_update_isolation" ON "nodes";
DROP POLICY IF EXISTS "nodes_select_isolation" ON "nodes";

ALTER TABLE "project_members" DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_members_insert" ON "project_members";
DROP POLICY IF EXISTS "project_members_delete_isolation" ON "project_members";
DROP POLICY IF EXISTS "project_members_update_isolation" ON "project_members";
DROP POLICY IF EXISTS "project_members_select_isolation" ON "project_members";

ALTER TABLE "projects" DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "projects_insert" ON "projects";
DROP POLICY IF EXISTS "projects_delete_isolation" ON "projects";
DROP POLICY IF EXISTS "projects_update_isolation" ON "projects";
DROP POLICY IF EXISTS "projects_select_isolation" ON "projects";

DROP FUNCTION IF EXISTS app_can_access_tool_run(uuid, uuid);
DROP FUNCTION IF EXISTS app_is_project_member(uuid, uuid);
DROP FUNCTION IF EXISTS app_current_user_id();
