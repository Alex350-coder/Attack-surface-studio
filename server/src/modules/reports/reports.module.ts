import { forwardRef, Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ProjectsModule } from "../projects/projects.module";
import { KnowledgeModule } from "../knowledge/knowledge.module";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";

/**
 * Report assembly (create/list/preview). Reuses the repositories `KnowledgeModule` already
 * exports (`REPORTS_REPOSITORY`, `NODES_REPOSITORY`, `EDGES_REPOSITORY`) instead of re-providing
 * them here -- explicit module boundaries, one repository instance per token (ARC "explicit
 * boundaries" principle). Export/rendering to PDF/HTML/MD is Phase 12.
 */
@Module({
  imports: [forwardRef(() => AuthModule), forwardRef(() => ProjectsModule), KnowledgeModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
