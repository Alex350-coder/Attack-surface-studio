import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Pool } from "pg";

interface JournalEntry {
  idx: number;
  tag: string;
}

interface Journal {
  entries: JournalEntry[];
}

/**
 * Reverts the most recently applied forward migration by running its
 * hand-authored down/<tag>.sql file, then removing the matching row from
 * drizzle's own migrations journal table so `migrate` will re-apply it.
 * drizzle-kit does not generate down migrations natively -- see
 * ARCHITECTURE.md ADR "Hand-authored down migrations".
 */
async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required (see server/.env.example)");
  }

  const journalPath = path.resolve("drizzle/migrations/meta/_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf-8")) as Journal;
  if (journal.entries.length === 0) {
    throw new Error("No migrations recorded in the journal.");
  }

  const pool = new Pool({ connectionString });

  const { rows } = await pool.query<{ id: number; created_at: string }>(
    'SELECT id, created_at FROM "drizzle"."__drizzle_migrations" ORDER BY created_at DESC LIMIT 1',
  );
  if (rows.length === 0) {
    throw new Error("No migrations have been applied yet.");
  }

  const appliedCount = await pool.query<{ count: string }>(
    'SELECT count(*)::text AS count FROM "drizzle"."__drizzle_migrations"',
  );
  const lastIdx = Number(appliedCount.rows[0]?.count ?? "0") - 1;
  const entry = journal.entries.find((e) => e.idx === lastIdx);
  if (!entry) {
    throw new Error(`Could not find journal entry for applied migration index ${lastIdx}.`);
  }

  const downPath = path.resolve(`drizzle/down/${entry.tag}.sql`);
  const downSql = readFileSync(downPath, "utf-8");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(downSql);
    await client.query('DELETE FROM "drizzle"."__drizzle_migrations" WHERE id = $1', [rows[0]?.id]);
    await client.query("COMMIT");
    console.log(`Reverted migration ${entry.tag}.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  await pool.end();
}

main().catch((error: unknown) => {
  console.error("Down migration failed:", error);
  process.exit(1);
});
