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

  it("escapes link/image syntax so graph-derived text cannot forge a clickable link", () => {
    expect(escapeMarkdown("[Verified safe](https://attacker.example/track)")).toBe(
      "\\[Verified safe\\]\\(https://attacker.example/track\\)",
    );
  });

  it("escapes a leading blockquote marker anywhere it appears", () => {
    expect(escapeMarkdown(">")).toBe("\\>");
  });

  it("escapes a leading unordered list bullet but not a mid-text hyphen", () => {
    expect(escapeMarkdown("- Not exploitable")).toBe("\\- Not exploitable");
    expect(escapeMarkdown("normal-hyphenated-text")).toBe("normal-hyphenated-text");
  });

  it("escapes a leading ordered-list marker's dot without touching the digits", () => {
    expect(escapeMarkdown("1. Not exploitable")).toBe("1\\. Not exploitable");
  });

  it("neutralizes a setext-heading/thematic-break underline across multiple lines", () => {
    expect(escapeMarkdown("Heading\n===")).toBe("Heading\n\\===");
    expect(escapeMarkdown("---")).toBe("\\---");
  });
});
