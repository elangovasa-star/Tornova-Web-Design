import { NO_CAPABILITIES } from "./lib/capabilities";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { activityRange, restoreResult, scheduleFrequencyLabel } from "./app/pages/Protect";
import { restoreStatusView } from "./app/pages/Recover";
import { FOOTER, MAIN_NAV } from "./components/SiteLayout";
import { I18nProvider } from "./i18n";
import { session } from "./lib/api";
import { severityTone } from "./app/pages/Manage";
import { AuthProvider, decideAccount, type AccountOption } from "./lib/auth";
import { DEFAULT_CONFIG, SiteConfigProvider } from "./lib/config";
import { APP_ROUTES, AUTH_ROUTES, PUBLIC_ROUTES } from "./routes";
import { FAQ_CATEGORIES, FAQ_ITEMS, HOME_FAQ_IDS } from "./site/content/faq";
import { FEEDBACK_SUBJECTS, searchFaq } from "./site/pages/FaqAndFeedback";

type Handler = (url: string, init?: RequestInit) => { status: number; body?: unknown } | undefined;

/** A tiny fake server. Anything not answered is a 401, like a signed-out visitor. */
function serve(handler: Handler) {
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : undefined });
      const answer = handler(url, init) ?? { status: 401, body: { error: "Unauthorized" } };
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

describe("public website", () => {
  it("keeps the locked main navigation order and footer links", () => {
    expect(MAIN_NAV.map((n) => n.label)).toEqual(["Download", "Features", "Personal", "Organization", "Trials", "Pricing", "FAQ", "Security", "Pioneer", "Support"]);
    const footer = FOOTER.flatMap((column) => column.links.map((l) => l.to));
    for (const to of ["/contact", "/feedback", "/faq", "/pricing"]) expect(footer).toContain(to);
  });

  it.each([...PUBLIC_ROUTES, ...AUTH_ROUTES])("renders %s with one page heading", (path) => {
    serve(() => undefined);
    renderAt(path);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.queryByText("Page not found")).toBeNull();
  });

  it("shows a not-found page for an unknown address", () => {
    serve(() => undefined);
    renderAt("/no-such-page");
    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeTruthy();
  });

  it("an anonymous visitor never asks the server for a session", () => {
    const calls = serve(() => undefined);
    renderAt("/");
    expect(calls.filter((c) => c.url.includes("/web/auth/"))).toHaveLength(0);
  });

  it("sends a signed-out visitor from the dashboard to Sign In", async () => {
    serve(() => undefined);
    renderAt("/app/devices");
    expect(await screen.findByRole("heading", { level: 1, name: "Sign In" })).toBeTruthy();
  });

  it("ends the header with Language, Sign In, Sign Up - and never lists Referral or Offers in it", () => {
    serve(() => undefined);
    renderAt("/");
    const header = document.querySelector("header.site-header")!;
    const actions = [...header.querySelectorAll(".header-actions select, .header-actions a")].map((e) => (e.tagName === "SELECT" ? "Language" : e.textContent));
    expect(actions).toEqual(["Language", "Sign In", "Sign Up"]);
    expect(header.querySelector(".header-actions a:last-child")!.className).toContain("btn-primary"); // Sign Up is the strongest CTA
    const navText = header.querySelector("#main-nav")!.textContent!;
    expect(navText).not.toMatch(/Referral|Offers/);
  });

  it("shows the Organization Offers and Referral Rewards bar between the header and the hero", () => {
    serve(() => undefined);
    renderAt("/");
    const bar = screen.getByLabelText("Offers");
    expect(within(bar).getByText("Organization Discounts up to 18%")).toBeTruthy();
    expect(within(bar).getByRole("link", { name: /Explore Organization Offers/ }).getAttribute("href")).toContain("/pricing?for=organization");
    expect(within(bar).getByText("Share Tornova. Earn Referral Rewards.")).toBeTruthy();
    expect(within(bar).getByRole("link", { name: /Learn About Referral Program/ }).getAttribute("href")).toBe("/referral");
    expect(bar.compareDocumentPosition(document.querySelector("section.hero")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("offers 5 / 10 / 50 / 100 GB only, and a custom plan above that", () => {
    serve(() => undefined);
    renderAt("/pricing");
    const text = document.querySelector("main")!.textContent!;
    expect(text).toContain("100 GB");
    expect(text).not.toMatch(/500 GB|1 TB/);
    expect(text).toContain("Need more than 100 GB? Contact Tornova for a custom storage plan.");
  });

  it("publishes the referral table without the internal code categories", () => {
    serve(() => undefined);
    renderAt("/referral");
    const text = document.querySelector("main")!.textContent!;
    expect(text).toContain("2.7%");
    expect(text).toContain("Manual / Case-by-case");
    expect(text).not.toMatch(/NOVA-/);
  });

  it("offers only English until another language is approved by the server", () => {
    serve(() => undefined);
    renderAt("/");
    const options = within(screen.getByLabelText("Language")).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["English"]);
  });
});

describe("FAQ content", () => {
  it("has unique ids, a known category and an answer for every question", () => {
    expect(new Set(FAQ_ITEMS.map((f) => f.id)).size).toBe(FAQ_ITEMS.length);
    const categories = new Set(FAQ_CATEGORIES.map((c) => c.id));
    expect(categories.size).toBe(12);
    for (const item of FAQ_ITEMS) {
      expect(categories.has(item.category), item.id).toBe(true);
      expect(item.answer.join("").trim().length, item.id).toBeGreaterThan(0);
    }
  });

  it("every FAQ question linked from a page exists", () => {
    const sources = import.meta.glob("./site/**/*.tsx", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
    const ids = new Set(FAQ_ITEMS.map((f) => f.id));
    const linked = [...HOME_FAQ_IDS];
    for (const source of Object.values(sources)) {
      for (const list of source.matchAll(/(?:ids=\{|_FAQ(?:: string\[\])? = )\[([^\]]+)\]/g)) {
        linked.push(...[...list[1].matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]));
      }
    }
    expect(linked.length).toBeGreaterThan(25);
    for (const id of linked) expect(ids.has(id), id).toBe(true);
  });

  it("searches questions and answers, within a category when one is chosen", () => {
    expect(searchFaq(FAQ_ITEMS, "", null)).toHaveLength(FAQ_ITEMS.length);
    const hits = searchFaq(FAQ_ITEMS, "RESTORE lock", null);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => /restore/i.test(h.question + h.answer.join(" ")))).toBe(true);
    const category = hits[0].category;
    expect(searchFaq(FAQ_ITEMS, "restore lock", category).every((h) => h.category === category)).toBe(true);
    expect(searchFaq(FAQ_ITEMS, "zzzz-not-a-word", null)).toHaveLength(0);
  });
});

