import { Inject, Injectable } from "@nestjs/common";
import { NotFoundError, ValidationError } from "../../core/http/domain-error";
import { ADAPTER_REGISTRY } from "./adapters.tokens";
import type { AdapterRegistry } from "./adapter.registry";
import type { DetectionResult, ExecutionMode } from "./adapter.contract";
import { TOOL_CONFIGS_REPOSITORY } from "./adapters.tokens";
import type { ToolConfigRow, ToolConfigsRepository } from "./repositories/tool-configs.repository";

export interface ToolListing {
  id: string;
  displayName: string;
  supportedModes: ExecutionMode[];
}

@Injectable()
export class ToolConfigService {
  constructor(
    @Inject(ADAPTER_REGISTRY) private readonly registry: AdapterRegistry,
    @Inject(TOOL_CONFIGS_REPOSITORY) private readonly toolConfigsRepository: ToolConfigsRepository,
  ) {}

  /** Static registry read -- no DB, no privilege boundary (INTEGRATION_SYSTEM.md §5). */
  listTools(): ToolListing[] {
    return this.registry.list().map((adapter) => ({
      id: adapter.id,
      displayName: adapter.displayName,
      supportedModes: adapter.supportedModes,
    }));
  }

  private getAdapterOrThrow(adapterId: string) {
    const adapter = this.registry.get(adapterId);
    if (!adapter) {
      throw new NotFoundError(`No adapter registered with id "${adapterId}"`);
    }
    return adapter;
  }

  /** Presence + version probe only -- never mutates the host (EXE-009). */
  async detectTool(adapterId: string, mode: ExecutionMode): Promise<DetectionResult> {
    const adapter = this.getAdapterOrThrow(adapterId);
    return adapter.detect(mode);
  }

  async getConfig(projectId: string, adapterId: string): Promise<ToolConfigRow | null> {
    this.getAdapterOrThrow(adapterId);
    return this.toolConfigsRepository.findByProjectAndAdapter(projectId, adapterId);
  }

  async setConfig(
    projectId: string,
    adapterId: string,
    input: { executionMode: ExecutionMode; config: Record<string, unknown> },
  ): Promise<ToolConfigRow> {
    const adapter = this.getAdapterOrThrow(adapterId);
    if (!adapter.supportedModes.includes(input.executionMode)) {
      throw new ValidationError(`Adapter "${adapterId}" does not support execution mode "${input.executionMode}"`);
    }
    return this.toolConfigsRepository.upsert({
      projectId,
      adapterId,
      executionMode: input.executionMode,
      config: input.config,
    });
  }
}
