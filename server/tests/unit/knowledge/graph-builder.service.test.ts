import { describe, expect, it, vi } from "vitest";
import { GraphBuilderService } from "../../../src/modules/knowledge/graph-builder.service";
import type { NodeRow, NodesRepository } from "../../../src/modules/knowledge/repositories/nodes.repository";
import type { EdgeRow, EdgesRepository } from "../../../src/modules/knowledge/repositories/edges.repository";
import type { AdapterEdge, AdapterNode } from "../../../src/modules/adapters/adapter.contract";

const PROJECT_ID = "33333333-3333-3333-3333-333333333333";
const RUN_ID = "44444444-4444-4444-4444-444444444444";

function makeNodeRow(overrides: Partial<NodeRow> = {}): NodeRow {
  return {
    id: "55555555-5555-5555-5555-555555555555",
    projectId: PROJECT_ID,
    type: "host",
    category: "infrastructure",
    identityKey: "host:example.com",
    label: "example.com",
    severity: null,
    data: {},
    sourceRunId: RUN_ID,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSeenAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

function makeEdgeRow(overrides: Partial<EdgeRow> = {}): EdgeRow {
  return {
    id: "66666666-6666-6666-6666-666666666666",
    projectId: PROJECT_ID,
    sourceId: "55555555-5555-5555-5555-555555555555",
    targetId: "77777777-7777-7777-7777-777777777777",
    type: "discovery",
    animated: false,
    label: null,
    data: {},
    sourceRunId: RUN_ID,
    createdAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

function makeRepositories() {
  const upsertManyNodes = vi.fn<NodesRepository["upsertMany"]>();
  const findByIdentityKey = vi.fn<NodesRepository["findByIdentityKey"]>();
  const nodesRepository: NodesRepository = {
    upsertMany: upsertManyNodes,
    findById: vi.fn(),
    findByIdentityKey,
    listByProject: vi.fn(),
    softDelete: vi.fn(),
  };

  const upsertManyEdges = vi.fn<EdgesRepository["upsertMany"]>();
  const edgesRepository: EdgesRepository = {
    upsertMany: upsertManyEdges,
    findById: vi.fn(),
    listByProject: vi.fn(),
    softDelete: vi.fn(),
  };

  return { nodesRepository, edgesRepository, upsertManyNodes, findByIdentityKey, upsertManyEdges };
}

describe("GraphBuilderService", () => {
  it("upserts nodes and resolves edges by identity key from the same delta", async () => {
    const { nodesRepository, edgesRepository, upsertManyNodes, upsertManyEdges } = makeRepositories();
    const service = new GraphBuilderService(nodesRepository, edgesRepository);

    const sourceNode = makeNodeRow({ id: "55555555-5555-5555-5555-555555555555", identityKey: "host:a" });
    const targetNode = makeNodeRow({ id: "77777777-7777-7777-7777-777777777777", identityKey: "host:b" });
    upsertManyNodes.mockResolvedValue([sourceNode, targetNode]);
    const persistedEdge = makeEdgeRow({ sourceId: sourceNode.id, targetId: targetNode.id });
    upsertManyEdges.mockResolvedValue([persistedEdge]);

    const nodes: AdapterNode[] = [
      { identityKey: "host:a", type: "host", category: "infrastructure", label: "a" },
      { identityKey: "host:b", type: "host", category: "infrastructure", label: "b" },
    ];
    const edges: AdapterEdge[] = [{ sourceIdentityKey: "host:a", targetIdentityKey: "host:b", type: "discovery" }];

    const result = await service.applyDelta(PROJECT_ID, { nodes, edges }, { sourceRunId: RUN_ID });

    expect(upsertManyNodes).toHaveBeenCalledWith(PROJECT_ID, [
      expect.objectContaining({ identityKey: "host:a", sourceRunId: RUN_ID }),
      expect.objectContaining({ identityKey: "host:b", sourceRunId: RUN_ID }),
    ]);
    expect(upsertManyEdges).toHaveBeenCalledWith(PROJECT_ID, [
      expect.objectContaining({ sourceId: sourceNode.id, targetId: targetNode.id, type: "discovery" }),
    ]);
    expect(result.nodes).toEqual([sourceNode, targetNode]);
    expect(result.edges).toEqual([persistedEdge]);
  });

  it("falls back to findByIdentityKey when an edge references a node from an earlier run", async () => {
    const { nodesRepository, edgesRepository, upsertManyNodes, findByIdentityKey, upsertManyEdges } = makeRepositories();
    const service = new GraphBuilderService(nodesRepository, edgesRepository);

    const newNode = makeNodeRow({ id: "55555555-5555-5555-5555-555555555555", identityKey: "host:new" });
    upsertManyNodes.mockResolvedValue([newNode]);
    const existingNode = makeNodeRow({ id: "77777777-7777-7777-7777-777777777777", identityKey: "host:old" });
    findByIdentityKey.mockResolvedValue(existingNode);
    upsertManyEdges.mockResolvedValue([]);

    const edges: AdapterEdge[] = [{ sourceIdentityKey: "host:new", targetIdentityKey: "host:old", type: "discovery" }];

    await service.applyDelta(PROJECT_ID, {
      nodes: [{ identityKey: "host:new", type: "host", category: "infrastructure", label: "new" }],
      edges,
    });

    expect(findByIdentityKey).toHaveBeenCalledWith(PROJECT_ID, "host:old");
    expect(upsertManyEdges).toHaveBeenCalledWith(PROJECT_ID, [
      expect.objectContaining({ sourceId: newNode.id, targetId: existingNode.id }),
    ]);
  });

  it("skips (without throwing) an edge whose identity key can never be resolved, and logs a warning", async () => {
    const { nodesRepository, edgesRepository, upsertManyNodes, findByIdentityKey, upsertManyEdges } = makeRepositories();
    const service = new GraphBuilderService(nodesRepository, edgesRepository);
    const loggerWarnSpy = vi.spyOn(service["logger"], "warn").mockImplementation(() => undefined);

    upsertManyNodes.mockResolvedValue([]);
    findByIdentityKey.mockResolvedValue(null);
    upsertManyEdges.mockResolvedValue([]);

    const edges: AdapterEdge[] = [{ sourceIdentityKey: "host:ghost", targetIdentityKey: "host:also-ghost", type: "discovery" }];

    const result = await service.applyDelta(PROJECT_ID, { nodes: [], edges });

    expect(upsertManyEdges).toHaveBeenCalledWith(PROJECT_ID, []);
    expect(result.edges).toEqual([]);
    expect(loggerWarnSpy).toHaveBeenCalledTimes(1);
    expect(loggerWarnSpy.mock.calls[0]?.[0]).toContain("host:ghost");
  });

  it("is idempotent: re-applying the same delta upserts against existing identity keys rather than duplicating", async () => {
    const { nodesRepository, edgesRepository, upsertManyNodes, upsertManyEdges } = makeRepositories();
    const service = new GraphBuilderService(nodesRepository, edgesRepository);

    const node = makeNodeRow();
    upsertManyNodes.mockResolvedValue([node]);
    upsertManyEdges.mockResolvedValue([]);

    const delta: { nodes: AdapterNode[]; edges: AdapterEdge[] } = {
      nodes: [
        {
          identityKey: node.identityKey,
          type: node.type as AdapterNode["type"],
          category: node.category as AdapterNode["category"],
          label: node.label,
        },
      ],
      edges: [],
    };

    await service.applyDelta(PROJECT_ID, delta, { sourceRunId: RUN_ID });
    await service.applyDelta(PROJECT_ID, delta, { sourceRunId: RUN_ID });

    expect(upsertManyNodes).toHaveBeenCalledTimes(2);
    expect(upsertManyNodes).toHaveBeenNthCalledWith(2, PROJECT_ID, [expect.objectContaining({ identityKey: node.identityKey })]);
  });
});
