import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { sql } from "drizzle-orm";
import path from "node:path";
import * as schema from "../../src/core/database/schema";

/**
 * Ephemeral Postgres per test run (TEST-008). One container is started once and reused across
 * every integration test file for speed; each test truncates its own rows via `resetDatabase`.
 * There is a single DB role here (not the owner/least-privilege split docker-compose provisions
 * for the running app) because role separation is an operational concern for Phase 1's
 * `db/init/01-app-role.sh`, not something the test harness needs to reproduce.
 */
let container: StartedPostgreSqlContainer | undefined;
let pool: Pool | undefined;

export type TestDatabase = ReturnType<typeof drizzle<typeof schema>>;

export async function startTestDatabase(): Promise<TestDatabase> {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  pool = new Pool({ connectionString: container.getConnectionUri() });
  const db = drizzle(pool, { schema });

  await migrate(db, {
    migrationsFolder: path.resolve(__dirname, "../../drizzle/migrations"),
  });

  return db;
}

export async function stopTestDatabase(): Promise<void> {
  await pool?.end();
  await container?.stop();
  container = undefined;
  pool = undefined;
}

/** Connection coordinates for tests that need a second, non-owner Postgres role (e.g. RLS proof tests). */
export function getTestConnectionInfo(): { host: string; port: number; database: string } {
  if (!container) {
    throw new Error("Test database is not running -- call startTestDatabase() first.");
  }
  return {
    host: container.getHost(),
    port: container.getPort(),
    database: container.getDatabase(),
  };
}

const TABLES_IN_DEPENDENCY_ORDER = [
  "reports",
  "notes",
  "evidence_files",
  "raw_outputs",
  "tool_runs",
  "edges",
  "nodes",
  "project_members",
  "projects",
  "sessions",
  "users",
] as const;

/** Clears all rows between tests without tearing down the container (fast, isolated). */
export async function resetDatabase(db: TestDatabase): Promise<void> {
  for (const table of TABLES_IN_DEPENDENCY_ORDER) {
    await db.execute(sql.raw(`TRUNCATE TABLE ${table} CASCADE;`));
  }
}
