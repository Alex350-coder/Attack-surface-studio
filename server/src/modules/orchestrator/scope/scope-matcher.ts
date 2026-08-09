import { isIP } from "node:net";
import type { ProjectScope } from "../../projects/repositories/project-scope.schema";
import { isValidCidr } from "../../shared/target-format";

function ipv4ToInt(address: string): number {
  return address
    .split(".")
    .reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function ipv6ToBigInt(address: string): bigint {
  const buffer = Buffer.alloc(16);
  const [head, tail] = address.split("::");
  const headGroups = head ? head.split(":").filter((g) => g.length > 0) : [];
  const tailGroups = tail ? tail.split(":").filter((g) => g.length > 0) : [];
  const missing = 8 - headGroups.length - tailGroups.length;
  const groups = address.includes("::")
    ? [...headGroups, ...Array<string>(missing).fill("0"), ...tailGroups]
    : address.split(":");

  groups.forEach((group, index) => {
    buffer.writeUInt16BE(parseInt(group || "0", 16), index * 2);
  });
  return buffer.readBigUInt64BE(0) << 64n | buffer.readBigUInt64BE(8);
}

function isIpInCidr(target: string, cidr: string): boolean {
  const [range, prefixRaw] = cidr.split("/");
  const prefix = Number(prefixRaw);
  if (!range) return false;

  const targetVersion = isIP(target);
  const rangeVersion = isIP(range);
  if (targetVersion === 0 || targetVersion !== rangeVersion) return false;

  if (targetVersion === 4) {
    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    return (ipv4ToInt(target) & mask) === (ipv4ToInt(range) & mask);
  }

  const mask = prefix === 0 ? 0n : (~0n << BigInt(128 - prefix)) & ((1n << 128n) - 1n);
  return (ipv6ToBigInt(target) & mask) === (ipv6ToBigInt(range) & mask);
}

/**
 * `*.example.com` authorizes any subdomain (`api.example.com`, `a.b.example.com`) but not the
 * apex `example.com` itself -- the apex must be listed as its own explicit scope entry.
 */
function isSubdomainOfWildcard(target: string, wildcardEntry: string): boolean {
  const suffix = wildcardEntry.slice(1); // "*.example.com" -> ".example.com"
  return target.toLowerCase().endsWith(suffix.toLowerCase()) && target.length > suffix.length;
}

function matchesScopeEntry(target: string, entry: string): boolean {
  const normalizedTarget = target.trim().toLowerCase();
  const normalizedEntry = entry.trim().toLowerCase();

  if (normalizedEntry.includes("/") && isValidCidr(normalizedEntry)) {
    return isIP(normalizedTarget) !== 0 && isIpInCidr(normalizedTarget, normalizedEntry);
  }
  if (normalizedEntry.startsWith("*.")) {
    return isSubdomainOfWildcard(normalizedTarget, normalizedEntry);
  }
  return normalizedTarget === normalizedEntry;
}

/**
 * Whether `target` is authorized to be scanned under `scope` (SECURITY_MODEL.md "Enforce scope
 * before execution", EXE-003). Excludes always win over includes -- an explicit deny cannot be
 * overridden by a broader include. Used both at enqueue time (orchestrator.service.ts) and again
 * at execution time by the worker, since a project's scope can change between the two.
 */
export function isTargetInScope(target: string, scope: ProjectScope): boolean {
  if (scope.excludes.some((entry) => matchesScopeEntry(target, entry))) {
    return false;
  }
  return scope.includes.some((entry) => matchesScopeEntry(target, entry));
}
