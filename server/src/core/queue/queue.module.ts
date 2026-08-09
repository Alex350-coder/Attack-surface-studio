import { Global, Module } from "@nestjs/common";
import { getQueueConnectionOptions } from "./redis-connection";
import { QUEUE_CONNECTION_OPTIONS } from "./queue.tokens";

/**
 * Exposes BullMQ connection options as a Nest provider (ADR-003) so the Orchestrator's queue
 * producer (API process) and the worker process's consumer can each construct their own BullMQ
 * `Queue`/`Worker` without hardcoding Redis config -- mirrors `DatabaseModule`'s DI shape.
 */
@Global()
@Module({
  providers: [{ provide: QUEUE_CONNECTION_OPTIONS, useValue: getQueueConnectionOptions() }],
  exports: [QUEUE_CONNECTION_OPTIONS],
})
export class QueueModule {}
