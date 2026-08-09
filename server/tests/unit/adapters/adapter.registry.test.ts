import { describe, expect, it } from "vitest";
import { InMemoryAdapterRegistry } from "../../../src/modules/adapters/adapter.registry";
import { StubAdapter } from "../../../src/modules/adapters/stub/stub.adapter";

describe("InMemoryAdapterRegistry", () => {
  it("resolves a registered adapter by id", () => {
    const registry = new InMemoryAdapterRegistry([new StubAdapter()]);
    expect(registry.get("stub")?.id).toBe("stub");
  });

  it("returns undefined for an unknown adapter id", () => {
    const registry = new InMemoryAdapterRegistry([new StubAdapter()]);
    expect(registry.get("nmap")).toBeUndefined();
  });

  it("lists every registered adapter", () => {
    const registry = new InMemoryAdapterRegistry([new StubAdapter()]);
    expect(registry.list().map((a) => a.id)).toEqual(["stub"]);
  });
});
