import { describe, expect, it } from "vitest";
import { isValidCidr, isValidHostname, isValidIp, isValidScopeEntry } from "../../../src/modules/shared/target-format";

describe("target-format", () => {
  it("accepts plain and wildcard hostnames", () => {
    expect(isValidHostname("example.com")).toBe(true);
    expect(isValidHostname("*.example.com")).toBe(true);
    expect(isValidHostname("sub.example.co.uk")).toBe(true);
  });

  it("rejects malformed hostnames", () => {
    expect(isValidHostname("-bad.example.com")).toBe(false);
    expect(isValidHostname("no_tld")).toBe(false);
    expect(isValidHostname("")).toBe(false);
  });

  it("validates IPv4 and IPv6 addresses", () => {
    expect(isValidIp("10.0.0.1")).toBe(true);
    expect(isValidIp("2001:db8::1")).toBe(true);
    expect(isValidIp("not-an-ip")).toBe(false);
  });

  it("validates CIDR ranges against the correct IP version's prefix bounds", () => {
    expect(isValidCidr("10.0.0.0/24")).toBe(true);
    expect(isValidCidr("10.0.0.0/33")).toBe(false);
    expect(isValidCidr("2001:db8::/32")).toBe(true);
    expect(isValidCidr("2001:db8::/129")).toBe(false);
    expect(isValidCidr("not-a-cidr")).toBe(false);
  });

  it("accepts hostnames, IPs, and CIDRs as scope entries", () => {
    expect(isValidScopeEntry("example.com")).toBe(true);
    expect(isValidScopeEntry("10.0.0.1")).toBe(true);
    expect(isValidScopeEntry("10.0.0.0/24")).toBe(true);
    expect(isValidScopeEntry("not valid!!")).toBe(false);
  });
});
