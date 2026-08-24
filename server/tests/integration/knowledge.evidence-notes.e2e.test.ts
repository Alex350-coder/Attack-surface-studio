import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";

const APP_ROLE = "knowledge_evidence_e2e_app_role";
const APP_ROLE_PASSWORD = "knowledge_evidence_e2e_app_role_password";

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

interface EvidenceFileBody {
  id: string;
  projectId: string;
  fileRef: string;
  contentHash: string;
  mimeType: string;
}

interface NoteBody {
  id: string;
  body: string;
  authorId: string | null;
}

function dataOf<T>(response: request.Response): T {
  return (response.body as { data: T }).data;
}

const PNG_SIGNATURE = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);
const EXE_SIGNATURE = Buffer.concat([Buffer.from([0x4d, 0x5a]), Buffer.alloc(64)]);

describe("Evidence upload and notes (POST /api/v1/projects/:id/evidence, /notes)", () => {
  let pgContainer: StartedPostgreSqlContainer;
  let storageRoot: string;
  let app: INestApplication;
  let authService: { register: (input: { email: string; password: string }) => Promise<AuthResponseBody> };

  beforeAll(async () => {
    pgContainer = await new PostgreSqlContainer("postgres:16-alpine").start();
    const ownerConnectionUri = pgContainer.getConnectionUri();
    storageRoot = await fs.mkdtemp(path.join(os.tmpdir(), "asstudio-evidence-e2e-"));

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

  it("accepts a magic-byte-valid image upload, persists it, and lists it back", async () => {
    const owner = await registerUser("evidence-owner");
    const project = await createProject(owner.accessToken, "Evidence Project");

    const uploadRes = await request(server())
      .post(`/api/v1/projects/${project.id}/evidence`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .field("label", "Login page screenshot")
      .attach("file", PNG_SIGNATURE, { filename: "evidence.png", contentType: "image/png" });

    expect(uploadRes.status).toBe(201);
    const evidence = dataOf<EvidenceFileBody>(uploadRes);
    expect(evidence.mimeType).toBe("image/png");
    expect(evidence.projectId).toBe(project.id);

    const listRes = await request(server())
      .get(`/api/v1/projects/${project.id}/evidence`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(listRes.status).toBe(200);
    const listedItems = dataOf<EvidenceFileBody[]>(listRes);
    const meta = (listRes.body as { meta: { total: number } }).meta;
    expect(meta.total).toBe(1);
    expect(listedItems[0]?.id).toBe(evidence.id);
  });

  it("rejects a file whose real content does not match an allowed magic-byte signature (e.g. an .exe renamed to .png)", async () => {
    const owner = await registerUser("evidence-reject-owner");
    const project = await createProject(owner.accessToken, "Evidence Reject Project");

    const res = await request(server())
      .post(`/api/v1/projects/${project.id}/evidence`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .attach("file", EXE_SIGNATURE, { filename: "totally-a-screenshot.png", contentType: "image/png" });

    expect(res.status).toBe(400);
  });

  it("rejects a non-member from uploading evidence", async () => {
    const owner = await registerUser("evidence-rbac-owner");
    const outsider = await registerUser("evidence-rbac-outsider");
    const project = await createProject(owner.accessToken, "Evidence RBAC Project");

    const res = await request(server())
      .post(`/api/v1/projects/${project.id}/evidence`)
      .set("Authorization", `Bearer ${outsider.accessToken}`)
      .attach("file", PNG_SIGNATURE, { filename: "evidence.png", contentType: "image/png" });

    expect(res.status).toBe(403);
  });

  it("lets a member add a note and enriches the graph with a note node", async () => {
    const owner = await registerUser("notes-owner");
    const project = await createProject(owner.accessToken, "Notes Project");

    const res = await request(server())
      .post(`/api/v1/projects/${project.id}/notes`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ body: "Found an interesting redirect chain here." });

    expect(res.status).toBe(201);
    const note = dataOf<NoteBody>(res);
    expect(note.body).toBe("Found an interesting redirect chain here.");
    expect(note.authorId).not.toBeNull();

    const graphRes = await request(server())
      .get(`/api/v1/projects/${project.id}/graph`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(graphRes.status).toBe(200);
    const graph = dataOf<{ nodes: { total: number } }>(graphRes);
    expect(graph.nodes.total).toBeGreaterThanOrEqual(1);
  });

  it("rejects a non-member from adding a note", async () => {
    const owner = await registerUser("notes-rbac-owner");
    const outsider = await registerUser("notes-rbac-outsider");
    const project = await createProject(owner.accessToken, "Notes RBAC Project");

    const res = await request(server())
      .post(`/api/v1/projects/${project.id}/notes`)
      .set("Authorization", `Bearer ${outsider.accessToken}`)
      .send({ body: "Should not be allowed" });

    expect(res.status).toBe(403);
  });
});
