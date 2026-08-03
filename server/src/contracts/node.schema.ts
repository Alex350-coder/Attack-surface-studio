import { z } from "zod";

/**
 * Canonical Node taxonomy (ARC-005, ARC-009). Mirrors the frontend Graph Engine's closed,
 * unmodifiable rendering types (`client/src/modules/graph-engine/types/node.types.ts`) exactly —
 * this is the wire/domain contract, reconciled with the engine's internal model by a Phase 9
 * data-adapter, not by editing the engine.
 */
export const nodeCategorySchema = z.enum(["infrastructure", "security", "artifact", "intelligence"]);
export type NodeCategory = z.infer<typeof nodeCategorySchema>;

export const nodeTypeSchema = z.enum([
  "domain",
  "subdomain",
  "ip",
  "host",
  "port",
  "service",
  "technology",
  "os",
  "container",
  "cloud",
  "asset",
  "finding",
  "criticalFinding",
  "evidence",
  "screenshot",
  "request",
  "response",
  "report",
  "note",
  "aiInsight",
]);
export type NodeType = z.infer<typeof nodeTypeSchema>;

export const severitySchema = z.enum(["info", "warning", "critical"]);
export type Severity = z.infer<typeof severitySchema>;

export const nodePropertySchema = z.object({
  label: z.string().min(1),
  value: z.string(),
});

export const nodeRelationshipSchema = z.object({
  nodeId: z.string().min(1),
  label: z.string().min(1),
});

export const nodeFindingSchema = z.object({
  title: z.string().min(1),
  severity: severitySchema,
  description: z.string(),
});

export const nodeEvidenceItemSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
});

export const nodeTimelineEntrySchema = z.object({
  label: z.string().min(1),
  timestamp: z.string(),
});

export const nodeDataSchema = z
  .object({
    subtitle: z.string().optional(),
    description: z.string().optional(),
    properties: z.array(nodePropertySchema).optional(),
    relationships: z.array(nodeRelationshipSchema).optional(),
    findings: z.array(nodeFindingSchema).optional(),
    evidence: z.array(nodeEvidenceItemSchema).optional(),
    notes: z.array(z.string()).optional(),
    timeline: z.array(nodeTimelineEntrySchema).optional(),
  })
  .partial();
export type NodeData = z.infer<typeof nodeDataSchema>;

/** Full persisted Node row (DATA_MODEL.md `nodes` table). */
export const nodeSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  identityKey: z.string().min(1),
  type: nodeTypeSchema,
  category: nodeCategorySchema,
  label: z.string().min(1),
  severity: severitySchema.nullable(),
  data: nodeDataSchema,
  sourceRunId: z.string().uuid().nullable(),
  createdBy: z.string().uuid().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  lastSeenAt: z.coerce.date(),
});
export type Node = z.infer<typeof nodeSchema>;

/** Shape adapters/services submit when upserting a node (id/timestamps are server-generated). */
export const nodeUpsertInputSchema = z.object({
  identityKey: z.string().min(1),
  type: nodeTypeSchema,
  category: nodeCategorySchema,
  label: z.string().min(1),
  severity: severitySchema.nullable().optional(),
  data: nodeDataSchema.optional(),
  sourceRunId: z.string().uuid().nullable().optional(),
  createdBy: z.string().uuid().nullable().optional(),
});
export type NodeUpsertInput = z.infer<typeof nodeUpsertInputSchema>;
