import { Module } from "@nestjs/common";
import { InMemoryAdapterRegistry } from "./adapter.registry";
import { StubAdapter } from "./stub/stub.adapter";
import { NmapAdapter } from "./nmap/nmap.adapter";
import { FfufAdapter } from "./ffuf/ffuf.adapter";
import { NucleiAdapter } from "./nuclei/nuclei.adapter";
import { ADAPTER_REGISTRY } from "./adapters.tokens";

/**
 * Registers every `ToolAdapter` the platform can run (INTEGRATION_SYSTEM.md §5). This is the
 * only place a concrete adapter is ever imported -- the Orchestrator resolves adapters by id
 * from `AdapterRegistry` and never imports one directly (INTEGRATION_SYSTEM.md §1).
 */
@Module({
  providers: [
    {
      provide: ADAPTER_REGISTRY,
      useFactory: () =>
        new InMemoryAdapterRegistry([new StubAdapter(), new NmapAdapter(), new FfufAdapter(), new NucleiAdapter()]),
    },
  ],
  exports: [ADAPTER_REGISTRY],
})
export class AdaptersModule {}
