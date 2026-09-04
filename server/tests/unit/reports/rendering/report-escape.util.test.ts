import { describe, expect, it } from "vitest";
import { escapeHtml, escapeMarkdown } from "../../../../src/modules/reports/rendering/report-escape.util";

describe("escapeHtml", () => {
  it("escapes the five HTML-significant characters", () => {
    expect(escapeHtml(`<script>alert("x")</script> & 'quote'`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;quote&#39;",
    );
  });

  it("leaves plain text untouched", () => {
    expect(escapeHtml("Open port 443 on host.example.com")).toBe("Open port 443 on host.example.com");
  });
});

describe("escapeMarkdown", () => {
  it("escapes characters that could forge headings, emphasis, or table structure", () => {
    expect(escapeMarkdown("# Injected Heading | pipe * bold * `code`")).toBe(
      "\\# Injected Heading \\| pipe \\* bold \\* \\`code\\`",
    );
  });

  it("escapes a literal backslash first so escaping is not double-applied", () => {
    expect(escapeMarkdown("back\\slash")).toBe("back\\\\slash");
  });

  it("leaves plain text untouched", () => {
    expect(escapeMarkdown("Open port 443 on host.example.com")).toBe("Open port 443 on host.example.com");
  });
});
