/** Postgres error code for a unique-constraint violation (23505). */
const UNIQUE_VIOLATION_CODE = "23505";

/**
 * Narrows an unknown thrown value to a node-postgres error carrying a `code`, without pulling
 * in the `pg` package types here (repositories only depend on Drizzle's `Database` type).
 */
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === UNIQUE_VIOLATION_CODE
  );
}
