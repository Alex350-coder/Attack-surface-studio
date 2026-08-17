import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NmapAdapter } from "../../../src/modules/adapters/nmap/nmap.adapter";
import { UnparseableOutputError, type RunContext } from "../../../src/modules/adapters/adapter.contract";

const FIXTURES_DIR = join(__dirname, "../../../src/modules/adapters/nmap/__fixtures__");

const ctx: RunContext = {
  projectId: "11111111-1111-1111-1111-111111111111",
  runId: "22222222-2222-2222-2222-222222222222",
  target: "198.51.100.10",
  triggeredBy: "33333333-3333-3333-3333-333333333333",
};

describe("NmapAdapter", () => {
  const adapter = new NmapAdapter();

  describe("buildInvocation", () => {
    it("builds a safe args array for a valid target and default options", async () => {
      const invocation = await adapter.buildInvocation({}, ctx);
      expect(invocation.command).toBe("nmap");
      expect(invocation.args).toEqual(["-sT", "-sV", "-oX", "-", "198.51.100.10"]);
      expect(invocation.image).toBe("instrumentisto/nmap:7.95");
    });

    it("rejects an invalid target", async () => {
      await expect(
        adapter.buildInvocation({}, { ...ctx, target: "not a target; rm -rf /" }),
      ).rejects.toThrow(/Invalid Nmap target/);
    });

    it("rejects a malformed port range instead of passing it through", async () => {
      await expect(adapter.buildInvocation({ ports: "22; cat /etc/passwd" }, ctx)).rejects.toThrow(
        /Invalid Nmap options/,
      );
    });

    it("never accepts free-form flag passthrough", async () => {
      const invocation = await adapter.buildInvocation({ flags: ["--script", "vuln"] }, ctx);
      expect(invocation.args).not.toContain("--script");
    });
  });

  describe("parse + normalize", () => {
    it("parses the recorded fixture and normalizes it into the exact expected GraphDelta", async () => {
      const xml = readFileSync(join(FIXTURES_DIR, "scan.xml"), "utf-8");
      const expected = JSON.parse(readFileSync(join(FIXTURES_DIR, "scan.expected.json"), "utf-8")) as unknown;

      const parsed = await adapter.parse({ stdout: xml, stderr: "", exitCode: 0 });
      const delta = await adapter.normalize(parsed, ctx);

      expect(delta).toEqual(expected);
    });

    it("neutralizes XXE by refusing to parse external entities rather than expanding them", async () => {
      const xml = readFileSync(join(FIXTURES_DIR, "xxe-attempt.xml"), "utf-8");

      // `processEntities: false` makes the parser reject external entities outright instead of
      // resolving them -- the file contents (e.g. /etc/passwd) can never reach the parsed output.
      await expect(adapter.parse({ stdout: xml, stderr: "", exitCode: 0 })).rejects.toThrow(UnparseableOutputError);
    });

    it("throws UnparseableOutputError on malformed XML", async () => {
      await expect(adapter.parse({ stdout: "<not-xml", stderr: "", exitCode: 0 })).rejects.toThrow(
        UnparseableOutputError,
      );
    });

    it("throws UnparseableOutputError when the document doesn't match the -oX shape", async () => {
      await expect(
        adapter.parse({ stdout: "<somethingElse></somethingElse>", stderr: "", exitCode: 0 }),
      ).rejects.toThrow(UnparseableOutputError);
    });
  });

  it("detects unavailability without throwing when the binary is missing", async () => {
    const detection = await adapter.detect("local");
    expect(typeof detection.available).toBe("boolean");
  });

  it("reports itself available for docker mode (image-based, no local probe)", async () => {
    const detection = await adapter.detect("docker");
    expect(detection.available).toBe(true);
  });
});
