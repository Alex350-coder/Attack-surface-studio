import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetDatabase, startTestDatabase, stopTestDatabase, type TestDatabase } from "./setup";
import { DrizzleNodesRepository } from "../../src/modules/knowledge/repositories/nodes.repository";
import { DrizzleEdgesRepository } from "../../src/modules/knowledge/repositories/edges.repository";
import {
  DrizzleGraphTraversalRepository,
  MAX_TRAVERSAL_DEPTH,
} from "../../src/modules/knowledge/repositories/graph-traversal.repository";
import { DrizzleProjectsRepository } from "../../src/modules/projects/repositories/projects.repository";

describe("GraphTraversalRepository", () => {
  let db: TestDatabase;
  let nodesRepo: DrizzleNodesRepository;
  let edgesRepo: DrizzleEdgesRepository;
  let repo: DrizzleGraphTraversalRepository;
  let projects: DrizzleProjectsRepository;
  let projectId: string;
  // domain -> subdomain -> ip -> port (a 3-hop chain)
  let domainId: string;
  let subdomainId: string;
  let ipId: string;
  let portId: string;

  beforeAll(async () => {
    db = await startTestDatabase();
    nodesRepo = new DrizzleNodesRepository(db);
    edgesRepo = new DrizzleEdgesRepository(db);
    repo = new DrizzleGraphTraversalRepository(db);
    projects = new DrizzleProjectsRepository(db);
  }, 120_000);

  afterAll(async () => {
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await resetDatabase(db);
    projectId = (await projects.create({ name: "P1", slug: "p1" })).id;

    const [domain, subdomain, ip, port] = await nodesRepo.upsertMany(projectId, [
      { identityKey: "domain:example.com", type: "domain", category: "infrastructure", label: "example.com" },
      { identityKey: "subdomain:api.example.com", type: "subdomain", category: "infrastructure", label: "api.example.com" },
      { identityKey: "ip:1.2.3.4", type: "ip", category: "infrastructure", label: "1.2.3.4" },
      { identityKey: "port:1.2.3.4:443", type: "port", category: "infrastructure", label: "443" },
    ]);
    domainId = domain!.id;
    subdomainId = subdomain!.id;
    ipId = ip!.id;
    portId = port!.id;

    await edgesRepo.upsertMany(projectId, [
      { sourceId: domainId, targetId: subdomainId, type: "discovery" },
      { sourceId: subdomainId, targetId: ipId, type: "discovery" },
      { sourceId: ipId, targetId: portId, type: "discovery" },
    ]);
  });

  it("respects the requested depth cap", async () => {
    const oneHop = await repo.getReachableNodeIds(projectId, domainId, 1);
    expect(oneHop.sort()).toEqual([domainId, subdomainId].sort());

    const threeHops = await repo.getReachableNodeIds(projectId, domainId, 3);
    expect(threeHops.sort()).toEqual([domainId, subdomainId, ipId, portId].sort());
  });

  it("clamps a requested depth above the hard maximum", async () => {
    const result = await repo.getReachableNodeIds(projectId, domainId, MAX_TRAVERSAL_DEPTH + 50);
    expect(result.sort()).toEqual([domainId, subdomainId, ipId, portId].sort());
  });

  it("never traverses into another project's edges", async () => {
    const otherProjectId = (await projects.create({ name: "P2", slug: "p2" })).id;
    const result = await repo.getReachableNodeIds(otherProjectId, domainId, 3);
    expect(result).toEqual([]);
  });

  describe("getAssistantContextNodes", () => {
    it("without a focus node, returns the project's nodes", async () => {
      const result = await repo.getAssistantContextNodes(projectId);
      expect(result.map((n) => n.id).sort()).toEqual([domainId, subdomainId, ipId, portId].sort());
    });

    it("with a focus node, expands outward in either edge direction up to maxDepth", async () => {
      const result = await repo.getAssistantContextNodes(projectId, subdomainId, 1);
      expect(result.map((n) => n.id).sort()).toEqual([domainId, subdomainId, ipId].sort());
    });

    it("never returns another project's nodes", async () => {
      const otherProjectId = (await projects.create({ name: "P2", slug: "p2" })).id;
      const result = await repo.getAssistantContextNodes(otherProjectId);
      expect(result).toEqual([]);
    });
  });

  describe("getCriticalFindingsForAsset", () => {
    it("returns only criticalFinding nodes connected to the given asset", async () => {
      const [finding, unrelatedNote] = await nodesRepo.upsertMany(projectId, [
        { identityKey: "finding:1", type: "criticalFinding", category: "security", label: "RCE" },
        { identityKey: "note:1", type: "note", category: "intelligence", label: "unrelated" },
      ]);
      await edgesRepo.upsertMany(projectId, [{ sourceId: finding!.id, targetId: ipId, type: "risk" }]);

      const result = await repo.getCriticalFindingsForAsset(projectId, ipId);

      expect(result.map((n) => n.id)).toEqual([finding!.id]);
      expect(result.map((n) => n.id)).not.toContain(unrelatedNote!.id);
    });
  });

  describe("getUnscannedTargets", () => {
    it("returns infrastructure nodes with no outgoing discovery edge", async () => {
      const result = await repo.getUnscannedTargets(projectId);
      // port has no outgoing discovery edge but is not one of the target types; ip/subdomain/
      // domain each have an outgoing discovery edge in the beforeEach fixture, so none qualify.
      expect(result).toEqual([]);

      const [freshDomain] = await nodesRepo.upsertMany(projectId, [
        { identityKey: "domain:untouched.com", type: "domain", category: "infrastructure", label: "untouched.com" },
      ]);

      const afterAdd = await repo.getUnscannedTargets(projectId);
      expect(afterAdd.map((n) => n.id)).toEqual([freshDomain!.id]);
    });
  });
});
