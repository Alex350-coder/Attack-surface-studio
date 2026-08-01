import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetDatabase, startTestDatabase, stopTestDatabase, type TestDatabase } from "./setup";
import { DrizzleNodesRepository } from "../../src/modules/knowledge/repositories/nodes.repository";
import { DrizzleEdgesRepository } from "../../src/modules/knowledge/repositories/edges.repository";
import { DrizzleProjectsRepository } from "../../src/modules/projects/repositories/projects.repository";

describe("EdgesRepository", () => {
  let db: TestDatabase;
  let nodesRepo: DrizzleNodesRepository;
  let repo: DrizzleEdgesRepository;
  let projects: DrizzleProjectsRepository;
  let projectId: string;
  let sourceId: string;
  let targetId: string;

  beforeAll(async () => {
    db = await startTestDatabase();
    nodesRepo = new DrizzleNodesRepository(db);
    repo = new DrizzleEdgesRepository(db);
    projects = new DrizzleProjectsRepository(db);
  }, 120_000);

  afterAll(async () => {
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await resetDatabase(db);
    projectId = (await projects.create({ name: "P1", slug: "p1" })).id;
    const [source, target] = await nodesRepo.upsertMany(projectId, [
      { identityKey: "domain:example.com", type: "domain", category: "infrastructure", label: "example.com" },
      { identityKey: "subdomain:api.example.com", type: "subdomain", category: "infrastructure", label: "api.example.com" },
    ]);
    sourceId = source!.id;
    targetId = target!.id;
  });

  it("re-ingesting the same (project, source, target, type) merges data, not duplicates (idempotency)", async () => {
    await repo.upsertMany(projectId, [
      { sourceId, targetId, type: "discovery", data: { via: "dns" } },
    ]);
    await repo.upsertMany(projectId, [
      { sourceId, targetId, type: "discovery", data: { confirmedAt: "run-2" } },
    ]);

    const page = await repo.listByProject(projectId);
    expect(page.total).toBe(1);
    expect(page.items[0]?.data).toEqual({ via: "dns", confirmedAt: "run-2" });
  });

  it("filters listings by source, target, and type", async () => {
    await repo.upsertMany(projectId, [{ sourceId, targetId, type: "discovery" }]);

    expect((await repo.listByProject(projectId, { sourceId })).total).toBe(1);
    expect((await repo.listByProject(projectId, { type: "risk" })).total).toBe(0);
  });

  it("caps list page size at the shared maximum", async () => {
    await repo.upsertMany(projectId, [{ sourceId, targetId, type: "discovery" }]);

    const page = await repo.listByProject(projectId, {}, { page: 1, pageSize: 1000 });
    expect(page.pageSize).toBe(100);
  });
});
