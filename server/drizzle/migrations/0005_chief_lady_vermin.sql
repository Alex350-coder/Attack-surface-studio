ALTER TABLE "tool_runs" ADD COLUMN "target" text NOT NULL;--> statement-breakpoint
ALTER TABLE "tool_runs" ADD COLUMN "invocation" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "tool_runs" ADD COLUMN "queued_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "tool_runs" ADD COLUMN "triggered_by" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "tool_runs" ADD COLUMN "stats" jsonb;--> statement-breakpoint
ALTER TABLE "tool_runs" ADD COLUMN "error" jsonb;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tool_runs" ADD CONSTRAINT "tool_runs_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tool_runs_project_status_idx" ON "tool_runs" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tool_runs_project_created_idx" ON "tool_runs" USING btree ("project_id","created_at");