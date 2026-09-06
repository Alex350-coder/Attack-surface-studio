"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useExportReport, type ReportExportFormat } from "../api/use-export-report";

type Props = {
  projectId: string;
  reportId: string;
};

const FORMAT_OPTIONS = [
  { value: "pdf", label: "PDF" },
  { value: "html", label: "HTML" },
  { value: "markdown", label: "Markdown" },
] as const;

/** Narrows `Select`'s generic `string` callback without an unchecked `as` cast. */
function isReportExportFormat(value: string): value is ReportExportFormat {
  return FORMAT_OPTIONS.some((option) => option.value === value);
}

/** Format picker + download trigger next to a report's title (Phase 12 export). */
export function ReportExportMenu({ projectId, reportId }: Props) {
  const [format, setFormat] = useState<ReportExportFormat>("pdf");
  const exportReport = useExportReport(projectId);

  return (
    <div className="flex items-center gap-2">
      <Select
        id="report-export-format"
        label="Export format"
        value={format}
        onChange={(value) => {
          if (!isReportExportFormat(value)) return;
          setFormat(value);
          // Clears a previous format's error so switching formats before retrying doesn't leave
          // a stale "Export failed." message that now appears to describe the newly selected one.
          exportReport.reset();
        }}
        options={FORMAT_OPTIONS}
        className="flex-row items-center gap-2 [&>label]:sr-only"
        disabled={exportReport.isPending}
      />
      <Button
        type="button"
        size="sm"
        disabled={exportReport.isPending}
        onClick={() => exportReport.mutate({ reportId, format })}
      >
        {exportReport.isPending ? "Exporting…" : "Export"}
      </Button>
      {exportReport.isError ? (
        <p role="alert" className="text-xs text-[var(--node-critical)]">
          Export failed.
        </p>
      ) : null}
    </div>
  );
}
