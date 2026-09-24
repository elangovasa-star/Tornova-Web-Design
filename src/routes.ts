// The locked Stage 9 route inventory (docs/stage9/02 and 10). Kept as data so the
// route table, the navigation and the tests all read the same list.

export const PUBLIC_ROUTES = [
  "/",
  "/download",
  "/release-notes",
  "/roadmap",
  "/features",
  "/personal",
  "/organization",
  "/trials",
  "/pricing",
  "/referral",
  "/faq",
  "/security",
  "/pioneer",
  "/support",
  "/contact",
  "/feedback",
] as const;

export const AUTH_ROUTES = ["/signup", "/signin", "/verify-email", "/forgot-password", "/reset-password"] as const;

/** Relative to /app. Every one of these is behind RequireSession, and every
 *  request a page makes is authorized again by the server. */
export const APP_ROUTES = [
  "",
  "devices",
  "backup-sets",
  "activity",
  "activity/:sessionId",
  "restore",
  "trash",
  "smart-cleanup",
  "organization",
  "storage",
  "security",
  "billing",
  "notifications",
  "settings",
  "support",
] as const;
