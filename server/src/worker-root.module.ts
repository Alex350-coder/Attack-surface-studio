import { Module } from "@nestjs/common";
import { ConfigModule } from "./core/config/config.module";
import { LoggingModule } from "./core/logging/logging.module";
import { DatabaseModule } from "./core/database/database.module";
import { QueueModule } from "./core/queue/queue.module";
import { OrchestratorWorkerModule } from "./modules/orchestrator/orchestrator-worker.module";

/**
 * The worker process's composition root (`worker-main.ts`). Deliberately separate from
 * `app.module.ts`: the worker never serves HTTP, so it skips `ThrottlerModule`, every
 * controller-bearing feature module, and the RLS/correlation-id middleware, while sharing the
 * same config/logging/database/queue foundation as the API process.
 */
@Module({
  imports: [ConfigModule, LoggingModule, DatabaseModule, QueueModule, OrchestratorWorkerModule],
})
export class WorkerRootModule {}
