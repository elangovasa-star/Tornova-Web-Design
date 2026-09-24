import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Notice } from "../../components/ui";
import { useI18n } from "../../i18n";
import { ApiError, api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useSiteConfig } from "../../lib/config";
import { clearIntent, readIntent, saveIntent, type PurchaseIntent } from "../../lib/intent";

export { clearIntent, readIntent, type PurchaseIntent };

function useCaptureIntent() {
  const [params] = useSearchParams();
  useEffect(() => {
    const intent: PurchaseIntent = {
      trial: params.get("trial") ?? undefined,
      storage: params.get("storage") ?? undefined,
      duration: params.get("duration") ?? undefined,
      users: params.get("users") ?? undefined,
      organization: params.get("for") === "organization" || undefined,
    };
    if (Object.values(intent).some(Boolean)) saveIntent(intent);
  }, [params]);
}

function message(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1 style={{ fontSize: "1.6rem" }}>{t(title)}</h1>
        {children}
      </div>
    </div>
  );
}

/** Where a signed-in visitor goes next: back to where they were sent from - but
 *  only to an internal path (never an open redirect) - or to the dashboard. */
function useReturnPath() {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const safe = typeof from === "string" && from.startsWith("/") && !from.startsWith("//") ? from : null;
  const intent = readIntent();
  return safe ?? (intent?.storage || intent?.trial ? "/app/billing" : "/app");
}

export function SignIn() {
  const { t } = useI18n();
  const auth = useAuth();
  const navigate = useNavigate();
  const returnPath = useReturnPath();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"credentials" | "mfa" | "organization" | "choose">("credentials");
  const [organizationName, setOrganizationName] = useState(readIntent()?.organizationName ?? "");
  const [target, setTarget] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useCaptureIntent();

  if (auth.status === "signedIn") return <Navigate to={target ?? returnPath} replace />;

  const run = async (action: () => Promise<{ step: string; to?: string }>) => {
    setBusy(true);
    setError(null);
    try {
      const outcome = await action();
      if (outcome.step === "mfa" || outcome.step === "organization" || outcome.step === "choose") setStep(outcome.step);
      else if (outcome.step === "noAccount") setError(t("This sign-in has no Tornova account to open."));
      else navigate(outcome.to ?? returnPath, { replace: true });
    } catch (e) {
      setError(message(e, t("Sign-in failed. Please try again.")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard title={step === "organization" ? "Set up your Organization" : step === "choose" ? "Choose an account" : "Sign In"}>
      {error && <Notice tone="bad">{error}</Notice>}
      {step === "organization" ? (
        // Codex Review-01, P1-5. Registration created the Personal account every
        // Tornova customer has; an Organization is this explicit step, and whoever
        // takes it becomes the Organization Admin and lands in the Organization.
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const to = readIntent()?.storage ? "/app/billing" : "/app/organization";
            setTarget(to);
            void run(async () => (await auth.createOrganization(organizationName.trim()), saveIntent({ organization: false }), { step: "done", to }));
          }}
        >
          <p className="muted">{t("You are creating a Tornova Organization. You will be its Organization Admin and can add users and Teams next.")}</p>
          <div className="field">
            <label htmlFor="si-org">{t("Organization name")}</label>
            <input id="si-org" className="input" required maxLength={200} value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={busy || !organizationName.trim()}>
            {busy ? t("Creating…") : t("Create Organization")}
          </button>
          {auth.accounts.some((a) => a.type === "Personal") && (
            <p className="small" style={{ marginBlockStart: 14 }}>
              <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => run(async () => (saveIntent({ organization: false }), await auth.switchAccount(auth.accounts.find((a) => a.type === "Personal")!.accountId), { step: "done" }))}>
                {t("Not now - open my Personal account")}
              </button>
            </p>
          )}
        </form>
      ) : step === "choose" ? (
        <>
          <p className="muted">{t("This sign-in belongs to more than one account.")}</p>
          {auth.accounts.map((account) => (
            <button key={account.accountId} type="button" className="card" style={{ display: "block", width: "100%", textAlign: "start", marginBlockEnd: 10, cursor: "pointer" }} disabled={busy} onClick={() => run(async () => (await auth.switchAccount(account.accountId), { step: "done" }))}>
              <b>{account.name ?? (account.type === "Business" ? t("Organization") : t("Personal account"))}</b>
              <span className="small muted" style={{ display: "block" }}>
                {account.type === "Business" ? t("Organization") : t("Personal")}
              </span>
            </button>
          ))}
        </>
      ) : step === "credentials" ? (
        <form onSubmit={(e) => (e.preventDefault(), run(() => auth.signIn(username.trim(), password)))}>
          <div className="field">
            <label htmlFor="si-user">{t("Username")}</label>
            <input id="si-user" className="input" autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="si-pass">{t("Password")}</label>
            <input id="si-pass" type="password" className="input" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={busy || !username || !password}>
            {busy ? t("Signing in…") : t("Sign In")}
          </button>
          <p className="small" style={{ marginBlockStart: 16 }}>
            <Link to="/forgot-password">{t("Forgot your password?")}</Link>
          </p>
          <p className="small muted">
            {t("New to Tornova?")} <Link to="/signup">{t("Sign Up")}</Link>
          </p>
        </form>
      ) : (
        <form onSubmit={(e) => (e.preventDefault(), run(() => auth.submitMfa(code.trim())))}>
          <p className="muted">{t("Enter the 6-digit code from your authenticator app.")}</p>
          <div className="field">
            <label htmlFor="si-code">{t("Verification code")}</label>
            <input id="si-code" className="input" inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={busy || code.trim().length < 6}>
            {busy ? t("Verifying…") : t("Verify")}
          </button>
        </form>
      )}
    </AuthCard>
  );
}

