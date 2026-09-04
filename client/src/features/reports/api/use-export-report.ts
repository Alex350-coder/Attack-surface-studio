"use client";

import { useMutation } from "@tanstack/react-query";
import { apiRequestBlob } from "@/lib/api-client";

export type ReportExportFormat = "pdf" | "html" | "markdown";

const EXTENSIONS: Record<ReportExportFormat, string> = {
  pdf: "pdf",
  html: "html",
  markdown: "md",
};

/**
 * Triggers a browser download from an in-memory blob. The anchor is appended to the DOM before
 * clicking (Firefox/Safari require this for a synthetic click to reliably start a download) and
 * the object URL is revoked in a `finally` on the next tick, after the browser has had a chance
 * to start reading it -- revoking synchronously can abort the download in some browsers.
 */
function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

interface ExportReportInput {
  reportId: string;
  format: ReportExportFormat;
}

export function useExportReport(projectId: string) {
  return useMutation({
    mutationFn: async ({ reportId, format }: ExportReportInput) => {
      const blob = await apiRequestBlob(`/projects/${projectId}/reports/${reportId}/export?format=${format}`);
      triggerBrowserDownload(blob, `${reportId}.${EXTENSIONS[format]}`);
      return blob;
    },
  });
}
