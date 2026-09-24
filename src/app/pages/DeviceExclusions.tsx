import { useEffect, useState } from "react";
import { Dialog, Failure, Loading, Notice } from "../../components/ui";
import { ApiError, api } from "../../lib/api";

// Stage 13C (Exclusions Lite): the website is the ONLY place a device's exclusion rules are edited; the Windows client shows them read-only.
// Nothing here decides who may edit: the server answers `editAllowed` (and refuses every write it does not allow), this only presents it.

/** The numbers are the API's: 0 = file type (extension), 1 = file name, 2 = folder name. */
const KINDS = [
  { type: 0, label: "File type", hint: "For example .tmp", placeholder: ".tmp" },
  { type: 1, label: "File name", hint: "For example desktop.ini", placeholder: "desktop.ini" },
  { type: 2, label: "Folder name", hint: "For example node_modules", placeholder: "node_modules" },
] as const;

const kindLabel = (type: number) => KINDS.find((k) => k.type === type)?.label ?? "Rule";

interface Rule {
  id: string;
  type: number;
  value: string;
}

interface RuleList {
  editAllowed: boolean;
  rules: Rule[];
}

/** No Backup Set yet: the customer chooses what to protect first (nothing is created here). */
const NO_SET = "NoBackupSetForExclusions";

/** A device from before Stage 11 with several Backup Sets: the server refuses to guess which one the Agent runs (its message is written for the customer). */
const SEVERAL_SETS = "AmbiguousBackupSet";

export function DeviceExclusionsDialog({ deviceId, deviceName, onClose }: { deviceId: string; deviceName: string; onClose: () => void }) {
  const path = `/api/v1/devices/${deviceId}/exclusions`;
  const [list, setList] = useState<RuleList | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [tick, setTick] = useState(0);
  const [type, setType] = useState(0);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setList(null);
    setError(null);
    api<RuleList>(path, { signal: controller.signal })
      .then(setList)
      .catch((e) => !controller.signal.aborted && setError(e));
    return () => controller.abort();
  }, [path, tick]);

  const say = (e: unknown, fallback: string) =>
    setProblem(e instanceof ApiError ? (e.code === NO_SET ? "Choose what to protect first before configuring exclusions." : e.message) : fallback);

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!value.trim()) return;
    setBusy(true);
    setProblem(null);
    try {
      // The answer is the whole saved list, so the dialog never needs a second request to show the result.
      setList(await api<RuleList>(path, { method: "POST", body: { type, value: value.trim() } }));
      setValue("");
    } catch (e) {
      say(e, "The exclusion could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (rule: Rule) => {
    setBusy(true);
    setProblem(null);
    try {
      setList(await api<RuleList>(`${path}/${rule.id}`, { method: "DELETE" }));
    } catch (e) {
      say(e, "The exclusion could not be removed.");
    } finally {
      setBusy(false);
    }
  };

  const kind = KINDS.find((k) => k.type === type) ?? KINDS[0];

  return (
    <Dialog title={`Exclusions for ${deviceName}`} onClose={onClose}>
      {error instanceof ApiError && error.code === NO_SET ? (
        <Notice tone="info">Choose what to protect first before configuring exclusions.</Notice>
      ) : error instanceof ApiError && error.code === SEVERAL_SETS ? (
        <Notice tone="info">{error.message}</Notice>
      ) : error ? (
        <Failure error={error} onRetry={() => setTick((t) => t + 1)} />
      ) : !list ? (
        <Loading />
      ) : (
        <>
          <p className="small muted">
            Excluded files and folders are skipped by future backups. <strong>An exclusion never deletes anything</strong>: copies already backed up are kept. The next backup uses this list; one already running finishes with the list it started with.
          </p>
          {problem && <Notice tone={problem.startsWith("Choose what") ? "info" : "bad"}>{problem}</Notice>}

          {list.rules.length === 0 ? (
            <p className="muted">No exclusions. Everything you chose to protect is backed up.</p>
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th scope="col">Type</th>
                    <th scope="col">Value</th>
                    {list.editAllowed && (
                      <th scope="col">
                        <span className="sr-only">Remove</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {list.rules.map((rule) => (
                    <tr key={rule.id}>
                      <td>{kindLabel(rule.type)}</td>
                      <td>{rule.value}</td>
                      {list.editAllowed && (
                        <td>
                          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => remove(rule)} aria-label={`Remove ${kindLabel(rule.type)} ${rule.value}`}>
                            Remove
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {list.editAllowed ? (
            <form onSubmit={add} style={{ marginBlockStart: 16 }}>
              <div className="field">
                <label htmlFor="exclusion-type">Type</label>
                <select id="exclusion-type" className="select" value={type} onChange={(e) => setType(Number(e.target.value))}>
                  {KINDS.map((k) => (
                    <option key={k.type} value={k.type}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="exclusion-value">Value</label>
                <input id="exclusion-value" className="input" value={value} maxLength={255} placeholder={kind.placeholder} onChange={(e) => setValue(e.target.value)} autoComplete="off" />
                <div className="small muted">{kind.hint}. Names only: no wildcards and no paths. Capital letters do not matter.</div>
              </div>
              <div className="btn-row">
                <button type="button" className="btn btn-ghost" onClick={onClose}>
                  Close
                </button>
                <button type="submit" className="btn btn-primary" disabled={busy || !value.trim()}>
                  {busy ? "Saving…" : "Add exclusion"}
                </button>
              </div>
            </form>
          ) : (
            <>
              <p className="small muted" style={{ marginBlockStart: 12 }}>
                Only an administrator of this device can change its exclusions.
              </p>
              <div className="btn-row">
                <button type="button" className="btn btn-primary" onClick={onClose}>
                  Close
                </button>
              </div>
            </>
          )}
        </>
      )}
    </Dialog>
  );
}
