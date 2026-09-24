import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useI18n, type LocaleCode } from "../i18n";
import { useAuth } from "../lib/auth";
import { usePublicOffer, useSiteConfig } from "../lib/config";
import { Brand } from "./ui";

// LOCKED final header (Review-01/16, section 1): Logo | Download | Features | Personal |
// Organization | Trials | Pricing | FAQ | Security | Pioneer | Support | Language |
// Sign In | Sign Up. Referral and Organization Offers are never header items; Sign Up
// is the strongest call to action, far right.
export const MAIN_NAV: Array<{ to: string; label: string }> = [
  { to: "/download", label: "Download" },
  { to: "/features", label: "Features" },
  { to: "/personal", label: "Personal" },
  { to: "/organization", label: "Organization" },
  { to: "/trials", label: "Trials" },
  { to: "/pricing", label: "Pricing" },
  { to: "/faq", label: "FAQ" },
  { to: "/security", label: "Security" },
  { to: "/pioneer", label: "Pioneer" },
  { to: "/support", label: "Support" },
];

export const FOOTER: Array<{ title: string; links: Array<{ to: string; label: string }> }> = [
  { title: "Product", links: [{ to: "/features", label: "Features" }, { to: "/pricing", label: "Pricing" }, { to: "/trials", label: "Trials" }, { to: "/download", label: "Download" }, { to: "/roadmap", label: "Roadmap" }] },
  { title: "Solutions", links: [{ to: "/personal", label: "Personal" }, { to: "/organization", label: "Organization" }] },
  { title: "Trust & Programs", links: [{ to: "/security", label: "Security" }, { to: "/pioneer", label: "Pioneer Program" }, { to: "/referral", label: "Referral Program" }] },
  { title: "Help", links: [{ to: "/faq", label: "FAQ" }, { to: "/support", label: "Support" }, { to: "/contact", label: "Contact Us" }, { to: "/feedback", label: "Feedback" }] },
  { title: "Account", links: [{ to: "/signup", label: "Sign Up" }, { to: "/signin", label: "Sign In" }] },
];

function useCanonical() {
  const { publicOrigin } = useSiteConfig();
  const { pathname } = useLocation();
  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = publicOrigin.replace(/\/$/, "") + (pathname === "/" ? "/" : pathname.replace(/\/$/, ""));
  }, [publicOrigin, pathname]);
}

export function SiteLayout() {
  const { t, locale, setLocale, available, isPreview } = useI18n();
  const { status } = useAuth();
  const { isPrivate } = useSiteConfig();
  const offer = usePublicOffer();
  const [open, setOpen] = useState(false);
  const { pathname, hash } = useLocation();
  useCanonical();

  useEffect(() => {
    setOpen(false);
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {isPrivate && (
        <div className="utility">
          <div className="container">
            <span className="private-flag">Private preview - not public</span>
          </div>
        </div>
      )}
      <header className="site-header">
        <div className="container">
          <Brand />
          <button type="button" className="btn btn-ghost btn-sm nav-toggle" aria-expanded={open} aria-controls="main-nav" onClick={() => setOpen((o) => !o)}>
            {open ? t("Close") : t("Menu")}
          </button>
          <nav id="main-nav" className={`main-nav${open ? " open" : ""}`} aria-label="Main">
            {MAIN_NAV.map((item) => (
              <NavLink key={item.to} to={item.to}>
                {t(item.label)}
              </NavLink>
            ))}
          </nav>
          <div className="header-actions">
            <label className="sr-only" htmlFor="locale">
              {t("Language")}
            </label>
            <select id="locale" className="lang" value={locale} onChange={(e) => setLocale(e.target.value as LocaleCode)} aria-label={t("Language")}>
              {available.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                  {isPreview(l.code) ? " (preview)" : ""}
                </option>
              ))}
            </select>
            {status === "signedIn" ? (
              <Link className="btn btn-primary btn-sm" to="/app">
                {t("Dashboard")}
              </Link>
            ) : (
              <>
                <Link className="btn btn-secondary btn-sm" to="/signin">
                  {t("Sign In")}
                </Link>
                <Link className="btn btn-primary btn-sm" to="/signup">
                  {t("Sign Up")}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      {offer.india && (
        <div className="storefront-note" role="note">
          {t("Prices on this site are Tornova's Global prices in US dollars. Pricing in Indian rupees is not available yet, and purchases are not open on this storefront.")}
        </div>
      )}
      <main id="main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid">
            {FOOTER.map((column) => (
              <nav key={column.title} aria-label={t(column.title)}>
                <h3>{t(column.title)}</h3>
                <ul>
                  {column.links.map((link) => (
                    <li key={link.to}>
                      <Link to={link.to}>{t(link.label)}</Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
          <div className="footer-base">
            <Brand light />
            <span>© 2026 Tornova. {t("All rights reserved.")}</span>
          </div>
        </div>
      </footer>
    </>
  );
}
