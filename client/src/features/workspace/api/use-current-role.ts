"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequestPaginated } from "@/lib/api-client";
import { useAuthUser } from "@/features/auth/auth.store";

/** Mirrors server/src/modules/projects/mappers/project.mapper.ts's ProjectMemberDto (FE-004). */
const projectMemberSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(["owner", "admin", "member", "viewer"]),
  createdAt: z.coerce.date(),
});
const projectMemberListSchema = z.array(projectMemberSchema);

/**
 * Resolves the signed-in user's own role for a project by cross-referencing the members list
 * against the auth store's user id. Used to mirror server-side `@Roles(...)` gates in the UI
 * (e.g. hiding an owner/admin-only link) -- the server remains the authoritative enforcement.
 */
export function useCurrentRole(projectId: string) {
  const user = useAuthUser();

  const query = useQuery({
    queryKey: ["projects", projectId, "members"] as const,
    queryFn: async () => {
      const { items } = await apiRequestPaginated<unknown[]>(`/projects/${projectId}/members`);
      return projectMemberListSchema.parse(items);
    },
    enabled: projectId.length > 0 && user !== null,
  });

  const role = query.data?.find((member) => member.userId === user?.id)?.role ?? null;
  return { role, isLoading: query.isLoading, isError: query.isError };
}
