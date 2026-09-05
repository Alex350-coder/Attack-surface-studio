import { describe, expect, it } from "vitest";
import { renderReportHtml } from "../../../../src/modules/reports/rendering/report-html.renderer";
import type { ReportGraphSnapshot } from "../../../../src/modules/reports/rendering/report-rendering.types";

const snapshot: ReportGraphSnapshot = {
  nodes: [
    {
      id: "11111111-1111-1111-1111-111111111111",
      type: "finding",
      category: "security",
      label: '<img src=x onerror=alert(1)>',
      severity: "critical",
      data: {
        description: "<script>alert('xss')</script>",
        findings: [{ title: "SQLi", severity: "critical", description: "</td></tr><script>evil()</script>" }],
      },
    },
  ],
  edges: [],
};

describe("renderReportHtml", () => {
  it("never lets node/finding text reach the output as unescaped markup", () => {
    const html = renderReportHtml(snapshot, "My Report");

    expect(html).not.toContain("<img src=x onerror=alert(1)>");
    expect(html).not.toContain("<script>alert('xss')</script>");
    expect(html).not.toContain("</td></tr><script>evil()</script>");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("escapes the report title", () => {
    const html = renderReportHtml(snapshot, "<script>alert('title')</script>");
    expect(html).not.toContain("<script>alert('title')</script>");
    expect(html).toContain("&lt;script&gt;alert(&#39;title&#39;)&lt;/script&gt;");
  });

  it("produces a well-formed HTML document", () => {
    const html = renderReportHtml(snapshot, "My Report");
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
  });
});
