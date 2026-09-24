import { Link } from "react-router-dom";
import { Icon, Notice } from "../../components/ui";
import { REFERRAL_BONUSES } from "../../lib/pricing";
import { useI18n } from "../../i18n";
import { useSiteConfig } from "../../lib/config";
import { AUTOMATIC_BACKUP, CheckList, Cta, FaqQuestionList, FeatureGrid, FinalCta, PageHero, SMART_BACKUP, SectionHead, TOP_FEATURES, TrialCards, type Feature } from "../blocks";
import { RELEASE_NOTES } from "../releaseNotes";

function Section({ alt, children }: { alt?: boolean; children: React.ReactNode }) {
  return (
    <section className={`section${alt ? " alt" : ""}`}>
      <div className="container">{children}</div>
    </section>
  );
}

function Flow({ steps }: { steps: string[] }) {
  const { t } = useI18n();
  return (
    <ol className="grid cols-4" style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {steps.map((step, i) => (
        <li className="card" key={step}>
          <div className="icon-chip" aria-hidden="true" style={{ fontWeight: 800 }}>
            {i + 1}
          </div>
          <strong style={{ color: "var(--navy)" }}>{t(step)}</strong>
        </li>
      ))}
    </ol>
  );
}

const WEB_AGENT_NOTE = "The Web application does not directly read files on your PC. The Tornova Windows Agent performs device-side backup work.";

// ---------------------------------------------------------------- Features
const MORE_FEATURES: Feature[] = [
  { icon: "history", title: "Versioning", text: "Optionally keep 3, 10 or 50 previous versions of a file. Versions count toward your storage." },
  { icon: "restore", title: "1-Day Trash Protection", text: "Deleted backup data stays in Trash for one day before it can be permanently removed." },
  { icon: "users", title: "Organization & Teams", text: "Organization Admins, optional Teams and Team Admins, with Team-scoped visibility." },
  { icon: "lock", title: "Restore Controls", text: "Restore permission is independent from backup permission, with Restore Lock for Organizations." },
  { icon: "stop", title: "Emergency Stop", text: "Stop backup activity across the Organization when immediate intervention is required." },
  { icon: "shield", title: "SHA-256 Integrity", text: "File content is identified and verified with SHA-256." },
];

export function Features() {
  const { t } = useI18n();
  return (
    <>
      <PageHero title="Powerful Backup. Simple Protection." lead="Everything you need to protect, manage, and restore your important files — without complexity." />
      <Section>
        <FeatureGrid items={TOP_FEATURES} cols={3} />
      </Section>
      <Section alt>
        <SectionHead title="Automatic Backup and Smart Backup are different" lead="They work together, but they are not the same feature." />
        <FeatureGrid items={[AUTOMATIC_BACKUP, SMART_BACKUP]} cols={2} />
      </Section>
      <Section>
        <SectionHead title="More protection built in" />
        <FeatureGrid items={MORE_FEATURES} cols={3} />
        <p className="muted small" style={{ marginBlockStart: 20 }}>
          {t(WEB_AGENT_NOTE)}
        </p>
      </Section>
      <FinalCta title="Protect your files with Tornova.">
        <Cta to="/signup">Get Started</Cta>
        <Cta to="/pricing" variant="secondary">
          View Pricing
        </Cta>
      </FinalCta>
    </>
  );
}

