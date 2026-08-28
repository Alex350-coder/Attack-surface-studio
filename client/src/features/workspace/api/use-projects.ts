"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest, apiRequestPaginated } from "@/lib/api-client";

/** Mirrors server/src/modules/projects/mappers/project.mapper.ts's ProjectDto (FE-004). */
export const projectSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  scope: z.unknown(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Project = z.infer<typeof projectSchema>;

const projectListSchema = z.array(projectSchema);

export function useProjects() {
  return useQuery({
    queryKey: ["projects"] as const,
    queryFn: async () => {
      const { items } = await apiRequestPaginated<unknown[]>("/projects");
      return projectListSchema.parse(items);
    },
  });
}

interface CreateProjectInput {
  name: string;
  slug: string;
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      const data = await apiRequest<unknown>("/projects", { method: "POST", body: input });
      return projectSchema.parse(data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
