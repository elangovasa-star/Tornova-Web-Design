import { describe, expect, it } from "vitest";
import { ApiError, createSessionClient, type SessionEnvironment } from "./api";

// Codex Review-01, P1-4. Several browser tabs = several session clients sharing ONE
// cookie jar, ONE lock and ONE channel, against a server that behaves like
// IdentityService: one access token and one active Account per session, refresh
// tokens rotate, and replaying a rotated refresh token ends the session (theft).

function browser(locked = true) {
  let cookie = "r1"; // the shared HttpOnly cookie
  let serverRefresh = "r1";
  let previousRefresh: string | null = null;
  let serverAccess = "a1";
  let activeAccountId = "X";
  let revoked = false;
  let counter = 1;
  const refreshCalls: string[] = [];
  const dataCalls: Array<{ path: string; asAccount: string; claimed: string | null }> = [];

  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

  const serverFetch: typeof fetch = async (input, init) => {
    const path = String(input);
    const headers = (init?.headers ?? {}) as Record<string, string>;
    if (path.endsWith("/web/auth/refresh")) {
      const presented = cookie; // read when the request leaves the tab
      await tick(); // network latency: another tab can act meanwhile
      refreshCalls.push(presented);
      if (revoked) return json(401, {});
      if (presented !== serverRefresh) {
        if (presented === previousRefresh) revoked = true; // reuse detection
        return json(401, {});
      }
      counter += 1;
      previousRefresh = serverRefresh;
      serverRefresh = `r${counter}`;
      serverAccess = `a${counter}`;
      cookie = serverRefresh;
      return json(200, { accessToken: serverAccess, activeAccountId });
    }

    if (revoked || headers.Authorization !== `Bearer ${serverAccess}`) return json(401, {});
    const claimed = headers["X-Tornova-Account"] ?? null;
    if (claimed !== null && claimed !== activeAccountId) return json(409, { error: "AccountContextChanged" });
    dataCalls.push({ path, asAccount: activeAccountId, claimed });
    return json(200, { account: activeAccountId });
  };

  // One lock and one channel for every tab of this browser.
  let lockTail: Promise<unknown> = Promise.resolve();
  const handlers = new Set<(m: never) => void>();
  const openTab = () => {
    let own: ((m: never) => void) | null = null;
    const env: SessionEnvironment = {
      fetch: serverFetch,
      withLock: (work) => {
        if (!locked) return work();
        const run = lockTail.then(work, work);
        lockTail = run.catch(() => undefined);
        return run;
      },
      post: (message) => handlers.forEach((h) => h !== own && h(message as never)),
      listen: (handler) => {
        own = handler as (m: never) => void;
        handlers.add(own);
        return () => void handlers.delete(own!);
      },
    };
    return createSessionClient(env);
  };

  return {
    openTab,
    refreshCalls,
    dataCalls,
    get revoked() {
      return revoked;
    },
    /** What the server does when any tab selects another Account. */
    switchAccountOnServer(accountId: string) {
      counter += 1;
      activeAccountId = accountId;
      serverAccess = `a${counter}`;
      return serverAccess;
    },
    expireAccessToken() {
      counter += 1;
      serverAccess = `expired-${counter}`;
    },
  };
}

describe("many tabs, one session", () => {
  it("two tabs whose tokens expire together refresh ONCE and never trip theft detection", async () => {
    const b = browser();
    const tabA = b.openTab();
    const tabB = b.openTab();
    tabA.session.set("a1", "X");
    expect(tabB.session.token).toBe("a1"); // shared over the channel, in memory
    tabB.session.bind("X");

    b.expireAccessToken();
    const [a, c] = await Promise.all([tabA.api<{ account: string }>("/api/v1/dashboard/devices"), tabB.api<{ account: string }>("/api/v1/dashboard/devices")]);

    expect(a.account).toBe("X");
    expect(c.account).toBe("X");
    expect(b.refreshCalls).toHaveLength(1);
    expect(b.revoked).toBe(false);
    expect(tabA.session.token).toBe(tabB.session.token);
  });

  it("WITHOUT the shared lock the same race ends the session - which is why the lock exists", async () => {
    const b = browser(false);
    const tabA = b.openTab();
    const tabB = b.openTab();
    tabA.session.set("a1", "X");
    tabB.session.bind("X");

    b.expireAccessToken();
    await Promise.allSettled([tabA.api("/api/v1/dashboard/devices"), tabB.api("/api/v1/dashboard/devices")]);

    expect(b.refreshCalls).toEqual(["r1", "r1"]); // both tabs replayed the same cookie
    expect(b.revoked).toBe(true);
  });

  it("a tab showing Account X stops when another tab switches the session to Account Y", async () => {
    const b = browser();
    const tabA = b.openTab();
    const tabB = b.openTab();
    const events: string[] = [];
    tabA.session.subscribe((e) => events.push(e));
    tabA.session.set("a1", "X");
    tabB.session.bind("X");

    // Tab B switches Account: the server rotates the access token and moves the session to Y.
    tabB.session.set(b.switchAccountOnServer("Y"), "Y");

    expect(events).toContain("accountChanged");
    expect(tabA.session.isStale).toBe(true);
    expect(tabA.session.token).toBeNull();
    await expect(tabA.api("/api/v1/dashboard/devices")).rejects.toMatchObject({ kind: "accountChanged" });
    // Nothing from tab A ever ran under Account Y.
    expect(b.dataCalls.filter((c) => c.asAccount === "Y" && c.claimed !== "Y")).toHaveLength(0);

    const fromB = await tabB.api<{ account: string }>("/api/v1/dashboard/devices");
    expect(fromB.account).toBe("Y");
  });

  it("a stale tab that missed the broadcast is still stopped: by its refresh, and by the server", async () => {
    const b = browser();
    const tabA = b.openTab();
    tabA.session.set("a1", "X");

    // Another browser window (no shared channel) switched the session to Y.
    b.switchAccountOnServer("Y");

    // Tab A's old token is dead -> it refreshes -> learns the session is on Y -> stops.
    const failure = await tabA.api("/api/v1/dashboard/devices").catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).kind).toBe("accountChanged");
    expect(tabA.session.isStale).toBe(true);
    expect(b.dataCalls).toHaveLength(0);
  });

  it("signing out in one tab signs the others out", () => {
    const b = browser();
    const tabA = b.openTab();
    const tabB = b.openTab();
    const events: string[] = [];
    tabB.session.subscribe((e) => events.push(e));
    tabA.session.set("a1", "X");
    tabA.session.set(null);
    expect(tabB.session.token).toBeNull();
    expect(events).toContain("signedOut");
  });
});
