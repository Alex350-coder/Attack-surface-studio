import type { ExecutionMode } from "../../adapters/adapter.contract";
import type { Runner, RunnerOptions, RunnerSelector, RunResult } from "./runner.contract";

/** Selects the process or Docker runner by `ExecutionMode` -- adapters never spawn anything themselves. */
export class RunnerService implements RunnerSelector {
  constructor(
    private readonly processRunner: Runner,
    private readonly dockerRunner: Runner,
  ) {}

  run(mode: ExecutionMode, options: RunnerOptions): Promise<RunResult> {
    const runner = mode === "docker" ? this.dockerRunner : this.processRunner;
    return runner.run(options);
  }
}
