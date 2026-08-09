import { describe, expect, it } from "vitest";
import { canAssignRole } from "../../../src/modules/projects/policies/project-member.policy";

describe("canAssignRole", () => {
  it("lets an owner assign any role, including owner", () => {
    expect(canAssignRole("owner", null, "owner")).toBe(true);
    expect(canAssignRole("owner", "member", "admin")).toBe(true);
    expect(canAssignRole("owner", "owner", "admin")).toBe(true);
  });

  it("lets an admin assign member/viewer/admin roles to non-owners", () => {
    expect(canAssignRole("admin", null, "member")).toBe(true);
    expect(canAssignRole("admin", "member", "admin")).toBe(true);
    expect(canAssignRole("admin", "viewer", "member")).toBe(true);
  });

  it("never lets an admin grant the owner role", () => {
    expect(canAssignRole("admin", null, "owner")).toBe(false);
    expect(canAssignRole("admin", "member", "owner")).toBe(false);
  });

  it("never lets an admin touch an existing owner's role", () => {
    expect(canAssignRole("admin", "owner", "member")).toBe(false);
  });

  it("never lets member/viewer roles assign anything", () => {
    expect(canAssignRole("member", null, "viewer")).toBe(false);
    expect(canAssignRole("viewer", null, "viewer")).toBe(false);
  });
});
