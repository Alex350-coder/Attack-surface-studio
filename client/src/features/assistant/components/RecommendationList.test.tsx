import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RecommendationList } from "./RecommendationList";
import { useAssistantRecommend } from "../api/use-assistant-recommend";

type AssistantRecommendMutation = ReturnType<typeof useAssistantRecommend>;

vi.mock("../api/use-assistant-recommend", () => ({ useAssistantRecommend: vi.fn() }));
vi.mock("./InsightConfirmDialog", () => ({
  InsightConfirmDialog: () => <div>confirm-dialog</div>,
}));

function mutationResult(overrides: Partial<AssistantRecommendMutation>): AssistantRecommendMutation {
  return {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    data: undefined,
    ...overrides,
  } as AssistantRecommendMutation;
}

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";

describe("RecommendationList", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("requests recommendations on demand", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    vi.mocked(useAssistantRecommend).mockReturnValue(mutationResult({ mutate }));

    render(<RecommendationList projectId={PROJECT_ID} />);
    await user.click(screen.getByRole("button", { name: "Get recommendations" }));

    expect(mutate).toHaveBeenCalledWith({});
  });

  it("disables confirm when no context nodes were referenced", () => {
    vi.mocked(useAssistantRecommend).mockReturnValue(
      mutationResult({ data: { answer: "Scan example.com next.", referencedNodeIds: [], truncated: false } }),
    );

    render(<RecommendationList projectId={PROJECT_ID} />);

    expect(screen.getByText("Scan example.com next.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm as insight" })).toBeDisabled();
  });

  it("opens the confirm dialog when a recommendation has referenced nodes", async () => {
    const user = userEvent.setup();
    vi.mocked(useAssistantRecommend).mockReturnValue(
      mutationResult({
        data: { answer: "Scan example.com next.", referencedNodeIds: ["node-1"], truncated: false },
      }),
    );

    render(<RecommendationList projectId={PROJECT_ID} />);
    await user.click(screen.getByRole("button", { name: "Confirm as insight" }));

    expect(screen.getByText("confirm-dialog")).toBeInTheDocument();
  });
});
