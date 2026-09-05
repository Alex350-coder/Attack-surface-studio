import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetDatabase, startTestDatabase, stopTestDatabase, type TestDatabase } from "./setup";
import { DrizzleUsersRepository } from "../../src/modules/users/repositories/users.repository";

describe("UsersRepository", () => {
  let db: TestDatabase;
  let repo: DrizzleUsersRepository;

  beforeAll(async () => {
    db = await startTestDatabase();
    repo = new DrizzleUsersRepository(db);
  }, 120_000);

  afterAll(async () => {
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await resetDatabase(db);
  });

  it("creates a user and finds it by id and email", async () => {
    const created = await repo.create({ email: "a@example.com", passwordHash: "hash" });

    expect(await repo.findById(created.id)).toMatchObject({ email: "a@example.com" });
    expect(await repo.findByEmail("a@example.com")).toMatchObject({ id: created.id });
  });

  it("treats email as case-insensitive for lookup and uniqueness (citext)", async () => {
    const created = await repo.create({ email: "Mixed.Case@Example.com", passwordHash: "hash" });

    expect(await repo.findByEmail("mixed.case@example.com")).toMatchObject({ id: created.id });
    await expect(repo.create({ email: "MIXED.CASE@EXAMPLE.COM", passwordHash: "hash2" })).rejects.toThrow();
  });

  it("excludes soft-deleted users from lookups", async () => {
    const created = await repo.create({ email: "b@example.com", passwordHash: "hash" });
    await repo.softDelete(created.id);

    expect(await repo.findById(created.id)).toBeNull();
    expect(await repo.findByEmail("b@example.com")).toBeNull();
  });

  it("caps list page size at the shared maximum", async () => {
    for (let i = 0; i < 5; i += 1) {
      await repo.create({ email: `user${i}@example.com`, passwordHash: "hash" });
    }

    const page = await repo.list({ page: 1, pageSize: 1000 });
    expect(page.pageSize).toBe(100);
    expect(page.total).toBe(5);
  });
});
