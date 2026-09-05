-- Hand-authored: drizzle-kit does not generate down migrations natively (see ARCHITECTURE.md ADR
-- "Hand-authored down migrations").

ALTER TABLE "report_exports" DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "report_exports_insert" ON "report_exports";
DROP POLICY IF EXISTS "report_exports_delete_isolation" ON "report_exports";
DROP POLICY IF EXISTS "report_exports_update_isolation" ON "report_exports";
DROP POLICY IF EXISTS "report_exports_select_isolation" ON "report_exports";

DROP FUNCTION IF EXISTS app_can_access_report(uuid, uuid);

DROP TABLE IF EXISTS "report_exports";
