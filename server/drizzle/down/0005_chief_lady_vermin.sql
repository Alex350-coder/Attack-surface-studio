-- Down migration for 0005_chief_lady_vermin.sql
-- Hand-authored: drizzle-kit does not generate down migrations natively
-- (see ARCHITECTURE.md ADR "Hand-authored down migrations").
DROP INDEX IF EXISTS "tool_runs_project_created_idx";
DROP INDEX IF EXISTS "tool_runs_project_status_idx";

ALTER TABLE "tool_runs" DROP CONSTRAINT IF EXISTS "tool_runs_triggered_by_users_id_fk";

ALTER TABLE "tool_runs" DROP COLUMN IF EXISTS "error";
ALTER TABLE "tool_runs" DROP COLUMN IF EXISTS "stats";
ALTER TABLE "tool_runs" DROP COLUMN IF EXISTS "triggered_by";
ALTER TABLE "tool_runs" DROP COLUMN IF EXISTS "queued_at";
ALTER TABLE "tool_runs" DROP COLUMN IF EXISTS "invocation";
ALTER TABLE "tool_runs" DROP COLUMN IF EXISTS "target";
