import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../lib/api";
import type { StatusView } from "../lib/status";

/** The approved Tornova logo asset itself (docs/stage9/Logo.png, cropped to its own
 *  content bounds only - no recoloring, redrawing or reinterpretation) - never a
 *  vector recreation. `light` wraps it in a small white card so the unmodified,
 *  dark-on-white artwork stays legible on the dark footer, without altering the
 *  asset's own colors. */
export function Brand({ light = false, to = "/" }: { light?: boolean; to?: string }) {
  return (
    <Link to={to} className={`brand${light ? " light" : ""}`} aria-label="Tornova - home">
      <img src="/brand/tor-logo.png" alt="Tornova - Powerful Backup. Peace of Mind." className="brand-logo" />
    </Link>
  );
}

const ICONS: Record<string, string> = {
  gift: "M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7c-1.5-3.5-6-3-5 0M12 7c1.5-3.5 6-3 5 0",
  shield: "M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3zm-3.2 9.2l2.3 2.3 4.4-4.6",
  cloud: "M7 18h10a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.2 9.3 4.5 4.5 0 0 0 7 18z",
  refresh: "M20 12a8 8 0 1 1-2.6-5.9M20 4v5h-5",
  restore: "M4 12a8 8 0 1 0 2.6-5.9M4 4v5h5M12 8v4l3 2",
  devices: "M3 5h13v9H3zM1 17h17M18 9h4v10h-4z",
  pulse: "M3 12h4l2-6 4 12 2-6h6",
  broom: "M14 4l6 6M5 20c0-5 3-8 7-9l3 3c-1 4-4 7-9 7zM9 14l2 2",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  users: "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8 0a3 3 0 1 0 0-6M2 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M16 14.6c2.8.3 6 2.2 6 5.4",
  lock: "M6 11h12v9H6zM9 11V8a3 3 0 0 1 6 0v3",
  stop: "M8 3h8l5 5v8l-5 5H8l-5-5V8l5-5zM9 9l6 6M15 9l-6 6",
  file: "M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6",
  folder: "M3 6h6l2 2h10v11H3z",
  drive: "M3 14l3-9h12l3 9v5H3zM3 14h18M7 17h.01",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18",
  badge: "M12 3l2.6 2 3.3-.2.9 3.2 2.6 2-1.4 3 .5 3.3-3.2.9-2 2.6-3.3-1.3-3.3 1.3-2-2.6-3.2-.9.5-3.3-1.4-3 2.6-2 .9-3.2 3.3.2z",
  history: "M4 6h16M4 12h16M4 18h10",
  download: "M12 3v12m0 0l-4-4m4 4l4-4M4 19h16",
  help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8M12 17h.01",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  card: "M3 6h18v12H3zM3 10h18M7 15h4",
};

export function Icon({ name, size = 22 }: { name: keyof typeof ICONS | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name] ?? ICONS.file} />
    </svg>
  );
}

/** Status is conveyed by shape and text, never by colour alone. */
export function Badge({ view }: { view: StatusView }) {
  return (
    <span className={`badge ${view.tone}`} title={view.detail}>
      {view.label}
    </span>
  );
}

export function Notice({ tone, title, children, action }: { tone: "warn" | "bad" | "info" | "ok"; title?: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className={`notice ${tone}`} role={tone === "bad" ? "alert" : "status"}>
      <div style={{ flex: 1 }}>
        {title && <strong>{title}</strong>}
        {children}
      </div>
      {action}
    </div>
  );
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <span>{label}…</span>
    </div>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="state">
      <h3>{title}</h3>
      {children && <p style={{ maxWidth: "46ch", margin: 0 }}>{children}</p>}
      {action}
    </div>
  );
}

/** One truthful failure state for every page: offline, permission denied, or a
 *  server problem. It never falls back to showing stale or invented data. */
export function Failure({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const api = error instanceof ApiError ? error : null;
  const title = api?.kind === "offline" ? "You are offline" : api?.kind === "forbidden" ? "You do not have access to this" : api?.kind === "notFound" ? "Not found" : "This could not be loaded";
  return (
    <div className="state" role="alert">
      <h3>{title}</h3>
      <p style={{ maxWidth: "52ch", margin: 0 }}>{api?.message ?? "Something went wrong. Please try again."}</p>
      {onRetry && api?.kind !== "forbidden" && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("input, textarea, select, button")?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [onClose]);

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref}>
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

/**
 * Confirmation for destructive or high-impact actions. The confirm button stays
 * disabled until the customer types the required word and (when asked) a reason,
 * and it shows the real outcome: the dialog closes only when the action succeeded.
 */
export function ConfirmDialog(props: {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  typeToConfirm?: string;
  requireReason?: boolean;
  danger?: boolean;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = (!props.typeToConfirm || typed.trim() === props.typeToConfirm) && (!props.requireReason || reason.trim().length >= 5);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await props.onConfirm(reason.trim());
      props.onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The action could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title={props.title} onClose={props.onClose}>
      <div>{props.body}</div>
      {props.requireReason && (
        <div className="field" style={{ marginBlockStart: 16 }}>
          <label htmlFor="confirm-reason">Reason (recorded in the audit history)</label>
          <textarea id="confirm-reason" className="textarea" style={{ minHeight: 80 }} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      )}
      {props.typeToConfirm && (
        <div className="field" style={{ marginBlockStart: 16 }}>
          <label htmlFor="confirm-type">
            Type <b>{props.typeToConfirm}</b> to confirm
          </label>
          <input id="confirm-type" className="input" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
        </div>
      )}
      {error && <Notice tone="bad">{error}</Notice>}
      <div className="btn-row">
        <button type="button" className="btn btn-ghost" onClick={props.onClose} disabled={busy}>
          Cancel
        </button>
        <button type="button" className={`btn ${props.danger ? "btn-danger" : "btn-primary"}`} disabled={!ready || busy} onClick={confirm}>
          {busy ? "Working…" : props.confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}

export function Pager({ skip, take, total, onChange }: { skip: number; take: number; total: number; onChange: (skip: number) => void }) {
  if (total <= take) return null;
  const from = total === 0 ? 0 : skip + 1;
  const to = Math.min(skip + take, total);
  return (
    <div className="pager">
      <span>
        {from}-{to} of {total}
      </span>
      <span className="btn-row">
        <button type="button" className="btn btn-ghost btn-sm" disabled={skip === 0} onClick={() => onChange(Math.max(0, skip - take))}>
          Previous
        </button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={to >= total} onClick={() => onChange(skip + take)}>
          Next
        </button>
      </span>
    </div>
  );
}

export function formatDateTime(value: string | null | undefined, locale?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
}
