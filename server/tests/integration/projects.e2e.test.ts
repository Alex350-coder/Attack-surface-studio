import path from "node:path";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";

const APP_ROLE = "projects_e2e_app_role";
const APP_ROLE_PASSWORD = "projects_e2e_app_role_password";

interface AuthResponseBody {
  user: { email: string };
  tokens: { accessToken: string; refreshToken: string };
}

interface ProjectBody {
  id: string;
  name: string;
  slug: string;
  scope: { includes: string[]; excludes: string[] };
}

interface MemberBody {
  id: string;
  projectId: string;
  userId: string;
  role: string;
}

/** Narrows a Supertest response body (typed `any` by the library) to the envelope's `data`. */
function dataOf<T>(response: request.Response): T {
  return (response.body as { data: T }).data;
}

/**
 * Boots the real Nest app (AppModule) against an ephemeral Postgres instance connected as a
 * non-owner role, mirroring `auth.e2e.test.ts`, so RLS + `RolesGuard` are genuinely exercised
 * end-to-end for the Phase 5 `/projects/*` routes.
 */
describe("Projects flows (POST/GET/PATCH/DELETE /api/v1/projects/*)", () => {
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

  /**
   * Registers a user by calling `AuthService` directly rather than `POST /api/v1/auth/register`,
   * since that route's login-brute-force throttle (10/min) would otherwise be exhausted by this
   * suite's many test actors -- authentication itself is already covered end-to-end by
   * `auth.e2e.test.ts`; this suite's concern is `/projects/*` authorization.
   */
  async function registerUser(emailPrefix: string): Promise<{ email: string; accessToken: string }> {
    const email = `${emailPrefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const result = await authService.register({ email, password: "a-strong-enough-password" });
    return { email, accessToken: result.tokens.accessToken };
  }

  it("lets a user create a project and become its owner", async () => {
    const owner = await registerUser("owner");

    const res = await request(server())
      .post("/api/v1/projects")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ name: "Acme Recon", slug: `acme-recon-${Date.now()}` });

    expect(res.status).toBe(201);
    const project = dataOf<ProjectBody>(res);
    expect(project.name).toBe("Acme Recon");

    const membersRes = await request(server())
      .get(`/api/v1/projects/${project.id}/members`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(membersRes.status).toBe(200);
    const members = dataOf<MemberBody[]>(membersRes);
    expect(members).toHaveLength(1);
    expect(members[0]?.role).toBe("owner");
  });

  it("rejects creating a project with an invalid scope entry", async () => {
    const owner = await registerUser("badscope");

    const res = await request(server())
      .post("/api/v1/projects")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        name: "Bad Scope",
        slug: `bad-scope-${Date.now()}`,
        scope: { includes: ["not a valid host!!"], excludes: [] },
      });

    expect(res.status).toBe(400);
  });

  it("scopes GET /projects to the caller's own memberships", async () => {
    const owner = await registerUser("scoped-owner");
    const outsider = await registerUser("outsider");

    const createRes = await request(server())
      .post("/api/v1/projects")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ name: "Scoped Project", slug: `scoped-project-${Date.now()}` });
    const project = dataOf<ProjectBody>(createRes);

    const ownerListRes = await request(server())
      .get("/api/v1/projects")
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(dataOf<ProjectBody[]>(ownerListRes).some((p) => p.id === project.id)).toBe(true);

    const outsiderListRes = await request(server())
      .get("/api/v1/projects")
      .set("Authorization", `Bearer ${outsider.accessToken}`);
    expect(dataOf<ProjectBody[]>(outsiderListRes).some((p) => p.id === project.id)).toBe(false);
  });

  it("rejects a non-member reading project detail or graph", async () => {
    const owner = await registerUser("private-owner");
    const outsider = await registerUser("nonmember");

    const createRes = await request(server())
      .post("/api/v1/projects")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ name: "Private Project", slug: `private-project-${Date.now()}` });
    const project = dataOf<ProjectBody>(createRes);

    const detailRes = await request(server())
      .get(`/api/v1/projects/${project.id}`)
      .set("Authorization", `Bearer ${outsider.accessToken}`);
    expect(detailRes.status).toBe(403);

    const graphRes = await request(server())
      .get(`/api/v1/projects/${project.id}/graph`)
      .set("Authorization", `Bearer ${outsider.accessToken}`);
    expect(graphRes.status).toBe(403);
  });

  it("allows an added member to read the project and graph, but not update or delete it", async () => {
    const owner = await registerUser("team-owner");
    const member = await registerUser("team-member");

    const createRes = await request(server())
      .post("/api/v1/projects")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ name: "Team Project", slug: `team-project-${Date.now()}` });
    const project = dataOf<ProjectBody>(createRes);

    const addRes = await request(server())
      .post(`/api/v1/projects/${project.id}/members`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ email: member.email, role: "member" });
    expect(addRes.status).toBe(201);
    expect(dataOf<MemberBody>(addRes).role).toBe("member");

    const detailRes = await request(server())
      .get(`/api/v1/projects/${project.id}`)
      .set("Authorization", `Bearer ${member.accessToken}`);
    expect(detailRes.status).toBe(200);

    const graphRes = await request(server())
      .get(`/api/v1/projects/${project.id}/graph`)
      .set("Authorization", `Bearer ${member.accessToken}`);
    expect(graphRes.status).toBe(200);
    expect(dataOf<{ nodes: { items: unknown[] }; edges: { items: unknown[] } }>(graphRes).nodes.items).toEqual([]);

    const updateRes = await request(server())
      .patch(`/api/v1/projects/${project.id}`)
      .set("Authorization", `Bearer ${member.accessToken}`)
      .send({ name: "Renamed" });
    expect(updateRes.status).toBe(403);

    const deleteRes = await request(server())
      .delete(`/api/v1/projects/${project.id}`)
      .set("Authorization", `Bearer ${member.accessToken}`);
    expect(deleteRes.status).toBe(403);
  });

  it("lets an admin update the project scope, and rejects invalid scope entries", async () => {
    const owner = await registerUser("admin-owner");
    const admin = await registerUser("admin-user");

    const createRes = await request(server())
      .post("/api/v1/projects")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ name: "Admin Project", slug: `admin-project-${Date.now()}` });
    const project = dataOf<ProjectBody>(createRes);

    await request(server())
      .post(`/api/v1/projects/${project.id}/members`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ email: admin.email, role: "admin" });

    const validUpdateRes = await request(server())
      .patch(`/api/v1/projects/${project.id}`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ scope: { includes: ["example.com", "10.0.0.0/24"], excludes: [] } });
    expect(validUpdateRes.status).toBe(200);
    expect(dataOf<ProjectBody>(validUpdateRes).scope.includes).toEqual(["example.com", "10.0.0.0/24"]);

    const invalidUpdateRes = await request(server())
      .patch(`/api/v1/projects/${project.id}`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ scope: { includes: ["not valid!!"], excludes: [] } });
    expect(invalidUpdateRes.status).toBe(400);
  });

  it("rejects self-escalation and an admin assigning or touching the owner role", async () => {
    const owner = await registerUser("policy-owner");
    const admin = await registerUser("policy-admin");

    const createRes = await request(server())
      .post("/api/v1/projects")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ name: "Policy Project", slug: `policy-project-${Date.now()}` });
    const project = dataOf<ProjectBody>(createRes);

    const selfEscalateRes = await request(server())
      .post(`/api/v1/projects/${project.id}/members`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ email: owner.email, role: "admin" });
    expect(selfEscalateRes.status).toBe(403);

    await request(server())
      .post(`/api/v1/projects/${project.id}/members`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ email: admin.email, role: "admin" });

    const adminEscalatesSelfRes = await request(server())
      .post(`/api/v1/projects/${project.id}/members`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ email: admin.email, role: "owner" });
    expect(adminEscalatesSelfRes.status).toBe(403);

    const adminDemotesOwnerRes = await request(server())
      .post(`/api/v1/projects/${project.id}/members`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ email: owner.email, role: "member" });
    expect(adminDemotesOwnerRes.status).toBe(403);
  });

  it("only lets the owner soft-delete a project", async () => {
    const owner = await registerUser("delete-owner");
    const admin = await registerUser("delete-admin");

    const createRes = await request(server())
      .post("/api/v1/projects")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ name: "Delete Project", slug: `delete-project-${Date.now()}` });
    const project = dataOf<ProjectBody>(createRes);

    await request(server())
      .post(`/api/v1/projects/${project.id}/members`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ email: admin.email, role: "admin" });

    const adminDeleteRes = await request(server())
      .delete(`/api/v1/projects/${project.id}`)
      .set("Authorization", `Bearer ${admin.accessToken}`);
    expect(adminDeleteRes.status).toBe(403);

    const ownerDeleteRes = await request(server())
      .delete(`/api/v1/projects/${project.id}`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(ownerDeleteRes.status).toBe(200);

    const detailAfterDeleteRes = await request(server())
      .get(`/api/v1/projects/${project.id}`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(detailAfterDeleteRes.status).toBe(404);

    const patchAfterDeleteRes = await request(server())
      .patch(`/api/v1/projects/${project.id}`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ name: "Renamed after delete" });
    expect(patchAfterDeleteRes.status).toBe(404);
  });

  it("rejects every /projects route without an Authorization header", async () => {
    const res = await request(server()).get("/api/v1/projects");
    expect(res.status).toBe(401);
  });
});
