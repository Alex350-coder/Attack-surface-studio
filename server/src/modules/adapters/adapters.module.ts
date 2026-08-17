import { forwardRef, Module } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../../core/database/database.tokens";
import type { Database } from "../../core/database/client";
import { AuthModule } from "../auth/auth.module";
import { ProjectsModule } from "../projects/projects.module";
import { InMemoryAdapterRegistry } from "./adapter.registry";
import { StubAdapter } from "./stub/stub.adapter";
import { NmapAdapter } from "./nmap/nmap.adapter";
import { FfufAdapter } from "./ffuf/ffuf.adapter";
import { NucleiAdapter } from "./nuclei/nuclei.adapter";
import { ADAPTER_REGISTRY, TOOL_CONFIGS_REPOSITORY } from "./adapters.tokens";
import { DrizzleToolConfigsRepository } from "./repositories/tool-configs.repository";
import { ToolConfigService } from "./tool-config.service";
import { ToolConfigController } from "./tool-config.controller";

/**
 * Registers every `ToolAdapter` the platform can run (INTEGRATION_SYSTEM.md §5). This is the
 * only place a concrete adapter is ever imported -- the Orchestrator resolves adapters by id
 * from `AdapterRegistry` and never imports one directly (INTEGRATION_SYSTEM.md §1).
 */
@Module({
  imports: [forwardRef(() => AuthModule), ProjectsModule],
  controllers: [ToolConfigController],
  providers: [
    {
      provide: ADAPTER_REGISTRY,
      useFactory: () =>
        new InMemoryAdapterRegistry([new StubAdapter(), new NmapAdapter(), new FfufAdapter(), new NucleiAdapter()]),
    },
    {
      provide: TOOL_CONFIGS_REPOSITORY,
      useFactory: (db: Database) => new DrizzleToolConfigsRepository(db),
      inject: [DATABASE_CONNECTION],
    },
    ToolConfigService,
  ],
  exports: [ADAPTER_REGISTRY],
})
export class AdaptersModule {}
