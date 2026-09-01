import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Badge, reportStatusTone, runStatusTone } from "./badge";

describe("Badge", () => {
  afterEach(cleanup);

  it("renders its children", () => {
    render(<Badge>running</Badge>);
    expect(screen.getByText("running")).toBeInTheDocument();
  });
});

describe("runStatusTone", () => {
  it("maps known run statuses and falls back to neutral", () => {
    expect(runStatusTone("succeeded")).toBe("success");
    expect(runStatusTone("failed")).toBe("danger");
    expect(runStatusTone("unknown-status")).toBe("neutral");
  });
});

describe("reportStatusTone", () => {
  it("maps known report statuses and falls back to neutral", () => {
    expect(reportStatusTone("draft")).toBe("pending");
    expect(reportStatusTone("ready")).toBe("success");
    expect(reportStatusTone("unknown-status")).toBe("neutral");
  });
});
