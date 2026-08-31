"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/lib/api-client";
import { nodeSchema, edgeSchema } from "@/lib/server-contracts";

/** Mirrors server/src/modules/assistant/assistant.service.ts's AssistantInsightResult. */
const insightResultSchema = z.object({
  node: nodeSchema,
  edges: z.array(edgeSchema),
});

interface ConfirmInsightInput {
  content: string;
  relatedNodeIds: string[];
}

/**
 * The only write path the Assistant feature has. On success, invalidates the shared project-graph
 * query keys so the new `aiInsight` node/`ai` edges appear in the live workspace graph immediately
 * -- no bespoke rendering needed, the graph engine's registries already know these types (FE-012).
 */
export function useConfirmInsight(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ConfirmInsightInput) => {
      const data = await apiRequest<unknown>(`/projects/${projectId}/assistant/insights`, {
        method: "POST",
        body: input,
      });
      return insightResultSchema.parse(data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects", projectId, "graph"] });
    },
  });
}
