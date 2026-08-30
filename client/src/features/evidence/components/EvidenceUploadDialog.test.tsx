import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EvidenceUploadDialog } from "./EvidenceUploadDialog";
import { useProjectGraph } from "@/features/workspace/api/use-project-graph";
import { useUploadEvidence } from "../api/use-upload-evidence";

vi.mock("@/features/workspace/api/use-project-graph", () => ({ useProjectGraph: vi.fn() }));
vi.mock("../api/use-upload-evidence", () => ({ useUploadEvidence: vi.fn() }));

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";

describe("EvidenceUploadDialog", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("blocks submission without a file and never mutates", async () => {
    const mutate = vi.fn();
    vi.mocked(useProjectGraph).mockReturnValue({ data: { nodes: [] }, isLoading: false } as never);
    vi.mocked(useUploadEvidence).mockReturnValue({ mutate, isPending: false, isError: false } as never);

    render(<EvidenceUploadDialog projectId={PROJECT_ID} onClose={vi.fn()} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Upload" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Choose a file to upload.");
    expect(mutate).not.toHaveBeenCalled();
  });

  it("lists project graph nodes in the node picker", () => {
    vi.mocked(useProjectGraph).mockReturnValue({
      data: { nodes: [{ id: "n1", data: { label: "example.com" } }] },
      isLoading: false,
    } as never);
    vi.mocked(useUploadEvidence).mockReturnValue({ mutate: vi.fn(), isPending: false, isError: false } as never);

    render(<EvidenceUploadDialog projectId={PROJECT_ID} onClose={vi.fn()} />);

    expect(screen.getByRole("option", { name: "example.com" })).toBeInTheDocument();
  });

  it("uploads the chosen file and closes on success", async () => {
    const onClose = vi.fn();
    const mutate = vi.fn((_input, options?: { onSuccess?: () => void }) => options?.onSuccess?.());
    vi.mocked(useProjectGraph).mockReturnValue({ data: { nodes: [] }, isLoading: false } as never);
    vi.mocked(useUploadEvidence).mockReturnValue({ mutate, isPending: false, isError: false } as never);

    render(<EvidenceUploadDialog projectId={PROJECT_ID} onClose={onClose} />);
    const user = userEvent.setup();
    const file = new File(["x"], "shot.png", { type: "image/png" });

    await user.upload(screen.getByLabelText("File"), file);
    await user.click(screen.getByRole("button", { name: "Upload" }));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ file }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    expect(onClose).toHaveBeenCalled();
  });
});
