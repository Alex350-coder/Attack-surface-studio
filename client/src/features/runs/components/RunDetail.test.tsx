import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RunDetail } from "./RunDetail";
import { useRun } from "../api/use-run";
import { useCurrentRole } from "@/features/workspace/api/use-current-role";
import { apiRequestBlob } from "@/lib/api-client";

vi.mock("../api/use-run", () => ({ useRun: vi.fn() }));
vi.mock("@/features/workspace/api/use-current-role", () => ({ useCurrentRole: vi.fn() }));
vi.mock("@/lib/api-client", () => ({ apiRequestBlob: vi.fn() }));

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const RUN_ID = "22222222-2222-2222-2222-222222222222";
const RUN = {
  id: RUN_ID,
  adapterId: "nmap",
  target: "example.com",
  executionMode: "local",
  status: "succeeded" as const,
  queuedAt: new Date("2026-01-01T00:00:00Z"),
};

describe("RunDetail", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows a loading state", () => {
    vi.mocked(useRun).mockReturnValue({ isLoading: true, isError: false, data: undefined } as never);
    vi.mocked(useCurrentRole).mockReturnValue({ role: null, isLoading: false, isError: false });

    render(<RunDetail projectId={PROJECT_ID} runId={RUN_ID} />);

    expect(screen.getByText("Loading run…")).toBeInTheDocument();
  });

  it("shows an error state", () => {
    vi.mocked(useRun).mockReturnValue({ isLoading: false, isError: true, data: undefined } as never);
    vi.mocked(useCurrentRole).mockReturnValue({ role: null, isLoading: false, isError: false });

    render(<RunDetail projectId={PROJECT_ID} runId={RUN_ID} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load this run.");
  });

  it("hides the raw-output action for a member role", () => {
    vi.mocked(useRun).mockReturnValue({ isLoading: false, isError: false, data: RUN } as never);
    vi.mocked(useCurrentRole).mockReturnValue({ role: "member", isLoading: false, isError: false });

    render(<RunDetail projectId={PROJECT_ID} runId={RUN_ID} />);

    expect(screen.queryByRole("button", { name: "View raw output" })).not.toBeInTheDocument();
  });

  it("fetches and opens the raw output as a blob URL for an owner", async () => {
    vi.mocked(useRun).mockReturnValue({ isLoading: false, isError: false, data: RUN } as never);
    vi.mocked(useCurrentRole).mockReturnValue({ role: "owner", isLoading: false, isError: false });
    vi.mocked(apiRequestBlob).mockResolvedValue(new Blob(["raw output"]));
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    URL.revokeObjectURL = vi.fn();

    render(<RunDetail projectId={PROJECT_ID} runId={RUN_ID} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "View raw output" }));

    expect(apiRequestBlob).toHaveBeenCalledWith(`/projects/${PROJECT_ID}/runs/${RUN_ID}/raw`);
    expect(openSpy).toHaveBeenCalledWith("blob:mock-url", "_blank", "noopener,noreferrer");
  });
});
