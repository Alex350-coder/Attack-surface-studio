import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetDatabase, startTestDatabase, stopTestDatabase, type TestDatabase } from "./setup";
import { DrizzleRawOutputsRepository } from "../../src/modules/knowledge/repositories/raw-outputs.repository";
import { DrizzleToolRunsRepository } from "../../src/modules/knowledge/repositories/tool-runs.repository";
import { DrizzleProjectsRepository } from "../../src/modules/projects/repositories/projects.repository";
import { DrizzleUsersRepository } from "../../src/modules/users/repositories/users.repository";

describe("RawOutputsRepository", () => {
  let db: TestDatabase;
  let repo: DrizzleRawOutputsRepository;
  let toolRuns: DrizzleToolRunsRepository;
  let projects: DrizzleProjectsRepository;
  let users: DrizzleUsersRepository;
  let projectId: string;
  let otherProjectId: string;
  let toolRunId: string;

  beforeAll(async () => {
    db = await startTestDatabase();
    repo = new DrizzleRawOutputsRepository(db);
    toolRuns = new DrizzleToolRunsRepository(db);
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
    const userId = (await users.create({ email: "runner@example.com", passwordHash: "hash" })).id;
    toolRunId = (
      await toolRuns.create(projectId, { adapterId: "stub", executionMode: "local", target: "example.com", triggeredBy: userId })
    ).id;
  });

  it("creates a raw output row referencing its tool run", async () => {
    const row = await repo.create({
      toolRunId,
      format: "stdout",
      contentRef: "sha256/aa/bb/" + "a".repeat(64),
      contentHash: "a".repeat(64),
      byteSize: 42,
    });

    expect(row.toolRunId).toBe(toolRunId);
    expect(row.byteSize).toBe(42);
  });

  it("finds the latest raw output for a run, scoped to the project via the tool_runs join", async () => {
    await repo.create({
      toolRunId,
      format: "stdout",
      contentRef: "sha256/aa/bb/" + "a".repeat(64),
      contentHash: "a".repeat(64),
      byteSize: 1,
    });
    const second = await repo.create({
      toolRunId,
      format: "stdout",
      contentRef: "sha256/cc/dd/" + "c".repeat(64),
      contentHash: "c".repeat(64),
      byteSize: 2,
    });

    const found = await repo.findLatestByToolRunId(projectId, toolRunId);
    expect(found?.id).toBe(second.id);

    // Negative test: another project must never see this run's raw output (DB-013, SEC-012).
    expect(await repo.findLatestByToolRunId(otherProjectId, toolRunId)).toBeNull();
  });

  it("returns null when no raw output was ever captured for the run", async () => {
    expect(await repo.findLatestByToolRunId(projectId, toolRunId)).toBeNull();
  });
});
