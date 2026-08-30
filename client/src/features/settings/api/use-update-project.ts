"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-client";
import { projectSchema, type Project } from "@/features/workspace/api/use-projects";

interface UpdateProjectInput {
  name?: string;
  scope?: Project["scope"];
}

/** `PATCH /projects/:id` already covers both name and scope updates -- no separate endpoint needed. */
export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProjectInput) => {
      const data = await apiRequest<unknown>(`/projects/${projectId}`, { method: "PATCH", body: input });
      return projectSchema.parse(data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
