import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ApiError, api, refreshSession, session } from "./api";
import { lastAccount, readIntent } from "./intent";
import { readCapabilities, type Capabilities } from "./capabilities";
import { isCustomerRole, type CustomerRole } from "./roles";

export interface Me {
  userId: string;
  username: string;
  displayName: string;
  email: string;
  mfaEnabled: boolean;
  accountId: string;
  accountType: "Personal" | "Business" | string;
  accountName: string | null;
  role: CustomerRole;
  teamId: string | null;
  teamName: string | null;
  clientSideEncryptionEnabled: boolean;
  backupEnabled: boolean;
  restoreEnabled: boolean;
  deleteEnabled: boolean;
  teamAdminPurchasingPowerEnabled: boolean | null;
  /** What the server says this person may do in this Account right now. Presentation only; every request is authorized again by the server. */
  capabilities: Capabilities;
}

/** One Account the signed-in person belongs to (GET /api/v1/dashboard/accounts). */
export interface AccountOption {
  accountId: string;
  type: "Personal" | "Business" | string;
  name: string | null;
  role: string;
}

interface LoginResult {
  tokens: { accessToken: string };
  mfaEnabled: boolean;
  mfaSatisfied: boolean;
}

/**
 * organization: the visitor came to create an Organization and has none yet - the
 *   next step creates it. Registration itself always creates the Personal Account
 *   (I-01), so without this step an Organization sign-up would end in Personal.
 * choose: several Accounts and no way to know which one is meant.
 */
export type SignInOutcome = { step: "done" } | { step: "mfa" } | { step: "organization" } | { step: "choose" } | { step: "noAccount" };

/** Pure, so it can be tested: which Account (if any) sign-in should open. */
export function decideAccount(accounts: AccountOption[], wantsOrganization: boolean, lastUsed: string | null): SignInOutcome | { step: "select"; accountId: string } {
  if (accounts.length === 0) return { step: "noAccount" };
  const organizations = accounts.filter((a) => a.type === "Business");
  if (wantsOrganization) {
    return organizations.length > 0 ? { step: "select", accountId: organizations[0].accountId } : { step: "organization" };
  }
  const remembered = accounts.find((a) => a.accountId === lastUsed);
  if (remembered) return { step: "select", accountId: remembered.accountId };
  return accounts.length === 1 ? { step: "select", accountId: accounts[0].accountId } : { step: "choose" };
}

interface Auth {
  /** accountChanged: another tab moved the shared session to a different Account. */
  status: "loading" | "signedOut" | "signedIn" | "accountChanged";
  me: Me | null;
  accounts: AccountOption[];
  signIn: (username: string, password: string) => Promise<SignInOutcome>;
  submitMfa: (code: string) => Promise<SignInOutcome>;
  switchAccount: (accountId: string) => Promise<void>;
  /** Creates the Organization (Business Account), and opens it as its Organization Admin. */
  createOrganization: (name: string) => Promise<void>;
  signOut: () => Promise<void>;
  reloadMe: () => Promise<void>;
}

const Context = createContext<Auth | null>(null);

