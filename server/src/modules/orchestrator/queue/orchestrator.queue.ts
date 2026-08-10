import { Logger } from "@nestjs/common";
import { Queue } from "bullmq";
import type IORedis from "ioredis";
import { createRedisConnection } from "../../../core/queue/redis-connection";
import type { QueueConnectionOptions } from "../../../core/queue/redis-connection";
import { runCancelChannel, TOOL_RUNS_QUEUE_NAME } from "../../../core/queue/queue.tokens";
import type { RunJobData, RunJobResult } from "./run-job.types";

const RETRY_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = 5_000;

/**
 * The API process's side of the job queue. BullMQ has no built-in "cancel a running job"
 * primitive, so cancellation is a separate Redis pub/sub signal (`runCancelChannel`) the worker's
 * active job subscribes to -- `enqueue`/`requestCancel` are the only two operations the API needs.
 */
export class OrchestratorQueue {
  private readonly logger = new Logger(OrchestratorQueue.name);
  private readonly queue: Queue<RunJobData, RunJobResult>;
  private readonly publisher: IORedis;

  constructor(connectionOptions: QueueConnectionOptions) {
    this.queue = new Queue<RunJobData, RunJobResult>(TOOL_RUNS_QUEUE_NAME, {
      connection: connectionOptions,
    });
    this.publisher = createRedisConnection();

    // ioredis/BullMQ emit "error" on connection issues; Node's EventEmitter rethrows an
    // unhandled "error" event as an uncaught exception, which would otherwise crash the whole
    // API process on a transient Redis blip.
    this.queue.on("error", (error) => this.logger.error("Queue connection error", error));
    this.publisher.on("error", (error) => this.logger.error("Cancel-signal publisher connection error", error));
  }

  async enqueue(data: RunJobData): Promise<void> {
    await this.queue.add(data.runId, data, {
      jobId: data.runId,
      attempts: RETRY_ATTEMPTS,
      backoff: { type: "fixed", delay: RETRY_BACKOFF_MS },
      removeOnComplete: true,
      removeOnFail: true,
    });
  }

  async requestCancel(runId: string): Promise<void> {
    await this.publisher.publish(runCancelChannel(runId), "cancel");
  }

  async close(): Promise<void> {
    await this.queue.close();
    this.publisher.disconnect();
  }
}
