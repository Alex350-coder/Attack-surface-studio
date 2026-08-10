import type { ExecutionMode } from "../../adapters/adapter.contract";

/** The payload BullMQ persists in Redis and hands to the worker's job processor. */
export interface RunJobData {
  runId: string;
  projectId: string;
  adapterId: string;
  executionMode: ExecutionMode;
  target: string;
  triggeredBy: string;
  options: unknown;
}

export interface RunJobResult {
  status: "succeeded" | "failed" | "cancelled";
}
