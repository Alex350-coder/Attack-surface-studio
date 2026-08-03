import path from "node:path";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";

/**
 * Boots the real Nest app (AppModule) against an ephemeral Postgres instance. Env vars are set
 * before AppModule is imported so core/database/client.ts's module-scope pool connects to the
 * test container rather than the developer's local database.
 */
describe("GET /api/v1/health", () => {
  let container: StartedPostgreSqlContainer;
  let app: INestApplication;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine").start();
    const connectionUri = container.getConnectionUri();

    process.env.DATABASE_URL = connectionUri;
    process.env.APP_DATABASE_URL = connectionUri;
    process.env.CORS_ORIGINS = "";
    process.env.LOG_LEVEL = "fatal";

    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const { Pool } = await import("pg");
    const schema = await import("../../src/core/database/schema");

    const migrationPool = new Pool({ connectionString: connectionUri });
    const migrationDb = drizzle(migrationPool, { schema });
    await migrate(migrationDb, { migrationsFolder: path.resolve(__dirname, "../../drizzle/migrations") });
    await migrationPool.end();

    const { AppModule } = await import("../../src/app.module");
    const { applyGlobalConventions } = await import("../../src/bootstrap");
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    applyGlobalConventions(app);
    await app.init();
  });

  afterAll(async () => {
    const { closeDatabasePool } = await import("../../src/core/database/client");
    await app.close();
    await closeDatabasePool();
    await container.stop();
  });

  it("returns the standard success envelope with database up", async () => {
    const response = await request(app.getHttpServer() as Server).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: { status: "ok", database: "up" } });
  });

  it("assigns a correlation id header to the response", async () => {
    const response = await request(app.getHttpServer() as Server).get("/api/v1/health");

    expect(response.headers["x-correlation-id"]).toEqual(expect.any(String));
  });
});
