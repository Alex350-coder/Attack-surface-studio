"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-client";
import { projectSchema } from "./use-projects";

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ["projects", projectId] as const,
    queryFn: async () => {
      const data = await apiRequest<unknown>(`/projects/${projectId}`);
      return projectSchema.parse(data);
    },
    enabled: projectId.length > 0,
  });
}
