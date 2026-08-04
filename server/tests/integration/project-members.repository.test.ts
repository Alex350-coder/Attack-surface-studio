import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetDatabase, startTestDatabase, stopTestDatabase, type TestDatabase } from "./setup";
import { DrizzleProjectsRepository } from "../../src/modules/projects/repositories/projects.repository";
import { DrizzleUsersRepository } from "../../src/modules/users/repositories/users.repository";
import { DrizzleProjectMembersRepository } from "../../src/modules/projects/repositories/project-members.repository";

describe("ProjectMembersRepository", () => {
  let db: TestDatabase;
  let repo: DrizzleProjectMembersRepository;
  let projectsRepo: DrizzleProjectsRepository;
  let usersRepo: DrizzleUsersRepository;

  beforeAll(async () => {
    db = await startTestDatabase();
    repo = new DrizzleProjectMembersRepository(db);
    projectsRepo = new DrizzleProjectsRepository(db);
    usersRepo = new DrizzleUsersRepository(db);
  }, 120_000);

  afterAll(async () => {
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await resetDatabase(db);
  });

  async function createFixtures() {
    const project = await projectsRepo.create({ name: "Recon", slug: "recon" });
    const user = await usersRepo.create({ email: "owner@example.com", passwordHash: "hash" });
    return { project, user };
  }

  it("adds a member and finds it by project and user", async () => {
    const { project, user } = await createFixtures();

    const created = await repo.addMember({ projectId: project.id, userId: user.id, role: "owner" });

    expect(created.role).toBe("owner");
    expect(await repo.findByProjectAndUser(project.id, user.id)).toMatchObject({ id: created.id });
  });

  it("lists members for a project, paginated", async () => {
    const { project, user } = await createFixtures();
    await repo.addMember({ projectId: project.id, userId: user.id, role: "owner" });

    const page = await repo.listByProject(project.id);

    expect(page.items).toHaveLength(1);
    expect(page.total).toBe(1);
  });

  it("updates a member's role", async () => {
    const { project, user } = await createFixtures();
    await repo.addMember({ projectId: project.id, userId: user.id, role: "member" });

    const updated = await repo.updateRole(project.id, user.id, "admin");

    expect(updated?.role).toBe("admin");
  });

  it("removes a member", async () => {
    const { project, user } = await createFixtures();
    await repo.addMember({ projectId: project.id, userId: user.id, role: "viewer" });

    await repo.removeMember(project.id, user.id);

    expect(await repo.findByProjectAndUser(project.id, user.id)).toBeNull();
  });

  it("rejects a role outside the allowed set at the database level", async () => {
    const { project, user } = await createFixtures();

    // @ts-expect-error intentionally invalid to prove the CHECK constraint (project_members_role_check) runs
    await expect(repo.addMember({ projectId: project.id, userId: user.id, role: "superadmin" })).rejects.toThrow();
  });
});
