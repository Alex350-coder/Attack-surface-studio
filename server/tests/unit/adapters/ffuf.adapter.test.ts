import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FfufAdapter } from "../../../src/modules/adapters/ffuf/ffuf.adapter";
import { UnparseableOutputError, type RunContext } from "../../../src/modules/adapters/adapter.contract";

const FIXTURES_DIR = join(__dirname, "../../../src/modules/adapters/ffuf/__fixtures__");

const ctx: RunContext = {
  projectId: "11111111-1111-1111-1111-111111111111",
  runId: "22222222-2222-2222-2222-222222222222",
  target: "https://target.example.com",
  triggeredBy: "33333333-3333-3333-3333-333333333333",
};

describe("FfufAdapter", () => {
  const adapter = new FfufAdapter();

  describe("buildInvocation", () => {
    it("builds a safe args array for a valid target and default options", async () => {
      const invocation = await adapter.buildInvocation({}, ctx);
      expect(invocation.command).toBe("ffuf");
      expect(invocation.args).toEqual([
        "-u",
        "https://target.example.com/FUZZ",
        "-w",
        "/usr/share/wordlists/dirb/common.txt",
        "-mc",
        "200,204,301,302,307,401,403",
        "-of",
        "json",
        "-o",
        "-",
      ]);
      expect(invocation.image).toBe("ghcr.io/ffuf/ffuf:2.1.0");
    });

    it("rejects a non-URL target", async () => {
      await expect(adapter.buildInvocation({}, { ...ctx, target: "not-a-url; rm -rf /" })).rejects.toThrow(
        /Invalid ffuf target URL/,
      );
    });

    it("never accepts a raw filesystem path for the wordlist -- only the allow-listed enum", async () => {
      await expect(adapter.buildInvocation({ wordlist: "/etc/passwd" }, ctx)).rejects.toThrow(/Invalid ffuf options/);
    });

    it("rejects a malformed status-code filter instead of passing it through", async () => {
      await expect(adapter.buildInvocation({ matchStatusCodes: "200; cat /etc/passwd" }, ctx)).rejects.toThrow(
        /Invalid ffuf options/,
      );
    });
  });

  describe("parse + normalize", () => {
    it("parses the recorded fixture and normalizes it into the exact expected GraphDelta", async () => {
      const json = readFileSync(join(FIXTURES_DIR, "scan.json"), "utf-8");
      const expected = JSON.parse(readFileSync(join(FIXTURES_DIR, "scan.expected.json"), "utf-8")) as unknown;

      const parsed = await adapter.parse({ stdout: json, stderr: "", exitCode: 0 });
      const delta = await adapter.normalize(parsed, ctx);

      expect(delta).toEqual(expected);
    });

    it("throws UnparseableOutputError on malformed JSON", async () => {
      await expect(adapter.parse({ stdout: "not json", stderr: "", exitCode: 0 })).rejects.toThrow(
        UnparseableOutputError,
      );
    });

    it("throws UnparseableOutputError when the document doesn't match the -of json shape", async () => {
      await expect(adapter.parse({ stdout: '{"foo":"bar"}', stderr: "", exitCode: 0 })).rejects.toThrow(
        UnparseableOutputError,
      );
    });
  });

  it("reports itself available for docker mode (image-based, no local probe)", async () => {
    const detection = await adapter.detect("docker");
    expect(detection.available).toBe(true);
  });
});
