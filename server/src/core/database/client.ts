import "dotenv/config";
import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema/index";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Runtime connection pool. Uses APP_DATABASE_URL (least-privilege role) --
 * never the migration-time owner connection (DATABASE_URL).
 */
const pool = new Pool({
  connectionString: requireEnv("APP_DATABASE_URL"),
});

export const db = drizzle(pool, { schema });

/**
 * Closes the runtime pool's connections. Used by e2e tests tearing down an ephemeral
 * Postgres container, so the pool doesn't observe an abrupt "administrator command"
 * termination once the container stops.
 */
export async function closeDatabasePool(): Promise<void> {
  await pool.end();
}

/**
 * Structural type shared by the pool-backed client and `db.transaction()` callbacks, so
 * repositories accept either without depending on the pool-only `$client` handle.
 */
export type Database = NodePgDatabase<typeof schema>;
