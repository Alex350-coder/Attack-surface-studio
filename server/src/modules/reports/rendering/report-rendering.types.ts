import { z } from "zod";
import { nodeCategorySchema, nodeFindingSchema, nodeTypeSchema, severitySchema } from "../../../contracts/node.schema";
import { edgeTypeSchema } from "../../../contracts/edge.schema";

/**
 * Minimal, rendering-relevant projection of a graph node -- everything a renderer might
 * display. Reuses the canonical `nodeSchema` field types (`contracts/node.schema.ts`) rather
 * than declaring parallel `string` fields, so this can never silently drift from the taxonomy
 * the rest of the platform enforces.
 */
export const reportSnapshotNodeSchema = z.object({
  id: z.string(),
  type: nodeTypeSchema,
  category: nodeCategorySchema,
  label: z.string(),
  severity: severitySchema.nullable(),
  data: z
    .object({
      subtitle: z.string().optional(),
      description: z.string().optional(),
      findings: z.array(nodeFindingSchema).optional(),
    })
    .partial()
    .optional(),
});
export type ReportSnapshotNode = z.infer<typeof reportSnapshotNodeSchema>;

export const reportSnapshotEdgeSchema = z.object({
  id: z.string(),
  type: edgeTypeSchema,
  label: z.string().nullable().optional(),
});
export type ReportSnapshotEdge = z.infer<typeof reportSnapshotEdgeSchema>;

/** The shape rendered out of `reports.graph_snapshot` (report-exports.repository.ts's callers). */
export const reportGraphSnapshotSchema = z.object({
  nodes: z.array(reportSnapshotNodeSchema),
  edges: z.array(reportSnapshotEdgeSchema),
});
export type ReportGraphSnapshot = z.infer<typeof reportGraphSnapshotSchema>;

export type ReportExportFormat = "pdf" | "html" | "markdown";

export interface RenderedReport {
  buffer: Buffer;
  mimeType: string;
  extension: string;
}
