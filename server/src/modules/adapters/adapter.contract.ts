import type { NodeUpsertInput } from "../../contracts/node.schema";
import type { EdgeType } from "../../contracts/edge.schema";

/** The two supported execution modes (INTEGRATION_SYSTEM.md §3). */
export type ExecutionMode = "local" | "docker";

export interface DetectionResult {
  available: boolean;
  version?: string;
  error?: string;
}

/**
 * A safe, structured invocation the shared runner (Phase 6 `orchestrator/runner`) executes.
 * `args` is always an explicit array -- adapters never build a shell command string
 * (SECURITY_MODEL.md, EXE-001/EXE-002, the primary defense against command injection).
 */
export interface Invocation {
  command: string;
  args: string[];
  timeoutMs: number;
  env?: Record<string, string>;
  /** Docker mode only: image reference the runner should use instead of a host binary. */
  image?: string;
}

/** What the shared runner hands back to an adapter's `parse` step. */
export interface RawOutputRef {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

/** Intermediate, adapter-specific structure between `parse` and `normalize`. Opaque to the Orchestrator. */
export type ParsedResult = unknown;

export interface RunContext {
  projectId: string;
  runId: string;
  target: string;
  triggeredBy: string;
}

/**
 * A graph node an adapter wants upserted. Adapters never know real node UUIDs -- the Graph
 * Builder (Phase 8) resolves `identityKey` to a stable node id. `sourceRunId`/`createdBy` are
 * stamped by the Graph Builder from `RunContext`, not by the adapter.
 */
export type AdapterNode = Omit<NodeUpsertInput, "sourceRunId" | "createdBy">;

/** A graph edge an adapter wants upserted, referencing nodes by identity key rather than UUID. */
export interface AdapterEdge {
  sourceIdentityKey: string;
  targetIdentityKey: string;
  type: EdgeType;
  animated?: boolean;
  label?: string;
  data?: Record<string, unknown>;
}

export interface GraphDelta {
  nodes: AdapterNode[];
  edges: AdapterEdge[];
}

/**
 * Structured adapter failure classes (INTEGRATION_SYSTEM.md §7). The Orchestrator's retry
 * policy (`retry-policy.ts`) branches on `code`, never on a message string.
 */
export type AdapterErrorCode =
  | "TOOL_NOT_AVAILABLE"
  | "INVALID_INPUT"
  | "EXECUTION_TIMEOUT"
  | "NON_ZERO_EXIT"
  | "UNPARSEABLE_OUTPUT";

export abstract class AdapterError extends Error {
  abstract readonly code: AdapterErrorCode;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ToolNotAvailableError extends AdapterError {
  readonly code = "TOOL_NOT_AVAILABLE";
}

export class InvalidInputError extends AdapterError {
  readonly code = "INVALID_INPUT";
}

export class ExecutionTimeoutError extends AdapterError {
  readonly code = "EXECUTION_TIMEOUT";
}

export class NonZeroExitError extends AdapterError {
  readonly code = "NON_ZERO_EXIT";
}

export class UnparseableOutputError extends AdapterError {
  readonly code = "UNPARSEABLE_OUTPUT";
}

/**
 * Every tool is reached only through this contract (INTEGRATION_SYSTEM.md §1). The Orchestrator
 * resolves adapters by `id` from `AdapterRegistry` and never imports a concrete adapter directly.
 */
export interface ToolAdapter {
  readonly id: string;
  readonly displayName: string;
  readonly supportedModes: ExecutionMode[];

  /** Presence + version check for a mode; never mutates the host. */
  detect(mode: ExecutionMode): Promise<DetectionResult>;

  /** Validates + normalizes user-supplied options into a safe invocation. Throws `InvalidInputError`. */
  buildInvocation(input: unknown, ctx: RunContext): Promise<Invocation>;

  /** Parses the tool's native output. Throws `UnparseableOutputError` on malformed output. */
  parse(raw: RawOutputRef): Promise<ParsedResult>;

  /** Turns parsed output into a `GraphDelta` with stable identity keys. */
  normalize(parsed: ParsedResult, ctx: RunContext): Promise<GraphDelta>;
}
