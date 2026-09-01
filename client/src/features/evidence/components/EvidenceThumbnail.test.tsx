import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { EvidenceThumbnail } from "./EvidenceThumbnail";
import { apiRequestBlob } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({ apiRequestBlob: vi.fn() }));

describe("EvidenceThumbnail", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the image once the blob resolves", async () => {
    vi.mocked(apiRequestBlob).mockResolvedValue(new Blob(["x"], { type: "image/png" }));
    URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    URL.revokeObjectURL = vi.fn();

    render(<EvidenceThumbnail projectId="p1" evidenceId="e1" alt="A screenshot" />);

    expect(await screen.findByAltText("A screenshot")).toHaveAttribute("src", "blob:mock-url");
  });

  it("shows an error message when the fetch fails", async () => {
    vi.mocked(apiRequestBlob).mockRejectedValue(new Error("nope"));

    render(<EvidenceThumbnail projectId="p1" evidenceId="e1" alt="A screenshot" />);

    expect(await screen.findByText("Failed to load")).toBeInTheDocument();
  });
});
