import { CanActivate, ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { ForbiddenError, UnauthorizedError } from "../../../core/http/domain-error";
import { PROJECT_MEMBERS_REPOSITORY } from "../../projects/projects.tokens";
import type { ProjectMembersRepository, ProjectRole } from "../../projects/repositories/project-members.repository";
import { ROLES_KEY } from "./roles.decorator";

/**
 * Re-checks project membership server-side against `project_members` for every request --
 * never trusts a client-supplied project id alone (BOLA protection, SEC-011/OWA-006). Must run
 * after `JwtAuthGuard` so `request.user` is already populated.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(PROJECT_MEMBERS_REPOSITORY) private readonly projectMembersRepository: ProjectMembersRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<ProjectRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const userId = request.user?.sub;
    if (!userId) {
      throw new UnauthorizedError("Authentication is required for this route");
    }

    const projectId = request.params.projectId;
    if (typeof projectId !== "string" || projectId.length === 0) {
      throw new ForbiddenError("This route requires a project id to check membership against");
    }

    const membership = await this.projectMembersRepository.findByProjectAndUser(projectId, userId);
    if (!membership || !requiredRoles.includes(membership.role)) {
      throw new ForbiddenError("You do not have the required role for this project");
    }

    return true;
  }
}
