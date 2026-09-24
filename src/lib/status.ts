// Customer-facing status logic. Two rules are locked (docs/stage9/09 sections 5, 6):
//   1. Connection Status and Backup Result are SEPARATE facts and are never merged.
//   2. Nothing is ever shown as Successful unless the server says the whole
//      intended operation completed. Anything unknown stays "Unknown".

export type Tone = "ok" | "warn" | "bad" | "info" | "neutral";

export interface StatusView {
  label: string;
  tone: Tone;
  detail?: string;
}

export interface SessionLike {
  status: string;
  outcomeReason: string;
  filesSkipped?: number;
  errorCount?: number;
}

const PARTIAL: StatusView = { label: "Partially Completed", tone: "warn", detail: "Some files were protected; some need attention." };

export function backupResult(session: SessionLike | null | undefined): StatusView {
  if (!session) {
    return { label: "No backup yet", tone: "neutral", detail: "This device has not completed a backup." };
  }

  const { status, outcomeReason } = session;
  if (status === "Queued" || status === "Preparing" || status === "Running" || status === "Finalizing") {
    return { label: "In progress", tone: "info" };
  }

  // Partial first: a run that finished with anything unresolved is never "Successful".
  if (status === "CompletedWithWarnings" || outcomeReason === "PartiallyCompleted") {
    return PARTIAL;
  }

  if (status === "Completed" && (outcomeReason === "Success" || outcomeReason === "None")) {
    return (session.filesSkipped ?? 0) > 0 || (session.errorCount ?? 0) > 0 ? PARTIAL : { label: "Successful", tone: "ok" };
  }

  if (status === "Cancelled") {
    switch (outcomeReason) {
      case "CustomerCancelled":
        return { label: "Cancelled", tone: "neutral", detail: "The backup was cancelled from the device." };
      case "EmergencyStopped":
        return { label: "Stopped by Emergency Stop", tone: "bad" };
      case "SystemTimeout":
        return { label: "Interrupted", tone: "bad", detail: "The backup did not finish and was closed by Tornova." };
      default:
        return { label: "Interrupted", tone: "bad" };
    }
  }

  if (status === "Failed" || outcomeReason === "Failed") {
    return { label: "Failed", tone: "bad" };
  }

  return { label: "Unknown", tone: "neutral", detail: "Tornova could not determine the result." };
}

/** A device that has spoken to Tornova recently. The Agent polls about once a
 *  minute, so a few missed polls means "Not Connected". */
export const CONNECTED_WINDOW_MS = 5 * 60 * 1000;

export function connectionStatus(device: { status: string; lastSeenAtUtc?: string | null }, now: Date = new Date()): StatusView {
  if (device.status !== "Active") {
    return { label: "Previous device", tone: "neutral", detail: "Unregistered. Its backups remain available for restore." };
  }

  if (!device.lastSeenAtUtc) {
    return { label: "Never connected", tone: "neutral" };
  }

  const age = now.getTime() - new Date(device.lastSeenAtUtc).getTime();
  return age <= CONNECTED_WINDOW_MS ? { label: "Connected", tone: "ok" } : { label: "Not Connected", tone: "warn" };
}

export type HealthLevel = "healthy" | "attention" | "critical" | "unknown";

export interface HealthSummary {
  level: HealthLevel;
  headline: string;
  counts: { devices: number; successful: number; attention: number; failed: number; noBackup: number; notConnected: number };
}

export interface HealthDevice {
  status: string;
  lastSeenAtUtc?: string | null;
  lastSession?: SessionLike | null;
}

/** Overall Backup Health for the first dashboard screen. With no data it is
 *  "unknown" - never "healthy" by default. */
export function summarizeHealth(devices: HealthDevice[] | null | undefined, now: Date = new Date()): HealthSummary {
  const counts = { devices: 0, successful: 0, attention: 0, failed: 0, noBackup: 0, notConnected: 0 };
  if (!devices) {
    return { level: "unknown", headline: "Backup health is not available right now.", counts };
  }

  const active = devices.filter((d) => d.status === "Active");
  counts.devices = active.length;
  if (active.length === 0) {
    return { level: "unknown", headline: "No device is registered yet.", counts };
  }

  for (const device of active) {
    const result = backupResult(device.lastSession);
    if (result.label === "Successful") counts.successful++;
    else if (result.tone === "bad") counts.failed++;
    else if (result.label === "No backup yet") counts.noBackup++;
    else if (result.tone === "warn") counts.attention++;
    if (connectionStatus(device, now).label !== "Connected") counts.notConnected++;
  }

  if (counts.failed > 0) {
    return { level: "critical", headline: `${counts.failed} device${counts.failed === 1 ? "" : "s"} had a failed or interrupted backup.`, counts };
  }

  if (counts.attention > 0 || counts.noBackup > 0 || counts.notConnected > 0) {
    return { level: "attention", headline: "Some devices need your attention.", counts };
  }

  return { level: "healthy", headline: "All devices completed their last backup successfully.", counts };
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return "-";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value >= 100 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

/** Quota warnings are locked at 90% and 95% (Q-06); 100% blocks new backup. */
export function quotaWarning(usedBytes: number, totalBytes: number): StatusView | null {
  if (!(totalBytes > 0)) return null;
  const percent = (usedBytes / totalBytes) * 100;
  if (percent >= 100) return { label: "Storage full", tone: "bad", detail: "New backups are blocked until storage is freed or expanded." };
  if (percent >= 95) return { label: "95% of storage used", tone: "bad" };
  if (percent >= 90) return { label: "90% of storage used", tone: "warn" };
  return null;
}
