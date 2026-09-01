"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { GraphEngine } from "@/modules/graph-engine";
import type { NodeModel } from "@/modules/graph-engine/types/node.types";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { useProjectGraph } from "@/features/workspace/api/use-project-graph";
import { useCreateReport } from "../api/use-create-report";

type Props = {
  projectId: string;
  onCreated?: (reportId: string) => void;
};

/**
 * Renders the project graph via GraphEngine's existing `onNodeSelect` prop and accumulates a
 * client-side selection (no engine modification -- pure consumption of a public prop, FE-013).
 * Edge selection isn't exposed by the engine, so reports built here are node-only; the backend
 * DTO already defaults `edgeIds` to `[]`.
 */
export function ReportBuilder({ projectId, onCreated }: Props) {
  const graphQuery = useProjectGraph(projectId);
  const createReport = useCreateReport(projectId);

  const [title, setTitle] = useState("");
  const [selectedNodes, setSelectedNodes] = useState<NodeModel[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleNodeSelect(node: NodeModel): void {
    setSelectedNodes((current) => (current.some((n) => n.id === node.id) ? current : [...current, node]));
  }

  function removeNode(nodeId: string): void {
    setSelectedNodes((current) => current.filter((node) => node.id !== nodeId));
  }

  function handleSubmit(): void {
    if (!title.trim()) {
      setValidationError("A title is required.");
      return;
    }
    if (selectedNodes.length === 0) {
      setValidationError("Select at least one node from the graph.");
      return;
    }
    setValidationError(null);
    createReport.mutate(
      { title: title.trim(), nodeIds: selectedNodes.map((node) => node.id), edgeIds: [] },
      { onSuccess: (report) => onCreated?.(report.id) },
    );
  }

  if (graphQuery.isLoading) {
    return <p className="text-sm text-[var(--color-foreground-muted)]">Loading graph…</p>;
  }
  if (graphQuery.isError || !graphQuery.data) {
    return <p role="alert" className="text-sm text-[var(--node-critical)]">Failed to load the project graph.</p>;
  }

  const errorMessage = validationError ?? (createReport.isError ? createReport.error.message : null);

  return (
    <div className="flex flex-col gap-4">
      <TextField id="report-title" label="Report title" value={title} onChange={setTitle} />

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[var(--color-foreground-muted)]">
          Click nodes in the graph to add them ({selectedNodes.length} selected)
        </span>
        <div className="h-96 rounded-[var(--radius-md)] border border-[var(--color-border)]">
          <GraphEngine data={graphQuery.data} onNodeSelect={handleNodeSelect} />
        </div>
      </div>

      {selectedNodes.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {selectedNodes.map((node) => (
            <li
              key={node.id}
              className="flex items-center gap-1.5 rounded-full bg-[var(--color-surface-hover)] px-3 py-1 text-xs text-[var(--color-foreground)]"
            >
              {node.data.label}
              <button type="button" onClick={() => removeNode(node.id)} aria-label={`Remove ${node.data.label}`}>
                <X size={12} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {errorMessage ? (
        <p role="alert" className="text-sm text-[var(--node-critical)]">
          {errorMessage}
        </p>
      ) : null}

      <Button type="button" size="sm" disabled={createReport.isPending} onClick={handleSubmit} className="self-start">
        {createReport.isPending ? "Assembling…" : "Assemble report"}
      </Button>
    </div>
  );
}
