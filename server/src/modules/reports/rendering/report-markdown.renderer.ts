import { escapeMarkdown } from "./report-escape.util";
import type { ReportGraphSnapshot, ReportSnapshotNode } from "./report-rendering.types";

function md(value: string): string {
  return escapeMarkdown(value);
}

function renderFindings(node: ReportSnapshotNode): string {
  const findings = node.data?.findings ?? [];
  if (findings.length === 0) return "";
  return findings
    .map((finding) => `- **${md(finding.title)}** (${md(finding.severity)}): ${md(finding.description)}`)
    .join("\n");
}

function renderNode(node: ReportSnapshotNode): string {
  const lines = [`## ${md(node.label)}${node.severity ? ` (${md(node.severity)})` : ""}`, `_${md(node.type)} / ${md(node.category)}_`];
  if (node.data?.subtitle) lines.push(md(node.data.subtitle));
  if (node.data?.description) lines.push(md(node.data.description));
  const findings = renderFindings(node);
  if (findings) lines.push(findings);
  return lines.join("\n\n");
}

export function renderReportMarkdown(snapshot: ReportGraphSnapshot, title: string): string {
  const header = `# ${md(title)}\n\n${snapshot.nodes.length} node(s), ${snapshot.edges.length} edge(s)`;
  const nodesMarkdown = snapshot.nodes.map(renderNode).join("\n\n");
  return [header, nodesMarkdown].filter(Boolean).join("\n\n");
}
