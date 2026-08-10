import type { ProjectRole } from "../repositories/project-members.repository";

/**
 * Explicit allow-list of who may assign which role (OWA-021). Only an `owner` may ever grant,
 * revoke, or touch the `owner` role — an `admin` may manage `member`/`viewer` roles but can
 * neither create a second owner nor demote the existing one (SEC-015: no privilege escalation).
 */
export function canAssignRole(
  actorRole: ProjectRole,
  targetCurrentRole: ProjectRole | null,
  desiredRole: ProjectRole,
): boolean {
  if (actorRole !== "owner" && actorRole !== "admin") return false;
  if (targetCurrentRole === "owner" && actorRole !== "owner") return false;
  if (desiredRole === "owner" && actorRole !== "owner") return false;
  return true;
}