export function SignUp() {
  const { t } = useI18n();
  const { checkoutEnabled } = useSiteConfig();
  const [form, setForm] = useState({ displayName: "", email: "", username: "", password: "", referralCode: "", referrerEmail: "", organizationName: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  useCaptureIntent();
  const intent = readIntent();
  const [params] = useSearchParams();
  const forOrganization = params.get("for") === "organization" || intent?.organization === true;
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/v1/auth/register", {
        method: "POST",
        anonymous: true,
        body: { username: form.username.trim(), password: form.password, displayName: form.displayName.trim(), email: form.email.trim(), referralCode: form.referralCode.trim() || null, referrerEmail: form.referrerEmail.trim() || null },
      });
      if (forOrganization) saveIntent({ organization: true, organizationName: form.organizationName.trim() });
      setDone(true);
    } catch (e) {
      setError(message(e, t("Your account could not be created. Please try again.")));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <AuthCard title="Check your email">
        <Notice tone="ok" title={t("Your account has been created.")}>
          {t("We sent a verification code to {email}. Verify your email, then sign in.", { email: form.email.trim() })}
        </Notice>
        <Link className="btn btn-primary" to="/verify-email">
          {t("Verify my email")}
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Create your Tornova account">
      {intent && (intent.trial || intent.storage) && (
        <Notice tone="info">
          {checkoutEnabled
            ? intent.trial
              ? t("You chose the {trial} trial. You will complete it after signing in.", { trial: intent.trial })
              : t("You chose {storage}. You will complete your purchase after signing in.", { storage: intent.storage ?? "" })
            : t("You chose {choice}. Purchasing is not open yet - you can create your account now.", { choice: intent.trial ? `${intent.trial} trial` : (intent.storage ?? "") })}
        </Notice>
      )}
      {forOrganization && (
        <Notice tone="info" title={t("You are signing up for an Organization")}>
          {t("After you verify your email and sign in, Tornova creates your Organization and makes you its Organization Admin.")} <Link to="/signup" onClick={() => clearIntent()}>{t("Sign up for Personal instead")}</Link>
        </Notice>
      )}
      {error && <Notice tone="bad">{error}</Notice>}
      <form onSubmit={submit}>
        {forOrganization && (
          <div className="field">
            <label htmlFor="su-org">{t("Organization name")}</label>
            <input id="su-org" className="input" required maxLength={200} value={form.organizationName} onChange={set("organizationName")} />
          </div>
        )}
        <div className="field">
          <label htmlFor="su-name">{t("Your name")}</label>
          <input id="su-name" className="input" autoComplete="name" required value={form.displayName} onChange={set("displayName")} />
        </div>
        <div className="field">
          <label htmlFor="su-email">{t("Email")}</label>
          <input id="su-email" type="email" className="input" autoComplete="email" required value={form.email} onChange={set("email")} />
          <span className="hint">{t("Used for verification, recovery and notices. You sign in with your username.")}</span>
        </div>
        <div className="field">
          <label htmlFor="su-user">{t("Username")}</label>
          <input id="su-user" className="input" autoComplete="username" required value={form.username} onChange={set("username")} />
        </div>
        <div className="field">
          <label htmlFor="su-pass">{t("Password")}</label>
          <input id="su-pass" type="password" className="input" autoComplete="new-password" required minLength={10} value={form.password} onChange={set("password")} />
          <span className="hint">{t("At least 10 characters.")}</span>
        </div>
        <details style={{ marginBlockEnd: 16 }}>
          <summary className="small">{t("I have a referral code")}</summary>
          <div className="field" style={{ marginBlockStart: 12 }}>
            <label htmlFor="su-ref">{t("Referral code")}</label>
            <input id="su-ref" className="input" value={form.referralCode} onChange={set("referralCode")} />
          </div>
          <div className="field">
            <label htmlFor="su-refmail">{t("Referrer's email")}</label>
            <input id="su-refmail" type="email" className="input" value={form.referrerEmail} onChange={set("referrerEmail")} />
          </div>
        </details>
        <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={busy}>
          {busy ? t("Creating account…") : t("Sign Up")}
        </button>
        <p className="small muted" style={{ marginBlockStart: 16 }}>
          {t("Already have an account?")} <Link to="/signin">{t("Sign In")}</Link>
        </p>
      </form>
    </AuthCard>
  );
}

