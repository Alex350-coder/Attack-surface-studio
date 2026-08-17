import path from "node:path";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";

const APP_ROLE = "tools_e2e_app_role";
const APP_ROLE_PASSWORD = "tools_e2e_app_role_password";

interface AuthResponseBody {
  user: { email: string };
  tokens: { accessToken: string; refreshToken: string };
}

interface ProjectBody {
  id: string;
}

interface ToolListingBody {
  id: string;
  displayName: string;
  supportedModes: string[];
}

interface ToolConfigBody {
  id: string;
  projectId: string;
  adapterId: string;
  executionMode: string;
  config: Record<string, unknown>;
}

/** Narrows a Supertest response body (typed `any` by the library) to the envelope's `data`. */
function dataOf<T>(response: request.Response): T {
  return (response.body as { data: T }).data;
}

/**
 * Boots the real Nest app (AppModule) against an ephemeral Postgres instance connected as a
 * non-owner role, mirroring `projects.e2e.test.ts`, so RLS + `RolesGuard` are genuinely
 * exercised end-to-end for the Phase 7 tool detection/config routes.
 */
describe("Tool config flows (GET /api/v1/tools, /api/v1/projects/:id/tools/*)", () => {
  let container: StartedPostgreSqlContainer;
  let app: INestApplication;
  let authService: { register: (input: { email: string; password: string }) => Promise<AuthResponseBody> };

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine").start();
    const ownerConnectionUri = container.getConnectionUri();

    process.env.DATABASE_URL = ownerConnectionUri;
    process.env.CORS_ORIGINS = "";
    process.env.LOG_LEVEL = "fatal";
    process.env.JWT_ACCESS_SECRET = "e2e-access-secret-e2e-access-secret";
    process.env.JWT_ACCESS_TTL = "15m";
    process.env.JWT_REFRESH_TTL = "7d";

    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const { sql } = await import("drizzle-orm");
    const { Pool } = await import("pg");
    const schema = await import("../../src/core/database/schema");

    const migrationPool = new Pool({ connectionString: ownerConnectionUri });
    const migrationDb = drizzle(migrationPool, { schema });
    await migrate(migrationDb, { migrationsFolder: path.resolve(__dirname, "../../drizzle/migrations") });

    await migrationDb.execute(
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
    await migrationDb.execute(sql.raw(`GRANT USAGE ON SCHEMA public TO "${APP_ROLE}";`));
    await migrationDb.execute(sql.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${APP_ROLE}";`));
    await migrationDb.execute(sql.raw(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${APP_ROLE}";`));
    await migrationDb.execute(sql.raw(`GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO "${APP_ROLE}";`));
    await migrationPool.end();

    const url = new URL(ownerConnectionUri);
    url.username = APP_ROLE;
    url.password = APP_ROLE_PASSWORD;
    process.env.APP_DATABASE_URL = url.toString();

    const { AppModule } = await import("../../src/app.module");
    const { applyGlobalConventions } = await import("../../src/bootstrap");
    const { AuthService: AuthServiceClass } = await import("../../src/modules/auth/auth.service");
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    applyGlobalConventions(app);
    await app.init();
    authService = app.get(AuthServiceClass);
  }, 120_000);

  afterAll(async () => {
    const { closeDatabasePool } = await import("../../src/core/database/client");
    await app.close();
    await closeDatabasePool();
    await container.stop();
  });

  const server = () => app.getHttpServer() as Server;

  async function registerUser(emailPrefix: string): Promise<{ email: string; accessToken: string }> {
    const email = `${emailPrefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const result = await authService.register({ email, password: "a-strong-enough-password" });
    return { email, accessToken: result.tokens.accessToken };
  }

  async function createProject(owner: { accessToken: string }): Promise<ProjectBody> {
    const res = await request(server())
      .post("/api/v1/projects")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ name: "Tools Project", slug: `tools-project-${Date.now()}-${Math.random().toString(36).slice(2)}` });
    return dataOf<ProjectBody>(res);
  }

  it("lists the registered adapters for any authenticated user", async () => {
    const user = await registerUser("listing");

    const res = await request(server()).get("/api/v1/tools").set("Authorization", `Bearer ${user.accessToken}`);

    expect(res.status).toBe(200);
    const tools = dataOf<ToolListingBody[]>(res);
    expect(tools.map((t) => t.id).sort()).toEqual(["ffuf", "nmap", "nuclei", "stub"]);
  });

  it("rejects GET /tools without an Authorization header", async () => {
    const res = await request(server()).get("/api/v1/tools");
    expect(res.status).toBe(401);
  });

  it("lets an owner detect a tool in docker mode without touching the host", async () => {
    const owner = await registerUser("detect-owner");
    const project = await createProject(owner);

    const res = await request(server())
      .post(`/api/v1/projects/${project.id}/tools/nmap/detect`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ mode: "docker" });

    expect(res.status).toBe(201);
    expect(dataOf<{ available: boolean }>(res).available).toBe(true);
  });

  it("lets an owner write and read back project tool config", async () => {
    const owner = await registerUser("config-owner");
    const project = await createProject(owner);

    const writeRes = await request(server())
      .put(`/api/v1/projects/${project.id}/tools/nmap/config`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ executionMode: "docker", config: { scanType: "connect" } });

    expect(writeRes.status).toBe(200);
    const written = dataOf<ToolConfigBody>(writeRes);
    expect(written.adapterId).toBe("nmap");
    expect(written.executionMode).toBe("docker");
    expect(written.config).toEqual({ scanType: "connect" });

    const readRes = await request(server())
      .get(`/api/v1/projects/${project.id}/tools/nmap/config`)
      .set("Authorization", `Bearer ${owner.accessToken}`);

    expect(readRes.status).toBe(200);
    expect(dataOf<ToolConfigBody>(readRes).config).toEqual({ scanType: "connect" });
  });

  it("rejects a config write for an execution mode the adapter doesn't support", async () => {
    const owner = await registerUser("badmode-owner");
    const project = await createProject(owner);

    const res = await request(server())
      .put(`/api/v1/projects/${project.id}/tools/ffuf/config`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ executionMode: "not-a-real-mode", config: {} });

    expect(res.status).toBe(400);
  });

  it("rejects a non-member from reading or writing project tool config", async () => {
    const owner = await registerUser("isolated-owner");
    const outsider = await registerUser("isolated-outsider");
    const project = await createProject(owner);

    const readRes = await request(server())
      .get(`/api/v1/projects/${project.id}/tools/nmap/config`)
      .set("Authorization", `Bearer ${outsider.accessToken}`);
    expect(readRes.status).toBe(403);

    const writeRes = await request(server())
      .put(`/api/v1/projects/${project.id}/tools/nmap/config`)
      .set("Authorization", `Bearer ${outsider.accessToken}`)
      .send({ executionMode: "docker", config: {} });
    expect(writeRes.status).toBe(403);
  });

  it("rejects a member (non-admin) from detecting or configuring tools", async () => {
    const owner = await registerUser("member-owner");
    const member = await registerUser("member-user");
    const project = await createProject(owner);

    await request(server())
      .post(`/api/v1/projects/${project.id}/members`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ email: member.email, role: "member" });

    const detectRes = await request(server())
      .post(`/api/v1/projects/${project.id}/tools/nmap/detect`)
      .set("Authorization", `Bearer ${member.accessToken}`)
      .send({ mode: "docker" });
    expect(detectRes.status).toBe(403);

    const configRes = await request(server())
      .put(`/api/v1/projects/${project.id}/tools/nmap/config`)
      .set("Authorization", `Bearer ${member.accessToken}`)
      .send({ executionMode: "docker", config: {} });
    expect(configRes.status).toBe(403);
  });

  it("lets an admin (not just the owner) configure tools", async () => {
    const owner = await registerUser("admin-owner");
    const admin = await registerUser("admin-user");
    const project = await createProject(owner);

    await request(server())
      .post(`/api/v1/projects/${project.id}/members`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ email: admin.email, role: "admin" });

    const res = await request(server())
      .put(`/api/v1/projects/${project.id}/tools/nuclei/config`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ executionMode: "docker", config: { tags: ["exposure"] } });

    expect(res.status).toBe(200);
  });
});
