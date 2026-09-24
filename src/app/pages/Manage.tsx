import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Badge, ConfirmDialog, Dialog, Empty, Failure, Loading, Notice, Pager, formatDateTime } from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useSiteConfig } from "../../lib/config";
import { formatMoney } from "../../lib/pricing";
import { ROLE_LABEL, type CustomerRole } from "../../lib/roles";
import { formatBytes, quotaWarning } from "../../lib/status";
import { gateReason } from "../../lib/gates";
import { useApi, type Loaded } from "../../lib/useApi";
import { clearIntent, readIntent } from "../../lib/intent";
import type { ControlState } from "../AppShell";

const errorText = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

// ---------------------------------------------------------------- Users & Teams / My Team
interface Member {
  userId: string;
  username: string;
  displayName: string;
  email: string;
  role: CustomerRole;
  teamId: string | null;
  teamName: string | null;
  backupEnabled: boolean;
  restoreEnabled: boolean;
  deleteEnabled: boolean;
  deviceCount: number;
}

interface Account {
  accountId: string;
  type: number | string;
  name: string | null;
  masterBackupLockEnabled: boolean;
  masterRestoreLockEnabled: boolean;
  teams: Array<{ teamId: string; name: string; restoreLockEnabled: boolean }>;
}

const MEMBER_PAGE = 25;

const ROLE_VALUE: Record<CustomerRole, number> = { PersonalUser: 0, OrganizationAdmin: 1, TeamAdmin: 2, BackupUser: 3 };

