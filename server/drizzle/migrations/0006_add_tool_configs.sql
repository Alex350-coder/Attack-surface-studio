CREATE TABLE IF NOT EXISTS "tool_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"adapter_id" text NOT NULL,
	"execution_mode" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tool_configs_project_adapter_unique" UNIQUE("project_id","adapter_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tool_configs" ADD CONSTRAINT "tool_configs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- Project-scoped table: same RLS shape as every other project-scoped table
-- (0002_enable_row_level_security.sql) -- isolation on SELECT/UPDATE/DELETE via
-- app_is_project_member, permissive INSERT (authorization enforced at the service layer).
ALTER TABLE "tool_configs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tool_configs_select_isolation" ON "tool_configs" FOR SELECT USING (app_is_project_member(project_id, app_current_user_id()));
CREATE POLICY "tool_configs_update_isolation" ON "tool_configs" FOR UPDATE USING (app_is_project_member(project_id, app_current_user_id()));
CREATE POLICY "tool_configs_delete_isolation" ON "tool_configs" FOR DELETE USING (app_is_project_member(project_id, app_current_user_id()));
CREATE POLICY "tool_configs_insert" ON "tool_configs" FOR INSERT WITH CHECK (true);
