import { Module } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../../core/database/database.tokens";
import type { Database } from "../../core/database/client";
import { DrizzleProjectsRepository } from "./repositories/projects.repository";
import { PROJECTS_REPOSITORY } from "./projects.tokens";

@Module({
  providers: [
    {
      provide: PROJECTS_REPOSITORY,
      useFactory: (db: Database) => new DrizzleProjectsRepository(db),
      inject: [DATABASE_CONNECTION],
    },
  ],
  exports: [PROJECTS_REPOSITORY],
})
export class ProjectsModule {}
