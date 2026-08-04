const TTL_PATTERN = /^(\d+)(s|m|h|d)$/;
const UNIT_TO_MS: Record<string, number> = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 };

/** Parses TTL strings like "15m"/"7d" (the same format accepted by `@nestjs/jwt`'s `expiresIn`) into milliseconds. */
export function ttlToMs(ttl: string): number {
  const match = TTL_PATTERN.exec(ttl);
  if (!match) {
    throw new Error(`Invalid TTL format: "${ttl}" (expected e.g. "15m" or "7d")`);
  }
  const [, amount, unit] = match;
  return Number(amount) * (UNIT_TO_MS[unit as string] ?? 0);
}
