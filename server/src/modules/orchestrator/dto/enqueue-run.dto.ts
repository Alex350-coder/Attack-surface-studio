import { z } from "zod";
import { isValidScopeEntry } from "../../shared/target-format";

const EXECUTION_MODES = ["local", "docker"] as const;

/**
 * A run target must be a concrete, resolvable thing to scan -- unlike a project's `scope`
 * entries, it can never be a wildcard domain (`*.example.com` names a whole subdomain family,
 * not a single tool-run target).
 */
const targetSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => isValidScopeEntry(value) && !value.startsWith("*."), {
    message: "Must be a concrete hostname, IP address, or CIDR range (no wildcards)",
  });

/**
 * `options` is intentionally opaque here (OWA-011 mass-assignment guard still applies at the
 * adapter boundary): each `ToolAdapter.buildInvocation` is responsible for validating its own
 * options against its own Zod schema (INTEGRATION_SYSTEM.md §4) before it ever becomes an
 * `Invocation`. The Orchestrator never interprets `options` itself.
 */
export const enqueueRunSchema = z.object({
  adapterId: z.string().trim().min(1).max(100),
  executionMode: z.enum(EXECUTION_MODES),
  target: targetSchema,
  options: z.unknown().optional(),
});
export type EnqueueRunDto = z.infer<typeof enqueueRunSchema>;
