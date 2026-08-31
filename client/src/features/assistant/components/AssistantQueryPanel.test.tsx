import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AssistantQueryPanel } from "./AssistantQueryPanel";
import { useAssistantQuery } from "../api/use-assistant-query";

type AssistantQueryMutation = ReturnType<typeof useAssistantQuery>;

vi.mock("../api/use-assistant-query", () => ({ useAssistantQuery: vi.fn() }));

function mutationResult(overrides: Partial<AssistantQueryMutation>): AssistantQueryMutation {
  return {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    data: undefined,
    ...overrides,
  } as AssistantQueryMutation;
}

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";

describe("AssistantQueryPanel", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("rejects submission without a question", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    vi.mocked(useAssistantQuery).mockReturnValue(mutationResult({ mutate }));

    render(<AssistantQueryPanel projectId={PROJECT_ID} />);
    await user.click(screen.getByRole("button", { name: "Ask" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Ask a question first.");
    expect(mutate).not.toHaveBeenCalled();
  });

  it("submits the trimmed question", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    vi.mocked(useAssistantQuery).mockReturnValue(mutationResult({ mutate }));

    render(<AssistantQueryPanel projectId={PROJECT_ID} />);
    await user.type(screen.getByLabelText("Ask about this project's graph"), "What hosts are in scope?");
    await user.click(screen.getByRole("button", { name: "Ask" }));

    expect(mutate).toHaveBeenCalledWith({ question: "What hosts are in scope?" });
  });

  it("renders the answer and a truncation notice when the context was capped", () => {
    vi.mocked(useAssistantQuery).mockReturnValue(
      mutationResult({ data: { answer: "There are 2 hosts in scope.", referencedNodeIds: [], truncated: true } }),
    );

    render(<AssistantQueryPanel projectId={PROJECT_ID} />);

    expect(screen.getByText("There are 2 hosts in scope.")).toBeInTheDocument();
    expect(screen.getByText(/truncated to the most relevant nodes/)).toBeInTheDocument();
  });
});