// ---------------------------------------------------------------- Personal
export function Personal() {
  const { t } = useI18n();
  return (
    <>
      <PageHero title="Simple, Secure Backup for Your Personal Files." lead="Protect your files, folders, and Windows devices with flexible cloud backup that’s easy to manage and restore.">
        <div className="btn-row">
          <Cta to="/signup">Get Started</Cta>
          <Cta to="/pricing" variant="secondary">
            View Pricing
          </Cta>
        </div>
      </PageHero>
      <Section>
        <SectionHead title="What You Can Protect" lead="Choose exactly what you want Tornova to protect." />
        <FeatureGrid
          cols={4}
          items={[
            { icon: "file", title: "Files", text: "Documents, photos, videos and more." },
            { icon: "folder", title: "Folders", text: "Whole folders, kept up to date." },
            { icon: "drive", title: "Drives", text: "Entire drives when you need them." },
            { icon: "devices", title: "Unlimited Windows Devices", text: "Your plan is defined by storage, not by a device count." },
          ]}
        />
      </Section>
      <Section alt>
        <SectionHead title="How Personal Backup Works" />
        <Flow steps={["Download Agent", "Sign In", "Select Backup Set", "Tornova Protects It"]} />
        <p className="muted small" style={{ marginBlockStart: 16 }}>
          {t(WEB_AGENT_NOTE)}
        </p>
      </Section>
      <Section>
        <SectionHead title="Core Personal Features" />
        <FeatureGrid
          cols={4}
          items={[
            AUTOMATIC_BACKUP,
            SMART_BACKUP,
            { icon: "broom", title: "Smart Cleanup", text: "Review locally deleted files that still have cloud backups and choose what to remove." },
            { icon: "pulse", title: "Backup Health", text: "Successful, Partially Completed, or Interrupted / Needs Attention - always truthful." },
            { icon: "devices", title: "Unlimited Devices", text: "Protect all your Windows PCs." },
            { icon: "restore", title: "Easy Restore", text: "Recover individual files or larger backups when needed." },
            { icon: "history", title: "Versioning", text: "Optionally keep previous versions of your files." },
            { icon: "lock", title: "1-Day Trash Protection", text: "A safety net before backup data is permanently removed." },
          ]}
        />
      </Section>
      <Section alt>
        <div className="grid cols-2">
          <div>
            <SectionHead title="Backup Health you can trust" />
            <CheckList items={["Successful", "Partially Completed", "Interrupted / Needs Attention"]} />
            <p className="muted" style={{ marginBlockStart: 14 }}>
              {t("An incomplete backup is never reported as Successful. Connection Status is shown separately from the Backup Result.")}
            </p>
          </div>
          <div>
            <SectionHead title="Restore" />
            <CheckList
              items={[
                "Suitable smaller restores may be performed through the Web where supported.",
                "Bulk/full restore uses the Tornova Windows Agent.",
                "Previous-device backups may remain available for restore where applicable.",
                "Client-Side Double-Layer Encryption restore/download is Agent-only.",
              ]}
            />
          </div>
        </div>
      </Section>
      <Section>
        <div className="grid cols-2">
          <div>
            <SectionHead title="Security" />
            <CheckList items={["Encryption in transit and at rest", "Optional MFA", "Secure Restore", "Client-Side Double-Layer Encryption option", "SHA-256 integrity"]} />
            <div style={{ marginBlockStart: 16 }}>
              <Cta to="/security" variant="secondary">
                Explore Security
              </Cta>
            </div>
          </div>
          <div>
            <SectionHead title="Personal backup starts at $2.49/month." />
            <Cta to="/pricing" variant="secondary">
              View Personal Pricing
            </Cta>
            <div style={{ marginBlockStart: 24 }}>
              <TrialCards compact />
            </div>
          </div>
        </div>
      </Section>
      <Section alt>
        <SectionHead title="Personal questions" />
        <FaqQuestionList ids={["can-i-choose-which-files-and-folders-to-back-up", "how-many-devices-can-i-protect-with-a-personal-plan", "can-i-restore-my-files-from-another-device", "do-tornova-plans-require-an-annual-commitment"]} />
        <div style={{ marginBlockStart: 18 }}>
          <Cta to="/faq" variant="secondary">
            View All FAQs
          </Cta>
        </div>
      </Section>
      <FinalCta title="Protect Your Personal Files with Tornova.">
        <Cta to="/signup">Get Started</Cta>
        <Cta to="/download" variant="secondary">
          Download for Windows
        </Cta>
      </FinalCta>
    </>
  );
}

