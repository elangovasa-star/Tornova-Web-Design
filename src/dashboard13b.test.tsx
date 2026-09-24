import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { I18nProvider } from "./i18n";
import { session } from "./lib/api";
import { AuthProvider } from "./lib/auth";
import { NO_CAPABILITIES } from "./lib/capabilities";
import { DEFAULT_CONFIG, SiteConfigProvider } from "./lib/config";
import { formatBytes } from "./lib/status";

// Stage 13B, Part 4: the Dashboard behaviour for each role, against a fake server that answers exactly what the real API answers (the shapes are
// the ones the API tests pin). Nothing here is a permission rule: what each person may do is whatever the server says in `capabilities`.

type Answer = { status: number; body?: unknown };
type Route = (url: URL, method: string, body: unknown) => Answer | undefined;

function serve(route: Route) {
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      const method = init?.method ?? "GET";
      calls.push({ url, method, body });
      const answer = route(new URL(url, "https://tornova.test"), method, body) ?? { status: 401, body: { error: "Unauthorized" } };
      return new Response(answer.status === 204 ? null : JSON.stringify(answer.body ?? {}), { status: answer.status, headers: { "Content-Type": "application/json" } });
    }),
  );
  return calls;
}

function renderAt(path: string, config = DEFAULT_CONFIG) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SiteConfigProvider initial={config}>
        <I18nProvider enabledLocales={["en"]} allowPreview={false}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </I18nProvider>
      </SiteConfigProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  session.set(null);
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------- what the server answers

const caps = (...allowed: string[]) => Object.fromEntries(Object.keys(NO_CAPABILITIES).map((key) => [key, key === "restoreBlockedBy" ? null : allowed.includes(key)]));
const ORG_ADMIN = caps("manageUsers", "manageUserRoles", "removeMembers", "manageTeams", "viewMembers", "viewOrganizationDevices", "manageTeamRestoreLock", "manageMasterLocks", "triggerEmergencyStop", "resumeEmergencyStop", "purchaseSubscription", "manageSubscription", "viewBilling", "viewQuota", "modifyPurchasingPower", "manageDevices", "manageNotificationPreferences", "backup", "restore", "deleteData");
const TEAM_ADMIN_PP_ON = caps("viewMembers", "viewOwnTeamDevices", "manageTeamRestoreLock", "purchaseSubscription", "viewBilling", "viewQuota", "backup", "restore");
const TEAM_ADMIN_PP_OFF = caps("viewMembers", "viewOwnTeamDevices", "manageTeamRestoreLock", "viewBilling", "viewQuota", "backup", "restore");
const BACKUP_USER = caps("viewQuota", "backup");
const PERSONAL = caps("purchaseSubscription", "manageSubscription", "viewBilling", "viewQuota", "manageDevices", "manageNotificationPreferences", "backup", "restore", "deleteData");

type Role = "OrganizationAdmin" | "TeamAdmin" | "BackupUser" | "PersonalUser";

const meBody = (role: Role, capabilities: unknown, extra: Record<string, unknown> = {}) => ({
  userId: "u1",
  username: "sam",
  displayName: "Sam Lee",
  email: "sam@example.com",
  mfaEnabled: false,
  accountId: "a1",
  accountType: role === "PersonalUser" ? "Personal" : "Business",
  accountName: role === "PersonalUser" ? null : "Northwind",
  role,
  teamId: role === "TeamAdmin" ? "t1" : null,
  teamName: role === "TeamAdmin" ? "Finance" : null,
  clientSideEncryptionEnabled: false,
  backupEnabled: true,
  restoreEnabled: true,
  deleteEnabled: true,
  teamAdminPurchasingPowerEnabled: role === "PersonalUser" ? null : true,
  capabilities,
  ...extra,
});

const member = (userId: string, name: string, role: string, extra: Record<string, unknown> = {}) => ({ userId, username: name.toLowerCase().replace(" ", "."), displayName: name, email: `${name.toLowerCase().replace(" ", ".")}@example.com`, role, teamId: null, teamName: null, backupEnabled: true, restoreEnabled: false, deleteEnabled: false, deviceCount: 1, ...extra });
const MEMBERS = [member("m1", "Ada Admin", "OrganizationAdmin"), member("m2", "Ben Backup", "BackupUser", { teamId: "t1", teamName: "Finance" })];
const QUOTA = { totalBytes: 10_000_000_000, usedBytes: 2_500_000_000, reservedBytes: 100_000_000, availableBytes: 7_400_000_000 };
const SUBSCRIPTION = { subscriptionId: "s1", planId: "p1", planName: "Business 5 TB", status: "Active", currency: "USD", userCount: 5, storageBytes: 10_000_000_000, startAtUtc: "2026-09-01T00:00:00Z", endAtUtc: "2026-10-01T00:00:00Z", graceEndsAtUtc: null, pendingPlanId: null, backupAllowed: true };
const ACCOUNT = { accountId: "a1", type: 1, name: "Northwind", masterBackupLockEnabled: false, masterRestoreLockEnabled: true, teams: [{ teamId: "t1", name: "Finance", restoreLockEnabled: false }, { teamId: "t2", name: "Sales", restoreLockEnabled: true }] };
const CONTROL_IDLE = { emergencyStopActive: false, changedAtUtc: null, reason: null, callerMayControl: false };

interface World {
  role: Role;
  capabilities: unknown;
  meExtra?: Record<string, unknown>;
  /** Successive /dashboard/me answers (the last repeats): to prove a stale page refreshes it. */
  meSequence?: unknown[];
  control?: unknown;
  members?: unknown[];
  membersTotal?: number;
  devices?: unknown[];
  devicesTotal?: number;
  quota?: unknown;
  subscription?: unknown | null;
  account?: unknown;
  extra?: Route;
}

