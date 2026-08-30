import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter, usePathname } from "next/navigation";
import { useBootstrapSession } from "@/features/auth/use-bootstrap-session";
import { useLogout } from "@/features/auth/auth.api";
import { useAuthUser } from "@/features/auth/auth.store";
import { WorkspaceShell } from "./WorkspaceShell";

vi.mock("@/features/auth/use-bootstrap-session", () => ({ useBootstrapSession: vi.fn() }));
vi.mock("@/features/auth/auth.api", () => ({ useLogout: vi.fn() }));
vi.mock("@/features/auth/auth.store", () => ({ useAuthUser: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: vi.fn(), usePathname: vi.fn() }));
vi.mock("./ProjectSwitcher", () => ({ ProjectSwitcher: () => <div data-testid="project-switcher" /> }));

describe("WorkspaceShell", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows a loading state until the session has bootstrapped", () => {
    vi.mocked(useBootstrapSession).mockReturnValue({ isReady: false });
    vi.mocked(useAuthUser).mockReturnValue(null);
    vi.mocked(usePathname).mockReturnValue("/app");
    vi.mocked(useLogout).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    vi.mocked(useRouter).mockReturnValue({ replace: vi.fn() } as never);

    render(<WorkspaceShell>content</WorkspaceShell>);

    expect(screen.getByText("Loading your workspace…")).toBeInTheDocument();
    expect(screen.queryByText("content")).not.toBeInTheDocument();
  });

  it("renders the nav and signs the user out on demand", async () => {
    const mutate = vi.fn((_input, options?: { onSuccess?: () => void }) => options?.onSuccess?.());
    const replace = vi.fn();
    vi.mocked(useBootstrapSession).mockReturnValue({ isReady: true });
    vi.mocked(useAuthUser).mockReturnValue({ id: "u1", email: "a@b.com", displayName: "Ana" });
    vi.mocked(usePathname).mockReturnValue("/app");
    vi.mocked(useLogout).mockReturnValue({ mutate, isPending: false } as never);
    vi.mocked(useRouter).mockReturnValue({ replace } as never);

    render(<WorkspaceShell>content</WorkspaceShell>);
    const user = userEvent.setup();

    expect(screen.getByText("content")).toBeInTheDocument();
    expect(screen.getByText("Ana")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(mutate).toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith("/login");
  });
});
