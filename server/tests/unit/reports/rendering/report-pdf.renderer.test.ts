import { describe, expect, it } from "vitest";
import { renderReportPdf } from "../../../../src/modules/reports/rendering/report-pdf.renderer";
import type { ReportGraphSnapshot } from "../../../../src/modules/reports/rendering/report-rendering.types";

const snapshot: ReportGraphSnapshot = {
  nodes: [
    {
      id: "11111111-1111-1111-1111-111111111111",
      type: "finding",
      category: "security",
      label: "<script>alert(1)</script>",
      severity: "critical",
      data: { description: "Some finding description" },
    },
  ],
  edges: [],
};

describe("renderReportPdf", () => {
  it("produces a valid PDF buffer", async () => {
    const buffer = await renderReportPdf(snapshot, "My Report");
    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });

  it("never throws or breaks when node text contains markup-like characters (pdfkit draws glyphs, never parses markup)", async () => {
    await expect(renderReportPdf(snapshot, "My Report")).resolves.toBeInstanceOf(Buffer);
  });
});
