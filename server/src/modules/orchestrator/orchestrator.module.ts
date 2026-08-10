import { forwardRef, Inject, Module, type OnModuleDestroy } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ProjectsModule } from "../projects/projects.module";
import { KnowledgeModule } from "../knowledge/knowledge.module";
import { QUEUE_CONNECTION_OPTIONS } from "../../core/queue/queue.tokens";
import type { QueueConnectionOptions } from "../../core/queue/redis-connection";
import { OrchestratorQueue } from "./queue/orchestrator.queue";
import { ORCHESTRATOR_QUEUE } from "./orchestrator.tokens";
import { OrchestratorController } from "./orchestrator.controller";
import { OrchestratorService } from "./orchestrator.service";

/**
 * The API process's side of the Orchestrator (HTTP routes + queue producer). The job processor
 * that actually executes tool runs lives in `orchestrator-worker.module.ts` and is deliberately
 * never imported here -- this module can never accidentally run a tool inline on a request thread.
 */
@Module({
  imports: [forwardRef(() => AuthModule), ProjectsModule, KnowledgeModule],
  controllers: [OrchestratorController],
  providers: [
    {
      provide: ORCHESTRATOR_QUEUE,
      useFactory: (connectionOptions: QueueConnectionOptions) => new OrchestratorQueue(connectionOptions),
      inject: [QUEUE_CONNECTION_OPTIONS],
    },
    OrchestratorService,
  ],
})
export class OrchestratorModule implements OnModuleDestroy {
  constructor(@Inject(ORCHESTRATOR_QUEUE) private readonly queue: OrchestratorQueue) {}

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
