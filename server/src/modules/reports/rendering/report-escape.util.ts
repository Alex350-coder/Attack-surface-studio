/**
 * Escapes text before it is interpolated into a hand-built HTML/Markdown document (OWA-015,
 * OWA-004). Every renderer routes graph-derived text through exactly one of these -- there is
 * no other path for a string to reach rendered output.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Escapes the characters that could forge a heading (`#`), a link/image (`[]()`), a
 * blockquote (`>`), break a table (`|`), or fake emphasis/code spans (`*`, `_`, `` ` ``). The
 * backslash itself is escaped first so this can never be applied twice to the same text and
 * produce a different result. Line-leading list bullets (`-`, `+`), ordered-list markers
 * (`1.`), and setext-heading/thematic-break underlines (`---`, `===`) are only meaningful at
 * the start of a line, so they are handled separately per line rather than escaped everywhere.
 */
export function escapeMarkdown(value: string): string {
  const charEscaped = value.replace(/[\\`*_#|[\]()>]/g, (char) => `\\${char}`);
  return charEscaped.split("\n").map(escapeLineLeadingMarker).join("\n");
}

function escapeLineLeadingMarker(line: string): string {
  const orderedList = line.replace(/^(\s*)(\d+)\./, (_match, indent: string, digits: string) => `${indent}${digits}\\.`);
  if (orderedList !== line) {
    return orderedList;
  }
  return line.replace(/^(\s*)([-+=])/, (_match, indent: string, marker: string) => `${indent}\\${marker}`);
}
