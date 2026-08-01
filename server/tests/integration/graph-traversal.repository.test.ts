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
});
