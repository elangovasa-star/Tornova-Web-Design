import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge, ConfirmDialog, Dialog, Empty, Failure, Loading, Notice, Pager, formatDateTime } from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { deleteUnavailableNotice } from "../../lib/gates";
import { formatBytes } from "../../lib/status";
import { useApi } from "../../lib/useApi";
import { useAllDevices } from "../../lib/useDevices";
import type { Device } from "./Protect";

interface FilePage {
  items: Array<{ id: string; path: string; fileName: string; status: string; currentVersionSizeBytes: number | null; updatedAtUtc: string }>;
  totalCount: number;
}

interface Version {
  id: string;
  versionNumber: number;
  sizeBytes: number;
  modifiedAtUtc: string;
  createdAtUtc: string;
  isCurrent: boolean;
}

/** What one browser download can genuinely deliver. This mirrors the server's own technical limit (the server enforces it and
 *  answers with the Agent handoff message if it is exceeded); it is not a plan or pricing promise. Bulk and large restores
 *  belong to the Windows Agent (locked Web vs Agent split). */
export const WEB_RESTORE_MAX_BYTES = 250 * 1024 * 1024;

/** Stage 12: the words for a restore's state. The server decides the state (displayStatus); the page only maps it to text and never
 *  turns a state into "success" on its own. */
export function restoreStatusView(status: string): { label: string; tone: "ok" | "warn" | "bad" | "info" | "neutral" } {
  switch (status) {
    case "Completed":
      return { label: "Completed", tone: "ok" };
    case "PartiallyCompleted":
      return { label: "Partially completed", tone: "warn" };
    case "NothingRestored":
      return { label: "Nothing restored", tone: "warn" };
    case "Failed":
      return { label: "Failed", tone: "bad" };
    case "Cancelled":
      return { label: "Cancelled", tone: "neutral" };
    case "NeedsAttention":
      return { label: "Needs attention", tone: "warn" };
    case "InProgress":
      return { label: "In progress", tone: "info" };
    default:
      return { label: "Waiting for the Tornova app on the PC", tone: "info" };
  }
}

interface RestoreRequest {
  restoreSessionId: string;
  sourceDeviceId: string;
  targetDeviceId: string;
  status: string;
  displayStatus: string;
  blockedReason: string | null;
  clientSideEncrypted: boolean;
  targetKind: string;
  alternateTargetPath: string | null;
  itemCount: number;
  totalBytes: number;
  filesRestored: number;
  filesSkipped: number;
  errorCount: number;
  startedAtUtc: string;
  endedAtUtc: string | null;
}

interface RestoreItemRow {
  restoreItemId: string;
  sourcePath: string;
  fileName: string;
  sizeBytes: number;
  status: string;
  detail: string | null;
}

interface RestoreItemsPage {
  items: RestoreItemRow[];
  total: number;
  hasMore: boolean;
}

const active = (r: { displayStatus: string }) => r.displayStatus === "Queued" || r.displayStatus === "InProgress" || r.displayStatus === "NeedsAttention";

