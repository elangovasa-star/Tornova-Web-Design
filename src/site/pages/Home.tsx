import { Link } from "react-router-dom";
import { Icon } from "../../components/ui";
import { useI18n } from "../../i18n";
import { CheckList, Cta, FaqQuestionList, FeatureGrid, PRICE_LINE, SECURITY_HIGHLIGHTS, SectionHead, TOP_FEATURES, TrialCards } from "../blocks";
import { HOME_FAQ_IDS } from "../content/faq";

export default function Home() {
  const { t } = useI18n();
  return (
    <>
      {/* Review-01/16, section 2: a teaser only - the rules live on the detail pages. */}
      <aside className="promo" aria-label={t("Offers")}>
        <div className="promo-org">
          <Icon name="users" size={34} />
          <div className="txt">
            <b>{t("Organization Discounts up to 18%")}</b>
            <span>{t("More users. Greater value. Built for your team.")}</span>
          </div>
          <Link className="btn btn-primary btn-sm" to="/pricing?for=organization#organization-discounts">
            {t("Explore Organization Offers")} <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="promo-ref">
          <Icon name="gift" size={34} />
          <div className="txt">
            <b>{t("Share Tornova. Earn Referral Rewards.")}</b>
            <span>{t("For Personal and Organization purchases.")}</span>
          </div>
          <Link className="btn btn-sm" to="/referral">
            {t("Learn About Referral Program")} <span aria-hidden="true">→</span>
          </Link>
          <div className="pioneer-note">
            <b>{t("Pioneer Customers")}</b> - {t("Get enhanced rewards.")}
          </div>
        </div>
      </aside>

      <section className="hero">
        <div className="container">
          <div>
            <div className="eyebrow">{t("Cloud backup for everyone")}</div>
            <h1>
              <span className="l1">{t("One Backup.")}</span>
              <span className="l2">{t("Complete Confidence.")}</span>
            </h1>
            <p className="lead">{t("Protect your files, your work, and your business with secure, reliable cloud backup built for everyday confidence.")}</p>
            <p className="lead">{t("Simple for Individuals. Powerful for Organizations.")}</p>
            <div className="btn-row" style={{ marginBlockStart: 22 }}>
              <Link className="btn btn-primary" to="/signup">
                {t("Get Started")} <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="hero-price">
              <div className="big">{t("Cloud Backup Starting at Just $2.49/Month.")}</div>
              <div className="promise">{t("With the freedom of monthly payments. No annual commitment.")}</div>
            </div>
            <div className="hero-hosting">{t("Hosted in the US. Accessible Worldwide.")}</div>
          </div>
          <div className="hero-art">
            <img
              src="/brand/hero-illustration.png"
              alt="Tornova cloud backup: files and folders organized and secured, backed up automatically across multiple devices to global servers"
              className="hero-art-img"
            />
          </div>
        </div>
      </section>

      <section className="pillars" aria-label={t("Why Tornova")}>
        <div className="container">
          {[
            ["shield", "Trusted Security", "Your data, our priority"],
            ["bolt", "Reliable Performance", "Always there when you need it"],
            ["users", "Built for Everyone", "Individuals to Enterprises"],
            ["globe", "Global Cloud Infrastructure", "Hosted in the US. Accessible Worldwide."],
          ].map(([icon, title, text]) => (
            <div className="pillar" key={title}>
              <Icon name={icon} size={34} />
              <div>
                <b>{t(title)}</b>
                <span>{t(text)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="features">
        <div className="container">
          <SectionHead center title="Powerful Backup. Simple Protection." lead="Everything you need to protect, manage, and restore your important files — without complexity." />
          <FeatureGrid items={TOP_FEATURES} cols={4} />
          <div className="btn-row" style={{ justifyContent: "center", marginBlockStart: 28 }}>
            <Cta to="/features" variant="secondary">
              Explore All Features
            </Cta>
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="container grid cols-2" style={{ alignItems: "center" }}>
          <div>
            <SectionHead eyebrow="Personal" title="Simple Backup for Your Personal Files." lead="Protect your important files, folders, and devices with secure cloud backup that is easy to manage." />
            <CheckList items={["Automatic Backup", "Secure Cloud Protection", "Easy Restore", "Backup Health"]} />
            <div className="btn-row" style={{ marginBlockStart: 22 }}>
              <Cta to="/personal">Explore Personal Backup</Cta>
              <Cta to="/pricing" variant="secondary">
                View Personal Pricing
              </Cta>
            </div>
          </div>
          <div>
            <SectionHead eyebrow="Organization" title="Centralized Backup for Your Organization." lead="Protect users, devices, and teams from one place with centralized control, flexible storage management, and secure restore permissions." />
            <CheckList items={["Organization Dashboard", "Team Admin Dashboard", "Teams & Team Admins", "Centralized Device Management", "Shared or Per-User Storage Controls", "Restore Permission Controls", "Emergency Stop"]} />
            <div className="btn-row" style={{ marginBlockStart: 22 }}>
              <Cta to="/organization">Explore Organization Backup</Cta>
              <Cta to="/pricing?for=organization" variant="secondary">
                View Organization Pricing
              </Cta>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead title="Try Tornova Before You Commit." lead="Start with a low-cost paid trial. No automatic renewal." />
          <TrialCards />
        </div>
      </section>

      <section className="section alt">
        <div className="container">
          <SectionHead title="Simple Pricing. Flexible Monthly Plans." lead={PRICE_LINE} />
          <div className="grid cols-2">
            <article className="card raised">
              <h3>{t("Personal")}</h3>
              <p style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--navy)" }}>{t("Starting at $2.49/month")}</p>
              <p className="muted">{t("For individuals who want simple, secure cloud backup.")}</p>
              <Cta to="/pricing" variant="secondary">
                View Personal Pricing
              </Cta>
            </article>
            <article className="card raised">
              <h3>{t("Organization")}</h3>
              <p style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--navy)" }}>{t("Flexible plans for teams and organizations.")}</p>
              <p className="muted">{t("Centralized backup management with admin, team, device, and storage controls.")}</p>
              <Cta to="/pricing?for=organization" variant="secondary">
                View Organization Pricing
              </Cta>
            </article>
          </div>
          <p style={{ marginBlockStart: 18 }}>
            {t("Need to try Tornova first?")} <Link to="/trials">{t("View Trials")}</Link>
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container grid cols-2" style={{ alignItems: "center" }}>
          <div>
            <SectionHead title="Security Built Into Every Backup." lead="Your data is protected with strong encryption, secure access controls, and safety measures designed for both individuals and organizations." />
            <p style={{ fontWeight: 650 }}>{t("Your backups stay protected from upload through restore.")}</p>
            <Cta to="/security">Explore Tornova Security</Cta>
          </div>
          <div className="card raised">
            <CheckList items={SECURITY_HIGHLIGHTS} />
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="container grid cols-2">
          <div>
            <SectionHead eyebrow="Limited-time Pioneer program" title="Be Part of Tornova from the Beginning." lead="A limited-time launch program for early Tornova customers." />
            <p>{t("Pioneer enrollment may close earlier based on business decisions and will remain available for no longer than six months from Tornova’s official launch.")}</p>
            <p>{t("Simply purchase any qualifying Tornova plan during the Pioneer launch period — including our base plan starting at just $2.49/month.")}</p>
            <p className="muted">{t("Maintain your qualifying Tornova customer relationship for five years, and eligible Pioneer Customers can be recognized under Tornova Family status.")}</p>
            <Cta to="/pioneer">Explore Pioneer Program</Cta>
          </div>
          <div className="card">
            <CheckList items={["Enhanced Referral Rewards", "Rewards for Valuable Suggestions & Feedback", "Special Product Benefits & Offers", "Early or Exclusive Access to Selected Future Features", "Career Opportunity Consideration"]} />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead title="Frequently Asked Questions" />
          <FaqQuestionList ids={HOME_FAQ_IDS} />
          <div style={{ marginBlockStart: 22 }}>
            <Cta to="/faq" variant="secondary">
              View All FAQs
            </Cta>
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="container grid cols-2" style={{ alignItems: "center" }}>
          <div>
            <SectionHead title="Protect Your PC with the Tornova Windows Agent." lead="Download the Tornova Agent, sign in to your account, and start protecting your selected files, folders, and drives." />
            <CheckList items={["Secure Windows Agent", "Easy Installation", "Background Backup Protection"]} />
            <div className="btn-row" style={{ marginBlockStart: 22 }}>
              <Cta to="/download">Download for Windows</Cta>
            </div>
            <p className="small muted" style={{ marginBlockStart: 12 }}>
              {t("Already installed Tornova?")} <Link to="/signin">{t("Sign In")}</Link>
            </p>
          </div>
          <div>
            <SectionHead title="Need Help? We’re Here." lead="Find answers, get support, or contact Tornova directly." />
            <div className="grid cols-3">
              <article className="card">
                <h3>{t("Support")}</h3>
                <p className="muted small">{t("Get help with your Tornova account, backup, restore, or Agent.")}</p>
                <Link to="/support">{t("Get Support")}</Link>
              </article>
              <article className="card">
                <h3>{t("Contact Us")}</h3>
                <p className="muted small">{t("Reach Tornova for general enquiries or customer support.")}</p>
                <Link to="/contact">{t("Contact Us")}</Link>
              </article>
              <article className="card">
                <h3>{t("Feedback")}</h3>
                <p className="muted small">{t("Share suggestions, feature ideas, product feedback, or report a problem.")}</p>
                <Link to="/feedback">{t("Send Feedback")}</Link>
              </article>
            </div>
            <p className="small" style={{ marginBlockStart: 16 }}>
              {t("General")}: <a href="mailto:contact@tornovabackup.com">contact@tornovabackup.com</a> · {t("Support")}: <a href="mailto:support@tornovabackup.com">support@tornovabackup.com</a>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
