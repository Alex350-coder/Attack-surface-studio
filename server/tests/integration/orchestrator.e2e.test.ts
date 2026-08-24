import path from "node:path";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { InMemoryAdapterRegistry } from "../../src/modules/adapters/adapter.registry";
import { StubAdapter } from "../../src/modules/adapters/stub/stub.adapter";
import {
  ExecutionTimeoutError,
  type DetectionResult,
  type ExecutionMode,
  type GraphDelta,
  type Invocation,
  type ParsedResult,
  type ToolAdapter,
} from "../../src/modules/adapters/adapter.contract";

const APP_ROLE = "orchestrator_e2e_app_role";
const APP_ROLE_PASSWORD = "orchestrator_e2e_app_role_password";

/**
 * The global `ThrottlerGuard` (app.module.ts) is exercised by its own dedicated coverage
 * elsewhere; this suite's lifecycle-polling loops legitimately exceed its default 100/60s
 * budget in well under a minute. `overrideGuard()`/`overrideProvider(APP_GUARD)` do not reach
 * a guard bound via `APP_GUARD` in a way that reliably disables it in a compiled `TestingModule`
 * (the guard is resolved as part of Nest's own global-enhancer bootstrap, not looked up through
 * the override map at request time), so instead the limit itself is raised for this suite via
 * the now env-configurable `THROTTLE_LIMIT`/`THROTTLE_TTL_MS`.
 */
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

interface ToolRunBody {
  id: string;
  projectId: string;
  adapterId: string;
  executionMode: string;
  target: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  stats: unknown;
  error: { code?: string; message?: string } | null;
}

/** Narrows a Supertest response body (typed `any` by the library) to the envelope's `data`. */
function dataOf<T>(response: request.Response): T {
  return (response.body as { data: T }).data;
}

