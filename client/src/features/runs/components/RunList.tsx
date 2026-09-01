"use client";

import Link from "next/link";
import { Badge, runStatusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCancelRun, useRuns, isNonTerminal } from "../api/use-runs";

type Props = {
  projectId: string;
};

/** Renders the project's tool runs with status pills and a cancel action for non-terminal ones. */
export function RunList({ projectId }: Props) {
  const runsQuery = useRuns(projectId);
  const cancelRun = useCancelRun(projectId);

  if (runsQuery.isLoading) {
    return <p className="text-sm text-[var(--color-foreground-muted)]">Loading runs…</p>;
  }
  if (runsQuery.isError) {
    return <p role="alert" className="text-sm text-[var(--node-critical)]">Failed to load runs.</p>;
  }
  if (!runsQuery.data || runsQuery.data.length === 0) {
    return <p className="text-sm text-[var(--color-foreground-muted)]">No runs yet. Start one above.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {runsQuery.data.map((run) => (
        <li
          key={run.id}
          className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-3"
        >
          <div className="flex flex-col gap-1">
            <Link href={`/app/projects/${projectId}/tools/${run.id}`} className="font-medium hover:underline">
              {run.adapterId} — {run.target}
            </Link>
            <span className="text-xs text-[var(--color-foreground-muted)]">{run.executionMode}</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge tone={runStatusTone(run.status)}>{run.status}</Badge>
            {isNonTerminal(run.status) ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={cancelRun.isPending}
                onClick={() => cancelRun.mutate(run.id)}
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
