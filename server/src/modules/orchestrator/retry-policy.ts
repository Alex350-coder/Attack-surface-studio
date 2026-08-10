import type { AdapterErrorCode } from "../adapters/adapter.contract";

export interface RetryDecision {
  retryable: boolean;
  maxAttempts: number;
  backoffMs: number;
}

/**
 * Maps an adapter error code to the Orchestrator's retry behavior (INTEGRATION_SYSTEM.md §7).
 * `TOOL_NOT_AVAILABLE` and `INVALID_INPUT` fail fast -- retrying can't fix a missing binary or
 * bad input. `EXECUTION_TIMEOUT` and `NON_ZERO_EXIT` may be transient (resource contention, a
 * flaky target) and get a bounded number of retries with exponential backoff.
 * `UNPARSEABLE_OUTPUT` is left non-retryable: a tool that produced malformed output once will
 * almost certainly do so again, and the raw output is preserved for investigation instead.
 */
const RETRY_POLICY: Readonly<Record<AdapterErrorCode, RetryDecision>> = {
  TOOL_NOT_AVAILABLE: { retryable: false, maxAttempts: 1, backoffMs: 0 },
  INVALID_INPUT: { retryable: false, maxAttempts: 1, backoffMs: 0 },
  EXECUTION_TIMEOUT: { retryable: true, maxAttempts: 3, backoffMs: 5_000 },
  NON_ZERO_EXIT: { retryable: true, maxAttempts: 3, backoffMs: 5_000 },
  UNPARSEABLE_OUTPUT: { retryable: false, maxAttempts: 1, backoffMs: 0 },
};

const DEFAULT_DECISION: RetryDecision = { retryable: false, maxAttempts: 1, backoffMs: 0 };

export function getRetryDecision(code: AdapterErrorCode): RetryDecision {
  return RETRY_POLICY[code] ?? DEFAULT_DECISION;
}

/** Whether a job that has already been attempted `attemptsMade` times should be retried again. */
export function shouldRetry(code: AdapterErrorCode, attemptsMade: number): boolean {
  const decision = getRetryDecision(code);
  return decision.retryable && attemptsMade < decision.maxAttempts;
}
