import { Worker, type Job } from "bullmq";
import type IORedis from "ioredis";
import { createRedisConnection } from "../../../core/queue/redis-connection";
import type { QueueConnectionOptions } from "../../../core/queue/redis-connection";
import { runCancelChannel, TOOL_RUNS_QUEUE_NAME } from "../../../core/queue/queue.tokens";
import { runWithUserContext } from "../../../core/database/rls";
import type { AdapterRegistry } from "../../adapters/adapter.registry";
import {
  AdapterError,
  ExecutionTimeoutError,
  NonZeroExitError,
  ToolNotAvailableError,
  type RunContext,
} from "../../adapters/adapter.contract";
import type { ProjectsRepository } from "../../projects/repositories/projects.repository";
import type { ToolRunsRepository } from "../../knowledge/repositories/tool-runs.repository";
import type { RunnerSelector } from "../runner/runner.contract";
import { isTargetInScope } from "../scope/scope-matcher";
import { ScopeViolationError, NotFoundError } from "../../../core/http/domain-error";
import { getRetryDecision, shouldRetry } from "../retry-policy";
import type { RunJobData, RunJobResult } from "./run-job.types";

/**
 * The worker process's side of the job queue: claims a queued run, re-validates its target's
 * scope (a project's scope can change between enqueue and execution -- EXE-003), executes it via
 * the shared runner, and drives `tool_runs` through its state machine with atomic conditional
 * updates (OWA-020) so a concurrent cancel signal can never be clobbered by a late success write.
 */
export class OrchestratorWorker {
  private readonly worker: Worker<RunJobData, RunJobResult>;
  private readonly subscriber: IORedis;

  constructor(
    connectionOptions: QueueConnectionOptions,
    private readonly adapterRegistry: AdapterRegistry,
    private readonly runner: RunnerSelector,
    private readonly toolRunsRepository: ToolRunsRepository,
    private readonly projectsRepository: ProjectsRepository,
  ) {
    this.subscriber = createRedisConnection();
    this.worker = new Worker<RunJobData, RunJobResult>(
      TOOL_RUNS_QUEUE_NAME,
      (job) => this.process(job),
      { connection: connectionOptions },
    );
  }

  private async process(job: Job<RunJobData, RunJobResult>): Promise<RunJobResult> {
    const { runId, projectId, adapterId, executionMode, target, triggeredBy, options } = job.data;

    return runWithUserContext(triggeredBy, async () => {
      const claimed = await this.toolRunsRepository.updateStatus(
        projectId,
        runId,
        { status: "running", startedAt: new Date() },
        ["queued"],
      );
      if (!claimed) {
        // Already cancelled, or a retry attempt racing a cancel -- nothing left to do.
        return { status: "cancelled" };
      }

      const channel = runCancelChannel(runId);
      const abortController = new AbortController();
      const onMessage = (receivedChannel: string): void => {
        if (receivedChannel === channel) {
          abortController.abort();
        }
      };
      await this.subscriber.subscribe(channel);
      this.subscriber.on("message", onMessage);

      try {
        return await this.execute(job, {
          projectId,
          runId,
          adapterId,
          executionMode,
          target,
          triggeredBy,
          options,
          signal: abortController.signal,
        });
      } finally {
        this.subscriber.off("message", onMessage);
        await this.subscriber.unsubscribe(channel);
      }
    });
  }

  private async execute(
    job: Job<RunJobData, RunJobResult>,
    input: {
      projectId: string;
      runId: string;
      adapterId: string;
      executionMode: RunJobData["executionMode"];
      target: string;
      triggeredBy: string;
      options: unknown;
      signal: AbortSignal;
    },
  ): Promise<RunJobResult> {
    const { projectId, runId, adapterId, executionMode, target, triggeredBy, options, signal } = input;

    try {
      const project = await this.projectsRepository.findById(projectId);
      if (!project) {
        throw new NotFoundError(`Project ${projectId} not found`);
      }
      if (!isTargetInScope(target, project.scope)) {
        throw new ScopeViolationError(`Target "${target}" is outside the project's authorized scope`);
      }

      const adapter = this.adapterRegistry.get(adapterId);
      if (!adapter) {
        throw new ToolNotAvailableError(`Unknown adapter "${adapterId}"`);
      }
      const detection = await adapter.detect(executionMode);
      if (!detection.available) {
        throw new ToolNotAvailableError(detection.error ?? `Adapter "${adapterId}" is unavailable in ${executionMode} mode`);
      }

      const ctx: RunContext = { projectId, runId, target, triggeredBy };
      const invocation = await adapter.buildInvocation(options, ctx);

      const startedAt = Date.now();
      const result = await this.runner.run(executionMode, {
        command: invocation.command,
        args: invocation.args,
        timeoutMs: invocation.timeoutMs,
        env: invocation.env,
        image: invocation.image,
        signal,
      });
      const durationMs = Date.now() - startedAt;

      if (result.cancelled) {
        await this.markTerminal(projectId, runId, "cancelled");
        return { status: "cancelled" };
      }
      if (result.timedOut) {
        throw new ExecutionTimeoutError(`Adapter "${adapterId}" timed out after ${invocation.timeoutMs}ms`);
      }
      if (result.exitCode !== 0) {
        throw new NonZeroExitError(`Adapter "${adapterId}" exited with code ${String(result.exitCode)}`);
      }

      const parsed = await adapter.parse({
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
      });
      const delta = await adapter.normalize(parsed, ctx);

      await this.toolRunsRepository.updateStatus(
        projectId,
        runId,
        {
          status: "succeeded",
          finishedAt: new Date(),
          stats: { durationMs, nodeCount: delta.nodes.length, edgeCount: delta.edges.length },
        },
        ["running"],
      );
      return { status: "succeeded" };
    } catch (error) {
      return this.handleFailure(job, projectId, runId, error);
    }
  }

  private async handleFailure(
    job: Job<RunJobData, RunJobResult>,
    projectId: string,
    runId: string,
    error: unknown,
  ): Promise<RunJobResult> {
    if (error instanceof AdapterError) {
      const attemptNumber = job.attemptsMade + 1;
      if (shouldRetry(error.code, attemptNumber)) {
        await this.toolRunsRepository.updateStatus(projectId, runId, { status: "queued" }, ["running"]);
        throw error;
      }
      const decision = getRetryDecision(error.code);
      await this.markTerminal(projectId, runId, "failed", {
        code: error.code,
        message: error.message,
        attempts: attemptNumber,
        maxAttempts: decision.maxAttempts,
      });
      return { status: "failed" };
    }

    if (error instanceof ScopeViolationError || error instanceof NotFoundError) {
      await this.markTerminal(projectId, runId, "failed", { code: error.code, message: error.message });
      return { status: "failed" };
    }

    const message = error instanceof Error ? error.message : String(error);
    await this.markTerminal(projectId, runId, "failed", { code: "UNKNOWN", message });
    return { status: "failed" };
  }

  private async markTerminal(
    projectId: string,
    runId: string,
    status: "failed" | "cancelled",
    error?: unknown,
  ): Promise<void> {
    await this.toolRunsRepository.updateStatus(
      projectId,
      runId,
      { status, finishedAt: new Date(), ...(error !== undefined ? { error } : {}) },
      ["running"],
    );
  }

  async close(): Promise<void> {
    await this.worker.close();
    this.subscriber.disconnect();
  }
}
