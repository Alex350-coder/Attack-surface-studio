import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetDatabase, startTestDatabase, stopTestDatabase, type TestDatabase } from "./setup";
import { DrizzleToolRunsRepository } from "../../src/modules/knowledge/repositories/tool-runs.repository";
import { DrizzleProjectsRepository } from "../../src/modules/projects/repositories/projects.repository";

describe("ToolRunsRepository", () => {
  let db: TestDatabase;
  let repo: DrizzleToolRunsRepository;
  let projects: DrizzleProjectsRepository;
  let projectId: string;
  let otherProjectId: string;

  beforeAll(async () => {
    db = await startTestDatabase();
    repo = new DrizzleToolRunsRepository(db);
    projects = new DrizzleProjectsRepository(db);
  }, 120_000);

  afterAll(async () => {
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await resetDatabase(db);
    projectId = (await projects.create({ name: "P1", slug: "p1" })).id;
    otherProjectId = (await projects.create({ name: "P2", slug: "p2" })).id;
  });

  it("creates a run defaulting to queued status", async () => {
    const run = await repo.create(projectId, { adapterId: "nmap", executionMode: "local" });
    expect(run.status).toBe("queued");
  });

  it("updates status and timestamps", async () => {
    const run = await repo.create(projectId, { adapterId: "nmap", executionMode: "local" });
    const started = new Date();
    const updated = await repo.updateStatus(projectId, run.id, { status: "running", startedAt: started });

    expect(updated?.status).toBe("running");
  });

  it("scopes reads to the given project (negative test)", async () => {
    const run = await repo.create(projectId, { adapterId: "nmap", executionMode: "local" });

    expect(await repo.findById(otherProjectId, run.id)).toBeNull();
    expect((await repo.listByProject(otherProjectId)).total).toBe(0);
  });
});
