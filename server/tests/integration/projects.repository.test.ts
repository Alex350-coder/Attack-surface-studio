import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetDatabase, startTestDatabase, stopTestDatabase, type TestDatabase } from "./setup";
import { DrizzleProjectsRepository } from "../../src/modules/projects/repositories/projects.repository";

describe("ProjectsRepository", () => {
  let db: TestDatabase;
  let repo: DrizzleProjectsRepository;

  beforeAll(async () => {
    db = await startTestDatabase();
    repo = new DrizzleProjectsRepository(db);
  }, 120_000);

  afterAll(async () => {
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await resetDatabase(db);
  });

  it("creates a project with a default empty scope", async () => {
    const created = await repo.create({ name: "Recon Engagement", slug: "recon-engagement" });

    expect(created.scope).toEqual({ includes: [], excludes: [] });
    expect(await repo.findBySlug("recon-engagement")).toMatchObject({ id: created.id });
  });

  it("rejects a malformed scope shape", async () => {
    await expect(
      repo.create({
        name: "Bad scope",
        slug: "bad-scope",
        // @ts-expect-error intentionally malformed to prove Zod validation runs
        scope: { includes: "not-an-array" },
      }),
    ).rejects.toThrow();
  });

  it("updates scope after validating it", async () => {
    const created = await repo.create({ name: "Scoped", slug: "scoped" });
    const updated = await repo.updateScope(created.id, {
      includes: ["example.com"],
      excludes: ["staging.example.com"],
    });

    expect(updated?.scope).toEqual({ includes: ["example.com"], excludes: ["staging.example.com"] });
  });

  it("excludes soft-deleted projects from lookups", async () => {
    const created = await repo.create({ name: "Gone", slug: "gone" });
    await repo.softDelete(created.id);

    expect(await repo.findById(created.id)).toBeNull();
  });
});