export function VerifyEmail() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const linkToken = params.get("token");
  const [typed, setTyped] = useState("");
  const [state, setState] = useState<"idle" | "working" | "ok" | "failed">(linkToken ? "working" : "idle");
  const [error, setError] = useState<string | null>(null);

  const verify = (token: string) => {
    setState("working");
    api("/api/v1/auth/verify-email", { method: "POST", anonymous: true, body: { token } })
      .then(() => setState("ok"))
      .catch((e) => {
        setError(message(e, "This verification code is not valid."));
        setState("failed");
      });
  };

  useEffect(() => {
    if (linkToken) verify(linkToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkToken]);

  return (
    <AuthCard title="Verify your email">
      {state === "working" && <p role="status">{t("Verifying…")}</p>}
      {state === "ok" && (
        <>
          <Notice tone="ok" title={t("Your email is verified.")} />
          <Link className="btn btn-primary" to="/signin">
            {t("Sign In")}
          </Link>
        </>
      )}
      {state === "failed" && <Notice tone="bad">{error ?? t("This verification code is not valid or has expired.")}</Notice>}
      {(state === "idle" || state === "failed") && (
        // The verification email carries a code; a link that fills it in
        // automatically is supported too (?token=).
        <form onSubmit={(e) => (e.preventDefault(), verify(typed.trim()))}>
          <div className="field">
            <label htmlFor="ve-token">{t("Verification code from your email")}</label>
            <input id="ve-token" className="input" autoComplete="one-time-code" required value={typed} onChange={(e) => setTyped(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={!typed.trim()}>
            {t("Verify")}
          </button>
        </form>
      )}
    </AuthCard>
  );
}

export function ForgotPassword() {
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setState("sending");
    setError(null);
    try {
      await api("/api/v1/auth/password/forgot", { method: "POST", anonymous: true, body: { username: username.trim() } });
      setState("sent");
    } catch (e) {
      setError(message(e, "The request could not be sent. Please try again."));
      setState("idle");
    }
  };

  return (
    <AuthCard title="Reset your password">
      {state === "sent" ? (
        // Deliberately the same message whether or not the username exists.
        <Notice tone="info" title={t("If that username exists, we have emailed a reset link.")}>
          {t("Check the email address on your Tornova account.")}
        </Notice>
      ) : (
        <form onSubmit={submit}>
          {error && <Notice tone="bad">{error}</Notice>}
          <div className="field">
            <label htmlFor="fp-user">{t("Username")}</label>
            <input id="fp-user" className="input" autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={state === "sending" || !username.trim()}>
            {t("Send reset link")}
          </button>
        </form>
      )}
      <p className="small" style={{ marginBlockStart: 16 }}>
        <Link to="/signin">{t("Back to Sign In")}</Link>
      </p>
    </AuthCard>
  );
}

export function ResetPassword() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const [token, setToken] = useState(params.get("token") ?? "");
  const hasLinkToken = Boolean(params.get("token"));
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setState("saving");
    setError(null);
    try {
      await api("/api/v1/auth/password/reset", { method: "POST", anonymous: true, body: { token, newPassword: password } });
      setState("done");
    } catch (e) {
      setError(message(e, "Your password could not be changed."));
      setState("idle");
    }
  };

  return (
    <AuthCard title="Choose a new password">
      {state === "done" ? (
        <>
          <Notice tone="ok" title={t("Your password has been changed.")} />
          <Link className="btn btn-primary" to="/signin">
            {t("Sign In")}
          </Link>
        </>
      ) : (
        (
          <form onSubmit={submit}>
            {error && <Notice tone="bad">{error}</Notice>}
            {!hasLinkToken && (
              <div className="field">
                <label htmlFor="rp-token">{t("Reset code from your email")}</label>
                <input id="rp-token" className="input" autoComplete="one-time-code" required value={token} onChange={(e) => setToken(e.target.value.trim())} />
              </div>
            )}
            <div className="field">
              <label htmlFor="rp-pass">{t("New password")}</label>
              <input id="rp-pass" type="password" className="input" autoComplete="new-password" required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={state === "saving" || password.length < 10 || !token}>
              {t("Change password")}
            </button>
          </form>
        )
      )}
    </AuthCard>
  );
}
