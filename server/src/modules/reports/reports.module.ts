import { forwardRef, Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ProjectsModule } from "../projects/projects.module";
import { KnowledgeModule } from "../knowledge/knowledge.module";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";
import { ReportRendererService } from "./rendering/report-renderer.service";

/**
 * Report assembly (create/list/preview) and export (PDF/HTML/Markdown, Phase 12). Reuses the
 * repositories `KnowledgeModule` already exports (`REPORTS_REPOSITORY`, `REPORT_EXPORTS_REPOSITORY`,
 * `NODES_REPOSITORY`, `EDGES_REPOSITORY`) instead of re-providing them here -- explicit module
 * boundaries, one repository instance per token (ARC "explicit boundaries" principle).
 */
@Module({
  imports: [forwardRef(() => AuthModule), forwardRef(() => ProjectsModule), KnowledgeModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportRendererService],
})
export class ReportsModule {}
