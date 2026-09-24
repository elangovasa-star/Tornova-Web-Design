import { useMemo, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { Badge, ConfirmDialog, Dialog, Empty, Failure, Loading, Notice, Pager, formatDateTime } from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { backupResult, connectionStatus, formatBytes, quotaWarning, summarizeHealth } from "../../lib/status";
import { useApi, type Loaded } from "../../lib/useApi";
import type { ControlState } from "../AppShell";
import { DeviceExclusionsDialog } from "./DeviceExclusions";
import { DEVICE_PAGE_SIZE, DEVICE_WALK_LIMIT, devicePagePath, useAllDevices, type DevicePage } from "../../lib/useDevices";

export interface Session {
  sessionId: string;
  deviceId: string;
  deviceName: string;
  status: string;
  outcomeReason: string;
  filesScanned: number;
  filesUploaded: number;
  filesSkipped: number;
  errorCount: number;
  actualBytes: number;
  startedAtUtc: string;
  endedAtUtc: string | null;
}

export interface Device {
  deviceId: string;
  name: string;
  operatingSystem: string | null;
  agentVersion: string | null;
  status: string;
  ownerUserId: string | null;
  ownerDisplayName: string | null;
  registeredAtUtc: string;
  lastSeenAtUtc: string | null;
  lastSession: Session | null;
  /** Stage 11: a device has ONE backup set; this is its id, or null while it has none. */
  backupSetId?: string | null;
  /** Stage 13B: the recorded owner is no longer a member of this Organization. The device stays registered and its backups stay. */
  ownerRemoved?: boolean;
}

interface Page<T> {
  items: T[];
  total: number;
  skip: number;
  take: number;
}

interface Quota {
  totalBytes: number;
  usedBytes: number;
  reservedBytes: number;
  availableBytes: number;
}


/** One labelled figure of the Organization or Team overview. */
function OverviewTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card stat">
      <span className="n">{value}</span>
      <span className="l">{label}</span>
      {hint && <span className="small muted">{hint}</span>}
    </div>
  );
}

/**
 * Stage 13B Part 4: the Organization overview for whoever the server says may see their people (an Organization Admin: the whole Organization;
 * a Team Admin: their own Team). Every figure is read from an API that already exists (account, people, devices, quota, subscription, control
 * state); nothing is calculated here except counting the Teams the account endpoint returned. A figure the server could not give is shown as
 * "Unavailable", never as zero. A Team Admin's view is Team-scoped by the same endpoints (the server scopes people and devices), and shows no
 * Organization-wide lock or Team count.
 */
