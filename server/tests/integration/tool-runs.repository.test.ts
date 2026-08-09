import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetDatabase, startTestDatabase, stopTestDatabase, type TestDatabase } from "./setup";
import { DrizzleToolRunsRepository } from "../../src/modules/knowledge/repositories/tool-runs.repository";
import { DrizzleProjectsRepository } from "../../src/modules/projects/repositories/projects.repository";
import { DrizzleUsersRepository } from "../../src/modules/users/repositories/users.repository";

describe("ToolRunsRepository", () => {
  let db: TestDatabase;
  let repo: DrizzleToolRunsRepository;
  let projects: DrizzleProjectsRepository;
  let users: DrizzleUsersRepository;
  let projectId: string;
  let otherProjectId: string;
  let userId: string;

  beforeAll(async () => {
    db = await startTestDatabase();
    repo = new DrizzleToolRunsRepository(db);
    projects = new DrizzleProjectsRepository(db);
    users = new DrizzleUsersRepository(db);
  }, 120_000);

  afterAll(async () => {
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await resetDatabase(db);
    projectId = (await projects.create({ name: "P1", slug: "p1" })).id;
    otherProjectId = (await projects.create({ name: "P2", slug: "p2" })).id;
    userId = (await users.create({ email: "runner@example.com", passwordHash: "hash" })).id;
  });

  function createInput(overrides: Partial<{ adapterId: string; executionMode: string; target: string }> = {}) {
    return {
      adapterId: overrides.adapterId ?? "stub",
      executionMode: overrides.executionMode ?? "local",
      target: overrides.target ?? "example.com",
      triggeredBy: userId,
    };
  }

  it("creates a run defaulting to queued status", async () => {
    const run = await repo.create(projectId, createInput());
    expect(run.status).toBe("queued");
    expect(run.target).toBe("example.com");
    expect(run.triggeredBy).toBe(userId);
  });

  it("updates status and timestamps", async () => {
    const run = await repo.create(projectId, createInput());
    const started = new Date();
    const updated = await repo.updateStatus(projectId, run.id, { status: "running", startedAt: started });

    expect(updated?.status).toBe("running");
  });

  it("applies an atomic conditional update only when the current status matches", async () => {
    const run = await repo.create(projectId, createInput());
    await repo.updateStatus(projectId, run.id, { status: "cancelled", finishedAt: new Date() });

    // A late "succeeded" write from a worker that didn't know about the cancellation must not
    // clobber the terminal "cancelled" status (OWA-020).
    const clobbered = await repo.updateStatus(
      projectId,
      run.id,
      { status: "succeeded", finishedAt: new Date() },
      ["queued", "running"],
    );

    expect(clobbered).toBeNull();
    expect((await repo.findById(projectId, run.id))?.status).toBe("cancelled");
  });

  it("scopes reads to the given project (negative test)", async () => {
    const run = await repo.create(projectId, createInput());

    expect(await repo.findById(otherProjectId, run.id)).toBeNull();
    expect((await repo.listByProject(otherProjectId)).total).toBe(0);
  });
});
