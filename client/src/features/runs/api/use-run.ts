"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-client";
import { isNonTerminal, toolRunSchema } from "./use-runs";

/**
 * Polls a single run's status while it's `queued`/`running`, stops once it reaches a terminal
 * state. This is the "live status" mechanism -- no WebSocket/SSE exists in the backend yet.
 */
export function useRun(projectId: string, runId: string) {
  return useQuery({
    queryKey: ["projects", projectId, "runs", runId] as const,
    queryFn: async () => {
      const data = await apiRequest<unknown>(`/projects/${projectId}/runs/${runId}`);
      return toolRunSchema.parse(data);
    },
    enabled: projectId.length > 0 && runId.length > 0,
    refetchInterval: (query) => (query.state.data && isNonTerminal(query.state.data.status) ? 2_000 : false),
  });
}
