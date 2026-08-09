import { isIP } from "node:net";
import { z } from "zod";

const HOSTNAME_PATTERN = /^(\*\.)?(?=.{1,253}$)(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))*\.[a-z]{2,63}$/i;

function isValidCidr(value: string): boolean {
  const parts = value.split("/");
  if (parts.length !== 2) return false;
  const [address, prefix] = parts;
  if (!address || !prefix) return false;
  if (!/^\d+$/.test(prefix)) return false;

  const prefixNum = Number(prefix);
  const version = isIP(address);
  if (version === 4) return prefixNum >= 0 && prefixNum <= 32;
  if (version === 6) return prefixNum >= 0 && prefixNum <= 128;
  return false;
}

/**
 * A single scope entry is a hostname, a wildcard domain, a bare IP, or a CIDR range -- the
 * only target shapes the orchestrator (Phase 6+) will ever need to match against before
 * running a tool (SECURITY_MODEL.md "Enforce scope before execution").
 */
function isValidScopeEntry(value: string): boolean {
  if (isIP(value) !== 0) return true;
  if (value.includes("/")) return isValidCidr(value);
  return HOSTNAME_PATTERN.test(value);
}

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
