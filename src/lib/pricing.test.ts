import { describe, expect, it } from "vitest";
import { DISCOUNT_TIERS, DURATIONS, REFERRAL_BONUSES, STORAGE_OPTIONS, TRIALS, discountPercent, formatMoney, formatUsd, priceCents, quoteOrganization, restoreAllowanceLabel } from "./pricing";

describe("locked Personal pricing table (docs/stage9/03)", () => {
  const locked: Record<string, number[]> = {
    "5 GB": [2.49, 6.99, 12.99, 21.99],
    "10 GB": [3.49, 10.49, 19.99, 32.99],
    "50 GB": [4.99, 13.99, 26.49, 43.99],
    "100 GB": [7.49, 20.99, 39.99, 65.99],
  };

  it("offers exactly the four public sizes and matches every one of the 16 locked prices", () => {
    expect([...STORAGE_OPTIONS]).toEqual(["5 GB", "10 GB", "50 GB", "100 GB"]);
    for (const storage of STORAGE_OPTIONS) {
      DURATIONS.forEach((d, i) => expect(priceCents(storage, d.key)).toBe(Math.round(locked[storage][i] * 100)));
    }
  });

  it("starts at $2.49/month and always offers Monthly", () => {
    expect(formatUsd(priceCents("5 GB", "monthly"))).toBe("$2.49");
    expect(DURATIONS[0]).toMatchObject({ key: "monthly", months: 1 });
  });

  it("has exactly the two locked trials", () => {
    expect(TRIALS).toEqual([
      { storage: "500 MB", days: 3, priceCents: 69 },
      { storage: "1 GB", days: 5, priceCents: 149 },
    ]);
  });
});

describe("Organization discount tiers", () => {
  it.each([
    [1, 0], [10, 0], [11, 3], [20, 3], [21, 7], [50, 7], [51, 12], [100, 12], [101, 18], [5000, 18],
  ])("%i users -> %i%%", (users, percent) => expect(discountPercent(users)).toBe(percent));

  it("tiers are contiguous with no gap or overlap", () => {
    for (let i = 1; i < DISCOUNT_TIERS.length; i++) {
      expect(DISCOUNT_TIERS[i].min).toBe(DISCOUNT_TIERS[i - 1].max + 1);
    }
  });
});

describe("Organization calculator: price per user x users - discount = final price", () => {
  it("applies no discount up to 10 users", () => {
    expect(quoteOrganization("100 GB", "monthly", 10)).toMatchObject({ subtotalCents: 7490, discountPercent: 0, discountCents: 0, totalCents: 7490 });
  });

  it("applies 7% at 25 users and rounds like the server", () => {
    // 25 x $4.99 = $124.75 ; x 0.93 = 116.0175 -> $116.02
    expect(quoteOrganization("50 GB", "monthly", 25)).toMatchObject({ subtotalCents: 12475, discountPercent: 7, totalCents: 11602, discountCents: 873 });
  });

  it("applies 18% at 101 users on a yearly plan", () => {
    // 101 x $65.99 = $6,664.99 ; x 0.82 = 5465.2918 -> $5,465.29
    expect(quoteOrganization("100 GB", "1year", 101)).toMatchObject({ subtotalCents: 666499, totalCents: 546529 });
  });

  it("total + discount always equals the subtotal", () => {
    for (const users of [1, 7, 11, 19, 33, 64, 100, 101, 999]) {
      const q = quoteOrganization("10 GB", "3months", users)!;
      expect(q.totalCents + q.discountCents).toBe(q.subtotalCents);
    }
  });

  it.each([0, -3, 2.5, Number.NaN])("refuses an invalid user count (%s)", (users) => expect(quoteOrganization("5 GB", "monthly", users)).toBeNull());

  it("flags a strategic deployment instead of pretending to quote it", () => {
    expect(quoteOrganization("5 GB", "monthly", 1000)!.strategic).toBe(false);
    expect(quoteOrganization("5 GB", "monthly", 1001)!.strategic).toBe(true);
  });
});

describe("currency and restore allowance", () => {
  it("stays USD in every site language", () => {
    for (const locale of ["en-US", "ar", "es", "fr", "de", "ja"]) {
      expect(formatUsd(249, locale)).toMatch(/\$/);
    }
  });

  it("derives the equal restore allowance from the plan", () => {
    expect(restoreAllowanceLabel("100 GB")).toBe("100 GB Backup + 100 GB Restore Included");
  });
});

describe("server money is shown in the server's currency (Codex Review-01, P1-6)", () => {
  it("formats a Global / USD amount with a dollar sign", () => {
    expect(formatMoney(7.49, "USD")).toBe("$7.49");
  });

  it("formats an India / INR amount as rupees - never as dollars", () => {
    const shown = formatMoney(1499, "INR");
    expect(shown).toContain("\u20B9");
    expect(shown).toContain("1,499");
    expect(shown).not.toContain("$");
  });

  it("never falls back to USD for a missing or unknown currency", () => {
    expect(formatMoney(10, "")).toBe("10.00 ?");
    expect(formatMoney(10, "rupees")).toBe("10.00 RUPEES");
    expect(formatMoney(10, "")).not.toContain("$");
  });
});

describe("locked referral bonus table (Review-01/16)", () => {
  it("matches the approved percentages", () => {
    expect(REFERRAL_BONUSES.map((r) => r.bonus)).toEqual(["2%", "2%", "2.3%", "2.5%", "2.7%", "3%", "Manual / Case-by-case"]);
  });
});
