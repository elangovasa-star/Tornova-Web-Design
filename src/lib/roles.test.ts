import { describe, expect, it } from "vitest";
import { readCapabilities } from "./capabilities";
import { isCustomerRole, navFor, scopeLabel } from "./roles";

// What the server sends for each situation (see Stage13BCapabilitiesTests). These are FIXTURES of server answers: the Dashboard decides nothing from a role's name.
const organizationAdmin = readCapabilities({ manageUsers: true, manageUserRoles: true, removeMembers: true, manageTeams: true, viewMembers: true, viewOrganizationDevices: true, manageTeamRestoreLock: true, manageMasterLocks: true, viewBilling: true, viewQuota: true });
const teamAdmin = readCapabilities({ viewMembers: true, viewOwnTeamDevices: true, manageTeamRestoreLock: true, viewBilling: true, viewQuota: true });
const backupUser = readCapabilities({ viewQuota: true, backup: true });
const personal = readCapabilities({ viewBilling: true, viewQuota: true, manageDevices: true });

const labels = (capabilities: Parameters<typeof navFor>[0]) => navFor(capabilities).map((n) => n.label);

describe("navigation follows the capabilities the server sent", () => {
  it("gives everyone the operational pages, whatever the server said about administration", () => {
    for (const capabilities of [organizationAdmin, teamAdmin, backupUser, personal, readCapabilities(undefined)]) {
      expect(labels(capabilities)).toEqual(expect.arrayContaining(["Overview", "Devices", "Backup Sets", "Activity", "Restore", "Trash", "Smart Cleanup", "Security", "Support"]));
    }
  });

  it("shows Users & Teams to whoever may manage users, and My Team to whoever may only view their people", () => {
    expect(labels(organizationAdmin)).toContain("Users & Teams");
    expect(labels(organizationAdmin)).not.toContain("My Team");
    expect(labels(teamAdmin)).toContain("My Team");
    expect(labels(teamAdmin)).not.toContain("Users & Teams");
    expect(labels(personal)).not.toContain("Users & Teams");
    expect(labels(backupUser)).not.toContain("My Team");
  });

  it("shows Billing only when the server says the person may view it", () => {
    expect(labels(backupUser)).not.toContain("Billing");
    expect(labels(teamAdmin)).toContain("Billing");
    expect(labels(personal)).toContain("Billing");
  });

  it("offers nothing privileged when the server sent no capabilities at all", () => {
    const none = labels(readCapabilities(undefined));
    for (const privileged of ["Users & Teams", "My Team", "Billing"]) {
      expect(none).not.toContain(privileged);
    }
  });

  it("has no duplicate destinations for any answer", () => {
    for (const capabilities of [organizationAdmin, teamAdmin, backupUser, personal]) {
      const paths = navFor(capabilities).map((n) => n.to);
      expect(new Set(paths).size).toBe(paths.length);
    }
  });
});

describe("role names are for display only", () => {
  it("SuperAdmin is not a customer dashboard role", () => {
    expect(isCustomerRole("SuperAdmin")).toBe(false);
    expect(isCustomerRole("TeamAdmin")).toBe(true);
  });

  it("labels the scope so a Team Admin always knows the view is their Team", () => {
    expect(scopeLabel("TeamAdmin", "Finance")).toBe("Team: Finance");
    expect(scopeLabel("OrganizationAdmin", null, "Acme")).toBe("Acme - whole Organization");
    expect(scopeLabel("BackupUser")).toBe("Your devices");
  });
});