export function OrganizationPage() {
  const { me, reloadMe } = useAuth();
  const [filter, setFilter] = useState("");
  const [skip, setSkip] = useState(0);
  const members = useApi<{ items: Member[]; total: number }>(`/api/v1/dashboard/members?skip=${skip}&take=${MEMBER_PAGE}${filter.trim() ? `&q=${encodeURIComponent(filter.trim())}` : ""}`);
  const account = useApi<Account>(me ? `/api/v1/accounts/${me.accountId}` : null);
  const [edit, setEdit] = useState<Member | null>(null);
  const [adding, setAdding] = useState(false);
  const [newTeam, setNewTeam] = useState(false);
  const [renaming, setRenaming] = useState<Account["teams"][number] | null>(null);
  const [removing, setRemoving] = useState<Member | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  if (!me) return null;

  const caps = me.capabilities;
  const admin = caps.manageUsers;
  const rowActions = caps.manageUserRoles || caps.removeMembers;
  const list = members.data?.items ?? [];
  // The server returns only the Teams this caller may see (Codex Review-01, P2-1).
  const teams = account.data?.teams ?? [];
  const done = (text: string) => (setMessage(text), members.reload(), account.reload());

  return (
    <>
      <h1>{admin ? "Users & Teams" : "My Team"}</h1>
      <p className="sub">{admin ? "Everyone in your Organization, their Team, role and permissions." : `People in ${me.teamName ?? "your Team"}. You see and manage your own Team only.`}</p>
      {message && <Notice tone="ok">{message}</Notice>}

      <h2 style={{ fontSize: "1.2rem" }}>Teams</h2>
      {account.loading ? (
        <Loading />
      ) : account.error ? (
        <Failure error={account.error} onRetry={account.reload} />
      ) : teams.length === 0 ? (
        <Empty title="No Teams yet">Teams are optional. Create one to group users and give a Team Admin a Team-scoped view.</Empty>
      ) : (
        <div className="grid cols-3" style={{ marginBlockEnd: 16 }}>
          {teams.map((team) => (
            <article className="card" key={team.teamId}>
              <h3>{team.name}</h3>
              <TeamLock accountId={me.accountId} team={team} editable={caps.manageTeamRestoreLock} onDone={() => (done("The Team Restore Lock was updated."), void reloadMe().catch(() => undefined))} />
              {caps.manageTeams && (
                <button type="button" className="btn btn-ghost btn-sm" aria-label={`Rename ${team.name}`} onClick={() => setRenaming(team)}>
                  Rename
                </button>
              )}
            </article>
          ))}
        </div>
      )}
      {caps.manageTeams && (
        <div className="btn-row" style={{ marginBlockEnd: 28 }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setNewTeam(true)}>
            Create Team
          </button>
        </div>
      )}

      <h2 style={{ fontSize: "1.2rem" }}>People</h2>
      <div className="table-tools">
        <label className="sr-only" htmlFor="member-filter">
          Search people
        </label>
        <input id="member-filter" className="input" type="search" placeholder="Search people" value={filter} onChange={(e) => (setFilter(e.target.value), setSkip(0))} />
        {admin && (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>
            Add user
          </button>
        )}
      </div>

      {members.loading ? (
        <Loading />
      ) : members.error ? (
        <Failure error={members.error} onRetry={members.reload} />
      ) : list.length === 0 ? (
        <Empty title="No people match" />
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Role</th>
                <th scope="col">Team</th>
                <th scope="col">Backup</th>
                <th scope="col">Restore</th>
                <th scope="col">Delete</th>
                <th scope="col" className="num">Devices</th>
                {rowActions && <th scope="col">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {list.map((m) => (
                <tr key={m.userId}>
                  <th scope="row">
                    {m.displayName}
                    <div className="small muted">
                      {m.username} · {m.email}
                    </div>
                  </th>
                  <td>{ROLE_LABEL[m.role] ?? m.role}</td>
                  <td>{m.teamName ?? <span className="muted">-</span>}</td>
                  {[m.backupEnabled, m.restoreEnabled, m.deleteEnabled].map((on, i) => (
                    <td key={i}>
                      <Badge view={on ? { label: "Allowed", tone: "ok" } : { label: "Not allowed", tone: "neutral" }} />
                    </td>
                  ))}
                  <td className="num">{m.deviceCount}</td>
                  {rowActions && (
                    <td>
                      {caps.manageUserRoles && (
                        <button type="button" className="btn btn-ghost btn-sm" aria-label={`Edit ${m.displayName}`} onClick={() => setEdit(m)}>
                          Edit
                        </button>
                      )}
                      {caps.removeMembers && (
                        <button type="button" className="btn btn-ghost btn-sm" aria-label={`Remove ${m.displayName}`} onClick={() => setRemoving(m)}>
                          Remove
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {members.data && <Pager skip={skip} take={MEMBER_PAGE} total={members.data.total} onChange={setSkip} />}
      <p className="small muted" style={{ marginBlockStart: 12 }}>
        Restore permission is independent from backup permission and is off by default for Backup Users.
      </p>
      {caps.viewMembers && !caps.manageUsers && (
        <p className="small" style={{ marginBlockStart: 12 }}>
          {me.teamAdminPurchasingPowerEnabled === null
            ? null
            : me.teamAdminPurchasingPowerEnabled
              ? "Team Admin purchasing is on for this Organization: you may buy and expand storage; what you buy goes to the Organization's shared pool."
              : "Team Admin purchasing is off for this Organization. Ask your Organization Admin to buy or expand storage."}{" "}
          {caps.viewOwnTeamDevices && <Link to="/app/devices">View your Team&apos;s devices</Link>}
        </p>
      )}

      {newTeam && (
        <SimpleNameDialog title="Create Team" label="Team name" onClose={() => setNewTeam(false)} onSave={async (name) => (await api(`/api/v1/accounts/${me.accountId}/organization/teams`, { method: "POST", body: { name } }), done(`Team "${name}" was created.`))} />
      )}
      {renaming && (
        <SimpleNameDialog
          title={`Rename ${renaming.name}`}
          label="Team name"
          initial={renaming.name}
          onClose={() => setRenaming(null)}
          onSave={async (name) => (await api(`/api/v1/accounts/${me.accountId}/organization/teams/${renaming.teamId}`, { method: "PATCH", body: { name } }), done(`The Team is now called "${name}".`))}
        />
      )}
      {removing && <RemoveMemberDialog accountId={me.accountId} member={removing} onClose={() => setRemoving(null)} onRemoved={(text) => done(text)} />}
      {(edit || adding) && <MemberDialog accountId={me.accountId} member={edit} teams={account.data?.teams ?? []} onClose={() => (setEdit(null), setAdding(false))} onSaved={(text) => done(text)} />}
    </>
  );
}

function TeamLock({ accountId, team, editable, onDone }: { accountId: string; team: Account["teams"][number]; editable: boolean; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const toggle = async () => {
    setError(null);
    try {
      await api(`/api/v1/accounts/${accountId}/teams/${team.teamId}/locks`, { method: "PATCH", body: { restoreLockEnabled: !team.restoreLockEnabled } });
      onDone();
    } catch (e) {
      setError(errorText(e, "The lock could not be changed."));
    }
  };
  return (
    <>
      <div className="btn-row" style={{ justifyContent: "space-between" }}>
        <span>Team Restore Lock</span>
        <Badge view={team.restoreLockEnabled ? { label: "Locked", tone: "warn" } : { label: "Unlocked", tone: "neutral" }} />
      </div>
      {editable && (
        <button type="button" className="btn btn-ghost btn-sm" style={{ marginBlockStart: 10 }} onClick={() => void toggle()}>
          {team.restoreLockEnabled ? "Unlock restore for this Team" : "Lock restore for this Team"}
        </button>
      )}
      {error && <p className="error small">{error}</p>}
    </>
  );
}

function SimpleNameDialog({ title, label, initial = "", onClose, onSave }: { title: string; label: string; initial?: string; onClose: () => void; onSave: (name: string) => Promise<unknown> }) {
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Dialog title={title} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await onSave(name.trim());
            onClose();
          } catch (err) {
            setError(errorText(err, "This could not be saved."));
          } finally {
            setBusy(false);
          }
        }}
      >
        {error && <Notice tone="bad">{error}</Notice>}
        <div className="field">
          <label htmlFor="simple-name">{label}</label>
          <input id="simple-name" className="input" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="btn-row">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy || !name.trim()}>
            Save
          </button>
        </div>
      </form>
    </Dialog>
  );
}


/**
 * Stage 13B Part 4: "Remove from Organization" (Organization Admin only; the server authorizes it). States plainly that nothing of the person's
 * backed-up cloud data is deleted and that their devices stay registered, and offers the one choice the server takes: also revoke this person's
 * device credentials (ON by default). The server refuses to remove the last Organization Admin; that refusal is shown here and nothing is
 * reported as removed.
 */
function RemoveMemberDialog({ accountId, member, onClose, onRemoved }: { accountId: string; member: Member; onClose: () => void; onRemoved: (text: string) => void }) {
  const [revoke, setRevoke] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ deviceCredentialsRevoked: boolean; devicesWithRevokedCredentials: number; devicesRetained: number }>(
        `/api/v1/accounts/${accountId}/users/${member.userId}?revokeDeviceCredentials=${revoke}`,
        { method: "DELETE" },
      );
      const devices = result.deviceCredentialsRevoked
        ? ` The credentials of ${result.devicesWithRevokedCredentials} device${result.devicesWithRevokedCredentials === 1 ? "" : "s"} were revoked; the devices stay registered.`
        : " Their devices' credentials were kept.";
      onRemoved(`${member.displayName} was removed from the Organization. Their cloud backups were kept.${devices}`);
      onClose();
    } catch (e) {
      setError(errorText(e, "The person could not be removed."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title={`Remove ${member.displayName} from the Organization`} onClose={onClose}>
      {error && <Notice tone="bad">{error}</Notice>}
      <p>Removing a person ends their access to this Organization at once. It does not delete their backed-up cloud data: their backups are kept and stay available to your administrators for restore.</p>
      <p>Their devices stay registered and are never unregistered or deleted by this.</p>
      <div className="field">
        <label>
          <input type="checkbox" checked={revoke} onChange={(e) => setRevoke(e.target.checked)} /> Also revoke this person&apos;s device credentials
        </label>
        <span className="hint">
          On (recommended): their devices can no longer sign in to Tornova, so they stop backing up. Off: their devices keep backing up in the background, but they have no access to this Organization.
        </span>
      </div>
      <div className="btn-row">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-danger" disabled={busy} onClick={() => void remove()}>
          Remove from Organization
        </button>
      </div>
    </Dialog>
  );
}

function MemberDialog({ accountId, member, teams, onClose, onSaved }: { accountId: string; member: Member | null; teams: Account["teams"]; onClose: () => void; onSaved: (text: string) => void }) {
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<CustomerRole>(member?.role ?? "BackupUser");
  const [teamId, setTeamId] = useState(member?.teamId ?? "");
  const [backup, setBackup] = useState(member?.backupEnabled ?? true);
  const [restore, setRestore] = useState(member?.restoreEnabled ?? false);
  const [del, setDel] = useState(member?.deleteEnabled ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const body = { role: ROLE_VALUE[role], teamId: teamId || null, backupEnabled: backup, restoreEnabled: restore, deleteEnabled: del };
    try {
      if (member) await api(`/api/v1/accounts/${accountId}/users/${member.userId}/role`, { method: "PATCH", body });
      else await api(`/api/v1/accounts/${accountId}/users`, { method: "POST", body: { username: username.trim(), ...body } });
      onSaved(member ? `${member.displayName} was updated.` : `${username.trim()} was added to the Organization.`);
      onClose();
    } catch (e) {
      setError(errorText(e, "The user could not be saved."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title={member ? `Edit ${member.displayName}` : "Add a user"} onClose={onClose}>
      <form onSubmit={save}>
        {error && <Notice tone="bad">{error}</Notice>}
        {!member && (
          <div className="field">
            <label htmlFor="m-user">Tornova username</label>
            <input id="m-user" className="input" required value={username} onChange={(e) => setUsername(e.target.value)} />
            <span className="hint">The person must already have a Tornova sign-in.</span>
          </div>
        )}
        <div className="field">
          <label htmlFor="m-role">Role</label>
          <select id="m-role" className="select" value={role} onChange={(e) => setRole(e.target.value as CustomerRole)}>
            <option value="BackupUser">Backup User</option>
            <option value="TeamAdmin">Team Admin</option>
            <option value="OrganizationAdmin">Organization Admin</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="m-team">Team {role === "TeamAdmin" ? "(required for a Team Admin)" : "(optional)"}</label>
          <select id="m-team" className="select" value={teamId} onChange={(e) => setTeamId(e.target.value)} required={role === "TeamAdmin"}>
            <option value="">No Team</option>
            {teams.map((t) => (
              <option key={t.teamId} value={t.teamId}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <fieldset style={{ border: 0, padding: 0, margin: "0 0 12px" }}>
          <legend style={{ fontWeight: 600 }}>Permissions</legend>
          {(
            [
              ["Backup", backup, setBackup],
              ["Restore (independent from backup)", restore, setRestore],
              ["Delete backed-up data", del, setDel],
            ] as Array<[string, boolean, (v: boolean) => void]>
          ).map(([label, value, set]) => (
            <label key={label} style={{ display: "flex", gap: 8, alignItems: "center", marginBlockStart: 8 }}>
              <input type="checkbox" checked={value} onChange={(e) => set(e.target.checked)} /> {label}
            </label>
          ))}
        </fieldset>
        <div className="btn-row">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------- Storage
interface Quota {
  totalBytes: number;
  usedBytes: number;
  reservedBytes: number;
  availableBytes: number;
}

interface Subscription {
  subscriptionId: string;
  planId: string;
  planName: string;
  status: string;
  currency: string;
  userCount: number;
  storageBytes: number;
  startAtUtc: string;
  endAtUtc: string;
  graceEndsAtUtc: string | null;
  pendingPlanId: string | null;
  backupAllowed: boolean;
}

/** A missing subscription is a normal state (404), not a failure. */
function useSubscription(enabled: boolean): Loaded<Subscription> & { none: boolean } {
  const result = useApi<Subscription>(enabled ? "/api/v1/subscriptions/current" : null);
  const none = result.error instanceof ApiError && result.error.kind === "notFound";
  return { ...result, error: none ? null : result.error, none };
}

export function Storage() {
  const { me } = useAuth();
  const { checkoutEnabled } = useSiteConfig();
  const quota = useApi<Quota>(me ? `/api/v1/quota/${me.accountId}` : null);
  const subscription = useSubscription(Boolean(me && me.capabilities.viewBilling));
  if (!me) return null;

  const percent = quota.data && quota.data.totalBytes > 0 ? Math.min(100, (quota.data.usedBytes / quota.data.totalBytes) * 100) : 0;
  const warning = quota.data ? quotaWarning(quota.data.usedBytes, quota.data.totalBytes) : null;

  return (
    <>
      <h1>Storage</h1>
      <p className="sub">{me.accountType === "Business" ? "Your Organization shares one storage pool." : "Storage belongs to your account, not to a single device."}</p>

      <div className="grid cols-2">
        <section className="card">
          <h2 style={{ fontSize: "1.2rem" }}>Backup Storage</h2>
          {quota.loading ? (
            <Loading />
          ) : quota.error instanceof ApiError && quota.error.code === "QuotaNotProvisioned" ? (
            // Stage 14 (S13B-FT3): an account that never received a plan has no quota row at all, so the
            // server answers 409 rather than a zero-valued 200 - the SAME "choose a plan" empty state as
            // the zero-provisioned case below, not the generic "this could not be loaded" failure state
            // (retrying can never fix "no plan yet", so Failure's Retry button would be actively misleading).
            <Empty title="No storage plan yet" action={me.capabilities.viewBilling ? <Link className="btn btn-secondary btn-sm" to="/app/billing">{checkoutEnabled ? "Choose a plan" : "View plans"}</Link> : undefined} />
          ) : quota.error ? (
            <Failure error={quota.error} onRetry={quota.reload} />
          ) : quota.data!.totalBytes <= 0 ? (
            <Empty title="No storage plan yet" action={me.capabilities.viewBilling ? <Link className="btn btn-secondary btn-sm" to="/app/billing">{checkoutEnabled ? "Choose a plan" : "View plans"}</Link> : undefined} />
          ) : (
            <>
              {warning && <Notice tone={warning.tone === "bad" ? "bad" : "warn"} title={warning.label}>{warning.detail}</Notice>}
              <div className={`meter${warning ? ` ${warning.tone}` : ""}`} role="img" aria-label={`${percent.toFixed(0)} percent of backup storage used`}>
                <span style={{ width: `${percent}%` }} />
              </div>
              <dl className="kv" style={{ marginBlockStart: 14 }}>
                <dt>Used</dt>
                <dd>
                  {formatBytes(quota.data!.usedBytes)} of {formatBytes(quota.data!.totalBytes)} ({percent.toFixed(1)}%)
                </dd>
                <dt>Reserved by running backups</dt>
                <dd>{formatBytes(quota.data!.reservedBytes)}</dd>
                <dt>Available</dt>
                <dd>{formatBytes(quota.data!.availableBytes)}</dd>
              </dl>
              <p className="small muted">You are warned at 90% and 95%. At 100%, new backups stop until storage is freed or expanded. Existing backups are never deleted to make room.</p>
            </>
          )}
        </section>

        <section className="card">
          <h2 style={{ fontSize: "1.2rem" }}>Included Restore Allowance</h2>
          {!me.capabilities.viewBilling ? (
            <p className="muted">Your plan includes a restore allowance equal to its backup storage. Your Organization Admin can see the plan details.</p>
          ) : subscription.loading ? (
            <Loading />
          ) : subscription.error ? (
            <Failure error={subscription.error} onRetry={subscription.reload} />
          ) : subscription.none || !subscription.data ? (
            <p className="muted">Every Tornova plan includes a restore allowance equal to its backup storage.</p>
          ) : (
            <>
              <p style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--navy)", marginBlockEnd: 4 }}>{formatBytes(subscription.data.storageBytes)}</p>
              <p className="muted">Included with your plan: equal to your backup storage.</p>
              {/* VG decision C3: the included amount only. No used/remaining figure
                  exists in Tornova yet, so none is shown. */}
              <Notice tone="info">Restore usage is not measured yet, so no used or remaining amount is shown here.</Notice>
            </>
          )}
        </section>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- Security
export function Security() {
  const { me, reloadMe } = useAuth();
  const { control } = useOutletContext<{ control: Loaded<ControlState> }>();
  const account = useApi<Account>(me ? `/api/v1/accounts/${me.accountId}` : null);
  const [stopping, setStopping] = useState(false);
  const [resumingStop, setResumingStop] = useState(false);
  const [mfa, setMfa] = useState<"enrol" | "disable" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  if (!me) return null;
  const business = me.accountType === "Business";

  const setLock = async (body: Record<string, boolean>) => {
    setMessage(null);
    try {
      await api(`/api/v1/accounts/${me.accountId}/locks`, { method: "PATCH", body });
      setMessage("The Master Lock was updated.");
      account.reload();
      await reloadMe().catch(() => undefined); // the lock decides this person's own restore answer: show the server's new one now, not after a reload (a failed refresh is not a failed lock change)
    } catch (e) {
      setMessage(errorText(e, "The lock could not be changed."));
    }
  };

  return (
    <>
      <h1>Security</h1>
      <p className="sub">How this account is protected.</p>
      {message && <Notice tone="info">{message}</Notice>}

      <div className="grid cols-2">
        <section className="card">
          <h2 style={{ fontSize: "1.2rem" }}>Account type</h2>
          <Badge view={{ label: me.clientSideEncryptionEnabled ? "Client-Side Double-Layer Encryption" : "Standard Secure Account", tone: "info" }} />
          <p className="muted small" style={{ marginBlockStart: 10 }}>
            {me.clientSideEncryptionEnabled
              ? "An additional client-side encryption layer is applied. This is a permanent choice: a CSE account cannot become a Standard Secure Account. Restore and download happen through the Windows Agent only."
              : "Encrypted in transit and at rest, with role-based access and secure restore. The account type is chosen when the account is created and is not switchable here."}
          </p>
        </section>

        <section className="card">
          <h2 style={{ fontSize: "1.2rem" }}>Multi-factor authentication</h2>
          <Badge view={me.mfaEnabled ? { label: "On", tone: "ok" } : { label: "Off (optional)", tone: "neutral" }} />
          <p className="muted small" style={{ marginBlockStart: 10 }}>When MFA is on, signing in and restoring need a code from your authenticator app. Routine background backup does not.</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setMfa(me.mfaEnabled ? "disable" : "enrol")}>
            {me.mfaEnabled ? "Turn off MFA" : "Set up MFA"}
          </button>
        </section>

        {business && (
          <section className="card">
            <h2 style={{ fontSize: "1.2rem" }}>Master Locks</h2>
            {account.loading ? (
              <Loading />
            ) : account.error ? (
              <Failure error={account.error} onRetry={account.reload} />
            ) : (
              <dl className="kv">
                <dt>Organization Restore Lock</dt>
                <dd>
                  <Badge view={account.data!.masterRestoreLockEnabled ? { label: "Locked", tone: "warn" } : { label: "Unlocked", tone: "neutral" }} />{" "}
                  {me.capabilities.manageMasterLocks && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => void setLock({ masterRestoreLockEnabled: !account.data!.masterRestoreLockEnabled })}>
                      {account.data!.masterRestoreLockEnabled ? "Unlock" : "Lock"}
                    </button>
                  )}
                </dd>
                <dt>Organization Backup Lock</dt>
                <dd>
                  <Badge view={account.data!.masterBackupLockEnabled ? { label: "Locked", tone: "warn" } : { label: "Unlocked", tone: "neutral" }} />{" "}
                  {me.capabilities.manageMasterLocks && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => void setLock({ masterBackupLockEnabled: !account.data!.masterBackupLockEnabled })}>
                      {account.data!.masterBackupLockEnabled ? "Unlock" : "Lock"}
                    </button>
                  )}
                </dd>
              </dl>
            )}
            <p className="muted small">Restore needs every gate to allow it: the Organization lock, the Team lock and the user's own restore permission.</p>
          </section>
        )}

        <section className="card">
          <h2 style={{ fontSize: "1.2rem" }}>Your permissions</h2>
          <dl className="kv">
            <dt>Backup</dt>
            <dd>{me.capabilities.backup ? "Allowed" : "Not allowed"}</dd>
            <dt>Restore</dt>
            <dd>{me.capabilities.restore ? "Allowed" : `Not allowed${me.capabilities.restoreBlockedBy ? ` - ${gateReason(me.capabilities.restoreBlockedBy)}` : ""}`}</dd>
            <dt>Delete backed-up data</dt>
            <dd>{me.capabilities.deleteData ? "Allowed" : "Not allowed"}</dd>
          </dl>
        </section>
      </div>

      {business && (
        <section className="card" style={{ marginBlockStart: 20, borderInlineStart: "6px solid var(--bad)" }}>
          <h2 style={{ fontSize: "1.2rem" }}>Emergency Stop</h2>
          {control.loading ? (
            <Loading />
          ) : control.error ? (
            <Failure error={control.error} onRetry={control.reload} />
          ) : (
            <>
              <Badge view={control.data!.emergencyStopActive ? { label: "ACTIVE - backups are stopped", tone: "bad" } : { label: "Not active", tone: "neutral" }} />
              {control.data!.emergencyStopActive && (
                <p style={{ marginBlockStart: 10 }}>
                  Since {formatDateTime(control.data!.changedAtUtc)}
                  {control.data!.reason ? ` - ${control.data!.reason}` : ""}.
                </p>
              )}
              <p className="muted small" style={{ marginBlockStart: 10 }}>
                Stops backup activity across the whole Organization. Devices notice within about a minute, short-lived storage access expires within 15 minutes, and backups never restart by themselves.
              </p>
              {(control.data!.emergencyStopActive ? me.capabilities.resumeEmergencyStop : me.capabilities.triggerEmergencyStop) && control.data!.callerMayControl ? (
                control.data!.emergencyStopActive ? (
                  <button type="button" className="btn btn-secondary" onClick={() => setResumingStop(true)}>
                    Resume backups
                  </button>
                ) : (
                  <button type="button" className="btn btn-danger" onClick={() => setStopping(true)}>
                    Trigger Emergency Stop…
                  </button>
                )
              ) : (
                <p className="small">Only your Organization Admin can trigger or resume Emergency Stop.</p>
              )}
            </>
          )}
        </section>
      )}

      {stopping && (
        <ConfirmDialog
          title="Trigger Emergency Stop"
          danger
          body={
            <>
              <p>
                <strong>Every device in your Organization will stop backing up.</strong> New backups are refused and running backups halt within about a minute.
              </p>
              <p>Existing backups are not touched and restore rules are unchanged. Backups stay stopped until an Organization Admin resumes them manually.</p>
            </>
          }
          requireReason
          typeToConfirm="STOP"
          confirmLabel="Stop all backups"
          onClose={() => setStopping(false)}
          onConfirm={async (reason) => {
            await api("/api/v1/dashboard/emergency-stop", { method: "POST", body: { reason } });
            control.reload();
          }}
        />
      )}
      {resumingStop && (
        <ConfirmDialog
          title="Resume backups"
          body={<p>Backups never restart by themselves. Resuming allows devices to back up again at their next schedule. Resume only when the incident is resolved.</p>}
          confirmLabel="Resume backups"
          requireReason
          onClose={() => setResumingStop(false)}
          onConfirm={async (reason) => {
            await api("/api/v1/dashboard/emergency-stop/resume", { method: "POST", body: { reason } });
            control.reload();
          }}
        />
      )}
      {mfa && <MfaDialog mode={mfa} onClose={() => setMfa(null)} onDone={(text) => (setMessage(text), void reloadMe())} />}
    </>
  );
}

function MfaDialog({ mode, onClose, onDone }: { mode: "enrol" | "disable"; onClose: () => void; onDone: (text: string) => void }) {
  const [secret, setSecret] = useState<{ base32Secret: string; otpAuthUri: string } | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guard = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(errorText(e, "This could not be completed."));
    } finally {
      setBusy(false);
    }
  };

  if (codes) {
    return (
      <Dialog title="Save your recovery codes" onClose={onClose}>
        <Notice tone="warn" title="These codes are shown once">
          Keep them somewhere safe. Each code can be used once if you lose your authenticator.
        </Notice>
        <pre className="card" style={{ fontSize: "1rem" }}>{codes.join("\n")}</pre>
        <div className="btn-row">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            I have saved them
          </button>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog title={mode === "enrol" ? "Set up MFA" : "Turn off MFA"} onClose={onClose}>
      {error && <Notice tone="bad">{error}</Notice>}
      {mode === "disable" ? (
        <form onSubmit={(e) => (e.preventDefault(), guard(async () => (await api("/api/v1/auth/mfa/disable", { method: "POST", body: { currentPassword: password } }), onDone("MFA was turned off."), onClose())))}>
          <div className="field">
            <label htmlFor="mfa-pass">Current password</label>
            <input id="mfa-pass" type="password" className="input" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-danger" disabled={busy || !password}>
              Turn off MFA
            </button>
          </div>
        </form>
      ) : !secret ? (
        <>
          <p>You will need an authenticator app on your phone.</p>
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => guard(async () => setSecret(await api("/api/v1/auth/mfa/enrol", { method: "POST" })))}>
              Start
            </button>
          </div>
        </>
      ) : (
        <form
          onSubmit={(e) => (
            e.preventDefault(),
            guard(async () => {
              const result = await api<{ enabled: boolean; recoveryCodes: string[] | null }>("/api/v1/auth/mfa/verify", { method: "POST", body: { code: code.trim() } });
              if (!result.enabled) throw new ApiError("validation", 400, null, "That code was not accepted. Try the next code from your app.");
              onDone("MFA is now on.");
              setCodes(result.recoveryCodes ?? []);
            })
          )}
        >
          <p className="small">Add this key to your authenticator app, then enter the 6-digit code it shows.</p>
          <pre className="card" style={{ wordBreak: "break-all", whiteSpace: "pre-wrap" }}>{secret.base32Secret}</pre>
          <div className="field">
            <label htmlFor="mfa-code">6-digit code</label>
            <input id="mfa-code" className="input" inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy || code.trim().length < 6}>
              Turn on MFA
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

// ---------------------------------------------------------------- Billing
interface CatalogItem {
  planId: string;
  name: string;
  storageBytes: number;
  durationMonths: number;
  isTrial: boolean;
  trialDurationDays: number | null;
  currency: string;
  price: number;
}

interface CheckoutOrder {
  orderId: string;
  currency: string;
  userCount: number;
  standardAmount: number;
  discountPercent: number;
  totalPayable: number;
  gatewayName: string;
}


export function Billing() {
  const { me, reloadMe } = useAuth();
  // VG 2026-09-19: checkout stays closed until Stage 14 finishes the gateways,
  // India pricing and tax. The server decides (Site:CheckoutEnabled, default false).
  const { checkoutEnabled } = useSiteConfig();
  const subscription = useSubscription(true);
  const plans = useApi<CatalogItem[]>("/api/v1/plans");
  const history = useApi<Array<{ eventType: string; occurredAtUtc: string; notes: string | null }>>(subscription.data ? `/api/v1/subscriptions/${subscription.data.subscriptionId}/history` : null);
  const [order, setOrder] = useState<CheckoutOrder | null>(null);
  const [users, setUsers] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const intent = readIntent();
  if (!me) return null;
  const business = me.accountType === "Business";
  const userCount = /^\d{1,6}$/.test(users) && Number(users) >= 1 ? Number(users) : null;

  const buy = async (plan: CatalogItem) => {
    setError(null);
    try {
      // The SERVER prices the order from its own catalog. The browser sends only
      // which plan and how many users - never an amount.
      setOrder(await api<CheckoutOrder>("/api/v1/subscriptions", { method: "POST", body: { planId: plan.planId, userCount: business ? userCount : null } }));
      clearIntent();
    } catch (e) {
      setError(errorText(e, "The order could not be created."));
    }
  };

  const cancelDowngrade = async () => {
    if (!subscription.data) return;
    setError(null);
    try {
      await api(`/api/v1/subscriptions/${subscription.data.subscriptionId}/downgrade`, { method: "DELETE" });
      setMessage("The scheduled downgrade was cancelled.");
      subscription.reload();
    } catch (e) {
      setError(errorText(e, "The scheduled downgrade could not be cancelled."));
    }
  };

  const setPurchasingPower = async (enabled: boolean) => {
    try {
      await api("/api/v1/organization/purchasing-power", { method: "PATCH", body: { enabled } });
    } catch (e) {
      setError(errorText(e, "The setting could not be changed."));
      return;
    }

    // The server has committed the change. Refreshing what this page shows is a separate step: if THAT fails the change is still saved, so it is
    // reported as saved (the page catches up on the next reload or refused request) and never rewritten into "could not be changed".
    setError(null);
    setMessage(`Team Admin purchasing power is now ${enabled ? "on" : "off"}.`);
    await reloadMe().catch(() => undefined);
  };

  return (
    <>
      <h1>Billing</h1>
      <p className="sub">Your plan and subscription. Amounts are shown in the currency of the storefront your account belongs to.</p>
      <Notice tone="warn" title="Checkout is not open to customers yet">
        Payments on TornovaBackup.com (US dollars) will be taken through PayPal, and on in.TornovaBackup.com (Indian rupees) through Razorpay, including UPI and Scan &amp; Pay. Neither is live yet. Until they are, plans are shown for information and cannot be selected. No plan is ever activated without a payment confirmed by the provider.
      </Notice>
      {message && <Notice tone="ok">{message}</Notice>}
      {error && <Notice tone="bad">{error}</Notice>}

      <section className="card" style={{ marginBlockEnd: 20 }}>
        <h2 style={{ fontSize: "1.2rem" }}>Current subscription</h2>
        {subscription.loading ? (
          <Loading />
        ) : subscription.error ? (
          <Failure error={subscription.error} onRetry={subscription.reload} />
        ) : subscription.none || !subscription.data ? (
          <p className="muted">{checkoutEnabled ? "This account has no subscription yet. Choose a plan or a trial below." : "This account has no subscription yet. Plans are listed below for information; purchasing is not open yet."}</p>
        ) : (
          <>
            <dl className="kv">
              <dt>Plan</dt>
              <dd>{subscription.data.planName}</dd>
              <dt>Status</dt>
              <dd>
                <Badge view={subscription.data.backupAllowed ? { label: subscription.data.status, tone: subscription.data.graceEndsAtUtc ? "warn" : "ok" } : { label: `${subscription.data.status} - new backups are blocked`, tone: "bad" }} />
              </dd>
              <dt>Backup storage</dt>
              <dd>
                {formatBytes(subscription.data.storageBytes)}
                {business ? ` for ${subscription.data.userCount} user${subscription.data.userCount === 1 ? "" : "s"}` : ""}
              </dd>
              <dt>Included restore allowance</dt>
              <dd>{formatBytes(subscription.data.storageBytes)} (equal to backup storage)</dd>
              <dt>Current term</dt>
              <dd>
                {formatDateTime(subscription.data.startAtUtc)} to {formatDateTime(subscription.data.endAtUtc)}
              </dd>
              {subscription.data.graceEndsAtUtc && (
                <>
                  <dt>Grace period ends</dt>
                  <dd>{formatDateTime(subscription.data.graceEndsAtUtc)}</dd>
                </>
              )}
            </dl>
            {subscription.data.pendingPlanId && (
              <Notice
                tone="info"
                title="A downgrade is scheduled"
                action={
                  me.capabilities.manageSubscription ? (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => void cancelDowngrade()}>
                      Cancel scheduled downgrade
                    </button>
                  ) : undefined
                }
              >
                The plan will change to a smaller one at the end of the current term. {me.capabilities.manageSubscription ? "You can cancel it before then." : "Your Organization Admin can change or cancel it."}
              </Notice>
            )}
            <p className="small muted">Subscriptions never renew automatically. After a term ends there is a grace period; after it, new backups stop while your data and restore remain available.</p>
          </>
        )}
      </section>

      {business && me.capabilities.modifyPurchasingPower && me.teamAdminPurchasingPowerEnabled !== null && (
        <section className="card" style={{ marginBlockEnd: 20 }}>
          <h2 style={{ fontSize: "1.2rem" }}>Team Admin purchasing power</h2>
          <p className="muted small">When on, Team Admins may purchase users and capacity; what they buy goes to the Organization's shared pool.</p>
          <div className="btn-row">
            <Badge view={me.teamAdminPurchasingPowerEnabled ? { label: "On", tone: "ok" } : { label: "Off", tone: "neutral" }} />
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void setPurchasingPower(!me.teamAdminPurchasingPowerEnabled)}>
              Turn {me.teamAdminPurchasingPowerEnabled ? "off" : "on"}
            </button>
          </div>
        </section>
      )}

      <h2 style={{ fontSize: "1.2rem" }}>Plans</h2>
      {intent && (intent.storage || intent.trial) && <Notice tone="info">You chose {intent.trial ? `the ${intent.trial} trial` : intent.storage} on the website. {checkoutEnabled ? "Select it below to continue." : "Checkout is not open yet, so it cannot be selected for now."}</Notice>}
      {!me.capabilities.purchaseSubscription && (
        <Notice tone="info">Team Admin purchasing is turned off for your Organization. Ask your Organization Admin to buy or expand storage.</Notice>
      )}
      {business && me.capabilities.purchaseSubscription && (
        <div className="field" style={{ maxWidth: 240 }}>
          <label htmlFor="bill-users">Number of users</label>
          <input id="bill-users" className="input" inputMode="numeric" value={users} onChange={(e) => setUsers(e.target.value.trim())} aria-invalid={userCount === null} />
        </div>
      )}
      {plans.loading ? (
        <Loading />
      ) : plans.error ? (
        <Failure error={plans.error} onRetry={plans.reload} />
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th scope="col">Plan</th>
                <th scope="col">Backup storage</th>
                <th scope="col">Duration</th>
                <th scope="col" className="num">Price{business ? " per user" : ""}</th>
                {me.capabilities.purchaseSubscription && (
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {plans.data!.map((plan) => (
                <tr key={plan.planId}>
                  <th scope="row">{plan.isTrial ? "Trial" : plan.name}</th>
                  <td>{formatBytes(plan.storageBytes)}</td>
                  <td>{plan.isTrial ? `${plan.trialDurationDays} days, no auto-renewal` : plan.durationMonths === 12 ? "1 year" : plan.durationMonths === 1 ? "Monthly" : `${plan.durationMonths} months`}</td>
                  <td className="num">{formatMoney(plan.price, plan.currency)}</td>
                  {me.capabilities.purchaseSubscription && (
                    <td>
                      <button type="button" className="btn btn-secondary btn-sm" disabled={!checkoutEnabled || (business && userCount === null)} title={checkoutEnabled ? undefined : "Checkout is not open yet"} onClick={() => void buy(plan)}>
                        Select
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {subscription.data && (
        <>
          <h2 style={{ fontSize: "1.2rem", marginBlockStart: 28 }}>Subscription history</h2>
          {history.loading ? (
            <Loading />
          ) : history.error ? (
            <Failure error={history.error} onRetry={history.reload} />
          ) : !history.data ? (
            <Loading /> // the history request has not started yet (its address only exists once the subscription has loaded)
          ) : history.data.length === 0 ? (
            <Empty title="No history yet" />
          ) : (
            <div className="table-wrap">
              <table className="data">
                <tbody>
                  {history.data!.map((h, i) => (
                    <tr key={i}>
                      <td>{formatDateTime(h.occurredAtUtc)}</td>
                      <td>{h.eventType}</td>
                      <td className="muted">{h.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      <p className="small muted" style={{ marginBlockStart: 16 }}>Invoices and payment history are not available yet.</p>

      {order && <OrderDialog order={order} onClose={() => (setOrder(null), subscription.reload())} />}
    </>
  );
}

function OrderDialog({ order, onClose }: { order: CheckoutOrder; onClose: () => void }) {
  const status = useApi<{ status: string; paidAtUtc: string | null }>(`/api/v1/billing/orders/${order.orderId}`);
  const paid = status.data?.status === "Paid";
  return (
    <Dialog title="Your order" onClose={onClose}>
      <dl className="kv">
        {order.userCount > 1 && (
          <>
            <dt>Users</dt>
            <dd>{order.userCount}</dd>
            <dt>Standard price</dt>
            <dd>{formatMoney(order.standardAmount, order.currency)}</dd>
            <dt>Organization discount</dt>
            <dd>{order.discountPercent}%</dd>
          </>
        )}
        <dt>Total</dt>
        <dd>{formatMoney(order.totalPayable, order.currency)}</dd>
        <dt>Payment status</dt>
        <dd>{status.loading ? "Checking…" : status.error ? "Could not be checked" : <Badge view={paid ? { label: "Paid - confirmed by the payment provider", tone: "ok" } : { label: status.data!.status === "Created" ? "Awaiting payment" : status.data!.status, tone: "neutral" }} />}</dd>
      </dl>
      {/* Payment success is shown ONLY when the server reports a verified payment. */}
      {!paid && <Notice tone="info">This order was priced by Tornova's server. Your plan is activated only after the payment provider confirms payment to Tornova - never from this page.</Notice>}
      <div className="btn-row">
        <button type="button" className="btn btn-ghost" onClick={status.reload}>
          Check status again
        </button>
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Close
        </button>
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------- Notifications
/** Codex Review-01, P2-4: severity is decided by the SERVER from the outcome the event
 *  records. An ordinary successful backup is never shown as Critical. Exported for tests. */
export function severityTone(severity: string): "info" | "warn" | "bad" {
  return severity === "Critical" ? "bad" : severity === "Information" ? "info" : "warn";
}

export function Notifications() {
  const { me } = useAuth();
  const manages = me ? me.capabilities.manageNotificationPreferences : false;
  const list = useApi<Array<{ id: string; severity: string; title: string; message: string; createdAtUtc: string }>>("/api/v1/notifications");
  // Account-wide email preference: Organization Admin, or the owner of a Personal account (P1-3).
  const prefs = useApi<{ backupReportEmailEnabled: boolean }>(manages ? "/api/v1/notifications/preferences" : null);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    setError(null);
    try {
      await api("/api/v1/notifications/preferences", { method: "PATCH", body: { backupReportEmailEnabled: !prefs.data!.backupReportEmailEnabled } });
      prefs.reload();
    } catch (e) {
      setError(errorText(e, "The preference could not be saved."));
    }
  };

  const LABEL = { info: "Information", warn: "Warning", bad: "Critical" } as const;

  return (
    <>
      <h1>Notifications</h1>
      <p className="sub">Things Tornova wants you to know, most recent first.</p>
      {error && <Notice tone="bad">{error}</Notice>}

      {manages && (
      <section className="card" style={{ marginBlockEnd: 20 }}>
        <h2 style={{ fontSize: "1.1rem" }}>Email preferences</h2>
        {prefs.loading ? (
          <Loading />
        ) : prefs.error ? (
          <Failure error={prefs.error} onRetry={prefs.reload} />
        ) : (
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={prefs.data!.backupReportEmailEnabled} onChange={() => void toggle()} /> Send backup report emails for this account
          </label>
        )}
      </section>
      )}

      {list.loading ? (
        <Loading />
      ) : list.error ? (
        <Failure error={list.error} onRetry={list.reload} />
      ) : list.data!.length === 0 ? (
        <Empty title="No notifications" />
      ) : (
        <div className="grid">
          {list.data!.map((n) => (
            <article className="card" key={n.id}>
              <div className="btn-row" style={{ justifyContent: "space-between" }}>
                <h3 style={{ margin: 0 }}>{n.title}</h3>
                <Badge view={{ label: LABEL[severityTone(n.severity)], tone: severityTone(n.severity) }} />
              </div>
              <p style={{ marginBlock: 8 }}>{n.message}</p>
              <span className="small muted">{formatDateTime(n.createdAtUtc)}</span>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------- Settings & Support
export function Settings() {
  const { me } = useAuth();
  if (!me) return null;
  return (
    <>
      <h1>Settings</h1>
      <p className="sub">Your sign-in and account details.</p>
      <section className="card">
        <dl className="kv">
          <dt>Name</dt>
          <dd>{me.displayName}</dd>
          <dt>Username</dt>
          <dd>{me.username}</dd>
          <dt>Email</dt>
          <dd>{me.email}</dd>
          <dt>Account</dt>
          <dd>
            {me.accountName ?? (me.accountType === "Business" ? "Organization" : "Personal account")} · {ROLE_LABEL[me.role]}
          </dd>
          {me.teamName && (
            <>
              <dt>Team</dt>
              <dd>{me.teamName}</dd>
            </>
          )}
        </dl>
        <div className="btn-row" style={{ marginBlockStart: 16 }}>
          <Link className="btn btn-secondary btn-sm" to="/forgot-password">
            Change password
          </Link>
          <Link className="btn btn-secondary btn-sm" to="/app/security">
            Security & MFA
          </Link>
        </div>
      </section>
      <p className="small muted" style={{ marginBlockStart: 16 }}>
        Closing a Tornova account is not available from the dashboard yet. It will be offered together with Tornova's 3-day deletion grace period. Contact <a href="mailto:support@tornovabackup.com">support@tornovabackup.com</a> if you need help.
      </p>
    </>
  );
}

export function SupportApp() {
  return (
    <>
      <h1>Support</h1>
      <p className="sub">Help with your account, backup, restore, the Windows Agent, billing or your Organization.</p>
      <div className="grid cols-3">
        <article className="card">
          <h3>Find an answer</h3>
          <p className="muted small">Clear answers, including what happens when something goes wrong.</p>
          <Link to="/faq">Open the FAQ</Link>
        </article>
        <article className="card">
          <h3>Contact Support</h3>
          <p>
            <a href="mailto:support@tornovabackup.com">support@tornovabackup.com</a>
          </p>
          <p className="muted small">Include your account email, the device name, what happened and roughly when.</p>
        </article>
        <article className="card">
          <h3>Send Feedback</h3>
          <p className="muted small">Suggestions, feature ideas or a problem report.</p>
          <Link to="/feedback">Send Feedback</Link>
        </article>
      </div>
      <Notice tone="warn" title="Never send us secrets">
        Tornova Support will never ask for your password, MFA codes, device credentials or encryption keys.
      </Notice>
    </>
  );
}
