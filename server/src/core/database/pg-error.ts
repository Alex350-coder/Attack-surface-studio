/** Postgres error code for a unique-constraint violation (23505). */
const UNIQUE_VIOLATION_CODE = "23505";

/** Bounds how far up an `error.cause` chain we'll look before giving up (BUG #4). */
const MAX_CAUSE_DEPTH = 5;

function getPgErrorCode(error: unknown): unknown {
  return typeof error === "object" && error !== null && "code" in error
    ? (error as { code?: unknown }).code
    : undefined;
}

function getCause(error: unknown): unknown {
  return typeof error === "object" && error !== null && "cause" in error
    ? (error as { cause?: unknown }).cause
    : undefined;
}

/**
 * Narrows an unknown thrown value to a node-postgres error carrying a `code`, without pulling
 * in the `pg` package types here (repositories only depend on Drizzle's `Database` type).
 *
 * Drizzle wraps the real driver error in a `DrizzleQueryError` whose own `code` is undefined --
 * the actual pg error (and its `23505` code) lives on `.cause` instead. Checking only the
 * top-level `code` silently missed every real unique-violation raised through a Drizzle query,
 * letting it escape as an unhandled 500 instead of the intended `ConflictError` (BUG #4). Walk
 * the `cause` chain so this works whether the code sits on the error itself or is nested behind
 * one (or more) wrapping layers.
 */
export function isUniqueViolation(error: unknown): boolean {
  let current = error;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH && current; depth += 1) {
    if (getPgErrorCode(current) === UNIQUE_VIOLATION_CODE) {
      return true;
    }
    current = getCause(current);
  }
  return false;
}
