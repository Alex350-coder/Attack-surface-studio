import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { useCreateProject } from "../api/use-projects";
import { CreateProjectDialog } from "./CreateProjectDialog";

vi.mock("next/navigation", () => ({ useRouter: vi.fn() }));
vi.mock("../api/use-projects", () => ({ useCreateProject: vi.fn() }));

describe("CreateProjectDialog", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("auto-derives the slug from the name until the slug is edited directly", async () => {
    vi.mocked(useCreateProject).mockReturnValue({ mutate: vi.fn(), isPending: false, isError: false } as never);
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as never);

    render(<CreateProjectDialog onClose={vi.fn()} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Name"), "My Project");

    expect(screen.getByLabelText("Slug")).toHaveValue("my-project");
  });

  it("shows a validation error and never mutates when the name is blank", async () => {
    const mutate = vi.fn();
    vi.mocked(useCreateProject).mockReturnValue({ mutate, isPending: false, isError: false } as never);
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as never);

    render(<CreateProjectDialog onClose={vi.fn()} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Create project" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Name is required.");
    expect(mutate).not.toHaveBeenCalled();
  });

  it("closes and navigates to the new project on success", async () => {
    const push = vi.fn();
    const onClose = vi.fn();
    const mutate = vi.fn((_input, options?: { onSuccess?: (project: { id: string }) => void }) =>
      options?.onSuccess?.({ id: "11111111-1111-1111-1111-111111111111" }),
    );
    vi.mocked(useCreateProject).mockReturnValue({ mutate, isPending: false, isError: false } as never);
    vi.mocked(useRouter).mockReturnValue({ push } as never);

    render(<CreateProjectDialog onClose={onClose} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Name"), "Acme Corp");
    await user.click(screen.getByRole("button", { name: "Create project" }));

    expect(onClose).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/app/projects/11111111-1111-1111-1111-111111111111");
  });
});
