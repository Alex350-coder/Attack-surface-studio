import { z } from "zod";

/** Mirrors server/src/modules/assistant/assistant.service.ts's AssistantAnswer. Shared by the
 * query and recommend hooks -- both endpoints return the exact same shape. */
export const assistantAnswerSchema = z.object({
  answer: z.string(),
  referencedNodeIds: z.array(z.string().uuid()),
  truncated: z.boolean(),
});
export type AssistantAnswer = z.infer<typeof assistantAnswerSchema>;