async function pollUntil<T>(
  fn: () => Promise<T>,
  predicate: (value: T) => boolean,
  { intervalMs = 200, timeoutMs = 20_000 }: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await fn();
    if (predicate(value)) return value;
    if (Date.now() > deadline) {
      throw new Error(`pollUntil: timed out after ${timeoutMs}ms without the predicate becoming true`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

/**
 * A test-only adapter, never registered against the real `AdaptersModule`: always exceeds its
 * own tiny `timeoutMs`, so the shared runner genuinely SIGTERM/SIGKILLs it -- exercising
 * `ExecutionTimeoutError` end-to-end, which `StubAdapter` cannot do (its own `buildInvocation`
 * always gives itself `delayMs + 10_000`ms of headroom by design).
 */
class TimeoutTestAdapter implements ToolAdapter {
  readonly id = "timeout-test";
  readonly displayName = "Timeout Test Adapter (Phase 6 e2e test-only)";
  readonly supportedModes: ExecutionMode[] = ["local"];

  detect(): Promise<DetectionResult> {
    return Promise.resolve({ available: true, version: "1.0.0" });
  }

  buildInvocation(): Promise<Invocation> {
    return Promise.resolve({
      command: process.execPath,
      args: ["-e", "setTimeout(() => {}, 5000);"],
      timeoutMs: 300,
    });
  }

  parse(): Promise<ParsedResult> {
    return Promise.reject(new ExecutionTimeoutError("unreachable -- the runner always times out first"));
  }

  normalize(): Promise<GraphDelta> {
    return Promise.resolve({ nodes: [], edges: [] });
  }
}

/**
 * Boots the full Nest HTTP app (`AppModule`, the queue *producer* side) and the worker's job
 * processor (`WorkerRootModule`, the queue *consumer* side) as two genuinely separate Nest
 * application contexts against real ephemeral Postgres + Redis -- mirroring how they run as two
 * separate OS processes in production (`main.ts` vs `worker-main.ts`), so a job's execution can
 * never depend on anything the API process holds in memory.
 */
describe("Orchestrator flows (tool run lifecycle via /api/v1/projects/:id/runs*)", () => {
  let pgContainer: StartedPostgreSqlContainer;
  let redisContainer: StartedTestContainer;
  let app: INestApplication;
  let workerModuleRef: TestingModule;
  let authService: { register: (input: { email: string; password: string }) => Promise<AuthResponseBody> };

  beforeAll(async () => {
    pgContainer = await new PostgreSqlContainer("postgres:16-alpine").start();
    redisContainer = await new GenericContainer("redis:7-alpine").withExposedPorts(6379).start();
    const ownerConnectionUri = pgContainer.getConnectionUri();

    process.env.DATABASE_URL = ownerConnectionUri;
    process.env.CORS_ORIGINS = "";
    process.env.LOG_LEVEL = "fatal";
    process.env.JWT_ACCESS_SECRET = "e2e-access-secret-e2e-access-secret";
    process.env.JWT_ACCESS_TTL = "15m";
    process.env.JWT_REFRESH_TTL = "7d";
    process.env.REDIS_URL = `redis://${redisContainer.getHost()}:${String(redisContainer.getMappedPort(6379))}`;

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

    const { WorkerRootModule } = await import("../../src/worker-root.module");
    const { ADAPTER_REGISTRY } = await import("../../src/modules/adapters/adapters.tokens");
    workerModuleRef = await Test.createTestingModule({ imports: [WorkerRootModule] })
      .overrideProvider(ADAPTER_REGISTRY)
      .useValue(new InMemoryAdapterRegistry([new StubAdapter(), new TimeoutTestAdapter()]))
      .compile();
    await workerModuleRef.init();
  }, 180_000);

  afterAll(async () => {
    const { closeDatabasePool } = await import("../../src/core/database/client");
    await app.close();
    await workerModuleRef.close();
    await closeDatabasePool();
    await pgContainer.stop();
    await redisContainer.stop();
  }, 60_000);

  const server = () => app.getHttpServer() as Server;

  /**
   * Registers a user by calling `AuthService` directly rather than `POST /api/v1/auth/register`,
   * since that route's login-brute-force throttle (10/min) would otherwise be exhausted by this
   * suite's many test actors -- see `projects.e2e.test.ts` for the same rationale.
   */
  async function registerUser(emailPrefix: string): Promise<{ email: string; accessToken: string }> {
    const email = `${emailPrefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const result = await authService.register({ email, password: "a-strong-enough-password" });
    return { email, accessToken: result.tokens.accessToken };
  }

  async function createProject(
    accessToken: string,
    overrides: { name: string; includes?: string[]; excludes?: string[] },
  ): Promise<ProjectBody> {
    const res = await request(server())
      .post("/api/v1/projects")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: overrides.name,
        slug: `${overrides.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        scope: { includes: overrides.includes ?? ["example.com"], excludes: overrides.excludes ?? [] },
      });
    expect(res.status).toBe(201);
    return dataOf<ProjectBody>(res);
  }

  async function getRun(accessToken: string, projectId: string, runId: string): Promise<ToolRunBody> {
    const res = await request(server())
      .get(`/api/v1/projects/${projectId}/runs/${runId}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    return dataOf<ToolRunBody>(res);
  }

  it("runs a stub tool through its full lifecycle and records stats", async () => {
    const owner = await registerUser("lifecycle-owner");
    const project = await createProject(owner.accessToken, { name: "Lifecycle Project" });

    const enqueueRes = await request(server())
      .post(`/api/v1/projects/${project.id}/runs`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ adapterId: "stub", executionMode: "local", target: "example.com", options: { delayMs: 50 } });
    expect(enqueueRes.status).toBe(201);
    const created = dataOf<ToolRunBody>(enqueueRes);
    expect(created.status).toBe("queued");

    const finished = await pollUntil(
      () => getRun(owner.accessToken, project.id, created.id),
      (run) => run.status === "succeeded" || run.status === "failed",
    );

    expect(finished.status).toBe("succeeded");
    expect(finished.startedAt).not.toBeNull();
    expect(finished.finishedAt).not.toBeNull();
    const stats = finished.stats as { nodeCount: number; edgeCount: number };
    expect(stats.nodeCount).toBeGreaterThan(0);
    expect(stats.edgeCount).toBeGreaterThanOrEqual(0);

    // The GraphBuilderService actually persisted the run's delta -- not just counted it.
    const graphRes = await request(server())
      .get(`/api/v1/projects/${project.id}/graph`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(graphRes.status).toBe(200);
    const graph = dataOf<{ nodes: { total: number }; edges: { total: number } }>(graphRes);
    expect(graph.nodes.total).toBe(stats.nodeCount);
    expect(graph.edges.total).toBe(stats.edgeCount);
  }, 30_000);

  it("serves the run's raw stdout as an attachment to admin+ and rejects non-members", async () => {
    const owner = await registerUser("raw-output-owner");
    const outsider = await registerUser("raw-output-outsider");
    const project = await createProject(owner.accessToken, { name: "Raw Output Project" });

    const enqueueRes = await request(server())
      .post(`/api/v1/projects/${project.id}/runs`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ adapterId: "stub", executionMode: "local", target: "example.com", options: { delayMs: 10 } });
    const created = dataOf<ToolRunBody>(enqueueRes);

    const finished = await pollUntil(
      () => getRun(owner.accessToken, project.id, created.id),
      (run) => run.status === "succeeded" || run.status === "failed",
    );
    expect(finished.status).toBe("succeeded");

    const rawRes = await request(server())
      .get(`/api/v1/projects/${project.id}/runs/${created.id}/raw`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(rawRes.status).toBe(200);
    expect(rawRes.headers["content-disposition"]).toMatch(/^attachment;/);
    expect(Buffer.isBuffer(rawRes.body)).toBe(true);
    expect((rawRes.body as Buffer).length).toBeGreaterThan(0);

    const outsiderRes = await request(server())
      .get(`/api/v1/projects/${project.id}/runs/${created.id}/raw`)
      .set("Authorization", `Bearer ${outsider.accessToken}`);
    expect(outsiderRes.status).toBe(403);
  }, 30_000);

  it("rejects an out-of-scope target at enqueue time and never creates a run", async () => {
    const owner = await registerUser("scope-owner");
    const project = await createProject(owner.accessToken, { name: "Scope Project", includes: ["example.com"] });

    const enqueueRes = await request(server())
      .post(`/api/v1/projects/${project.id}/runs`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ adapterId: "stub", executionMode: "local", target: "not-in-scope.test", options: {} });
    expect(enqueueRes.status).toBe(403);
    expect((enqueueRes.body as { error: { code: string } }).error.code).toBe("SCOPE_VIOLATION");

    const listRes = await request(server())
      .get(`/api/v1/projects/${project.id}/runs`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(dataOf<ToolRunBody[]>(listRes)).toHaveLength(0);
  }, 30_000);

  it("cancels a run that is still queued behind another run, without ever executing it", async () => {
    const owner = await registerUser("queued-cancel-owner");
    const project = await createProject(owner.accessToken, {
      name: "Queued Cancel Project",
      includes: ["blocker.example.com", "queued-target.example.com"],
    });

    // The worker processes one job at a time; a long-running blocker keeps the second run
    // sitting in "queued" long enough to reliably cancel it before it starts.
    const blockerRes = await request(server())
      .post(`/api/v1/projects/${project.id}/runs`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ adapterId: "stub", executionMode: "local", target: "blocker.example.com", options: { delayMs: 3000 } });
    expect(blockerRes.status).toBe(201);

    const queuedRes = await request(server())
      .post(`/api/v1/projects/${project.id}/runs`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ adapterId: "stub", executionMode: "local", target: "queued-target.example.com", options: { delayMs: 100 } });
    expect(queuedRes.status).toBe(201);
    const queuedRun = dataOf<ToolRunBody>(queuedRes);
    expect(queuedRun.status).toBe("queued");

    const cancelRes = await request(server())
      .post(`/api/v1/projects/${project.id}/runs/${queuedRun.id}/cancel`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(cancelRes.status).toBe(201);
    expect(dataOf<ToolRunBody>(cancelRes).status).toBe("cancelled");

    const final = await getRun(owner.accessToken, project.id, queuedRun.id);
    expect(final.status).toBe("cancelled");
    expect(final.startedAt).toBeNull();
  }, 30_000);

  it("cancels a run mid-execution and genuinely kills the underlying process", async () => {
    const owner = await registerUser("running-cancel-owner");
    const project = await createProject(owner.accessToken, {
      name: "Running Cancel Project",
      includes: ["running-target.example.com"],
    });

    const enqueueRes = await request(server())
      .post(`/api/v1/projects/${project.id}/runs`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        adapterId: "stub",
        executionMode: "local",
        target: "running-target.example.com",
        options: { delayMs: 5000 },
      });
    expect(enqueueRes.status).toBe(201);
    const created = dataOf<ToolRunBody>(enqueueRes);

    const running = await pollUntil(
      () => getRun(owner.accessToken, project.id, created.id),
      (run) => run.status === "running",
    );
    expect(running.startedAt).not.toBeNull();
    const cancelRequestedAt = Date.now();

    const cancelRes = await request(server())
      .post(`/api/v1/projects/${project.id}/runs/${created.id}/cancel`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(cancelRes.status).toBe(201);

    const finished = await pollUntil(
      () => getRun(owner.accessToken, project.id, created.id),
      (run) => run.status === "cancelled",
      { timeoutMs: 15_000 },
    );

    // If the process had genuinely kept running to completion, this would take ~5s from
    // enqueue; the cancel signal must kill it well before its own delayMs elapses.
    expect(Date.now() - cancelRequestedAt).toBeLessThan(4000);
    expect(finished.finishedAt).not.toBeNull();
  }, 30_000);

  it("marks a run failed with EXECUTION_TIMEOUT when the tool exceeds its own timeout", async () => {
    const owner = await registerUser("timeout-owner");
    const project = await createProject(owner.accessToken, {
      name: "Timeout Project",
      includes: ["timeout-target.example.com"],
    });

    const enqueueRes = await request(server())
      .post(`/api/v1/projects/${project.id}/runs`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ adapterId: "timeout-test", executionMode: "local", target: "timeout-target.example.com" });
    expect(enqueueRes.status).toBe(201);
    const created = dataOf<ToolRunBody>(enqueueRes);

    const finished = await pollUntil(
      () => getRun(owner.accessToken, project.id, created.id),
      (run) => run.status === "failed",
      { timeoutMs: 30_000 },
    );

    expect(finished.error?.code).toBe("EXECUTION_TIMEOUT");
  }, 45_000);

  it("rejects a non-member with 403 and an unauthenticated caller with 401", async () => {
    const owner = await registerUser("authz-owner");
    const outsider = await registerUser("authz-outsider");
    const project = await createProject(owner.accessToken, { name: "Authz Project" });

    const outsiderRes = await request(server())
      .post(`/api/v1/projects/${project.id}/runs`)
      .set("Authorization", `Bearer ${outsider.accessToken}`)
      .send({ adapterId: "stub", executionMode: "local", target: "example.com", options: {} });
    expect(outsiderRes.status).toBe(403);

    const anonymousRes = await request(server()).get(`/api/v1/projects/${project.id}/runs`);
    expect(anonymousRes.status).toBe(401);
  }, 30_000);

  it("completes a run via the worker even after the API process that enqueued it is gone", async () => {
    const { AppModule } = await import("../../src/app.module");
    const { applyGlobalConventions } = await import("../../src/bootstrap");
    const { AuthService: AuthServiceClass } = await import("../../src/modules/auth/auth.service");

    const shortLivedModuleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const shortLivedApp = shortLivedModuleRef.createNestApplication();
    applyGlobalConventions(shortLivedApp);
    await shortLivedApp.init();
    const shortLivedAuthService = shortLivedApp.get(AuthServiceClass);

    const email = `killed-api-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const { tokens } = await shortLivedAuthService.register({ email, password: "a-strong-enough-password" });

    const createRes = await request(shortLivedApp.getHttpServer() as Server)
      .post("/api/v1/projects")
      .set("Authorization", `Bearer ${tokens.accessToken}`)
      .send({
        name: "Killed API Project",
        slug: `killed-api-project-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        scope: { includes: ["killed-api-target.example.com"], excludes: [] },
      });
    expect(createRes.status).toBe(201);
    const project = dataOf<ProjectBody>(createRes);

    const enqueueRes = await request(shortLivedApp.getHttpServer() as Server)
      .post(`/api/v1/projects/${project.id}/runs`)
      .set("Authorization", `Bearer ${tokens.accessToken}`)
      .send({
        adapterId: "stub",
        executionMode: "local",
        target: "killed-api-target.example.com",
        options: { delayMs: 100 },
      });
    expect(enqueueRes.status).toBe(201);
    const created = dataOf<ToolRunBody>(enqueueRes);

    // Simulate the API process crashing right after enqueueing: the job already left the API
    // process's memory the moment it was written to Redis, so the worker (a wholly separate
    // Nest application context) must still complete it on its own.
    await shortLivedApp.close();

    const finished = await pollUntil(
      () => getRun(tokens.accessToken, project.id, created.id),
      (run) => run.status === "succeeded" || run.status === "failed",
      { timeoutMs: 15_000 },
    );

    expect(finished.status).toBe("succeeded");
  }, 30_000);
});
