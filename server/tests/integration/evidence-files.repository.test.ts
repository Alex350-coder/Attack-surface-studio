import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetDatabase, startTestDatabase, stopTestDatabase, type TestDatabase } from "./setup";
import { DrizzleEvidenceFilesRepository } from "../../src/modules/knowledge/repositories/evidence-files.repository";
import { DrizzleNodesRepository } from "../../src/modules/knowledge/repositories/nodes.repository";
import { DrizzleProjectsRepository } from "../../src/modules/projects/repositories/projects.repository";

describe("EvidenceFilesRepository", () => {
  let db: TestDatabase;
  let repo: DrizzleEvidenceFilesRepository;
  let nodesRepo: DrizzleNodesRepository;
  let projects: DrizzleProjectsRepository;
  let projectId: string;
  let otherProjectId: string;
  let nodeId: string;

  beforeAll(async () => {
    db = await startTestDatabase();
    repo = new DrizzleEvidenceFilesRepository(db);
    nodesRepo = new DrizzleNodesRepository(db);
    projects = new DrizzleProjectsRepository(db);
  }, 120_000);

  afterAll(async () => {
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await resetDatabase(db);
    projectId = (await projects.create({ name: "P1", slug: "p1" })).id;
    otherProjectId = (await projects.create({ name: "P2", slug: "p2" })).id;
    const [node] = await nodesRepo.upsertMany(projectId, [
      { identityKey: "domain:example.com", type: "domain", category: "infrastructure", label: "example.com" },
    ]);
    nodeId = node!.id;
  });

  it("creates evidence linked to a node and lists it filtered by node", async () => {
    await repo.create(projectId, {
      nodeId,
      fileRef: "s3://bucket/scan.png",
      contentHash: "abc123",
      mimeType: "image/png",
    });

    const page = await repo.listByProject(projectId, nodeId);
    expect(page.total).toBe(1);
  });

  it("scopes reads to the given project (negative test)", async () => {
    const evidence = await repo.create(projectId, {
      fileRef: "s3://bucket/scan.png",
      contentHash: "abc123",
      mimeType: "image/png",
    });

    expect(await repo.findById(otherProjectId, evidence.id)).toBeNull();
  });

  it("excludes soft-deleted evidence from listings", async () => {
    const evidence = await repo.create(projectId, {
      fileRef: "s3://bucket/scan.png",
      contentHash: "abc123",
      mimeType: "image/png",
    });
    await repo.softDelete(projectId, evidence.id);

    expect((await repo.listByProject(projectId)).total).toBe(0);
  });
});