// ---------------------------------------------------------------- Organization
export function OrganizationPage() {
  const { t } = useI18n();
  return (
    <>
      <PageHero title="Centralized Backup Protection for Your Organization." lead="Protect users, teams, and devices from one place with centralized management, flexible storage controls, secure restore permissions, and clear backup visibility.">
        <div className="btn-row">
          <Cta to="/signup?for=organization">Get Started</Cta>
          <Cta to="/pricing?for=organization" variant="secondary">
            View Organization Pricing
          </Cta>
        </div>
      </PageHero>
      <Section>
        <SectionHead title="Organization Structure" lead="The Organization is the ownership, billing and quota boundary. Teams are optional." />
        <Flow steps={["Organization Admin", "Team Admins", "Backup Users", "Devices"]} />
      </Section>
      <Section alt>
        <div className="grid cols-2">
          <article className="card raised">
            <div className="icon-chip">
              <Icon name="users" />
            </div>
            <h3>{t("Organization Admin Dashboard")}</h3>
            <p className="muted">{t("Organization-wide visibility and authority, subject to the permission model.")}</p>
            <CheckList items={["Users", "Teams", "Devices", "Backup Health", "Storage Usage", "Backup Activity", "Restore Controls"]} />
          </article>
          <article className="card raised">
            <div className="icon-chip">
              <Icon name="badge" />
            </div>
            <h3>{t("Team Admin Dashboard")}</h3>
            <p className="muted">{t("A distinct experience, restricted to the assigned Team(s). A Team Admin never gains Organization-wide visibility.")}</p>
            <CheckList items={["Team-scoped users", "Team-scoped devices", "Team Backup Health", "Team activity", "Team storage visibility", "Team-appropriate controls"]} />
          </article>
        </div>
      </Section>
      <Section>
        <FeatureGrid
          cols={3}
          items={[
            { icon: "users", title: "Teams & User Management", text: "Create and manage Teams, assign a Team Admin, add Backup Users and manage users within the permitted scope." },
            { icon: "drive", title: "Storage & Quota Management", text: "A shared storage pool, per-user limits where configured, and clear usage visibility under one Organization subscription." },
            { icon: "card", title: "Team Admin Purchasing Power", text: "An Organization setting, on by default. Team Admin purchases add users and capacity according to the Organization model." },
            { icon: "devices", title: "Device Management", text: "Devices across all users, registration and status, previous devices visible for restore, Unregister Device and Unregister + Delete." },
            { icon: "pulse", title: "Backup Health & Activity", text: "Successful, Partially Completed, or Interrupted / Needs Attention. Never a false Success." },
            { icon: "lock", title: "Restore Controls", text: "Restore permission is independent from backup permission. Restore Lock and MFA rules are always respected." },
          ]}
        />
        <p className="muted small" style={{ marginBlockStart: 16 }}>
          {t("Destructive device actions follow Tornova's safety lifecycle and always require confirmation.")}
        </p>
      </Section>
      <Section alt>
        <div className="card raised" style={{ borderInlineStart: "6px solid var(--bad)" }}>
          <div className="icon-chip" style={{ background: "var(--bad-bg)", color: "var(--bad)" }}>
            <Icon name="stop" />
          </div>
          <h2>{t("Emergency Stop")}</h2>
          <p className="lead">{t("Stop backup activity across the Organization when immediate intervention is required.")}</p>
          <CheckList items={["Triggered by your Organization Admin, with a recorded reason", "Windows Agents check the emergency state about every 60 seconds", "Resume is always manual - backups never restart by themselves"]} />
        </div>
      </Section>
      <Section>
        <div className="grid cols-2">
          <div>
            <SectionHead title="Security" />
            <CheckList items={["Encryption in transit & at rest", "Client-Side Double-Layer Encryption", "MFA", "Secure Restore", "SHA-256 integrity", "Emergency Stop", "Role-based controls"]} />
            <div style={{ marginBlockStart: 16 }}>
              <Cta to="/security" variant="secondary">
                Explore Security
              </Cta>
            </div>
          </div>
          <div>
            <SectionHead title="Organization Pricing" lead="Choose storage per user, number of users, and duration. Eligible volume discounts are applied automatically." />
            <Cta to="/pricing?for=organization">View Organization Pricing</Cta>
          </div>
        </div>
      </Section>
      <Section alt>
        <SectionHead title="Organization questions" />
        <FaqQuestionList ids={["i-run-a-business-can-i-monitor-backup-protection-across-my-employees-a", "can-a-team-admin-manage-another-team", "what-is-a-restore-lock", "how-does-organization-pricing-work"]} />
        <div style={{ marginBlockStart: 18 }}>
          <Cta to="/faq" variant="secondary">
            View All FAQs
          </Cta>
        </div>
      </Section>
      <FinalCta title="Protect Your Organization with Centralized Backup Management.">
        <Cta to="/signup?for=organization">Get Started</Cta>
        <Cta to="/pricing?for=organization" variant="secondary">
          View Pricing
        </Cta>
      </FinalCta>
    </>
  );
}

