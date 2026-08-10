import { forwardRef, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { DATABASE_CONNECTION } from "../../core/database/database.tokens";
import type { Database } from "../../core/database/client";
import { ProjectsModule } from "../projects/projects.module";
import { UsersModule } from "../users/users.module";
import { DrizzleSessionsRepository } from "./repositories/sessions.repository";
import { SESSIONS_REPOSITORY } from "./auth.tokens";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RolesGuard } from "./guards/roles.guard";

/**
 * JWT auth, RBAC, and sessions (Phase 4). `JwtModule.register({})` is intentionally left
 * unconfigured -- `AuthService`/`JwtAuthGuard` pass `secret`/`expiresIn` explicitly per call
 * because access and refresh tokens are signed with two different secrets.
 */
@Module({
  imports: [JwtModule.register({}), forwardRef(() => ProjectsModule), UsersModule],
  controllers: [AuthController],
  providers: [
    {
      provide: SESSIONS_REPOSITORY,
      useFactory: (db: Database) => new DrizzleSessionsRepository(db),
      inject: [DATABASE_CONNECTION],
    },
    AuthService,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard, JwtModule],
})
export class AuthModule {}
