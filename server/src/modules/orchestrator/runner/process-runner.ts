import { spawn } from "node:child_process";
import { BoundedBuffer } from "./bounded-buffer";
import type { Runner, RunnerOptions, RunResult } from "./runner.contract";

const MAX_CAPTURED_BYTES = 5 * 1024 * 1024;
const SIGKILL_GRACE_MS = 5_000;

/**
 * Only inherits the minimum the child needs to resolve/run a binary (`EXE-008`) -- never the
 * full parent environment, which could leak secrets (DB credentials, JWT secrets, etc.) into a
 * spawned tool's process.
 */
function buildMinimalEnv(extra?: Record<string, string>): NodeJS.ProcessEnv {
  const { PATH, Path, SystemRoot, TEMP, TMP } = process.env;
  return { PATH, Path, SystemRoot, TEMP, TMP, ...extra };
}

/**
 * Local execution mode: `child_process.spawn` with array-only args (never a shell string,
 * `EXE-001`/`EXE-002`), a hard timeout (SIGTERM, then SIGKILL after a grace period), bounded
 * output capture, and cooperative cancellation via `AbortSignal`.
 */
export class ProcessRunner implements Runner {
  run(options: RunnerOptions): Promise<RunResult> {
    return new Promise((resolve) => {
      const child = spawn(options.command, options.args, {
        env: buildMinimalEnv(options.env),
        shell: false,
        windowsHide: true,
      });

      const stdout = new BoundedBuffer(MAX_CAPTURED_BYTES);
      const stderr = new BoundedBuffer(MAX_CAPTURED_BYTES);
      let timedOut = false;
      let cancelled = false;
      let settled = false;

      const killWithGrace = () => {
        child.kill("SIGTERM");
        setTimeout(() => {
          if (!settled) child.kill("SIGKILL");
        }, SIGKILL_GRACE_MS);
      };

      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        killWithGrace();
      }, options.timeoutMs);

      const onAbort = () => {
        cancelled = true;
        killWithGrace();
      };
      options.signal?.addEventListener("abort", onAbort, { once: true });

      child.stdout.on("data", (chunk: Buffer) => stdout.write(chunk.toString("utf8")));
      child.stderr.on("data", (chunk: Buffer) => stderr.write(chunk.toString("utf8")));

      child.on("error", (error) => {
        settled = true;
        clearTimeout(timeoutHandle);
        options.signal?.removeEventListener("abort", onAbort);
        stderr.write(`\n[spawn error] ${error.message}`);
        resolve({ stdout: stdout.toString(), stderr: stderr.toString(), exitCode: null, timedOut, cancelled });
      });

      child.on("close", (exitCode) => {
        settled = true;
        clearTimeout(timeoutHandle);
        options.signal?.removeEventListener("abort", onAbort);
        resolve({ stdout: stdout.toString(), stderr: stderr.toString(), exitCode, timedOut, cancelled });
      });
    });
  }
}
