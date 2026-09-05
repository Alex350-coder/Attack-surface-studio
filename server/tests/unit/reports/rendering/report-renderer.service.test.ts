import { describe, expect, it } from "vitest";
import { ReportRendererService } from "../../../../src/modules/reports/rendering/report-renderer.service";
import type { ReportGraphSnapshot } from "../../../../src/modules/reports/rendering/report-rendering.types";

const snapshot: ReportGraphSnapshot = { nodes: [], edges: [] };

describe("ReportRendererService", () => {
  const service = new ReportRendererService();

  it("dispatches pdf format to a valid PDF buffer with the pdf mime type", async () => {
    const result = await service.render("pdf", snapshot, "Report");
    expect(result.mimeType).toBe("application/pdf");
    expect(result.extension).toBe("pdf");
    expect(result.buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });

  it("dispatches html format to an HTML document", async () => {
    const result = await service.render("html", snapshot, "Report");
    expect(result.mimeType).toContain("text/html");
    expect(result.extension).toBe("html");
    expect(result.buffer.toString("utf-8")).toContain("<!DOCTYPE html>");
  });

  it("dispatches markdown format to a markdown document", async () => {
    const result = await service.render("markdown", snapshot, "Report");
    expect(result.mimeType).toContain("text/markdown");
    expect(result.extension).toBe("md");
    expect(result.buffer.toString("utf-8")).toContain("# Report");
  });
});
