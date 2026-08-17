import { describe, expect, it, vi } from "vitest";
import { ToolConfigService } from "../../../src/modules/adapters/tool-config.service";
import { NotFoundError, ValidationError } from "../../../src/core/http/domain-error";
import type { AdapterRegistry } from "../../../src/modules/adapters/adapter.registry";
import type { ToolAdapter } from "../../../src/modules/adapters/adapter.contract";
import type { ToolConfigsRepository } from "../../../src/modules/adapters/repositories/tool-configs.repository";

function makeAdapter(overrides: Partial<ToolAdapter> = {}): ToolAdapter {
  return {
    id: "nmap",
    displayName: "Nmap",
    supportedModes: ["local", "docker"],
    detect: vi.fn().mockResolvedValue({ available: true, version: "7.95" }),
    buildInvocation: vi.fn(),
    parse: vi.fn(),
    normalize: vi.fn(),
    ...overrides,
  };
}

describe("ToolConfigService", () => {
  it("lists registered adapters via the registry, not the DB", () => {
    const adapter = makeAdapter();
    const registry: AdapterRegistry = { get: vi.fn(), list: vi.fn().mockReturnValue([adapter]) };
    const repository = {} as ToolConfigsRepository;
    const service = new ToolConfigService(registry, repository);

    expect(service.listTools()).toEqual([{ id: "nmap", displayName: "Nmap", supportedModes: ["local", "docker"] }]);
  });

  it("delegates detection to the adapter's detect() and never touches the DB", async () => {
    const detect = vi.fn().mockResolvedValue({ available: true, version: "7.95" });
    const adapter = makeAdapter({ detect });
    const registry: AdapterRegistry = { get: vi.fn().mockReturnValue(adapter), list: vi.fn() };
    const repository = {} as ToolConfigsRepository;
    const service = new ToolConfigService(registry, repository);

    const result = await service.detectTool("nmap", "local");

    expect(detect).toHaveBeenCalledWith("local");
    expect(result).toEqual({ available: true, version: "7.95" });
  });

  it("throws NotFoundError when detecting an unregistered adapter", async () => {
    const registry: AdapterRegistry = { get: vi.fn().mockReturnValue(undefined), list: vi.fn() };
    const repository = {} as ToolConfigsRepository;
    const service = new ToolConfigService(registry, repository);

    await expect(service.detectTool("does-not-exist", "local")).rejects.toThrow(NotFoundError);
  });

  it("rejects a config write for an execution mode the adapter doesn't support", async () => {
    const adapter = makeAdapter({ supportedModes: ["docker"] });
    const registry: AdapterRegistry = { get: vi.fn().mockReturnValue(adapter), list: vi.fn() };
    const upsert = vi.fn();
    const repository = { upsert } as unknown as ToolConfigsRepository;
    const service = new ToolConfigService(registry, repository);

    await expect(
      service.setConfig("11111111-1111-1111-1111-111111111111", "nmap", { executionMode: "local", config: {} }),
    ).rejects.toThrow(ValidationError);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("upserts a valid config write", async () => {
    const adapter = makeAdapter();
    const registry: AdapterRegistry = { get: vi.fn().mockReturnValue(adapter), list: vi.fn() };
    const upsert = vi.fn().mockResolvedValue({
      id: "row-1",
      projectId: "11111111-1111-1111-1111-111111111111",
      adapterId: "nmap",
      executionMode: "docker",
      config: { scanType: "connect" },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const repository = { upsert } as unknown as ToolConfigsRepository;
    const service = new ToolConfigService(registry, repository);

    const result = await service.setConfig("11111111-1111-1111-1111-111111111111", "nmap", {
      executionMode: "docker",
      config: { scanType: "connect" },
    });

    expect(upsert).toHaveBeenCalledWith({
      projectId: "11111111-1111-1111-1111-111111111111",
      adapterId: "nmap",
      executionMode: "docker",
      config: { scanType: "connect" },
    });
    expect(result.adapterId).toBe("nmap");
  });
});
