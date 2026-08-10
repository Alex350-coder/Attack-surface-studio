import { z } from "zod";
import { paginationQuerySchema } from "../../shared/pagination.dto";

/** `GET /projects/:id/graph` query params — pagination only for now; node/edge type filters can extend this later. */
export const graphQuerySchema = paginationQuerySchema;
export type GraphQueryDto = z.infer<typeof graphQuerySchema>;
