import { z } from "zod";

/**
 * OWA-011 allow-list: `relatedNodeIds` must be ids the caller already has from a prior
 * query/recommend response (i.e. ids that were actually present in the graph context sent to the
 * model) -- the service re-validates every one exists in this project before writing anything.
 */
export const assistantConfirmInsightSchema = z.object({
  content: z.string().trim().min(1).max(2000),
  relatedNodeIds: z.array(z.string().uuid()).min(1).max(20),
});

export type AssistantConfirmInsightDto = z.infer<typeof assistantConfirmInsightSchema>;
