import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConflictError, NotFoundError, ScopeViolationError } from "../../core/http/domain-error";
import type { Paginated, PaginationParams } from "../shared/repository.types";
import { PROJECTS_REPOSITORY } from "../projects/projects.tokens";
import type { ProjectRow, ProjectsRepository } from "../projects/repositories/projects.repository";
import { RAW_OUTPUTS_REPOSITORY, TOOL_RUNS_REPOSITORY } from "../knowledge/knowledge.tokens";
import type { ToolRunRow, ToolRunsRepository } from "../knowledge/repositories/tool-runs.repository";
import type { RawOutputsRepository } from "../knowledge/repositories/raw-outputs.repository";
import { BLOB_STORAGE } from "../../core/storage/storage.tokens";
import type { BlobStorage } from "../../core/storage/blob-storage.contract";
import { isTargetInScope } from "./scope/scope-matcher";
import { isTerminalStatus, type ToolRunStatus } from "./tool-run-transitions";
import { toToolRunDto, type ToolRunDto } from "./mappers/tool-run.mapper";
import { ORCHESTRATOR_QUEUE } from "./orchestrator.tokens";
import type { OrchestratorQueue } from "./queue/orchestrator.queue";
import type { EnqueueRunDto } from "./dto/enqueue-run.dto";

/** The API process's side of the Orchestrator: authorizes, persists, and enqueues -- it never executes anything itself. */
@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    @Inject(PROJECTS_REPOSITORY) private readonly projectsRepository: ProjectsRepository,
    @Inject(TOOL_RUNS_REPOSITORY) private readonly toolRunsRepository: ToolRunsRepository,
    @Inject(RAW_OUTPUTS_REPOSITORY) private readonly rawOutputsRepository: RawOutputsRepository,
    @Inject(BLOB_STORAGE) private readonly blobStorage: BlobStorage,
    @Inject(ORCHESTRATOR_QUEUE) private readonly queue: OrchestratorQueue,
  ) {}

  async enqueueRun(actingUserId: string, projectId: string, dto: EnqueueRunDto): Promise<ToolRunDto> {
    const project = await this.requireProject(projectId);
    if (!isTargetInScope(dto.target, project.scope)) {
      throw new ScopeViolationError(`Target "${dto.target}" is outside the project's authorized scope`);
    }

    const row = await this.toolRunsRepository.create(projectId, {
      adapterId: dto.adapterId,
      executionMode: dto.executionMode,
      target: dto.target,
      triggeredBy: actingUserId,
    });

    try {
      await this.queue.enqueue({
        runId: row.id,
        projectId,
        adapterId: dto.adapterId,
        executionMode: dto.executionMode,
        target: dto.target,
        triggeredBy: actingUserId,
        options: dto.options,
      });
    } catch (error) {
      // The `tool_runs` row already exists but no worker will ever pick it up -- left as
      // "queued" it would be a permanently stuck run invisible to any retry mechanism. Mark it
      // failed so it surfaces to the caller/UI instead of silently hanging forever.
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to enqueue run ${row.id} after creating its row: ${message}`);
      await this.toolRunsRepository.updateStatus(
        projectId,
        row.id,
        { status: "failed", finishedAt: new Date(), error: { code: "ENQUEUE_FAILED", message } },
        ["queued"],
      );
      throw error;
    }

    return toToolRunDto(row);
  }

  async listRuns(projectId: string, pagination?: PaginationParams): Promise<Paginated<ToolRunDto>> {
    const result = await this.toolRunsRepository.listByProject(projectId, pagination);
    return { ...result, items: result.items.map(toToolRunDto) };
  }

  async getRun(projectId: string, runId: string): Promise<ToolRunDto> {
    const row = await this.requireRun(projectId, runId);
    return toToolRunDto(row);
  }

  async cancelRun(projectId: string, runId: string): Promise<ToolRunDto> {
    const row = await this.requireRun(projectId, runId);
    if (isTerminalStatus(row.status as ToolRunStatus)) {
      throw new ConflictError(`Run ${runId} has already finished and cannot be cancelled`);
    }

    const updated = await this.toolRunsRepository.updateStatus(
      projectId,
      runId,
      { status: "cancelled", finishedAt: new Date() },
      ["queued", "running"],
    );
    if (!updated) {
      throw new ConflictError(`Run ${runId} has already finished and cannot be cancelled`);
    }

    await this.queue.requestCancel(runId);
    return toToolRunDto(updated);
  }

  /** Audit-only: raw stdout is never used to render the graph (Routes.md, SEC-052). */
  async getRawOutput(projectId: string, runId: string): Promise<{ buffer: Buffer; format: string; byteSize: number }> {
    await this.requireRun(projectId, runId);
    const row = await this.rawOutputsRepository.findLatestByToolRunId(projectId, runId);
    if (!row) {
      throw new NotFoundError("No raw output has been captured for this run");
    }
    const buffer = await this.blobStorage.get(row.contentRef);
    return { buffer, format: row.format, byteSize: row.byteSize };
  }

  private async requireProject(projectId: string): Promise<ProjectRow> {
    const project = await this.projectsRepository.findById(projectId);
    if (!project) {
      throw new NotFoundError("Project not found");
    }
    return project;
  }

  private async requireRun(projectId: string, runId: string): Promise<ToolRunRow> {
    const row = await this.toolRunsRepository.findById(projectId, runId);
    if (!row) {
      throw new NotFoundError("Run not found");
    }
    return row;
  }
}
