import { Injectable } from "@nestjs/common";
import { renderReportHtml } from "./report-html.renderer";
import { renderReportMarkdown } from "./report-markdown.renderer";
import { renderReportPdf } from "./report-pdf.renderer";
import type { RenderedReport, ReportExportFormat, ReportGraphSnapshot } from "./report-rendering.types";

export const MIME_TYPES: Record<ReportExportFormat, string> = {
  pdf: "application/pdf",
  html: "text/html; charset=utf-8",
  markdown: "text/markdown; charset=utf-8",
};

export const EXTENSIONS: Record<ReportExportFormat, string> = {
  pdf: "pdf",
  html: "html",
  markdown: "md",
};

/**
 * Pure, deterministic, in-process rendering over an already-fetched graph snapshot -- no
 * external dependency to swap or degrade, so this is a plain provider rather than a DI-token
 * interface (unlike `BlobStorage`; see ARCHITECTURE.md ADR-016).
 */
@Injectable()
export class ReportRendererService {
  async render(
    format: ReportExportFormat,
    snapshot: ReportGraphSnapshot,
    title: string,
  ): Promise<RenderedReport> {
    const buffer = await this.renderBuffer(format, snapshot, title);
    return { buffer, mimeType: MIME_TYPES[format], extension: EXTENSIONS[format] };
  }

  private renderBuffer(format: ReportExportFormat, snapshot: ReportGraphSnapshot, title: string): Promise<Buffer> {
    switch (format) {
      case "pdf":
        return renderReportPdf(snapshot, title);
      case "html":
        return Promise.resolve(Buffer.from(renderReportHtml(snapshot, title), "utf-8"));
      case "markdown":
        return Promise.resolve(Buffer.from(renderReportMarkdown(snapshot, title), "utf-8"));
    }
  }
}
