import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Notice } from "../../components/ui";
import { useI18n } from "../../i18n";
import { ApiError, api } from "../../lib/api";
import { Cta, PageHero, SectionHead } from "../blocks";
import { FAQ_CATEGORIES, FAQ_ITEMS, type FaqItem } from "../content/faq";

const FAQ_LINK_FLASH_MS = 1400;

/**
 * Opens (if collapsed), scrolls to, and briefly highlights the FAQ answer with this id. Shared by the
 * deep-link effect (a fresh tab opening a copied URL, or browser back/forward) and the "Link to this
 * answer" click handler, so both give the same visible confirmation - including the one case a plain
 * `<a href="#id">` looked broken: clicking it while that answer is already open and in view produces no
 * scroll and no `hashchange` at all (the URL fragment does not actually change), which read as "does
 * not respond" in manual testing. Exported for tests.
 */
export function revealFaqAnswer(id: string) {
  const element = document.getElementById(id);
  if (!element) return;
  if (element instanceof HTMLDetailsElement) element.open = true;
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  element.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  element.classList.add("faq-linked");
  window.setTimeout(() => element.classList.remove("faq-linked"), FAQ_LINK_FLASH_MS);
}

/** Case-insensitive search over questions and answers. Exported for tests. */
export function searchFaq(items: FaqItem[], query: string, category: string | null): FaqItem[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter((item) => {
    if (category && item.category !== category) return false;
    if (words.length === 0) return true;
    const text = `${item.question} ${item.answer.join(" ")}`.toLowerCase();
    return words.every((w) => text.includes(w));
  });
}

export function Faq() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const { hash } = useLocation();
  const [query, setQuery] = useState("");
  const category = FAQ_CATEGORIES.some((c) => c.id === params.get("category")) ? params.get("category") : null;
  const anchor = hash.replace("#", "");
  const results = useMemo(() => searchFaq(FAQ_ITEMS, query, category), [query, category]);

  // A deep link (a fresh tab opening a copied "#id" URL, or the browser back/forward button landing on
  // one) opens its question and brings it into view.
  useEffect(() => {
    if (!anchor) return;
    revealFaqAnswer(anchor);
  }, [anchor, results]);

  const grouped = FAQ_CATEGORIES.map((c) => ({ ...c, items: results.filter((i) => i.category === c.id) })).filter((c) => c.items.length > 0);

  return (
    <>
      <PageHero title="How Can We Help?" lead="Find clear answers about Tornova Backup, security, restore, pricing, Organizations, Windows Agent, and account management.">
        <div className="field" style={{ maxWidth: 560, marginBlockEnd: 0 }}>
          <label className="sr-only" htmlFor="faq-search">
            {t("Search Tornova FAQs…")}
          </label>
          <input id="faq-search" type="search" className="input" placeholder={t("Search Tornova FAQs…")} value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </PageHero>

      <section className="section">
        <div className="container">
          <div className="btn-row" role="group" aria-label={t("FAQ categories")} style={{ marginBlockEnd: 24 }}>
            <button type="button" className={`btn btn-sm ${category ? "btn-ghost" : "btn-primary"}`} aria-pressed={!category} onClick={() => setParams({})}>
              {t("All")}
            </button>
            {FAQ_CATEGORIES.map((c) => (
              <button type="button" key={c.id} className={`btn btn-sm ${category === c.id ? "btn-primary" : "btn-ghost"}`} aria-pressed={category === c.id} onClick={() => setParams({ category: c.id })}>
                {t(c.name)}
              </button>
            ))}
          </div>

          <p className="small muted" aria-live="polite">
            {t("{count} questions", { count: results.length })}
          </p>

          {grouped.length === 0 ? (
            <div className="state">
              <h3>{t("No questions match your search")}</h3>
              <p>{t("Try different words, or contact us and we will help.")}</p>
              <Cta to="/support" variant="secondary">
                Contact Support
              </Cta>
            </div>
          ) : (
            grouped.map((group) => (
              <section key={group.id} style={{ marginBlockEnd: 36 }} aria-labelledby={`cat-${group.id}`}>
                <h2 id={`cat-${group.id}`}>{t(group.name)}</h2>
                <div className="accordion">
                  {group.items.map((item) => (
                    <details key={item.id} id={item.id} open={item.id === anchor || undefined}>
                      <summary>
                        <span>
                          {t(item.question)} {item.future && <span className="tag future">{t("Planned - not available today")}</span>}
                        </span>
                      </summary>
                      <div className="answer">
                        {item.answer.map((p) => (
                          <p key={p}>{t(p)}</p>
                        ))}
                        <Link className="small" to={`#${item.id}`} onClick={() => revealFaqAnswer(item.id)}>
                          {t("Link to this answer")}
                        </Link>
                      </div>
                    </details>
                  ))}
                </div>
                <p className="small" style={{ marginBlockStart: 10 }}>
                  {t("Did not find your answer?")} <Link to="/support">{t("Contact Support")}</Link>
                </p>
              </section>
            ))
          )}
        </div>
      </section>

      <section className="section alt">
        <div className="container" style={{ textAlign: "center" }}>
          <SectionHead center title="Still Have Questions?" />
          <div className="btn-row" style={{ justifyContent: "center" }}>
            <Cta to="/support">Contact Support</Cta>
            <Cta to="/contact" variant="secondary">
              Contact Us
            </Cta>
          </div>
        </div>
      </section>
    </>
  );
}

