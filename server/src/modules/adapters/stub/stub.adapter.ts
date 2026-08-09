import { existsSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import {
  InvalidInputError,
  UnparseableOutputError,
  type AdapterEdge,
  type AdapterNode,
  type DetectionResult,
  type ExecutionMode,
  type GraphDelta,
  type Invocation,
  type ParsedResult,
  type RawOutputRef,
  type RunContext,
  type ToolAdapter,
} from "../adapter.contract";

const stubOptionsSchema = z.object({ delayMs: z.number().int().min(0).max(5000).default(50) });

const stubOutputSchema = z.object({
  tool: z.literal("stub"),
  target: z.string(),
  status: z.literal("ok"),
  findings: z.array(z.object({ id: z.string(), message: z.string() })),
});
type StubOutput = z.infer<typeof stubOutputSchema>;

const compiledScript = join(__dirname, "stub.script.js");
const sourceScript = join(__dirname, "stub.script.ts");

/**
 * Resolves how to invoke `stub.script.ts` under either the compiled build (production/worker,
 * plain `node stub.script.js`) or the TypeScript source tree (dev/tests, run through `tsx`'s
 * CLI so the shared runner never needs its own TS-loading logic).
 */
function resolveScriptInvocation(args: string[]): { command: string; args: string[] } {
  if (existsSync(compiledScript)) {
    return { command: process.execPath, args: [compiledScript, ...args] };
  }
  return { command: process.execPath, args: [require.resolve("tsx/cli"), sourceScript, ...args] };
}

/**
 * A deterministic, harmless test tool (INTEGRATION_SYSTEM.md contract) used only to exercise
 * the Orchestrator end-to-end (Plan.md Phase 6). Not registered as a real security tool.
 */
export class StubAdapter implements ToolAdapter {
  readonly id = "stub";
  readonly displayName = "Stub Adapter (Phase 6 test tool)";
  readonly supportedModes: ExecutionMode[] = ["local"];

  detect(mode: ExecutionMode): Promise<DetectionResult> {
    if (mode !== "local") {
      return Promise.resolve({ available: false, error: `Unsupported mode: ${mode}` });
    }
    return Promise.resolve({ available: true, version: "1.0.0" });
  }

  // Must be async (not just Promise-returning) so the InvalidInputError throw below is a
  // rejected promise, matching the ToolAdapter contract.
  // eslint-disable-next-line @typescript-eslint/require-await
  async buildInvocation(input: unknown, ctx: RunContext): Promise<Invocation> {
    const result = stubOptionsSchema.safeParse(input ?? {});
    if (!result.success) {
      throw new InvalidInputError(`Invalid stub adapter options: ${result.error.message}`);
    }

    const { command, args } = resolveScriptInvocation([
      "--target",
      ctx.target,
      "--delay-ms",
      String(result.data.delayMs),
    ]);
    return { command, args, timeoutMs: result.data.delayMs + 10_000 };
  }

  // Must be async (not just Promise-returning) so the UnparseableOutputError throw below is a
  // rejected promise, matching the ToolAdapter contract.
  // eslint-disable-next-line @typescript-eslint/require-await
  async parse(raw: RawOutputRef): Promise<ParsedResult> {
    try {
      return stubOutputSchema.parse(JSON.parse(raw.stdout.trim()));
    } catch (error) {
      throw new UnparseableOutputError(
        `Stub adapter produced unparseable output: ${(error as Error).message}`,
      );
    }
  }

  normalize(parsed: ParsedResult, ctx: RunContext): Promise<GraphDelta> {
    const output = parsed as StubOutput;
    const assetKey = `asset:${ctx.target}`;

    const nodes: AdapterNode[] = [
      { identityKey: assetKey, type: "asset", category: "infrastructure", label: ctx.target },
      ...output.findings.map(
        (finding): AdapterNode => ({
          identityKey: `finding:${ctx.target}:${finding.id}`,
          type: "finding",
          category: "security",
          label: finding.message,
          severity: "info",
        }),
      ),
    ];

    const edges: AdapterEdge[] = output.findings.map(
      (finding): AdapterEdge => ({
        sourceIdentityKey: assetKey,
        targetIdentityKey: `finding:${ctx.target}:${finding.id}`,
        type: "discovery",
      }),
    );

    return Promise.resolve({ nodes, edges });
  }
}