function serveWorld(world: World) {
  localStorage.setItem("tornova.session-hint", "1");
  let meCalls = 0;
  const controlDefault = { ...CONTROL_IDLE, callerMayControl: world.role === "OrganizationAdmin" };
  return serve((url, method, body) => {
    const custom = world.extra?.(url, method, body);
    if (custom) return custom;
    const path = url.pathname;
    if (path.endsWith("/web/auth/refresh")) return { status: 200, body: { accessToken: "test-access-token", activeAccountId: "a1" } };
    if (path.endsWith("/dashboard/accounts")) return { status: 200, body: [{ accountId: "a1", type: world.role === "PersonalUser" ? "Personal" : "Business", name: "Northwind", role: world.role }] };
    if (path.endsWith("/dashboard/me")) {
      const sequence = world.meSequence;
      const answer = sequence ? sequence[Math.min(meCalls, sequence.length - 1)] : meBody(world.role, world.capabilities, world.meExtra);
      meCalls += 1;
      return { status: 200, body: answer };
    }
    if (path.endsWith("/dashboard/control-state")) return { status: 200, body: world.control ?? controlDefault };
    if (path.endsWith("/dashboard/members")) return { status: 200, body: { items: world.members ?? MEMBERS, total: world.membersTotal ?? (world.members ?? MEMBERS).length, skip: 0, take: 25 } };
    if (path.endsWith("/dashboard/devices")) return { status: 200, body: { items: world.devices ?? [], total: world.devicesTotal ?? (world.devices ?? []).length, skip: 0, take: 25 } };
    if (path.endsWith("/dashboard/backup-sessions")) return { status: 200, body: { items: [], total: 0, skip: 0, take: 5 } };
    if (path.startsWith("/api/v1/quota/")) return { status: 200, body: world.quota ?? QUOTA };
    if (path.endsWith("/subscriptions/current")) return world.subscription === null ? { status: 404, body: { error: "SubscriptionNotFound" } } : { status: 200, body: world.subscription ?? SUBSCRIPTION };
    if (path.endsWith("/api/v1/plans")) return { status: 200, body: [{ planId: "p2", name: "Business 10 TB", storageBytes: 20_000_000_000, durationMonths: 12, price: 100, currency: "USD", isTrial: false, trialDurationDays: null }] };
    if (path.startsWith("/api/v1/accounts/a1")) return { status: 200, body: world.account ?? ACCOUNT };
    if (path.includes("/notifications")) return { status: 200, body: path.endsWith("/preferences") ? { backupReportEmailEnabled: true } : [] };
    if (path.includes("/dashboard/")) return { status: 200, body: { items: [], total: 0, skip: 0, take: 25 } };
    return { status: 404, body: {} };
  });
}

const navLabels = async () => {
  const side = await screen.findByLabelText("Dashboard");
  return within(side).getAllByRole("link").map((a) => a.textContent);
};

/** The number shown for a labelled tile in a panel (the tiles are `<span class="n">value</span><span class="l">label</span>`). */
const tile = (panel: HTMLElement, label: string) => within(panel).getByText(label).previousElementSibling?.textContent;

const buttons = (name: RegExp | string) => screen.queryAllByRole("button", { name });

// ---------------------------------------------------------------- Organization overview

describe("Organization overview", () => {
  const devicesOf = (n: number) => Array.from({ length: n }, (_, i) => ({ deviceId: `d${i}`, name: `pc-${i}`, operatingSystem: "Windows", agentVersion: "1.0.0", status: "Active", ownerUserId: "m2", ownerDisplayName: "Ben Backup", ownerRemoved: false, registeredAtUtc: "2026-09-01T00:00:00Z", lastSeenAtUtc: new Date().toISOString(), lastSession: null, backupSetId: null }));

  it("an Organization Admin sees the real Organization figures: members, Teams, devices, plan, storage, locks and Emergency Stop", async () => {
    serveWorld({ role: "OrganizationAdmin", capabilities: ORG_ADMIN, membersTotal: 7, devices: devicesOf(2), devicesTotal: 4 });
    renderAt("/app");

    const panel = await screen.findByLabelText("Organization overview");
    await waitFor(() => expect(tile(panel, "Members")).toBe("7"));
    expect(tile(panel, "Teams")).toBe("2");
    expect(tile(panel, "Registered devices")).toBe("4");
    expect(tile(panel, "Plan")).toBe("Business 5 TB");
    expect(tile(panel, "Storage used")).toBe(formatBytes(QUOTA.usedBytes)); // the quota service's number, not a Web calculation
    expect(tile(panel, "Storage remaining")).toBe(formatBytes(QUOTA.availableBytes));
    expect(tile(panel, "Emergency Stop")).toBe("Not active");
    expect(tile(panel, "Organization Restore Lock")).toBe("Locked");
    expect(tile(panel, "Teams with a Restore Lock")).toBe("1");
  });

  it("a figure the server could not give is shown as unavailable, never as zero", async () => {
    serveWorld({ role: "OrganizationAdmin", capabilities: ORG_ADMIN, extra: (url) => (url.pathname.startsWith("/api/v1/quota/") ? { status: 500, body: {} } : undefined) });
    renderAt("/app");

    const panel = await screen.findByLabelText("Organization overview");
    await waitFor(() => expect(tile(panel, "Storage used")).toBe("Unavailable"));
    expect(tile(panel, "Storage remaining")).toBe("Unavailable");
  });

  it("shows Emergency Stop as ACTIVE from the server's control state", async () => {
    serveWorld({ role: "OrganizationAdmin", capabilities: ORG_ADMIN, control: { emergencyStopActive: true, changedAtUtc: "2026-09-21T10:00:00Z", reason: "Ransomware suspected", callerMayControl: true } });
    renderAt("/app");

    const panel = await screen.findByLabelText("Organization overview");
    await waitFor(() => expect(tile(panel, "Emergency Stop")).toBe("ACTIVE"));
  });

  it("a Team Admin gets a Team-scoped overview only: their Team's people and devices, no Teams count, no Organization locks", async () => {
    serveWorld({ role: "TeamAdmin", capabilities: TEAM_ADMIN_PP_ON, membersTotal: 3, devices: devicesOf(1), devicesTotal: 2 });
    renderAt("/app");

    const panel = await screen.findByLabelText("Team overview");
    await waitFor(() => expect(tile(panel, "Team members")).toBe("3"));
    expect(tile(panel, "Team devices")).toBe("2");
    expect(within(panel).queryByText("Teams")).toBeNull();
    expect(within(panel).queryByText("Organization Restore Lock")).toBeNull();
    expect(within(panel).queryByText("Registered devices")).toBeNull();
    expect(screen.queryByLabelText("Organization overview")).toBeNull();
  });

  it("a Backup User and a Personal user get no Organization or Team overview", async () => {
    serveWorld({ role: "BackupUser", capabilities: BACKUP_USER });
    renderAt("/app");
    expect(await screen.findByRole("heading", { level: 1, name: "Overview" })).toBeTruthy();
    expect(screen.queryByLabelText("Organization overview")).toBeNull();
    expect(screen.queryByLabelText("Team overview")).toBeNull();
    cleanup();

    serveWorld({ role: "PersonalUser", capabilities: PERSONAL });
    renderAt("/app");
    expect(await screen.findByRole("heading", { level: 1, name: "Overview" })).toBeTruthy();
    expect(screen.queryByLabelText("Organization overview")).toBeNull();
    expect(screen.queryByLabelText("Team overview")).toBeNull();
  });
});

// ---------------------------------------------------------------- Users & Teams, My Team

