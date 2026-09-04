import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetDatabase, startTestDatabase, stopTestDatabase, type TestDatabase } from "./setup";
import { DrizzleReportExportsRepository } from "../../src/modules/knowledge/repositories/report-exports.repository";
import { DrizzleReportsRepository } from "../../src/modules/knowledge/repositories/reports.repository";
import { DrizzleProjectsRepository } from "../../src/modules/projects/repositories/projects.repository";

describe("ReportExportsRepository", () => {
  let db: TestDatabase;
  let repo: DrizzleReportExportsRepository;
  let reportsRepo: DrizzleReportsRepository;
  let projects: DrizzleProjectsRepository;
  let projectId: string;
  let otherProjectId: string;
  let reportId: string;

  beforeAll(async () => {
    db = await startTestDatabase();
    repo = new DrizzleReportExportsRepository(db);
    reportsRepo = new DrizzleReportsRepository(db);
    projects = new DrizzleProjectsRepository(db);
  }, 120_000);

  afterAll(async () => {
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await resetDatabase(db);
    projectId = (await projects.create({ name: "P1", slug: "p1" })).id;
    otherProjectId = (await projects.create({ name: "P2", slug: "p2" })).id;
    reportId = (await reportsRepo.create(projectId, { title: "External Attack Surface" })).id;
  });

  it("upserts an export artifact for a report/format pair", async () => {
    const created = await repo.upsert({
      reportId,
      format: "pdf",
      blobRef: "sha256/aa/bb/deadbeef",
      checksum: "deadbeef",
      byteSize: 1024,
      generatedBy: null,
    });

    expect(created).toMatchObject({ reportId, format: "pdf", blobRef: "sha256/aa/bb/deadbeef" });
  });

  it("replaces the existing artifact on repeat upsert for the same format (regenerate)", async () => {
    await repo.upsert({
      reportId,
      format: "pdf",
      blobRef: "sha256/aa/bb/first",
      checksum: "first",
      byteSize: 100,
      generatedBy: null,
    });
    const regenerated = await repo.upsert({
      reportId,
      format: "pdf",
      blobRef: "sha256/cc/dd/second",
      checksum: "second",
      byteSize: 200,
      generatedBy: null,
    });

    const found = await repo.findByReportAndFormat(projectId, reportId, "pdf");
    expect(found).toMatchObject({ id: regenerated.id, blobRef: "sha256/cc/dd/second" });
  });

  it("keeps distinct artifacts per format for the same report", async () => {
    await repo.upsert({
      reportId,
      format: "pdf",
      blobRef: "sha256/aa/bb/pdf",
      checksum: "pdf",
      byteSize: 100,
      generatedBy: null,
    });
    await repo.upsert({
      reportId,
      format: "html",
      blobRef: "sha256/aa/bb/html",
      checksum: "html",
      byteSize: 50,
      generatedBy: null,
    });

    expect(await repo.findByReportAndFormat(projectId, reportId, "pdf")).toMatchObject({ format: "pdf" });
    expect(await repo.findByReportAndFormat(projectId, reportId, "html")).toMatchObject({ format: "html" });
  });

  it("scopes reads to the given project (negative test)", async () => {
    await repo.upsert({
      reportId,
      format: "pdf",
      blobRef: "sha256/aa/bb/deadbeef",
      checksum: "deadbeef",
      byteSize: 1024,
      generatedBy: null,
    });

    expect(await repo.findByReportAndFormat(otherProjectId, reportId, "pdf")).toBeNull();
  });
});
