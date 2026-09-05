import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetDatabase, startTestDatabase, stopTestDatabase, type TestDatabase } from "./setup";
import { DrizzleReportsRepository } from "../../src/modules/knowledge/repositories/reports.repository";
import { DrizzleProjectsRepository } from "../../src/modules/projects/repositories/projects.repository";

describe("ReportsRepository", () => {
  let db: TestDatabase;
  let repo: DrizzleReportsRepository;
  let projects: DrizzleProjectsRepository;
  let projectId: string;
  let otherProjectId: string;

  beforeAll(async () => {
    db = await startTestDatabase();
    repo = new DrizzleReportsRepository(db);
    projects = new DrizzleProjectsRepository(db);
  }, 120_000);

  afterAll(async () => {
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await resetDatabase(db);
    projectId = (await projects.create({ name: "P1", slug: "p1" })).id;
    otherProjectId = (await projects.create({ name: "P2", slug: "p2" })).id;
  });

  it("creates a report defaulting to draft status", async () => {
    const report = await repo.create(projectId, { title: "External Attack Surface" });
    expect(report.status).toBe("draft");
  });

  it("updates report status and content ref", async () => {
    const report = await repo.create(projectId, { title: "External Attack Surface" });
    const updated = await repo.updateStatus(projectId, report.id, {
      status: "ready",
      contentRef: "s3://bucket/report.pdf",
    });

    expect(updated).toMatchObject({ status: "ready", contentRef: "s3://bucket/report.pdf" });
  });

  it("scopes reads to the given project (negative test)", async () => {
    const report = await repo.create(projectId, { title: "External Attack Surface" });

    expect(await repo.findById(otherProjectId, report.id)).toBeNull();
  });

  it("transitions status atomically when the current status matches", async () => {
    const report = await repo.create(projectId, { title: "External Attack Surface" });

    const transitioned = await repo.transitionStatus(projectId, report.id, {
      from: ["draft"],
      to: "generating",
    });

    expect(transitioned).toMatchObject({ status: "generating" });
  });

  it("returns null and does not change status when the current status does not match", async () => {
    const report = await repo.create(projectId, { title: "External Attack Surface" });

    const result = await repo.transitionStatus(projectId, report.id, {
      from: ["generating"],
      to: "ready",
    });

    expect(result).toBeNull();
    expect(await repo.findById(projectId, report.id)).toMatchObject({ status: "draft" });
  });

  it("does not transition a report belonging to another project", async () => {
    const report = await repo.create(projectId, { title: "External Attack Surface" });

    const result = await repo.transitionStatus(otherProjectId, report.id, {
      from: ["draft"],
      to: "generating",
    });

    expect(result).toBeNull();
  });
});
