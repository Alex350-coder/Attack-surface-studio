import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UseQueryResult } from "@tanstack/react-query";
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

    expect(mutate.mock.calls[0][0]).toEqual({
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

    expect(mutate.mock.calls[0][0]).toEqual({ scope: { includes: [], excludes: [] } });
  });

  it("rejects a duplicate entry instead of adding it a second time (BUG #11)", async () => {
    // Before this fix, adding a value already in the list succeeded silently: two `<li
    // key={entry}>`s ended up sharing one React key (a real console error), and clicking
    // "Remove" on either duplicate tag deleted BOTH at once, because `removeEntry` filters by
    // value, not by the specific instance clicked -- a destructive bug in a list that gates what
    // the Orchestrator will scan.
    const user = userEvent.setup();
    const mutate = vi.fn();
    vi.mocked(useProject).mockReturnValue(queryResult({ data: makeProject() }));
    vi.mocked(useUpdateProject).mockReturnValue(mutationResult({ mutate }));

    render(<ScopeEditor projectId={PROJECT_ID} />);

    const [includeInput] = screen.getAllByLabelText("Add entry");
    await user.type(includeInput, "example.com");
    await user.click(screen.getAllByRole("button", { name: "Add" })[0]);

    expect(mutate).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("This entry is already in the list.");
    expect(screen.getAllByText("example.com")).toHaveLength(1);
  });

  it("rolls back an optimistic add when the server rejects it (BUG #8)", async () => {
    // The server independently re-validates each scope entry's format (FE-006) and can reject
    // an entry the lenient client-side check let through. Before this fix, the rejected entry
    // stayed visible in the "In scope" list as if it were saved -- misleading for a value that
    // gates what the Orchestrator will let a tool run touch.
    const user = userEvent.setup();
    const mutate: UpdateProjectMutation["mutate"] = vi.fn((_input, options) => {
      options?.onError?.(new Error("Invalid request payload"), _input, undefined, {} as never);
    });
    vi.mocked(useProject).mockReturnValue(queryResult({ data: makeProject() }));
    vi.mocked(useUpdateProject).mockReturnValue(mutationResult({ mutate }));

    render(<ScopeEditor projectId={PROJECT_ID} />);

    const [includeInput] = screen.getAllByLabelText("Add entry");
    await user.type(includeInput, "<script>alert(1)</script>");
    await user.click(screen.getAllByRole("button", { name: "Add" })[0]);

    expect(screen.queryByText("<script>alert(1)</script>")).not.toBeInTheDocument();
    expect(screen.getByText("example.com")).toBeInTheDocument();
  });
});
