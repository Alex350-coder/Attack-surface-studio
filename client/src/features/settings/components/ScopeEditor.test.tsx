import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { ScopeEditor } from "./ScopeEditor";
import { useProject } from "@/features/workspace/api/use-project";
import type { Project } from "@/features/workspace/api/use-projects";
import { useUpdateProject } from "../api/use-update-project";

vi.mock("@/features/workspace/api/use-project", () => ({ useProject: vi.fn() }));
vi.mock("../api/use-update-project", () => ({ useUpdateProject: vi.fn() }));

type UpdateProjectMutation = ReturnType<typeof useUpdateProject>;

function queryResult(overrides: Partial<UseQueryResult<Project>>): UseQueryResult<Project> {
  return {
    isLoading: false,
    isError: false,
    data: undefined,
    error: null,
    ...overrides,
  } as UseQueryResult<Project>;
}

function mutationResult(overrides: Partial<UpdateProjectMutation>): UpdateProjectMutation {
  return {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    data: undefined,
    ...overrides,
  } as UpdateProjectMutation;
}

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: PROJECT_ID,
    name: "Acme Corp",
    slug: "acme-corp",
    scope: { includes: ["example.com"], excludes: [] },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("ScopeEditor", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows a loading state", () => {
    vi.mocked(useProject).mockReturnValue(queryResult({ isLoading: true }));
    vi.mocked(useUpdateProject).mockReturnValue(mutationResult({}));
    render(<ScopeEditor projectId={PROJECT_ID} />);
    expect(screen.getByText("Loading scope…")).toBeInTheDocument();
  });

  it("shows an error state", () => {
    vi.mocked(useProject).mockReturnValue(queryResult({ isError: true }));
    vi.mocked(useUpdateProject).mockReturnValue(mutationResult({}));
    render(<ScopeEditor projectId={PROJECT_ID} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load the project scope.");
  });

  it("renders existing include entries", () => {
    vi.mocked(useProject).mockReturnValue(queryResult({ data: makeProject() }));
    vi.mocked(useUpdateProject).mockReturnValue(mutationResult({}));
    render(<ScopeEditor projectId={PROJECT_ID} />);
    expect(screen.getByText("example.com")).toBeInTheDocument();
  });

  it("adds a new include entry and saves the updated scope", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    vi.mocked(useProject).mockReturnValue(queryResult({ data: makeProject() }));
    vi.mocked(useUpdateProject).mockReturnValue(mutationResult({ mutate }));

    render(<ScopeEditor projectId={PROJECT_ID} />);

    const [includeInput] = screen.getAllByLabelText("Add entry");
    await user.type(includeInput, "sub.example.com");
    await user.click(screen.getAllByRole("button", { name: "Add" })[0]);

    expect(mutate).toHaveBeenCalledWith({
      scope: { includes: ["example.com", "sub.example.com"], excludes: [] },
    });
  });

  it("removes an existing entry", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    vi.mocked(useProject).mockReturnValue(queryResult({ data: makeProject() }));
    vi.mocked(useUpdateProject).mockReturnValue(mutationResult({ mutate }));

    render(<ScopeEditor projectId={PROJECT_ID} />);

    await user.click(screen.getByRole("button", { name: "Remove example.com" }));

    expect(mutate).toHaveBeenCalledWith({ scope: { includes: [], excludes: [] } });
  });
});
