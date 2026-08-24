import { beforeEach, describe, expect, it, vi, type Mocked } from "vitest";
import { OrchestratorService } from "../../../src/modules/orchestrator/orchestrator.service";
import { ConflictError, NotFoundError, ScopeViolationError } from "../../../src/core/http/domain-error";
import type { ProjectRow, ProjectsRepository } from "../../../src/modules/projects/repositories/projects.repository";
import type { ToolRunRow, ToolRunsRepository } from "../../../src/modules/knowledge/repositories/tool-runs.repository";
import type { OrchestratorQueue } from "../../../src/modules/orchestrator/queue/orchestrator.queue";

const PROJECT_ID = "33333333-3333-3333-3333-333333333333";
const RUN_ID = "44444444-4444-4444-4444-444444444444";
const USER_ID = "11111111-1111-1111-1111-111111111111";

function makeProject(overrides: Partial<ProjectRow> = {}): ProjectRow {
  return {
    id: PROJECT_ID,
    name: "Test Project",
    slug: "test-project",
    scope: { includes: ["example.com"], excludes: [] },
    createdBy: USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

function makeRun(overrides: Partial<ToolRunRow> = {}): ToolRunRow {
  return {
    id: RUN_ID,
    projectId: PROJECT_ID,
    adapterId: "stub",
    executionMode: "local",
    target: "example.com",
    invocation: null,
    status: "queued",
    queuedAt: new Date(),
    startedAt: null,
    finishedAt: null,
    triggeredBy: USER_ID,
    stats: null,
    error: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("OrchestratorService", () => {
  let projectsRepository: Mocked<ProjectsRepository>;
  let toolRunsRepository: Mocked<ToolRunsRepository>;
  let queue: Mocked<OrchestratorQueue>;
  let service: OrchestratorService;

  beforeEach(() => {
    projectsRepository = {
      create: vi.fn(),
      createWithOwner: vi.fn(),
      updateScope: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findBySlug: vi.fn(),
      list: vi.fn(),
      listForUser: vi.fn(),
      softDelete: vi.fn(),
    };
    toolRunsRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      updateStatus: vi.fn(),
      listByProject: vi.fn(),
    };
    queue = {
      enqueue: vi.fn(),
      requestCancel: vi.fn(),
      close: vi.fn(),
    } as unknown as Mocked<OrchestratorQueue>;

    const rawOutputsRepository = {
      create: vi.fn(),
      findLatestByToolRunId: vi.fn(),
    };
    const blobStorage = { put: vi.fn(), get: vi.fn() };

    service = new OrchestratorService(projectsRepository, toolRunsRepository, rawOutputsRepository, blobStorage, queue);
  });

  describe("enqueueRun", () => {
    it("rejects an out-of-scope target before creating a run or touching the queue", async () => {
      projectsRepository.findById.mockResolvedValue(makeProject());

      await expect(
        service.enqueueRun(USER_ID, PROJECT_ID, {
          adapterId: "stub",
          executionMode: "local",
          target: "not-in-scope.com",
        }),
      ).rejects.toThrow(ScopeViolationError);

      expect(toolRunsRepository.create).not.toHaveBeenCalled();
      expect(queue.enqueue).not.toHaveBeenCalled();
    });

    it("throws NotFoundError when the project does not exist", async () => {
      projectsRepository.findById.mockResolvedValue(null);

      await expect(
        service.enqueueRun(USER_ID, PROJECT_ID, { adapterId: "stub", executionMode: "local", target: "example.com" }),
      ).rejects.toThrow(NotFoundError);
    });

    it("creates a run and enqueues it for an in-scope target", async () => {
      projectsRepository.findById.mockResolvedValue(makeProject());
      toolRunsRepository.create.mockResolvedValue(makeRun());

      const dto = await service.enqueueRun(USER_ID, PROJECT_ID, {
        adapterId: "stub",
        executionMode: "local",
        target: "example.com",
      });

      expect(dto.id).toBe(RUN_ID);
      expect(toolRunsRepository.create).toHaveBeenCalledWith(
        PROJECT_ID,
        expect.objectContaining({ adapterId: "stub", target: "example.com", triggeredBy: USER_ID }),
      );
      expect(queue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({ runId: RUN_ID, projectId: PROJECT_ID, triggeredBy: USER_ID }),
      );
    });
  });

  describe("cancelRun", () => {
    it("rejects cancelling a run that has already finished", async () => {
      toolRunsRepository.findById.mockResolvedValue(makeRun({ status: "succeeded" }));

      await expect(service.cancelRun(PROJECT_ID, RUN_ID)).rejects.toThrow(ConflictError);
      expect(toolRunsRepository.updateStatus).not.toHaveBeenCalled();
    });

    it("throws NotFoundError when the run does not exist", async () => {
      toolRunsRepository.findById.mockResolvedValue(null);

      await expect(service.cancelRun(PROJECT_ID, RUN_ID)).rejects.toThrow(NotFoundError);
    });

    it("atomically cancels a queued/running run and publishes the cancel signal", async () => {
      toolRunsRepository.findById.mockResolvedValue(makeRun({ status: "running" }));
      toolRunsRepository.updateStatus.mockResolvedValue(makeRun({ status: "cancelled" }));

      const dto = await service.cancelRun(PROJECT_ID, RUN_ID);

      expect(dto.status).toBe("cancelled");
      expect(toolRunsRepository.updateStatus).toHaveBeenCalledWith(
        PROJECT_ID,
        RUN_ID,
        expect.objectContaining({ status: "cancelled" }),
        ["queued", "running"],
      );
      expect(queue.requestCancel).toHaveBeenCalledWith(RUN_ID);
    });

    it("surfaces a race where the run finished concurrently as a conflict", async () => {
      toolRunsRepository.findById.mockResolvedValue(makeRun({ status: "running" }));
      toolRunsRepository.updateStatus.mockResolvedValue(null);

      await expect(service.cancelRun(PROJECT_ID, RUN_ID)).rejects.toThrow(ConflictError);
      expect(queue.requestCancel).not.toHaveBeenCalled();
    });
  });

  describe("getRun / listRuns", () => {
    it("delegates listRuns to the repository and maps rows to DTOs", async () => {
      toolRunsRepository.listByProject.mockResolvedValue({
        items: [makeRun()],
        page: 1,
        pageSize: 20,
        total: 1,
      });

      const result = await service.listRuns(PROJECT_ID);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.id).toBe(RUN_ID);
    });

    it("throws NotFoundError when the run does not exist", async () => {
      toolRunsRepository.findById.mockResolvedValue(null);

      await expect(service.getRun(PROJECT_ID, RUN_ID)).rejects.toThrow(NotFoundError);
    });
  });
});
