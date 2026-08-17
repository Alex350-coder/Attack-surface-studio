import { z } from "zod";
import {
  InvalidInputError,
  type DetectionResult,
  type ExecutionMode,
  type GraphDelta,
  type Invocation,
  type ParsedResult,
  type RawOutputRef,
  type RunContext,
  type ToolAdapter,
} from "../adapter.contract";
import { detectLocalBinary } from "../shared/detect-binary";
import { parseFfufOutput } from "./ffuf.parse";
import { normalizeFfufOutput } from "./ffuf.normalize";

/** Pinned, official image (EXE-007: never a user-controlled reference). */
const DOCKER_IMAGE = "ghcr.io/ffuf/ffuf:2.1.0";

/**
 * Server-side allow-list of wordlists (EXE-002/EXE-006): adapters never accept an arbitrary
 * filesystem path from a caller, which would otherwise be a path-traversal / arbitrary-file-read
 * vector via `-w`. Paths are baked into the Docker image / expected host tool install.
 */
const WORDLISTS = {
  "common-small": "/usr/share/wordlists/dirb/common.txt",
  "common-medium": "/usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt",
} as const;

const ffufOptionsSchema = z.object({
  wordlist: z.enum(["common-small", "common-medium"]).default("common-small"),
  matchStatusCodes: z
    .string()
    .regex(/^\d{3}(,\d{3})*$/, "Invalid status code list")
    .default("200,204,301,302,307,401,403"),
  timeoutMs: z.number().int().min(1_000).max(600_000).default(120_000),
});

const TARGET_URL_PATTERN = /^https?:\/\/[a-z0-9.-]+(:\d+)?(\/.*)?$/i;

function isValidTargetUrl(target: string): boolean {
  return TARGET_URL_PATTERN.test(target);
}

/**
 * ffuf adapter (INTEGRATION_SYSTEM.md §6): fuzzes a target URL against an allow-listed wordlist,
 * emits `asset`/`host` nodes for discovered paths. `-of json -o -` writes JSON to stdout so no
 * scan artifact ever touches disk.
 */
export class FfufAdapter implements ToolAdapter {
  readonly id = "ffuf";
  readonly displayName = "ffuf";
  readonly supportedModes: ExecutionMode[] = ["local", "docker"];

  detect(mode: ExecutionMode): Promise<DetectionResult> {
    if (mode === "docker") {
      return Promise.resolve({ available: true, version: DOCKER_IMAGE });
    }
    return detectLocalBinary("ffuf", ["-V"]);
  }

  // Must be async (not just Promise-returning) so the InvalidInputError throw below is a
  // rejected promise, matching the ToolAdapter contract.
  // eslint-disable-next-line @typescript-eslint/require-await
  async buildInvocation(input: unknown, ctx: RunContext): Promise<Invocation> {
    if (!isValidTargetUrl(ctx.target)) {
      throw new InvalidInputError(`Invalid ffuf target URL: "${ctx.target}"`);
    }
    const result = ffufOptionsSchema.safeParse(input ?? {});
    if (!result.success) {
      throw new InvalidInputError(`Invalid ffuf options: ${result.error.message}`);
    }
    const options = result.data;
    const wordlistPath = WORDLISTS[options.wordlist];

    const fuzzUrl = ctx.target.endsWith("/") ? `${ctx.target}FUZZ` : `${ctx.target}/FUZZ`;
    const args = [
      "-u",
      fuzzUrl,
      "-w",
      wordlistPath,
      "-mc",
      options.matchStatusCodes,
      "-of",
      "json",
      "-o",
      "-",
    ];

    return {
      command: "ffuf",
      args,
      timeoutMs: options.timeoutMs,
      image: DOCKER_IMAGE,
    };
  }

  parse(raw: RawOutputRef): Promise<ParsedResult> {
    return parseFfufOutput(raw);
  }

  normalize(parsed: ParsedResult, ctx: RunContext): Promise<GraphDelta> {
    return normalizeFfufOutput(parsed, ctx);
  }
}