// LOCKED subject list (docs/stage9/01, section 6) - the server accepts only these.
export const FEEDBACK_SUBJECTS = ["Suggestion", "Feature Request", "Website Feedback", "Product Feedback", "Pricing Feedback", "Bug / Problem", "Compliment", "Other"];

export function Feedback() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [state, setState] = useState<{ kind: "idle" | "sending" | "received" } | { kind: "failed"; message: string }>({ kind: "idle" });

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const contentOk = content.trim().length >= 10 && content.trim().length <= 4000;
  const ready = emailOk && subject !== "" && contentOk;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    setState({ kind: "sending" });
    try {
      // "Received" is shown ONLY when the server confirms it stored the message.
      const result = await api<{ received: boolean }>("/api/v1/feedback", { method: "POST", anonymous: true, body: { email: email.trim(), subject, content: content.trim() } });
      if (result?.received !== true) throw new ApiError("server", 500, null, "Your feedback could not be confirmed as received. Please try again.");
      setState({ kind: "received" });
      setContent("");
      setSubject("");
    } catch (error) {
      setState({ kind: "failed", message: error instanceof ApiError ? error.message : "Your feedback could not be sent. Please try again." });
    }
  };

  return (
    <>
      <PageHero title="Send Feedback" lead="Share suggestions, feature ideas, product feedback, or report a problem." />
      <section className="section">
        <div className="container" style={{ maxWidth: 680 }}>
          {state.kind === "received" && (
            <Notice tone="ok" title={t("Thank you. Your feedback has been received.")} />
          )}
          {state.kind === "failed" && (
            <Notice tone="bad" title={t("Your feedback was not sent")}>
              {state.message}
            </Notice>
          )}
          <form className="card" onSubmit={submit} noValidate>
            <div className="field">
              <label htmlFor="fb-email">{t("Your Email")}</label>
              <input id="fb-email" type="email" className="input" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={email !== "" && !emailOk} />
              {email !== "" && !emailOk && <span className="error">{t("Enter a valid email address.")}</span>}
            </div>
            <div className="field">
              <label htmlFor="fb-subject">{t("Feedback Subject")}</label>
              <select id="fb-subject" className="select" required value={subject} onChange={(e) => setSubject(e.target.value)}>
                <option value="">{t("Choose a subject")}</option>
                {FEEDBACK_SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {t(s)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="fb-content">{t("Feedback Content")}</label>
              <textarea id="fb-content" className="textarea" required maxLength={4000} value={content} onChange={(e) => setContent(e.target.value)} aria-describedby="fb-content-hint" />
              <span id="fb-content-hint" className="hint">
                {t("At least 10 characters. Please do not include passwords or other secrets.")}
              </span>
            </div>
            <button type="submit" className="btn btn-primary" disabled={!ready || state.kind === "sending"}>
              {state.kind === "sending" ? t("Sending…") : t("Submit Feedback")}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
