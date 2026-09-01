"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest, apiRequestPaginated } from "@/lib/api-client";

/** Mirrors server/src/modules/projects/mappers/project.mapper.ts's ProjectMemberDto (FE-004). */
export const projectMemberSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(["owner", "admin", "member", "viewer"]),
  createdAt: z.coerce.date(),
});
export type ProjectMember = z.infer<typeof projectMemberSchema>;

const projectMemberListSchema = z.array(projectMemberSchema);

export function useProjectMembers(projectId: string) {
  return useQuery({
    queryKey: ["projects", projectId, "members"] as const,
    queryFn: async () => {
      const { items } = await apiRequestPaginated<unknown[]>(`/projects/${projectId}/members`);
      return projectMemberListSchema.parse(items);
    },
    enabled: projectId.length > 0,
  });
}

interface AddOrAssignMemberInput {
  email: string;
  role: ProjectMember["role"];
}

/**
 * Adds a member by email or re-assigns an existing member's role -- there is no separate
 * "invite" flow, matching the backend's single `POST .../members` upsert-by-email endpoint.
 * Outright removal isn't supported yet (documented limitation, AMD-006).
 */
export function useAddOrAssignMember(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddOrAssignMemberInput) => {
      const data = await apiRequest<unknown>(`/projects/${projectId}/members`, { method: "POST", body: input });
      return projectMemberSchema.parse(data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects", projectId, "members"] });
    },
  });
}
