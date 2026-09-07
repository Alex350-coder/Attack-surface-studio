import { describe, expect, it } from "vitest";
import { createGraphStore } from "./graphStore";
import type { NodeModel } from "../types/node.types";
import type { EdgeModel } from "../types/edge.types";

const nodeA: NodeModel = { id: "a", type: "asset", data: { label: "a" } };
const nodeB: NodeModel = { id: "b", type: "finding", data: { label: "b" } };
const edgeAB: EdgeModel = { id: "e1", source: "a", target: "b", type: "discovery" };

describe("graphStore setGraphData", () => {
  it("reveals nodes/edges immediately when not mid-timeline (BUG #3 regression)", () => {
    // Interactive consumers (Workspace graph, Report builder's node picker) never play a
    // timeline script -- `useGraphTimeline` flips status to 'interactive' before this ever runs.
    // Without the fix, setGraphData always reset visibility to empty and nothing repopulated it,
    // so real graph data silently never rendered.
    const store = createGraphStore();
    store.getState().setStatus("interactive");

    store.getState().setGraphData([nodeA, nodeB], [edgeAB], null);

    const state = store.getState();
    expect(state.visibleNodeIds).toEqual(new Set(["a", "b"]));
    expect(state.visibleEdgeIds).toEqual(new Set(["e1"]));
  });

  it("reveals nodes/edges immediately in the default idle status", () => {
    const store = createGraphStore();

    store.getState().setGraphData([nodeA], [], null);

    expect(store.getState().visibleNodeIds).toEqual(new Set(["a"]));
  });

  it("keeps visibility empty while a scripted timeline is playing", () => {
    // Preserves the Hero's progressive-reveal animation: nodes only become visible as the
    // timeline script explicitly calls revealNode/revealEdge.
    const store = createGraphStore();
    store.getState().setStatus("playing");

    store.getState().setGraphData([nodeA, nodeB], [edgeAB], null);

    const state = store.getState();
    expect(state.visibleNodeIds).toEqual(new Set());
    expect(state.visibleEdgeIds).toEqual(new Set());
  });

  it("re-reveals newly loaded data (e.g. a refetch) once already interactive", () => {
    const store = createGraphStore();
    store.getState().setStatus("interactive");
    store.getState().setGraphData([nodeA], [], null);

    store.getState().setGraphData([nodeA, nodeB], [edgeAB], null);

    expect(store.getState().visibleNodeIds).toEqual(new Set(["a", "b"]));
  });
});