// A hint only - never a credential. It records that this browser signed in once,
// so an anonymous visitor's page load does not ask the server for a session that
// cannot exist. The session itself lives in the HttpOnly cookie, which script
// cannot read.
const HINT = "tornova.session-hint";
const hint = {
  has: () => {
    try {
      return localStorage.getItem(HINT) === "1";
    } catch {
      return true;
    }
  },
  set: (on: boolean) => {
    try {
      if (on) localStorage.setItem(HINT, "1");
      else localStorage.removeItem(HINT);
    } catch {
      // Storage may be unavailable (private mode); the hint is optional.
    }
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Auth["status"]>("loading");
  const [me, setMe] = useState<Me | null>(null);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);

  const loadAccounts = useCallback(async () => {
    const list = await api<AccountOption[]>("/api/v1/dashboard/accounts");
    setAccounts(list);
    return list;
  }, []);

  const loadMe = useCallback(async () => {
    const result = await api<Me>("/api/v1/dashboard/me");
    // The customer dashboard serves the four customer roles only. Anything else
    // (the internal SuperAdmin experience is separate) is treated as signed out.
    if (!isCustomerRole(result.role)) {
      throw new ApiError("forbidden", 403, null, "This account does not use the customer dashboard.");
    }
    session.bind(result.accountId);
    if (session.isStale) return;
    lastAccount.save(result.accountId);
    // Only a literal `true` from the server counts; anything missing or malformed offers nothing (fail closed).
    setMe({ ...result, capabilities: readCapabilities((result as { capabilities?: unknown }).capabilities) });
    setStatus("signedIn");
  }, []);

  // A 403 means what this person may do may have changed since the page loaded. Ask the server again (presentation only: the 403 already
  // refused the request). One refresh at a time and never more often than every couple of seconds, so a page of refusals cannot loop; and if
  // the answer is itself a refusal (removed from this Account) nothing of it stays on screen.
  const refreshing = useRef(false);
  const lastRefresh = useRef(0);
  useEffect(
    () =>
      session.onForbidden(() => {
        if (refreshing.current || Date.now() - lastRefresh.current < 2000) return;
        refreshing.current = true;
        lastRefresh.current = Date.now();
        loadMe()
          .catch((error) => {
            if (error instanceof ApiError && (error.kind === "forbidden" || error.kind === "unauthorized")) {
              setMe(null);
              setStatus("signedOut");
            }
          })
          .finally(() => {
            refreshing.current = false;
          });
      }),
    [loadMe],
  );

  // A reload has no access token (memory only): ask the HttpOnly cookie for one.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!hint.has()) return setStatus("signedOut");
      const ok = await refreshSession();
      if (cancelled) return;
      if (!ok) {
        if (!session.isStale) hint.set(false);
        return session.isStale ? undefined : setStatus("signedOut");
      }
      try {
        await loadMe();
        void loadAccounts().catch(() => undefined); // the switcher; never blocks the page
      } catch {
        if (!cancelled) setStatus("signedOut");
      }
    })();
    const unsubscribe = session.subscribe((event) => {
      if (event === "signedOut") {
        setMe(null);
        setAccounts([]);
        setStatus("signedOut");
      } else if (event === "accountChanged") {
        // Keep nothing of the old Account on screen and run nothing under the new one.
        setMe(null);
        setStatus("accountChanged");
      }
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [loadMe, loadAccounts]);

  const open = useCallback(
    async (accountId: string) => {
      const tokens = await api<{ accessToken: string; activeAccountId: string }>("/api/v1/web/auth/select-account", { method: "POST", body: { accountId } });
      // This tab binds to the chosen Account; every other tab is told and stops.
      session.set(tokens.accessToken, tokens.activeAccountId);
      await loadMe();
    },
    [loadMe],
  );

  /** Password (and MFA) accepted: decide which Account to open. */
  const afterAuthenticated = useCallback(async (): Promise<SignInOutcome> => {
    const decision = decideAccount(await loadAccounts(), readIntent()?.organization === true, lastAccount.read());
    if (decision.step !== "select") return decision;
    await open(decision.accountId);
    return { step: "done" };
  }, [loadAccounts, open]);

  const value = useMemo<Auth>(
    () => ({
      status,
      me,
      accounts,
      async signIn(username, password) {
        const result = await api<LoginResult>("/api/v1/web/auth/login", { method: "POST", anonymous: true, body: { username, password } });
        session.set(result.tokens.accessToken);
        hint.set(true);
        if (result.mfaEnabled && !result.mfaSatisfied) return { step: "mfa" };
        return afterAuthenticated();
      },
      async submitMfa(code) {
        await api("/api/v1/auth/mfa/verify", { method: "POST", body: { code } });
        return afterAuthenticated();
      },
      switchAccount: open,
      async createOrganization(name) {
        const created = await api<{ accountId: string }>("/api/v1/accounts", { method: "POST", body: { type: 1, name } });
        await open(created.accountId);
        void loadAccounts().catch(() => undefined);
      },
      async signOut() {
        try {
          await api("/api/v1/web/auth/logout", { method: "POST" });
        } catch {
          // Signing out locally must always work, even offline.
        }
        session.set(null);
        hint.set(false);
        setMe(null);
        setAccounts([]);
        setStatus("signedOut");
      },
      reloadMe: loadMe,
    }),
    [status, me, accounts, afterAuthenticated, open, loadAccounts, loadMe],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAuth(): Auth {
  const value = useContext(Context);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