// Stage 17 Web-S001, Issue 3: "Link to this answer" looked broken because a plain <a href="#id"> inside
// react-router's BrowserRouter does not update the router's own location state (react-router's history
// only listens for popstate, which a same-page hash-only anchor click does not fire) - so useLocation()'s
// hash went stale and the deep-link effect never re-ran. Fixed by using react-router's own <Link> (so
// navigation is tracked correctly) plus a direct revealFaqAnswer() call on click, so every click gives a
// visible response even when the target answer is already open and already in view (where a scroll
// alone would show no motion). These tests exercise every FAQ item this way, not just the two reported.
describe("FAQ 'Link to this answer'", () => {
  it(
    "a direct/copied '#id' URL opens the right answer on a fresh load, for every FAQ item",
    async () => {
      for (const item of FAQ_ITEMS) {
        serve(() => undefined);
        renderAt(`/faq#${item.id}`);
        await waitFor(() => expect(document.getElementById(item.id)).toBeTruthy());
        const element = document.getElementById(item.id) as HTMLDetailsElement;
        expect(element.tagName).toBe("DETAILS");
        expect(element.open, item.id).toBe(true);
        cleanup();
      }
    },
    30000, // 124 full-app renders (every FAQ item, not just the two reported) - inherently heavier than a normal test
  );

  it("clicking 'Link to this answer' opens it, points the link at the right hash, and visibly confirms the click", async () => {
    serve(() => undefined);
    renderAt("/faq");
    // does-tornova-provide-backup-health-monitoring and what-can-i-do-from-the-tornova-web-dashboard were
    // the two specifically reported; check those two plus a third, unrelated item for the shared fix.
    for (const id of ["does-tornova-provide-backup-health-monitoring", "what-can-i-do-from-the-tornova-web-dashboard", FAQ_ITEMS[0].id]) {
      const element = document.getElementById(id) as HTMLDetailsElement;
      expect(element, id).toBeTruthy();
      expect(element.open, id).toBe(false); // closed before the click - nothing pre-opened it
      const link = within(element).getByText("Link to this answer");
      expect(link.getAttribute("href"), id).toBe(`/faq#${id}`);

      fireEvent.click(link);

      expect(element.open, id).toBe(true);
      expect(element.classList.contains("faq-linked"), id).toBe(true); // the visible highlight - the actual fix for "does not respond"
    }
  });

  it("every FAQ item's answer has exactly one 'Link to this answer', targeting its own unique id", () => {
    serve(() => undefined);
    renderAt("/faq");
    for (const item of FAQ_ITEMS) {
      const element = document.getElementById(item.id);
      expect(element, item.id).toBeTruthy();
      expect(within(element as HTMLElement).getAllByText("Link to this answer")).toHaveLength(1);
    }
    // Asserted again here (not just in "has unique ids" above) because this is what the deep-link
    // mechanism itself actually depends on: getElementById must resolve to exactly one node per id.
    const ids = document.querySelectorAll("[id]");
    const seen = new Map<string, number>();
    ids.forEach((el) => seen.set(el.id, (seen.get(el.id) ?? 0) + 1));
    for (const item of FAQ_ITEMS) expect(seen.get(item.id), item.id).toBe(1);
  });
});

describe("locked wording", () => {
  const sources = import.meta.glob(["./site/**/*.{ts,tsx}", "./app/**/*.tsx", "./components/*.tsx"], { query: "?raw", import: "default", eager: true }) as Record<string, string>;
  const all = Object.entries(sources).filter(([file]) => !file.includes(".test."));

  it("never presents a public device ceiling, a tax claim or an internal referral category", () => {
    // Stage 14 (VG's Notifications/Scheduling handoff, §8) locked and shipped real Smart Backup
    // interval choices - schedule (1|5|12) hours with genuine backend and Agent execution behind
    // them (SmartBackupScheduler.ResolveSlot, the per-slot claim table) - so the "interval schedule"
    // guard this test used to enforce (UI must never claim an interval the backend/Agent cannot
    // execute) no longer applies; it is superseded by ScheduleDialog's own tests instead.
    for (const [file, text] of all) {
      expect(/1,?000 devices/i.test(text), `${file}: device ceiling (C10)`).toBe(false);
      expect(/\b(GST|VAT|sales tax|tax included|plus tax|incl\. tax)\b/i.test(text), `${file}: tax wording (C7)`).toBe(false);
      expect(/NOVA-(ORG|AMT|PART|FRN|AFF)/.test(text), `${file}: internal referral category`).toBe(false);
    }
  });

  it("never offers a Smart Backup switch: Smart Backup is always on", () => {
    for (const [file, text] of all) {
      expect(/(enable|disable|turn (on|off)) Smart Backup/i.test(text), file).toBe(false);
    }
  });
});

