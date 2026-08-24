import { z } from "zod";
import { edgeUpsertInputSchema } from "../../../contracts/edge.schema";

/** Manual edges always reference real node UUIDs already; sourceRunId is always server-stamped (null). */
export const manualEdgeSchema = edgeUpsertInputSchema.omit({ sourceRunId: true });
export type ManualEdgeDto = z.infer<typeof manualEdgeSchema>;
