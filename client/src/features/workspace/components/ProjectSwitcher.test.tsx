import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { useProjects } from "../api/use-projects";
import { ProjectSwitcher } from "./ProjectSwitcher";

vi.mock("../api/use-projects", () => ({ useProjects: vi.fn() }));

describe("ProjectSwitcher", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows a placeholder when no project is active", () => {
    vi.mocked(useProjects).mockReturnValue({ data: undefined } as never);

    render(<ProjectSwitcher activeProjectId={null} />);

    expect(screen.getByRole("button", { name: "Select a project" })).toBeInTheDocument();
  });

  it("shows the active project's name and links to every project", () => {
    const projects = [
      { id: "11111111-1111-1111-1111-111111111111", name: "Acme Corp", slug: "acme-corp" },
      { id: "22222222-2222-2222-2222-222222222222", name: "Globex", slug: "globex" },
    ];
    vi.mocked(useProjects).mockReturnValue({ data: projects } as never);

    render(<ProjectSwitcher activeProjectId="11111111-1111-1111-1111-111111111111" />);

    expect(screen.getByRole("button", { name: "Acme Corp" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Globex" })).toHaveAttribute(
      "href",
      "/app/projects/22222222-2222-2222-2222-222222222222",
    );
  });
});
