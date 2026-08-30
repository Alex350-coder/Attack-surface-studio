"use client";

import Link from "next/link";
import { GraphEngine } from "@/modules/graph-engine";
import { useProject } from "../api/use-project";
import { useProjectGraph } from "../api/use-project-graph";

type Props = {
  projectId: string;
};

/**
 * Container: fetches the project + its graph and adapts loading/error/empty/success into UI.
 * Success renders the Graph Engine exactly as the Hero does (FE-012, engine untouched).
 */
export function WorkspaceGraphView({ projectId }: Props) {
  const project = useProject(projectId);
  const graph = useProjectGraph(projectId);

  if (project.isLoading || graph.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-[var(--color-foreground-muted)]">Loading project…</p>
      </div>
    );
  }

  if (project.isError || graph.isError) {
    const message = project.isError ? project.error.message : graph.isError ? graph.error.message : "Something went wrong.";
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p role="alert" className="text-sm text-[var(--node-critical)]">
          {message}
        </p>
        <Link href="/app" className="text-sm text-[var(--color-accent)] hover:underline">
          Back to projects
        </Link>
      </div>
    );
  }

  const graphModel = graph.data;
  if (!graphModel || graphModel.nodes.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <h2 className="text-lg font-semibold text-[var(--color-foreground)]">{project.data?.name}</h2>
        <p className="max-w-sm text-sm text-[var(--color-foreground-muted)]">
          No discoveries yet. Run a tool against this project to start populating its graph.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-[var(--color-border)] px-6 py-4">
        <h1 className="text-lg font-semibold text-[var(--color-foreground)]">{project.data?.name}</h1>
      </div>
      <div className="relative flex-1">
        <GraphEngine data={graphModel} className="h-full w-full" />
      </div>
    </div>
  );
}
