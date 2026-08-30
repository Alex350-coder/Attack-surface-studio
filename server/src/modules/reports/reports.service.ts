import { Inject, Injectable } from "@nestjs/common";
import { NotFoundError } from "../../core/http/domain-error";
import { EDGES_REPOSITORY, NODES_REPOSITORY, REPORTS_REPOSITORY } from "../knowledge/knowledge.tokens";
import type { EdgesRepository } from "../knowledge/repositories/edges.repository";
import type { NodesRepository } from "../knowledge/repositories/nodes.repository";
import type { ReportRow, ReportsRepository } from "../knowledge/repositories/reports.repository";
import type { Paginated, PaginationParams } from "../shared/repository.types";
import type { CreateReportDto } from "./dto/create-report.dto";

/**
 * Reports are assembled, not generated from scratch: the caller selects node/edge ids already
 * present in the project graph (typically via GraphEngine's `onNodeSelect`), and the service
 * resolves them into a read-only `graphSnapshot` stored on the report row. Export/rendering
 * (PDF/HTML/MD) is out of scope for Phase 10 -- reports stay in `draft` status here.
 */
@Injectable()
export class ReportsService {
  constructor(
    @Inject(REPORTS_REPOSITORY) private readonly reportsRepository: ReportsRepository,
    @Inject(NODES_REPOSITORY) private readonly nodesRepository: NodesRepository,
    @Inject(EDGES_REPOSITORY) private readonly edgesRepository: EdgesRepository,
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
}
