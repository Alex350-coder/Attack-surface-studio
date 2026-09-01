"use client";

import { useState } from "react";
import { Badge, runStatusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentRole } from "@/features/workspace/api/use-current-role";
import { apiRequestBlob } from "@/lib/api-client";
import { useRun } from "../api/use-run";

type Props = {
  projectId: string;
  runId: string;
};

/**
 * Polls a single run's status until it's terminal. The raw-output link is only surfaced to
 * owner/admin roles -- the backend's `GET :runId/raw` endpoint already enforces this
 * server-side (`@Roles("owner","admin")`); the UI mirrors it so members don't see a dead link.
 * Fetched via `apiRequestBlob` (not a plain `<a href>`) because auth is a Bearer header, not a
 * cookie the browser would attach to a bare navigation.
 */
export function RunDetail({ projectId, runId }: Props) {
  const runQuery = useRun(projectId, runId);
  const { role } = useCurrentRole(projectId);
  const canViewRaw = role === "owner" || role === "admin";
  const [rawError, setRawError] = useState<string | null>(null);

  async function handleViewRaw(): Promise<void> {
    setRawError(null);
    try {
      const blob = await apiRequestBlob(`/projects/${projectId}/runs/${runId}/raw`);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setRawError("Failed to load the raw output.");
    }
  }

  if (runQuery.isLoading) {
    return <p className="text-sm text-[var(--color-foreground-muted)]">Loading run…</p>;
  }
  if (runQuery.isError) {
    return <p role="alert" className="text-sm text-[var(--node-critical)]">Failed to load this run.</p>;
  }
  if (!runQuery.data) {
    return <p className="text-sm text-[var(--color-foreground-muted)]">Run not found.</p>;
  }

  const run = runQuery.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">{run.adapterId}</h2>
        <Badge tone={runStatusTone(run.status)}>{run.status}</Badge>
      </div>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-[var(--color-foreground-muted)]">Target</dt>
        <dd>{run.target}</dd>
        <dt className="text-[var(--color-foreground-muted)]">Execution mode</dt>
        <dd>{run.executionMode}</dd>
        <dt className="text-[var(--color-foreground-muted)]">Queued</dt>
        <dd>{run.queuedAt.toLocaleString()}</dd>
      </dl>
      {canViewRaw ? (
        <div className="flex flex-col items-start gap-1">
          <Button type="button" size="sm" variant="secondary" onClick={handleViewRaw}>
            View raw output
          </Button>
          {rawError ? (
            <p role="alert" className="text-sm text-[var(--node-critical)]">
              {rawError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
