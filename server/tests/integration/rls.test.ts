import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { getTestConnectionInfo, resetDatabase, startTestDatabase, stopTestDatabase, type TestDatabase } from "./setup";
import * as schema from "../../src/core/database/schema";
import { DrizzleProjectsRepository } from "../../src/modules/projects/repositories/projects.repository";
import { DrizzleUsersRepository } from "../../src/modules/users/repositories/users.repository";
import { DrizzleProjectMembersRepository } from "../../src/modules/projects/repositories/project-members.repository";

/**
 * Proves migration 0002's RLS policies actually enforce isolation. The shared `setup.ts`
 * harness connects as the container's owner role, which Postgres exempts from RLS by design
 * (see ARCHITECTURE.md ADR "Row-Level Security via session variable + owner bypass") -- so this
 * file provisions its own non-owner login role, mirroring db/init/01-app-role.sh's grants, to
 * connect as a genuinely RLS-subject role the way the deployed app's APP_DB_USER does.
 */
describe("Row-Level Security", () => {
  let ownerDb: TestDatabase;
  let appPool: Pool;
  let appDb: ReturnType<typeof drizzle<typeof schema>>;

  const APP_ROLE = "rls_test_app_role";
  const APP_ROLE_PASSWORD = "rls_test_password";

  beforeAll(async () => {
    ownerDb = await startTestDatabase();

    await ownerDb.execute(
      sql.raw(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${APP_ROLE}') THEN
            CREATE ROLE "${APP_ROLE}" LOGIN PASSWORD '${APP_ROLE_PASSWORD}';
          END IF;
        END
        $$;
      `),
    );
    await ownerDb.execute(sql.raw(`GRANT USAGE ON SCHEMA public TO "${APP_ROLE}";`));
    await ownerDb.execute(sql.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${APP_ROLE}";`));
    await ownerDb.execute(sql.raw(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${APP_ROLE}";`));

    const connectionInfo = getTestConnectionInfo();
    appPool = new Pool({
      host: connectionInfo.host,
      port: connectionInfo.port,
      database: connectionInfo.database,
      user: APP_ROLE,
      password: APP_ROLE_PASSWORD,
    });
    appDb = drizzle(appPool, { schema });
  }, 120_000);

  afterAll(async () => {
    await appPool?.end();
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await resetDatabase(ownerDb);
  });

  async function createFixtures() {
    const projectsRepo = new DrizzleProjectsRepository(ownerDb);
    const usersRepo = new DrizzleUsersRepository(ownerDb);
    const membersRepo = new DrizzleProjectMembersRepository(ownerDb);

    const projectA = await projectsRepo.create({ name: "Project A", slug: "project-a" });
    const projectB = await projectsRepo.create({ name: "Project B", slug: "project-b" });
    const userA = await usersRepo.create({ email: "a@example.com", passwordHash: "hash" });
    const userB = await usersRepo.create({ email: "b@example.com", passwordHash: "hash" });

    await membersRepo.addMember({ projectId: projectA.id, userId: userA.id, role: "owner" });
    await membersRepo.addMember({ projectId: projectB.id, userId: userB.id, role: "owner" });

    return { projectA, projectB, userA, userB };
  }

  it("lets a member see only their own project through the app role", async () => {
    const { projectA, projectB, userA } = await createFixtures();

    const visible = await appDb.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.current_user_id', ${userA.id}, true)`);
      return tx.select().from(schema.projects);
    });

    const visibleIds = visible.map((row) => row.id);
    expect(visibleIds).toContain(projectA.id);
    expect(visibleIds).not.toContain(projectB.id);
  });

  it("returns no rows through the app role when no user context is set (fail-closed)", async () => {
    await createFixtures();

    const visible = await appDb.select().from(schema.projects);

    expect(visible).toHaveLength(0);
  });

  it("does not restrict the owner-role connection used by the rest of the test suite", async () => {
    const { projectA, projectB } = await createFixtures();

    const visible = await ownerDb.select().from(schema.projects);

    const visibleIds = visible.map((row) => row.id);
    expect(visibleIds).toContain(projectA.id);
    expect(visibleIds).toContain(projectB.id);
  });

  it("blocks a member from updating another project's row through the app role", async () => {
    const { projectB, userA } = await createFixtures();

    await appDb.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.current_user_id', ${userA.id}, true)`);
      await tx
        .update(schema.projects)
        .set({ name: "Hijacked" })
        .where(sql`${schema.projects.id} = ${projectB.id}`);
    });

    const [row] = await ownerDb.select().from(schema.projects).where(sql`${schema.projects.id} = ${projectB.id}`);
    expect(row?.name).toBe("Project B");
  });
});
