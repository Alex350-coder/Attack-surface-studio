"use client";

import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-client";
import { assistantAnswerSchema } from "./assistant-answer.schema";

interface AssistantQueryInput {
  question: string;
  focusNodeId?: string;
}

/** Never mutates the graph -- read-only Q&A. See AssistantModule's zero dependency on the
 * orchestrator module for why there is no code path from this call to a tool execution. */
export function useAssistantQuery(projectId: string) {
  return useMutation({
    mutationFn: async (input: AssistantQueryInput) => {
      const data = await apiRequest<unknown>(`/projects/${projectId}/assistant/query`, { method: "POST", body: input });
      return assistantAnswerSchema.parse(data);
    },
  });
}
