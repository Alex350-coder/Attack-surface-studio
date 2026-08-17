/**
 * Stable identity-key builders shared by every adapter (INTEGRATION_SYSTEM.md §6): the same
 * real-world fact discovered by two different tools must converge on one node. Adapters MUST
 * build identity keys through these helpers rather than inlining the format themselves (CQ-014)
 * so a future adapter cannot silently diverge from the convention (e.g. `ip:1.2.3.4` vs
 * `ip:/1.2.3.4`) and defeat dedup.
 */

export function ipIdentityKey(address: string): string {
  return `ip:${address}`;
}

export function hostIdentityKey(host: string): string {
  return `host:${host}`;
}

export function portIdentityKey(host: string, port: number): string {
  return `host:${host}:${port}`;
}

export function serviceIdentityKey(host: string, port: number): string {
  return `service:${host}:${port}`;
}

export function osIdentityKey(host: string): string {
  return `os:${host}`;
}

export function assetIdentityKey(url: string): string {
  return `asset:${url}`;
}

export function findingIdentityKey(host: string, templateId: string): string {
  return `finding:${host}:${templateId}`;
}
