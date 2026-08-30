"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest, apiRequestPaginated } from "@/lib/api-client";

/** Mirrors server/src/modules/orchestrator/mappers/tool-run.mapper.ts's ToolRunDto (FE-004). */
export const toolRunSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  adapterId: z.string(),
  executionMode: z.string(),
  target: z.string(),
  status: z.enum(["queued", "running", "succeeded", "failed", "cancelled"]),
  queuedAt: z.coerce.date(),
  startedAt: z.coerce.date().nullable(),
  finishedAt: z.coerce.date().nullable(),
  triggeredBy: z.string(),
  stats: z.unknown(),
  error: z.unknown(),
});
export type ToolRun = z.infer<typeof toolRunSchema>;

const toolRunListSchema = z.array(toolRunSchema);

export function useRuns(projectId: string) {
  return useQuery({
    queryKey: ["projects", projectId, "runs"] as const,
    queryFn: async () => {
      const { items } = await apiRequestPaginated<unknown[]>(`/projects/${projectId}/runs`);
      return toolRunListSchema.parse(items);
    },
    enabled: projectId.length > 0,
    // A run in flight can transition without any user action -- keep the list fresh (no SSE/WebSocket exists yet).
    refetchInterval: (query) => (query.state.data?.some((run) => isNonTerminal(run.status)) ? 3_000 : false),
  });
}

interface EnqueueRunInput {
  adapterId: string;
  executionMode: "local" | "docker";
  target: string;
  options?: unknown;
}

export function useEnqueueRun(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: EnqueueRunInput) => {
      const data = await apiRequest<unknown>(`/projects/${projectId}/runs`, { method: "POST", body: input });
      return toolRunSchema.parse(data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects", projectId, "runs"] });
    },
  });
}

export function useCancelRun(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (runId: string) => {
      const data = await apiRequest<unknown>(`/projects/${projectId}/runs/${runId}/cancel`, { method: "POST" });
      return toolRunSchema.parse(data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects", projectId, "runs"] });
    },
  });
}

export function isNonTerminal(status: ToolRun["status"]): boolean {
  return status === "queued" || status === "running";
}
