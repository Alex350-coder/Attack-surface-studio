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
import { isValidCidr, isValidHostname, isValidIp } from "../../shared/target-format";
import { detectLocalBinary } from "../shared/detect-binary";
import { parseNucleiOutput } from "./nuclei.parse";
import { normalizeNucleiOutput } from "./nuclei.normalize";

/** Pinned, official image (EXE-007: never a user-controlled reference). */
const DOCKER_IMAGE = "projectdiscovery/nuclei:v3.3.7";

/**
 * Allow-listed template tags only (EXE-002/EXE-006): adapters never accept an arbitrary `-t`
 * filesystem path from a caller, which would otherwise let a caller point Nuclei at attacker
 * -controlled template files.
 */
const TEMPLATE_TAGS = ["cve", "exposure", "misconfig", "default-login", "tech"] as const;

const nucleiOptionsSchema = z.object({
  tags: z.array(z.enum(TEMPLATE_TAGS)).min(1).default(["exposure", "misconfig"]),
  severityFilter: z.enum(["info", "low", "medium", "high", "critical"]).optional(),
  timeoutMs: z.number().int().min(1_000).max(1_800_000).default(300_000),
});

function isValidTarget(target: string): boolean {
  if (isValidIp(target) || isValidCidr(target) || isValidHostname(target)) return true;
  return /^https?:\/\/[a-z0-9.-]+(:\d+)?(\/.*)?$/i.test(target);
}

/**
 * Nuclei adapter (INTEGRATION_SYSTEM.md §6): runs template-based checks against a target, emits
 * `finding`/`criticalFinding` nodes. `-jsonl -o -` writes JSON lines to stdout so no scan
 * artifact ever touches disk.
 */
export class NucleiAdapter implements ToolAdapter {
  readonly id = "nuclei";
  readonly displayName = "Nuclei";
  readonly supportedModes: ExecutionMode[] = ["local", "docker"];

  detect(mode: ExecutionMode): Promise<DetectionResult> {
    if (mode === "docker") {
      return Promise.resolve({ available: true, version: DOCKER_IMAGE });
    }
    return detectLocalBinary("nuclei", ["-version"]);
  }

  // Must be async (not just Promise-returning) so the InvalidInputError throw below is a
  // rejected promise, matching the ToolAdapter contract.
  // eslint-disable-next-line @typescript-eslint/require-await
  async buildInvocation(input: unknown, ctx: RunContext): Promise<Invocation> {
    if (!isValidTarget(ctx.target)) {
      throw new InvalidInputError(`Invalid Nuclei target: "${ctx.target}"`);
    }
    const result = nucleiOptionsSchema.safeParse(input ?? {});
    if (!result.success) {
      throw new InvalidInputError(`Invalid Nuclei options: ${result.error.message}`);
    }
    const options = result.data;

    const args = ["-u", ctx.target, "-tags", options.tags.join(","), "-jsonl", "-o", "-", "-silent"];
    if (options.severityFilter) {
      args.push("-severity", options.severityFilter);
    }

    return {
      command: "nuclei",
      args,
      timeoutMs: options.timeoutMs,
      image: DOCKER_IMAGE,
    };
  }

  parse(raw: RawOutputRef): Promise<ParsedResult> {
    return parseNucleiOutput(raw);
  }

  normalize(parsed: ParsedResult, ctx: RunContext): Promise<GraphDelta> {
    return normalizeNucleiOutput(parsed, ctx);
  }
}
