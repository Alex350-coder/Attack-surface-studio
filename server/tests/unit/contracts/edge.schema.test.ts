import { describe, expect, it } from "vitest";
import { edgeTypeSchema, edgeUpsertInputSchema } from "../../../src/contracts/edge.schema";

describe("edge contracts", () => {
  it("accepts every one of the canonical 5 edge types", () => {
    for (const type of ["discovery", "relationship", "evidence", "risk", "ai"]) {
      expect(() => edgeTypeSchema.parse(type)).not.toThrow();
    }
  });

  it("rejects an unknown edge type", () => {
    expect(() => edgeTypeSchema.parse("not-a-real-type")).toThrow();
  });

  it("validates a well-formed upsert input, including the animated modifier", () => {
    const result = edgeUpsertInputSchema.safeParse({
      sourceId: "5b2f6b0e-2b8b-4c34-9c9e-8b1c1e2f3a4b",
      targetId: "5b2f6b0e-2b8b-4c34-9c9e-8b1c1e2f3a4c",
      type: "risk",
      animated: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an upsert input with a non-uuid source id", () => {
    const result = edgeUpsertInputSchema.safeParse({
      sourceId: "not-a-uuid",
      targetId: "5b2f6b0e-2b8b-4c34-9c9e-8b1c1e2f3a4c",
      type: "risk",
    });
    expect(result.success).toBe(false);
  });
});
