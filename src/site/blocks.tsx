import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/ui";
import { useI18n } from "../i18n";
import { usePublicOffer } from "../lib/config";
import { TRIALS, formatUsd } from "../lib/pricing";
import { FAQ_ITEMS } from "./content/faq";

export const PRICE_LINE = "Cloud backup starting at $2.49/month — with the freedom of monthly payments. No annual commitment.";
export const TRIAL_TRUST = "No auto-renewal. No annual commitment. Upgrade only when you choose.";

export function PageHero({ eyebrow, title, lead, children, wide }: { eyebrow?: string; title: string; lead?: string; children?: ReactNode; wide?: boolean }) {
  const { t } = useI18n();
  return (
    <section className={`page-hero${wide ? " wide" : ""}`}>
      <div className="container">
        {eyebrow && <div className="eyebrow">{t(eyebrow)}</div>}
        <h1>{t(title)}</h1>
        {lead && <p className="lead">{t(lead)}</p>}
        {children}
      </div>
    </section>
  );
}

export function SectionHead({ eyebrow, title, lead, center }: { eyebrow?: string; title: string; lead?: string; center?: boolean }) {
  const { t } = useI18n();
  return (
    <div className={`section-head${center ? " center" : ""}`}>
      {eyebrow && <div className="eyebrow">{t(eyebrow)}</div>}
      <h2>{t(title)}</h2>
      {lead && <p className="lead">{t(lead)}</p>}
    </div>
  );
}

export interface Feature {
  icon: string;
  title: string;
  text: string;
}

export function FeatureGrid({ items, cols = 3 }: { items: Feature[]; cols?: 2 | 3 | 4 }) {
  const { t } = useI18n();
  return (
    <div className={`grid cols-${cols}`}>
      {items.map((f) => (
        <article className="card" key={f.title}>
          <div className="icon-chip">
            <Icon name={f.icon} />
          </div>
          <h3>{t(f.title)}</h3>
          <p className="muted">{t(f.text)}</p>
        </article>
      ))}
    </div>
  );
}

export function CheckList({ items }: { items: string[] }) {
  const { t } = useI18n();
  return (
    <ul className="check-list">
      {items.map((i) => (
        <li key={i}>{t(i)}</li>
      ))}
    </ul>
  );
}

export function Cta({ to, children, variant = "primary" }: { to: string; children: string; variant?: "primary" | "secondary" | "ghost" }) {
  const { t } = useI18n();
  return (
    <Link className={`btn btn-${variant}`} to={to}>
      {t(children)}
    </Link>
  );
}

/** Automatic Backup and Smart Backup are different things (locked). These two
 *  definitions are the only wording the site uses for them. */
export const AUTOMATIC_BACKUP: Feature = { icon: "clock", title: "Automatic Backup", text: "Runs your selected backup set automatically at your chosen schedule." };
export const SMART_BACKUP: Feature = { icon: "refresh", title: "Smart Backup", text: "Detects new and changed files within the selected backup set and protects them efficiently." };

export const TOP_FEATURES: Feature[] = [
  AUTOMATIC_BACKUP,
  { icon: "cloud", title: "Secure Cloud Backup", text: "Protects your data in transit and at rest." },
  { icon: "restore", title: "Easy Restore", text: "Recover individual files or larger backups when needed." },
  { icon: "devices", title: "Multiple Devices", text: "Protect and manage multiple Windows devices." },
  { icon: "pulse", title: "Backup Health", text: "Clearly see backup status and anything requiring attention." },
  { icon: "broom", title: "Smart Cleanup", text: "Review locally deleted files that still have cloud backups and choose what to remove." },
  SMART_BACKUP,
];

export function TrialCards({ compact }: { compact?: boolean }) {
  const { t, locale } = useI18n();
  const offer = usePublicOffer();
  return (
    <>
      <div className="grid cols-2" style={{ maxWidth: compact ? 640 : 760 }}>
        {TRIALS.map((trial) => (
          <article className="card raised trial-card" key={trial.storage}>
            <h3>{trial.storage}</h3>
            <p className="muted" style={{ marginBlockEnd: 6 }}>
              {t("{days} Days", { days: trial.days })}
            </p>
            <div className="price">{formatUsd(trial.priceCents, locale)}</div>
            <div className="btn-row" style={{ marginBlockStart: 14 }}>
              {offer.available ? (
                <Link className="btn btn-primary" to={`/signup?trial=${encodeURIComponent(trial.storage)}`}>
                  {t("Start Trial")}
                </Link>
              ) : (
                <span className="muted small">{t("Not available on this storefront yet.")}</span>
              )}
            </div>
          </article>
        ))}
      </div>
      <p className="small muted" style={{ marginBlockStart: 14 }}>
        {t(TRIAL_TRUST)}
      </p>
    </>
  );
}

export function FaqQuestionList({ ids }: { ids: string[] }) {
  const { t } = useI18n();
  const items = ids.map((id) => FAQ_ITEMS.find((f) => f.id === id)).filter((f): f is (typeof FAQ_ITEMS)[number] => Boolean(f));
  return (
    <ul className="check-list" style={{ maxWidth: 760 }}>
      {items.map((item) => (
        <li key={item.id}>
          <Link to={`/faq#${item.id}`}>{t(item.question)}</Link>
        </li>
      ))}
    </ul>
  );
}

export const SECURITY_HIGHLIGHTS = [
  "Encryption in Transit & at Rest",
  "Client-Side Double-Layer Encryption",
  "Optional MFA",
  "Secure Restore Controls",
  "SHA-256 File Integrity",
  "Emergency Stop for Organizations",
];

export function FinalCta({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <section className="section alt">
      <div className="container" style={{ textAlign: "center" }}>
        <h2>{t(title)}</h2>
        {lead && <p className="lead">{t(lead)}</p>}
        <div className="btn-row" style={{ justifyContent: "center", marginBlockStart: 18 }}>
          {children}
        </div>
      </div>
    </section>
  );
}
