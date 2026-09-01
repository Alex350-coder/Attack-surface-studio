"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/lib/api-client";

const executionModeSchema = z.enum(["local", "docker"]);

/** Mirrors server/src/modules/adapters/adapter.contract.ts's DetectionResult (FE-004). */
export const detectionResultSchema = z.object({
  available: z.boolean(),
  version: z.string().optional(),
  error: z.string().optional(),
});
export type DetectionResult = z.infer<typeof detectionResultSchema>;

/** Mirrors server/src/modules/adapters/repositories/tool-configs.repository.ts's ToolConfigRow (FE-004). */
export const toolConfigSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  adapterId: z.string(),
  executionMode: executionModeSchema,
  config: z.record(z.string(), z.unknown()),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type ToolConfig = z.infer<typeof toolConfigSchema>;

export function useToolConfig(projectId: string, toolId: string) {
  return useQuery({
    queryKey: ["projects", projectId, "tools", toolId, "config"] as const,
    queryFn: async () => {
      const data = await apiRequest<unknown>(`/projects/${projectId}/tools/${toolId}/config`);
      return data === null ? null : toolConfigSchema.parse(data);
    },
    enabled: projectId.length > 0 && toolId.length > 0,
  });
}

interface SetToolConfigInput {
  executionMode: "local" | "docker";
  config?: Record<string, unknown>;
}

export function useSetToolConfig(projectId: string, toolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SetToolConfigInput) => {
      const data = await apiRequest<unknown>(`/projects/${projectId}/tools/${toolId}/config`, {
        method: "PUT",
        body: input,
      });
      return toolConfigSchema.parse(data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects", projectId, "tools", toolId, "config"] });
    },
  });
}

/** Detection isn't cached -- each click re-probes the tool's actual availability on the host/container. */
export function useDetectTool(projectId: string, toolId: string) {
  return useMutation({
    mutationFn: async (mode: "local" | "docker") => {
      const data = await apiRequest<unknown>(`/projects/${projectId}/tools/${toolId}/detect`, {
        method: "POST",
        body: { mode },
      });
      return detectionResultSchema.parse(data);
    },
  });
}
