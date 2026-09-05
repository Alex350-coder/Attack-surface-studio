import { and, eq } from "drizzle-orm";
import type { Database } from "../../../core/database/client";
import { reportExports, reports } from "../../../core/database/schema";

export interface ReportExportRow {
  id: string;
  reportId: string;
  format: string;
  blobRef: string;
  checksum: string;
  byteSize: number;
  generatedBy: string | null;
  createdAt: Date;
}

export interface ReportExportUpsertInput {
  reportId: string;
  format: string;
  blobRef: string;
  checksum: string;
  byteSize: number;
  generatedBy: string | null;
}

/**
 * All data access for `report_exports` (DATA_MODEL.md §3.6). The table has no `project_id`
 * column of its own, so project scoping (DB-013, SEC-012) is enforced by joining through
 * `reports`, mirroring `RawOutputsRepository`'s join-through-`tool_runs` pattern.
 */
export interface ReportExportsRepository {
  /** Insert or replace the artifact for a (reportId, format) pair -- the regenerate/cache-refresh path. */
  upsert(input: ReportExportUpsertInput): Promise<ReportExportRow>;
  findByReportAndFormat(projectId: string, reportId: string, format: string): Promise<ReportExportRow | null>;
}

export class DrizzleReportExportsRepository implements ReportExportsRepository {
  constructor(private readonly db: Database) {}

  async upsert(input: ReportExportUpsertInput): Promise<ReportExportRow> {
    const [row] = await this.db
      .insert(reportExports)
      .values({
        reportId: input.reportId,
        format: input.format,
        blobRef: input.blobRef,
        checksum: input.checksum,
        byteSize: input.byteSize,
        generatedBy: input.generatedBy,
      })
      .onConflictDoUpdate({
        target: [reportExports.reportId, reportExports.format],
        set: {
          blobRef: input.blobRef,
          checksum: input.checksum,
          byteSize: input.byteSize,
          generatedBy: input.generatedBy,
        },
      })
      .returning();
    return row as ReportExportRow;
  }

  async findByReportAndFormat(
    projectId: string,
    reportId: string,
    format: string,
  ): Promise<ReportExportRow | null> {
    const [row] = await this.db
      .select({
        id: reportExports.id,
        reportId: reportExports.reportId,
        format: reportExports.format,
        blobRef: reportExports.blobRef,
        checksum: reportExports.checksum,
        byteSize: reportExports.byteSize,
        generatedBy: reportExports.generatedBy,
        createdAt: reportExports.createdAt,
      })
      .from(reportExports)
      .innerJoin(reports, eq(reportExports.reportId, reports.id))
      .where(
        and(
          eq(reports.projectId, projectId),
          eq(reportExports.reportId, reportId),
          eq(reportExports.format, format),
        ),
      )
      .limit(1);
    return (row as ReportExportRow) ?? null;
  }
}
