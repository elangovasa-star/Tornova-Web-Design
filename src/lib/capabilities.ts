// What the signed-in person may do, exactly as the SERVER reports it (GET /api/v1/dashboard/me, "capabilities").
//
// Stage 13B, Part 3: the Dashboard no longer keeps a role -> action table of its own. That table could drift away from the backend; this
// cannot, because it holds no rule at all, only the names the server answers with. Every value is computed by the server from the current
// database state on each call (never from the token), by the same authorization code the endpoints run.
//
// FOR PRESENTATION ONLY. A true capability authorizes nothing: every request is still authorized again by the server. A missing, malformed or
// unknown answer means NOTHING is offered (fail closed), never "everything".

export interface Capabilities {
  manageUsers: boolean;
  manageUserRoles: boolean;
  removeMembers: boolean;
  manageTeams: boolean;
  viewMembers: boolean;
  viewOrganizationDevices: boolean;
  viewOwnTeamDevices: boolean;
  manageTeamRestoreLock: boolean;
  manageMasterLocks: boolean;
  triggerEmergencyStop: boolean;
  resumeEmergencyStop: boolean;
  purchaseSubscription: boolean;
  manageSubscription: boolean;
  viewBilling: boolean;
  viewQuota: boolean;
  modifyPurchasingPower: boolean;
  manageDevices: boolean;
  manageNotificationPreferences: boolean;
  backup: boolean;
  restore: boolean;
  deleteData: boolean;
  /** The gate that stops a restore (for example "OrganizationMasterRestoreLock"), or null when restoring is allowed. */
  restoreBlockedBy: string | null;
}

/** A capability that is a yes/no answer (everything except the gate name). */
export type Capability = Exclude<keyof Capabilities, "restoreBlockedBy">;

/** Nothing is allowed. What the Dashboard uses before the server has answered, and whenever the answer cannot be trusted. */
export const NO_CAPABILITIES: Capabilities = {
  manageUsers: false,
  manageUserRoles: false,
  removeMembers: false,
  manageTeams: false,
  viewMembers: false,
  viewOrganizationDevices: false,
  viewOwnTeamDevices: false,
  manageTeamRestoreLock: false,
  manageMasterLocks: false,
  triggerEmergencyStop: false,
  resumeEmergencyStop: false,
  purchaseSubscription: false,
  manageSubscription: false,
  viewBilling: false,
  viewQuota: false,
  modifyPurchasingPower: false,
  manageDevices: false,
  manageNotificationPreferences: false,
  backup: false,
  restore: false,
  deleteData: false,
  restoreBlockedBy: null,
};

/**
 * Turns whatever the server sent into a complete Capabilities. Only a literal `true` counts as allowed; a missing object (an older server), a
 * missing key, a non-boolean or an unknown key all become "not allowed". Nothing is ever inferred from the role.
 */
export function readCapabilities(raw: unknown): Capabilities {
  if (typeof raw !== "object" || raw === null) return { ...NO_CAPABILITIES };
  const source = raw as Record<string, unknown>;
  const result: Capabilities = { ...NO_CAPABILITIES };
  for (const key of Object.keys(NO_CAPABILITIES) as Array<keyof Capabilities>) {
    if (key === "restoreBlockedBy") continue;
    (result as unknown as Record<string, unknown>)[key] = source[key] === true;
  }
  result.restoreBlockedBy = typeof source.restoreBlockedBy === "string" ? source.restoreBlockedBy : null;
  return result;
}
