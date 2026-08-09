import { Module } from "@nestjs/common";
import { InMemoryAdapterRegistry } from "./adapter.registry";
import { StubAdapter } from "./stub/stub.adapter";
import { ADAPTER_REGISTRY } from "./adapters.tokens";

/**
 * Registers every `ToolAdapter` the platform can run (INTEGRATION_SYSTEM.md §5). Phase 6 only
 * registers the harmless `StubAdapter` used to exercise the Orchestrator end-to-end; real tool
 * adapters (nmap, ffuf, nuclei) are added here, and only here, in Phase 7.
 */
@Module({
  providers: [
    {
      provide: ADAPTER_REGISTRY,
      useFactory: () => new InMemoryAdapterRegistry([new StubAdapter()]),
    },
  ],
  exports: [ADAPTER_REGISTRY],
})
export class AdaptersModule {}
