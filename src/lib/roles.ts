// Role NAMES for display, and role-aware navigation, for the Web Dashboard.
//
// Stage 13B, Part 3: this file no longer decides who may do what. The old role -> action table (which could drift from the backend) is gone;
// what the person may do comes from the server as capabilities (see capabilities.ts, GET /api/v1/dashboard/me). Roles remain here only as
// words to show ("Team Admin") and to describe the scope of a view.
//
// Nothing in the Dashboard is a security boundary: every read is scoped and every action is authorized again on the server.

import type { Capabilities } from "./capabilities";

export type CustomerRole = "PersonalUser" | "OrganizationAdmin" | "TeamAdmin" | "BackupUser";

export const CUSTOMER_ROLES: CustomerRole[] = ["PersonalUser", "OrganizationAdmin", "TeamAdmin", "BackupUser"];

export function isCustomerRole(role: string): role is CustomerRole {
  return (CUSTOMER_ROLES as string[]).includes(role);
}

export const ROLE_LABEL: Record<CustomerRole, string> = {
  PersonalUser: "Personal",
  OrganizationAdmin: "Organization Admin",
  TeamAdmin: "Team Admin",
  BackupUser: "Backup User",
};

export interface NavItem {
  to: string;
  label: string;
  group: "Protect" | "Recover" | "Manage" | "Account";
}

/** A menu entry, and (optionally) the server capabilities that decide whether it is offered. */
const ALL: Array<NavItem & { offered?: (capabilities: Capabilities) => boolean }> = [
  { to: "/app", label: "Overview", group: "Protect" },
  { to: "/app/devices", label: "Devices", group: "Protect" },
  { to: "/app/backup-sets", label: "Backup Sets", group: "Protect" },
  { to: "/app/activity", label: "Activity", group: "Protect" },
  { to: "/app/restore", label: "Restore", group: "Recover" },
  { to: "/app/trash", label: "Trash", group: "Recover" },
  { to: "/app/smart-cleanup", label: "Smart Cleanup", group: "Recover" },
  { to: "/app/organization", label: "Users & Teams", group: "Manage", offered: (c) => c.viewMembers && c.manageUsers },
  { to: "/app/organization", label: "My Team", group: "Manage", offered: (c) => c.viewMembers && !c.manageUsers },
  { to: "/app/storage", label: "Storage", group: "Manage" },
  { to: "/app/security", label: "Security", group: "Manage" },
  { to: "/app/billing", label: "Billing", group: "Account", offered: (c) => c.viewBilling },
  { to: "/app/notifications", label: "Notifications", group: "Account" },
  { to: "/app/settings", label: "Settings", group: "Account" },
  { to: "/app/support", label: "Support", group: "Account" },
];

/** The menu for what the SERVER says this person may reach. */
export function navFor(capabilities: Capabilities): NavItem[] {
  return ALL.filter((item) => !item.offered || item.offered(capabilities)).map(({ offered: _offered, ...item }) => item);
}

/** What the dashboard calls the scope a role is looking at - shown in the page
 *  header so a Team Admin is never in doubt that the view is their Team only. */
export function scopeLabel(role: CustomerRole, teamName?: string | null, accountName?: string | null): string {
  switch (role) {
    case "OrganizationAdmin":
      return accountName ? `${accountName} - whole Organization` : "Whole Organization";
    case "TeamAdmin":
      return teamName ? `Team: ${teamName}` : "Your Team";
    case "BackupUser":
      return "Your devices";
    default:
      return "Your account";
  }
}
