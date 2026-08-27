import { describe, expect, it } from "vitest";
import type { Node, Edge } from "@/lib/server-contracts";
import { toGraphModel } from "./to-graph-model";

function makeNode(overrides: Partial<Node> = {}): Node {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    projectId: "22222222-2222-2222-2222-222222222222",
    identityKey: "example.com",
    type: "domain",
    category: "infrastructure",
    label: "example.com",
    severity: null,
    data: {},
    sourceRunId: null,
    createdBy: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    lastSeenAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function makeEdge(overrides: Partial<Edge> = {}): Edge {
  return {
    id: "33333333-3333-3333-3333-333333333333",
    projectId: "22222222-2222-2222-2222-222222222222",
    sourceId: "11111111-1111-1111-1111-111111111111",
    targetId: "44444444-4444-4444-4444-444444444444",
    type: "discovery",
    animated: false,
    label: null,
    data: {},
    sourceRunId: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("toGraphModel", () => {
  it("returns an empty graph for empty input", () => {
    expect(toGraphModel([], [])).toEqual({ nodes: [], edges: [] });
  });

  it("maps a node's identity, taxonomy, and data fields onto a NodeModel", () => {
    const node = makeNode({
      severity: "critical",
      data: { subtitle: "Root domain", description: "Primary target", notes: ["seed asset"] },
    });

    const result = toGraphModel([node], []);

    expect(result.nodes).toEqual([
      {
        id: node.id,
        type: "domain",
        data: {
          label: "example.com",
          subtitle: "Root domain",
          description: "Primary target",
          severity: "critical",
          notes: ["seed asset"],
        },
      },
    ]);
  });

  it("omits severity from NodeModelData when the node has none", () => {
    const node = makeNode({ severity: null });

    const result = toGraphModel([node], []);

    expect(result.nodes[0]?.data.severity).toBeUndefined();
  });

  it("maps an edge's endpoints, type, animation, and label onto an EdgeModel", () => {
    const target = makeNode({ id: "44444444-4444-4444-4444-444444444444", identityKey: "sub.example.com" });
    const source = makeNode();
    const edge = makeEdge({ animated: true, label: "resolves to" });

    const result = toGraphModel([source, target], [edge]);

    expect(result.edges).toEqual([
      {
        id: edge.id,
        source: edge.sourceId,
        target: edge.targetId,
        type: "discovery",
        animated: true,
        label: "resolves to",
      },
    ]);
  });

  it("drops an edge referencing a node that isn't in the node set, without throwing", () => {
    const source = makeNode();
    const danglingEdge = makeEdge({ targetId: "99999999-9999-9999-9999-999999999999" });

    const result = toGraphModel([source], [danglingEdge]);

    expect(result.edges).toEqual([]);
  });

  it("omits a null edge label from EdgeModel rather than passing null through", () => {
    const source = makeNode();
    const target = makeNode({ id: "44444444-4444-4444-4444-444444444444" });
    const edge = makeEdge({ label: null });

    const result = toGraphModel([source, target], [edge]);

    expect(result.edges[0]?.label).toBeUndefined();
  });
});
