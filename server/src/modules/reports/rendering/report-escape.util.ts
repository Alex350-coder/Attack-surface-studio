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
 * Escapes the characters that could forge a heading (`#`), break a table (`|`), or fake
 * emphasis/code spans (`*`, `_`, `` ` ``). The backslash itself is escaped first so this can
 * never be applied twice to the same text and produce a different result.
 */
export function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_#|]/g, (char) => `\\${char}`);
}
