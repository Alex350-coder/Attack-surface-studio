import { Inject, Module, type OnModuleDestroy } from "@nestjs/common";
import { ProjectsModule } from "../projects/projects.module";
import { KnowledgeModule } from "../knowledge/knowledge.module";
import { AdaptersModule } from "../adapters/adapters.module";
import { PROJECTS_REPOSITORY } from "../projects/projects.tokens";
import { TOOL_RUNS_REPOSITORY } from "../knowledge/knowledge.tokens";
import { ADAPTER_REGISTRY } from "../adapters/adapters.tokens";
import type { ProjectsRepository } from "../projects/repositories/projects.repository";
import type { ToolRunsRepository } from "../knowledge/repositories/tool-runs.repository";
import type { AdapterRegistry } from "../adapters/adapter.registry";
import { QUEUE_CONNECTION_OPTIONS } from "../../core/queue/queue.tokens";
import type { QueueConnectionOptions } from "../../core/queue/redis-connection";
import { ProcessRunner } from "./runner/process-runner";
import { DockerRunner } from "./runner/docker-runner";
import { RunnerService } from "./runner/runner.service";
import { PROCESS_RUNNER, DOCKER_RUNNER, RUNNER_SELECTOR } from "./runner/runner.tokens";
import type { Runner, RunnerSelector } from "./runner/runner.contract";
import { OrchestratorWorker } from "./queue/orchestrator.worker";
import { ORCHESTRATOR_WORKER } from "./orchestrator.tokens";

/**
 * The worker process's composition root. Deliberately **not** imported by `AppModule` -- this is
 * what makes the job processor genuinely run in a separate OS process (`worker-main.ts`) from the
 * HTTP API, so a request handler can never block on (or be blocked by) tool execution.
 */
@Module({
  imports: [ProjectsModule, KnowledgeModule, AdaptersModule],
  providers: [
    { provide: PROCESS_RUNNER, useFactory: () => new ProcessRunner() },
    { provide: DOCKER_RUNNER, useFactory: () => new DockerRunner() },
    {
      provide: RUNNER_SELECTOR,
      useFactory: (processRunner: Runner, dockerRunner: Runner) => new RunnerService(processRunner, dockerRunner),
      inject: [PROCESS_RUNNER, DOCKER_RUNNER],
    },
    {
      provide: ORCHESTRATOR_WORKER,
      useFactory: (
        connectionOptions: QueueConnectionOptions,
        adapterRegistry: AdapterRegistry,
        runner: RunnerSelector,
        toolRunsRepository: ToolRunsRepository,
        projectsRepository: ProjectsRepository,
      ) => new OrchestratorWorker(connectionOptions, adapterRegistry, runner, toolRunsRepository, projectsRepository),
      inject: [QUEUE_CONNECTION_OPTIONS, ADAPTER_REGISTRY, RUNNER_SELECTOR, TOOL_RUNS_REPOSITORY, PROJECTS_REPOSITORY],
    },
  ],
  exports: [ORCHESTRATOR_WORKER],
})
export class OrchestratorWorkerModule implements OnModuleDestroy {
  constructor(@Inject(ORCHESTRATOR_WORKER) private readonly worker: OrchestratorWorker) {}

  async onModuleDestroy(): Promise<void> {
    await this.worker.close();
  }
}
