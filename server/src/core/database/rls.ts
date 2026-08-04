import { AsyncLocalStorage } from "node:async_hooks";
import { sql } from "drizzle-orm";
import { db as pooledDb, type Database } from "./client";

/**
 * Carries the current request's RLS-scoped transaction so repositories called deeper in the
 * call stack (via `getScopedDb()`) automatically participate in it, without threading a
 * `Database` parameter through every service method (DATA_MODEL.md §7, SECURITY_MODEL.md §4).
 */
const requestDbStorage = new AsyncLocalStorage<Database>();

/**
 * Runs `fn` inside a transaction with the Postgres session variable `app.current_user_id` set
 * to `userId`, which the RLS policies from migration 0002 read via `app_current_user_id()`.
 * Only the least-privilege APP_DB_USER runtime role is actually subject to those policies (the
 * migration-owner role used by tests/migrations bypasses RLS as the table owner) -- see
 * ARCHITECTURE.md ADR "Row-Level Security via session-scoped current_user_id".
 */
export async function runWithUserContext<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  return pooledDb.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_user_id', ${userId}, true)`);
    return requestDbStorage.run(tx, fn);
  });
}

/**
 * Returns the current request's RLS-scoped transaction client if one is active, otherwise the
 * plain pooled client (public/unauthenticated routes, scripts, and tests that don't need RLS).
 */
export function getScopedDb(): Database {
  return requestDbStorage.getStore() ?? pooledDb;
}

/**
 * A `Database`-shaped proxy that resolves to `getScopedDb()` on every property access, instead
 * of a single instance captured once at DI-construction time. Repositories are constructed once
 * (singleton scope) and hold onto whatever `Database` they were given -- injecting the plain
 * pooled `db` directly would mean every query bypasses `runWithUserContext`'s transaction no
 * matter how many requests come and go, since the constructor only ever sees the pool. This
 * proxy is what `DATABASE_CONNECTION` actually provides (see `database.module.ts`), so every
 * repository call transparently participates in the current request's RLS context, if any.
 */
export const scopedDb: Database = new Proxy({} as Database, {
  get(_target, property): unknown {
    const current = getScopedDb();
    const value: unknown = Reflect.get(current, property, current);
    return typeof value === "function" ? value.bind(current) : value;
  },
});
