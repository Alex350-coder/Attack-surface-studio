import { describe, expect, it } from "vitest";
import { canTransition, isTerminalStatus, TOOL_RUN_STATUSES } from "../../../src/modules/orchestrator/tool-run-transitions";

describe("canTransition", () => {
  it("allows the happy-path lifecycle", () => {
    expect(canTransition("queued", "running")).toBe(true);
    expect(canTransition("running", "succeeded")).toBe(true);
  });

  it("allows cancellation from queued and running", () => {
    expect(canTransition("queued", "cancelled")).toBe(true);
    expect(canTransition("running", "cancelled")).toBe(true);
  });

  it("allows a retryable failure to requeue the run", () => {
    expect(canTransition("running", "queued")).toBe(true);
  });

  it("rejects skipping straight from queued to succeeded", () => {
    expect(canTransition("queued", "succeeded")).toBe(false);
  });

  it("rejects any transition out of a terminal status", () => {
    for (const terminal of ["succeeded", "failed", "cancelled"] as const) {
      for (const target of TOOL_RUN_STATUSES) {
        expect(canTransition(terminal, target)).toBe(false);
      }
    }
  });
});

describe("isTerminalStatus", () => {
  it("classifies succeeded/failed/cancelled as terminal", () => {
    expect(isTerminalStatus("succeeded")).toBe(true);
    expect(isTerminalStatus("failed")).toBe(true);
    expect(isTerminalStatus("cancelled")).toBe(true);
  });

  it("classifies queued/running as non-terminal", () => {
    expect(isTerminalStatus("queued")).toBe(false);
    expect(isTerminalStatus("running")).toBe(false);
  });
});
