import { describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { StubAdapter } from "../../../src/modules/adapters/stub/stub.adapter";
import type { RunContext } from "../../../src/modules/adapters/adapter.contract";

const execFileAsync = promisify(execFile);

const ctx: RunContext = {
  projectId: "11111111-1111-1111-1111-111111111111",
  runId: "22222222-2222-2222-2222-222222222222",
  target: "example.com",
  triggeredBy: "33333333-3333-3333-3333-333333333333",
};

describe("StubAdapter", () => {
  const adapter = new StubAdapter();

  it("reports itself available for local mode only", async () => {
    expect((await adapter.detect("local")).available).toBe(true);
    expect((await adapter.detect("docker")).available).toBe(false);
  });

  it("rejects invalid options via buildInvocation", async () => {
    await expect(adapter.buildInvocation({ delayMs: -1 }, ctx)).rejects.toThrow(/Invalid stub adapter options/);
  });

  it("builds a spawnable invocation and actually runs to produce parseable output", async () => {
    const invocation = await adapter.buildInvocation({ delayMs: 0 }, ctx);
    const { stdout } = await execFileAsync(invocation.command, invocation.args, { timeout: invocation.timeoutMs });

    const parsed = await adapter.parse({ stdout, stderr: "", exitCode: 0 });
    const delta = await adapter.normalize(parsed, ctx);

    expect(delta.nodes.some((n) => n.identityKey === "asset:example.com")).toBe(true);
    expect(delta.edges).toHaveLength(1);
    expect(delta.edges[0]?.sourceIdentityKey).toBe("asset:example.com");
  }, 15_000);

  it("throws UnparseableOutputError on malformed stdout", async () => {
    await expect(adapter.parse({ stdout: "not json", stderr: "", exitCode: 0 })).rejects.toThrow(
      /unparseable output/i,
    );
  });
});