describe("Feedback", () => {
  const fill = () => {
    fireEvent.change(screen.getByLabelText("Your Email"), { target: { value: "person@example.com" } });
    fireEvent.change(screen.getByLabelText("Feedback Subject"), { target: { value: FEEDBACK_SUBJECTS[0] } });
    fireEvent.change(screen.getByLabelText("Feedback Content"), { target: { value: "The pricing page is clear and easy to follow." } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Feedback" }));
  };

  it("says 'received' only after the server confirms it stored the message", async () => {
    const calls = serve((url) => (url.endsWith("/api/v1/feedback") ? { status: 201, body: { received: true } } : undefined));
    renderAt("/feedback");
    expect(screen.queryByText(/has been received/)).toBeNull();
    fill();
    expect(await screen.findByText("Thank you. Your feedback has been received.")).toBeTruthy();
    expect(calls.find((c) => c.url.endsWith("/feedback"))?.body).toEqual({ email: "person@example.com", subject: FEEDBACK_SUBJECTS[0], content: "The pricing page is clear and easy to follow." });
  });

  it.each([
    [500, {}],
    [429, {}],
    [201, { received: false }],
  ])("does not claim success when the server answers %s %j", async (status, body) => {
    serve((url) => (url.endsWith("/api/v1/feedback") ? { status, body } : undefined));
    renderAt("/feedback");
    fill();
    expect(await screen.findByText("Your feedback was not sent")).toBeTruthy();
    expect(screen.queryByText(/has been received/)).toBeNull();
  });

  it("keeps the submit button off until the form is valid", () => {
    serve(() => undefined);
    renderAt("/feedback");
    expect((screen.getByRole("button", { name: "Submit Feedback" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

/** What GET /dashboard/me returns under "capabilities" (Stage 13B Part 3): every key false except the listed ones, exactly as the server sends it. */
const serverCapabilities = (...allowed: string[]) => ({ ...Object.fromEntries(Object.keys(NO_CAPABILITIES).map((key) => [key, key === "restoreBlockedBy" ? null : allowed.includes(key)])) });
const ORGANIZATION_ADMIN_CAPABILITIES = serverCapabilities("manageUsers", "manageUserRoles", "removeMembers", "manageTeams", "viewMembers", "viewOrganizationDevices", "manageTeamRestoreLock", "manageMasterLocks", "triggerEmergencyStop", "resumeEmergencyStop", "purchaseSubscription", "manageSubscription", "viewBilling", "viewQuota", "modifyPurchasingPower", "manageDevices", "manageNotificationPreferences", "backup", "restore", "deleteData");
const TEAM_ADMIN_CAPABILITIES = serverCapabilities("viewMembers", "viewOwnTeamDevices", "manageTeamRestoreLock", "viewBilling", "viewQuota", "backup", "restore");
const BACKUP_USER_CAPABILITIES = serverCapabilities("viewQuota", "backup");
const PERSONAL_CAPABILITIES = serverCapabilities("purchaseSubscription", "manageSubscription", "viewBilling", "viewQuota", "manageDevices", "manageNotificationPreferences", "backup", "restore", "deleteData");
const CAPABILITIES_BY_ROLE: Record<string, unknown> = { OrganizationAdmin: ORGANIZATION_ADMIN_CAPABILITIES, TeamAdmin: TEAM_ADMIN_CAPABILITIES, BackupUser: BACKUP_USER_CAPABILITIES, PersonalUser: PERSONAL_CAPABILITIES };

describe("dashboard by role", () => {
  const me = (role: string, extra: Record<string, unknown> = {}) => ({
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
    restoreEnabled: role !== "BackupUser",
    deleteEnabled: false,
    teamAdminPurchasingPowerEnabled: role === "PersonalUser" ? null : false,
    capabilities: CAPABILITIES_BY_ROLE[role],
    ...extra,
  });

  function signedIn(role: string, control = { emergencyStopActive: false, changedAtUtc: null, reason: null, callerMayControl: role === "OrganizationAdmin" }, override?: (url: URL, method: string) => { status: number; body: unknown } | undefined) {
    localStorage.setItem("tornova.session-hint", "1");
    return serve((url, init) => {
      const overridden = override?.(new URL(url, "https://tornova.test"), init?.method ?? "GET");
      if (overridden) return overridden;
      if (url.endsWith("/web/auth/refresh")) return { status: 200, body: { accessToken: "test-access-token", activeAccountId: "a1" } };
      if (url.endsWith("/dashboard/accounts")) return { status: 200, body: [{ accountId: "a1", type: role === "PersonalUser" ? "Personal" : "Business", name: "Northwind", role }] };
      if (url.endsWith("/dashboard/me")) return { status: 200, body: me(role) };
      if (url.endsWith("/dashboard/control-state")) return { status: 200, body: control };
      if (url.includes("/api/v1/accounts/a1")) return { status: 200, body: { accountId: "a1", type: 1, name: "Northwind", masterBackupLockEnabled: false, masterRestoreLockEnabled: true, teams: [{ teamId: "t1", name: "Finance", restoreLockEnabled: false }] } };
      if (url.includes("/dashboard/")) return { status: 200, body: { items: [], total: 0, skip: 0, take: 25 } };
      return { status: 404, body: {} };
    });
  }

  const navLabels = async () => {
    const side = await screen.findByLabelText("Dashboard");
    return within(side)
      .getAllByRole("link")
      .map((a) => a.textContent)
      .filter((label) => label && !label.includes("TOR"));
  };

  it("Devices asks the server for one page at a time, with the search and status it should apply (FT-36)", async () => {
    const device = (n: number) => ({ deviceId: `d${n}`, name: `pc-${String(n).padStart(2, "0")}`, operatingSystem: "Windows", agentVersion: "1.0.0", status: "Active", ownerUserId: null, ownerDisplayName: null, registeredAtUtc: "2026-09-01T00:00:00Z", lastSeenAtUtc: null, lastSession: null });
    const calls = signedIn("OrganizationAdmin", undefined, (url) => {
      if (!url.pathname.endsWith("/dashboard/devices")) return undefined;
      const skip = Number(url.searchParams.get("skip"));
      const take = Number(url.searchParams.get("take"));
      return { status: 200, body: { items: Array.from({ length: Math.min(take, 60 - skip) }, (_, i) => device(skip + i)), total: 60, skip, take } };
    });
    renderAt("/app/devices");

    expect(await screen.findByText("pc-00")).toBeTruthy();
    expect(screen.queryByText("pc-25")).toBeNull(); // only the page the server returned
    expect(screen.getByText("1-25 of 60")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("pc-25")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Search devices"), { target: { value: "finance" } });
    fireEvent.click(screen.getByRole("button", { name: "Previous devices" }));
    await waitFor(() => {
      const last = new URL(calls.filter((c) => c.url.includes("/dashboard/devices")).at(-1)!.url, "https://tornova.test");
      expect([last.searchParams.get("skip"), last.searchParams.get("take"), last.searchParams.get("q"), last.searchParams.get("status")]).toEqual(["0", "25", "finance", "Unregistered"]);
    });
  });

  it("a backup set that is waiting for approval is never shown as protected, and a new one can be created (FT-35)", async () => {
    const waiting = { id: "s1", deviceId: "d1", deviceName: "sam-pc", name: "Photos", isEnabled: true, isVersioningEnabled: false, versionLimit: null, automaticBackupEnabled: false, scheduleTimeOfDayLocal: null, scheduleTimeZoneId: null, version: 1, items: [], pendingApprovals: 1, approvalState: "WaitingForApproval" };
    const calls = signedIn("PersonalUser", undefined, (url, method) => {
      if (url.pathname.endsWith("/dashboard/backup-sets")) return { status: 200, body: { items: [waiting], total: 1, skip: 0, take: 10 } };
      if (url.pathname.endsWith("/paths/staged")) return { status: 200, body: [{ id: "c1", proposedPath: "D:\\Photos", status: 0 }] };
      if (url.pathname.endsWith("/dashboard/devices")) return { status: 200, body: { items: [{ deviceId: "d1", name: "sam-pc", status: "Active", lastSeenAtUtc: null, lastSession: null, backupSetId: null }, { deviceId: "d2", name: "sam-laptop", status: "Active", lastSeenAtUtc: null, lastSession: null, backupSetId: "s9" }], total: 2, skip: 0, take: 100 } };
      if (url.pathname.endsWith("/api/v1/backupsets") && method === "POST") return { status: 200, body: { id: "s2", approvalState: 1, stagedForApproval: [{ id: "c2" }] } };
      return undefined;
    });
    renderAt("/app/backup-sets");

    expect(await screen.findByText("Waiting for approval")).toBeTruthy();
    expect(screen.queryByText("Protected")).toBeNull();
    expect(await screen.findByText(/open the Tornova Windows Agent on sam-pc, sign in, and approve it/)).toBeTruthy(); // Personal: approved on the PC itself (FT-30)

    fireEvent.click(screen.getAllByRole("button", { name: "New backup set" })[0]);
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByRole("option", { name: "sam-pc" });
    expect(within(dialog).queryByRole("option", { name: "sam-laptop" })).toBeNull(); // a device has ONE backup set: the one that already has it is not offered
    fireEvent.change(within(dialog).getByLabelText("Device"), { target: { value: "d1" } });
    fireEvent.change(within(dialog).getByLabelText("Name"), { target: { value: "Music" } });
    fireEvent.change(within(dialog).getByLabelText("First Windows path to protect"), { target: { value: "E:\\Music" } });
    fireEvent.change(within(dialog).getByLabelText("Versioning"), { target: { value: "10" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create backup set" }));

    expect(await screen.findByText(/is waiting for approval. Nothing in it is backed up/)).toBeTruthy(); // the server's answer, not an assumption
    const posted = calls.find((c) => c.method === "POST" && c.url.endsWith("/api/v1/backupsets"))!.body as { deviceId: string; versionLimit: number; items: Array<{ path: string }> };
    expect([posted.deviceId, posted.versionLimit, posted.items[0].path]).toEqual(["d1", 10, "E:\\Music"]);
  });

  it("Organization Admin sees Users & Teams and Billing", async () => {
    signedIn("OrganizationAdmin");
    renderAt("/app");
    const labels = await navLabels();
    expect(labels).toContain("Users & Teams");
    expect(labels).toContain("Billing");
    expect(labels).not.toContain("My Team");
    expect(await screen.findByText("Northwind - whole Organization")).toBeTruthy();
  });

  it("Team Admin sees My Team, scoped to the Team, and never Users & Teams", async () => {
    signedIn("TeamAdmin");
    renderAt("/app");
    const labels = await navLabels();
    expect(labels).toContain("My Team");
    expect(labels).not.toContain("Users & Teams");
    expect(await screen.findByText("Team: Finance")).toBeTruthy();
  });

  it("the menu and the pages follow what the SERVER says the person may do, not the name of their role (Stage 13B Part 3)", async () => {
    // The server calls this person an Organization Admin but grants nothing administrative (for example a stale or partial answer): nothing is offered.
    signedIn("OrganizationAdmin", undefined, (url) => (url.pathname.endsWith("/dashboard/me") ? { status: 200, body: me("OrganizationAdmin", { capabilities: serverCapabilities("viewQuota") }) } : undefined));
    renderAt("/app/organization");

    const labels = await navLabels();
    expect(labels).not.toContain("Users & Teams");
    expect(labels).not.toContain("My Team");
    expect(labels).not.toContain("Billing");
    expect(await screen.findByText("Not available for your role")).toBeTruthy();
    expect(screen.getAllByText(/Organization Admin/).length).toBeGreaterThan(0); // the role's NAME is still shown; it just decides nothing
  });

  it("a server that sends no capabilities at all (an older server) offers nothing privileged and does not crash", async () => {
    signedIn("OrganizationAdmin", undefined, (url) => {
      if (!url.pathname.endsWith("/dashboard/me")) return undefined;
      const { capabilities: _omitted, ...withoutCapabilities } = me("OrganizationAdmin");
      return { status: 200, body: withoutCapabilities };
    });
    renderAt("/app/security");

    expect(await screen.findByRole("heading", { level: 1, name: "Security" })).toBeTruthy();
    const labels = await navLabels();
    expect(labels).not.toContain("Users & Teams");
    expect(labels).not.toContain("Billing");
    expect(screen.queryByRole("button", { name: /Trigger Emergency Stop/ })).toBeNull();
  });

  it("the Team Restore Lock switch appears only when the server says this person may change it", async () => {
    signedIn("TeamAdmin", undefined, (url) => (url.pathname.endsWith("/dashboard/me") ? { status: 200, body: me("TeamAdmin", { capabilities: serverCapabilities("viewMembers", "viewOwnTeamDevices", "viewQuota") }) } : undefined));
    renderAt("/app/organization");
    expect(await screen.findByText("Team Restore Lock")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /restore for this Team/ })).toBeNull();
    cleanup();

    signedIn("TeamAdmin"); // the fixture answer for a Team Admin includes manageTeamRestoreLock
    renderAt("/app/organization");
    expect(await screen.findByRole("button", { name: /restore for this Team/ })).toBeTruthy();
  });

  it("Restore says which lock is stopping it, from the server's answer", async () => {
    signedIn("BackupUser", undefined, (url) => (url.pathname.endsWith("/dashboard/me") ? { status: 200, body: me("BackupUser", { restoreEnabled: true, capabilities: { ...serverCapabilities("viewQuota", "backup"), restoreBlockedBy: "OrganizationMasterRestoreLock" } }) } : undefined));
    renderAt("/app/restore");

    expect(await screen.findByText("Restore is locked")).toBeTruthy();
    expect(screen.getByText(/Your Organization's Restore Lock is on\./)).toBeTruthy();
  });

  it("Backup User sees neither people nor Billing, even by typing the address", async () => {
    signedIn("BackupUser");
    renderAt("/app/organization");
    const labels = await navLabels();
    expect(labels).not.toContain("My Team");
    expect(labels).not.toContain("Users & Teams");
    expect(labels).not.toContain("Billing");
    expect(await screen.findByText("Not available for your role")).toBeTruthy();
  });

  it("Personal has no Organization pages and no Emergency Stop", async () => {
    signedIn("PersonalUser");
    renderAt("/app/security");
    const labels = await navLabels();
    expect(labels).not.toContain("Users & Teams");
    expect(await screen.findByRole("heading", { level: 1, name: "Security" })).toBeTruthy();
    expect(screen.queryByText("Emergency Stop")).toBeNull();
    expect(screen.queryByText("Master Locks")).toBeNull();
  });

  it("only an Organization Admin is offered the Emergency Stop trigger", async () => {
    signedIn("TeamAdmin");
    renderAt("/app/security");
    expect(await screen.findByText("Only your Organization Admin can trigger or resume Emergency Stop.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Trigger Emergency Stop/ })).toBeNull();
  });

  it("Emergency Stop needs a reason and the typed word STOP before anything is sent", async () => {
    const calls = signedIn("OrganizationAdmin");
    renderAt("/app/security");
    fireEvent.click(await screen.findByRole("button", { name: /Trigger Emergency Stop/ }));
    const dialog = await screen.findByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: "Stop all backups" }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);

    const [reason, typed] = within(dialog).getAllByRole("textbox");
    fireEvent.change(reason, { target: { value: "Suspected ransomware on a laptop" } });
    expect(confirm.disabled).toBe(true);
    fireEvent.change(typed, { target: { value: "STOP" } });
    expect(confirm.disabled).toBe(false);
    expect(calls.some((c) => c.url.endsWith("/emergency-stop"))).toBe(false);

    fireEvent.click(confirm);
    await waitFor(() => expect(calls.find((c) => c.url.endsWith("/dashboard/emergency-stop"))?.body).toEqual({ reason: "Suspected ransomware on a laptop" }));
  });

  it("shows the Emergency Stop banner to everyone, and Resume only to the Organization Admin", async () => {
    signedIn("BackupUser", { emergencyStopActive: true, changedAtUtc: "2026-09-19T08:00:00Z", reason: "Incident", callerMayControl: false } as never);
    renderAt("/app");
    const banner = await screen.findByRole("alert");
    expect(banner.textContent).toContain("Emergency Stop is active");
    expect(within(banner).queryByRole("button", { name: "Resume backups" })).toBeNull();
  });

  it("never exposes Account Deletion or destructive Device Delete (C5)", async () => {
    signedIn("OrganizationAdmin");
    renderAt("/app/settings");
    await screen.findByRole("heading", { level: 1, name: "Settings" });
    expect(screen.queryByRole("button", { name: /delete|close account/i })).toBeNull();
  });
});

describe("dashboard helpers", () => {
  it("has a page for every locked dashboard route", () => {
    expect(APP_ROUTES).toContain("smart-cleanup");
    expect(APP_ROUTES).toHaveLength(15);
  });

  it("builds Activity ranges for Today, 7 days, 30 days and Custom", () => {
    const now = new Date(2026, 8, 19, 15, 30);
    const day = (iso: string) => new Date(iso);
    expect(day(activityRange("today", now)!.from).getDate()).toBe(19);
    expect(day(activityRange("7d", now)!.from).getDate()).toBe(13);
    expect(day(activityRange("30d", now)!.from).getDate()).toBe(21);
    expect(activityRange("30d", now)!.to).toBe(now.toISOString());
    expect(activityRange("custom", now)).toBeNull();
    expect(activityRange("custom", now, { from: "2026-09-10", to: "2026-09-01" })).toBeNull();
    const custom = activityRange("custom", now, { from: "2026-09-01", to: "2026-09-10" })!;
    expect(day(custom.to).getTime() - day(custom.from).getTime()).toBeGreaterThan(9 * 86_400_000);
  });

  it("Stage 14: labels every locked Smart Backup interval, defaulting to Once a day", () => {
    expect(scheduleFrequencyLabel(1)).toBe("Every 1 hour");
    expect(scheduleFrequencyLabel(5)).toBe("Every 5 hours");
    expect(scheduleFrequencyLabel(12)).toBe("Every 12 hours");
    expect(scheduleFrequencyLabel(24)).toBe("Once a day");
    expect(scheduleFrequencyLabel(null)).toBe("Once a day"); // an older server, or never configured
    expect(scheduleFrequencyLabel(undefined)).toBe("Once a day");
    expect(scheduleFrequencyLabel(7)).toBe("Once a day"); // never a value outside the four locked choices
  });

  it("calls a restore Completed only when the server says so and nothing failed", () => {
    expect(restoreResult({ status: "Completed", errorCount: 0, filesSkipped: 0 })).toEqual({ label: "Completed", tone: "ok" });
    expect(restoreResult({ status: "Completed", errorCount: 0, filesSkipped: 2 }).tone).toBe("warn");
    expect(restoreResult({ status: "Completed", errorCount: 1, filesSkipped: 0 }).label).toBe("Completed with errors");
    expect(restoreResult({ status: "Failed", errorCount: 3, filesSkipped: 0 }).tone).toBe("bad");
    expect(restoreResult({ status: "Pending", errorCount: 0, filesSkipped: 0 }).label).toBe("Waiting for the device");
  });

  it("never turns a partial, skipped or cancelled restore into a success (Stage 12)", () => {
    const row = { status: "CompletedWithWarnings", errorCount: 2, filesSkipped: 1 };
    expect(restoreResult({ ...row, displayStatus: "PartiallyCompleted", filesRestored: 7 })).toEqual({ label: "Partially completed", tone: "warn" });
    expect(restoreResult({ ...row, displayStatus: "NothingRestored", filesRestored: 0 }).label).toContain("Nothing restored");
    expect(restoreResult({ ...row, displayStatus: "Cancelled" }).tone).toBe("neutral");
    expect(restoreResult({ ...row, displayStatus: "NeedsAttention" }).tone).toBe("warn");
    expect(restoreResult({ ...row, displayStatus: "Failed" }).tone).toBe("bad");
    // an older server that sends no displayStatus: still never "Completed"
    expect(restoreResult({ ...row, filesRestored: 3 }).label).toBe("Partially completed");
    expect(restoreResult({ ...row, filesRestored: 0 }).tone).toBe("warn");
  });

  it("words a restore request's state from what the server said and shows a queued one as not yet restored (Stage 12)", () => {
    expect(restoreStatusView("Completed").tone).toBe("ok");
    expect(restoreStatusView("PartiallyCompleted").label).toBe("Partially completed");
    expect(restoreStatusView("Queued").label).toContain("Waiting");
    expect(restoreStatusView("Queued").tone).not.toBe("ok");
    expect(restoreStatusView("SomethingNew").tone).not.toBe("ok"); // an unknown state is never shown as success
  });
});

describe("Organization onboarding (Codex Review-01, P1-5)", () => {
  const personal: AccountOption = { accountId: "p1", type: "Personal", name: null, role: "PersonalUser" };
  const organization: AccountOption = { accountId: "o1", type: "Business", name: "Northwind", role: "OrganizationAdmin" };

  it("decides which Account sign-in opens", () => {
    // Registration always created the Personal Account, so an Organization sign-up
    // must NOT fall into it: the Organization is created first.
    expect(decideAccount([personal], true, null)).toEqual({ step: "organization" });
    expect(decideAccount([personal, organization], true, "p1")).toEqual({ step: "select", accountId: "o1" });
    expect(decideAccount([personal], false, null)).toEqual({ step: "select", accountId: "p1" });
    expect(decideAccount([organization, personal], false, "p1")).toEqual({ step: "select", accountId: "p1" }); // last used
    expect(decideAccount([organization, personal], false, null)).toEqual({ step: "choose" });
    expect(decideAccount([organization, personal], false, "gone")).toEqual({ step: "choose" });
    expect(decideAccount([], false, null)).toEqual({ step: "noAccount" });
  });

  it("an Organization sign-up ends as Organization Admin of a new Organization, never in the Personal account", async () => {
    localStorage.setItem("tornova.intent", JSON.stringify({ organization: true, organizationName: "Northwind" }));
    let created = false;
    const calls = serve((url, init) => {
      if (url.endsWith("/web/auth/login")) return { status: 200, body: { tokens: { accessToken: "t1" }, mfaEnabled: false, mfaSatisfied: true } };
      if (url.endsWith("/dashboard/accounts")) return { status: 200, body: created ? [organization, personal] : [personal] };
      if (url.endsWith("/api/v1/accounts") && init?.method === "POST") return (created = true), { status: 200, body: { accountId: "o1", organizationId: "org" } };
      if (url.endsWith("/web/auth/select-account")) return { status: 200, body: { accessToken: "t2", activeAccountId: JSON.parse(String(init!.body)).accountId } };
      if (url.endsWith("/dashboard/me")) return { status: 200, body: { userId: "u1", username: "sam", displayName: "Sam", email: "s@example.com", mfaEnabled: false, accountId: "o1", accountType: "Business", accountName: "Northwind", role: "OrganizationAdmin", teamId: null, teamName: null, clientSideEncryptionEnabled: false, backupEnabled: true, restoreEnabled: true, deleteEnabled: true, teamAdminPurchasingPowerEnabled: false, capabilities: ORGANIZATION_ADMIN_CAPABILITIES } };
      if (url.includes("/dashboard/control-state")) return { status: 200, body: { emergencyStopActive: false, changedAtUtc: null, reason: null, callerMayControl: true } };
      if (url.includes("/api/v1/accounts/o1")) return { status: 200, body: { accountId: "o1", type: 1, name: "Northwind", masterBackupLockEnabled: false, masterRestoreLockEnabled: true, teams: [] } };
      if (url.includes("/dashboard/")) return { status: 200, body: { items: [], total: 0, skip: 0, take: 25 } };
      return { status: 404, body: {} };
    });

    renderAt("/signin");
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "sam" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "not-a-real-credential" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    // The Personal account is NOT opened: no select-account happened yet.
    expect(await screen.findByRole("heading", { level: 1, name: "Set up your Organization" })).toBeTruthy();
    expect(calls.some((c) => c.url.endsWith("/select-account"))).toBe(false);
    expect((screen.getByLabelText("Organization name") as HTMLInputElement).value).toBe("Northwind");

    fireEvent.click(screen.getByRole("button", { name: "Create Organization" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Users & Teams" })).toBeTruthy();
    expect(calls.find((c) => c.url.endsWith("/api/v1/accounts") && c.method === "POST")?.body).toEqual({ type: 1, name: "Northwind" });
    expect(calls.filter((c) => c.url.endsWith("/select-account")).map((c) => c.body)).toEqual([{ accountId: "o1" }]);
    expect(await screen.findByText("Northwind - whole Organization")).toBeTruthy();
  });
});

describe("server money and severities on the dashboard", () => {
  it("shows an India / INR catalog in rupees, never with a dollar sign (P1-6)", async () => {
    localStorage.setItem("tornova.session-hint", "1");
    serve((url) => {
      if (url.endsWith("/web/auth/refresh")) return { status: 200, body: { accessToken: "t", activeAccountId: "a1" } };
      if (url.endsWith("/dashboard/me")) return { status: 200, body: { userId: "u1", username: "asha", displayName: "Asha", email: "a@example.com", mfaEnabled: false, accountId: "a1", accountType: "Personal", accountName: null, role: "PersonalUser", teamId: null, teamName: null, clientSideEncryptionEnabled: false, backupEnabled: true, restoreEnabled: true, deleteEnabled: true, teamAdminPurchasingPowerEnabled: null, capabilities: PERSONAL_CAPABILITIES } };
      if (url.endsWith("/dashboard/accounts")) return { status: 200, body: [] };
      if (url.includes("/dashboard/control-state")) return { status: 200, body: { emergencyStopActive: false, changedAtUtc: null, reason: null, callerMayControl: false } };
      if (url.endsWith("/api/v1/plans")) return { status: 200, body: [{ planId: "p1", name: "5 GB - Monthly", storageBytes: 5368709120, durationMonths: 1, isTrial: false, trialDurationDays: null, currency: "INR", price: 199 }] };
      return { status: 404, body: {} };
    });
    renderAt("/app/billing");
    const row = (await screen.findByText("5 GB - Monthly")).closest("tr")!;
    expect(row.textContent).toContain("\u20B9");
    expect(row.textContent).toContain("199");
    expect(row.textContent).not.toContain("$");
  });

  it("maps the server's severity: success is informational, failure is critical (P2-4)", () => {
    expect(severityTone("Information")).toBe("info");
    expect(severityTone("Warning")).toBe("warn");
    expect(severityTone("Critical")).toBe("bad");
    expect(severityTone("something-new")).toBe("warn"); // unknown is looked at, never buried
  });
});

describe("Windows Download page trust wording (VG, Improved-2)", () => {
  it("shows the locked Early Release notice and installer trust message, with no overclaiming and no routine hash check", () => {
    serve(() => undefined);
    renderAt("/download");
    const text = document.body.textContent ?? "";
    expect(text).toContain("Early Release Notice");
    expect(text).toContain("Tornova Backup is currently available as an early release for Windows.");
    expect(text).toContain("download Tornova Backup only from TornovaBackup.com");
    expect(text).toContain("The installer is built using Inno Setup and follows standard Windows installer practices.");
    expect(text).toContain("Designed for a safe, transparent and controlled Windows installation.");
    for (const forbidden of [/100% safe/i, /guaranteed safe/i, /Microsoft certified/i, /code signing (is )?not required/i, /never warn/i, /SHA-?256/i, /ignore (the )?(antivirus|warning)/i, /signed, approved installer/i]) {
      expect(text).not.toMatch(forbidden);
    }
  });
});

describe("safety holds while findings are deferred to Stage 14 (VG 2026-09-19)", () => {
  it("offers no purchase on the India storefront: the public prices are the Global / USD catalog", () => {
    serve(() => undefined);
    renderAt("/pricing", { ...DEFAULT_CONFIG, market: "India" });
    expect(screen.getByRole("note").textContent).toContain("Pricing in Indian rupees is not available yet");
    // No link on the page carries a purchase choice (a plan or a trial) into sign-up.
    const purchaseLinks = () => [...document.querySelectorAll("main a")].filter((a) => /\/signup\?(trial|storage|for=organization&storage)/.test(a.getAttribute("href") ?? ""));
    expect(purchaseLinks()).toHaveLength(0);
    fireEvent.click(screen.getAllByRole("button", { name: /\$2\.49/ })[0]);
    expect(screen.queryByRole("link", { name: "Create Account & Pay" })).toBeNull();
    expect(purchaseLinks()).toHaveLength(0);
    expect(screen.getAllByText("Not available on this storefront yet.").length).toBeGreaterThan(0);
  });

  it("still offers it on the Global storefront", () => {
    serve(() => undefined);
    renderAt("/pricing");
    expect(screen.queryByRole("note")).toBeNull();
    fireEvent.click(screen.getAllByRole("button", { name: /\$2\.49/ })[0]);
    expect(screen.getByRole("link", { name: "Create Account & Pay" })).toBeTruthy();
  });

  it("keeps checkout closed: a plan cannot be selected unless the server opens checkout", async () => {
    localStorage.setItem("tornova.session-hint", "1");
    const calls = serve((url) => {
      if (url.endsWith("/web/auth/refresh")) return { status: 200, body: { accessToken: "t", activeAccountId: "a1" } };
      if (url.endsWith("/dashboard/me")) return { status: 200, body: { userId: "u1", username: "sam", displayName: "Sam", email: "s@example.com", mfaEnabled: false, accountId: "a1", accountType: "Personal", accountName: null, role: "PersonalUser", teamId: null, teamName: null, clientSideEncryptionEnabled: false, backupEnabled: true, restoreEnabled: true, deleteEnabled: true, teamAdminPurchasingPowerEnabled: null, capabilities: PERSONAL_CAPABILITIES } };
      if (url.endsWith("/dashboard/accounts")) return { status: 200, body: [] };
      if (url.includes("/dashboard/control-state")) return { status: 200, body: { emergencyStopActive: false, changedAtUtc: null, reason: null, callerMayControl: false } };
      if (url.endsWith("/api/v1/plans")) return { status: 200, body: [{ planId: "p1", name: "5 GB - Monthly", storageBytes: 5368709120, durationMonths: 1, isTrial: false, trialDurationDays: null, currency: "USD", price: 2.49 }] };
      return { status: 404, body: {} };
    });
    renderAt("/app/billing");
    const select = (await screen.findByRole("button", { name: "Select" })) as HTMLButtonElement;
    expect(select.disabled).toBe(true);
    // No instruction to choose or select anything while purchasing is closed.
    expect(document.querySelector("main")!.textContent).not.toMatch(/Select it below|Choose a plan or a trial below/);
    expect(document.querySelector("main")!.textContent).toContain("purchasing is not open yet");
    fireEvent.click(select);
    expect(calls.some((c) => c.method === "POST" && c.url.endsWith("/api/v1/subscriptions"))).toBe(false);
  });
});
