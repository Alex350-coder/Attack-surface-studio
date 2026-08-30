import { describe, expect, it } from "vitest";
import type { Node, Edge } from "@/lib/server-contracts";
import { toTimelineScript, toTimelineEvents } from "./use-project-timeline";

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

describe("toTimelineScript", () => {
  it("returns an empty script for an empty graph", () => {
    expect(toTimelineScript([], [])).toEqual([]);
  });

  it("orders nodes and edges chronologically by createdAt with relative offsets", () => {
    const nodeA = makeNode({ id: "node-a", createdAt: new Date("2026-01-01T00:00:00Z") });
    const nodeB = makeNode({ id: "node-b", createdAt: new Date("2026-01-01T00:00:05Z") });
    const edge = makeEdge({
      id: "edge-1",
      sourceId: "node-a",
      targetId: "node-b",
      createdAt: new Date("2026-01-01T00:00:10Z"),
    });

    const script = toTimelineScript([nodeB, nodeA], [edge]);

    expect(script).toEqual([
      { at: 0, action: "addNode", nodeId: "node-a" },
      { at: 5000, action: "addNode", nodeId: "node-b" },
      { at: 10000, action: "addEdge", edgeId: "edge-1" },
    ]);
  });

  it("uses the earliest event across both nodes and edges as the zero offset", () => {
    const node = makeNode({ id: "node-a", createdAt: new Date("2026-01-01T00:00:05Z") });
    const edge = makeEdge({ id: "edge-1", createdAt: new Date("2026-01-01T00:00:00Z") });

    const script = toTimelineScript([node], [edge]);

    expect(script).toEqual([
      { at: 0, action: "addEdge", edgeId: "edge-1" },
      { at: 5000, action: "addNode", nodeId: "node-a" },
    ]);
  });

  it("breaks ties at the same timestamp by ordering nodes before edges", () => {
    const at = new Date("2026-01-01T00:00:00Z");
    const node = makeNode({ id: "node-a", createdAt: at });
    const edge = makeEdge({ id: "edge-1", createdAt: at });

    const script = toTimelineScript([node], [edge]);

    expect(script).toEqual([
      { at: 0, action: "addNode", nodeId: "node-a" },
      { at: 0, action: "addEdge", edgeId: "edge-1" },
    ]);
  });
});

describe("toTimelineEvents", () => {
  it("produces a human-readable chronological event list for the accessible fallback", () => {
    const node = makeNode({ id: "node-a", label: "example.com", createdAt: new Date("2026-01-01T00:00:00Z") });
    const edge = makeEdge({
      id: "edge-1",
      sourceId: "node-a",
      targetId: "node-b",
      createdAt: new Date("2026-01-01T00:00:05Z"),
    });

    const events = toTimelineEvents([node], [edge]);

    expect(events).toEqual([
      { id: "node-a", description: "example.com discovered", at: node.createdAt },
      { id: "edge-1", description: "Edge discovery created", at: edge.createdAt },
    ]);
  });
});
