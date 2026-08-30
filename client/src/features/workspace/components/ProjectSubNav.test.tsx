import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { ProjectSubNav } from "./ProjectSubNav";

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";

describe("ProjectSubNav", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("links to all six project sections", () => {
    vi.mocked(usePathname).mockReturnValue(`/app/projects/${PROJECT_ID}`);
    render(<ProjectSubNav projectId={PROJECT_ID} />);

    expect(screen.getByRole("tab", { name: "Graph" })).toHaveAttribute("href", `/app/projects/${PROJECT_ID}`);
    expect(screen.getByRole("tab", { name: "Runs" })).toHaveAttribute("href", `/app/projects/${PROJECT_ID}/tools`);
    expect(screen.getByRole("tab", { name: "Evidence" })).toHaveAttribute(
      "href",
      `/app/projects/${PROJECT_ID}/evidence`,
    );
    expect(screen.getByRole("tab", { name: "Reports" })).toHaveAttribute(
      "href",
      `/app/projects/${PROJECT_ID}/reports`,
    );
    expect(screen.getByRole("tab", { name: "Timeline" })).toHaveAttribute(
      "href",
      `/app/projects/${PROJECT_ID}/timeline`,
    );
    expect(screen.getByRole("tab", { name: "Settings" })).toHaveAttribute(
      "href",
      `/app/projects/${PROJECT_ID}/settings`,
    );
  });

  it("marks the section matching the current path as selected", () => {
    vi.mocked(usePathname).mockReturnValue(`/app/projects/${PROJECT_ID}/evidence`);
    render(<ProjectSubNav projectId={PROJECT_ID} />);

    expect(screen.getByRole("tab", { name: "Evidence" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Graph" })).toHaveAttribute("aria-selected", "false");
  });
});
