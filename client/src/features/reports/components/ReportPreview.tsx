"use client";

import { GraphEngine } from "@/modules/graph-engine";
import { Badge, reportStatusTone } from "@/components/ui/badge";
import { toGraphModel } from "@/features/workspace/graph/to-graph-model";
import { useReport } from "../api/use-report";

type Props = {
  projectId: string;
  reportId: string;
};

/** Renders a report's stored `graphSnapshot` read-only -- the same node/edge adapter the live
 * workspace view uses, reused rather than duplicated (FE-012). No export button yet (Phase 12). */
export function ReportPreview({ projectId, reportId }: Props) {
  const reportQuery = useReport(projectId, reportId);

  if (reportQuery.isLoading) {
    return <p className="text-sm text-[var(--color-foreground-muted)]">Loading report…</p>;
  }
  if (reportQuery.isError) {
    return <p role="alert" className="text-sm text-[var(--node-critical)]">Failed to load this report.</p>;
  }
  if (!reportQuery.data) {
    return <p className="text-sm text-[var(--color-foreground-muted)]">Report not found.</p>;
  }

  const report = reportQuery.data;
  const graphModel = toGraphModel(report.graphSnapshot.nodes, report.graphSnapshot.edges);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">{report.title}</h1>
        <Badge tone={reportStatusTone(report.status)}>{report.status}</Badge>
      </div>
      <div className="h-[32rem] rounded-[var(--radius-md)] border border-[var(--color-border)]">
        <GraphEngine data={graphModel} />
      </div>
    </div>
  );
}
