import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useI18n } from "../../i18n";
import { usePublicOffer } from "../../lib/config";
import { CUSTOM_ORGANIZATION, CUSTOM_PERSONAL, DISCOUNT_TIERS, DURATIONS, STORAGE_OPTIONS, formatUsd, priceCents, quoteOrganization, restoreAllowanceLabel, type DurationKey, type StorageOption } from "../../lib/pricing";
import { CheckList, FaqQuestionList, FinalCta, PRICE_LINE, PageHero, SectionHead, TrialCards, Cta } from "../blocks";

const PRICING_FAQ = ["how-do-tornova-plans-work-are-there-basic-plus-or-pro-tiers", "do-tornova-plans-require-an-annual-commitment", "does-my-plan-include-restore-capacity", "how-does-organization-pricing-work", "can-i-try-tornova-before-committing-to-a-larger-plan"];

function PersonalPricing() {
  const { t, locale } = useI18n();
  const offer = usePublicOffer();
  const [pick, setPick] = useState<{ storage: StorageOption; duration: DurationKey } | null>(null);

  return (
    <>
      <div className="table-wrap">
        <table className="data price-table">
          <caption className="sr-only">{t("Personal pricing in US dollars by backup storage and duration")}</caption>
          <thead>
            <tr>
              <th scope="col">{t("Backup Storage")}</th>
              {DURATIONS.map((d) => (
                <th scope="col" className="num" key={d.key}>
                  {t(d.label)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STORAGE_OPTIONS.map((storage) => (
              <tr key={storage}>
                <th scope="row">{storage}</th>
                {DURATIONS.map((d) => (
                  <td className="num price" key={d.key}>
                    <button
                      type="button"
                      aria-pressed={pick?.storage === storage && pick.duration === d.key}
                      aria-label={`${storage}, ${d.label}, ${formatUsd(priceCents(storage, d.key), locale)}`}
                      onClick={() => setPick({ storage, duration: d.key })}
                    >
                      {formatUsd(priceCents(storage, d.key), locale)}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small muted" style={{ marginBlockStart: 10 }}>
        {t("Monthly is always available. Longer durations are optional.")}{" "}
        <Link to="/contact">{t(CUSTOM_PERSONAL)}</Link>
      </p>

      <div className="card raised" style={{ marginBlockStart: 20 }} aria-live="polite">
        {pick ? (
          <div className="btn-row" style={{ justifyContent: "space-between" }}>
            <div>
              <strong style={{ fontSize: "1.15rem", color: "var(--navy)" }}>
                {pick.storage} · {t(DURATIONS.find((d) => d.key === pick.duration)!.label)} · {formatUsd(priceCents(pick.storage, pick.duration), locale)}
              </strong>
              <div className="muted small">{t(restoreAllowanceLabel(pick.storage))}</div>
            </div>
            {offer.available ? (
              <Link className="btn btn-primary" to={`/signup?storage=${encodeURIComponent(pick.storage)}&duration=${pick.duration}`}>
                {t("Create Account & Pay")}
              </Link>
            ) : (
              <span className="muted small">{t("Not available on this storefront yet.")}</span>
            )}
          </div>
        ) : (
          <span className="muted">{t("Choose your storage and duration in the table to continue.")}</span>
        )}
      </div>

      <section style={{ marginBlockStart: 44 }}>
        <SectionHead title="Your Backup Storage Includes an Equal Restore Allowance" />
        <div className="grid cols-3">
          {["5 GB", "50 GB", "100 GB"].map((s) => (
            <div className="card" key={s} style={{ fontWeight: 650, color: "var(--navy)" }}>
              {t(restoreAllowanceLabel(s))}
            </div>
          ))}
        </div>
        <p className="muted small" style={{ marginBlockStart: 12 }}>
          {t("Additional Restore capacity, where applicable, is handled from inside the customer account.")}
        </p>
      </section>

      <section style={{ marginBlockStart: 44 }}>
        <SectionHead title="How to Choose" />
        <div className="grid cols-3">
          {[
            ["1", "Storage", "Pick the backup storage that fits the files, folders and drives you want to protect."],
            ["2", "Duration", "Pay monthly, or choose 3 months, 6 months or 1 year."],
            ["3", "Create Account & Pay", "Create your Tornova account, then download the Windows Agent."],
          ].map(([n, title, text]) => (
            <article className="card" key={n}>
              <div className="icon-chip" aria-hidden="true" style={{ fontWeight: 800 }}>
                {n}
              </div>
              <h3>{t(title)}</h3>
              <p className="muted">{t(text)}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginBlockStart: 44 }}>
        <SectionHead title="Want to Try Tornova First?" />
        <TrialCards />
      </section>
    </>
  );
}

function OrganizationPricing() {
  const { t, locale } = useI18n();
  const offer = usePublicOffer();
  const [storage, setStorage] = useState<StorageOption>("50 GB");
  const [duration, setDuration] = useState<DurationKey>("monthly");
  const [usersText, setUsersText] = useState("15");
  const users = /^\d{1,6}$/.test(usersText) ? Number(usersText) : Number.NaN;
  const quote = useMemo(() => quoteOrganization(storage, duration, users), [storage, duration, users]);

  return (
    <>
      <SectionHead title="Flexible Pricing for Every Organization" lead="Choose the storage required per user, choose the number of users, and Tornova automatically calculates your organization price and applicable volume discount." />
      <div className="grid cols-2">
        <form className="card" onSubmit={(e) => e.preventDefault()} aria-label={t("Organization price calculator")}>
          <div className="field">
            <label htmlFor="org-storage">{t("Storage per User")}</label>
            <select id="org-storage" className="select" value={storage} onChange={(e) => setStorage(e.target.value as StorageOption)}>
              {STORAGE_OPTIONS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="org-users">{t("Number of Users")}</label>
            <input id="org-users" className="input" inputMode="numeric" value={usersText} aria-invalid={!quote} aria-describedby="org-users-hint" onChange={(e) => setUsersText(e.target.value.trim())} />
            <span id="org-users-hint" className={quote ? "hint" : "error"}>
              {quote ? t("Whole number of users, 1 or more.") : t("Enter a whole number of users, 1 or more.")}
            </span>
          </div>
          <div className="field">
            <label htmlFor="org-duration">{t("Duration")}</label>
            <select id="org-duration" className="select" value={duration} onChange={(e) => setDuration(e.target.value as DurationKey)}>
              {DURATIONS.map((d) => (
                <option key={d.key} value={d.key}>
                  {t(d.label)}
                </option>
              ))}
            </select>
          </div>
        </form>

        <div className="card raised" aria-live="polite">
          <h3>{t("Your organization price")}</h3>
          {!quote ? (
            <p className="muted">{t("Enter the number of users to see your price.")}</p>
          ) : quote.strategic ? (
            <>
              <p>
                <strong>{t("Strategic / Large Deployment")}</strong>
              </p>
              <p className="muted">{t("For a deployment of this size Tornova prepares a custom offer.")}</p>
              <Cta to="/contact">Contact Us</Cta>
            </>
          ) : (
            <div className="quote">
              <div className="row">
                <span>
                  {t("Price per User")} ({storage}, {t(DURATIONS.find((d) => d.key === duration)!.label)})
                </span>
                <span>{formatUsd(quote.perUserCents, locale)}</span>
              </div>
              <div className="row">
                <span>× {t("Number of Users")}</span>
                <span>{quote.users}</span>
              </div>
              <div className="row">
                <span>{t("Subtotal")}</span>
                <span>{formatUsd(quote.subtotalCents, locale)}</span>
              </div>
              <div className="row">
                <span>
                  − {t("Organization Discount")} ({quote.discountPercent}%)
                </span>
                <span>{formatUsd(quote.discountCents, locale)}</span>
              </div>
              <div className="row total">
                <span>{t("Final Price")}</span>
                <span>{formatUsd(quote.totalCents, locale)}</span>
              </div>
              <p className="small muted" style={{ margin: 0 }}>
                {t("Each user includes an equal restore allowance.")} {t(restoreAllowanceLabel(storage))}.
              </p>
              <div className="btn-row" style={{ marginBlockStart: 8 }}>
                {offer.available ? (
                  <Link className="btn btn-primary" to={`/signup?for=organization&storage=${encodeURIComponent(storage)}&duration=${duration}&users=${quote.users}`}>
                    {t("Get Started")}
                  </Link>
                ) : (
                  <span className="muted small">{t("Not available on this storefront yet.")}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="muted" style={{ marginBlockStart: 16 }}>
        <Link to="/contact">{t(CUSTOM_ORGANIZATION)}</Link>
      </p>

      <section id="organization-discounts" style={{ marginBlockStart: 44 }}>
        <SectionHead title="Organization Discounts" />
        <div className="table-wrap" style={{ maxWidth: 520 }}>
          <table className="data">
            <thead>
              <tr>
                <th scope="col">{t("Users")}</th>
                <th scope="col" className="num">
                  {t("Discount")}
                </th>
              </tr>
            </thead>
            <tbody>
              {DISCOUNT_TIERS.map((tier) => (
                <tr key={tier.min}>
                  <td>{Number.isFinite(tier.max) ? `${tier.min}–${tier.max}` : `${tier.min}+`}</td>
                  <td className="num">{tier.percent}%</td>
                </tr>
              ))}
              <tr>
                <td>{t("Strategic / Large Deployment")}</td>
                <td className="num">
                  <Link to="/contact">{t("Custom Offer")}</Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginBlockStart: 44 }}>
        <SectionHead title="Built for Organizations" lead="Organization is not simply Personal multiplied by several users." />
        <div className="card">
          <CheckList items={["Organization Dashboard", "Team Admin Dashboard", "Teams & Team Admins", "Centralized Device Management", "Shared or Per-User Storage Controls", "Restore Permission Controls", "Backup Health", "Emergency Stop"]} />
        </div>
      </section>
    </>
  );
}

export default function Pricing() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const mode = params.get("for") === "organization" ? "organization" : "personal";

  return (
    <>
      <PageHero wide title="Simple Pricing. Choose What You Need." lead={PRICE_LINE}>
        <p>{t("Choose your storage, choose your duration, and pay only for the protection you need.")}</p>
        <div className="seg" role="group" aria-label={t("Pricing for")}>
          <button type="button" aria-pressed={mode === "personal"} onClick={() => setParams({})}>
            {t("Personal")}
          </button>
          <button type="button" aria-pressed={mode === "organization"} onClick={() => setParams({ for: "organization" })}>
            {t("Organization")}
          </button>
        </div>
      </PageHero>

      <section className="section">
        <div className="container">{mode === "personal" ? <PersonalPricing /> : <OrganizationPricing />}</div>
      </section>

      <section className="section alt">
        <div className="container">
          <div className="strip" role="list">
            {["Monthly Payments Available", "No Annual Commitment Required", "No Automatic Trial Renewal", "Equal Restore Allowance Included", "Secure Cloud Backup"].map((s) => (
              <span role="listitem" key={s}>
                ✓ {t(s)}
              </span>
            ))}
          </div>
          <div style={{ marginBlockStart: 40 }}>
            <SectionHead title="Pricing FAQ" />
            <FaqQuestionList ids={PRICING_FAQ} />
          </div>
        </div>
      </section>

      <FinalCta title="Get Started">
        <Cta to="/signup">Get Started</Cta>
        <Cta to="/trials" variant="secondary">
          Start Trial
        </Cta>
      </FinalCta>
    </>
  );
}
