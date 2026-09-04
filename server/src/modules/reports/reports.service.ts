import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConflictError, NotFoundError } from "../../core/http/domain-error";
import { BLOB_STORAGE } from "../../core/storage/storage.tokens";
import type { BlobStorage } from "../../core/storage/blob-storage.contract";
import {
  EDGES_REPOSITORY,
  NODES_REPOSITORY,
  REPORT_EXPORTS_REPOSITORY,
  REPORTS_REPOSITORY,
} from "../knowledge/knowledge.tokens";
import type { EdgesRepository } from "../knowledge/repositories/edges.repository";
import type { NodesRepository } from "../knowledge/repositories/nodes.repository";
import type { ReportExportsRepository } from "../knowledge/repositories/report-exports.repository";
import type { ReportRow, ReportsRepository } from "../knowledge/repositories/reports.repository";
import type { Paginated, PaginationParams } from "../shared/repository.types";
import type { CreateReportDto } from "./dto/create-report.dto";
import type { ReportExportFormat, ReportGraphSnapshot, RenderedReport } from "./rendering/report-rendering.types";
import { EXTENSIONS, MIME_TYPES, ReportRendererService } from "./rendering/report-renderer.service";

/**
 * Reports are assembled, not generated from scratch: the caller selects node/edge ids already
 * present in the project graph (typically via GraphEngine's `onNodeSelect`), and the service
 * resolves them into a read-only `graphSnapshot` stored on the report row. Export renders that
 * snapshot to PDF/HTML/Markdown on demand and caches the artifact in `report_exports`.
 */
@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @Inject(REPORTS_REPOSITORY) private readonly reportsRepository: ReportsRepository,
    @Inject(NODES_REPOSITORY) private readonly nodesRepository: NodesRepository,
    @Inject(EDGES_REPOSITORY) private readonly edgesRepository: EdgesRepository,
    @Inject(REPORT_EXPORTS_REPOSITORY) private readonly reportExportsRepository: ReportExportsRepository,
    @Inject(BLOB_STORAGE) private readonly blobStorage: BlobStorage,
    private readonly renderer: ReportRendererService,
  ) {}

  async createReport(projectId: string, actingUserId: string, dto: CreateReportDto): Promise<ReportRow> {
    const nodes = await Promise.all(dto.nodeIds.map((id) => this.nodesRepository.findById(projectId, id)));
    const missingNodeIndex = nodes.findIndex((node) => node === null);
    if (missingNodeIndex !== -1) {
      throw new NotFoundError(`Node ${dto.nodeIds[missingNodeIndex]} was not found in this project`);
    }

    const edges = await Promise.all(dto.edgeIds.map((id) => this.edgesRepository.findById(projectId, id)));
    const missingEdgeIndex = edges.findIndex((edge) => edge === null);
    if (missingEdgeIndex !== -1) {
      throw new NotFoundError(`Edge ${dto.edgeIds[missingEdgeIndex]} was not found in this project`);
    }

    return this.reportsRepository.create(projectId, {
      title: dto.title,
      status: "draft",
      graphSnapshot: { nodes, edges },
      generatedBy: actingUserId,
    });
  }

  async listReports(projectId: string, pagination?: PaginationParams): Promise<Paginated<ReportRow>> {
    return this.reportsRepository.listByProject(projectId, pagination);
  }

  async getReport(projectId: string, reportId: string): Promise<ReportRow> {
    const report = await this.reportsRepository.findById(projectId, reportId);
    if (!report) {
      throw new NotFoundError(`Report ${reportId} was not found in this project`);
    }
    return report;
  }

  /**
   * Renders (or serves a cached render of) a report in the requested format. Export is
   * idempotent-by-cache: a second call for the same (reportId, format) returns the exact same
   * bytes without re-rendering, which is what makes "regenerating yields consistent content"
   * true by construction. Status transitions are atomic and allow-listed (OWA-020/OWA-021);
   * a lost race on `generating` surfaces as a 409, never a silent overwrite.
   */
  async exportReport(
    projectId: string,
    reportId: string,
    actingUserId: string,
    format: ReportExportFormat,
    correlationId?: string,
  ): Promise<RenderedReport> {
    const report = await this.getReport(projectId, reportId);

    const cached = await this.reportExportsRepository.findByReportAndFormat(projectId, reportId, format);
    if (cached) {
      const buffer = await this.blobStorage.get(cached.blobRef);
      return { buffer, mimeType: MIME_TYPES[format], extension: EXTENSIONS[format] };
    }

    const generating = await this.reportsRepository.transitionStatus(projectId, reportId, {
      from: ["draft", "ready", "failed"],
      to: "generating",
    });
    if (!generating) {
      throw new ConflictError(`Report ${reportId} is already being exported`);
    }

    try {
      const snapshot = toRenderSnapshot(report.graphSnapshot);
      const rendered = await this.renderer.render(format, snapshot, report.title);
      const putResult = await this.blobStorage.put(rendered.buffer);
      await this.reportExportsRepository.upsert({
        reportId,
        format,
        blobRef: putResult.ref,
        checksum: putResult.hash,
        byteSize: putResult.byteSize,
        generatedBy: actingUserId,
      });
      await this.reportsRepository.transitionStatus(projectId, reportId, {
        from: ["generating"],
        to: "ready",
      });
      this.logger.log({
        event: "report.export",
        actorUserId: actingUserId,
        projectId,
        reportId,
        format,
        outcome: "success",
        correlationId,
      });
      return rendered;
    } catch (error) {
      await this.reportsRepository.transitionStatus(projectId, reportId, {
        from: ["generating"],
        to: "failed",
      });
      this.logger.error({
        event: "report.export",
        actorUserId: actingUserId,
        projectId,
        reportId,
        format,
        outcome: "failure",
        correlationId,
      });
      throw error;
    }
  }
}

function toRenderSnapshot(graphSnapshot: Record<string, unknown>): ReportGraphSnapshot {
  return {
    nodes: Array.isArray(graphSnapshot.nodes) ? (graphSnapshot.nodes as ReportGraphSnapshot["nodes"]) : [],
    edges: Array.isArray(graphSnapshot.edges) ? (graphSnapshot.edges as ReportGraphSnapshot["edges"]) : [],
  };
}
