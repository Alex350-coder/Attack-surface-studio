import { execFile } from "node:child_process";
import type { DetectionResult } from "../adapter.contract";

/**
 * Runs `<command> <versionArgs>` to check a local binary's presence/version (EXE-009: detection
 * must never mutate the host, so this only ever runs read-only version flags). Uses `execFile`
 * (never a shell) with a fixed argv, matching the shared runner's own command-injection defense
 * (EXE-001/EXE-002). Never throws -- a missing binary or non-zero exit both resolve to `available: false`.
 */
export function detectLocalBinary(command: string, versionArgs: string[]): Promise<DetectionResult> {
  return new Promise((resolve) => {
    execFile(command, versionArgs, { timeout: 5_000 }, (error, stdout, stderr) => {
      if (error) {
        resolve({ available: false, error: error.message });
        return;
      }
      const version = stdout.trim().split("\n")[0] ?? stderr.trim().split("\n")[0];
      resolve({ available: true, version });
    });
  });
}
