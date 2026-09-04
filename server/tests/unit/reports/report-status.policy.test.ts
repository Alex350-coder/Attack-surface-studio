import { describe, expect, it } from "vitest";
import { canTransitionReportStatus } from "../../../src/modules/reports/policies/report-status.policy";

describe("canTransitionReportStatus", () => {
  it("allows draft -> generating", () => {
    expect(canTransitionReportStatus("draft", "generating")).toBe(true);
  });

  it("allows generating -> ready and generating -> failed", () => {
    expect(canTransitionReportStatus("generating", "ready")).toBe(true);
    expect(canTransitionReportStatus("generating", "failed")).toBe(true);
  });

  it("allows re-export from ready or failed via generating", () => {
    expect(canTransitionReportStatus("ready", "generating")).toBe(true);
    expect(canTransitionReportStatus("failed", "generating")).toBe(true);
  });

  it("never allows draft -> ready or draft -> failed directly", () => {
    expect(canTransitionReportStatus("draft", "ready")).toBe(false);
    expect(canTransitionReportStatus("draft", "failed")).toBe(false);
  });

  it("never allows ready/failed to transition into each other directly", () => {
    expect(canTransitionReportStatus("ready", "failed")).toBe(false);
    expect(canTransitionReportStatus("failed", "ready")).toBe(false);
  });

  it("never allows a no-op self-transition", () => {
    expect(canTransitionReportStatus("draft", "draft")).toBe(false);
    expect(canTransitionReportStatus("generating", "generating")).toBe(false);
    expect(canTransitionReportStatus("ready", "ready")).toBe(false);
    expect(canTransitionReportStatus("failed", "failed")).toBe(false);
  });
});
