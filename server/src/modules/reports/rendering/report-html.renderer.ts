import { escapeHtml } from "./report-escape.util";
import type { ReportGraphSnapshot, ReportSnapshotNode } from "./report-rendering.types";

/** `text()` is the only way a caller can put graph-derived text into the output -- it always escapes. */
function text(value: string): string {
  return escapeHtml(value);
}

function renderFindings(node: ReportSnapshotNode): string {
  const findings = node.data?.findings ?? [];
  if (findings.length === 0) return "";
  const items = findings
    .map(
      (finding) =>
        `<li><strong>${text(finding.title)}</strong> (${text(finding.severity)}): ${text(finding.description)}</li>`,
    )
    .join("");
  return `<ul class="findings">${items}</ul>`;
}

function renderNode(node: ReportSnapshotNode): string {
  const subtitle = node.data?.subtitle ? `<p class="subtitle">${text(node.data.subtitle)}</p>` : "";
  const description = node.data?.description ? `<p class="description">${text(node.data.description)}</p>` : "";
  const severity = node.severity ? `<span class="severity">${text(node.severity)}</span>` : "";
  return `
    <section class="node">
      <h2>${text(node.label)} ${severity}</h2>
      <p class="meta">${text(node.type)} / ${text(node.category)}</p>
      ${subtitle}
      ${description}
      ${renderFindings(node)}
    </section>`;
}

export function renderReportHtml(snapshot: ReportGraphSnapshot, title: string): string {
  const nodesHtml = snapshot.nodes.map(renderNode).join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${text(title)}</title>
</head>
<body>
  <h1>${text(title)}</h1>
  <p class="meta">${snapshot.nodes.length} node(s), ${snapshot.edges.length} edge(s)</p>
  ${nodesHtml}
</body>
</html>`;
}
