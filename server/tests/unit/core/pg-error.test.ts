import { describe, expect, it } from "vitest";
import { isUniqueViolation } from "../../../src/core/database/pg-error";

describe("isUniqueViolation", () => {
  it("recognizes a bare pg error with a top-level code (BUG #4 baseline case)", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
  });

  it("recognizes a Drizzle-wrapped error, where the real pg error is nested in `cause` (BUG #4 regression)", () => {
    // Mirrors drizzle-orm's DrizzleQueryError: the top-level error has no `code` of its own,
    // the real node-postgres error (with the actual 23505) is one level down in `.cause`.
    const pgError = { code: "23505", message: "duplicate key value violates unique constraint" };
    const drizzleQueryError = new Error("Failed query: select * from create_project_with_owner(...)", {
      cause: pgError,
    });

    expect(isUniqueViolation(drizzleQueryError)).toBe(true);
  });

  it("walks multiple levels of nested causes", () => {
    const pgError = { code: "23505" };
    const wrapped = new Error("outer", { cause: new Error("inner", { cause: pgError }) });

    expect(isUniqueViolation(wrapped)).toBe(true);
  });

  it("returns false for an unrelated error code", () => {
    expect(isUniqueViolation({ code: "23503" })).toBe(false);
  });

  it("returns false for a wrapped error whose cause has an unrelated code", () => {
    const wrapped = new Error("outer", { cause: { code: "23503" } });
    expect(isUniqueViolation(wrapped)).toBe(false);
  });

  it("returns false for non-object and nullish values", () => {
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
    expect(isUniqueViolation("some string")).toBe(false);
    expect(isUniqueViolation(new Error("plain error, no cause"))).toBe(false);
  });

  it("does not loop forever on a cause cycle", () => {
    const a: { cause?: unknown } = {};
    const b: { cause?: unknown } = { cause: a };
    a.cause = b;

    expect(isUniqueViolation(a)).toBe(false);
  });
});
