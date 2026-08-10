import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetDatabase, startTestDatabase, stopTestDatabase, type TestDatabase } from "./setup";
import { DrizzleProjectsRepository } from "../../src/modules/projects/repositories/projects.repository";
import { DrizzleUsersRepository } from "../../src/modules/users/repositories/users.repository";
import { DrizzleProjectMembersRepository } from "../../src/modules/projects/repositories/project-members.repository";

describe("ProjectsRepository", () => {
  let db: TestDatabase;
  let repo: DrizzleProjectsRepository;
  let usersRepo: DrizzleUsersRepository;
  let membersRepo: DrizzleProjectMembersRepository;

  beforeAll(async () => {
    db = await startTestDatabase();
    repo = new DrizzleProjectsRepository(db);
    usersRepo = new DrizzleUsersRepository(db);
    membersRepo = new DrizzleProjectMembersRepository(db);
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

  it("createWithOwner creates the project and its owner membership atomically", async () => {
    const user = await usersRepo.create({ email: "owner@example.com", passwordHash: "hash" });

    const created = await repo.createWithOwner({ name: "Atomic", slug: "atomic", createdBy: user.id });

    expect(created.createdBy).toBe(user.id);
    const membership = await membersRepo.findByProjectAndUser(created.id, user.id);
    expect(membership?.role).toBe("owner");
  });

  it("listForUser only returns projects the given user is a member of", async () => {
    const userA = await usersRepo.create({ email: "a-list@example.com", passwordHash: "hash" });
    const userB = await usersRepo.create({ email: "b-list@example.com", passwordHash: "hash" });
    const projectA = await repo.createWithOwner({ name: "A's project", slug: "as-project", createdBy: userA.id });
    await repo.createWithOwner({ name: "B's project", slug: "bs-project", createdBy: userB.id });

    const result = await repo.listForUser(userA.id);

    expect(result.items.map((item) => item.id)).toEqual([projectA.id]);
    expect(result.total).toBe(1);
  });
});
