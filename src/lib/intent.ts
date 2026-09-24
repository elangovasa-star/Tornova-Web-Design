// What the visitor chose on the public site (a plan, a trial, "for my Organization")
// before they had an account. Not sensitive. Kept in localStorage - not
// sessionStorage - because the email-verification link usually opens in a NEW tab,
// and an Organization sign-up must still end in an Organization (Codex Review-01, P1-5).

const INTENT_KEY = "tornova.intent";
const LAST_ACCOUNT_KEY = "tornova.last-account";

export interface PurchaseIntent {
  trial?: string;
  storage?: string;
  duration?: string;
  users?: string;
  organization?: boolean;
  organizationName?: string;
}

export function readIntent(): PurchaseIntent | null {
  try {
    const raw = localStorage.getItem(INTENT_KEY);
    return raw ? (JSON.parse(raw) as PurchaseIntent) : null;
  } catch {
    return null;
  }
}

export function saveIntent(intent: PurchaseIntent) {
  try {
    localStorage.setItem(INTENT_KEY, JSON.stringify({ ...(readIntent() ?? {}), ...intent }));
  } catch {
    // continue without remembering the choice
  }
}

export function clearIntent() {
  try {
    localStorage.removeItem(INTENT_KEY);
  } catch {
    // nothing to clear
  }
}

/** The Account this browser used last - an id, never a credential. */
export const lastAccount = {
  read(): string | null {
    try {
      return localStorage.getItem(LAST_ACCOUNT_KEY);
    } catch {
      return null;
    }
  },
  save(accountId: string) {
    try {
      localStorage.setItem(LAST_ACCOUNT_KEY, accountId);
    } catch {
      // optional
    }
  },
};
