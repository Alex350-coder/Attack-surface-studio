import { z } from "zod";
import { isValidScopeEntry } from "../../shared/target-format";

const scopeEntrySchema = z
  .string()
  .trim()
  .min(1)
  .refine(isValidScopeEntry, {
    message: "Must be a hostname, wildcard domain, IP address, or CIDR range",
  });

/**
 * Shape of `projects.scope` — the authorized-target allow/deny list the Orchestrator checks
 * before any tool run (SECURITY_MODEL.md "Enforce scope before execution"). Kept minimal now;
 * Phase 6+ orchestrator work extends this schema rather than replacing it.
 */
const MAX_SCOPE_ENTRIES = 500;

export const projectScopeSchema = z.object({
  includes: z.array(scopeEntrySchema).max(MAX_SCOPE_ENTRIES).default([]),
  excludes: z.array(scopeEntrySchema).max(MAX_SCOPE_ENTRIES).default([]),
});

export type ProjectScope = z.infer<typeof projectScopeSchema>;
