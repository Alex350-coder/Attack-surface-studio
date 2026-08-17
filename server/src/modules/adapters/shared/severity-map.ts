import type { Severity } from "../../../contracts/node.schema";

/**
 * Maps the severity vocabularies real tools use onto the platform's 3-level taxonomy
 * (`info | warning | critical` -- `node.schema.ts`). Shared across adapters (INTEGRATION_SYSTEM.md
 * §6 "severity maps to the taxonomy") so two tools reporting the same real-world severity land on
 * the same platform severity.
 */
const SEVERITY_MAP: Record<string, Severity> = {
  critical: "critical",
  high: "critical",
  medium: "warning",
  low: "warning",
  info: "info",
  informational: "info",
  unknown: "info",
};

/** Unrecognized input maps to `info` rather than throwing -- an unknown severity is never fatal. */
export function toPlatformSeverity(rawSeverity: string): Severity {
  return SEVERITY_MAP[rawSeverity.trim().toLowerCase()] ?? "info";
}
