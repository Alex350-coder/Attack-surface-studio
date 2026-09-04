import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";

const APP_ROLE = "reports_e2e_app_role";
const APP_ROLE_PASSWORD = "reports_e2e_app_role_password";

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

interface ReportBody {
  id: string;
  projectId: string;
  title: string;
  status: string;
  graphSnapshot: { nodes: unknown[]; edges: unknown[] };
}

function dataOf<T>(response: request.Response): T {
  return (response.body as { data: T }).data;
}

describe("Reports assembly (POST/GET /api/v1/projects/:id/reports)", () => {
  let pgContainer: StartedPostgreSqlContainer;
  let storageRoot: string;
  let app: INestApplication;
  let authService: { register: (input: { email: string; password: string }) => Promise<AuthResponseBody> };

  beforeAll(async () => {
    pgContainer = await new PostgreSqlContainer("postgres:16-alpine").start();
    const ownerConnectionUri = pgContainer.getConnectionUri();
    storageRoot = await fs.mkdtemp(path.join(os.tmpdir(), "asstudio-reports-e2e-"));

    process.env.DATABASE_URL = ownerConnectionUri;
    process.env.CORS_ORIGINS = "";
    process.env.LOG_LEVEL = "fatal";
    process.env.JWT_ACCESS_SECRET = "e2e-access-secret-e2e-access-secret";
    process.env.JWT_ACCESS_TTL = "15m";
    process.env.JWT_REFRESH_TTL = "7d";
    process.env.STORAGE_ROOT = storageRoot;

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
    await fs.rm(storageRoot, { recursive: true, force: true });
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

  async function createNode(accessToken: string, projectId: string, label: string): Promise<NodeBody> {
    const res = await request(server())
      .post(`/api/v1/projects/${projectId}/nodes`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        identityKey: `manual:${projectId}:${label}`,
        type: "note",
        category: "intelligence",
        label,
      });
    expect(res.status).toBe(201);
    return dataOf<NodeBody>(res);
  }

  it("assembles a report from selected node ids and previews it", async () => {
    const owner = await registerUser("reports-owner");
    const project = await createProject(owner.accessToken, "Reports Project");
    const node = await createNode(owner.accessToken, project.id, "Interesting finding");

    const createRes = await request(server())
      .post(`/api/v1/projects/${project.id}/reports`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ title: "External Attack Surface", nodeIds: [node.id], edgeIds: [] });

    expect(createRes.status).toBe(201);
    const report = dataOf<ReportBody>(createRes);
    expect(report.status).toBe("draft");
    expect(report.graphSnapshot.nodes).toHaveLength(1);

    const previewRes = await request(server())
      .get(`/api/v1/projects/${project.id}/reports/${report.id}`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(previewRes.status).toBe(200);
    expect(dataOf<ReportBody>(previewRes).title).toBe("External Attack Surface");

    const listRes = await request(server())
      .get(`/api/v1/projects/${project.id}/reports`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(listRes.status).toBe(200);
    expect((listRes.body as { meta: { total: number } }).meta.total).toBe(1);
  });

  it("rejects assembling a report from a node id belonging to another project", async () => {
    const owner = await registerUser("reports-scope-owner");
    const projectA = await createProject(owner.accessToken, "Reports Scope A");
    const projectB = await createProject(owner.accessToken, "Reports Scope B");
    const nodeInB = await createNode(owner.accessToken, projectB.id, "Belongs to B");

    const res = await request(server())
      .post(`/api/v1/projects/${projectA.id}/reports`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ title: "Cross-project attempt", nodeIds: [nodeInB.id], edgeIds: [] });

    expect(res.status).toBe(404);
  });

  it("rejects a non-member from assembling a report", async () => {
    const owner = await registerUser("reports-rbac-owner");
    const outsider = await registerUser("reports-rbac-outsider");
    const project = await createProject(owner.accessToken, "Reports RBAC Project");

    const res = await request(server())
      .post(`/api/v1/projects/${project.id}/reports`)
      .set("Authorization", `Bearer ${outsider.accessToken}`)
      .send({ title: "Should not work", nodeIds: [], edgeIds: [] });

    expect(res.status).toBe(403);
  });

  describe("export (GET /api/v1/projects/:id/reports/:reportId/export)", () => {
    async function assembleReport(accessToken: string, projectId: string, nodeId: string): Promise<ReportBody> {
      const res = await request(server())
        .post(`/api/v1/projects/${projectId}/reports`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ title: "Exportable Report", nodeIds: [nodeId], edgeIds: [] });
      expect(res.status).toBe(201);
      return dataOf<ReportBody>(res);
    }

    it.each(["pdf", "html", "markdown"] as const)("exports the report as %s", async (format) => {
      const owner = await registerUser(`reports-export-${format}`);
      const project = await createProject(owner.accessToken, `Export ${format}`);
      const node = await createNode(owner.accessToken, project.id, "Exportable finding");
      const report = await assembleReport(owner.accessToken, project.id, node.id);

      const res = await request(server())
        .get(`/api/v1/projects/${project.id}/reports/${report.id}/export`)
        .query({ format })
        .buffer(true)
        .parse((response, callback) => {
          const chunks: Buffer[] = [];
          response.on("data", (chunk: Buffer) => chunks.push(chunk));
          response.on("end", () => callback(null, Buffer.concat(chunks)));
        })
        .set("Authorization", `Bearer ${owner.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.headers["content-disposition"]).toContain("attachment");
      expect((res.body as Buffer).length).toBeGreaterThan(0);
    });

    it("returns a byte-identical cached artifact on a repeated export", async () => {
      const owner = await registerUser("reports-export-cache");
      const project = await createProject(owner.accessToken, "Export Cache");
      const node = await createNode(owner.accessToken, project.id, "Cached finding");
      const report = await assembleReport(owner.accessToken, project.id, node.id);

      function bufferedExport() {
        return request(server())
          .get(`/api/v1/projects/${project.id}/reports/${report.id}/export`)
          .query({ format: "markdown" })
          .buffer(true)
          .parse((response, callback) => {
            const chunks: Buffer[] = [];
            response.on("data", (chunk: Buffer) => chunks.push(chunk));
            response.on("end", () => callback(null, Buffer.concat(chunks)));
          })
          .set("Authorization", `Bearer ${owner.accessToken}`);
      }

      const first = await bufferedExport();
      const second = await bufferedExport();

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect((second.body as Buffer).equals(first.body as Buffer)).toBe(true);
    });

    it("rejects exporting a report belonging to another project", async () => {
      const owner = await registerUser("reports-export-scope-owner");
      const projectA = await createProject(owner.accessToken, "Export Scope A");
      const projectB = await createProject(owner.accessToken, "Export Scope B");
      const node = await createNode(owner.accessToken, projectA.id, "In A");
      const report = await assembleReport(owner.accessToken, projectA.id, node.id);

      const res = await request(server())
        .get(`/api/v1/projects/${projectB.id}/reports/${report.id}/export`)
        .query({ format: "pdf" })
        .set("Authorization", `Bearer ${owner.accessToken}`);

      expect(res.status).toBe(404);
    });

    it("rejects a non-member from exporting a report", async () => {
      const owner = await registerUser("reports-export-rbac-owner");
      const outsider = await registerUser("reports-export-rbac-outsider");
      const project = await createProject(owner.accessToken, "Export RBAC Project");
      const node = await createNode(owner.accessToken, project.id, "Guarded finding");
      const report = await assembleReport(owner.accessToken, project.id, node.id);

      const res = await request(server())
        .get(`/api/v1/projects/${project.id}/reports/${report.id}/export`)
        .query({ format: "pdf" })
        .set("Authorization", `Bearer ${outsider.accessToken}`);

      expect(res.status).toBe(403);
    });
  });
});
