"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ReportBuilder } from "./ReportBuilder";
import { ReportList } from "./ReportList";

type Props = {
  projectId: string;
};

export function ReportsPage({ projectId }: Props) {
  const router = useRouter();
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  return (
    <div className="flex flex-col gap-8 p-6">
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Reports</h1>
          <button
            type="button"
            onClick={() => setIsBuilderOpen((open) => !open)}
            className="text-sm text-[var(--color-accent)] hover:underline"
          >
            {isBuilderOpen ? "Close builder" : "Assemble a report"}
          </button>
        </div>
        {isBuilderOpen ? (
          <ReportBuilder
            projectId={projectId}
            onCreated={(reportId) => router.push(`/app/projects/${projectId}/reports/${reportId}`)}
          />
        ) : null}
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">All reports</h2>
        <ReportList projectId={projectId} />
      </section>
    </div>
  );
}
