import { beforeEach, describe, expect, it, vi, type Mocked } from "vitest";
import { ProjectsService } from "../../../src/modules/projects/projects.service";
import { ConflictError, ForbiddenError, NotFoundError } from "../../../src/core/http/domain-error";
import type { ProjectsRepository, ProjectRow } from "../../../src/modules/projects/repositories/projects.repository";
import type {
  ProjectMemberRow,
  ProjectMembersRepository,
} from "../../../src/modules/projects/repositories/project-members.repository";
import type { UserRow, UsersRepository } from "../../../src/modules/users/repositories/users.repository";
import type { EdgeRow, EdgesRepository } from "../../../src/modules/knowledge/repositories/edges.repository";
import type { NodeRow, NodesRepository } from "../../../src/modules/knowledge/repositories/nodes.repository";

const OWNER_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_USER_ID = "22222222-2222-2222-2222-222222222222";
const PROJECT_ID = "33333333-3333-3333-3333-333333333333";

function makeProject(overrides: Partial<ProjectRow> = {}): ProjectRow {
  return {
    id: PROJECT_ID,
    name: "Test Project",
    slug: "test-project",
    scope: { includes: [], excludes: [] },
    createdBy: OWNER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

function makeMembership(overrides: Partial<ProjectMemberRow> = {}): ProjectMemberRow {
  return {
    id: "member-1",
    projectId: PROJECT_ID,
    userId: OWNER_ID,
    role: "owner",
    createdAt: new Date(),
    ...overrides,
  };
}

function makeUser(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: OTHER_USER_ID,
    email: "member@example.com",
    passwordHash: "",
    displayName: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

describe("ProjectsService", () => {
  let projectsRepository: Mocked<ProjectsRepository>;
  let projectMembersRepository: Mocked<ProjectMembersRepository>;
  let usersRepository: Mocked<UsersRepository>;
  let nodesRepository: Mocked<NodesRepository>;
  let edgesRepository: Mocked<EdgesRepository>;
  let service: ProjectsService;

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
    projectMembersRepository = {
      addMember: vi.fn(),
      findByProjectAndUser: vi.fn(),
      listByProject: vi.fn(),
      updateRole: vi.fn(),
      removeMember: vi.fn(),
    };
    usersRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByEmail: vi.fn(),
      list: vi.fn(),
      softDelete: vi.fn(),
    };
    nodesRepository = {
      upsertMany: vi.fn(),
      findById: vi.fn(),
      findByIdentityKey: vi.fn(),
      listByProject: vi.fn(),
      softDelete: vi.fn(),
    };
    edgesRepository = {
      upsertMany: vi.fn(),
      findById: vi.fn(),
      listByProject: vi.fn(),
      softDelete: vi.fn(),
    };

    service = new ProjectsService(
      projectsRepository,
      projectMembersRepository,
      usersRepository,
      nodesRepository,
      edgesRepository,
    );
  });

  describe("createProject", () => {
    it("rejects a duplicate slug before hitting createWithOwner", async () => {
      projectsRepository.findBySlug.mockResolvedValue(makeProject());

      await expect(
        service.createProject(OWNER_ID, { name: "Test Project", slug: "test-project" }),
      ).rejects.toBeInstanceOf(ConflictError);
      expect(projectsRepository.createWithOwner).not.toHaveBeenCalled();
    });

    it("creates the project with the acting user as owner", async () => {
      projectsRepository.findBySlug.mockResolvedValue(null);
      projectsRepository.createWithOwner.mockResolvedValue(makeProject());

      const result = await service.createProject(OWNER_ID, { name: "Test Project", slug: "test-project" });

      expect(projectsRepository.createWithOwner).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Test Project", slug: "test-project", createdBy: OWNER_ID }),
      );
      expect(result.id).toBe(PROJECT_ID);
    });
  });

  describe("getProjectDetail", () => {
    it("throws NotFoundError when the project does not exist", async () => {
      projectsRepository.findById.mockResolvedValue(null);

      await expect(service.getProjectDetail(PROJECT_ID)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("addOrAssignMember", () => {
    it("rejects when the acting user is not a project member", async () => {
      projectMembersRepository.findByProjectAndUser.mockResolvedValue(null);

      await expect(
        service.addOrAssignMember(OWNER_ID, PROJECT_ID, { email: "member@example.com", role: "member" }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("rejects self-escalation attempts", async () => {
      projectMembersRepository.findByProjectAndUser.mockResolvedValue(makeMembership({ userId: OWNER_ID }));
      usersRepository.findByEmail.mockResolvedValue(makeUser({ id: OWNER_ID, email: "owner@example.com" }));

      await expect(
        service.addOrAssignMember(OWNER_ID, PROJECT_ID, { email: "owner@example.com", role: "admin" }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("rejects a non-owner assigning the owner role", async () => {
      projectMembersRepository.findByProjectAndUser.mockImplementation(async (_projectId, userId) =>
        userId === OWNER_ID ? makeMembership({ userId: OWNER_ID, role: "admin" }) : null,
      );
      usersRepository.findByEmail.mockResolvedValue(makeUser());

      await expect(
        service.addOrAssignMember(OWNER_ID, PROJECT_ID, { email: "member@example.com", role: "owner" }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("adds a new member when the assignment is permitted", async () => {
      projectMembersRepository.findByProjectAndUser.mockImplementation(async (_projectId, userId) =>
        userId === OWNER_ID ? makeMembership({ userId: OWNER_ID, role: "owner" }) : null,
      );
      usersRepository.findByEmail.mockResolvedValue(makeUser());
      projectMembersRepository.addMember.mockResolvedValue(
        makeMembership({ id: "member-2", userId: OTHER_USER_ID, role: "member" }),
      );

      const result = await service.addOrAssignMember(OWNER_ID, PROJECT_ID, {
        email: "member@example.com",
        role: "member",
      });

      expect(projectMembersRepository.addMember).toHaveBeenCalledWith({
        projectId: PROJECT_ID,
        userId: OTHER_USER_ID,
        role: "member",
      });
      expect(result.userId).toBe(OTHER_USER_ID);
    });
  });

  describe("getGraph", () => {
    it("returns only normalized node/edge contract objects", async () => {
      const nodeId = "44444444-4444-4444-4444-444444444444";
      const otherNodeId = "55555555-5555-5555-5555-555555555555";
      const edgeId = "66666666-6666-6666-6666-666666666666";
      const node: NodeRow = {
        id: nodeId,
        projectId: PROJECT_ID,
        identityKey: "host:example.com",
        type: "host",
        category: "infrastructure",
        label: "example.com",
        severity: null,
        data: {},
        sourceRunId: null,
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSeenAt: new Date(),
        deletedAt: null,
      } as NodeRow;
      const edge: EdgeRow = {
        id: edgeId,
        projectId: PROJECT_ID,
        sourceId: nodeId,
        targetId: otherNodeId,
        type: "relationship",
        animated: false,
        label: null,
        data: {},
        sourceRunId: null,
        createdAt: new Date(),
        deletedAt: null,
      };

      projectsRepository.findById.mockResolvedValue(makeProject());
      nodesRepository.listByProject.mockResolvedValue({ items: [node], page: 1, pageSize: 25, total: 1 });
      edgesRepository.listByProject.mockResolvedValue({ items: [edge], page: 1, pageSize: 25, total: 1 });

      const result = await service.getGraph(PROJECT_ID);

      expect(result.nodes.items).toEqual([expect.objectContaining({ id: nodeId, type: "host" })]);
      expect(result.edges.items).toEqual([expect.objectContaining({ id: edgeId, type: "relationship" })]);
    });
  });
});