// ---------------------------------------------------------------- Security
export function SecurityPage() {
  const { t } = useI18n();
  return (
    <>
      <PageHero title="Security Built Into Every Backup." lead="From upload to restore, Tornova protects your data with encryption, secure access controls, integrity checks, and layered safety measures.">
        <Cta to="/signup">Get Started</Cta>
      </PageHero>
      <Section>
        <SectionHead title="Encryption" />
        <FeatureGrid
          cols={4}
          items={[
            { icon: "lock", title: "TLS 1.2+ in transit", text: "Your data is encrypted while it travels to Tornova." },
            { icon: "cloud", title: "Encryption at rest", text: "Server-side encryption protects stored backup data." },
            { icon: "clock", title: "Short-lived secure access", text: "Storage access is granted only for a short time, only where needed." },
            { icon: "shield", title: "No public storage access", text: "Backup storage is never publicly or anonymously accessible." },
          ]}
        />
      </Section>
      <Section alt>
        <SectionHead title="Security Account Options" />
        <div className="grid cols-2">
          <article className="card raised">
            <h3>{t("Standard Secure Account")}</h3>
            <CheckList items={["Encrypted transport", "Encryption at rest", "Role-based access controls", "Secure restore", "Short-lived controlled storage access", "Applicable audit and security controls"]} />
          </article>
          <article className="card raised">
            <h3>{t("Client-Side Double-Layer Encryption (CSE)")}</h3>
            <p className="muted">{t("CSE provides an additional client-side encryption layer.")}</p>
            <CheckList items={["CSE is a permanent account choice.", "A CSE account cannot later convert to Standard Secure.", "Moving from CSE to Standard requires a new account.", "CSE restore/download is performed through the Tornova Windows Agent."]} />
          </article>
        </div>
      </Section>
      <Section>
        <div className="grid cols-2">
          <div>
            <SectionHead title="Account & Login Protection" />
            <CheckList items={["Username + password", "Optional TOTP MFA", "MFA applies to login and restore where required", "Scheduled and background backup does not depend on the Agent window staying signed in", "Device authentication is separate from interactive user sign-in"]} />
            <p className="muted small" style={{ marginBlockStart: 12 }}>
              {t("Signing out of the Agent UI clears only the interactive session. Background backup may continue using the registered device identity.")}
            </p>
          </div>
          <div>
            <SectionHead title="Device Security" />
            <CheckList items={["A unique, cryptographically random device identity for every Windows Agent", "A unique device credential, protected by Windows on your PC", "Device authentication is independent of normal user login", "Device credentials can be revoked or rotated"]} />
          </div>
        </div>
      </Section>
      <Section alt>
        <div className="grid cols-2">
          <div>
            <SectionHead title="SHA-256 Integrity" />
            <p>{t("Tornova uses SHA-256 for file and content hashing. The content hash is part of the immutable identity of your backed-up content.")}</p>
          </div>
          <div>
            <SectionHead title="Restore Security" />
            <CheckList items={["Restore permission is independent from Backup permission.", "Suitable smaller-file restore may use the Web where supported.", "Bulk/full restore uses the Tornova Windows Agent.", "CSE restore/download is Agent-only.", "Organization Restore Lock and role restrictions are respected.", "MFA is respected where the restore flow requires it."]} />
          </div>
        </div>
      </Section>
      <Section>
        <SectionHead title="Organization Security Controls" />
        <CheckList items={["Role-based access controls", "Organization Admin with Organization-wide scope", "Team Admin restricted to assigned Team(s)", "Restore controls and Restore Lock", "Emergency Stop", "Applicable audit visibility"]} />
        <div className="card raised" style={{ marginBlockStart: 24, borderInlineStart: "6px solid var(--bad)" }}>
          <h2>{t("Stop Organization Backup Activity Quickly When Immediate Action Is Required.")}</h2>
          <CheckList items={["Organization-level stop, triggered by your Organization Admin", "Agents check the emergency state about every 60 seconds", "Short-lived storage access expires quickly (15 minutes)", "Resume is manual"]} />
        </div>
      </Section>
      <Section alt>
        <div className="grid cols-2">
          <div>
            <SectionHead title="Backup Safety - No False Success" />
            <CheckList items={["Complete intended operation = Success", "Some files safely protected but some unresolved = Partially Completed", "Interrupted or failed operations are never shown as Success", "Temporary failures are never interpreted as your intent to delete"]} />
          </div>
          <div>
            <SectionHead title="Data Deletion Safety" />
            <CheckList items={["1-day Trash lifecycle", "Smart Cleanup requires your explicit confirmation", "Safety checks before any backup content is physically removed", "Device removal grace rules", "Account deletion grace rules"]} />
          </div>
        </div>
      </Section>
      <Section>
        <SectionHead title="Security FAQ" />
        <FaqQuestionList ids={["how-secure-is-my-backup", "what-is-client-side-double-layer-encryption", "can-i-switch-from-cse-to-standard-later-if-i-change-my-mind", "does-signing-out-of-the-tornova-agent-stop-scheduled-backup", "what-is-a-restore-lock", "what-if-my-organization-suspects-a-security-incident", "does-tornova-use-content-hashing", "does-restore-require-mfa"]} />
      </Section>
      <FinalCta title="Protect Your Data with Tornova Security.">
        <Cta to="/signup">Get Started</Cta>
        <Cta to="/pricing" variant="secondary">
          View Pricing
        </Cta>
      </FinalCta>
    </>
  );
}

