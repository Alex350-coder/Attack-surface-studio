import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { MembersPanel } from "./MembersPanel";
import { useAddOrAssignMember, useProjectMembers, type ProjectMember } from "../api/use-project-members";

vi.mock("../api/use-project-members", async () => {
  const actual = await vi.importActual<typeof import("../api/use-project-members")>("../api/use-project-members");
  return { ...actual, useProjectMembers: vi.fn(), useAddOrAssignMember: vi.fn() };
});

type AddOrAssignMutation = ReturnType<typeof useAddOrAssignMember>;

function queryResult(overrides: Partial<UseQueryResult<ProjectMember[]>>): UseQueryResult<ProjectMember[]> {
  return {
    isLoading: false,
    isError: false,
    data: undefined,
    error: null,
    ...overrides,
  } as UseQueryResult<ProjectMember[]>;
}

function mutationResult(overrides: Partial<AddOrAssignMutation>): AddOrAssignMutation {
  return {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    data: undefined,
    ...overrides,
  } as AddOrAssignMutation;
}

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";

function makeMember(overrides: Partial<ProjectMember> = {}): ProjectMember {
  return {
    id: "22222222-2222-2222-2222-222222222222",
    projectId: PROJECT_ID,
    userId: "33333333-3333-3333-3333-333333333333",
    role: "admin",
    createdAt: new Date(),
    ...overrides,
  };
}

describe("MembersPanel", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows a loading state", () => {
    vi.mocked(useProjectMembers).mockReturnValue(queryResult({ isLoading: true }));
    vi.mocked(useAddOrAssignMember).mockReturnValue(mutationResult({}));
    render(<MembersPanel projectId={PROJECT_ID} />);
    expect(screen.getByText("Loading members…")).toBeInTheDocument();
  });

  it("shows an error state", () => {
    vi.mocked(useProjectMembers).mockReturnValue(queryResult({ isError: true, error: new Error("boom") }));
    vi.mocked(useAddOrAssignMember).mockReturnValue(mutationResult({}));
    render(<MembersPanel projectId={PROJECT_ID} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load members.");
  });

  it("shows an empty state", () => {
    vi.mocked(useProjectMembers).mockReturnValue(queryResult({ data: [] }));
    vi.mocked(useAddOrAssignMember).mockReturnValue(mutationResult({}));
    render(<MembersPanel projectId={PROJECT_ID} />);
    expect(screen.getByText("No members yet.")).toBeInTheDocument();
  });

  it("lists members with their role badge", () => {
    vi.mocked(useProjectMembers).mockReturnValue(queryResult({ data: [makeMember()] }));
    vi.mocked(useAddOrAssignMember).mockReturnValue(mutationResult({}));
    render(<MembersPanel projectId={PROJECT_ID} />);
    expect(screen.getByText("admin")).toBeInTheDocument();
  });

  it("opens the add/reassign dialog and submits an email + role", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    vi.mocked(useProjectMembers).mockReturnValue(queryResult({ data: [] }));
    vi.mocked(useAddOrAssignMember).mockReturnValue(mutationResult({ mutate }));

    render(<MembersPanel projectId={PROJECT_ID} />);

    await user.click(screen.getByRole("button", { name: "Add or reassign member" }));
    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mutate).toHaveBeenCalledWith(
      { email: "new@example.com", role: "member" },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
