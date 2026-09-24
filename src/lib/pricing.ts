// Tornova public pricing - LOCKED (docs/stage9/03 as amended by Review-01/16).
// USD, Global storefront. Public fixed plans stop at 100 GB; anything larger is a
// custom offer.
//
// The table below is what the public site DISPLAYS and what the Organization
// calculator computes from. It is identical to the backend's seeded Global catalog
// (BillingCatalogSeed), and the amount a customer is actually charged is always
// re-priced by the server when an order is created - the browser's arithmetic is
// for presentation only and is never sent as a price.

export const STORAGE_OPTIONS = ["5 GB", "10 GB", "50 GB", "100 GB"] as const;
export type StorageOption = (typeof STORAGE_OPTIONS)[number];

export const DURATIONS = [
  { key: "monthly", months: 1, label: "Monthly" },
  { key: "3months", months: 3, label: "3 Months" },
  { key: "6months", months: 6, label: "6 Months" },
  { key: "1year", months: 12, label: "1 Year" },
] as const;
export type DurationKey = (typeof DURATIONS)[number]["key"];

/** Price in US cents, so no floating-point money arithmetic happens anywhere. */
const PRICE_CENTS: Record<StorageOption, Record<DurationKey, number>> = {
  "5 GB": { monthly: 249, "3months": 699, "6months": 1299, "1year": 2199 },
  "10 GB": { monthly: 349, "3months": 1049, "6months": 1999, "1year": 3299 },
  "50 GB": { monthly: 499, "3months": 1399, "6months": 2649, "1year": 4399 },
  "100 GB": { monthly: 749, "3months": 2099, "6months": 3999, "1year": 6599 },
};

export const TRIALS = [
  { storage: "500 MB", days: 3, priceCents: 69 },
  { storage: "1 GB", days: 5, priceCents: 149 },
] as const;

/** LOCKED wording for storage above the public catalog (Review-01/16, section 3). */
export const CUSTOM_PERSONAL = "Need more than 100 GB? Contact Tornova for a custom storage plan.";
export const CUSTOM_ORGANIZATION = "Need larger storage per user or a larger deployment? Contact Tornova for a custom Organization offer.";

/** Organization volume discount tiers - LOCKED. */
export const DISCOUNT_TIERS = [
  { min: 1, max: 10, percent: 0 },
  { min: 11, max: 20, percent: 3 },
  { min: 21, max: 50, percent: 7 },
  { min: 51, max: 100, percent: 12 },
  { min: 101, max: Number.POSITIVE_INFINITY, percent: 18 },
] as const;

/** Above this the calculator stops quoting and routes to a custom offer. It is a
 *  presentation threshold only (the backend's own ceiling is far higher); the
 *  locked table ends at "101+ = 18%" and "Strategic / Large Deployment = Custom". */
export const STRATEGIC_USER_THRESHOLD = 1000;

export function priceCents(storage: StorageOption, duration: DurationKey): number {
  return PRICE_CENTS[storage][duration];
}

export function discountPercent(users: number): number {
  const tier = DISCOUNT_TIERS.find((t) => users >= t.min && users <= t.max);
  return tier ? tier.percent : 0;
}

export interface OrganizationQuote {
  users: number;
  perUserCents: number;
  subtotalCents: number;
  discountPercent: number;
  discountCents: number;
  totalCents: number;
  strategic: boolean;
}

/**
 * Price per user x users - Organization discount = final price.
 * Integer cents throughout, rounded exactly as the server rounds, so the quote
 * shown matches the order the server will price.
 */
export function quoteOrganization(storage: StorageOption, duration: DurationKey, users: number): OrganizationQuote | null {
  if (!Number.isInteger(users) || users < 1) {
    return null;
  }

  const perUserCents = priceCents(storage, duration);
  const subtotalCents = perUserCents * users;
  const percent = discountPercent(users);
  // Exactly the server's rule (BillingPricing.PriceFor): net = round-half-up of
  // standard x (100 - discount) / 100, in integer cents.
  const totalCents = Math.floor((subtotalCents * (100 - percent) + 50) / 100);
  return {
    users,
    perUserCents,
    subtotalCents,
    discountPercent: percent,
    discountCents: subtotalCents - totalCents,
    totalCents,
    strategic: users > STRATEGIC_USER_THRESHOLD,
  };
}

/** Always USD, whatever the site language (locked): the number formatting follows
 *  the locale, the currency never changes. */
export function formatUsd(cents: number, locale = "en-US"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "USD", currencyDisplay: "narrowSymbol" }).format(cents / 100);
}

/**
 * Money that comes FROM THE SERVER (orders, subscriptions, the live catalog) is
 * shown in the ISO currency the server sent with it (Codex Review-01, P1-6). An
 * Account on the India storefront is billed in INR; presenting that number with a
 * dollar sign would misstate what the customer is agreeing to pay. There is no
 * default currency: an unknown code is shown as the code itself, never as USD.
 */
export function formatMoney(amount: number, currency: string, locale = "en-US"): string {
  const code = (currency ?? "").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) return `${amount.toFixed(2)} ${code || "?"}`.trim();
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: code, currencyDisplay: "narrowSymbol" }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${code}`;
  }
}

/** Referral bonus table - LOCKED (Review-01/16, section 6). Shown publicly; the
 *  internal referral-code categories and the checks behind a reward never are. */
export const REFERRAL_BONUSES = [
  { label: "Personal Plan", bonus: "2%" },
  { label: "Organization: 1-10 Users", bonus: "2%" },
  { label: "Organization: 11-20 Users", bonus: "2.3%" },
  { label: "Organization: 21-50 Users", bonus: "2.5%" },
  { label: "Organization: 51-100 Users", bonus: "2.7%" },
  { label: "Organization: 101+ Users", bonus: "3%" },
  { label: "Strategic / Custom Deals", bonus: "Manual / Case-by-case" },
] as const;

/** The Equal Restore Allowance is derived from the plan (VG decision C3): the
 *  included amount equals the backup storage. No usage figure exists. */
export function restoreAllowanceLabel(storage: string): string {
  return `${storage} Backup + ${storage} Restore Included`;
}
