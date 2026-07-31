-- Down migration for 0000_rich_ben_grimm.sql
-- Hand-authored: drizzle-kit does not generate down migrations natively
-- (see ARCHITECTURE.md ADR "Hand-authored down migrations").
DROP TABLE IF EXISTS "edges" CASCADE;
DROP TABLE IF EXISTS "evidence_files" CASCADE;
DROP TABLE IF EXISTS "notes" CASCADE;
DROP TABLE IF EXISTS "reports" CASCADE;
DROP TABLE IF EXISTS "raw_outputs" CASCADE;
DROP TABLE IF EXISTS "tool_runs" CASCADE;
DROP TABLE IF EXISTS "nodes" CASCADE;
DROP TABLE IF EXISTS "project_members" CASCADE;
DROP TABLE IF EXISTS "projects" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;
