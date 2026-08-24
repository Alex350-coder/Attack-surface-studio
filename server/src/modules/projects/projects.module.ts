import { forwardRef, Module } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../../core/database/database.tokens";
import type { Database } from "../../core/database/client";
import { AuthModule } from "../auth/auth.module";
import { KnowledgeModule } from "../knowledge/knowledge.module";
import { UsersModule } from "../users/users.module";
import { DrizzleProjectsRepository } from "./repositories/projects.repository";
import { DrizzleProjectMembersRepository } from "./repositories/project-members.repository";
import { PROJECT_MEMBERS_REPOSITORY, PROJECTS_REPOSITORY } from "./projects.tokens";
import { ProjectsController } from "./projects.controller";
import { ProjectsService } from "./projects.service";

@Module({
  imports: [forwardRef(() => AuthModule), UsersModule, forwardRef(() => KnowledgeModule)],
  controllers: [ProjectsController],
  providers: [
    {
      provide: PROJECTS_REPOSITORY,
      useFactory: (db: Database) => new DrizzleProjectsRepository(db),
      inject: [DATABASE_CONNECTION],
    },
    {
      provide: PROJECT_MEMBERS_REPOSITORY,
      useFactory: (db: Database) => new DrizzleProjectMembersRepository(db),
      inject: [DATABASE_CONNECTION],
    },
    ProjectsService,
  ],
  exports: [PROJECTS_REPOSITORY, PROJECT_MEMBERS_REPOSITORY],
})
export class ProjectsModule {}
