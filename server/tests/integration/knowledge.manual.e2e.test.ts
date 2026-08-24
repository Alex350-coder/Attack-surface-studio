import path from "node:path";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";

const APP_ROLE = "knowledge_manual_e2e_app_role";
const APP_ROLE_PASSWORD = "knowledge_manual_e2e_app_role_password";

process.env.THROTTLE_LIMIT = "100000";
process.env.THROTTLE_TTL_MS = "60000";

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

interface NodeBody {
  id: string;
  identityKey: string;
  type: string;
  category: string;
  label: string;
  sourceRunId: string | null;
  createdBy: string | null;
}

interface EdgeBody {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
}

function dataOf<T>(response: request.Response): T {
  return (response.body as { data: T }).data;
}

describe("Manual knowledge contributions (POST /api/v1/projects/:id/nodes, /edges)", () => {
  let pgContainer: StartedPostgreSqlContainer;
  let app: INestApplication;
  let authService: { register: (input: { email: string; password: string }) => Promise<AuthResponseBody> };

  beforeAll(async () => {
    pgContainer = await new PostgreSqlContainer("postgres:16-alpine").start();
    const ownerConnectionUri = pgContainer.getConnectionUri();

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
  }, 180_000);

  afterAll(async () => {
    const { closeDatabasePool } = await import("../../src/core/database/client");
    await app.close();
    await closeDatabasePool();
    await pgContainer.stop();
  }, 60_000);

  const server = () => app.getHttpServer() as Server;

  async function registerUser(emailPrefix: string): Promise<{ email: string; accessToken: string }> {
    const email = `${emailPrefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const result = await authService.register({ email, password: "a-strong-enough-password" });
    return { email, accessToken: result.tokens.accessToken };
  }

  async function createProject(accessToken: string, name: string): Promise<ProjectBody> {
    const res = await request(server())
      .post("/api/v1/projects")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name,
        slug: `${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        scope: { includes: ["example.com"], excludes: [] },
      });
    expect(res.status).toBe(201);
    return dataOf<ProjectBody>(res);
  }

  it("lets a member add a manual node with server-stamped createdBy/sourceRunId", async () => {
    const owner = await registerUser("manual-node-owner");
    const project = await createProject(owner.accessToken, "Manual Node Project");

    const res = await request(server())
      .post(`/api/v1/projects/${project.id}/nodes`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        identityKey: `manual:${project.id}:host-1`,
        type: "host",
        category: "infrastructure",
        label: "Manually added host",
      });

    expect(res.status).toBe(201);
    const node = dataOf<NodeBody>(res);
    expect(node.identityKey).toBe(`manual:${project.id}:host-1`);
    expect(node.sourceRunId).toBeNull();
    expect(node.createdBy).not.toBeNull();
  });

  it("lets a member add a manual edge between two existing nodes", async () => {
    const owner = await registerUser("manual-edge-owner");
    const project = await createProject(owner.accessToken, "Manual Edge Project");

    const nodeARes = await request(server())
      .post(`/api/v1/projects/${project.id}/nodes`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ identityKey: `manual:${project.id}:node-a`, type: "domain", category: "infrastructure", label: "Node A" });
    const nodeBRes = await request(server())
      .post(`/api/v1/projects/${project.id}/nodes`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ identityKey: `manual:${project.id}:node-b`, type: "subdomain", category: "infrastructure", label: "Node B" });
    const nodeA = dataOf<NodeBody>(nodeARes);
    const nodeB = dataOf<NodeBody>(nodeBRes);

    const edgeRes = await request(server())
      .post(`/api/v1/projects/${project.id}/edges`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ sourceId: nodeA.id, targetId: nodeB.id, type: "relationship" });

    expect(edgeRes.status).toBe(201);
    const edge = dataOf<EdgeBody>(edgeRes);
    expect(edge.sourceId).toBe(nodeA.id);
    expect(edge.targetId).toBe(nodeB.id);
    expect(edge.type).toBe("relationship");
  });

  it("rejects a non-member from adding a manual node", async () => {
    const owner = await registerUser("manual-node-rbac-owner");
    const outsider = await registerUser("manual-node-rbac-outsider");
    const project = await createProject(owner.accessToken, "Manual Node RBAC Project");

    const res = await request(server())
      .post(`/api/v1/projects/${project.id}/nodes`)
      .set("Authorization", `Bearer ${outsider.accessToken}`)
      .send({ identityKey: `manual:${project.id}:node-x`, type: "host", category: "infrastructure", label: "Node X" });

    expect(res.status).toBe(403);
  });

  it("rejects a malformed manual node payload with a validation error", async () => {
    const owner = await registerUser("manual-node-validation-owner");
    const project = await createProject(owner.accessToken, "Manual Node Validation Project");

    const res = await request(server())
      .post(`/api/v1/projects/${project.id}/nodes`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ identityKey: "", type: "not-a-real-type", category: "infrastructure", label: "" });

    expect(res.status).toBe(400);
  });
});
