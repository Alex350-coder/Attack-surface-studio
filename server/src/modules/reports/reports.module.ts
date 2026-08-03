import { Module } from "@nestjs/common";

/** Empty shell — report generation/export is built in Phase 12. Table-level data access already
 * lives in `KnowledgeModule` (`REPORTS_REPOSITORY`). */
@Module({})
export class ReportsModule {}
