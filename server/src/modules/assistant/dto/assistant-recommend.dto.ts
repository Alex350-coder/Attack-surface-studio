import { z } from "zod";

export const assistantRecommendSchema = z.object({
  /** Optional node to scope recommendations around; omitted for a whole-project overview. */
  focusNodeId: z.string().uuid().optional(),
});

export type AssistantRecommendDto = z.infer<typeof assistantRecommendSchema>;
