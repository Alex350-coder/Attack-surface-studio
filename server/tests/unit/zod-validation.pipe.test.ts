import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ZodValidationPipe } from "../../src/core/validation/zod-validation.pipe";
import { ValidationError } from "../../src/core/http/domain-error";

describe("ZodValidationPipe", () => {
  const schema = z.object({ email: z.string().email() });
  const pipe = new ZodValidationPipe(schema);

  it("returns the parsed value for a valid payload", () => {
    expect(pipe.transform({ email: "a@b.com" })).toEqual({ email: "a@b.com" });
  });

  it("throws a ValidationError with a 400 status for an invalid payload", () => {
    expect(() => pipe.transform({ email: "not-an-email" })).toThrow(ValidationError);
  });

  it("includes the failing field in the error message", () => {
    try {
      pipe.transform({ email: "not-an-email" });
      throw new Error("expected transform to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).message).toContain("email");
    }
  });
});
