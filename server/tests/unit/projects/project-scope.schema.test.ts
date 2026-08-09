import { describe, expect, it } from "vitest";
import { projectScopeSchema } from "../../../src/modules/projects/repositories/project-scope.schema";

describe("projectScopeSchema", () => {
  it("accepts hostnames, wildcard domains, IPv4, IPv6, and CIDR entries", () => {
    const result = projectScopeSchema.safeParse({
      includes: ["example.com", "*.example.com", "10.0.0.1", "10.0.0.0/24", "2001:db8::1", "2001:db8::/32"],
      excludes: ["staging.example.com"],
    });

    expect(result.success).toBe(true);
  });

  it("defaults to empty arrays when omitted", () => {
    const result = projectScopeSchema.parse({});

    expect(result).toEqual({ includes: [], excludes: [] });
  });

  it("rejects an entry that is not a hostname, IP, or CIDR", () => {
    const result = projectScopeSchema.safeParse({ includes: ["not a target!!"], excludes: [] });

    expect(result.success).toBe(false);
  });

  it("rejects an out-of-range CIDR prefix", () => {
    const result = projectScopeSchema.safeParse({ includes: ["10.0.0.0/99"], excludes: [] });

    expect(result.success).toBe(false);
  });

  it("rejects an empty string entry", () => {
    const result = projectScopeSchema.safeParse({ includes: [""], excludes: [] });

    expect(result.success).toBe(false);
  });

  it("rejects a non-array includes value", () => {
    const result = projectScopeSchema.safeParse({ includes: "not-an-array", excludes: [] });

    expect(result.success).toBe(false);
  });
});
