"use client";

import { useAuthUser } from "@/features/auth/auth.store";
import { useProjectMembers } from "@/features/settings/api/use-project-members";

/**
 * Resolves the signed-in user's own role for a project by cross-referencing the members list
 * (reused from the Settings feature, DRY -- FE-012) against the auth store's user id. Used to
 * mirror server-side `@Roles(...)` gates in the UI (e.g. hiding an owner/admin-only link) --
 * the server remains the authoritative enforcement.
 */
export function useCurrentRole(projectId: string) {
  const user = useAuthUser();
  const query = useProjectMembers(projectId);

  const role = query.data?.find((member) => member.userId === user?.id)?.role ?? null;
  return { role, isLoading: query.isLoading, isError: query.isError };
}
