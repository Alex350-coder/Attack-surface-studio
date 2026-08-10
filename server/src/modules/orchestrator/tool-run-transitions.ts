export const TOOL_RUN_STATUSES = ["queued", "running", "succeeded", "failed", "cancelled"] as const;
export type ToolRunStatus = (typeof TOOL_RUN_STATUSES)[number];

const TERMINAL_STATUSES: ReadonlySet<ToolRunStatus> = new Set(["succeeded", "failed", "cancelled"]);

/**
 * Explicit allow-list of legal `tool_runs.status` transitions (OWA-021), mirroring the
 * `canAssignRole` pattern (`project-member.policy.ts`). `queued -> queued` and
 * `running -> queued` cover a retryable failure being requeued by the worker for another
 * attempt; every other edge is a one-way lifecycle step. No transition ever leaves a terminal
 * status -- a finished run is finished.
 */
const ALLOWED_TRANSITIONS: Readonly<Record<ToolRunStatus, ReadonlySet<ToolRunStatus>>> = {
  // "queued -> failed" covers the API process failing to hand a freshly-created run off to the
  // queue (e.g. Redis unreachable) before any worker ever claims it.
  queued: new Set<ToolRunStatus>(["running", "cancelled", "failed"]),
  running: new Set<ToolRunStatus>(["queued", "succeeded", "failed", "cancelled"]),
  succeeded: new Set<ToolRunStatus>([]),
  failed: new Set<ToolRunStatus>([]),
  cancelled: new Set<ToolRunStatus>([]),
};

export function canTransition(from: ToolRunStatus, to: ToolRunStatus): boolean {
  return ALLOWED_TRANSITIONS[from].has(to);
}

export function isTerminalStatus(status: ToolRunStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}