// ---------------------------------------------------------------- Pioneer
export function Pioneer() {
  const { t } = useI18n();
  return (
    <>
      <PageHero eyebrow="Limited-time Pioneer program" title="Be Part of Tornova from the Beginning." lead="A limited-time launch program for customers who choose to support and trust Tornova from the beginning.">
        <Cta to="/signup">Become a Pioneer Customer</Cta>
      </PageHero>
      <Section>
        <SectionHead title="It’s Simple." lead="Simply purchase any qualifying Tornova plan during the Pioneer launch period — including our base plan starting at just $2.49/month." />
        <Flow steps={["Purchase a qualifying plan", "Become a Tornova Pioneer Customer", "Maintain a qualifying Tornova relationship", "Eligible for Tornova Family recognition after 5 years"]} />
        <p className="muted" style={{ marginBlockStart: 16 }}>
          {t("The five-year requirement is for Tornova Family recognition. It is not required to become a Pioneer Customer.")}
        </p>
      </Section>
      <Section alt>
        <SectionHead title="A Limited-Time Opportunity" lead="Pioneer enrollment may close earlier based on business decisions and will remain available for no longer than six months from Tornova’s official launch." />
      </Section>
      <Section>
        <SectionHead title="Special Benefits for Those Who Support Tornova Early" />
        <FeatureGrid
          cols={3}
          items={[
            { icon: "badge", title: "Enhanced Referral Rewards", text: "Eligible Pioneer Customers may receive enhanced benefits through Tornova's referral program." },
            { icon: "mail", title: "Rewards for Valuable Suggestions & Feedback", text: "Useful ideas, suggestions, and feedback that provide genuine value to Tornova may be recognized and rewarded." },
            { icon: "card", title: "Special Product Benefits & Offers", text: "Pioneer Customers may receive selected special offers, benefits, or opportunities made available by Tornova." },
            { icon: "bolt", title: "Early or Exclusive Access", text: "Eligible Pioneer Customers may receive early or exclusive access to selected future Tornova products, capabilities, or features." },
            { icon: "users", title: "Career Opportunity Consideration", text: "Pioneer Customers may be informed about suitable Tornova career opportunities and encouraged to apply. All hiring decisions remain based on qualifications, role requirements, and Tornova’s standard selection process." },
          ]}
        />
      </Section>
      <Section alt>
        <div className="grid cols-2">
          <div>
            <SectionHead title="Your Ideas Matter." lead="Meaningful suggestions, feature ideas, product feedback, or improvements may be recognized by Tornova." />
            <Cta to="/feedback" variant="secondary">
              Send Feedback
            </Cta>
          </div>
          <div>
            <SectionHead title="Share Tornova. Help Others Protect Their Data." lead="Eligible Pioneer Customers may receive enhanced referral rewards when they successfully introduce Tornova to others." />
          </div>
        </div>
      </Section>
      <Section>
        <SectionHead title="Support Us. Trust Us. Stay With Us." lead="Maintain your qualifying Tornova customer relationship for five years, and eligible Pioneer Customers can be recognized under Tornova Family status." />
        <Flow steps={["Pioneer Customer", "5 Years of Qualifying Tornova Relationship", "Tornova Family Recognition"]} />
      </Section>
      <Section alt>
        <SectionHead title="Pioneer FAQ" />
        <FaqQuestionList ids={["what-is-a-tornova-pioneer-customer", "do-i-need-to-purchase-a-long-term-plan-to-become-a-pioneer-customer", "can-pioneer-enrollment-close-before-six-months", "what-happens-to-a-pioneer-customer-after-five-years", "what-benefits-can-tornova-pioneer-customers-receive", "does-tornova-value-suggestions-from-pioneer-customers"]} />
      </Section>
      <FinalCta title="Support Tornova from the Beginning." lead="Become part of the customers who trusted Tornova early.">
        <Cta to="/signup">Get Started</Cta>
        <Cta to="/pricing" variant="secondary">
          View Pricing
        </Cta>
      </FinalCta>
    </>
  );
}

// ---------------------------------------------------------------- Trials
export function Trials() {
  return (
    <>
      <PageHero title="Try Tornova Before You Commit." lead="Start with a low-cost paid trial. No automatic renewal." />
      <Section>
        <TrialCards />
      </Section>
      <Section alt>
        <SectionHead title="How the trial works" />
        <CheckList items={["A trial is a small, paid, one-time purchase. It never renews automatically.", "One trial is available per customer, as your first Tornova purchase.", "When you choose a plan, your trial data carries over - nothing needs to be uploaded again."]} />
        <div className="btn-row" style={{ marginBlockStart: 22 }}>
          <Cta to="/pricing" variant="secondary">
            View Pricing
          </Cta>
        </div>
      </Section>
    </>
  );
}