describe("Users & Teams and My Team", () => {
  it("an Organization Admin sees every Organization control: add, edit, remove, create and rename a Team, Team lock", async () => {
    serveWorld({ role: "OrganizationAdmin", capabilities: ORG_ADMIN });
    renderAt("/app/organization");

    expect(await screen.findByRole("heading", { level: 1, name: "Users & Teams" })).toBeTruthy();
    expect(await screen.findByRole("button", { name: "Add user" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Create Team" })).toBeTruthy();
    expect(await screen.findAllByRole("button", { name: /^Edit / })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /^Remove / })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /^Rename / })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /restore for this Team/ }).length).toBeGreaterThan(0);
  });

  it("a Team Admin sees only their Team, view-only for people, with the Team Restore Lock and the Purchasing Power state", async () => {
    serveWorld({ role: "TeamAdmin", capabilities: TEAM_ADMIN_PP_ON, account: { ...ACCOUNT, teams: [ACCOUNT.teams[0]] }, members: [MEMBERS[1]] });
    renderAt("/app/organization");

    expect(await screen.findByRole("heading", { level: 1, name: "My Team" })).toBeTruthy();
    expect(await screen.findByText("Ben Backup")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Add user" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Create Team" })).toBeNull();
    expect(buttons(/^Edit /)).toHaveLength(0);
    expect(buttons(/^Remove /)).toHaveLength(0);
    expect(buttons(/^Rename /)).toHaveLength(0);
    expect(screen.getByRole("button", { name: /restore for this Team/ })).toBeTruthy(); // own Team's lock: allowed
    expect(screen.queryByText("Sales")).toBeNull(); // another Team is never listed
    expect(screen.getByText(/Team Admin purchasing is on/)).toBeTruthy();
  });

  it("a Team Admin with Purchasing Power off is told it is off", async () => {
    serveWorld({ role: "TeamAdmin", capabilities: TEAM_ADMIN_PP_OFF, meExtra: { teamAdminPurchasingPowerEnabled: false }, account: { ...ACCOUNT, teams: [ACCOUNT.teams[0]] }, members: [MEMBERS[1]] });
    renderAt("/app/organization");
    expect(await screen.findByText(/Team Admin purchasing is off/)).toBeTruthy();
  });

  it("a Backup User has no people page at all", async () => {
    serveWorld({ role: "BackupUser", capabilities: BACKUP_USER });
    renderAt("/app/organization");
    expect(await screen.findByText("Not available for your role")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Add user" })).toBeNull();
  });

  it("removing a member: the confirmation says their cloud backups are kept, and revoking their device credentials is ticked by default", async () => {
    const calls = serveWorld({
      role: "OrganizationAdmin",
      capabilities: ORG_ADMIN,
      extra: (url, method) => (method === "DELETE" && url.pathname === "/api/v1/accounts/a1/users/m2" ? { status: 200, body: { userId: "m2", deviceCredentialsRevoked: url.searchParams.get("revokeDeviceCredentials") === "true", devicesWithRevokedCredentials: 1, devicesRetained: 1 } } : undefined),
    });
    renderAt("/app/organization");
    fireEvent.click(await screen.findByRole("button", { name: "Remove Ben Backup" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/does not delete their backed-up cloud data/i)).toBeTruthy();
    expect(within(dialog).getByText(/devices stay registered/i)).toBeTruthy();
    const revoke = within(dialog).getByLabelText("Also revoke this person's device credentials") as HTMLInputElement;
    expect(revoke.checked).toBe(true); // default ON
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove from Organization" }));

    await waitFor(() => expect(calls.some((c) => c.method === "DELETE")).toBe(true));
    expect(calls.find((c) => c.method === "DELETE")!.url).toBe("/api/v1/accounts/a1/users/m2?revokeDeviceCredentials=true");
    expect(await screen.findByText(/Ben Backup was removed from the Organization/)).toBeTruthy();
    expect(screen.getByText(/cloud backups were kept/i)).toBeTruthy();
  });

  it("unticking the option keeps their devices' credentials, and the request says so", async () => {
    const calls = serveWorld({
      role: "OrganizationAdmin",
      capabilities: ORG_ADMIN,
      extra: (_url, method) => (method === "DELETE" ? { status: 200, body: { userId: "m2", deviceCredentialsRevoked: false, devicesWithRevokedCredentials: 0, devicesRetained: 1 } } : undefined),
    });
    renderAt("/app/organization");
    fireEvent.click(await screen.findByRole("button", { name: "Remove Ben Backup" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByLabelText("Also revoke this person's device credentials"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove from Organization" }));

    await waitFor(() => expect(calls.some((c) => c.method === "DELETE")).toBe(true));
    expect(calls.find((c) => c.method === "DELETE")!.url).toContain("revokeDeviceCredentials=false");
    expect(await screen.findByText(/credentials were kept/i)).toBeTruthy();
  });

  it("the last Organization Admin cannot be removed: the server's reason is shown, nothing is reported as removed, and the list is not changed", async () => {
    const calls = serveWorld({
      role: "OrganizationAdmin",
      capabilities: ORG_ADMIN,
      extra: (_url, method) => (method === "DELETE" ? { status: 409, body: { error: "LastAdminGuard", message: "Cannot remove the last remaining Organization Admin. Make someone else an Organization Admin first." } } : undefined),
    });
    renderAt("/app/organization");
    fireEvent.click(await screen.findByRole("button", { name: "Remove Ada Admin" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove from Organization" }));

    expect(await within(dialog).findByText(/Cannot remove the last remaining Organization Admin/)).toBeTruthy();
    expect(screen.queryByText(/was removed from the Organization/)).toBeNull();
    expect(calls.filter((c) => c.method === "DELETE")).toHaveLength(1);
    expect(screen.getByText("Ada Admin")).toBeTruthy(); // still listed
  });
});

// ---------------------------------------------------------------- Devices

describe("Devices", () => {
  const device = (id: string, name: string, extra: Record<string, unknown> = {}) => ({ deviceId: id, name, operatingSystem: "Windows", agentVersion: "1.0.0", status: "Active", ownerUserId: "m2", ownerDisplayName: "Ben Backup", ownerRemoved: false, registeredAtUtc: "2026-09-01T00:00:00Z", lastSeenAtUtc: null, lastSession: null, backupSetId: null, ...extra });

  it("shows Owner removed for a device whose owner left the Organization, and it stays listed and registered", async () => {
    serveWorld({ role: "OrganizationAdmin", capabilities: ORG_ADMIN, devices: [device("d1", "ben-pc", { ownerRemoved: true }), device("d2", "ada-pc", { ownerUserId: "m1", ownerDisplayName: "Ada Admin" })] });
    renderAt("/app/devices");

    expect(await screen.findByText("ben-pc")).toBeTruthy();
    expect(screen.getAllByText("Owner removed")).toHaveLength(1); // only the one whose owner was removed
    expect(screen.getByText("Ada Admin")).toBeTruthy();
    expect(screen.queryByText("Unassigned")).toBeNull();
  });

  it("only someone the server allows to manage devices is offered Unregister", async () => {
    serveWorld({ role: "TeamAdmin", capabilities: TEAM_ADMIN_PP_ON, devices: [device("d1", "ben-pc")] });
    renderAt("/app/devices");
    expect(await screen.findByText("ben-pc")).toBeTruthy();
    expect(buttons("Unregister")).toHaveLength(0);
    cleanup();

    serveWorld({ role: "OrganizationAdmin", capabilities: ORG_ADMIN, devices: [device("d1", "ben-pc")] });
    renderAt("/app/devices");
    expect(await screen.findByRole("button", { name: "Unregister" })).toBeTruthy();
  });
});

// ---------------------------------------------------------------- Storage

describe("Storage", () => {
  it("shows the quota service's numbers as they are: total, logical use and what remains", async () => {
    serveWorld({ role: "OrganizationAdmin", capabilities: ORG_ADMIN });
    renderAt("/app/storage");

    expect(await screen.findByText(new RegExp(`${formatBytes(QUOTA.usedBytes)} of ${formatBytes(QUOTA.totalBytes)}`))).toBeTruthy();
    expect(screen.getByText(formatBytes(QUOTA.availableBytes))).toBeTruthy();
    expect(screen.getByText(formatBytes(QUOTA.reservedBytes))).toBeTruthy();
    expect(screen.queryByText(/per Team/i)).toBeNull(); // no per-Team quota exists
  });

  it("Stage 14 (S13B-FT3): an account with no quota row at all gets the same friendly 'choose a plan' state as a zero-provisioned one, not a generic failure", async () => {
    serveWorld({ role: "PersonalUser", capabilities: PERSONAL, extra: (url) => (url.pathname.startsWith("/api/v1/quota/") ? { status: 409, body: { error: "QuotaNotProvisioned", message: "This Account has no quota provisioned yet." } } : undefined) });
    renderAt("/app/storage");

    expect(await screen.findByText("No storage plan yet")).toBeTruthy();
    expect(screen.queryByText("This could not be loaded")).toBeNull();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull(); // retrying can never fix "no plan yet"
  });
});

// ---------------------------------------------------------------- Billing

describe("Billing controls follow the server's capabilities", () => {
  it("a Team Admin with Purchasing Power ON is offered purchasing and never a downgrade", async () => {
    serveWorld({ role: "TeamAdmin", capabilities: TEAM_ADMIN_PP_ON, subscription: { ...SUBSCRIPTION, pendingPlanId: "p0" } });
    renderAt("/app/billing");

    expect((await screen.findAllByRole("button", { name: "Select" })).length).toBeGreaterThan(0);
    expect(await screen.findByText(/A downgrade is scheduled/)).toBeTruthy(); // they can SEE it
    expect(buttons(/downgrade/i)).toHaveLength(0); // but cannot change it
    expect(screen.queryByRole("button", { name: /cancel/i })).toBeNull();
  });

  it("a Team Admin with Purchasing Power OFF sees no purchase control and is told why", async () => {
    serveWorld({ role: "TeamAdmin", capabilities: TEAM_ADMIN_PP_OFF, meExtra: { teamAdminPurchasingPowerEnabled: false } });
    renderAt("/app/billing");

    expect(await screen.findByText(/purchasing is turned off for your Organization/i)).toBeTruthy();
    expect(buttons("Select")).toHaveLength(0);
  });

  it("an Organization Admin can cancel a scheduled downgrade and change Purchasing Power", async () => {
    const calls = serveWorld({
      role: "OrganizationAdmin",
      capabilities: ORG_ADMIN,
      subscription: { ...SUBSCRIPTION, pendingPlanId: "p0" },
      extra: (url, method) => (method === "DELETE" && url.pathname.endsWith("/downgrade") ? { status: 200, body: { ...SUBSCRIPTION, pendingPlanId: null } } : undefined),
    });
    renderAt("/app/billing");

    fireEvent.click(await screen.findByRole("button", { name: "Cancel scheduled downgrade" }));
    await waitFor(() => expect(calls.some((c) => c.method === "DELETE" && c.url === "/api/v1/subscriptions/s1/downgrade")).toBe(true));
    expect(screen.getByRole("heading", { name: "Team Admin purchasing power" })).toBeTruthy();
  });

  it("a Personal user is offered their own purchasing and the downgrade cancel, and no Organization setting", async () => {
    serveWorld({ role: "PersonalUser", capabilities: PERSONAL, subscription: { ...SUBSCRIPTION, pendingPlanId: "p0" } });
    renderAt("/app/billing");

    expect(await screen.findByRole("button", { name: "Cancel scheduled downgrade" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Team Admin purchasing power" })).toBeNull();
  });

  it("a Backup User has no Billing page", async () => {
    serveWorld({ role: "BackupUser", capabilities: BACKUP_USER });
    renderAt("/app/billing");
    expect(await screen.findByText("Not available for your role")).toBeTruthy();
  });
});

// ---------------------------------------------------------------- Security and restore controls

describe("Security and restore controls", () => {
  it("Master Locks are switchable only when the server allows it, and the Team Admin sees no Master Lock controls", async () => {
    serveWorld({ role: "OrganizationAdmin", capabilities: ORG_ADMIN });
    renderAt("/app/security");
    expect(await screen.findByText("Organization Restore Lock")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /^(Lock|Unlock)$/ }).length).toBe(2);
    cleanup();

    serveWorld({ role: "TeamAdmin", capabilities: TEAM_ADMIN_PP_ON });
    renderAt("/app/security");
    expect(await screen.findByText("Organization Restore Lock")).toBeTruthy(); // visible as a state
    expect(buttons(/^(Lock|Unlock)$/)).toHaveLength(0); // not changeable
  });

  it("Your permissions come from the server's capabilities and name the gate that blocks a restore", async () => {
    serveWorld({ role: "BackupUser", capabilities: { ...BACKUP_USER, restoreBlockedBy: "OrganizationMasterRestoreLock" }, meExtra: { restoreEnabled: true, deleteEnabled: false } });
    renderAt("/app/security");

    const card = (await screen.findByText("Your permissions")).closest("section")!;
    expect(within(card).getByText(/Not allowed - your Organization's Restore Lock is on/)).toBeTruthy(); // restoreEnabled is true, the LOCK still blocks it
    expect(within(card).getByText("Backup").nextElementSibling?.textContent).toBe("Allowed");
  });
});

// ---------------------------------------------------------------- S13B-FT1: a lock change is followed by a fresh /dashboard/me

describe("changing a Restore Lock refreshes the restore answer at once, with no reload (S13B-FT1)", () => {
  const withGate = (base: Record<string, unknown>, gate: string | null) => ({ ...base, restore: gate === null, deleteData: gate === null, restoreBlockedBy: gate });

  /** A server whose /dashboard/me and account answers follow the lock, changing at the moment the PATCH arrives. */
  function lockServer(role: Role, before: unknown, after: unknown, lockPath: string, accountAfter: (changed: boolean) => unknown) {
    let changed = false;
    return serveWorld({
      role,
      capabilities: before,
      extra: (url, method) => {
        if (method === "PATCH" && url.pathname.endsWith(lockPath)) {
          changed = true;
          return { status: 200, body: true };
        }
        if (url.pathname.endsWith("/dashboard/me")) return { status: 200, body: meBody(role, changed ? after : before) };
        if (method === "GET" && url.pathname === "/api/v1/accounts/a1") return { status: 200, body: accountAfter(changed) };
        return undefined;
      },
    });
  }

  const restoreAnswer = async () => {
    const card = (await screen.findByText("Your permissions")).closest("section")!;
    return within(card).getByText("Restore").nextElementSibling?.textContent;
  };

  it("an Organization Admin who UNLOCKS the Organization Restore Lock sees Restore allowed on the same page, without pressing F5", async () => {
    const calls = lockServer("OrganizationAdmin", withGate(ORG_ADMIN, "OrganizationMasterRestoreLock"), withGate(ORG_ADMIN, null), "/accounts/a1/locks", (changed) => ({ ...ACCOUNT, masterRestoreLockEnabled: !changed }));
    renderAt("/app/security");
    expect(await restoreAnswer()).toBe("Not allowed - your Organization's Restore Lock is on");

    fireEvent.click(await screen.findByRole("button", { name: "Unlock" }));

    await waitFor(async () => expect(await restoreAnswer()).toBe("Allowed"));
    expect(calls.some((c) => c.method === "PATCH" && (c.body as { masterRestoreLockEnabled?: boolean }).masterRestoreLockEnabled === false)).toBe(true);
  });

  it("an Organization Admin who LOCKS the Organization Restore Lock sees Restore blocked, naming the lock, on the same page", async () => {
    lockServer("OrganizationAdmin", withGate(ORG_ADMIN, null), withGate(ORG_ADMIN, "OrganizationMasterRestoreLock"), "/accounts/a1/locks", (changed) => ({ ...ACCOUNT, masterRestoreLockEnabled: changed }));
    renderAt("/app/security");
    expect(await restoreAnswer()).toBe("Allowed");

    fireEvent.click((await screen.findAllByRole("button", { name: "Lock" }))[0]); // the first Lock button is the Organization Restore Lock

    await waitFor(async () => expect(await restoreAnswer()).toBe("Not allowed - your Organization's Restore Lock is on"));
  });

  it("a Team Admin who locks their Team's Restore Lock sees Restore blocked, naming the Team lock, on the next page they open, without a reload", async () => {
    const teamAdmin = TEAM_ADMIN_PP_ON;
    const calls = lockServer("TeamAdmin", withGate(teamAdmin, null), withGate(teamAdmin, "TeamRestoreLock"), "/teams/t1/locks", (changed) => ({ ...ACCOUNT, teams: [{ ...ACCOUNT.teams[0], restoreLockEnabled: changed }] }));
    renderAt("/app/organization");

    fireEvent.click(await screen.findByRole("button", { name: "Lock restore for this Team" }));
    await screen.findByRole("button", { name: "Unlock restore for this Team" }); // the card itself already showed the new state
    expect(calls.filter((c) => c.url.endsWith("/dashboard/me")).length).toBeGreaterThanOrEqual(2); // and /me was asked again

    fireEvent.click(within(await screen.findByLabelText("Dashboard")).getByRole("link", { name: "Security" })); // client-side, no reload
    expect(await restoreAnswer()).toBe("Not allowed - your Team's Restore Lock is on");
  });

  it("a Team Admin who unlocks their Team's Restore Lock sees Restore allowed again on the next page they open", async () => {
    const teamAdmin = TEAM_ADMIN_PP_ON;
    lockServer("TeamAdmin", withGate(teamAdmin, "TeamRestoreLock"), withGate(teamAdmin, null), "/teams/t1/locks", (changed) => ({ ...ACCOUNT, teams: [{ ...ACCOUNT.teams[0], restoreLockEnabled: !changed }] }));
    renderAt("/app/organization");

    fireEvent.click(await screen.findByRole("button", { name: "Unlock restore for this Team" }));
    await screen.findByRole("button", { name: "Lock restore for this Team" });

    fireEvent.click(within(await screen.findByLabelText("Dashboard")).getByRole("link", { name: "Security" }));
    expect(await restoreAnswer()).toBe("Allowed");
  });

  it("a lock change the server REFUSES is reported and the restore answer stays as the server last said", async () => {
    const calls = serveWorld({
      role: "OrganizationAdmin",
      capabilities: withGate(ORG_ADMIN, "OrganizationMasterRestoreLock"),
      extra: (url, method) => (method === "PATCH" && url.pathname.endsWith("/accounts/a1/locks") ? { status: 500, body: { message: "The lock could not be changed." } } : undefined),
    });
    renderAt("/app/security");
    fireEvent.click(await screen.findByRole("button", { name: "Unlock" }));

    await waitFor(() => expect(calls.some((c) => c.method === "PATCH")).toBe(true));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByText("The Master Lock was updated.")).toBeNull(); // no success is claimed
    expect(await restoreAnswer()).toBe("Not allowed - your Organization's Restore Lock is on");
  });
});

// ---------------------------------------------------------------- Emergency Stop

describe("Emergency Stop", () => {
  const ACTIVE = (mayControl: boolean) => ({ emergencyStopActive: true, changedAtUtc: "2026-09-21T10:00:00Z", reason: "Ransomware suspected", callerMayControl: mayControl });

  it("an Organization Admin can trigger it (reason and typed confirmation) when it is not active", async () => {
    serveWorld({ role: "OrganizationAdmin", capabilities: ORG_ADMIN });
    renderAt("/app/security");
    fireEvent.click(await screen.findByRole("button", { name: /Trigger Emergency Stop/ }));
    const dialog = await screen.findByRole("dialog");
    expect((within(dialog).getByRole("button", { name: "Stop all backups" }) as HTMLButtonElement).disabled).toBe(true); // nothing is sent without a reason
  });

  it("an Organization Admin can resume it manually, from the banner and from the Security page, with a reason", async () => {
    const calls = serveWorld({
      role: "OrganizationAdmin",
      capabilities: ORG_ADMIN,
      control: ACTIVE(true),
      extra: (url, method) => (method === "POST" && url.pathname.endsWith("/emergency-stop/resume") ? { status: 200, body: {} } : undefined),
    });
    renderAt("/app/security");

    expect(await screen.findByRole("alert")).toBeTruthy();
    const resumeButtons = await screen.findAllByRole("button", { name: "Resume backups" });
    expect(resumeButtons.length).toBe(2); // the banner and the Security card
    expect(buttons(/Trigger Emergency Stop/)).toHaveLength(0); // already active
    fireEvent.click(resumeButtons[1]);
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "Incident resolved" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Resume backups" }));
    await waitFor(() => expect(calls.find((c) => c.url.endsWith("/emergency-stop/resume"))?.body).toEqual({ reason: "Incident resolved" }));
  });

  it("a Team Admin, a Backup User and a Personal user see the banner but no trigger or resume control", async () => {
    for (const [role, capabilities] of [["TeamAdmin", TEAM_ADMIN_PP_ON], ["BackupUser", BACKUP_USER], ["PersonalUser", PERSONAL]] as const) {
      serveWorld({ role, capabilities, control: ACTIVE(false) });
      renderAt("/app/security");
      expect(await screen.findByRole("alert")).toBeTruthy();
      expect(buttons(/Resume backups/)).toHaveLength(0);
      expect(buttons(/Trigger Emergency Stop/)).toHaveLength(0);
      cleanup();
    }
  });

  it("the server's word decides: a capability without the server's own control answer offers nothing", async () => {
    serveWorld({ role: "OrganizationAdmin", capabilities: ORG_ADMIN, control: ACTIVE(false) }); // control-state says this caller may not control it
    renderAt("/app/security");
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(buttons(/Resume backups/)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------- stale capabilities, malformed answers, hidden features

describe("capability refresh and fail-closed behaviour", () => {
  it("a 403 refreshes /dashboard/me so a stale page drops the control the person no longer has", async () => {
    const calls = serveWorld({
      role: "TeamAdmin",
      capabilities: TEAM_ADMIN_PP_ON,
      meSequence: [meBody("TeamAdmin", TEAM_ADMIN_PP_ON), meBody("TeamAdmin", caps("viewMembers", "viewOwnTeamDevices", "viewBilling", "viewQuota"))], // demoted meanwhile: no more Team lock
      account: { ...ACCOUNT, teams: [ACCOUNT.teams[0]] },
      members: [MEMBERS[1]],
      extra: (url, method) => (method === "PATCH" && url.pathname.endsWith("/teams/t1/locks") ? { status: 403, body: { allowed: false, deniedByGate: "ForeignTeam", reason: "no" } } : undefined),
    });
    renderAt("/app/organization");

    fireEvent.click(await screen.findByRole("button", { name: /restore for this Team/ }));

    await waitFor(() => expect(screen.queryByRole("button", { name: /restore for this Team/ })).toBeNull()); // the control is gone
    expect(calls.filter((c) => c.url.endsWith("/dashboard/me")).length).toBeGreaterThanOrEqual(2); // /me was asked again
  });

  it("many 403s in a row cause one refresh at a time, not a loop, and a /me that itself answers 403 does not trigger more", async () => {
    const calls = serveWorld({
      role: "OrganizationAdmin",
      capabilities: ORG_ADMIN,
      extra: (url) => (url.pathname.endsWith("/dashboard/members") ? { status: 403, body: { allowed: false } } : undefined),
    });
    renderAt("/app/organization");
    await screen.findAllByText(/permission/i);
    await new Promise((resolve) => setTimeout(resolve, 50));
    const meCalls = calls.filter((c) => c.url.endsWith("/dashboard/me")).length;
    expect(meCalls).toBeGreaterThanOrEqual(2); // the 403 did cause a refresh
    expect(meCalls).toBeLessThanOrEqual(3); // ...and not a loop
  });

  it("malformed capabilities offer nothing: strings and numbers are not true, and the person is not shown administration", async () => {
    serveWorld({ role: "OrganizationAdmin", capabilities: { manageUsers: "true", viewMembers: 1, viewBilling: "yes", manageTeams: {} } });
    renderAt("/app/organization");

    expect(await screen.findByText("Not available for your role")).toBeTruthy();
    const labels = await navLabels();
    expect(labels).not.toContain("Users & Teams");
    expect(labels).not.toContain("Billing");
  });

  it("no capabilities at all (an older server) offers nothing privileged anywhere", async () => {
    serveWorld({ role: "OrganizationAdmin", capabilities: undefined });
    renderAt("/app/security");
    expect(await screen.findByRole("heading", { level: 1, name: "Security" })).toBeTruthy();
    expect(buttons(/Trigger Emergency Stop/)).toHaveLength(0);
    expect(buttons(/^(Lock|Unlock)$/)).toHaveLength(0);
  });

  it("features that do not exist yet are not offered, not even as disabled placeholders", async () => {
    serveWorld({ role: "OrganizationAdmin", capabilities: ORG_ADMIN, subscription: { ...SUBSCRIPTION } });
    const forbidden = /invit|transfer ownership|delete team|rename (the )?organization|device (cap|limit)|per-team quota|restore (usage|metering)|download invoice|exclusion/i;
    for (const path of ["/app", "/app/organization", "/app/billing", "/app/storage", "/app/security", "/app/devices", "/app/settings"]) {
      renderAt(path);
      await screen.findByRole("heading", { level: 1 });
      await new Promise((resolve) => setTimeout(resolve, 20));
      const offered = [...screen.queryAllByRole("button"), ...screen.queryAllByRole("link")].map((e) => e.textContent ?? "").filter((text) => forbidden.test(text));
      expect(offered, `on ${path}`).toEqual([]);
      cleanup();
    }
  });
});

// ---------------------------------------------------------------- Codex Stage 13B final review: P2-1 and P2-2

describe("Codex final review P2-1: a saved Purchasing Power change is never reported as failed because the refresh failed", () => {
  it("the PATCH succeeded and the /dashboard/me refresh fails: the customer is told it worked, not that it failed", async () => {
    let changed = false;
    const calls = serveWorld({
      role: "OrganizationAdmin",
      capabilities: ORG_ADMIN,
      extra: (url, method) => {
        if (url.pathname.endsWith("/history")) return { status: 200, body: [] }; // the subscription history the Billing page also loads
        if (method === "PATCH" && url.pathname.endsWith("/organization/purchasing-power")) {
          changed = true;
          return { status: 200, body: true };
        }
        if (changed && url.pathname.endsWith("/dashboard/me")) return { status: 500, body: { message: "temporary trouble" } }; // the refresh AFTER the save fails
        return undefined;
      },
    });
    renderAt("/app/billing");

    const turnOff = await screen.findByRole("button", { name: /Turn off/ });
    const alertsBefore = screen.queryAllByRole("alert").map((a) => a.textContent); // whatever the page already showed (this fake has no history route)
    fireEvent.click(turnOff);

    expect(await screen.findByText("Team Admin purchasing power is now off.")).toBeTruthy(); // the server committed it, and the page says so
    await waitFor(() => expect(calls.filter((c) => c.url.endsWith("/dashboard/me") && c.method === "GET").length).toBeGreaterThanOrEqual(2)); // the refresh really was attempted (and failed)
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByText(/temporary trouble/)).toBeNull(); // the refresh failure is not shown as if the save had failed
    expect(screen.queryAllByRole("alert").map((a) => a.textContent)).toEqual(alertsBefore); // no NEW failure notice of any kind
    expect(screen.getByText("Team Admin purchasing power is now off.")).toBeTruthy();
  });

  it("a Purchasing Power change the server REFUSES is still reported as a failure and never as success", async () => {
    serveWorld({
      role: "OrganizationAdmin",
      capabilities: ORG_ADMIN,
      extra: (url, method) => (method === "PATCH" && url.pathname.endsWith("/organization/purchasing-power") ? { status: 500, body: { message: "The setting could not be saved." } } : undefined),
    });
    renderAt("/app/billing");

    fireEvent.click(await screen.findByRole("button", { name: /Turn off/ }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.queryByText("Team Admin purchasing power is now off.")).toBeNull();
  });

  it("when the change and the refresh both work, the page shows the new state", async () => {
    let changed = false;
    serveWorld({
      role: "OrganizationAdmin",
      capabilities: ORG_ADMIN,
      extra: (url, method) => {
        if (method === "PATCH" && url.pathname.endsWith("/organization/purchasing-power")) {
          changed = true;
          return { status: 200, body: true };
        }
        if (url.pathname.endsWith("/dashboard/me")) return { status: 200, body: meBody("OrganizationAdmin", ORG_ADMIN, { teamAdminPurchasingPowerEnabled: !changed }) };
        return undefined;
      },
    });
    renderAt("/app/billing");

    fireEvent.click(await screen.findByRole("button", { name: /Turn off/ }));

    expect(await screen.findByRole("button", { name: /Turn on/ })).toBeTruthy();
  });
});

describe("Codex final review P2-2: Smart Cleanup names the right reason when deleting is unavailable", () => {
  let unmount = () => {};
  const open = (capabilities: unknown, meExtra: Record<string, unknown> = {}) => {
    serveWorld({
      role: "BackupUser",
      capabilities,
      meExtra: { deleteEnabled: true, ...meExtra },
      extra: (url) => (url.pathname.endsWith("/smart-cleanup/candidates") ? { status: 200, body: [] } : undefined),
    });
    unmount = renderAt("/app/smart-cleanup").unmount;
  };
  const notice = async () => (await screen.findByText(/(delete permission|Restore Lock|restore\/delete controls)/i)).textContent ?? "";

  it("direct Delete permission denied (Restore is allowed): the notice names the Delete permission", async () => {
    open({ ...BACKUP_USER, restore: true, deleteData: false, restoreBlockedBy: null });
    expect(await notice()).toMatch(/does not have delete permission/);
  });

  it("the Organization Restore Lock blocks deletion: the notice names the Organization Restore Lock, not the Delete permission", async () => {
    open({ ...BACKUP_USER, restore: false, deleteData: false, restoreBlockedBy: "OrganizationMasterRestoreLock" }, { deleteEnabled: true });
    const text = await notice();
    expect(text).toMatch(/Organization's Restore Lock/);
    expect(text).not.toMatch(/does not have delete permission/);
  });

  it("the Team Restore Lock blocks deletion: the notice names the Team Restore Lock, not the Delete permission", async () => {
    open({ ...BACKUP_USER, restore: false, deleteData: false, restoreBlockedBy: "TeamRestoreLock" }, { deleteEnabled: true });
    const text = await notice();
    expect(text).toMatch(/Team's Restore Lock/);
    expect(text).not.toMatch(/does not have delete permission/);
  });

  it("a gate the server names for Restore that says nothing about Delete gets neutral wording, not an invented reason", async () => {
    for (const gate of ["UserRestorePermission", "MfaRequired", "SomeFutureGate"]) {
      open({ ...BACKUP_USER, restore: false, deleteData: false, restoreBlockedBy: gate });
      const text = await notice();
      expect(text).toMatch(/currently unavailable because of your account's restore\/delete controls/);
      expect(text).not.toMatch(/does not have delete permission/);
      expect(text).not.toMatch(/Restore Lock/);
      unmount();
    }
  });

  it("when deleting is allowed there is no notice at all, and the Trash action is not disabled by the page", async () => {
    open({ ...BACKUP_USER, restore: true, deleteData: true, restoreBlockedBy: null });
    await screen.findByRole("heading", { level: 1, name: "Smart Cleanup" });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByText(/delete permission|Restore Lock|restore\/delete controls/i)).toBeNull();
  });

  it("whatever the wording, the server still enforces: the delete action stays disabled while deleteData is false", async () => {
    serveWorld({
      role: "BackupUser",
      capabilities: { ...BACKUP_USER, restore: false, deleteData: false, restoreBlockedBy: "TeamRestoreLock" },
      extra: (url) => (url.pathname.endsWith("/smart-cleanup/candidates") ? { status: 200, body: [{ id: "c1", deviceId: "d1", deviceName: "PC", path: "C:\a.txt", fileName: "a.txt", sizeBytes: 10, detectedAtUtc: "2026-09-01T00:00:00Z", deletedLocallyAtUtc: "2026-09-01T00:00:00Z", contentHash: "h" }] } : undefined),
    });
    renderAt("/app/smart-cleanup");
    fireEvent.click(await screen.findByRole("button", { name: "Select all" }));
    expect((await screen.findByRole("button", { name: /Move backups to Trash/ })).hasAttribute("disabled")).toBe(true);
  });
});

// ---------------------------------------------------------------- Stage 13C: the Devices page Exclusions dialog

describe("Device exclusions (Stage 13C): the website is the only editor", () => {
  const device = (id: string, name: string) => ({ deviceId: id, name, operatingSystem: "Windows", agentVersion: "1.0.0", status: "Active", ownerUserId: "m2", ownerDisplayName: "Ben Backup", ownerRemoved: false, registeredAtUtc: "2026-09-01T00:00:00Z", lastSeenAtUtc: null, lastSession: null, backupSetId: "b1" });
  const ruleOf = (id: string, type: number, value: string) => ({ id, type, value });

  /** A fake exclusions endpoint that keeps the rule list like the server does and answers with the whole saved list. */
  function exclusionsServer(start: unknown[], editAllowed: boolean, refuse?: { method: string; status: number; error: string; message: string }) {
    let rules = [...start] as Array<{ id: string; type: number; value: string }>;
    return (url: URL, method: string, body: unknown): Answer | undefined => {
      if (!url.pathname.startsWith("/api/v1/devices/d1/exclusions")) return undefined;
      if (refuse && refuse.method === method) return { status: refuse.status, body: { error: refuse.error, message: refuse.message } };
      if (method === "POST") rules = [...rules, ruleOf(`n${rules.length}`, (body as { type: number }).type, `.${String((body as { value: string }).value).replace(/^\./, "")}`)];
      if (method === "DELETE") rules = rules.filter((r) => !url.pathname.endsWith(`/${r.id}`));
      return { status: 200, body: { editAllowed, rules } };
    };
  }

  const open = async (role: Role, capabilities: unknown, extra: Route) => {
    serveWorld({ role, capabilities, devices: [device("d1", "ben-pc")], extra });
    renderAt("/app/devices");
    fireEvent.click(await screen.findByRole("button", { name: "Exclusions" }));
    return screen.findByRole("dialog");
  };

  it("an Organization Admin lists, adds and removes rules, and each change is one request whose answer is the new list", async () => {
    const calls = serveWorld({ role: "OrganizationAdmin", capabilities: ORG_ADMIN, devices: [device("d1", "ben-pc")], extra: exclusionsServer([ruleOf("r1", 2, "node_modules")], true) });
    renderAt("/app/devices");
    fireEvent.click(await screen.findByRole("button", { name: "Exclusions" }));
    const dialog = await screen.findByRole("dialog");

    expect(await within(dialog).findByText("node_modules")).toBeTruthy();
    expect(within(within(dialog).getByRole("table")).getByText("Folder name")).toBeTruthy(); // the Type column (the dropdown offers the same word)

    fireEvent.change(within(dialog).getByLabelText("Type"), { target: { value: "0" } });
    fireEvent.change(within(dialog).getByLabelText("Value"), { target: { value: "tmp" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add exclusion" }));
    expect(await within(dialog).findByText(".tmp")).toBeTruthy();
    const post = calls.find((c) => c.method === "POST" && c.url.includes("/exclusions"));
    expect(post?.body).toEqual({ type: 0, value: "tmp" }); // the server normalises; the page sends what was typed
    expect((within(dialog).getByLabelText("Value") as HTMLInputElement).value).toBe(""); // ready for the next one

    fireEvent.click(within(dialog).getByRole("button", { name: "Remove Folder name node_modules" }));
    await waitFor(() => expect(within(dialog).queryByText("node_modules")).toBeNull());
    expect(calls.find((c) => c.method === "DELETE" && c.url.includes("/exclusions"))?.url).toBe("/api/v1/devices/d1/exclusions/r1");
    expect(calls.filter((c) => c.url.includes("/exclusions") && c.method === "GET")).toHaveLength(1); // no reload after a write
  });

  it("a Team Admin (no device-management capability) can open the dialog and edit; Unregister stays hidden", async () => {
    const dialog = await open("TeamAdmin", TEAM_ADMIN_PP_ON, exclusionsServer([], true));
    expect(await within(dialog).findByRole("button", { name: "Add exclusion" })).toBeTruthy();
    expect(within(dialog).getByText(/No exclusions/)).toBeTruthy();
    expect(buttons("Unregister")).toHaveLength(0);
  });

  it("when the server says the person may not edit, the rules are shown read-only: no Add form and no Remove buttons", async () => {
    const dialog = await open("BackupUser", BACKUP_USER, exclusionsServer([ruleOf("r1", 0, ".tmp")], false));
    expect(await within(dialog).findByText(".tmp")).toBeTruthy();
    expect(within(dialog).queryByRole("button", { name: "Add exclusion" })).toBeNull();
    expect(within(dialog).queryByLabelText("Value")).toBeNull();
    expect(within(dialog).queryByRole("button", { name: /^Remove/ })).toBeNull();
    expect(within(dialog).getByText(/Only an administrator of this device can change its exclusions/)).toBeTruthy();
  });

  it("shows the server's plain-language reason for a rule it refuses (invalid, duplicate) and keeps the list as it was", async () => {
    for (const refusal of [
      { status: 400, error: "InvalidExclusionRule", message: "Use a name only: wildcards such as * are not supported." },
      { status: 409, error: "ExclusionRuleAlreadyExists", message: "That exclusion already exists." },
      { status: 403, error: "NotAuthorized", message: "You do not have permission to change exclusions on this device." },
      { status: 404, error: "DeviceNotFound", message: "We could not find that device." },
    ]) {
      const dialog = await open("OrganizationAdmin", ORG_ADMIN, exclusionsServer([ruleOf("r1", 2, "cache")], true, { method: "POST", ...refusal }));
      fireEvent.change(await within(dialog).findByLabelText("Value"), { target: { value: "x" } });
      fireEvent.click(within(dialog).getByRole("button", { name: "Add exclusion" }));
      expect((await within(dialog).findByRole("alert")).textContent).toContain(refusal.message);
      expect(within(dialog).getByText("cache")).toBeTruthy();
      cleanup();
    }
  });

  it("a device with no Backup Set yet is told to choose what to protect first, and no rule can be entered", async () => {
    const noSet = { status: 409, body: { error: "NoBackupSetForExclusions", message: "internal wording" } };
    const dialog = await open("OrganizationAdmin", ORG_ADMIN, (url) => (url.pathname.startsWith("/api/v1/devices/d1/exclusions") ? noSet : undefined));
    expect(await within(dialog).findByText("Choose what to protect first before configuring exclusions.")).toBeTruthy();
    expect(within(dialog).queryByRole("button", { name: "Add exclusion" })).toBeNull();
  });

  it("a device with several Backup Sets from an earlier version shows the server's explanation and offers no way to add or remove a rule", async () => {
    const message = "This device has more than one Backup Set from an earlier version of Tornova, so its exclusions cannot be edited here yet.";
    const dialog = await open("OrganizationAdmin", ORG_ADMIN, (url) => (url.pathname.startsWith("/api/v1/devices/d1/exclusions") ? { status: 409, body: { error: "AmbiguousBackupSet", message } } : undefined));
    expect(await within(dialog).findByText(message)).toBeTruthy();
    expect(within(dialog).queryByRole("button", { name: "Add exclusion" })).toBeNull();
    expect(within(dialog).queryByLabelText("Value")).toBeNull();
  });

  it("states that an exclusion never deletes anything", async () => {
    const dialog = await open("PersonalUser", PERSONAL, exclusionsServer([], true));
    expect(await within(dialog).findByText(/never deletes anything/)).toBeTruthy();
  });
});
