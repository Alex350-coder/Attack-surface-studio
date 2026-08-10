import { describe, expect, it } from "vitest";
import { isTargetInScope } from "../../../src/modules/orchestrator/scope/scope-matcher";
import type { ProjectScope } from "../../../src/modules/projects/repositories/project-scope.schema";

function scope(overrides: Partial<ProjectScope> = {}): ProjectScope {
  return { includes: [], excludes: [], ...overrides };
}

describe("isTargetInScope", () => {
  it("authorizes an exact hostname match", () => {
    expect(isTargetInScope("example.com", scope({ includes: ["example.com"] }))).toBe(true);
  });

  it("rejects a target with no matching include", () => {
    expect(isTargetInScope("other.com", scope({ includes: ["example.com"] }))).toBe(false);
  });

  it("authorizes subdomains under a wildcard include but not the apex", () => {
    const s = scope({ includes: ["*.example.com"] });
    expect(isTargetInScope("api.example.com", s)).toBe(true);
    expect(isTargetInScope("a.b.example.com", s)).toBe(true);
    expect(isTargetInScope("example.com", s)).toBe(false);
  });

  it("authorizes a bare IP include", () => {
    expect(isTargetInScope("10.0.0.5", scope({ includes: ["10.0.0.5"] }))).toBe(true);
    expect(isTargetInScope("10.0.0.6", scope({ includes: ["10.0.0.5"] }))).toBe(false);
  });

  it("authorizes an IP within an IPv4 CIDR include", () => {
    const s = scope({ includes: ["10.0.0.0/24"] });
    expect(isTargetInScope("10.0.0.42", s)).toBe(true);
    expect(isTargetInScope("10.0.1.42", s)).toBe(false);
  });

  it("authorizes an IP within an IPv6 CIDR include", () => {
    const s = scope({ includes: ["2001:db8::/32"] });
    expect(isTargetInScope("2001:db8::1", s)).toBe(true);
    expect(isTargetInScope("2001:db9::1", s)).toBe(false);
  });

  it("lets an explicit exclude override a broader include (excludes win)", () => {
    const s = scope({ includes: ["*.example.com"], excludes: ["internal.example.com"] });
    expect(isTargetInScope("api.example.com", s)).toBe(true);
    expect(isTargetInScope("internal.example.com", s)).toBe(false);
  });

  it("lets a CIDR exclude carve out part of an included CIDR range", () => {
    const s = scope({ includes: ["10.0.0.0/16"], excludes: ["10.0.5.0/24"] });
    expect(isTargetInScope("10.0.1.1", s)).toBe(true);
    expect(isTargetInScope("10.0.5.1", s)).toBe(false);
  });

  it("rejects everything when scope has no includes", () => {
    expect(isTargetInScope("example.com", scope())).toBe(false);
  });
});
