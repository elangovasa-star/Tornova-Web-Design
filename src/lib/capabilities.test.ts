import { describe, expect, it } from "vitest";
import { NO_CAPABILITIES, readCapabilities } from "./capabilities";
import * as roles from "./roles";

describe("capabilities come from the server and fail closed", () => {
  it("nothing is allowed until the server has answered", () => {
    expect(Object.entries(NO_CAPABILITIES).filter(([key, value]) => key !== "restoreBlockedBy" && value !== false)).toEqual([]);
  });

  it("a missing or non-object answer (an older server) offers nothing", () => {
    for (const raw of [undefined, null, "yes", 7, [], true]) {
      expect(readCapabilities(raw)).toEqual(NO_CAPABILITIES);
    }
  });

  it("only a literal true counts: strings, numbers and truthy values do not", () => {
    const capabilities = readCapabilities({ manageUsers: true, manageTeams: "true", removeMembers: 1, viewBilling: {}, backup: true, restore: "yes" });
    expect(capabilities.manageUsers).toBe(true);
    expect(capabilities.backup).toBe(true);
    expect(capabilities.manageTeams).toBe(false);
    expect(capabilities.removeMembers).toBe(false);
    expect(capabilities.viewBilling).toBe(false);
    expect(capabilities.restore).toBe(false);
  });

  it("keys the Dashboard does not know are ignored and known keys the server left out are not allowed", () => {
    const capabilities = readCapabilities({ manageUsers: true, somethingNew: true });
    expect("somethingNew" in capabilities).toBe(false);
    expect(capabilities.manageTeams).toBe(false);
    expect(Object.keys(capabilities).sort()).toEqual(Object.keys(NO_CAPABILITIES).sort());
  });

  it("carries the gate that blocks a restore, and only as text", () => {
    expect(readCapabilities({ restore: false, restoreBlockedBy: "OrganizationMasterRestoreLock" }).restoreBlockedBy).toBe("OrganizationMasterRestoreLock");
    expect(readCapabilities({ restoreBlockedBy: 5 }).restoreBlockedBy).toBeNull();
    expect(readCapabilities({}).restoreBlockedBy).toBeNull();
  });

  it("the Dashboard holds no role-to-action table of its own any more", () => {
    // The old `can(role, action)` matrix could drift from the backend. Permission decisions now come from the server (capabilities).
    expect("can" in roles).toBe(false);
    expect("MATRIX" in roles).toBe(false);
  });
});
