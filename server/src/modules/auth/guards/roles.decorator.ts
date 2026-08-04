import { SetMetadata } from "@nestjs/common";
import type { ProjectRole } from "../../projects/repositories/project-members.repository";

export const ROLES_KEY = "roles";

/** Declares which project roles may access a route. Enforced by `RolesGuard` against `project_members`, never trusted from the client. */
export const Roles = (...roles: ProjectRole[]): MethodDecorator & ClassDecorator => SetMetadata(ROLES_KEY, roles);
