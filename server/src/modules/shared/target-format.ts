import { isIP } from "node:net";

/**
 * Shared hostname/CIDR validation primitives (PD-009 DRY) -- used by both
 * `project-scope.schema.ts` (defining what a project is authorized to scan) and the
 * orchestrator's `scope-matcher.ts` (matching a requested run target against that scope).
 * Kept dependency-free of Zod so it can be reused by plain TypeScript, not just schemas.
 */
export const HOSTNAME_PATTERN =
  /^(\*\.)?(?=.{1,253}$)(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))*\.[a-z]{2,63}$/i;

export function isValidHostname(value: string): boolean {
  return HOSTNAME_PATTERN.test(value);
}

export function isValidCidr(value: string): boolean {
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

export function isValidIp(value: string): boolean {
  return isIP(value) !== 0;
}

/**
 * A single scope entry is a hostname, a wildcard domain, a bare IP, or a CIDR range -- the
 * only target shapes the orchestrator (Phase 6+) will ever need to match against before
 * running a tool (SECURITY_MODEL.md "Enforce scope before execution").
 */
export function isValidScopeEntry(value: string): boolean {
  if (isValidIp(value)) return true;
  if (value.includes("/")) return isValidCidr(value);
  return isValidHostname(value);
}
