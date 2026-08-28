import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("joins class names, dropping falsy values", () => {
    expect(cn("a", false && "b", undefined, "c")).toBe("a c");
  });

  it("resolves conflicting Tailwind utility classes in favor of the last one", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
