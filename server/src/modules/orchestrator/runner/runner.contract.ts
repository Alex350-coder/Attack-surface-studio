import type { ExecutionMode } from "../../adapters/adapter.contract";

export interface RunnerOptions {
  command: string;
  args: string[];
  timeoutMs: number;
  env?: Record<string, string>;
  /** Docker mode only: image reference to run `command`/`args` inside. */
  image?: string;
  /** Cooperative cancellation -- aborting kills the process/container mid-run. */
  signal?: AbortSignal;
}

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  cancelled: boolean;
}

/** A shared execution strategy for one mode (`BE-015`, `EXE-004`). */
export interface Runner {
  run(options: RunnerOptions): Promise<RunResult>;
}

/** Selects the correct `Runner` for an `ExecutionMode` (`runner.service.ts`). */
export interface RunnerSelector {
  run(mode: ExecutionMode, options: RunnerOptions): Promise<RunResult>;
}
