import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
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
export type Database = typeof db;
