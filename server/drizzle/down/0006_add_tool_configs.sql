-- Hand-authored: drizzle-kit does not generate down migrations natively (see ARCHITECTURE.md ADR
-- "Hand-authored down migrations").

ALTER TABLE "tool_configs" DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tool_configs_insert" ON "tool_configs";
DROP POLICY IF EXISTS "tool_configs_delete_isolation" ON "tool_configs";
DROP POLICY IF EXISTS "tool_configs_update_isolation" ON "tool_configs";
DROP POLICY IF EXISTS "tool_configs_select_isolation" ON "tool_configs";

DROP TABLE IF EXISTS "tool_configs";
