import { describe, expect, it, vi } from "vitest";
import { ReportsService } from "../../../src/modules/reports/reports.service";
import type { NodeRow, NodesRepository } from "../../../src/modules/knowledge/repositories/nodes.repository";
import type { EdgeRow, EdgesRepository } from "../../../src/modules/knowledge/repositories/edges.repository";
import type { ReportRow, ReportsRepository } from "../../../src/modules/knowledge/repositories/reports.repository";
import type {
  ReportExportRow,
  ReportExportsRepository,
} from "../../../src/modules/knowledge/repositories/report-exports.repository";
import type { BlobStorage } from "../../../src/core/storage/blob-storage.contract";
import { ReportRendererService } from "../../../src/modules/reports/rendering/report-renderer.service";
import { ConflictError, NotFoundError } from "../../../src/core/http/domain-error";

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "22222222-2222-2222-2222-222222222222";
const NODE_ID = "33333333-3333-3333-3333-333333333333";
const EDGE_ID = "44444444-4444-4444-4444-444444444444";

function makeNodeRow(): NodeRow {
  return {
    id: NODE_ID,
    projectId: PROJECT_ID,
    type: "host",
    category: "infrastructure",
    identityKey: "host:example.com",
    label: "example.com",
    severity: null,
    data: {},
    sourceRunId: null,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSeenAt: new Date(),
    deletedAt: null,
  };
}

function makeEdgeRow(): EdgeRow {
  return {
    id: EDGE_ID,
    projectId: PROJECT_ID,
    sourceId: NODE_ID,
    targetId: NODE_ID,
    type: "discovery",
    animated: false,
    label: null,
    data: {},
    sourceRunId: null,
    createdAt: new Date(),
  } as EdgeRow;
}

function makeReportRow(overrides: Partial<ReportRow> = {}): ReportRow {
  return {
    id: "55555555-5555-5555-5555-555555555555",
    projectId: PROJECT_ID,
    title: "External Attack Surface",
    status: "draft",
    graphSnapshot: {},
    contentRef: null,
    generatedBy: USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

function makeReportExportRow(overrides: Partial<ReportExportRow> = {}): ReportExportRow {
  return {
    id: "66666666-6666-6666-6666-666666666666",
    reportId: "55555555-5555-5555-5555-555555555555",
    format: "pdf",
    blobRef: "sha256/aa/bb/cachedref",
    checksum: "cachedref",
    byteSize: 100,
    generatedBy: USER_ID,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("ReportsService", () => {
  function buildService(overrides: {
    nodes?: Partial<NodesRepository>;
    edges?: Partial<EdgesRepository>;
    reports?: Partial<ReportsRepository>;
    reportExports?: Partial<ReportExportsRepository>;
    blobStorage?: Partial<BlobStorage>;
  } = {}) {
    const nodesRepository = {
      findById: vi.fn().mockResolvedValue(makeNodeRow()),
      ...overrides.nodes,
    } as unknown as NodesRepository;
    const edgesRepository = {
      findById: vi.fn().mockResolvedValue(makeEdgeRow()),
      ...overrides.edges,
    } as unknown as EdgesRepository;
    const reportsRepository = {
      create: vi.fn().mockResolvedValue(makeReportRow()),
      findById: vi.fn().mockResolvedValue(makeReportRow()),
      listByProject: vi.fn().mockResolvedValue({ items: [makeReportRow()], page: 1, pageSize: 20, total: 1 }),
      transitionStatus: vi.fn().mockResolvedValue(makeReportRow({ status: "generating" })),
      ...overrides.reports,
    } as unknown as ReportsRepository;
    const reportExportsRepository = {
      findByReportAndFormat: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue(makeReportExportRow()),
      ...overrides.reportExports,
    } as unknown as ReportExportsRepository;
    const blobStorage = {
      put: vi.fn().mockResolvedValue({ ref: "sha256/aa/bb/newref", hash: "newref", byteSize: 42 }),
      get: vi.fn().mockResolvedValue(Buffer.from("cached-bytes")),
      ...overrides.blobStorage,
    } as unknown as BlobStorage;
    const renderer = new ReportRendererService();

    return new ReportsService(
      reportsRepository,
      nodesRepository,
      edgesRepository,
      reportExportsRepository,
      blobStorage,
      renderer,
    );
  }

  it("assembles a draft report from resolved node/edge ids", async () => {
    const service = buildService();

    const report = await service.createReport(PROJECT_ID, USER_ID, {
      title: "External Attack Surface",
      nodeIds: [NODE_ID],
      edgeIds: [EDGE_ID],
    });

    expect(report.status).toBe("draft");
  });

  it("throws NotFoundError when a node id does not resolve in this project", async () => {
    const service = buildService({ nodes: { findById: vi.fn().mockResolvedValue(null) } });

    await expect(
      service.createReport(PROJECT_ID, USER_ID, { title: "X", nodeIds: [NODE_ID], edgeIds: [] }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when an edge id does not resolve in this project", async () => {
    const service = buildService({ edges: { findById: vi.fn().mockResolvedValue(null) } });

    await expect(
      service.createReport(PROJECT_ID, USER_ID, { title: "X", nodeIds: [], edgeIds: [EDGE_ID] }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when previewing a report id that does not exist", async () => {
    const service = buildService({ reports: { findById: vi.fn().mockResolvedValue(null) } });

    await expect(service.getReport(PROJECT_ID, "does-not-exist")).rejects.toThrow(NotFoundError);
  });

  it("returns a cached export without re-rendering or transitioning status", async () => {
    const findByReportAndFormat = vi.fn().mockResolvedValue(makeReportExportRow());
    const get = vi.fn().mockResolvedValue(Buffer.from("cached-bytes"));
    const transitionStatus = vi.fn();
    const service = buildService({
      reportExports: { findByReportAndFormat },
      blobStorage: { get },
      reports: { transitionStatus },
    });

    const result = await service.exportReport(PROJECT_ID, "55555555-5555-5555-5555-555555555555", USER_ID, "pdf");

    expect(result.buffer.toString()).toBe("cached-bytes");
    expect(get).toHaveBeenCalledWith("sha256/aa/bb/cachedref");
    expect(transitionStatus).not.toHaveBeenCalled();
  });

  it("throws ConflictError when the generating transition is lost to a concurrent export", async () => {
    const service = buildService({
      reports: { transitionStatus: vi.fn().mockResolvedValue(null) },
    });

    await expect(
      service.exportReport(PROJECT_ID, "55555555-5555-5555-5555-555555555555", USER_ID, "pdf"),
    ).rejects.toThrow(ConflictError);
  });

  it("transitions the report to failed and rethrows when rendering fails", async () => {
    const transitionStatus = vi.fn().mockResolvedValue(makeReportRow({ status: "generating" }));
    const service = buildService({
      reports: { transitionStatus },
    });
    vi.spyOn(ReportRendererService.prototype, "render").mockRejectedValueOnce(new Error("render blew up"));

    await expect(
      service.exportReport(PROJECT_ID, "55555555-5555-5555-5555-555555555555", USER_ID, "pdf"),
    ).rejects.toThrow("render blew up");

    expect(transitionStatus).toHaveBeenCalledWith(
      PROJECT_ID,
      "55555555-5555-5555-5555-555555555555",
      expect.objectContaining({ to: "failed" }),
    );
  });
});
