import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NucleiAdapter } from "../../../src/modules/adapters/nuclei/nuclei.adapter";
import { UnparseableOutputError, type RunContext } from "../../../src/modules/adapters/adapter.contract";

const FIXTURES_DIR = join(__dirname, "../../../src/modules/adapters/nuclei/__fixtures__");

const ctx: RunContext = {
  projectId: "11111111-1111-1111-1111-111111111111",
  runId: "22222222-2222-2222-2222-222222222222",
  target: "https://target.example.com",
  triggeredBy: "33333333-3333-3333-3333-333333333333",
};

describe("NucleiAdapter", () => {
  const adapter = new NucleiAdapter();

  describe("buildInvocation", () => {
    it("builds a safe args array for a valid target and default options", async () => {
      const invocation = await adapter.buildInvocation({}, ctx);
      expect(invocation.command).toBe("nuclei");
      expect(invocation.args).toEqual([
        "-u",
        "https://target.example.com",
        "-tags",
        "exposure,misconfig",
        "-jsonl",
        "-o",
        "-",
        "-silent",
      ]);
      expect(invocation.image).toBe("projectdiscovery/nuclei:v3.3.7");
    });

    it("rejects an invalid target", async () => {
      await expect(adapter.buildInvocation({}, { ...ctx, target: "not a target; rm -rf /" })).rejects.toThrow(
        /Invalid Nuclei target/,
      );
    });

    it("never accepts an arbitrary template-file path -- only the allow-listed tag enum", async () => {
      await expect(adapter.buildInvocation({ tags: ["/etc/passwd"] }, ctx)).rejects.toThrow(/Invalid Nuclei options/);
    });
  });

  describe("parse + normalize", () => {
    it("parses the recorded fixture and normalizes it into the exact expected GraphDelta", async () => {
      const jsonl = readFileSync(join(FIXTURES_DIR, "scan.jsonl"), "utf-8");
      const expected = JSON.parse(readFileSync(join(FIXTURES_DIR, "scan.expected.json"), "utf-8")) as unknown;

      const parsed = await adapter.parse({ stdout: jsonl, stderr: "", exitCode: 0 });
      const delta = await adapter.normalize(parsed, ctx);

      expect(delta).toEqual(expected);
    });

    it("tolerates non-JSON and invalid lines, keeping the valid prefix instead of discarding it (EXE-013)", async () => {
      const jsonl = readFileSync(join(FIXTURES_DIR, "scan-with-garbage.jsonl"), "utf-8");

      const parsed = await adapter.parse({ stdout: jsonl, stderr: "", exitCode: 0 });
      const delta = await adapter.normalize(parsed, ctx);

      expect(delta.nodes.some((n) => n.type === "finding")).toBe(true);
    });

    it("returns an empty delta for empty output (no matches found)", async () => {
      const parsed = await adapter.parse({ stdout: "", stderr: "", exitCode: 0 });
      const delta = await adapter.normalize(parsed, ctx);
      expect(delta).toEqual({ nodes: [], edges: [] });
    });

    it("throws UnparseableOutputError when every line is invalid", async () => {
      await expect(
        adapter.parse({ stdout: "not json\nalso not json", stderr: "", exitCode: 0 }),
      ).rejects.toThrow(UnparseableOutputError);
    });
  });

  it("reports itself available for docker mode (image-based, no local probe)", async () => {
    const detection = await adapter.detect("docker");
    expect(detection.available).toBe(true);
  });
});
