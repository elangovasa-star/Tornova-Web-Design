// The one place the browser talks to the Tornova API.
//
// Session model (VG): the access token lives in memory ONLY - never in
// localStorage or sessionStorage - and the refresh token lives in an HttpOnly,
// Secure, SameSite=Strict cookie this script cannot read. A page reload therefore
// starts with no access token and silently asks /web/auth/refresh for a new one.
//
// MANY TABS, ONE SESSION (Codex Review-01, P1-4). Every tab of this browser shares
// the same cookie and therefore the same server session, which has one access
// token and one active Account. Three rules keep that safe:
//   1. Only one tab refreshes at a time (Web Locks). Two tabs racing would replay
//      a rotated refresh token, which the server correctly treats as theft and
//      answers by ending the session.
//   2. The tab that refreshed hands the new access token to the others over a
//      BroadcastChannel - in memory, same origin, never stored.
//   3. A tab is BOUND to the Account it is displaying. Every Account-scoped request
//      carries that Account in X-Tornova-Account and the server refuses a mismatch;
//      if the session moves to another Account (switched in another tab) this tab
//      stops and asks for a reload instead of acting under the new Account.
//
// All paths are same-origin and relative: there is no API host name in this code.

export type ApiErrorKind = "offline" | "unauthorized" | "forbidden" | "notFound" | "conflict" | "rateLimited" | "validation" | "paymentRequired" | "server" | "accountChanged";

