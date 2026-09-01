import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import type { Server } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { LLM_PROVIDER } from "../../src/core/ai/llm-provider.contract";
import { FakeLlmProvider } from "../unit/assistant/fakes/fake-llm-provider";

const APP_ROLE = "assistant_e2e_app_role";
const APP_ROLE_PASSWORD = "assistant_e2e_app_role_password";

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
}

interface NodeBody {
  id: string;
}

interface AssistantAnswerBody {
  answer: string;
  referencedNodeIds: string[];
  truncated: boolean;
}

interface InsightBody {
  node: { id: string; type: string };
  edges: { sourceId: string; targetId: string; type: string }[];
}

function dataOf<T>(response: request.Response): T {
  return (response.body as { data: T }).data;
}

/**
 * Uses a FakeLlmProvider override so the flow is deterministic and needs no real network call
 * (a real NVIDIA_API_KEY is a user-provided testing secret, never present in CI). Flipping
 * `fakeLlmProvider.configured = false` exercises the exact same "unconfigured" branch
 * (AssistantService.assertConfigured) that the real NullLlmProvider default takes when no
 * NVIDIA_API_KEY env var is set -- so graceful-degradation is covered without a second container.
 */
describe("AI Assistant (POST /api/v1/projects/:id/assistant/*)", () => {
  let pgContainer: StartedPostgreSqlContainer;
  let storageRoot: string;
  let app: INestApplication;
  let authService: { register: (input: { email: string; password: string }) => Promise<AuthResponseBody> };
  let fakeLlmProvider: FakeLlmProvider;

  beforeAll(async () => {
    pgContainer = await new PostgreSqlContainer("postgres:16-alpine").start();
    const ownerConnectionUri = pgContainer.getConnectionUri();
    storageRoot = await fs.mkdtemp(path.join(os.tmpdir(), "asstudio-assistant-e2e-"));

    process.env.DATABASE_URL = ownerConnectionUri;
    process.env.CORS_ORIGINS = "";
    process.env.LOG_LEVEL = "fatal";
    process.env.JWT_ACCESS_SECRET = "e2e-access-secret-e2e-access-secret";
    process.env.JWT_ACCESS_TTL = "15m";
    process.env.JWT_REFRESH_TTL = "7d";
    process.env.STORAGE_ROOT = storageRoot;
    // Deliberately left unset: NVIDIA_API_KEY. The real default (NullLlmProvider) is what every
    // deployment without a key gets; this suite overrides LLM_PROVIDER below so behavior is
    // deterministic regardless.

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
    fakeLlmProvider = new FakeLlmProvider();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(LLM_PROVIDER)
      .useValue(fakeLlmProvider)
      .compile();
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
    await fs.rm(storageRoot, { recursive: true, force: true });
  }, 60_000);

  beforeEach(() => {
    fakeLlmProvider.configured = true;
    fakeLlmProvider.error = null;
    fakeLlmProvider.response = { content: "There are 2 hosts in scope." };
  });

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

  async function createNode(accessToken: string, projectId: string, label: string): Promise<NodeBody> {
    const res = await request(server())
      .post(`/api/v1/projects/${projectId}/nodes`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ identityKey: `manual:${projectId}:${label}`, type: "host", category: "infrastructure", label });
    expect(res.status).toBe(201);
    return dataOf<NodeBody>(res);
  }

  it("answers a question scoped to the caller's project", async () => {
    const owner = await registerUser("assistant-owner");
    const project = await createProject(owner.accessToken, "Assistant Project");
    await createNode(owner.accessToken, project.id, "example.com");

    const res = await request(server())
      .post(`/api/v1/projects/${project.id}/assistant/query`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ question: "What hosts are in scope?" });

    expect(res.status).toBe(201);
    const body = dataOf<AssistantAnswerBody>(res);
    expect(body.answer).toBe("There are 2 hosts in scope.");
    expect(fakeLlmProvider.lastRequest?.messages[1]?.content).toContain("What hosts are in scope?");
  });

  it("never lets one project's question see another project's graph context", async () => {
    const owner = await registerUser("assistant-scope-owner");
    const projectA = await createProject(owner.accessToken, "Assistant Scope A");
    const projectB = await createProject(owner.accessToken, "Assistant Scope B");
    await createNode(owner.accessToken, projectB.id, "secret-in-b.example.com");

    await request(server())
      .post(`/api/v1/projects/${projectA.id}/assistant/query`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ question: "What hosts exist?" })
      .expect(201);

    expect(fakeLlmProvider.lastRequest?.messages[1]?.content).not.toContain("secret-in-b.example.com");
  });

  it("rejects a non-member from querying the assistant", async () => {
    const owner = await registerUser("assistant-rbac-owner");
    const outsider = await registerUser("assistant-rbac-outsider");
    const project = await createProject(owner.accessToken, "Assistant RBAC Project");

    const res = await request(server())
      .post(`/api/v1/projects/${project.id}/assistant/query`)
      .set("Authorization", `Bearer ${outsider.accessToken}`)
      .send({ question: "anything?" });

    expect(res.status).toBe(403);
  });

  it("returns 503 instead of a fabricated answer when the provider is unconfigured", async () => {
    const owner = await registerUser("assistant-unconfigured-owner");
    const project = await createProject(owner.accessToken, "Assistant Unconfigured Project");
    fakeLlmProvider.configured = false;

    const res = await request(server())
      .post(`/api/v1/projects/${project.id}/assistant/query`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ question: "anything?" });

    expect(res.status).toBe(503);
  });

  it("produces recommendations without executing anything automatically", async () => {
    const owner = await registerUser("assistant-recommend-owner");
    const project = await createProject(owner.accessToken, "Assistant Recommend Project");
    fakeLlmProvider.response = { content: "Consider scanning example.com next." };

    const res = await request(server())
      .post(`/api/v1/projects/${project.id}/assistant/recommend`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({});

    expect(res.status).toBe(201);
    expect(dataOf<AssistantAnswerBody>(res).answer).toBe("Consider scanning example.com next.");
  });

  it("confirms an insight, writing an aiInsight node and ai edges into this project's graph", async () => {
    const owner = await registerUser("assistant-insight-owner");
    const project = await createProject(owner.accessToken, "Assistant Insight Project");
    const node = await createNode(owner.accessToken, project.id, "example.com");

    const res = await request(server())
      .post(`/api/v1/projects/${project.id}/assistant/insights`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ content: "example.com has not been scanned recently", relatedNodeIds: [node.id] });

    expect(res.status).toBe(201);
    const insight = dataOf<InsightBody>(res);
    expect(insight.node.type).toBe("aiInsight");
    expect(insight.edges).toEqual([expect.objectContaining({ sourceId: insight.node.id, targetId: node.id, type: "ai" })]);
  });

  it("rejects confirming an insight referencing a node from another project", async () => {
    const owner = await registerUser("assistant-insight-scope-owner");
    const projectA = await createProject(owner.accessToken, "Assistant Insight Scope A");
    const projectB = await createProject(owner.accessToken, "Assistant Insight Scope B");
    const nodeInB = await createNode(owner.accessToken, projectB.id, "belongs-to-b.example.com");

    const res = await request(server())
      .post(`/api/v1/projects/${projectA.id}/assistant/insights`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ content: "cross-project attempt", relatedNodeIds: [nodeInB.id] });

    expect(res.status).toBe(404);
  });
});
