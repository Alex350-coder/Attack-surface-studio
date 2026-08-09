export const QUEUE_CONNECTION_OPTIONS = Symbol("QUEUE_CONNECTION_OPTIONS");

export const TOOL_RUNS_QUEUE_NAME = "tool-runs";

const RUN_CANCEL_CHANNEL_PREFIX = "run:cancel:";

/**
 * Redis pub/sub channel used to signal an in-flight run's cancellation across process
 * boundaries -- BullMQ has no built-in "cancel a running job" primitive (ARCHITECTURE.md ADR
 * for Phase 6). The API process publishes; the worker process's active job subscribes.
 */
export function runCancelChannel(runId: string): string {
  return `${RUN_CANCEL_CHANNEL_PREFIX}${runId}`;
}
