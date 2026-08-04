-- Row-Level Security (DATA_MODEL.md §7, SECURITY_MODEL.md §4, ARCHITECTURE.md ADR
-- "Row-Level Security via session-scoped current_user_id"). This runs as the migration-owner
-- role (POSTGRES_USER), which stays exempt from RLS as the table owner -- so it never blocks
-- migrations, seeding, or the existing (non-RLS-aware) integration test harness that connects
-- as the same owner role. Only the least-privilege APP_DB_USER runtime role
-- (db/init/01-app-role.sh) is ever subject to these policies, which is the role the deployed
-- app actually queries as.

-- Reads the per-request session variable the app sets via `SET LOCAL app.current_user_id`
-- (see server/src/core/database/rls.ts). Returns NULL when unset, so policies fail closed.
CREATE OR REPLACE FUNCTION app_current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid;
$$;
--> statement-breakpoint

-- SECURITY DEFINER: evaluated with the function owner's (table owner's) privileges, which
-- bypasses project_members' own RLS policy -- this is what avoids infinite self-referential
-- policy recursion when project_members' own policy also calls this function.
CREATE OR REPLACE FUNCTION app_is_project_member(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id AND user_id = p_user_id
  );
$$;
--> statement-breakpoint

-- raw_outputs has no project_id column of its own; scope is derived through tool_runs.
CREATE OR REPLACE FUNCTION app_can_access_tool_run(p_tool_run_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tool_runs tr
    WHERE tr.id = p_tool_run_id AND app_is_project_member(tr.project_id, p_user_id)
  );
$$;
--> statement-breakpoint

-- Every project-scoped table gets the same shape: isolation on SELECT/UPDATE/DELETE via
-- membership, and a permissive INSERT (creation flows enforce authorization at the service
-- layer -- e.g. "may this user create a project" / "may this user add a node" -- since a
-- row's own membership link often doesn't exist yet at insert time; RLS here is defense in
-- depth for reads/writes against rows that already exist, not the primary authorization gate
-- for creation).
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_select_isolation" ON "projects" FOR SELECT USING (app_is_project_member(id, app_current_user_id()));
CREATE POLICY "projects_update_isolation" ON "projects" FOR UPDATE USING (app_is_project_member(id, app_current_user_id()));
CREATE POLICY "projects_delete_isolation" ON "projects" FOR DELETE USING (app_is_project_member(id, app_current_user_id()));
CREATE POLICY "projects_insert" ON "projects" FOR INSERT WITH CHECK (true);
--> statement-breakpoint

ALTER TABLE "project_members" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project_members_select_isolation" ON "project_members" FOR SELECT USING (app_is_project_member(project_id, app_current_user_id()));
CREATE POLICY "project_members_update_isolation" ON "project_members" FOR UPDATE USING (app_is_project_member(project_id, app_current_user_id()));
CREATE POLICY "project_members_delete_isolation" ON "project_members" FOR DELETE USING (app_is_project_member(project_id, app_current_user_id()));
CREATE POLICY "project_members_insert" ON "project_members" FOR INSERT WITH CHECK (true);
--> statement-breakpoint

ALTER TABLE "nodes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nodes_select_isolation" ON "nodes" FOR SELECT USING (app_is_project_member(project_id, app_current_user_id()));
CREATE POLICY "nodes_update_isolation" ON "nodes" FOR UPDATE USING (app_is_project_member(project_id, app_current_user_id()));
CREATE POLICY "nodes_delete_isolation" ON "nodes" FOR DELETE USING (app_is_project_member(project_id, app_current_user_id()));
CREATE POLICY "nodes_insert" ON "nodes" FOR INSERT WITH CHECK (true);
--> statement-breakpoint

ALTER TABLE "edges" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "edges_select_isolation" ON "edges" FOR SELECT USING (app_is_project_member(project_id, app_current_user_id()));
CREATE POLICY "edges_update_isolation" ON "edges" FOR UPDATE USING (app_is_project_member(project_id, app_current_user_id()));
CREATE POLICY "edges_delete_isolation" ON "edges" FOR DELETE USING (app_is_project_member(project_id, app_current_user_id()));
CREATE POLICY "edges_insert" ON "edges" FOR INSERT WITH CHECK (true);
--> statement-breakpoint

