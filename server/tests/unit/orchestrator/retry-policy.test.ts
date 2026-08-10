import { describe, expect, it } from "vitest";
import { getRetryDecision, shouldRetry } from "../../../src/modules/orchestrator/retry-policy";

describe("getRetryDecision", () => {
  it("marks TOOL_NOT_AVAILABLE, INVALID_INPUT, and UNPARSEABLE_OUTPUT as non-retryable", () => {
    expect(getRetryDecision("TOOL_NOT_AVAILABLE").retryable).toBe(false);
    expect(getRetryDecision("INVALID_INPUT").retryable).toBe(false);
    expect(getRetryDecision("UNPARSEABLE_OUTPUT").retryable).toBe(false);
  });

  it("marks EXECUTION_TIMEOUT and NON_ZERO_EXIT as retryable with 3 max attempts", () => {
    for (const code of ["EXECUTION_TIMEOUT", "NON_ZERO_EXIT"] as const) {
      const decision = getRetryDecision(code);
      expect(decision.retryable).toBe(true);
      expect(decision.maxAttempts).toBe(3);
      expect(decision.backoffMs).toBeGreaterThan(0);
    }
  });
});

describe("shouldRetry", () => {
  it("returns false for non-retryable codes regardless of attempts made", () => {
    expect(shouldRetry("INVALID_INPUT", 0)).toBe(false);
  });

  it("returns true while attemptsMade is below maxAttempts for retryable codes", () => {
    expect(shouldRetry("EXECUTION_TIMEOUT", 0)).toBe(true);
    expect(shouldRetry("EXECUTION_TIMEOUT", 2)).toBe(true);
  });

  it("returns false once attemptsMade reaches maxAttempts", () => {
    expect(shouldRetry("EXECUTION_TIMEOUT", 3)).toBe(false);
    expect(shouldRetry("NON_ZERO_EXIT", 5)).toBe(false);
  });
});
