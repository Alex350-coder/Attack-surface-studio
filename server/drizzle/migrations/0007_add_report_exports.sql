CREATE TABLE IF NOT EXISTS "report_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"format" text NOT NULL,
	"blob_ref" text NOT NULL,
	"checksum" text NOT NULL,
	"byte_size" integer NOT NULL,
	"generated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_exports_report_format_unique" UNIQUE("report_id","format")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "report_exports" ADD CONSTRAINT "report_exports_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "report_exports" ADD CONSTRAINT "report_exports_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

ALTER TABLE "report_exports" ADD CONSTRAINT "report_exports_format_check" CHECK ("format" IN (
	'pdf', 'html', 'markdown'
));
--> statement-breakpoint

CREATE INDEX "report_exports_report_id_idx" ON "report_exports" ("report_id");
--> statement-breakpoint

-- report_exports has no project_id column of its own; scope is derived through reports
-- (SECURITY DEFINER helper mirrors app_can_access_tool_run's shape for raw_outputs, the other
-- project-scoped-via-join table -- see 0002_enable_row_level_security.sql).
CREATE OR REPLACE FUNCTION app_can_access_report(p_report_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM reports r
    WHERE r.id = p_report_id AND app_is_project_member(r.project_id, p_user_id)
  );
$$;
--> statement-breakpoint

ALTER TABLE "report_exports" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "report_exports_select_isolation" ON "report_exports" FOR SELECT USING (app_can_access_report(report_id, app_current_user_id()));
CREATE POLICY "report_exports_update_isolation" ON "report_exports" FOR UPDATE USING (app_can_access_report(report_id, app_current_user_id()));
CREATE POLICY "report_exports_delete_isolation" ON "report_exports" FOR DELETE USING (app_can_access_report(report_id, app_current_user_id()));
CREATE POLICY "report_exports_insert" ON "report_exports" FOR INSERT WITH CHECK (true);
