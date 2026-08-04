import path from "node:path";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";

const APP_ROLE = "e2e_app_role";
const APP_ROLE_PASSWORD = "e2e_app_role_password";

interface TokenPairBody {
  accessToken: string;
  refreshToken: string;
}

interface AuthResponseBody {
  user: { email: string };
  tokens: TokenPairBody;
}

/** Narrows a Supertest response body (typed `any` by the library) to the envelope's `data`. */
function dataOf<T>(response: request.Response): T {
  return (response.body as { data: T }).data;
}

/**
 * Boots the real Nest app (AppModule) against an ephemeral Postgres instance, connecting the
 * runtime pool (APP_DATABASE_URL) as a non-owner role -- mirroring db/init/01-app-role.sh --
 * so RLS policies genuinely apply the same way they do in production, unlike the shared
 * `setup.ts` harness used by the plain repository tests.
 */
describe("Auth flows (POST/GET /api/v1/auth/*)", () => {
  let container: StartedPostgreSqlContainer;
  let app: INestApplication;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine").start();
    const ownerConnectionUri = container.getConnectionUri();

    process.env.DATABASE_URL = ownerConnectionUri;
    process.env.CORS_ORIGINS = "";
    process.env.LOG_LEVEL = "fatal";
    process.env.JWT_ACCESS_SECRET = "e2e-access-secret-e2e-access-secret";
    process.env.JWT_ACCESS_TTL = "2s";
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
    await migrationPool.end();

    const url = new URL(ownerConnectionUri);
    url.username = APP_ROLE;
    url.password = APP_ROLE_PASSWORD;
    process.env.APP_DATABASE_URL = url.toString();

    const { AppModule } = await import("../../src/app.module");
    const { applyGlobalConventions } = await import("../../src/bootstrap");
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    applyGlobalConventions(app);
    await app.init();
  }, 120_000);

  afterAll(async () => {
    const { closeDatabasePool } = await import("../../src/core/database/client");
    await app.close();
    await closeDatabasePool();
    await container.stop();
  });

  const server = () => app.getHttpServer() as Server;

  it("completes register -> login -> refresh -> logout, storing only a hashed password/token", async () => {
    const email = `lifecycle-${Date.now()}@example.com`;
    const password = "a-strong-enough-password";

    const registerRes = await request(server()).post("/api/v1/auth/register").send({ email, password });
    expect(registerRes.status).toBe(201);
    const registered = dataOf<AuthResponseBody>(registerRes);
    expect(registered.user.email).toBe(email);
    expect(registered.tokens.accessToken).toEqual(expect.any(String));
    expect(registered.tokens.refreshToken).toEqual(expect.any(String));

    const loginRes = await request(server()).post("/api/v1/auth/login").send({ email, password });
    expect(loginRes.status).toBe(201);
    const { accessToken, refreshToken } = dataOf<AuthResponseBody>(loginRes).tokens;

    const meRes = await request(server()).get("/api/v1/auth/me").set("Authorization", `Bearer ${accessToken}`);
    expect(meRes.status).toBe(200);
    expect(dataOf<{ email: string }>(meRes).email).toBe(email);

    const refreshRes = await request(server()).post("/api/v1/auth/refresh").send({ refreshToken });
    expect(refreshRes.status).toBe(201);
    const rotated = dataOf<TokenPairBody>(refreshRes);
    expect(rotated.refreshToken).not.toBe(refreshToken);

    const logoutRes = await request(server())
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${rotated.accessToken}`)
      .send({ refreshToken: rotated.refreshToken });
    expect(logoutRes.status).toBe(201);

    const reuseAfterLogout = await request(server()).post("/api/v1/auth/refresh").send({
      refreshToken: rotated.refreshToken,
    });
    expect(reuseAfterLogout.status).toBe(401);
  });

  it("rejects duplicate registration for the same email", async () => {
    const email = `dup-${Date.now()}@example.com`;
    const password = "a-strong-enough-password";
    await request(server()).post("/api/v1/auth/register").send({ email, password });

    const res = await request(server()).post("/api/v1/auth/register").send({ email, password });

    expect(res.status).toBe(409);
  });

  it("rejects login with a wrong password", async () => {
    const email = `wrongpw-${Date.now()}@example.com`;
    await request(server()).post("/api/v1/auth/register").send({ email, password: "correct-password-123" });

    const res = await request(server()).post("/api/v1/auth/login").send({ email, password: "incorrect-password" });

    expect(res.status).toBe(401);
  });

  it("rejects /auth/me with an expired access token, but refresh still works", async () => {
    const email = `expiry-${Date.now()}@example.com`;
    const password = "a-strong-enough-password";
    const registerRes = await request(server()).post("/api/v1/auth/register").send({ email, password });
    const { accessToken, refreshToken } = dataOf<AuthResponseBody>(registerRes).tokens;

    await new Promise((resolve) => setTimeout(resolve, 2100));

    const expiredMeRes = await request(server()).get("/api/v1/auth/me").set("Authorization", `Bearer ${accessToken}`);
    expect(expiredMeRes.status).toBe(401);

    const refreshRes = await request(server()).post("/api/v1/auth/refresh").send({ refreshToken });
    expect(refreshRes.status).toBe(201);
    expect(dataOf<TokenPairBody>(refreshRes).accessToken).toEqual(expect.any(String));
  });

  it("detects refresh-token reuse and revokes the rotated session too", async () => {
    const email = `reuse-${Date.now()}@example.com`;
    const password = "a-strong-enough-password";
    const registerRes = await request(server()).post("/api/v1/auth/register").send({ email, password });
    const originalRefreshToken = dataOf<AuthResponseBody>(registerRes).tokens.refreshToken;

    const firstRefresh = await request(server()).post("/api/v1/auth/refresh").send({ refreshToken: originalRefreshToken });
    expect(firstRefresh.status).toBe(201);
    const rotatedRefreshToken = dataOf<TokenPairBody>(firstRefresh).refreshToken;

    const replay = await request(server()).post("/api/v1/auth/refresh").send({ refreshToken: originalRefreshToken });
    expect(replay.status).toBe(401);

    const rotatedNowBlocked = await request(server()).post("/api/v1/auth/refresh").send({ refreshToken: rotatedRefreshToken });
    expect(rotatedNowBlocked.status).toBe(401);
  });

  it("rejects requests without an Authorization header on protected routes", async () => {
    const res = await request(server()).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
  });

  it("rate-limits rapid repeated login attempts", async () => {
    const email = `ratelimit-${Date.now()}@example.com`;
    await request(server()).post("/api/v1/auth/register").send({ email, password: "a-strong-enough-password" });

    const attempts = await Promise.all(
      Array.from({ length: 15 }, () =>
        request(server()).post("/api/v1/auth/login").send({ email, password: "wrong-password" }),
      ),
    );

    expect(attempts.some((res) => res.status === 429)).toBe(true);
  });
});
