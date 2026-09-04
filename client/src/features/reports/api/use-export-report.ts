"use client";

import { useMutation } from "@tanstack/react-query";
import { apiRequestBlob } from "@/lib/api-client";

export type ReportExportFormat = "pdf" | "html" | "markdown";

const EXTENSIONS: Record<ReportExportFormat, string> = {
  pdf: "pdf",
  html: "html",
  markdown: "md",
};

/** Triggers a browser download from an in-memory blob, revoking the object URL right after the click. */
function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
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
