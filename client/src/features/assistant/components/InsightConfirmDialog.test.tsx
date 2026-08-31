import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InsightConfirmDialog } from "./InsightConfirmDialog";
import { useConfirmInsight } from "../api/use-confirm-insight";

type ConfirmInsightMutation = ReturnType<typeof useConfirmInsight>;

vi.mock("../api/use-confirm-insight", () => ({ useConfirmInsight: vi.fn() }));

function mutationResult(overrides: Partial<ConfirmInsightMutation>): ConfirmInsightMutation {
  return {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    data: undefined,
    ...overrides,
  } as ConfirmInsightMutation;
}

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";

describe("InsightConfirmDialog", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows the content and node count that will be written, and confirms on click", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    vi.mocked(useConfirmInsight).mockReturnValue(mutationResult({ mutate }));
    const onClose = vi.fn();
    const onConfirmed = vi.fn();

    render(
      <InsightConfirmDialog
        projectId={PROJECT_ID}
        content="example.com has not been scanned recently"
        relatedNodeIds={["node-1", "node-2"]}
        onClose={onClose}
        onConfirmed={onConfirmed}
      />,
    );

    expect(screen.getByText("example.com has not been scanned recently")).toBeInTheDocument();
    expect(screen.getByText("Will link to 2 nodes already in this project's graph.", { exact: false })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(mutate).toHaveBeenCalledWith(
      { content: "example.com has not been scanned recently", relatedNodeIds: ["node-1", "node-2"] },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("closes without confirming on cancel", async () => {
    const user = userEvent.setup();
    vi.mocked(useConfirmInsight).mockReturnValue(mutationResult({}));
    const onClose = vi.fn();

    render(
      <InsightConfirmDialog
        projectId={PROJECT_ID}
        content="anything"
        relatedNodeIds={["node-1"]}
        onClose={onClose}
        onConfirmed={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
  });
});