// ---------------------------------------------------------------- Download
/** Stage 15: bytes -> "48.1 MB", the only unit customers/IT admins need for a single installer file. */
function formatFileSize(bytes: number): string {
  if (bytes <= 0) return "";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export function Download() {
  const { t } = useI18n();
  const { installerUrl, msiUrl, release } = useSiteConfig();
  const exe = release?.exe ?? null;
  return (
    <>
      <PageHero title="Protect Your PC with the Tornova Windows Agent." lead="Download the Tornova Agent, sign in to your account, and start protecting your selected files, folders, and drives." />
      <Section>
        <div className="grid cols-2" style={{ alignItems: "start" }}>
          <div className="card raised">
            <h2>{t("Tornova Agent for Windows")}</h2>
            <CheckList items={["Secure Windows Agent", "Easy Installation", "Background Backup Protection"]} />
            {/* Primary action: EXE, the default/normal choice (handoff §3.3). */}
            <div className="btn-row" style={{ marginBlockStart: 20 }}>
              {installerUrl ? (
                <a className="btn btn-primary" href={installerUrl} rel="noopener">
                  <Icon name="download" size={18} /> {t("Download for Windows")}
                </a>
              ) : (
                <button type="button" className="btn btn-primary" disabled aria-describedby="download-unavailable">
                  <Icon name="download" size={18} /> {t("Download for Windows")}
                </button>
              )}
            </div>
            {!installerUrl && (
              <div id="download-unavailable" style={{ marginBlockStart: 16 }}>
                <Notice tone="info" title={t("The Windows installer is not available yet")}>
                  {t("The download will be enabled here as soon as it is released.")}
                </Notice>
              </div>
            )}
            {/* Release metadata (handoff §11): version, release date, file size, SHA-256, release notes -
                truthful, server-derived (GET /api/v1/site/config), never fabricated. The checksum is a
                trust/verification OPTION, never presented as a routine step. */}
            {release?.version && (
              <p className="small muted" style={{ marginBlockStart: 10 }}>
                {t("Version")} {release.version}
                {release.releaseDateUtc && ` · ${release.releaseDateUtc}`}
                {exe && exe.sizeBytes > 0 && ` · ${formatFileSize(exe.sizeBytes)}`}
                {release.releaseNotesUrl && (
                  <>
                    {" · "}
                    <Link to="/release-notes">{t("Release notes")}</Link>
                  </>
                )}
              </p>
            )}
            {exe?.sha256 && (
              <details style={{ marginBlockStart: 6 }}>
                <summary className="small muted">{t("Verify the SHA-256 checksum (optional)")}</summary>
                <code className="small" style={{ wordBreak: "break-all", display: "block", marginBlockStart: 6 }}>
                  {exe.sha256}
                </code>
              </details>
            )}
            {/* Secondary action: MSI for IT/Admin deployment (handoff §3.2/§3.3) - clearly not a second
                Tornova product, only presented once one is actually published. */}
            {msiUrl && (
              <div className="btn-row" style={{ marginBlockStart: 14 }}>
                <a className="btn btn-secondary" href={msiUrl} rel="noopener">
                  <Icon name="download" size={16} /> {t("Download MSI for IT Deployment")}
                </a>
              </div>
            )}
            {msiUrl && (
              <p className="small muted" style={{ marginBlockStart: 6 }}>
                {t("The MSI package is for managed deployment through tools such as Microsoft Intune, Group Policy, or other enterprise software-distribution systems. It installs the same Tornova Agent as the EXE above.")}
              </p>
            )}
            {/* Locked wording (VG, Improved-2 sections 4 and 5). No "100% safe", "guaranteed", "Microsoft certified" or "code signing not required" claims,
                and customers are never asked to check a SHA-256 or to ignore a security warning. */}
            <div style={{ marginBlockStart: 20 }}>
              <Notice tone="info" title={t("Early Release Notice")}>
                <p>{t("Tornova Backup is currently available as an early release for Windows.")}</p>
                <p>
                  {t("For your safety, download Tornova Backup only from")} <strong>TornovaBackup.com</strong>.
                </p>
              </Notice>
            </div>
            <div style={{ marginBlockStart: 16 }}>
              <p>{t("The installer is built using Inno Setup and follows standard Windows installer practices. It has been carefully developed, security-reviewed and verified to install only the Tornova components described on the installer's information page, which is shown before anything is installed, without making unnecessary changes to your PC.")}</p>
              <p>
                <strong>{t("Designed for a safe, transparent and controlled Windows installation.")}</strong>
              </p>
              <p className="muted small">{t("Your PC's safety and data protection are treated as a critical priority throughout the Tornova installation process.")}</p>
            </div>
            <p className="small muted">
              {t("Already installed Tornova?")} <Link to="/signin">{t("Sign In")}</Link>
            </p>
          </div>
          <div>
            <SectionHead title="Getting started" />
            <Flow steps={["Download", "Install", "Sign In", "Register This PC", "Choose What to Protect"]} />
            <p className="muted small" style={{ marginBlockStart: 16 }}>
              {t("Windows is the current Agent platform.")}
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}

// ---------------------------------------------------------------- Release notes (Stage 15, handoff §12)

export function ReleaseNotes() {
  const { t } = useI18n();
  return (
    <>
      <PageHero title="Tornova Backup Release Notes" lead="What's new in each version of the Tornova Windows Agent." />
      <Section>
        {RELEASE_NOTES.length === 0 ? (
          <Notice tone="info" title={t("No release notes yet")}>
            {t("Release notes will appear here as soon as a version is published.")}
          </Notice>
        ) : (
          <div className="stack" style={{ display: "grid", gap: 20 }}>
            {RELEASE_NOTES.map((entry) => (
              <div className="card" key={entry.version}>
                <h2>
                  {t("Version")} {entry.version}
                </h2>
                <p className="small muted">{entry.dateUtc}</p>
                <ul>
                  {entry.changes.map((change) => (
                    <li key={change}>{t(change)}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        <p className="small muted" style={{ marginBlockStart: 20 }}>
          <Link to="/download">{t("Download the latest version")}</Link>
        </p>
      </Section>
    </>
  );
}

// ---------------------------------------------------------------- Product roadmap (Stage 17, Web-S001)
// Version-based milestones only - no dates, no promised years (VG's own locked constraint). The
// approved infographic (docs/Release-1/Stage17 -Stabilization/Web-S001/Roadmap.png) carries the visible
// detail; the incorrect generic shield icon that appeared before "TORNOVA" in the supplied file was
// replaced with the approved Tornova tornado symbol (the same cut-out asset Logo.xaml/HeroArt.xaml
// already use) as a precise image correction, never a redraw. The seven target-area summaries below are
// VG's own locked wording, kept out of visible layout (sr-only) so the infographic is not visually
// duplicated, while still giving the same content to screen readers and search engines.
const ROADMAP_VERSIONS: { version: string; title: string; text: string }[] = [
  { version: "Version 1", title: "Windows Backup", text: "Windows foundation and current Tornova backup capabilities." },
  { version: "Version 2", title: "Multi-Platform Support", text: "macOS, Android, iOS and unified cross-device experience." },
  { version: "Version 3", title: "Server Backups & Business Systems", text: "Windows Server, file servers, applications/databases, VM/cloud workloads and hybrid environments." },
  { version: "Version 4", title: "More Functionality for Organizations", text: "Advanced organization/team management, centralized controls, reporting, restore controls, compliance/governance and larger-team capabilities." },
  { version: "Version 5", title: "AI-Powered Data Protection", text: "AI insights, anomaly/ransomware-risk monitoring, smarter backup management, predictive insights and customer-facing AI assistance." },
  { version: "Version 6", title: "Global Expansion & Data Sovereignty", text: "Additional storage regions, region selection, residency, local compliance support and improved worldwide performance." },
  { version: "Version 7", title: "And Beyond", text: "Additional SaaS/business integrations, expanded platforms, partner/MSP ecosystem, advanced security and continued innovation." },
];

export function Roadmap() {
  const { t } = useI18n();
  return (
    <>
      <PageHero title="Tornova Backup Roadmap" lead="Where Tornova Backup is headed, by version - not by date." />
      <section className="section roadmap-section">
        <div className="container">
          <img
            src="/brand/roadmap.png"
            alt={t("Tornova Product Roadmap: a version-based journey from Version 1 (Windows Backup) through Version 7 (And Beyond). No dates, no deadlines - just steady progress. Full version-by-version details are provided in text below the image.")}
            className="roadmap-img"
          />
          <div className="sr-only">
            <h2>{t("Roadmap versions")}</h2>
            <dl>
              {ROADMAP_VERSIONS.map((v) => (
                <div key={v.version}>
                  <dt>
                    {t(v.version)} - {t(v.title)}
                  </dt>
                  <dd>{t(v.text)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>
    </>
  );
}

// ---------------------------------------------------------------- Support & Contact
const SUPPORT_CARDS: Array<[string, string, string]> = [
  ["Account & Sign-In Help", "users", "/faq?category=getting-started"],
  ["Backup Help", "cloud", "/faq?category=backup-automation"],
  ["Restore Help", "restore", "/faq?category=restore"],
  ["Windows Agent Help", "devices", "/faq?category=agent-devices"],
  ["Organization & Team Help", "badge", "/faq?category=organizations"],
  ["Billing & Subscription Help", "card", "/faq?category=pricing"],
];

export function Support() {
  const { t } = useI18n();
  return (
    <>
      <PageHero title="How Can We Help?" lead="Get help with your Tornova account, backup, restore, Windows Agent, billing, or Organization management." />
      <Section>
        <div className="grid cols-3">
          {SUPPORT_CARDS.map(([title, icon, to]) => (
            <Link key={title} to={to} className="card" style={{ textDecoration: "none", color: "inherit" }}>
              <div className="icon-chip">
                <Icon name={icon} />
              </div>
              <h3>{t(title)}</h3>
              <span className="small">{t("View answers")} →</span>
            </Link>
          ))}
        </div>
      </Section>
      <Section alt>
        <SectionHead title="Quick Help" />
        <div className="btn-row">
          <Cta to="/faq" variant="secondary">
            View FAQs
          </Cta>
          <Cta to="/download" variant="secondary">
            Download Windows Agent
          </Cta>
          <Cta to="/contact" variant="secondary">
            Contact Support
          </Cta>
          <Cta to="/feedback" variant="secondary">
            Send Feedback
          </Cta>
        </div>
      </Section>
      <Section>
        <div className="grid cols-2">
          <article className="card">
            <h3>{t("Contact Support")}</h3>
            <p>
              <a href="mailto:support@tornovabackup.com">support@tornovabackup.com</a>
            </p>
            <p className="muted">{t("For account, backup, restore, Agent, or technical support.")}</p>
          </article>
          <article className="card">
            <h3>{t("General Enquiries")}</h3>
            <p>
              <a href="mailto:contact@tornovabackup.com">contact@tornovabackup.com</a>
            </p>
            <p className="muted">{t("For general questions about Tornova.")}</p>
          </article>
        </div>
      </Section>
      <Section alt>
        <div className="grid cols-2">
          <div>
            <SectionHead title="Before Contacting Support" lead="Where relevant, please include:" />
            <CheckList items={["Account email", "Device name", "A short description of the issue", "The approximate time the issue occurred", "Screenshots where helpful"]} />
          </div>
          <div>
            <Notice tone="warn" title={t("Never send us secrets")}>
              {t("Tornova Support will never ask for your password, MFA codes, device credentials, encryption keys or any other secret. Please do not include them in a message.")}
            </Notice>
            <SectionHead title="Need Technical Diagnostics?" lead="Tornova Support may ask you to provide relevant diagnostic information from the Windows Agent when needed for troubleshooting." />
          </div>
        </div>
      </Section>
      <FinalCta title="Still need help?">
        <Cta to="/contact">Contact Support</Cta>
        <Cta to="/faq" variant="secondary">
          View FAQs
        </Cta>
      </FinalCta>
    </>
  );
}

export function Contact() {
  const { t } = useI18n();
  return (
    <>
      <PageHero title="Contact Us" lead="Reach Tornova for general enquiries or customer support." />
      <Section>
        <div className="grid cols-2">
          <article className="card raised">
            <h3>{t("General Enquiries")}</h3>
            <p style={{ fontSize: "1.1rem" }}>
              <a href="mailto:contact@tornovabackup.com">contact@tornovabackup.com</a>
            </p>
          </article>
          <article className="card raised">
            <h3>{t("Customer Support")}</h3>
            <p style={{ fontSize: "1.1rem" }}>
              <a href="mailto:support@tornovabackup.com">support@tornovabackup.com</a>
            </p>
          </article>
        </div>
        <p className="muted" style={{ marginBlockStart: 20 }}>
          {t("Planning a strategic or large deployment? Tell us about your organization and we will prepare a custom offer.")}
        </p>
        <div className="btn-row">
          <Cta to="/support" variant="secondary">
            Get Support
          </Cta>
          <Cta to="/feedback" variant="secondary">
            Send Feedback
          </Cta>
        </div>
      </Section>
    </>
  );
}

/** Referral Program (Review-01/16, sections 6-10). Public: the reward table and what
 *  makes a reward eligible. Never public: the internal referral-code categories, the
 *  commission architecture, or how abuse and self-referral are detected. */
export function Referral() {
  const { t } = useI18n();
  return (
    <>
      <PageHero title="Share Tornova. Earn Referral Rewards." lead="Recommend Tornova to someone who needs reliable backup. Referral rewards apply to both Personal and Organization purchases." />
      <section className="section">
        <div className="container">
          <SectionHead title="Referral Rewards" lead="The reward is a percentage of the referred customer's purchase." />
          <div className="table-wrap" style={{ maxWidth: 620 }}>
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">{t("Customer Type / Purchase Size")}</th>
                  <th scope="col" className="num">
                    {t("Referral Bonus")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {REFERRAL_BONUSES.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{t(row.label)}</th>
                    <td className="num">{t(row.bonus)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small" style={{ marginBlockStart: 12 }}>
            {t("Referral rewards are separate from Organization volume discounts. Strategic and custom deals are reviewed individually.")}
          </p>
        </div>
      </section>

      <section className="section alt">
        <div className="container">
          <SectionHead title="How a Referral Becomes a Reward" />
          <CheckList
            items={[
              "The new customer signs up with your referral code and your verified email address.",
              "Their purchase is paid successfully and the payment is confirmed.",
              "The applicable refund and review period has passed.",
              "Self-referrals are not eligible.",
            ]}
          />
          <p style={{ marginBlockStart: 16 }}>
            <strong>{t("Pioneer Customers")}</strong> {t("may receive enhanced referral rewards under the Pioneer policy.")} <Link to="/pioneer">{t("About the Pioneer Program")}</Link>
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead title="Referral Questions" />
          <FaqQuestionList ids={["does-tornova-have-a-referral-program", "can-i-refer-myself-to-receive-a-reward", "what-benefits-can-tornova-pioneer-customers-receive"]} />
        </div>
      </section>
      <FinalCta title="Protect your files with Tornova.">
        <Cta to="/signup">Get Started</Cta>
      </FinalCta>
    </>
  );
}
