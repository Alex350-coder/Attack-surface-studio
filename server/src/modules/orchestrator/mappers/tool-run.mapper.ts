import type { ToolRunRow } from "../../knowledge/repositories/tool-runs.repository";

export interface ToolRunDto {
  id: string;
  projectId: string;
  adapterId: string;
  executionMode: string;
  target: string;
  status: string;
  queuedAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  triggeredBy: string;
  stats: unknown;
  error: unknown;
}

/** Explicit allow-list (BE-009): `invocation` (may embed adapter-specific options) is never sent to the client. */
export function toToolRunDto(row: ToolRunRow): ToolRunDto {
  return {
    id: row.id,
    projectId: row.projectId,
    adapterId: row.adapterId,
    executionMode: row.executionMode,
    target: row.target,
    status: row.status,
    queuedAt: row.queuedAt,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    triggeredBy: row.triggeredBy,
    stats: row.stats,
    error: row.error,
  };
}
