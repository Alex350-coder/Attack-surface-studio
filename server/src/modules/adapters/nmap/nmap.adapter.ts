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
import { parseNmapOutput } from "./nmap.parse";
import { normalizeNmapOutput } from "./nmap.normalize";

/** Pinned, official image (EXE-007: never a user-controlled reference). */
const DOCKER_IMAGE = "instrumentisto/nmap:7.95";

/**
 * Allow-listed scan options only -- never free-form flag passthrough (EXE-002). `scanType`
 * selects a fixed, safe flag; `ports` is a bounded, validated range/list; `detectServices`/
 * `detectOs` toggle single well-known flags.
 */
const nmapOptionsSchema = z.object({
  ports: z
    .string()
    .regex(/^(\d{1,5})(-(\d{1,5}))?(,(\d{1,5})(-(\d{1,5}))?)*$/, "Invalid port range/list")
    .optional(),
  scanType: z.enum(["connect", "syn"]).default("connect"),
  detectServices: z.boolean().default(true),
  detectOs: z.boolean().default(false),
  timeoutMs: z.number().int().min(1_000).max(600_000).default(120_000),
});

function isValidTarget(target: string): boolean {
  return isValidIp(target) || isValidCidr(target) || isValidHostname(target);
}

/**
 * Nmap adapter (INTEGRATION_SYSTEM.md §6): scans a host/CIDR, emits `ip`/`host`/`os`/`port`/
 * `service` nodes. `-oX -` writes XML to stdout so no scan artifact ever touches disk.
 *
 * Known limitation: `scanType: "syn"` (`-sS`) needs raw-socket capability, which the shared
 * runner's Docker mode explicitly drops (`CapDrop: ["ALL"]`, non-root `65534:65534` --
 * `DockerRunner`). It will fail at run time in Docker mode; `"connect"` (`-sT`) always works.
 * Not fixed here since it would mean weakening shared runner isolation for one adapter (EXE-004).
 */
export class NmapAdapter implements ToolAdapter {
  readonly id = "nmap";
  readonly displayName = "Nmap";
  readonly supportedModes: ExecutionMode[] = ["local", "docker"];

  detect(mode: ExecutionMode): Promise<DetectionResult> {
    if (mode === "docker") {
      // Docker-mode availability depends on the Docker daemon/image pull, which happens at run
      // time via DockerRunner; the adapter has no Docker client of its own to probe with.
      return Promise.resolve({ available: true, version: DOCKER_IMAGE });
    }
    return detectLocalBinary("nmap", ["--version"]);
  }

  // Must be async (not just Promise-returning) so the InvalidInputError throw below is a
  // rejected promise, matching the ToolAdapter contract.
  // eslint-disable-next-line @typescript-eslint/require-await
  async buildInvocation(input: unknown, ctx: RunContext): Promise<Invocation> {
    if (!isValidTarget(ctx.target)) {
      throw new InvalidInputError(`Invalid Nmap target: "${ctx.target}"`);
    }
    const result = nmapOptionsSchema.safeParse(input ?? {});
    if (!result.success) {
      throw new InvalidInputError(`Invalid Nmap options: ${result.error.message}`);
    }
    const options = result.data;

    const args: string[] = [options.scanType === "syn" ? "-sS" : "-sT"];
    if (options.detectServices) args.push("-sV");
    if (options.detectOs) args.push("-O");
    if (options.ports) args.push("-p", options.ports);
    args.push("-oX", "-", ctx.target);

    return {
      command: "nmap",
      args,
      timeoutMs: options.timeoutMs,
      image: DOCKER_IMAGE,
    };
  }

  parse(raw: RawOutputRef): Promise<ParsedResult> {
    return parseNmapOutput(raw);
  }

  normalize(parsed: ParsedResult, ctx: RunContext): Promise<GraphDelta> {
    return normalizeNmapOutput(parsed, ctx);
  }
}
