// Customer wording for the gate the SERVER names when it says something is blocked (R-06: the blocked experience must identify which gate
// stopped it). The Dashboard never works out WHETHER something is blocked: it only explains the reason the server gave.

/** A short reason, for use after "Not allowed - ". Unknown gates get a neutral wording, never a guess. */
export function gateReason(gate: string | null): string | null {
  switch (gate) {
    case null:
      return null;
    case "OrganizationMasterRestoreLock":
      return "your Organization's Restore Lock is on";
    case "TeamRestoreLock":
      return "your Team's Restore Lock is on";
    case "UserRestorePermission":
      return "restore is not turned on for you";
    case "MfaRequired":
      return "restore needs your two-step verification code";
    default:
      return "an administrator's setting stops it";
  }
}

/**
 * Codex Stage 13B final review, P2-2. Why "Move backups to Trash" is unavailable when the server says `deleteData` is false. The server names the
 * gate that blocks RESTORE; it does not name one for delete. The two operations evaluate the same first gates in the same order (role, then the
 * Organization Restore Lock, then the Team Restore Lock), so:
 *   - a lock the server names for Restore is the very lock that also blocks deleting: say so;
 *   - when Restore is ALLOWED, none of those shared gates is the cause, so the remaining reason is the person's own Delete permission: say so;
 *   - anything else (the person's own Restore permission, two-step verification, a gate this page does not know) says nothing certain about
 *     deleting, so the wording is neutral. A reason is never guessed.
 * (A test on the server side pins this equivalence: `AuthorizationServiceTests`, "Delete and Restore share their first gates".)
 */
export function deleteUnavailableNotice(restore: boolean, restoreBlockedBy: string | null): string {
  if (restoreBlockedBy === "OrganizationMasterRestoreLock") {
    return "Your Organization's Restore Lock is on. It also stops removing backups, so you can review this list but cannot remove anything until an Organization Admin turns it off. The server enforces this.";
  }

  if (restoreBlockedBy === "TeamRestoreLock") {
    return "Your Team's Restore Lock is on. It also stops removing backups, so you can review this list but cannot remove anything until your Team Admin or Organization Admin turns it off. The server enforces this.";
  }

  if (restore && restoreBlockedBy === null) {
    return "Your user does not have delete permission, so you can review this list but cannot remove backups. The server enforces this.";
  }

  return "This action is currently unavailable because of your account's restore/delete controls. You can review this list but cannot remove backups. The server enforces this.";
}