// ---------------------------------------------------------------- Restore
export function Restore() {
  const { me } = useAuth();
  const devices = useAllDevices<Device>(); // Stage 11 (FT-36): read page by page from the server
  const [deviceId, setDeviceId] = useState("");
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const [skip, setSkip] = useState(0);
  const [picked, setPicked] = useState<{ fileId: string; path: string } | null>(null);
  const [folderOpen, setFolderOpen] = useState(false);
  const [requestsKey, setRequestsKey] = useState(0);
  const files = useApi<FilePage>(deviceId ? `/api/v1/files?deviceId=${deviceId}&skip=${skip}&take=25${applied ? `&path=${encodeURIComponent(applied)}` : ""}` : null);
  if (!me) return null;

  return (
    <>
      <h1>Restore</h1>
      <p className="sub">Find a file and a version, or a whole folder, then restore it. Backups from previous and replaced devices remain available.</p>

      {!me.capabilities.restore && (
        // What the SERVER says stops a restore right now (Organization lock, Team lock, the person's own permission), never a guess from a flag.
        <Notice tone="warn" title={me.capabilities.restoreBlockedBy === "OrganizationMasterRestoreLock" || me.capabilities.restoreBlockedBy === "TeamRestoreLock" ? "Restore is locked" : "Restore is not enabled for your user"}>
          {me.capabilities.restoreBlockedBy === "OrganizationMasterRestoreLock"
            ? "Your Organization's Restore Lock is on. "
            : me.capabilities.restoreBlockedBy === "TeamRestoreLock"
              ? "Your Team's Restore Lock is on. "
              : "Restore permission is separate from backup permission. "}
          Ask your {me.accountType === "Business" ? "Organization Admin" : "account owner"} to change it. The server enforces this for every request.
        </Notice>
      )}
      {me.clientSideEncryptionEnabled && (
        <Notice tone="info" title="This account uses Client-Side Double-Layer Encryption">
          Restore and download are performed only through the Tornova Windows Agent. Browser download is not available for this account.
        </Notice>
      )}

      <div className="grid cols-2" style={{ marginBlockEnd: 16 }}>
        <div className="card">
          <h3>Small restores - in the browser</h3>
          <p className="muted small">For an individual file that the browser can download reliably (about {formatBytes(WEB_RESTORE_MAX_BYTES)} at most), where your account type allows it.</p>
        </div>
        <div className="card">
          <h3>Bulk and full restores - Tornova app on the PC</h3>
          <p className="muted small">
            You request the restore here. Then open Tornova on the PC, choose where the files go and how files that already exist are handled, and start it. Your folders are kept, nothing is overwritten unless you choose it, and an interrupted restore can be resumed.
          </p>
        </div>
      </div>

      {devices.loading ? (
        <Loading />
      ) : devices.error ? (
        <Failure error={devices.error} onRetry={devices.reload} />
      ) : (
        <form className="table-tools" onSubmit={(e) => (e.preventDefault(), setApplied(search.trim()), setSkip(0))}>
          <label htmlFor="rs-device" className="sr-only">
            Restore from device
          </label>
          <select id="rs-device" className="select" value={deviceId} onChange={(e) => (setDeviceId(e.target.value), setSkip(0))}>
            <option value="">Choose the device to restore from</option>
            {devices.data!.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.name}
                {d.status !== "Active" ? " (previous device)" : ""}
              </option>
            ))}
          </select>
          <label htmlFor="rs-search" className="sr-only">
            Search by file or folder name
          </label>
          <input id="rs-search" className="input" type="search" placeholder="Search by file or folder name" value={search} onChange={(e) => setSearch(e.target.value)} disabled={!deviceId} />
          <button className="btn btn-secondary btn-sm" type="submit" disabled={!deviceId}>
            Search
          </button>
        </form>
      )}

      {!deviceId ? (
        <Empty title="Choose a device to see its backed-up files" />
      ) : files.loading ? (
        <Loading />
      ) : files.error ? (
        <Failure error={files.error} onRetry={files.reload} />
      ) : files.data!.items.length === 0 ? (
        <Empty title="No backed-up files match">Only files that were really backed up are listed.</Empty>
      ) : (
        <>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">File</th>
                  <th scope="col" className="num">Size</th>
                  <th scope="col">Last backed up</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {files.data!.items.map((f) => (
                  <tr key={f.id}>
                    <td style={{ wordBreak: "break-all" }}>{f.path}</td>
                    <td className="num">{formatBytes(f.currentVersionSizeBytes)}</td>
                    <td>{formatDateTime(f.updatedAtUtc)}</td>
                    <td>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPicked({ fileId: f.id, path: f.path })}>
                        Versions & restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager skip={skip} take={25} total={files.data!.totalCount} onChange={setSkip} />
        </>
      )}

      {deviceId && me.capabilities.restore && (
        <p style={{ marginBlockStart: 16 }}>
          <button type="button" className="btn btn-secondary" onClick={() => setFolderOpen(true)}>
            Restore a whole folder or this whole device
          </button>
        </p>
      )}

      <RestoreRequests reloadKey={requestsKey} />

      {picked && <RestoreDialog file={picked} sourceDeviceId={deviceId} devices={devices.data ?? []} onClose={() => setPicked(null)} onRequested={() => setRequestsKey((k) => k + 1)} />}
      {folderOpen && <FolderRestoreDialog sourceDeviceId={deviceId} devices={devices.data ?? []} onClose={() => setFolderOpen(false)} onRequested={() => setRequestsKey((k) => k + 1)} />}
    </>
  );
}

