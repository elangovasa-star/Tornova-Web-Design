import { useEffect, useState } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { Brand, ConfirmDialog, Loading } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { ROLE_LABEL, navFor, scopeLabel } from "../lib/roles";
import { useApi } from "../lib/useApi";

export interface ControlState {
  emergencyStopActive: boolean;
  changedAtUtc: string | null;
  reason: string | null;
  callerMayControl: boolean;
}

/** Everything under /app requires a signed-in customer. The guard is a
 *  convenience only: every request is authorized again by the server. */
export function RequireSession() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === "loading") return <Loading label="Opening your dashboard" />;
  if (status === "accountChanged") {
    return (
      <main className="auth-wrap">
        <div className="auth-card" role="alert">
          <h1 style={{ fontSize: "1.4rem" }}>You switched accounts in another tab</h1>
          <p>This tab was showing a different account, so it has stopped. Nothing was changed. Reload to continue with the account that is active now.</p>
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </main>
    );
  }
  if (status === "signedOut") return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  return <AppShell />;
}

function AppShell() {
  const { me, signOut, accounts, switchAccount } = useAuth();
  const [open, setOpen] = useState(false);
  const [resuming, setResuming] = useState(false);
  const control = useApi<ControlState>("/api/v1/dashboard/control-state");
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);

  if (!me) return <Loading />;
  const groups = ["Protect", "Recover", "Manage", "Account"] as const;
  const nav = navFor(me.capabilities);
  const stopped = control.data?.emergencyStopActive === true;

  return (
    <div className="app">
      <a className="skip-link" href="#app-main">
        Skip to content
      </a>
      <aside className={`app-side${open ? " open" : ""}`} aria-label="Dashboard">
        <Brand light to="/app" />
        {groups.map((group) => {
          const items = nav.filter((n) => n.group === group);
          return items.length === 0 ? null : (
            <nav key={group} aria-label={group}>
              <h4>{group}</h4>
              {items.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.to === "/app"}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          );
        })}
      </aside>

      <div className="app-main">
        {stopped && (
          <div className="stop-banner" role="alert">
            <span>
              Emergency Stop is active - backups are stopped{me.accountType === "Business" ? " across the Organization" : ""}.
              {control.data?.reason ? ` Reason: ${control.data.reason}` : ""}
            </span>
            {control.data?.callerMayControl && me.capabilities.resumeEmergencyStop ? (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setResuming(true)}>
                Resume backups
              </button>
            ) : (
              <span className="small">Only your Organization Admin can resume.</span>
            )}
          </div>
        )}
        <header className="app-top">
          <button type="button" className="btn btn-ghost btn-sm app-menu-btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            Menu
          </button>
          <span className="scope">{scopeLabel(me.role, me.teamName, me.accountName)}</span>
          <div className="who">
            {accounts.length > 1 && (
              <>
                <label className="sr-only" htmlFor="account-switch">
                  Account
                </label>
                <select id="account-switch" className="select" style={{ minHeight: 36, width: "auto" }} value={me.accountId} onChange={(e) => void switchAccount(e.target.value)}>
                  {accounts.map((account) => (
                    <option key={account.accountId} value={account.accountId}>
                      {account.name ?? (account.type === "Business" ? "Organization" : "Personal account")}
                    </option>
                  ))}
                </select>
              </>
            )}
            <span>
              {me.displayName} · <span className="muted">{ROLE_LABEL[me.role]}</span>
            </span>
            <Link to="/" className="small">
              Website
            </Link>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void signOut()}>
              Sign Out
            </button>
          </div>
        </header>
        <main id="app-main" className="app-content">
          <Outlet context={{ control }} />
        </main>
      </div>

      {resuming && (
        <ConfirmDialog
          title="Resume backups"
          body={<p>Backups never restart by themselves. Resuming allows devices to back up again at their next schedule. Resume only when the incident is resolved.</p>}
          confirmLabel="Resume backups"
          requireReason
          onClose={() => setResuming(false)}
          onConfirm={async (reason) => {
            await api("/api/v1/dashboard/emergency-stop/resume", { method: "POST", body: { reason } });
            control.reload();
          }}
        />
      )}
    </div>
  );
}
