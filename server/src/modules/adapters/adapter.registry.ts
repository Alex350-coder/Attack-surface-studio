import type { ToolAdapter } from "./adapter.contract";

/**
 * The single enumeration point for every tool the platform can run (INTEGRATION_SYSTEM.md §5).
 * The Orchestrator resolves adapters by id here and never imports a concrete adapter.
 */
export interface AdapterRegistry {
  get(adapterId: string): ToolAdapter | undefined;
  list(): ToolAdapter[];
}

export class InMemoryAdapterRegistry implements AdapterRegistry {
  private readonly adapters = new Map<string, ToolAdapter>();

  constructor(adapters: ToolAdapter[]) {
    for (const adapter of adapters) {
      this.adapters.set(adapter.id, adapter);
    }
  }

  get(adapterId: string): ToolAdapter | undefined {
    return this.adapters.get(adapterId);
  }

  list(): ToolAdapter[] {
    return [...this.adapters.values()];
  }
}
