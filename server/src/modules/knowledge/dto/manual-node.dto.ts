import { z } from "zod";
import { nodeUpsertInputSchema } from "../../../contracts/node.schema";

/** A user submits identity/type/label/data only -- sourceRunId/createdBy are always server-stamped. */
export const manualNodeSchema = nodeUpsertInputSchema.omit({ sourceRunId: true, createdBy: true });
export type ManualNodeDto = z.infer<typeof manualNodeSchema>;
