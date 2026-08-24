import { z } from "zod";

export const createNoteSchema = z.object({
  nodeId: z.string().uuid().optional(),
  body: z.string().min(1),
});
export type CreateNoteDto = z.infer<typeof createNoteSchema>;
