import type { TimelineScript } from "@/modules/graph-engine";
import type { Node, Edge } from "@/lib/server-contracts";

export interface TimelineEvent {
  id: string;
  description: string;
  at: Date;
}

type TimelineSource =
  | { kind: "node"; node: Node }
  | { kind: "edge"; edge: Edge };

function sortChronologically(sources: TimelineSource[]): TimelineSource[] {
  // Stable sort by timestamp; nodes are ordered before edges at an identical timestamp so a
  // relationship never appears to exist before the nodes it connects (Array#sort is stable in
  // every engine this project targets, so equal-timestamp input order -- nodes first -- holds).
  return [...sources].sort((a, b) => {
    const timeA = (a.kind === "node" ? a.node.createdAt : a.edge.createdAt).getTime();
    const timeB = (b.kind === "node" ? b.node.createdAt : b.edge.createdAt).getTime();
    return timeA - timeB;
  });
}

/**
 * Derives a chronological `TimelineScript` (the Graph Engine's own existing type, FE-013 --
 * no engine modification) from the already-loaded graph's node/edge `createdAt` timestamps.
 * `at` is a relative millisecond offset from the earliest event in the graph, not a wall-clock
 * timestamp, since the engine only needs relative pacing to drive its replay animation.
 */
export function toTimelineScript(nodes: Node[], edges: Edge[]): TimelineScript {
  const sources: TimelineSource[] = [
    ...nodes.map((node): TimelineSource => ({ kind: "node", node })),
    ...edges.map((edge): TimelineSource => ({ kind: "edge", edge })),
  ];
  if (sources.length === 0) return [];

  const ordered = sortChronologically(sources);
  const earliest = (ordered[0].kind === "node" ? ordered[0].node.createdAt : ordered[0].edge.createdAt).getTime();

  return ordered.map((source) => {
    if (source.kind === "node") {
      return { at: source.node.createdAt.getTime() - earliest, action: "addNode", nodeId: source.node.id };
    }
    return { at: source.edge.createdAt.getTime() - earliest, action: "addEdge", edgeId: source.edge.id };
  });
}

/**
 * A plain chronological event list mirroring the same ordering as `toTimelineScript`, used by
 * `TimelineView`'s accessible fallback -- motion isn't the only way to consume this data (FE-015).
 */
export function toTimelineEvents(nodes: Node[], edges: Edge[]): TimelineEvent[] {
  const sources: TimelineSource[] = [
    ...nodes.map((node): TimelineSource => ({ kind: "node", node })),
    ...edges.map((edge): TimelineSource => ({ kind: "edge", edge })),
  ];
  const ordered = sortChronologically(sources);

  return ordered.map((source) => {
    if (source.kind === "node") {
      return { id: source.node.id, description: `${source.node.label} discovered`, at: source.node.createdAt };
    }
    return { id: source.edge.id, description: `Edge ${source.edge.type} created`, at: source.edge.createdAt };
  });
}
