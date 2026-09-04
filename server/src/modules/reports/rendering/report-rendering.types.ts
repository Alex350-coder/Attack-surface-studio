import type { Severity } from "../../../contracts/node.schema";

/** Minimal, rendering-relevant projection of a graph node -- everything a renderer might display. */
export interface ReportSnapshotNode {
  id: string;
  type: string;
  category: string;
  label: string;
  severity: Severity | null;
  data?: {
    subtitle?: string;
    description?: string;
    findings?: { title: string; severity: Severity; description: string }[];
  };
}

export interface ReportSnapshotEdge {
  id: string;
  type: string;
  label?: string | null;
}

/** The shape rendered out of `reports.graph_snapshot` (report-exports.repository.ts's callers). */
export interface ReportGraphSnapshot {
  nodes: ReportSnapshotNode[];
  edges: ReportSnapshotEdge[];
}

export type ReportExportFormat = "pdf" | "html" | "markdown";

export interface RenderedReport {
  buffer: Buffer;
  mimeType: string;
  extension: string;
}
