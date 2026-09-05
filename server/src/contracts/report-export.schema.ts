export type ReportExportFormat = "pdf" | "html" | "markdown";

/** MIME type served for each export format's `Content-Type` header. */
export const REPORT_EXPORT_MIME_TYPES: Record<ReportExportFormat, string> = {
  pdf: "application/pdf",
  html: "text/html; charset=utf-8",
  markdown: "text/markdown; charset=utf-8",
};

/**
 * File extension for each export format. Canonical here (not duplicated per-consumer) since both
 * the server's renderer (`Content-Disposition` filename) and the client's download trigger
 * (`use-export-report.ts`) need the exact same mapping -- re-exported to the client via
 * `client/src/lib/server-contracts.ts`, the established pattern for sharing the wire contract.
 */
export const REPORT_EXPORT_EXTENSIONS: Record<ReportExportFormat, string> = {
  pdf: "pdf",
  html: "html",
  markdown: "md",
};
