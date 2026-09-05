import PDFDocument from "pdfkit";
import type { ReportGraphSnapshot, ReportSnapshotNode } from "./report-rendering.types";

/**
 * pdfkit draws PDF primitives programmatically via `.text()` -- it never parses HTML/Markdown,
 * so there is no markup-injection surface here at all (unlike the HTML/Markdown renderers,
 * which must escape). This is why pdfkit was chosen over a headless-browser HTML-to-PDF
 * pipeline (ARCHITECTURE.md ADR-016).
 */
function writeNode(doc: PDFKit.PDFDocument, node: ReportSnapshotNode): void {
  doc.moveDown().fontSize(14).text(`${node.label}${node.severity ? ` (${node.severity})` : ""}`, { underline: true });
  doc.fontSize(10).fillColor("#666").text(`${node.type} / ${node.category}`);
  doc.fillColor("#000");

  if (node.data?.subtitle) doc.fontSize(11).text(node.data.subtitle);
  if (node.data?.description) doc.fontSize(11).text(node.data.description);

  for (const finding of node.data?.findings ?? []) {
    doc.moveDown(0.5).fontSize(11).text(`${finding.title} (${finding.severity}): ${finding.description}`);
  }
}

export function renderReportPdf(snapshot: ReportGraphSnapshot, title: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text(title, { align: "center" });
    doc.moveDown().fontSize(10).fillColor("#666").text(`${snapshot.nodes.length} node(s), ${snapshot.edges.length} edge(s)`);
    doc.fillColor("#000");

    for (const node of snapshot.nodes) {
      writeNode(doc, node);
    }

    doc.end();
  });
}
