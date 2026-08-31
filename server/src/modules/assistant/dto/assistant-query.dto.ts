import { z } from "zod";

export const assistantQuerySchema = z.object({
  question: z.string().trim().min(1).max(2000),
  /** Optional node to scope the graph context around (e.g. "tell me about this host"). */
  focusNodeId: z.string().uuid().optional(),
});

export type AssistantQueryDto = z.infer<typeof assistantQuerySchema>;
