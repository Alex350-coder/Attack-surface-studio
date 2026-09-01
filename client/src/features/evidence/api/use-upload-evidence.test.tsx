import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUploadEvidence } from "./use-upload-evidence";
import { apiUpload } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({ apiUpload: vi.fn() }));

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useUploadEvidence", () => {
  afterEach(() => vi.clearAllMocks());

  it("uploads a FormData body built from the file/nodeId/label input", async () => {
    vi.mocked(apiUpload).mockResolvedValue({
      id: "22222222-2222-2222-2222-222222222222",
      projectId: PROJECT_ID,
      nodeId: null,
      fileRef: "ref-1",
      contentHash: "hash-1",
      mimeType: "image/png",
      label: "Screenshot",
      uploadedBy: null,
      createdAt: new Date().toISOString(),
      deletedAt: null,
    });

    const { result } = renderHook(() => useUploadEvidence(PROJECT_ID), { wrapper: wrapper() });
    const file = new File(["x"], "shot.png", { type: "image/png" });
    result.current.mutate({ file, label: "Screenshot" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const [path, formData] = vi.mocked(apiUpload).mock.calls[0];
    expect(path).toBe(`/projects/${PROJECT_ID}/evidence`);
    expect((formData as FormData).get("file")).toBe(file);
    expect((formData as FormData).get("label")).toBe("Screenshot");
  });
});
