import { describe, expect, it } from "vitest";
import { backupResult, connectionStatus, quotaWarning, summarizeHealth } from "./status";

const now = new Date("2026-09-19T10:00:00Z");
const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();

describe("backup result - never a false Success", () => {
  it("is Successful only for a completed run with nothing unresolved", () => {
    expect(backupResult({ status: "Completed", outcomeReason: "Success" }).label).toBe("Successful");
  });

  it.each([
    [{ status: "CompletedWithWarnings", outcomeReason: "Success" }],
    [{ status: "Completed", outcomeReason: "PartiallyCompleted" }],
    [{ status: "Completed", outcomeReason: "Success", filesSkipped: 2 }],
    [{ status: "Completed", outcomeReason: "Success", errorCount: 1 }],
  ])("shows Partially Completed for %o", (session) => expect(backupResult(session).label).toBe("Partially Completed"));

  it.each([
    ["Failed", "Failed", "Failed"],
    ["Cancelled", "SystemTimeout", "Interrupted"],
    ["Cancelled", "EmergencyStopped", "Stopped by Emergency Stop"],
    ["Cancelled", "CustomerCancelled", "Cancelled"],
    ["Running", "None", "In progress"],
  ])("%s / %s -> %s", (status, outcomeReason, label) => {
    const view = backupResult({ status, outcomeReason });
    expect(view.label).toBe(label);
    expect(view.tone).not.toBe("ok");
  });

  it("treats missing or unrecognised data as unknown, never as success", () => {
    expect(backupResult(null).label).toBe("No backup yet");
    expect(backupResult({ status: "SomethingNew", outcomeReason: "None" }).label).toBe("Unknown");
    expect(backupResult({ status: "SomethingNew", outcomeReason: "None" }).tone).not.toBe("ok");
  });
});

describe("connection status is separate from the backup result", () => {
  it("reports Connected / Not Connected from the last contact only", () => {
    expect(connectionStatus({ status: "Active", lastSeenAtUtc: ago(1) }, now).label).toBe("Connected");
    expect(connectionStatus({ status: "Active", lastSeenAtUtc: ago(30) }, now).label).toBe("Not Connected");
    expect(connectionStatus({ status: "Active", lastSeenAtUtc: null }, now).label).toBe("Never connected");
    expect(connectionStatus({ status: "Unregistered", lastSeenAtUtc: ago(1) }, now).label).toBe("Previous device");
  });

  it("a connected device with a failed backup is critical, not healthy", () => {
    const health = summarizeHealth([{ status: "Active", lastSeenAtUtc: ago(1), lastSession: { status: "Failed", outcomeReason: "Failed" } }], now);
    expect(health.level).toBe("critical");
  });
});

describe("overall Backup Health", () => {
  const ok = { status: "Active", lastSeenAtUtc: ago(1), lastSession: { status: "Completed", outcomeReason: "Success" } };

  it("is unknown when there is no data - never healthy by default", () => {
    expect(summarizeHealth(null, now).level).toBe("unknown");
    expect(summarizeHealth([], now).level).toBe("unknown");
  });

  it("is healthy only when every active device is connected and successful", () => {
    expect(summarizeHealth([ok, ok], now).level).toBe("healthy");
    expect(summarizeHealth([ok, { ...ok, lastSeenAtUtc: ago(90) }], now).level).toBe("attention");
    expect(summarizeHealth([ok, { ...ok, lastSession: null }], now).level).toBe("attention");
    expect(summarizeHealth([ok, { ...ok, lastSession: { status: "CompletedWithWarnings", outcomeReason: "PartiallyCompleted" } }], now).level).toBe("attention");
  });

  it("ignores previous devices when judging health", () => {
    const previous = { status: "Unregistered", lastSeenAtUtc: ago(9999), lastSession: { status: "Failed", outcomeReason: "Failed" } };
    expect(summarizeHealth([ok, previous], now).level).toBe("healthy");
  });
});

describe("quota warnings at the locked thresholds", () => {
  it.each([
    [89.9, null],
    [90, "90% of storage used"],
    [94.9, "90% of storage used"],
    [95, "95% of storage used"],
    [100, "Storage full"],
  ])("%s%% -> %s", (percent, label) => expect(quotaWarning(percent, 100)?.label ?? null).toBe(label));
});
