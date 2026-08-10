import { describe, expect, it } from "vitest";
import { ProcessRunner } from "../../../src/modules/orchestrator/runner/process-runner";

const runner = new ProcessRunner();

describe("ProcessRunner", () => {
  it("captures stdout and a clean exit code", async () => {
    const result = await runner.run({
      command: process.execPath,
      args: ["-e", "process.stdout.write('hello')"],
      timeoutMs: 5_000,
    });

    expect(result.stdout).toBe("hello");
    expect(result.exitCode).toBe(0);
    expect(result.timedOut).toBe(false);
    expect(result.cancelled).toBe(false);
  });

  it("captures a non-zero exit code and stderr", async () => {
    const result = await runner.run({
      command: process.execPath,
      args: ["-e", "process.stderr.write('boom'); process.exit(2)"],
      timeoutMs: 5_000,
    });

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toBe("boom");
  });

  it("kills a process that exceeds its timeout", async () => {
    const result = await runner.run({
      command: process.execPath,
      args: ["-e", "setTimeout(() => {}, 30_000)"],
      timeoutMs: 200,
    });

    expect(result.timedOut).toBe(true);
    expect(result.cancelled).toBe(false);
    expect(result.exitCode).not.toBe(0);
  }, 15_000);

  it("kills a process when its AbortSignal fires", async () => {
    const controller = new AbortController();
    const runPromise = runner.run({
      command: process.execPath,
      args: ["-e", "setTimeout(() => {}, 30_000)"],
      timeoutMs: 30_000,
      signal: controller.signal,
    });

    setTimeout(() => controller.abort(), 200);
    const result = await runPromise;

    expect(result.cancelled).toBe(true);
    expect(result.timedOut).toBe(false);
  }, 15_000);
});