export class ApiError extends Error {
  constructor(
    public readonly kind: ApiErrorKind,
    public readonly status: number,
    public readonly code: string | null,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function kindFor(status: number): ApiErrorKind {
  if (status === 401) return "unauthorized";
  if (status === 402) return "paymentRequired";
  if (status === 403) return "forbidden";
  if (status === 404) return "notFound";
  if (status === 409) return "conflict";
  if (status === 429) return "rateLimited";
  if (status >= 400 && status < 500) return "validation";
  return "server";
}

const FRIENDLY: Partial<Record<ApiErrorKind, string>> = {
  offline: "You appear to be offline, or Tornova cannot be reached. Check your connection and try again.",
  unauthorized: "Your session has ended. Please sign in again.",
  forbidden: "You do not have permission to do that.",
  notFound: "We could not find what you asked for.",
  rateLimited: "Too many requests. Please wait a few minutes and try again.",
  server: "Something went wrong on our side. Please try again shortly.",
  accountChanged: "You switched to another account in a different tab. Reload this page to continue.",
};

async function toError(response: Response): Promise<ApiError> {
  let code: string | null = null;
  let message: string | null = null;
  try {
    const body = await response.clone().json();
    code = typeof body?.error === "string" ? body.error : null;
    message = typeof body?.message === "string" ? body.message : null;
  } catch {
    // A non-JSON error body: never shown to the customer.
  }
  if (response.status === 409 && code === "AccountContextChanged") return new ApiError("accountChanged", 409, code, FRIENDLY.accountChanged!);
  const kind = kindFor(response.status);
  // Server messages are written for customers for 4xx; a 5xx is never echoed.
  return new ApiError(kind, response.status, code, (kind === "server" ? null : message) ?? FRIENDLY[kind] ?? "The request could not be completed.");
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Public endpoints (catalog, feedback, site config) need no session. */
  anonymous?: boolean;
  signal?: AbortSignal;
}

export type SessionEvent = "signedIn" | "signedOut" | "accountChanged";

type TabMessage = { type: "token"; accessToken: string; activeAccountId: string | null } | { type: "signedOut" };

/** What a tab needs from its browser. Injected so that tests can run several
 *  "tabs" against one fake server, lock and channel. */
export interface SessionEnvironment {
  fetch: typeof fetch;
  /** Runs `work` while holding a lock shared by every tab. */
  withLock: <T>(work: () => Promise<T>) => Promise<T>;
  post: (message: TabMessage) => void;
  listen: (handler: (message: TabMessage) => void) => () => void;
}

function browserEnvironment(): SessionEnvironment {
  const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("tornova.session");
  return {
    fetch: (input, init) => fetch(input, init),
    withLock: (work) => (typeof navigator !== "undefined" && navigator.locks ? (navigator.locks.request("tornova.session.refresh", work) as Promise<Awaited<ReturnType<typeof work>>>) : work()),
    post: (message) => channel?.postMessage(message),
    listen: (handler) => {
      if (!channel) return () => undefined;
      const onMessage = (event: MessageEvent<TabMessage>) => handler(event.data);
      channel.addEventListener("message", onMessage);
      return () => channel.removeEventListener("message", onMessage);
    },
  };
}

/** Paths that establish or change the session itself never carry the Account header. */
const SESSION_PATHS = ["/api/v1/web/auth/", "/api/v1/auth/"];

export function createSessionClient(env: SessionEnvironment) {
  let accessToken: string | null = null;
  let boundAccountId: string | null = null;
  let stale = false;
  let refreshInFlight: Promise<boolean> | null = null;
  const listeners = new Set<(event: SessionEvent) => void>();
  const forbiddenListeners = new Set<() => void>();
  const emit = (event: SessionEvent) => listeners.forEach((l) => l(event));

  /** The session moved to an Account this tab is not displaying: stop. */
  function markStale() {
    if (stale) return;
    stale = true;
    accessToken = null;
    emit("accountChanged");
  }

  function adopt(token: string, activeAccountId: string | null): boolean {
    if (boundAccountId !== null && activeAccountId !== boundAccountId) {
      markStale();
      return false;
    }
    accessToken = token;
    return true;
  }

  env.listen((message) => {
    if (message.type === "signedOut") {
      accessToken = null;
      boundAccountId = null;
      emit("signedOut");
    } else if (!stale) {
      adopt(message.accessToken, message.activeAccountId);
    }
  });

  const session = {
    get token() {
      return accessToken;
    },
    get accountId() {
      return boundAccountId;
    },
    get isStale() {
      return stale;
    },
    /** Sign-in and account selection in THIS tab. Other tabs are told. */
    set(token: string | null, activeAccountId: string | null = null) {
      accessToken = token;
      if (token === null) {
        boundAccountId = null;
        stale = false;
        env.post({ type: "signedOut" });
        emit("signedOut");
        return;
      }
      stale = false;
      boundAccountId = activeAccountId;
      // A token with no Account yet (password accepted, MFA or account set-up
      // still to come) is this tab's own business.
      if (activeAccountId !== null) env.post({ type: "token", accessToken: token, activeAccountId });
      emit("signedIn");
    },
    /** Binds this tab to the Account it is displaying (from /dashboard/me). */
    bind(accountId: string) {
      if (boundAccountId === null) boundAccountId = accountId;
      else if (boundAccountId !== accountId) markStale();
    },
    subscribe(listener: (event: SessionEvent) => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    /**
     * Called when the server answers 403 to a request the person made (never for the session endpoints or for /dashboard/me itself). The
     * Dashboard uses it to re-read what the person may do, so a page left open stops offering a control that is no longer theirs. This is
     * presentation only: the 403 was already the security decision.
     */
    onForbidden(listener: () => void) {
      forbiddenListeners.add(listener);
      return () => void forbiddenListeners.delete(listener);
    },
  };

  /** Asks for a new access token using the HttpOnly cookie. One request at a time
   *  across ALL tabs; a tab that waited for the lock uses what the winner shared. */
  function refreshSession(): Promise<boolean> {
    refreshInFlight ??= (async () => {
      const before = accessToken;
      try {
        return await env.withLock(async () => {
          if (stale) return false;
          if (accessToken !== null && accessToken !== before) return true; // another tab already refreshed
          const response = await env.fetch("/api/v1/web/auth/refresh", { method: "POST", credentials: "same-origin", headers: { "X-Tornova-Web": "1" } });
          if (!response.ok) {
            accessToken = null;
            boundAccountId = null;
            emit("signedOut");
            return false;
          }
          const tokens = (await response.json()) as { accessToken?: string; activeAccountId?: string | null };
          if (!tokens.accessToken) return false;
          const activeAccountId = tokens.activeAccountId ?? null;
          // Tell the other tabs first: they share this token whether or not THIS
          // tab can use it.
          env.post({ type: "token", accessToken: tokens.accessToken, activeAccountId });
          if (!adopt(tokens.accessToken, activeAccountId)) return false;
          if (boundAccountId === null) boundAccountId = activeAccountId;
          return true;
        });
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
    return refreshInFlight;
  }

  async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
    if (stale && !options.anonymous) throw new ApiError("accountChanged", 409, "AccountContextChanged", FRIENDLY.accountChanged!);

    const send = () =>
      env.fetch(path, {
        method: options.method ?? "GET",
        credentials: "same-origin",
        signal: options.signal,
        headers: {
          Accept: "application/json",
          ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(!options.anonymous && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          ...(!options.anonymous && boundAccountId && !SESSION_PATHS.some((p) => path.startsWith(p)) ? { "X-Tornova-Account": boundAccountId } : {}),
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });

    let response: Response;
    try {
      response = await send();
      if (response.status === 401 && !options.anonymous && (await refreshSession())) {
        response = await send();
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      throw new ApiError("offline", 0, null, FRIENDLY.offline!);
    }

    if (stale && !options.anonymous) throw new ApiError("accountChanged", 409, "AccountContextChanged", FRIENDLY.accountChanged!);

    if (!response.ok) {
      const failure = await toError(response);
      if (failure.kind === "accountChanged") markStale();
      if (failure.kind === "forbidden" && !options.anonymous && path.split("?")[0] !== "/api/v1/dashboard/me" && !SESSION_PATHS.some((p) => path.startsWith(p))) {
        forbiddenListeners.forEach((listener) => listener());
      }
      if (failure.kind === "unauthorized" && !options.anonymous) {
        accessToken = null;
        emit("signedOut");
      }
      throw failure;
    }

    return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
  }

  return { api, refreshSession, session };
}

const client = createSessionClient(browserEnvironment());
export const api = client.api;
export const refreshSession = client.refreshSession;
export const session = client.session;
