import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetDatabase, startTestDatabase, stopTestDatabase, type TestDatabase } from "./setup";
import { DrizzleNotesRepository } from "../../src/modules/knowledge/repositories/notes.repository";
import { DrizzleProjectsRepository } from "../../src/modules/projects/repositories/projects.repository";

describe("NotesRepository", () => {
  let db: TestDatabase;
  let repo: DrizzleNotesRepository;
  let projects: DrizzleProjectsRepository;
  let projectId: string;
  let otherProjectId: string;

  beforeAll(async () => {
    db = await startTestDatabase();
    repo = new DrizzleNotesRepository(db);
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

  it("creates and updates a note's body", async () => {
    const note = await repo.create(projectId, { body: "initial finding" });
    const updated = await repo.update(projectId, note.id, "revised finding");

    expect(updated?.body).toBe("revised finding");
  });

  it("scopes reads to the given project (negative test)", async () => {
    const note = await repo.create(projectId, { body: "secret" });

    expect(await repo.findById(otherProjectId, note.id)).toBeNull();
  });

  it("excludes soft-deleted notes from listings", async () => {
    const note = await repo.create(projectId, { body: "temp" });
    await repo.softDelete(projectId, note.id);

    expect((await repo.listByProject(projectId)).total).toBe(0);
  });
});
