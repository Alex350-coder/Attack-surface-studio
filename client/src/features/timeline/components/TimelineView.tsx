"use client";

import { GraphEngine } from "@/modules/graph-engine";
import { useProjectGraphRaw } from "@/features/workspace/api/use-project-graph";
import { toGraphModel } from "@/features/workspace/graph/to-graph-model";
import { toTimelineEvents, toTimelineScript } from "../api/use-project-timeline";

type Props = {
  projectId: string;
};

/**
 * Renders the project graph's discovery history two ways: an animated replay through the Graph
 * Engine's existing `timeline` prop, and a plain chronological list underneath it -- motion isn't
 * the only way to consume this data (FE-015). Both are derived from the same adapter, so they
 * can never disagree. Reuses the Phase 9 `toGraphModel` adapter for the graph data itself (DRY,
 * FE-012) rather than writing a third Node/Edge -> GraphModel conversion.
 */
export function TimelineView({ projectId }: Props) {
  const graphQuery = useProjectGraphRaw(projectId);

  if (graphQuery.isLoading) {
    return <p className="text-sm text-[var(--color-foreground-muted)]">Loading timeline…</p>;
  }
  if (graphQuery.isError || !graphQuery.data) {
    return <p role="alert" className="text-sm text-[var(--node-critical)]">Failed to load the project graph.</p>;
  }
  if (graphQuery.data.nodes.length === 0) {
    return (
      <p className="text-sm text-[var(--color-foreground-muted)]">
        No discoveries yet. Run a tool against this project to start building its timeline.
      </p>
    );
  }

  const { nodes, edges } = graphQuery.data;
  const timelineScript = toTimelineScript(nodes, edges);
  const timelineEvents = toTimelineEvents(nodes, edges);
  const graphModel = toGraphModel(nodes, edges);

  return (
    <div className="flex flex-col gap-6">
      <div className="h-[28rem] rounded-[var(--radius-md)] border border-[var(--color-border)]">
        <GraphEngine data={graphModel} timeline={timelineScript} />
      </div>
      <ol className="flex flex-col gap-2">
        {timelineEvents.map((event) => (
          <li key={event.id} className="flex items-baseline gap-3 text-sm">
            <span className="font-mono text-xs text-[var(--color-foreground-muted)]">
              {event.at.toLocaleString()}
            </span>
            <span className="text-[var(--color-foreground)]">{event.description}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