ALTER TABLE "tool_runs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tool_runs_select_isolation" ON "tool_runs" FOR SELECT USING (app_is_project_member(project_id, app_current_user_id()));
CREATE POLICY "tool_runs_update_isolation" ON "tool_runs" FOR UPDATE USING (app_is_project_member(project_id, app_current_user_id()));
CREATE POLICY "tool_runs_delete_isolation" ON "tool_runs" FOR DELETE USING (app_is_project_member(project_id, app_current_user_id()));
CREATE POLICY "tool_runs_insert" ON "tool_runs" FOR INSERT WITH CHECK (true);
--> statement-breakpoint

ALTER TABLE "evidence_files" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evidence_files_select_isolation" ON "evidence_files" FOR SELECT USING (app_is_project_member(project_id, app_current_user_id()));
CREATE POLICY "evidence_files_update_isolation" ON "evidence_files" FOR UPDATE USING (app_is_project_member(project_id, app_current_user_id()));
CREATE POLICY "evidence_files_delete_isolation" ON "evidence_files" FOR DELETE USING (app_is_project_member(project_id, app_current_user_id()));
CREATE POLICY "evidence_files_insert" ON "evidence_files" FOR INSERT WITH CHECK (true);
--> statement-breakpoint

ALTER TABLE "notes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notes_select_isolation" ON "notes" FOR SELECT USING (app_is_project_member(project_id, app_current_user_id()));
CREATE POLICY "notes_update_isolation" ON "notes" FOR UPDATE USING (app_is_project_member(project_id, app_current_user_id()));
CREATE POLICY "notes_delete_isolation" ON "notes" FOR DELETE USING (app_is_project_member(project_id, app_current_user_id()));
CREATE POLICY "notes_insert" ON "notes" FOR INSERT WITH CHECK (true);
--> statement-breakpoint

ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_select_isolation" ON "reports" FOR SELECT USING (app_is_project_member(project_id, app_current_user_id()));
CREATE POLICY "reports_update_isolation" ON "reports" FOR UPDATE USING (app_is_project_member(project_id, app_current_user_id()));
CREATE POLICY "reports_delete_isolation" ON "reports" FOR DELETE USING (app_is_project_member(project_id, app_current_user_id()));
CREATE POLICY "reports_insert" ON "reports" FOR INSERT WITH CHECK (true);
--> statement-breakpoint

-- Write-once audit trail (rawOutputs.ts): no UPDATE policy since these rows are never updated.
ALTER TABLE "raw_outputs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "raw_outputs_select_isolation" ON "raw_outputs" FOR SELECT USING (app_can_access_tool_run(tool_run_id, app_current_user_id()));
CREATE POLICY "raw_outputs_delete_isolation" ON "raw_outputs" FOR DELETE USING (app_can_access_tool_run(tool_run_id, app_current_user_id()));
CREATE POLICY "raw_outputs_insert" ON "raw_outputs" FOR INSERT WITH CHECK (true);
--> statement-breakpoint

-- Sessions are intentionally NOT RLS-protected (unlike users' auth mirror: no per-row identity
-- filtering here either). The refresh/login handshake looks up a session by its
-- refresh_token_hash (a 256-bit secret) *before* any user identity is known -- that lookup
-- can't be scoped by app_current_user_id() because there is no current user yet at that point
-- in the flow. Access control for sessions is therefore enforced by possession of the
-- unguessable refresh token itself (a capability, not an identity check), the same way
-- `users` is left unprotected by RLS. An ownership-based SELECT policy was evaluated and
-- rejected: Postgres re-checks SELECT policies against INSERT ... RETURNING before the
-- inserting request has any RLS context set, which made the very first `sessions.create()`
-- call during registration fail with "new row violates row-level security policy".
