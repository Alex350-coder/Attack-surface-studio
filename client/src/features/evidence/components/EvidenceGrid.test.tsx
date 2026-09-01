import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { EvidenceGrid } from "./EvidenceGrid";
import { useEvidence } from "../api/use-evidence";

vi.mock("../api/use-evidence", () => ({ useEvidence: vi.fn() }));
vi.mock("./EvidenceThumbnail", () => ({
  EvidenceThumbnail: ({ alt }: { alt: string }) => <div>thumbnail:{alt}</div>,
}));

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";

describe("EvidenceGrid", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows a loading state", () => {
    vi.mocked(useEvidence).mockReturnValue({ isLoading: true, isError: false, data: undefined } as never);
    render(<EvidenceGrid projectId={PROJECT_ID} />);
    expect(screen.getByText("Loading evidence…")).toBeInTheDocument();
  });

  it("shows an error state", () => {
    vi.mocked(useEvidence).mockReturnValue({ isLoading: false, isError: true, data: undefined } as never);
    render(<EvidenceGrid projectId={PROJECT_ID} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load evidence.");
  });

  it("shows an empty state", () => {
    vi.mocked(useEvidence).mockReturnValue({ isLoading: false, isError: false, data: [] } as never);
    render(<EvidenceGrid projectId={PROJECT_ID} />);
    expect(screen.getByText("No evidence uploaded yet.")).toBeInTheDocument();
  });

  it("renders a thumbnail for image evidence and a file icon for non-image evidence", () => {
    vi.mocked(useEvidence).mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        { id: "e1", mimeType: "image/png", label: "Shot" },
        { id: "e2", mimeType: "application/pdf", label: "Report" },
      ],
    } as never);

    render(<EvidenceGrid projectId={PROJECT_ID} />);

    expect(screen.getByText("thumbnail:Shot")).toBeInTheDocument();
    expect(screen.getByText("application/pdf")).toBeInTheDocument();
  });
});
