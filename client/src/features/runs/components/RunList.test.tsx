import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RunList } from "./RunList";
import { useCancelRun, useRuns } from "../api/use-runs";

vi.mock("../api/use-runs", async () => {
  const actual = await vi.importActual<typeof import("../api/use-runs")>("../api/use-runs");
  return { ...actual, useRuns: vi.fn(), useCancelRun: vi.fn() };
});

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const RUN = {
  id: "22222222-2222-2222-2222-222222222222",
  adapterId: "nmap",
  target: "example.com",
  executionMode: "local",
  status: "running" as const,
};

describe("RunList", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows a loading state", () => {
    vi.mocked(useRuns).mockReturnValue({ isLoading: true, isError: false, data: undefined } as never);
    vi.mocked(useCancelRun).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);

    render(<RunList projectId={PROJECT_ID} />);

    expect(screen.getByText("Loading runs…")).toBeInTheDocument();
  });

  it("shows an error state", () => {
    vi.mocked(useRuns).mockReturnValue({ isLoading: false, isError: true, data: undefined } as never);
    vi.mocked(useCancelRun).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);

    render(<RunList projectId={PROJECT_ID} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load runs.");
  });

  it("shows an empty state", () => {
    vi.mocked(useRuns).mockReturnValue({ isLoading: false, isError: false, data: [] } as never);
    vi.mocked(useCancelRun).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);

    render(<RunList projectId={PROJECT_ID} />);

    expect(screen.getByText("No runs yet. Start one above.")).toBeInTheDocument();
  });

  it("renders a non-terminal run with a cancel action", async () => {
    const mutate = vi.fn();
    vi.mocked(useRuns).mockReturnValue({ isLoading: false, isError: false, data: [RUN] } as never);
    vi.mocked(useCancelRun).mockReturnValue({ mutate, isPending: false } as never);

    render(<RunList projectId={PROJECT_ID} />);
    const user = userEvent.setup();

    expect(screen.getByText("running")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mutate).toHaveBeenCalledWith(RUN.id);
  });

  it("hides the cancel action for terminal runs", () => {
    vi.mocked(useRuns).mockReturnValue({
      isLoading: false,
      isError: false,
      data: [{ ...RUN, status: "succeeded" }],
    } as never);
    vi.mocked(useCancelRun).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);

    render(<RunList projectId={PROJECT_ID} />);

    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });
});
