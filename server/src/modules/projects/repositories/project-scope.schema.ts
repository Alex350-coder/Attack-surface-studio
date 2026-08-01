import { z } from "zod";

/**
 * Shape of `projects.scope` — the authorized-target allow/deny list the Orchestrator checks
 * before any tool run (SECURITY_MODEL.md "Enforce scope before execution"). Kept minimal now;
 * Phase 6+ orchestrator work extends this schema rather than replacing it.
 */
export const projectScopeSchema = z.object({
  includes: z.array(z.string().min(1)).default([]),
  excludes: z.array(z.string().min(1)).default([]),
});

export type ProjectScope = z.infer<typeof projectScopeSchema>;
