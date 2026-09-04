import { describe, expect, it } from "vitest";
import { renderReportMarkdown } from "../../../../src/modules/reports/rendering/report-markdown.renderer";
import type { ReportGraphSnapshot } from "../../../../src/modules/reports/rendering/report-rendering.types";

const snapshot: ReportGraphSnapshot = {
  nodes: [
    {
      id: "11111111-1111-1111-1111-111111111111",
      type: "finding",
      category: "security",
      label: "# Forged Heading | pipe",
      severity: "critical",
      data: {
        description: "Normal *bold* looking text with a `code` span",
        findings: [{ title: "SQLi", severity: "critical", description: "cell | with | pipes" }],
      },
    },
  ],
  edges: [],
};

describe("renderReportMarkdown", () => {
  it("escapes label text so it cannot forge a heading or break a table", () => {
    const md = renderReportMarkdown(snapshot, "My Report");
    expect(md).not.toMatch(/^# Forged Heading/m);
    expect(md).toContain("\\# Forged Heading \\| pipe");
  });

  it("escapes emphasis and code markers in free text", () => {
    const md = renderReportMarkdown(snapshot, "My Report");
    expect(md).toContain("\\*bold\\*");
    expect(md).toContain("\\`code\\`");
  });

  it("escapes pipes inside table-adjacent content", () => {
    const md = renderReportMarkdown(snapshot, "My Report");
    expect(md).toContain("cell \\| with \\| pipes");
  });

  it("starts with the (escaped) report title as an actual top-level heading", () => {
    const md = renderReportMarkdown(snapshot, "My Report");
    expect(md.startsWith("# My Report")).toBe(true);
  });
});
