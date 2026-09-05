import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReportExportMenu } from "./ReportExportMenu";
import { useExportReport } from "../api/use-export-report";

vi.mock("../api/use-export-report", () => ({ useExportReport: vi.fn() }));

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const REPORT_ID = "22222222-2222-2222-2222-222222222222";

function renderMenu() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ReportExportMenu projectId={PROJECT_ID} reportId={REPORT_ID} />
    </QueryClientProvider>,
  );
}

describe("ReportExportMenu", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("triggers export with the selected format on click", () => {
    const mutate = vi.fn();
    vi.mocked(useExportReport).mockReturnValue({ mutate, isPending: false, isError: false } as never);
    renderMenu();

    fireEvent.change(screen.getByLabelText("Export format"), { target: { value: "markdown" } });
    fireEvent.click(screen.getByRole("button", { name: "Export" }));

    expect(mutate).toHaveBeenCalledWith({ reportId: REPORT_ID, format: "markdown" });
  });

  it("disables the button and shows pending text while exporting", () => {
    vi.mocked(useExportReport).mockReturnValue({ mutate: vi.fn(), isPending: true, isError: false } as never);
    renderMenu();

    expect(screen.getByRole("button", { name: "Exporting…" })).toBeDisabled();
  });

  it("shows an error message when the export fails", () => {
    vi.mocked(useExportReport).mockReturnValue({ mutate: vi.fn(), isPending: false, isError: true } as never);
    renderMenu();

    expect(screen.getByRole("alert")).toHaveTextContent("Export failed.");
  });
});
