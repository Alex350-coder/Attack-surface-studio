import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";
import { AdaptersModule } from "../../../src/modules/adapters/adapters.module";
import { ADAPTER_REGISTRY } from "../../../src/modules/adapters/adapters.tokens";
import type { AdapterRegistry } from "../../../src/modules/adapters/adapter.registry";

describe("AdaptersModule", () => {
  it("registers the stub adapter plus every Phase 7 real adapter", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AdaptersModule] }).compile();
    const registry = moduleRef.get<AdapterRegistry>(ADAPTER_REGISTRY);

    expect(registry.list().map((adapter) => adapter.id).sort()).toEqual(["ffuf", "nmap", "nuclei", "stub"]);
  });
});
