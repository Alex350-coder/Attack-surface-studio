import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetDatabase, startTestDatabase, stopTestDatabase, type TestDatabase } from "./setup";
import { DrizzleNodesRepository } from "../../src/modules/knowledge/repositories/nodes.repository";
import { DrizzleProjectsRepository } from "../../src/modules/projects/repositories/projects.repository";

describe("NodesRepository", () => {
  let db: TestDatabase;
  let repo: DrizzleNodesRepository;
  let projects: DrizzleProjectsRepository;
  let projectId: string;
  let otherProjectId: string;

  beforeAll(async () => {
    db = await startTestDatabase();
    repo = new DrizzleNodesRepository(db);
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

  it("upserts new nodes in a single batched call", async () => {
    const rows = await repo.upsertMany(projectId, [
      { identityKey: "domain:example.com", type: "domain", category: "infrastructure", label: "example.com" },
      { identityKey: "ip:1.2.3.4", type: "ip", category: "infrastructure", label: "1.2.3.4" },
    ]);

    expect(rows).toHaveLength(2);
  });

  it("re-ingesting the same identity_key merges data and does not duplicate (idempotency)", async () => {
    await repo.upsertMany(projectId, [
      {
        identityKey: "domain:example.com",
        type: "domain",
        category: "infrastructure",
        label: "example.com",
        data: { registrar: "example-registrar" },
      },
    ]);

    await repo.upsertMany(projectId, [
      {
        identityKey: "domain:example.com",
        type: "domain",
        category: "infrastructure",
        label: "example.com",
        data: { firstSeenBy: "nmap" },
      },
    ]);

    const page = await repo.listByProject(projectId);
    expect(page.total).toBe(1);
    expect(page.items[0]?.data).toEqual({ registrar: "example-registrar", firstSeenBy: "nmap" });
  });

  it("scopes every read to the given project (negative test)", async () => {
    const [node] = await repo.upsertMany(projectId, [
      { identityKey: "domain:example.com", type: "domain", category: "infrastructure", label: "example.com" },
    ]);

    expect(await repo.findById(otherProjectId, node!.id)).toBeNull();
    expect(await repo.findByIdentityKey(otherProjectId, "domain:example.com")).toBeNull();
    expect((await repo.listByProject(otherProjectId)).total).toBe(0);
  });

  it("caps list page size at the shared maximum", async () => {
    const inputs = Array.from({ length: 5 }, (_, i) => ({
      identityKey: `host:${i}.example.com`,
      type: "host",
      category: "infrastructure",
      label: `${i}.example.com`,
    }));
    await repo.upsertMany(projectId, inputs);

    const page = await repo.listByProject(projectId, {}, { page: 1, pageSize: 1000 });
    expect(page.pageSize).toBe(100);
    expect(page.total).toBe(5);
  });

  it("excludes soft-deleted nodes from listings", async () => {
    const [node] = await repo.upsertMany(projectId, [
      { identityKey: "domain:example.com", type: "domain", category: "infrastructure", label: "example.com" },
    ]);
    await repo.softDelete(projectId, node!.id);

    expect(await repo.findById(projectId, node!.id)).toBeNull();
    expect((await repo.listByProject(projectId)).total).toBe(0);
  });
});
