import { describe, expect, it, vi } from "vitest";
import { ReportsService } from "../../../src/modules/reports/reports.service";
import type { NodeRow, NodesRepository } from "../../../src/modules/knowledge/repositories/nodes.repository";
import type { EdgeRow, EdgesRepository } from "../../../src/modules/knowledge/repositories/edges.repository";
import type { ReportRow, ReportsRepository } from "../../../src/modules/knowledge/repositories/reports.repository";
import { NotFoundError } from "../../../src/core/http/domain-error";

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

describe("ReportsService", () => {
  function buildService(overrides: {
    nodes?: Partial<NodesRepository>;
    edges?: Partial<EdgesRepository>;
    reports?: Partial<ReportsRepository>;
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
      ...overrides.reports,
    } as unknown as ReportsRepository;

    return new ReportsService(reportsRepository, nodesRepository, edgesRepository);
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
});
