"use client";

import Link from "next/link";
import { Badge, reportStatusTone } from "@/components/ui/badge";
import { useReports } from "../api/use-reports";

type Props = {
  projectId: string;
};

export function ReportList({ projectId }: Props) {
  const reportsQuery = useReports(projectId);

  if (reportsQuery.isLoading) {
    return <p className="text-sm text-[var(--color-foreground-muted)]">Loading reports…</p>;
  }
  if (reportsQuery.isError) {
    return <p role="alert" className="text-sm text-[var(--node-critical)]">Failed to load reports.</p>;
  }
  if (!reportsQuery.data || reportsQuery.data.length === 0) {
    return <p className="text-sm text-[var(--color-foreground-muted)]">No reports yet. Assemble one above.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {reportsQuery.data.map((report) => (
        <li
          key={report.id}
          className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-3"
        >
          <Link href={`/app/projects/${projectId}/reports/${report.id}`} className="font-medium hover:underline">
            {report.title}
          </Link>
          <Badge tone={reportStatusTone(report.status)}>{report.status}</Badge>
        </li>
      ))}
    </ul>
  );
}