function RestoreDialog({ file, sourceDeviceId, devices, onClose, onRequested }: { file: { fileId: string; path: string }; sourceDeviceId: string; devices: Device[]; onClose: () => void; onRequested: () => void }) {
  const { me } = useAuth();
  const versions = useApi<Version[]>(`/api/v1/files/${file.fileId}/versions`);
  const [versionId, setVersionId] = useState("");
  const targets = devices.filter((d) => d.status === "Active");
  const [targetId, setTargetId] = useState(targets.find((d) => d.deviceId === sourceDeviceId)?.deviceId ?? targets[0]?.deviceId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const chosen = versions.data?.find((v) => v.id === versionId) ?? versions.data?.find((v) => v.isCurrent) ?? null;
  const canWeb = !me?.clientSideEncryptionEnabled && chosen !== null && chosen.sizeBytes <= WEB_RESTORE_MAX_BYTES;

  const run = async (action: () => Promise<string>) => {
    setBusy(true);
    setError(null);
    try {
      setDone(await action());
    } catch (e) {
      // The server names the gate that blocked a restore (R-06); it is shown as-is.
      setError(e instanceof ApiError ? e.message : "The restore could not be started.");
    } finally {
      setBusy(false);
    }
  };

  const webDownload = () =>
    run(async () => {
      const grants = await api<Array<{ sasUri: string }>>("/api/v1/restore/web/download", { method: "POST", body: { sourceDeviceId, fileVersionIds: [chosen!.id] } });
      if (!grants?.length) throw new ApiError("server", 500, null, "No download was issued for this file.");
      const link = document.createElement("a");
      link.href = grants[0].sasUri;
      link.rel = "noopener";
      link.download = file.path.split(/[\\/]/).pop() ?? "restored-file";
      document.body.appendChild(link);
      link.click();
      link.remove();
      return "Your browser is downloading the file. The download link is short-lived and works only for this file.";
    });

  const agentRestore = () =>
    run(async () => {
      // The destination and how existing files are handled are chosen in the Tornova app on the PC (the trusted, local flow),
      // never typed here: this only asks for the files.
      await api("/api/v1/restore/sessions", {
        method: "POST",
        body: { sourceDeviceId, targetDeviceId: targetId, fileVersionIds: [chosen!.id], targetKind: 0, alternateTargetPath: null, overwriteMode: 0 },
      });
      onRequested();
      return `Restore requested. Open Tornova on ${targets.find((d) => d.deviceId === targetId)?.name ?? "the PC"}, choose where the files go, and start it. Nothing has been restored yet - follow it under "Your restore requests" below.`;
    });

  return (
    <Dialog title="Restore a file" onClose={onClose}>
      <p style={{ wordBreak: "break-all" }} className="small">
        {file.path}
      </p>
      {done ? (
        <>
          <Notice tone="info">{done}</Notice>
          <div className="btn-row">
            <Link className="btn btn-secondary" to="/app/activity">
              Open Activity
            </Link>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Close
            </button>
          </div>
        </>
      ) : versions.loading ? (
        <Loading />
      ) : versions.error ? (
        <Failure error={versions.error} onRetry={versions.reload} />
      ) : (
        <>
          {error && <Notice tone="bad" title="Restore was not started">{error}</Notice>}
          <div className="field">
            <label htmlFor="rs-version">Version</label>
            <select id="rs-version" className="select" value={chosen?.id ?? ""} onChange={(e) => setVersionId(e.target.value)}>
              {versions.data!.map((v) => (
                <option key={v.id} value={v.id}>
                  Version {v.versionNumber}
                  {v.isCurrent ? " (current)" : ""} - {formatDateTime(v.modifiedAtUtc)} - {formatBytes(v.sizeBytes)}
                </option>
              ))}
            </select>
          </div>

          <h3>Download in the browser</h3>
          {canWeb ? (
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={webDownload}>
              Download this version
            </button>
          ) : (
            <p className="muted small">{me?.clientSideEncryptionEnabled ? "Not available: this account uses Client-Side Double-Layer Encryption, which restores through the Windows Agent only." : "Too large to download reliably in the browser. Use the Tornova app restore below - it restores large files safely and can resume if interrupted."}</p>
          )}

          <h3 style={{ marginBlockStart: 20 }}>Restore with the Tornova app</h3>
          {targets.length === 0 ? (
            <p className="muted small">No registered device is available to restore to.</p>
          ) : (
            <>
              <div className="field">
                <label htmlFor="rs-target">Restore to device</label>
                <select id="rs-target" className="select" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                  {targets.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="muted small">
                You choose the folder (the original location or another one) and what happens to a file that already exists - Keep Both, Replace or Skip - in the Tornova app on that PC. Nothing is overwritten unless you choose it there.
              </p>
              <button type="button" className="btn btn-primary" disabled={busy || !targetId || !chosen} onClick={() => void agentRestore()}>
                Request restore
              </button>
            </>
          )}
        </>
      )}

    </Dialog>
  );
}

// ---------------------------------------------------------------- Folder / whole-device restore (Tornova app)
function FolderRestoreDialog({ sourceDeviceId, devices, onClose, onRequested }: { sourceDeviceId: string; devices: Device[]; onClose: () => void; onRequested: () => void }) {
  const targets = devices.filter((d) => d.status === "Active");
  const [targetId, setTargetId] = useState(targets.find((d) => d.deviceId === sourceDeviceId)?.deviceId ?? targets[0]?.deviceId ?? "");
  const [folder, setFolder] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const request = async () => {
    setBusy(true);
    setError(null);
    try {
      // An empty folder means everything backed up from this device. Only the files are requested here; where they go and how
      // existing files are handled are chosen in the Tornova app on the PC.
      await api("/api/v1/restore/sessions", {
        method: "POST",
        body: { sourceDeviceId, targetDeviceId: targetId, fileVersionIds: [], folderPathPrefix: folder.trim(), targetKind: 0, alternateTargetPath: null, overwriteMode: 0 },
      });
      onRequested();
      setDone(true);
    } catch (e) {
      // The server names what blocked it (a Restore Lock, a missing permission, a selection that is too large) - shown as-is.
      setError(e instanceof ApiError ? e.message : "The restore could not be requested.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title="Restore a folder or a whole device" onClose={onClose}>
      {done ? (
        <>
          <Notice tone="info">Restore requested. Open Tornova on the PC, choose where the files go and how existing files are handled, and start it. Nothing has been restored yet - follow it under "Your restore requests".</Notice>
          <div className="btn-row">
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Close
            </button>
          </div>
        </>
      ) : (
        <>
          {error && <Notice tone="bad" title="Restore was not requested">{error}</Notice>}
          <div className="field">
            <label htmlFor="fr-folder">Folder to restore</label>
            <input id="fr-folder" className="input" placeholder="For example C:\Users\Asha\Documents - leave empty for everything on this device" value={folder} onChange={(e) => setFolder(e.target.value)} />
            <p className="muted small">The path the files had when they were backed up. Only files that were really backed up are restored, with the folder structure kept.</p>
          </div>
          {targets.length === 0 ? (
            <p className="muted small">No registered device is available to restore to.</p>
          ) : (
            <div className="field">
              <label htmlFor="fr-target">Restore to device</label>
              <select id="fr-target" className="select" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                {targets.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button type="button" className="btn btn-primary" disabled={busy || !targetId} onClick={() => void request()}>
            Request restore
          </button>
        </>
      )}
    </Dialog>
  );
}

// ---------------------------------------------------------------- Your restore requests (status, cancel, per-file results)
function RestoreRequests({ reloadKey }: { reloadKey: number }) {
  const list = useApi<RestoreRequest[]>(`/api/v1/restore/sessions?take=20&k=${reloadKey}`);
  const [details, setDetails] = useState<RestoreRequest | null>(null);
  const [cancel, setCancel] = useState<RestoreRequest | null>(null);
  if (list.loading) return null;
  if (list.error || !list.data || list.data.length === 0) return null;

  return (
    <>
      <h2 style={{ marginBlockStart: 32 }}>Your restore requests</h2>
      <p className="muted small">A restore is completed only when the Tornova app on the PC has really restored the files. A file that was skipped or failed is never shown as restored.</p>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th scope="col">Requested</th>
              <th scope="col">Result</th>
              <th scope="col" className="num">Files restored</th>
              <th scope="col" className="num">Size</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {list.data.map((r) => {
              const view = restoreStatusView(r.displayStatus);
              return (
                <tr key={r.restoreSessionId}>
                  <td>{formatDateTime(r.startedAtUtc)}</td>
                  <td>
                    <Badge view={view} />
                    {r.blockedReason && <div className="muted small">{r.blockedReason}</div>}
                    {r.clientSideEncrypted && <div className="muted small">Client-Side Encryption: restored through the Windows Agent only.</div>}
                    {r.displayStatus === "Queued" && !r.blockedReason && <div className="muted small">Open Tornova on the PC to start it.</div>}
                    {(r.filesSkipped > 0 || r.errorCount > 0) && (
                      <div className="muted small">
                        {r.filesSkipped} skipped, {r.errorCount} failed
                      </div>
                    )}
                  </td>
                  <td className="num">
                    {r.filesRestored} / {r.itemCount}
                  </td>
                  <td className="num">{formatBytes(r.totalBytes)}</td>
                  <td>
                    <span className="btn-row">
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDetails(r)}>
                        Files
                      </button>
                      {active(r) && (
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCancel(r)}>
                          Cancel
                        </button>
                      )}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {details && <RestoreFilesDialog request={details} onClose={() => setDetails(null)} />}
      {cancel && (
        <ConfirmDialog
          title="Cancel this restore?"
          body={<p>Files that have already been restored stay where they are. Files that were not restored yet will not be restored, and the restore is shown as cancelled.</p>}
          confirmLabel="Cancel the restore"
          onClose={() => setCancel(null)}
          onConfirm={async () => {
            await api(`/api/v1/restore/sessions/${cancel.restoreSessionId}/cancel`, { method: "POST" });
            setCancel(null);
            list.reload();
          }}
        />
      )}
    </>
  );
}

function RestoreFilesDialog({ request, onClose }: { request: RestoreRequest; onClose: () => void }) {
  const [skip, setSkip] = useState(0);
  const [status, setStatus] = useState("");
  const items = useApi<RestoreItemsPage>(`/api/v1/restore/sessions/${request.restoreSessionId}/items?skip=${skip}&take=50${status ? `&status=${status}` : ""}`);
  const tone = (s: string) => (s === "Restored" ? "ok" : s === "Failed" ? "bad" : s === "Pending" ? "info" : "warn");
  const words = (s: string) => (s === "Pending" ? "Not restored yet" : s === "Restored" ? "Restored" : s === "Skipped" ? "Skipped - not restored" : s === "Failed" ? "Failed - not restored" : "Cancelled - not restored");

  return (
    <Dialog title="Files in this restore" onClose={onClose}>
      <div className="field">
        <label htmlFor="rf-status">Show</label>
        <select id="rf-status" className="select" value={status} onChange={(e) => (setStatus(e.target.value), setSkip(0))}>
          <option value="">All files</option>
          <option value="Restored">Restored</option>
          <option value="Skipped">Skipped</option>
          <option value="Failed">Failed</option>
          <option value="Pending">Not restored yet</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>
      {items.loading ? (
        <Loading />
      ) : items.error ? (
        <Failure error={items.error} onRetry={items.reload} />
      ) : items.data!.items.length === 0 ? (
        <Empty title="No files match" />
      ) : (
        <>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">File</th>
                  <th scope="col">Result</th>
                </tr>
              </thead>
              <tbody>
                {items.data!.items.map((i) => (
                  <tr key={i.restoreItemId}>
                    <td style={{ wordBreak: "break-all" }}>{i.sourcePath}</td>
                    <td>
                      <Badge view={{ label: words(i.status), tone: tone(i.status) }} />
                      {i.detail && <div className="muted small">{i.detail}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager skip={skip} take={50} total={items.data!.total} onChange={setSkip} />
        </>
      )}
    </Dialog>
  );
}

// ---------------------------------------------------------------- Trash
interface TrashItem {
  id: string;
  source: string;
  status: string;
  path: string;
  fileName: string;
  deletedAtUtc: string;
  restoredAtUtc: string | null;
  permanentlyDeletedAtUtc: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function Trash() {
  const trash = useApi<TrashItem[]>("/api/v1/trash");
  const [purge, setPurge] = useState<TrashItem | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const items = (trash.data ?? []).filter((i) => i.status === "Trashed" && !i.restoredAtUtc && !i.permanentlyDeletedAtUtc);

  const restore = async (item: TrashItem) => {
    setMessage(null);
    try {
      await api(`/api/v1/trash/${item.id}/restore`, { method: "POST" });
      setMessage({ tone: "ok", text: `${item.fileName} was restored from Trash.` });
      trash.reload();
    } catch (e) {
      setMessage({ tone: "bad", text: e instanceof ApiError ? e.message : "The item could not be restored." });
    }
  };

  return (
    <>
      <h1>Trash</h1>
      <p className="sub">Deleted backup data waits here for 1 day before it can be permanently removed. Until then you can bring it back.</p>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      {trash.loading ? (
        <Loading />
      ) : trash.error ? (
        <Failure error={trash.error} onRetry={trash.reload} />
      ) : items.length === 0 ? (
        <Empty title="Trash is empty">Nothing has been deleted from your backups.</Empty>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th scope="col">File</th>
                <th scope="col">Deleted by</th>
                <th scope="col">Deleted</th>
                <th scope="col">Permanently removed after</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td style={{ wordBreak: "break-all" }}>{item.path}</td>
                  <td>{item.source === "SmartCleanup" ? "Smart Cleanup" : item.source === "DeviceUnregistration" ? "Device removal" : "You"}</td>
                  <td>{formatDateTime(item.deletedAtUtc)}</td>
                  <td>{formatDateTime(new Date(new Date(item.deletedAtUtc).getTime() + DAY_MS).toISOString())}</td>
                  <td>
                    <span className="btn-row">
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => void restore(item)}>
                        Restore
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPurge(item)}>
                        Delete permanently
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {purge && (
        <ConfirmDialog
          title="Delete permanently"
          danger
          body={
            <>
              <p style={{ wordBreak: "break-all" }}>{purge.path}</p>
              <p>
                <strong>This cannot be undone.</strong> The backed-up copy will be removed and can no longer be restored.
              </p>
            </>
          }
          typeToConfirm="DELETE"
          confirmLabel="Delete permanently"
          onClose={() => setPurge(null)}
          onConfirm={async () => {
            await api(`/api/v1/trash/${purge.id}/purge`, { method: "POST" });
            setMessage({ tone: "ok", text: `${purge.fileName} was permanently deleted.` });
            trash.reload();
          }}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------- Smart Cleanup
interface Candidate {
  id: string;
  deviceId: string;
  path: string;
  fileName: string;
  detectedAtUtc: string;
}

export function SmartCleanup() {
  const { me } = useAuth();
  const candidates = useApi<Candidate[]>("/api/v1/smart-cleanup/candidates");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const list = candidates.data ?? [];

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const dismiss = async () => {
    setMessage(null);
    try {
      await api("/api/v1/smart-cleanup/dismiss", { method: "POST", body: { candidateIds: [...selected] } });
      setMessage({ tone: "ok", text: "The selected files were kept in your backup and removed from this list." });
      setSelected(new Set());
      candidates.reload();
    } catch (e) {
      setMessage({ tone: "bad", text: e instanceof ApiError ? e.message : "The request could not be completed." });
    }
  };

  return (
    <>
      <h1>Smart Cleanup</h1>
      <p className="sub">Files you deleted on your PC that still have a cloud backup. Nothing is removed unless you review the list and confirm. Files on a disconnected or unavailable drive are never listed.</p>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      {me && !me.capabilities.deleteData && <Notice tone="info">{deleteUnavailableNotice(me.capabilities.restore, me.capabilities.restoreBlockedBy)}</Notice>}

      {candidates.loading ? (
        <Loading />
      ) : candidates.error ? (
        <Failure error={candidates.error} onRetry={candidates.reload} />
      ) : list.length === 0 ? (
        <Empty title="Nothing to clean up">Tornova has not found any locally deleted files that still have a cloud backup.</Empty>
      ) : (
        <>
          <div className="table-tools">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelected(selected.size === list.length ? new Set() : new Set(list.map((c) => c.id)))}>
              {selected.size === list.length ? "Clear selection" : "Select all"}
            </button>
            <span className="small muted" aria-live="polite">
              {selected.size} of {list.length} selected
            </span>
            <button type="button" className="btn btn-secondary btn-sm" disabled={selected.size === 0} onClick={() => void dismiss()}>
              Keep in backup
            </button>
            <button type="button" className="btn btn-danger btn-sm" disabled={selected.size === 0 || (me ? !me.capabilities.deleteData : true)} onClick={() => setConfirming(true)}>
              Move backups to Trash…
            </button>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">
                    <span className="sr-only">Select</span>
                  </th>
                  <th scope="col">File</th>
                  <th scope="col">Found missing on the PC</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <input type="checkbox" aria-label={`Select ${c.fileName}`} checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                    </td>
                    <td style={{ wordBreak: "break-all" }}>{c.path}</td>
                    <td>{formatDateTime(c.detectedAtUtc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {confirming && (
        <ConfirmDialog
          title={`Move ${selected.size} backup${selected.size === 1 ? "" : "s"} to Trash`}
          danger
          body={
            <>
              <p>The cloud backups of the selected files will be moved to Trash. They stay there for 1 day and can be restored from Trash during that time. After that they can be permanently removed.</p>
              <Badge view={{ label: "You reviewed the list above", tone: "info" }} />
            </>
          }
          typeToConfirm="CLEAN UP"
          confirmLabel="Move to Trash"
          onClose={() => setConfirming(false)}
          onConfirm={async () => {
            await api("/api/v1/smart-cleanup/confirm", { method: "POST", body: { candidateIds: [...selected] } });
            setMessage({ tone: "ok", text: "The selected backups were moved to Trash. You can restore them from Trash for 1 day." });
            setSelected(new Set());
            candidates.reload();
          }}
        />
      )}
    </>
  );
}
