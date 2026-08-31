"use client";

import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-client";
import { assistantAnswerSchema } from "./assistant-answer.schema";

interface AssistantRecommendInput {
  focusNodeId?: string;
}

/** Proposes next steps -- text only, never an executable action. "Confirm as insight" is the only
 * write path a recommendation can lead to (useConfirmInsight), and that is always user-initiated. */
export function useAssistantRecommend(projectId: string) {
  return useMutation({
    mutationFn: async (input: AssistantRecommendInput) => {
      const data = await apiRequest<unknown>(`/projects/${projectId}/assistant/recommend`, {
        method: "POST",
        body: input,
      });
      return assistantAnswerSchema.parse(data);
    },
  });
}
