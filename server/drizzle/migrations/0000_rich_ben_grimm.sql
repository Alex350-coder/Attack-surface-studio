CREATE TABLE IF NOT EXISTS "edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"type" text NOT NULL,
	"animated" boolean DEFAULT false NOT NULL,
	"label" text,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "edges_project_source_target_type_unique" UNIQUE("project_id","source_id","target_id","type")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "evidence_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"node_id" uuid,
	"file_ref" text NOT NULL,
	"content_hash" text NOT NULL,
	"mime_type" text NOT NULL,
	"label" text,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"type" text NOT NULL,
	"category" text NOT NULL,
	"identity_key" text NOT NULL,
	"label" text NOT NULL,
	"severity" text,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_run_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "nodes_project_identity_unique" UNIQUE("project_id","identity_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"node_id" uuid,
	"author_id" uuid,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_members_project_user_unique" UNIQUE("project_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"scope" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "raw_outputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tool_run_id" uuid NOT NULL,
	"format" text NOT NULL,
	"content_ref" text NOT NULL,
	"content_hash" text NOT NULL,
	"byte_size" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"graph_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"content_ref" text,
	"generated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tool_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"adapter_id" text NOT NULL,
	"execution_mode" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "edges" ADD CONSTRAINT "edges_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "edges" ADD CONSTRAINT "edges_source_id_nodes_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "edges" ADD CONSTRAINT "edges_target_id_nodes_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "edges" ADD CONSTRAINT "edges_source_run_id_tool_runs_id_fk" FOREIGN KEY ("source_run_id") REFERENCES "public"."tool_runs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "evidence_files" ADD CONSTRAINT "evidence_files_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "evidence_files" ADD CONSTRAINT "evidence_files_node_id_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."nodes"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "evidence_files" ADD CONSTRAINT "evidence_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nodes" ADD CONSTRAINT "nodes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nodes" ADD CONSTRAINT "nodes_source_run_id_tool_runs_id_fk" FOREIGN KEY ("source_run_id") REFERENCES "public"."tool_runs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nodes" ADD CONSTRAINT "nodes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notes" ADD CONSTRAINT "notes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notes" ADD CONSTRAINT "notes_node_id_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."nodes"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notes" ADD CONSTRAINT "notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "raw_outputs" ADD CONSTRAINT "raw_outputs_tool_run_id_tool_runs_id_fk" FOREIGN KEY ("tool_run_id") REFERENCES "public"."tool_runs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reports" ADD CONSTRAINT "reports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reports" ADD CONSTRAINT "reports_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tool_runs" ADD CONSTRAINT "tool_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
-- CHECK constraints enforcing the node/edge taxonomy and fixed status enums
-- (Claude.md §8, DATA_MODEL.md §7 "Constraints do real work").
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_category_check" CHECK ("category" IN (
	'infrastructure', 'security', 'artifact', 'intelligence'
));
--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_type_check" CHECK ("type" IN (
	'domain', 'subdomain', 'ip', 'host', 'port', 'service', 'technology', 'os',
	'container', 'cloud', 'asset', 'finding', 'criticalFinding', 'evidence',
	'screenshot', 'request', 'response', 'report', 'note', 'aiInsight'
));
--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_severity_check" CHECK ("severity" IS NULL OR "severity" IN (
	'info', 'warning', 'critical'
));
--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_type_check" CHECK ("type" IN (
	'discovery', 'relationship', 'evidence', 'risk', 'ai'
));
--> statement-breakpoint
ALTER TABLE "tool_runs" ADD CONSTRAINT "tool_runs_status_check" CHECK ("status" IN (
	'queued', 'running', 'succeeded', 'failed', 'cancelled'
));
--> statement-breakpoint
ALTER TABLE "tool_runs" ADD CONSTRAINT "tool_runs_execution_mode_check" CHECK ("execution_mode" IN (
	'local', 'docker'
));
--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_status_check" CHECK ("status" IN (
	'draft', 'generating', 'ready', 'failed'
));
--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_role_check" CHECK ("role" IN (
	'owner', 'admin', 'member', 'viewer'
));
--> statement-breakpoint
-- Traversal indexes: every project-scoped FK is indexed so recursive CTEs
-- (DATA_MODEL.md §6) and list queries stay index-backed (Claude.md §15).
CREATE INDEX "nodes_project_type_idx" ON "nodes" ("project_id", "type");
--> statement-breakpoint
CREATE INDEX "nodes_project_category_idx" ON "nodes" ("project_id", "category");
--> statement-breakpoint
CREATE INDEX "nodes_project_severity_idx" ON "nodes" ("project_id", "severity");
--> statement-breakpoint
CREATE INDEX "edges_project_source_idx" ON "edges" ("project_id", "source_id");
--> statement-breakpoint
CREATE INDEX "edges_project_target_idx" ON "edges" ("project_id", "target_id");
--> statement-breakpoint
CREATE INDEX "tool_runs_project_idx" ON "tool_runs" ("project_id");
--> statement-breakpoint
CREATE INDEX "raw_outputs_tool_run_idx" ON "raw_outputs" ("tool_run_id");
--> statement-breakpoint
CREATE INDEX "evidence_files_project_idx" ON "evidence_files" ("project_id");
--> statement-breakpoint
CREATE INDEX "notes_project_idx" ON "notes" ("project_id");
--> statement-breakpoint
CREATE INDEX "reports_project_idx" ON "reports" ("project_id");
--> statement-breakpoint
CREATE INDEX "project_members_project_idx" ON "project_members" ("project_id");
--> statement-breakpoint
-- GIN indexes on the open-shape JSONB metadata columns (DATA_MODEL.md §3.2/§4).
CREATE INDEX "nodes_data_gin_idx" ON "nodes" USING GIN ("data");
--> statement-breakpoint
CREATE INDEX "edges_data_gin_idx" ON "edges" USING GIN ("data");
--> statement-breakpoint
CREATE INDEX "projects_scope_gin_idx" ON "projects" USING GIN ("scope");
--> statement-breakpoint
CREATE INDEX "reports_graph_snapshot_gin_idx" ON "reports" USING GIN ("graph_snapshot");
