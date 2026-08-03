import { z } from "zod";

/**
 * Canonical Edge taxonomy (ARC-005, ARC-009). Mirrors
 * `client/src/modules/graph-engine/types/edge.types.ts` — see node.schema.ts for the
 * contracts-vs-engine distinction.
 */
export const edgeTypeSchema = z.enum(["discovery", "relationship", "evidence", "risk", "ai"]);
export type EdgeType = z.infer<typeof edgeTypeSchema>;

/** Full persisted Edge row (DATA_MODEL.md `edges` table). */
export const edgeSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  sourceId: z.string().uuid(),
  targetId: z.string().uuid(),
  type: edgeTypeSchema,
  animated: z.boolean(),
  label: z.string().nullable(),
  data: z.record(z.string(), z.unknown()),
  sourceRunId: z.string().uuid().nullable().optional(),
  createdAt: z.coerce.date(),
});
export type Edge = z.infer<typeof edgeSchema>;

/** Shape adapters/services submit when upserting an edge (id/timestamps are server-generated). */
export const edgeUpsertInputSchema = z.object({
  sourceId: z.string().uuid(),
  targetId: z.string().uuid(),
  type: edgeTypeSchema,
  animated: z.boolean().optional(),
  label: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  sourceRunId: z.string().uuid().nullable().optional(),
});
export type EdgeUpsertInput = z.infer<typeof edgeUpsertInputSchema>;
