import type { GraphModel, NodeModel, EdgeModel } from "@/modules/graph-engine";
import type { Node, Edge } from "@/lib/server-contracts";

function toNodeModel(node: Node): NodeModel {
  return {
    id: node.id,
    type: node.type,
    data: {
      label: node.label,
      ...node.data,
      ...(node.severity ? { severity: node.severity } : {}),
    },
  };
}

function toEdgeModel(edge: Edge): EdgeModel {
  return {
    id: edge.id,
    source: edge.sourceId,
    target: edge.targetId,
    type: edge.type,
    ...(edge.animated ? { animated: edge.animated } : {}),
    ...(edge.label ? { label: edge.label } : {}),
  };
}

/**
 * Adapts the backend's persisted Node/Edge contracts (server-contracts.ts) into the closed
 * Graph Engine's own NodeModel/EdgeModel shapes (FE-012) -- the engine itself is never touched.
 * The two taxonomies already match 1:1 by design (Claude.md §8); this is a thin field
 * reconciliation, not a transformation.
 *
 * Edges referencing a node outside the given node set are dropped defensively rather than
 * thrown on, mirroring the backend's own "skip unresolved edge" behavior so the UI never
 * crashes on a partially-loaded page of a paginated graph.
 */
export function toGraphModel(nodes: Node[], edges: Edge[]): GraphModel {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const resolvedEdges = edges.filter((edge) => nodeIds.has(edge.sourceId) && nodeIds.has(edge.targetId));

  return {
    nodes: nodes.map(toNodeModel),
    edges: resolvedEdges.map(toEdgeModel),
  };
}