function OrganizationOverview() {
  const { me } = useAuth();
  const { control } = useOutletContext<{ control: Loaded<ControlState> }>();
  const wholeOrganization = me?.capabilities.viewOrganizationDevices === true;
  const account = useApi<{ masterRestoreLockEnabled: boolean; teams: Array<{ teamId: string; restoreLockEnabled: boolean }> }>(me ? `/api/v1/accounts/${me.accountId}` : null);
  const members = useApi<{ total: number }>("/api/v1/dashboard/members?take=1");
  const devices = useApi<{ total: number }>("/api/v1/dashboard/devices?take=1&status=Active");
  const quota = useApi<Quota>(me?.capabilities.viewQuota ? `/api/v1/quota/${me.accountId}` : null);
  const subscription = useApi<{ planName: string; status: string }>(me?.capabilities.viewBilling ? "/api/v1/subscriptions/current" : null);
  if (!me) return null;

  const figure = (state: Loaded<unknown>, value: () => string) => (state.loading ? "..." : state.error ? "Unavailable" : value());
  const noPlan = subscription.error instanceof ApiError && subscription.error.kind === "notFound";
  const teams = account.data?.teams ?? [];
  const stopState = control.loading ? "..." : control.error || !control.data ? "Unavailable" : control.data.emergencyStopActive ? "ACTIVE" : "Not active";
  const title = wholeOrganization ? "Organization overview" : "Team overview";

  return (
    <section aria-label={title} style={{ marginBlockEnd: 24 }}>
      <h2 style={{ fontSize: "1.2rem" }}>{title}</h2>
      <div className="grid cols-4">
        <OverviewTile label={wholeOrganization ? "Members" : "Team members"} value={figure(members, () => String(members.data!.total))} />
        {wholeOrganization && <OverviewTile label="Teams" value={figure(account, () => String(teams.length))} />}
        <OverviewTile label={wholeOrganization ? "Registered devices" : "Team devices"} value={figure(devices, () => String(devices.data!.total))} />
        {me.capabilities.viewBilling && <OverviewTile label="Plan" value={noPlan ? "No plan yet" : figure(subscription, () => subscription.data!.planName)} hint={subscription.data?.status} />}
        {me.capabilities.viewQuota && <OverviewTile label="Storage used" value={figure(quota, () => formatBytes(quota.data!.usedBytes))} hint="Logical backup size, shared by the Organization" />}
        {me.capabilities.viewQuota && <OverviewTile label="Storage remaining" value={figure(quota, () => formatBytes(quota.data!.availableBytes))} />}
        <OverviewTile label="Emergency Stop" value={stopState} />
        {wholeOrganization ? (
          <>
            <OverviewTile label="Organization Restore Lock" value={figure(account, () => (account.data!.masterRestoreLockEnabled ? "Locked" : "Unlocked"))} />
            <OverviewTile label="Teams with a Restore Lock" value={figure(account, () => String(teams.filter((t) => t.restoreLockEnabled).length))} />
          </>
        ) : (
          <>
            <OverviewTile label="Team Restore Lock" value={figure(account, () => (teams[0]?.restoreLockEnabled ? "Locked" : "Unlocked"))} />
            {me.teamAdminPurchasingPowerEnabled !== null && <OverviewTile label="Team Admin purchasing" value={me.teamAdminPurchasingPowerEnabled ? "On" : "Off"} />}
          </>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Overview
export function Overview() {
  const { me } = useAuth();
  const devices = useAllDevices<Device>();
  const quota = useApi<Quota>(me ? `/api/v1/quota/${me.accountId}` : null);
  const recent = useApi<Page<Session>>("/api/v1/dashboard/backup-sessions?take=5");
  const health = useMemo(() => summarizeHealth(devices.data), [devices.data]);

  if (!me) return null;
  const needsAttention = (devices.data ?? []).filter((d) => d.status === "Active" && (backupResult(d.lastSession).tone !== "ok" || connectionStatus(d).label !== "Connected"));
  const warning = quota.data ? quotaWarning(quota.data.usedBytes, quota.data.totalBytes) : null;

  return (
    <>
      <h1>Overview</h1>
      <p className="sub">Are my backups healthy? Is anything wrong? What needs my attention?</p>
      {me.capabilities.viewMembers && <OrganizationOverview />}

      {devices.loading ? (
        <Loading label="Checking backup health" />
      ) : devices.error ? (
        // No data means no claim: the page never falls back to "Healthy".
        <Failure error={devices.error} onRetry={devices.reload} />
      ) : (
        <>
          {devices.truncated && (
            <Notice tone="info">
              This account has {devices.total} devices. Backup health below covers the first {DEVICE_WALK_LIMIT}. Open Devices to search and page through all of them.
            </Notice>
          )}
          <section className={`health ${health.level}`} aria-live="polite">
            <div>
              <h2>
                {health.level === "healthy" ? "Backups are healthy" : health.level === "critical" ? "Backups need action" : health.level === "attention" ? "Backups need attention" : "Backup health unknown"}
              </h2>
              <div>{health.headline}</div>
            </div>
          </section>

          {warning && (
            <Notice tone={warning.tone === "bad" ? "bad" : "warn"} title={warning.label} action={<Link className="btn btn-secondary btn-sm" to="/app/storage">View storage</Link>}>
              {warning.detail}
            </Notice>
          )}

          <div className="grid cols-4" style={{ marginBlockEnd: 20 }}>
            {[
              [health.counts.devices, "Active devices"],
              [health.counts.successful, "Last backup successful"],
              [health.counts.attention + health.counts.noBackup, "Partially completed or no backup yet"],
              [health.counts.failed, "Failed or interrupted"],
              [health.counts.notConnected, "Not connected"],
            ].map(([n, label]) => (
              <div className="card stat" key={label as string}>
                <span className="n">{n}</span>
                <span className="l">{label}</span>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: "1.2rem" }}>Needs attention</h2>
          {needsAttention.length === 0 ? (
            <Empty title={health.counts.devices === 0 ? "No device is registered yet" : "Nothing needs your attention"}>
              {health.counts.devices === 0 ? "Install the Tornova Windows Agent on a PC and sign in to start protecting it." : "Every active device is connected and completed its last backup."}
            </Empty>
          ) : (
            <DeviceTable devices={needsAttention} />
          )}
        </>
      )}

      <h2 style={{ fontSize: "1.2rem", marginBlockStart: 28 }}>Recent backups</h2>
      {recent.loading ? <Loading /> : recent.error ? <Failure error={recent.error} onRetry={recent.reload} /> : recent.data!.items.length === 0 ? <Empty title="No backups have run yet" /> : <SessionTable sessions={recent.data!.items} />}
    </>
  );
}

function DeviceTable({ devices, actions }: { devices: Device[]; actions?: (device: Device) => React.ReactNode }) {
  const { me } = useAuth();
  const showOwner = me?.accountType === "Business";
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th scope="col">Device</th>
            {showOwner && <th scope="col">User</th>}
            <th scope="col">Connection</th>
            <th scope="col">Last backup result</th>
            <th scope="col">Last backup</th>
            <th scope="col">Last seen</th>
            {actions && <th scope="col">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {devices.map((d) => (
            <tr key={d.deviceId}>
              <th scope="row">
                <Link to={`/app/activity?device=${d.deviceId}`}>{d.name}</Link>
                <div className="small muted">{[d.operatingSystem, d.agentVersion && `Agent ${d.agentVersion}`].filter(Boolean).join(" · ")}</div>
              </th>
              {showOwner && (
                <td>
                  {d.ownerRemoved ? (
                    <>
                      <Badge view={{ label: "Owner removed", tone: "warn" }} />
                      {d.ownerDisplayName && <div className="small muted">{d.ownerDisplayName}</div>}
                    </>
                  ) : (
                    (d.ownerDisplayName ?? <span className="muted">Unassigned</span>)
                  )}
                </td>
              )}
              <td>
                <Badge view={connectionStatus(d)} />
              </td>
              <td>
                <Badge view={backupResult(d.lastSession)} />
              </td>
              <td>{d.lastSession ? formatDateTime(d.lastSession.endedAtUtc ?? d.lastSession.startedAtUtc) : "-"}</td>
              <td>{formatDateTime(d.lastSeenAtUtc)}</td>
              {actions && <td>{actions(d)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SessionTable({ sessions }: { sessions: Session[] }) {
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th scope="col">Started</th>
            <th scope="col">Device</th>
            <th scope="col">Result</th>
            <th scope="col" className="num">Files protected</th>
            <th scope="col" className="num">Not protected</th>
            <th scope="col" className="num">Size</th>
            <th scope="col">
              <span className="sr-only">Details</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.sessionId}>
              <td>{formatDateTime(s.startedAtUtc)}</td>
              <td>{s.deviceName}</td>
              <td>
                <Badge view={backupResult(s)} />
              </td>
              <td className="num">{s.filesUploaded}</td>
              <td className="num">{s.filesSkipped}</td>
              <td className="num">{formatBytes(s.actualBytes)}</td>
              <td>
                <Link to={`/app/activity/${s.sessionId}`}>Details</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------- Devices
export function Devices() {
  const { me } = useAuth();
  const [filter, setFilter] = useState("");
  const [show, setShow] = useState<"active" | "previous">("active");
  const [skip, setSkip] = useState(0);
  // Stage 11 (FT-36): the server scopes, filters, orders and pages the list; this screen only ever holds one page.
  const devices = useApi<DevicePage<Device>>(devicePagePath(skip, DEVICE_PAGE_SIZE, filter, show === "active" ? "Active" : "Unregistered"));
  const [unregister, setUnregister] = useState<Device | null>(null);
  const [exclusions, setExclusions] = useState<Device | null>(null);
  if (!me) return null;

  const list = devices.data?.items ?? [];

  return (
    <>
      <h1>Devices</h1>
      <p className="sub">Windows PCs protected by Tornova. Connection and backup result are shown separately: a connected device has not necessarily backed up successfully.</p>

      <div className="table-tools">
        <div className="seg" role="group" aria-label="Device list">
          <button type="button" aria-pressed={show === "active"} onClick={() => (setShow("active"), setSkip(0))}>
            Registered
          </button>
          <button type="button" aria-pressed={show === "previous"} onClick={() => (setShow("previous"), setSkip(0))}>
            Previous devices
          </button>
        </div>
        <label className="sr-only" htmlFor="device-filter">
          Search devices
        </label>
        <input id="device-filter" className="input" type="search" placeholder="Search devices" value={filter} onChange={(e) => (setFilter(e.target.value), setSkip(0))} />
      </div>

      {show === "previous" && <Notice tone="info">Previous devices are unregistered. Their backups remain available for restore.</Notice>}
      {list.some((d) => d.ownerRemoved) && (
        <Notice tone="info">
          A device marked Owner removed belongs to someone who has left the Organization. It stays registered and its backups are kept; nothing is unregistered or deleted automatically.
        </Notice>
      )}

      {devices.loading ? (
        <Loading />
      ) : devices.error ? (
        <Failure error={devices.error} onRetry={devices.reload} />
      ) : list.length === 0 ? (
        <Empty title={filter.trim() ? "No device matches your search" : show === "active" ? "No registered devices" : "No previous devices"} action={show === "active" ? <Link className="btn btn-secondary btn-sm" to="/download">Get the Windows Agent</Link> : undefined}>
          {show === "active" ? "Install the Tornova Windows Agent on a PC and sign in. It will appear here." : undefined}
        </Empty>
      ) : (
        <DeviceTable
          devices={list}
          actions={
            show === "active"
              ? (d) => (
                  <>
                    {/* Stage 13C: everyone who can see the device may open its exclusions; the server says whether they may change them. */}
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setExclusions(d)}>
                      Exclusions
                    </button>
                    {me.capabilities.manageDevices && (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setUnregister(d)}>
                        Unregister
                      </button>
                    )}
                  </>
                )
              : undefined
          }
        />
      )}

      {devices.data && <Pager skip={skip} take={DEVICE_PAGE_SIZE} total={devices.data.total} onChange={setSkip} />}

      <p className="small muted" style={{ marginBlockStart: 16 }}>
        Personal accounts have no plan-based device limit. Removing a device together with its cloud backups (Unregister + Delete) is not available yet: it is enabled only once Tornova's 3-day deletion grace period is in place.
      </p>

      {exclusions && <DeviceExclusionsDialog deviceId={exclusions.deviceId} deviceName={exclusions.name} onClose={() => setExclusions(null)} />}

      {unregister && (
        <ConfirmDialog
          title={`Unregister ${unregister.name}`}
          danger
          body={
            <>
              <p>This device will stop backing up and its device credential will be revoked.</p>
              <p>
                <strong>Its cloud backups are kept</strong> and stay available for restore. Nothing is deleted.
              </p>
            </>
          }
          typeToConfirm={unregister.name}
          confirmLabel="Unregister device"
          onClose={() => setUnregister(null)}
          onConfirm={async () => {
            // Unregister ONLY: confirmDeletion is always false from this screen.
            await api(`/api/v1/devices/${unregister.deviceId}/unregister`, { method: "POST", body: { confirmDeletion: false } });
            devices.reload();
          }}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------- Backup Sets
interface BackupSet {
  id: string;
  deviceId: string;
  deviceName: string;
  name: string;
  isEnabled: boolean;
  isVersioningEnabled: boolean;
  versionLimit: number | null;
  automaticBackupEnabled: boolean;
  /** Stage 11 (FT-35), decided by the server: "Protected", "WaitingForApproval" or "NeedsAttention". */
  approvalState?: string;
  scheduleTimeOfDayLocal: string | null;
  scheduleTimeZoneId: string | null;
  /** Stage 14: 1, 5, 12 or 24 (hours) when automaticBackupEnabled; null otherwise or from an older server, which means the locked default, 24 (once daily). */
  smartBackupIntervalHours?: number | null;
  version: number;
  items: Array<{ id: string; path: string; itemType: string; isExclusion: boolean }>;
  /** Paths waiting for approval (A2 / B-21). They are NOT being backed up. */
  pendingApprovals: number;
}

interface Paged<T> {
  items: T[];
  total: number;
  skip: number;
  take: number;
}

interface StagedPath {
  id: string;
  proposedPath: string;
  status: number | string;
}

const SET_PAGE = 10;

const ITEM_TYPES = [
  { value: 0, label: "Drive" },
  { value: 1, label: "Folder" },
  { value: 2, label: "File" },
];

/** Stage 11 (FT-35): what the SERVER says about approval. Anything it does not call Protected is shown as not protected. */
export function approvalView(set: { approvalState?: string; pendingApprovals: number }): { label: string; tone: "ok" | "warn"; detail?: string } {
  switch (set.approvalState ?? "Protected") {
    case "Protected":
      return { label: "Protected", tone: "ok", detail: set.pendingApprovals > 0 ? `${set.pendingApprovals} more waiting for approval` : undefined };
    case "WaitingForApproval":
      return { label: "Waiting for approval", tone: "warn", detail: "Nothing in this backup set is backed up yet." };
    default:
      return { label: "Needs attention", tone: "warn", detail: "Nothing is selected. Add a path to protect this device." };
  }
}

export function BackupSets() {
  const { me } = useAuth();
  const [creating, setCreating] = useState(false);
  const [versioning, setVersioning] = useState<BackupSet | null>(null);
  const [skip, setSkip] = useState(0);
  const sets = useApi<Paged<BackupSet>>(`/api/v1/dashboard/backup-sets?skip=${skip}&take=${SET_PAGE}`);
  const [schedule, setSchedule] = useState<BackupSet | null>(null);
  const [addTo, setAddTo] = useState<BackupSet | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <>
      <h1>Backup Sets</h1>
      <p className="sub">What each device protects. Each device has one backup set. You manage the selection here; the Tornova Windows Agent on the device reads the files and performs the backup.</p>
      {message && <Notice tone="ok">{message}</Notice>}
      <div className="table-tools">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
          New backup set
        </button>
      </div>

      {sets.loading ? (
        <Loading />
      ) : sets.error ? (
        <Failure error={sets.error} onRetry={sets.reload} />
      ) : sets.data!.items.length === 0 ? (
        <Empty title="No backup sets yet" action={<button type="button" className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>New backup set</button>}>\n          Choose what a device protects here, or add folders in the Tornova Windows Agent on that PC.\n        </Empty>
      ) : (
        <div className="grid">
          {sets.data!.items.map((set) => (
            <article className="card" key={set.id}>
              <div className="btn-row" style={{ justifyContent: "space-between" }}>
                <div>
                  <h3>
                    {set.name} <span className="muted small">on {set.deviceName}</span>
                  </h3>
                </div>
                <span className="btn-row">\n                  <Badge view={approvalView(set)} />\n                  <Badge view={set.isEnabled ? { label: "Enabled", tone: "ok" } : { label: "Disabled", tone: "neutral" }} />\n                </span>
              </div>

              <dl className="kv" style={{ marginBlock: 12 }}>
                <dt>Automatic Backup</dt>
                <dd>
                  {set.automaticBackupEnabled && set.scheduleTimeOfDayLocal ? `${scheduleFrequencyLabel(set.smartBackupIntervalHours)} starting ${set.scheduleTimeOfDayLocal.slice(0, 5)} (${set.scheduleTimeZoneId ?? "device time"})` : "Off"}{" "}
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSchedule(set)}>
                    Change
                  </button>
                </dd>
                <dt>Smart Backup</dt>
                <dd>
                  Always on <span className="muted small">- new and changed files in this set are detected and protected; unchanged files are not uploaded again.</span>
                </dd>
                <dt>Versioning</dt>
                <dd>\n                  {set.isVersioningEnabled ? `Keeps ${set.versionLimit} versions (versions count toward storage)` : "Off"}{" "}\n                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setVersioning(set)}>\n                    Change\n                  </button>\n                </dd>
              </dl>

              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th scope="col">Path</th>
                      <th scope="col">Type</th>
                      <th scope="col">Rule</th>
                      <th scope="col">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {set.items.length === 0 && (
                      <tr>
                        <td colSpan={4} className="muted">
                          Nothing is selected yet.
                        </td>
                      </tr>
                    )}
                    {set.items.map((item) => (
                      <tr key={item.id}>
                        <td style={{ wordBreak: "break-all" }}>{item.path}</td>
                        <td>{item.itemType}</td>
                        <td>{item.isExclusion ? "Excluded" : "Included"}</td>
                        <td>
                          <RemoveItem set={set} itemId={item.id} path={item.path} onDone={() => (setMessage("The selection was updated. The device picks it up at its next sync."), sets.reload())} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {set.pendingApprovals > 0 && <StagedPaths set={set} personal={me?.accountType === "Personal"} onChanged={(text) => (setMessage(text), sets.reload())} />}
              <div className="btn-row" style={{ marginBlockStart: 12 }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAddTo(set)}>
                  Add a path
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {sets.data && <Pager skip={skip} take={SET_PAGE} total={sets.data.total} onChange={setSkip} />}

      {schedule && <ScheduleDialog set={schedule} onClose={() => setSchedule(null)} onSaved={() => (setMessage("The Automatic Backup schedule was saved."), sets.reload())} />}
      {creating && <CreateBackupSetDialog onClose={() => setCreating(false)} onSaved={(text) => (setMessage(text), sets.reload())} />}
      {versioning && <VersioningDialog set={versioning} onClose={() => setVersioning(null)} onSaved={() => (setMessage("Versioning was saved. It applies from the next backup of each file."), sets.reload())} />}
      {addTo && <AddPathDialog set={addTo} onClose={() => setAddTo(null)} onSaved={(text) => (setMessage(text), sets.reload())} />}
    </>
  );
}

function RemoveItem({ set, itemId, path, onDone }: { set: BackupSet; itemId: string; path: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
        Remove
      </button>
      {open && (
        <ConfirmDialog
          title="Remove from the backup set"
          body={
            <>
              <p style={{ wordBreak: "break-all" }}>{path}</p>
              <p>Future backups will no longer include it. Files already backed up are kept - removing a path never deletes cloud backups.</p>
            </>
          }
          confirmLabel="Remove path"
          onClose={() => setOpen(false)}
          onConfirm={async () => {
            await api(`/api/v1/backupsets/${set.id}/items`, { method: "PATCH", body: { clientVersion: set.version, itemsToAdd: [], itemIdsToRemove: [itemId], operationId: crypto.randomUUID() } });
            onDone();
          }}
        />
      )}
    </>
  );
}

/** Paths that were proposed but are NOT active: under the locked A2 rule a new
 *  path is backed up only once the owner of the device's confirmed Windows profile
 *  (for a path inside that profile) or an Organization Admin has approved it. The
 *  server decides who may approve; a refusal is shown as it is. */
function StagedPaths({ set, personal, onChanged }: { set: BackupSet; personal: boolean; onChanged: (message: string) => void }) {
  const staged = useApi<StagedPath[]>(`/api/v1/backupsets/${set.id}/paths/staged`);
  const [error, setError] = useState<string | null>(null);
  const pending = (staged.data ?? []).filter((c) => c.status === 0 || c.status === "Staged");

  const review = async (change: StagedPath, approve: boolean) => {
    setError(null);
    try {
      await api(`/api/v1/backupsets/${set.id}/paths/staged/${change.id}/${approve ? "approve" : "reject"}`, { method: "POST", body: approve ? undefined : { reason: "Rejected from the Web Dashboard" } });
      staged.reload();
      onChanged(approve ? "The path was approved and is now part of the backup set." : "The proposed path was rejected.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "The path could not be reviewed.");
    }
  };

  if (pending.length === 0) return null;
  return (
    <Notice tone="warn" title="Waiting for approval - not backed up yet">
      <p className="small" style={{ marginBlock: "4px 8px" }}>
        {personal
          ? `A path inside your own Windows profile can be approved here. Any other path is approved on the PC itself: open the Tornova Windows Agent on ${set.deviceName}, sign in, and approve it on the Backup screen.`
          : "A new path is backed up only after it is approved by the owner of the device's confirmed profile (for a path inside that profile) or by an Organization Admin."}
      </p>
      {error && <p className="error small">{error}</p>}
      <ul style={{ margin: 0, paddingInlineStart: 18 }}>
        {pending.map((change) => (
          <li key={change.id} style={{ wordBreak: "break-all", marginBlockEnd: 6 }}>
            {change.proposedPath}{" "}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void review(change, true)}>
              Approve
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void review(change, false)}>
              Reject
            </button>
          </li>
        ))}
      </ul>
    </Notice>
  );
}

const VERSION_CHOICES = [
  { value: 0, label: "Off" },
  { value: 3, label: "Keep 3 versions" },
  { value: 10, label: "Keep 10 versions" },
  { value: 50, label: "Keep 50 versions" },
];

function VersioningField({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="field">
      <label htmlFor="bs-versions">Versioning</label>
      <select id="bs-versions" className="select" value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {VERSION_CHOICES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      <p className="muted small">Off by default. Every kept version uses storage from your plan.</p>
    </div>
  );
}

function VersioningDialog({ set, onClose, onSaved }: { set: BackupSet; onClose: () => void; onSaved: () => void }) {
  const [keep, setKeep] = useState(set.isVersioningEnabled ? (set.versionLimit ?? 0) : 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/api/v1/backupsets/${set.id}/versioning`, { method: "PATCH", body: { isVersioningEnabled: keep > 0, versionLimit: keep > 0 ? keep : null } });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Versioning could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title={`Versioning for ${set.name}`} onClose={onClose}>
      <form onSubmit={save}>
        {error && <Notice tone="bad">{error}</Notice>}
        <VersioningField value={keep} onChange={setKeep} />
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

/** Stage 11: a Backup Set can be created here. The SERVER decides whether the first path is active at once or waits for approval
 *  (FT-35); a waiting set exists, but nothing in it is backed up. */
function CreateBackupSetDialog({ onClose, onSaved }: { onClose: () => void; onSaved: (message: string) => void }) {
  const devices = useAllDevices<Device>();
  // A device has ONE backup set (the Windows Agent runs one), so only devices without one can get a new set; the rest get paths added.
  const active = (devices.data ?? []).filter((d) => d.status === "Active" && !d.backupSetId);
  const [deviceId, setDeviceId] = useState("");
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [type, setType] = useState(1);
  const [keep, setKeep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ stagedForApproval?: unknown[]; approvalState?: number | string }>("/api/v1/backupsets", {
        method: "POST",
        body: { deviceId, name: name.trim(), isVersioningEnabled: keep > 0, versionLimit: keep > 0 ? keep : null, items: [{ path: path.trim(), itemType: type, isExclusion: false }] },
      });
      onSaved((result.stagedForApproval?.length ?? 0) > 0 ? "The backup set was created and is waiting for approval. Nothing in it is backed up until its path is approved." : "The backup set was created. The device picks it up at its next sync.");
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "The backup set could not be created.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title="New backup set" onClose={onClose}>
      <form onSubmit={save}>
        <p className="muted small">The browser cannot see the files on your PC. Type the Windows path exactly as it appears on the device; the Tornova Windows Agent does the backup.</p>
        {error && <Notice tone="bad">{error}</Notice>}
        {devices.error ? <Failure error={devices.error} onRetry={devices.reload} /> : null}
        <div className="field">
          <label htmlFor="nbs-device">Device</label>
          <select id="nbs-device" className="select" required value={deviceId} onChange={(e) => setDeviceId(e.target.value)} disabled={devices.loading}>
            <option value="">{devices.loading ? "Loading devices…" : active.length === 0 ? "Every registered device already has a backup set" : "Choose a device"}</option>
            {active.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="nbs-name">Name</label>
          <input id="nbs-name" className="input" required maxLength={128} placeholder="Documents" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="nbs-path">First Windows path to protect</label>
          <input id="nbs-path" className="input" required placeholder="C:\Users\you\Documents" value={path} onChange={(e) => setPath(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="nbs-type">Type</label>
          <select id="nbs-type" className="select" value={type} onChange={(e) => setType(Number(e.target.value))}>
            {ITEM_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <VersioningField value={keep} onChange={setKeep} />
        <p className="muted small">A path outside the device owner's Windows profile waits for approval first and is not backed up until then.</p>
        <div className="btn-row">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy || !deviceId || !name.trim() || !path.trim()}>
            {busy ? "Creating…" : "Create backup set"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function AddPathDialog(
{ set, onClose, onSaved }: { set: BackupSet; onClose: () => void; onSaved: (message: string) => void }) {
  const [path, setPath] = useState("");
  const [type, setType] = useState(1);
  const [exclude, setExclude] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ stagedForApproval: unknown[] }>(`/api/v1/backupsets/${set.id}/items`, { method: "PATCH", body: { clientVersion: set.version, itemsToAdd: [{ path: path.trim(), itemType: type, isExclusion: exclude }], itemIdsToRemove: [], operationId: crypto.randomUUID() } });
      // The SERVER decides whether the path became active or was staged (A2).
      onSaved(result.stagedForApproval.length > 0 ? "The path was submitted for approval. It is not backed up until it is approved." : "The path was added. The device picks it up at its next sync.");
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "The path could not be added.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title={`Add a path to ${set.name}`} onClose={onClose}>
      <form onSubmit={save}>
        <p className="muted small">The browser cannot see the files on your PC. Type the Windows path exactly as it appears on {set.deviceName}; the Windows Agent does the rest.</p>
        {error && <Notice tone="bad">{error}</Notice>}
        <div className="field">
          <label htmlFor="bs-path">Windows path</label>
          <input id="bs-path" className="input" placeholder="C:\Users\you\Documents" required value={path} onChange={(e) => setPath(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="bs-type">Type</label>
          <select id="bs-type" className="select" value={type} onChange={(e) => setType(Number(e.target.value))}>
            {ITEM_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={exclude} onChange={(e) => setExclude(e.target.checked)} /> Exclude this path from backup
        </label>
        <div className="btn-row">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy || !path.trim()}>
            {busy ? "Saving…" : "Add path"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

/** Stage 14: the four locked Smart Backup interval choices, default 24 (once daily) - matches
 * Tornova.Core.Domain.BackupSets.SmartBackupInterval. */
const INTERVAL_CHOICES = [
  { hours: 1, label: "Every 1 hour" },
  { hours: 5, label: "Every 5 hours" },
  { hours: 12, label: "Every 12 hours" },
  { hours: 24, label: "Once a day" },
] as const;

export function scheduleFrequencyLabel(intervalHours: number | null | undefined): string {
  return INTERVAL_CHOICES.find((c) => c.hours === intervalHours)?.label ?? "Once a day";
}

function ScheduleDialog({ set, onClose, onSaved }: { set: BackupSet; onClose: () => void; onSaved: () => void }) {
  const [enabled, setEnabled] = useState(set.automaticBackupEnabled);
  const [time, setTime] = useState(set.scheduleTimeOfDayLocal?.slice(0, 5) ?? "20:00");
  const [zone, setZone] = useState(set.scheduleTimeZoneId ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [intervalHours, setIntervalHours] = useState(set.smartBackupIntervalHours ?? 24);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // The backend names this capability "Smart Backup" (B-15); Stage 9 presents
      // the same schedule as Automatic Backup without renaming the contract.
      await api(`/api/v1/backupsets/${set.id}/schedule`, { method: "PATCH", body: { isSmartBackupEnabled: enabled, scheduleTimeOfDayLocal: enabled ? `${time}:00` : null, scheduleTimeZoneId: enabled ? zone : null, intervalHours: enabled ? intervalHours : null } });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "The schedule could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title="Automatic Backup" onClose={onClose}>
      <form onSubmit={save}>
        <p className="muted small">Automatic Backup runs this backup set on the schedule you choose. The Windows Agent on {set.deviceName} carries it out.</p>
        {error && <Notice tone="bad">{error}</Notice>}
        <label style={{ display: "flex", gap: 8, alignItems: "center", marginBlockEnd: 16 }}>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Run this backup set automatically
        </label>
        {enabled && (
          <>
            <div className="field">
              <label htmlFor="sch-frequency">How often</label>
              <select id="sch-frequency" className="select" value={intervalHours} onChange={(e) => setIntervalHours(Number(e.target.value))}>
                {INTERVAL_CHOICES.map((c) => (
                  <option key={c.hours} value={c.hours}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="sch-time">{intervalHours === 24 ? "Time of day" : "Starting at"}</label>
              <input id="sch-time" type="time" className="input" required value={time} onChange={(e) => setTime(e.target.value)} />
              {intervalHours !== 24 && <span className="hint">The first run of each day starts here, then repeats every {intervalHours} hours until the next day.</span>}
            </div>
            <div className="field">
              <label htmlFor="sch-zone">Time zone of the device</label>
              <input id="sch-zone" className="input" required value={zone} onChange={(e) => setZone(e.target.value)} />
              <span className="hint">For example America/Chicago or Asia/Kolkata.</span>
            </div>
          </>
        )}
        <div className="btn-row">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Save schedule"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------- Activity
type Range = "today" | "7d" | "30d" | "custom";

/** The from/to instants for an Activity filter. Exported for tests. */
export function activityRange(range: Range, now: Date, custom?: { from: string; to: string }): { from: string; to: string } | null {
  if (range === "custom") {
    if (!custom?.from || !custom?.to) return null;
    const from = new Date(`${custom.from}T00:00:00`);
    const to = new Date(`${custom.to}T23:59:59.999`);
    return Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to ? null : { from: from.toISOString(), to: to.toISOString() };
  }
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (range === "7d") start.setDate(start.getDate() - 6);
  if (range === "30d") start.setDate(start.getDate() - 29);
  return { from: start.toISOString(), to: now.toISOString() };
}

const TAKE = 25;

export function Activity() {
  const params = new URLSearchParams(window.location.search);
  const [range, setRange] = useState<Range>("7d");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [kind, setKind] = useState<"backup" | "restore">("backup");
  const [skip, setSkip] = useState(0);
  const deviceId = params.get("device");
  const window_ = useMemo(() => activityRange(range, new Date(), custom), [range, custom]);

  const query = window_ ? `from=${encodeURIComponent(window_.from)}&to=${encodeURIComponent(window_.to)}&skip=${skip}&take=${TAKE}` : null;
  const backups = useApi<Page<Session>>(kind === "backup" && query ? `/api/v1/dashboard/backup-sessions?${query}${deviceId ? `&deviceId=${deviceId}` : ""}` : null);
  const restores = useApi<Page<RestoreRow>>(kind === "restore" && query ? `/api/v1/dashboard/restore-sessions?${query}` : null);
  const active = kind === "backup" ? backups : restores;

  return (
    <>
      <h1>Activity</h1>
      <p className="sub">What Tornova has done. Select a backup to see exactly which files were involved.</p>

      <div className="table-tools">
        <div className="seg" role="group" aria-label="Period">
          {(
            [
              ["today", "Today"],
              ["7d", "7 Days"],
              ["30d", "30 Days"],
              ["custom", "Custom"],
            ] as Array<[Range, string]>
          ).map(([value, label]) => (
            <button type="button" key={value} aria-pressed={range === value} onClick={() => (setRange(value), setSkip(0))}>
              {label}
            </button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="Activity type">
          <button type="button" aria-pressed={kind === "backup"} onClick={() => (setKind("backup"), setSkip(0))}>
            Backup
          </button>
          <button type="button" aria-pressed={kind === "restore"} onClick={() => (setKind("restore"), setSkip(0))}>
            Restore
          </button>
        </div>
        {deviceId && (
          <Link className="btn btn-ghost btn-sm" to="/app/activity">
            Clear device filter
          </Link>
        )}
      </div>

      {range === "custom" && (
        <div className="table-tools">
          <label htmlFor="act-from">From</label>
          <input id="act-from" type="date" className="input" value={custom.from} onChange={(e) => (setCustom((c) => ({ ...c, from: e.target.value })), setSkip(0))} />
          <label htmlFor="act-to">To</label>
          <input id="act-to" type="date" className="input" value={custom.to} onChange={(e) => (setCustom((c) => ({ ...c, to: e.target.value })), setSkip(0))} />
        </div>
      )}

      {!window_ ? (
        <Empty title="Choose a valid date range">The start date must not be after the end date.</Empty>
      ) : active.loading ? (
        <Loading />
      ) : active.error ? (
        <Failure error={active.error} onRetry={active.reload} />
      ) : active.data!.items.length === 0 ? (
        <Empty title="No activity in this period">Only real backups and restores are listed here. Nothing is shown that did not happen.</Empty>
      ) : (
        <>
          {kind === "backup" ? <SessionTable sessions={backups.data!.items} /> : <RestoreTable rows={restores.data!.items} />}
          <Pager skip={skip} take={TAKE} total={active.data!.total} onChange={setSkip} />
        </>
      )}
    </>
  );
}

export interface RestoreRow {
  restoreSessionId: string;
  sourceDeviceName: string;
  targetDeviceName: string;
  status: string;
  displayStatus?: string;
  itemCount: number;
  totalBytes: number;
  filesRestored: number;
  filesSkipped: number;
  errorCount: number;
  startedAtUtc: string;
  endedAtUtc: string | null;
}

/** A restore is "Completed" only when the server says so (displayStatus) - every file restored, none skipped or failed. Partially
 *  completed and Nothing restored are their own words: the page never turns them into a success. */
export function restoreResult(row: { status: string; errorCount: number; filesSkipped: number; displayStatus?: string; filesRestored?: number }) {
  switch (row.displayStatus) {
    case "Completed":
      return { label: "Completed", tone: "ok" as const };
    case "PartiallyCompleted":
      return { label: "Partially completed", tone: "warn" as const };
    case "NothingRestored":
      return { label: "Nothing restored - all files skipped", tone: "warn" as const };
    case "Failed":
      return { label: "Failed", tone: "bad" as const };
    case "Cancelled":
      return { label: "Cancelled", tone: "neutral" as const };
    case "NeedsAttention":
      return { label: "Needs attention", tone: "warn" as const };
    case "InProgress":
      return { label: "In progress", tone: "info" as const };
    case "Queued":
      return { label: "Waiting for the Tornova app on the PC", tone: "info" as const };
  }
  // A server that does not send displayStatus yet: derive it without ever overstating.
  if (row.status === "CompletedWithWarnings") return (row.filesRestored ?? 1) > 0 ? { label: "Partially completed", tone: "warn" as const } : { label: "Nothing restored - all files skipped", tone: "warn" as const };
  if (row.status === "Completed" && row.errorCount === 0) return row.filesSkipped > 0 ? { label: "Completed - some files skipped", tone: "warn" as const } : { label: "Completed", tone: "ok" as const };
  if (row.status === "Completed") return { label: "Completed with errors", tone: "warn" as const };
  if (row.status === "Failed") return { label: "Failed", tone: "bad" as const };
  if (row.status === "Cancelled") return { label: "Cancelled", tone: "neutral" as const };
  return { label: row.status === "Running" || row.status === "Pending" || row.status === "Authorized" ? "Waiting for the device" : row.status, tone: "info" as const };
}

export function RestoreTable({ rows }: { rows: RestoreRow[] }) {
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th scope="col">Requested</th>
            <th scope="col">From</th>
            <th scope="col">To</th>
            <th scope="col">Result</th>
            <th scope="col" className="num">Files restored</th>
            <th scope="col" className="num">Skipped</th>
            <th scope="col" className="num">Size</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.restoreSessionId}>
              <td>{formatDateTime(r.startedAtUtc)}</td>
              <td>{r.sourceDeviceName}</td>
              <td>{r.targetDeviceName}</td>
              <td>
                <Badge view={restoreResult(r)} />
              </td>
              <td className="num">
                {r.filesRestored} / {r.itemCount}
              </td>
              <td className="num">{r.filesSkipped}</td>
              <td className="num">{formatBytes(r.totalBytes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------- Backup Activity Details
interface SessionDetail {
  session: Session;
  skippedFiles: Array<{ path: string; reason: string; detail: string | null; recordedAtUtc: string }>;
  skippedFilesTotal: number;
}

interface FilePage {
  items: Array<{ id: string; path: string; fileName: string; status: string; currentVersionSizeBytes: number | null; updatedAtUtc: string }>;
  totalCount: number;
  skip: number;
  take: number;
}

const SKIP_REASON: Record<string, string> = {
  Locked: "In use by another program",
  AccessDenied: "Permission denied",
  ReparsePointEscapesApprovedScope: "Outside the approved backup location",
  Other: "Could not be protected",
};

export function ActivityDetails() {
  const { sessionId } = useParams();
  const detail = useApi<SessionDetail>(sessionId ? `/api/v1/dashboard/backup-sessions/${sessionId}` : null);
  const [skip, setSkip] = useState(0);
  const session = detail.data?.session;
  const files = useApi<FilePage>(session ? `/api/v1/files?deviceId=${session.deviceId}&sessionId=${session.sessionId}&skip=${skip}&take=50` : null);

  return (
    <>
      <p className="small">
        <Link to="/app/activity">← Activity</Link>
      </p>
      <h1>Backup Activity Details</h1>
      {detail.loading ? (
        <Loading />
      ) : detail.error ? (
        <Failure error={detail.error} onRetry={detail.reload} />
      ) : (
        session && (
          <>
            <p className="sub">
              {session.deviceName} · started {formatDateTime(session.startedAtUtc)}
              {session.endedAtUtc ? ` · ended ${formatDateTime(session.endedAtUtc)}` : ""}
            </p>
            <div className="grid cols-4" style={{ marginBlockEnd: 20 }}>
              <div className="card">
                <div className="small muted">Result</div>
                <Badge view={backupResult(session)} />
                <div className="small muted" style={{ marginBlockStart: 6 }}>{backupResult(session).detail}</div>
              </div>
              <div className="card stat">
                <span className="n">{session.filesUploaded}</span>
                <span className="l">Files protected</span>
              </div>
              <div className="card stat">
                <span className="n">{session.filesSkipped}</span>
                <span className="l">Files not protected</span>
              </div>
              <div className="card stat">
                <span className="n">{formatBytes(session.actualBytes)}</span>
                <span className="l">Backed up</span>
              </div>
            </div>

            <h2 style={{ fontSize: "1.2rem" }}>Files that were not protected ({detail.data!.skippedFilesTotal})</h2>
            {detail.data!.skippedFiles.length === 0 ? (
              <Empty title="Every file in this backup was protected" />
            ) : (
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th scope="col">File</th>
                      <th scope="col">Why</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.data!.skippedFiles.map((f) => (
                      <tr key={f.path}>
                        <td style={{ wordBreak: "break-all" }}>{f.path}</td>
                        <td>
                          <Badge view={{ label: SKIP_REASON[f.reason] ?? "Could not be protected", tone: "warn" }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <h2 style={{ fontSize: "1.2rem", marginBlockStart: 28 }}>Files protected in this backup</h2>
            {files.loading ? (
              <Loading />
            ) : files.error ? (
              <Failure error={files.error} onRetry={files.reload} />
            ) : files.data!.items.length === 0 ? (
              <Empty title="No files were committed in this backup" />
            ) : (
              <>
                <div className="table-wrap">
                  <table className="data">
                    <thead>
                      <tr>
                        <th scope="col">File</th>
                        <th scope="col">Status</th>
                        <th scope="col" className="num">Size</th>
                      </tr>
                    </thead>
                    <tbody>
                      {files.data!.items.map((f) => (
                        <tr key={f.id}>
                          <td style={{ wordBreak: "break-all" }}>{f.path}</td>
                          <td>
                            <Badge view={{ label: "Protected", tone: "ok" }} />
                          </td>
                          <td className="num">{formatBytes(f.currentVersionSizeBytes)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pager skip={skip} take={50} total={files.data!.totalCount} onChange={setSkip} />
              </>
            )}
          </>
        )
      )}
    </>
  );
}
