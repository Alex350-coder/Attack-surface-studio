import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useExportReport } from "./use-export-report";
import { apiRequestBlob } from "@/lib/api-client";
import { queryClientWrapper } from "@/lib/test/query-client-wrapper";

vi.mock("@/lib/api-client", () => ({ apiRequestBlob: vi.fn() }));

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const REPORT_ID = "22222222-2222-2222-2222-222222222222";

describe("useExportReport", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("requests the export endpoint with the chosen format and triggers a download", async () => {
    const blob = new Blob(["%PDF-1.4"], { type: "application/pdf" });
    vi.mocked(apiRequestBlob).mockResolvedValue(blob);
    const createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const { result } = renderHook(() => useExportReport(PROJECT_ID), { wrapper: queryClientWrapper() });

    result.current.mutate({ reportId: REPORT_ID, format: "pdf" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiRequestBlob).toHaveBeenCalledWith(`/projects/${PROJECT_ID}/reports/${REPORT_ID}/export?format=pdf`);
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");

    clickSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("surfaces a failed export as a mutation error", async () => {
    vi.mocked(apiRequestBlob).mockRejectedValue(new Error("export failed"));

    const { result } = renderHook(() => useExportReport(PROJECT_ID), { wrapper: queryClientWrapper() });

    result.current.mutate({ reportId: REPORT_ID, format: "html" });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
