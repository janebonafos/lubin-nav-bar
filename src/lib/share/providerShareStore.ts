// Appointment-linked provider share grants.
//
// This is the demo storage layer: grants live in localStorage keyed by
// appointmentId. It is structured as a proper store so a real server-side
// implementation (with an authenticated user, authenticated provider, and
// immutable snapshots on the server) can replace `readStore`/`writeStore`
// without touching call sites.

import type { SummaryData } from "@/lib/share/summary";

export type ProviderShareGrant = {
  appointmentId: string;
  providerId?: string;
  providerName: string;
  appointmentLabel: string; // e.g. "Fri, Jun 28 · 3:00 PM"
  includedKeys: string[];
  /**
   * When set, narrows shared Health Passport details to these field IDs.
   * Undefined means all currently saved details are included.
   */
  healthFieldIds?: string[];
  /** Immutable snapshot of the summary at the moment the grant was created. */
  snapshot: SummaryData;
  createdAt: number;
  /** Defaults to 7 days after the appointment. */
  expiresAt: number;
  revoked?: boolean;
  revokedAt?: number;
  revokeReason?: "user" | "cancelled" | "provider_change";
  /**
   * When the user picks "Update shared information", we create a new
   * snapshot and bump this timestamp; older snapshots are replaced.
   */
  updatedAt?: number;
  /**
   * Version number of the current snapshot. Starts at 1 and increments
   * every time the patient explicitly re-confirms an "Update shared
   * information" flow.
   */
  version?: number;
  /**
   * Consent history: prior snapshots preserved when the patient sends a
   * newer version. Newest previous first.
   */
  previousVersions?: Array<{
    version: number;
    includedKeys: string[];
    healthFieldIds?: string[];
    snapshot: SummaryData;
    createdAt: number;
    replacedAt: number;
  }>;
  /**
   * Set when the appointment is rescheduled. The grant stays active on the
   * old expiration until the user reconfirms against the new date.
   */
  pendingReconfirm?: boolean;
  /** Optional date range covered by the shared snapshot. */
  dateRangeLabel?: string;
};

const STORE_KEY = "lubin.providerShares.v1";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const CHANGE_EVENT = "lubin-provider-shares-change";

function readStore(): Record<string, ProviderShareGrant> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, ProviderShareGrant>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* ignore */
  }
}

export function getProviderGrant(appointmentId: string): ProviderShareGrant | null {
  const g = readStore()[appointmentId];
  if (!g) return null;
  if (g.revoked) return null;
  if (g.expiresAt < Date.now()) return null;
  return g;
}

/** Returns the raw grant regardless of revoked/expired state (for history views). */
export function getAnyProviderGrant(appointmentId: string): ProviderShareGrant | null {
  return readStore()[appointmentId] ?? null;
}

export function createProviderGrant(input: {
  appointmentId: string;
  providerId?: string;
  providerName: string;
  appointmentLabel: string;
  appointmentTs?: number;
  includedKeys: string[];
  healthFieldIds?: string[];
  snapshot: SummaryData;
}): ProviderShareGrant {
  const now = Date.now();
  const base = input.appointmentTs && input.appointmentTs > now ? input.appointmentTs : now;
  const grant: ProviderShareGrant = {
    appointmentId: input.appointmentId,
    providerId: input.providerId,
    providerName: input.providerName,
    appointmentLabel: input.appointmentLabel,
    includedKeys: input.includedKeys,
    healthFieldIds: input.healthFieldIds,
    snapshot: input.snapshot,
    createdAt: now,
    expiresAt: base + SEVEN_DAYS_MS,
    version: 1,
    previousVersions: [],
  };
  const store = readStore();
  store[input.appointmentId] = grant;
  writeStore(store);
  return grant;
}

export function updateProviderGrant(
  appointmentId: string,
  patch: {
    includedKeys?: string[];
    healthFieldIds?: string[];
    snapshot?: SummaryData;
  },
): ProviderShareGrant | null {
  const store = readStore();
  const g = store[appointmentId];
  if (!g) return null;
  const now = Date.now();
  const priorVersion = g.version ?? 1;
  const priorEntry = {
    version: priorVersion,
    includedKeys: g.includedKeys,
    healthFieldIds: g.healthFieldIds,
    snapshot: g.snapshot,
    createdAt: g.updatedAt ?? g.createdAt,
    replacedAt: now,
  };
  const next: ProviderShareGrant = {
    ...g,
    ...(patch.includedKeys ? { includedKeys: patch.includedKeys } : {}),
    ...(patch.healthFieldIds !== undefined
      ? { healthFieldIds: patch.healthFieldIds }
      : {}),
    ...(patch.snapshot ? { snapshot: patch.snapshot } : {}),
    updatedAt: now,
    version: priorVersion + 1,
    previousVersions: [priorEntry, ...(g.previousVersions ?? [])],
  };
  store[appointmentId] = next;
  writeStore(store);
  return next;
}

export function revokeProviderGrant(appointmentId: string): void {
  const store = readStore();
  if (!store[appointmentId]) return;
  store[appointmentId] = {
    ...store[appointmentId],
    revoked: true,
    revokedAt: Date.now(),
    revokeReason: store[appointmentId].revokeReason ?? "user",
  };
  writeStore(store);
}

/** Auto-revoke because the appointment was cancelled. */
export function revokeForAppointmentCancelled(appointmentId: string): void {
  const store = readStore();
  const g = store[appointmentId];
  if (!g || g.revoked) return;
  store[appointmentId] = {
    ...g,
    revoked: true,
    revokedAt: Date.now(),
    revokeReason: "cancelled",
  };
  writeStore(store);
}

/** Auto-revoke because the provider changed. Caller then re-asks the user. */
export function revokeForProviderChange(appointmentId: string): void {
  const store = readStore();
  const g = store[appointmentId];
  if (!g || g.revoked) return;
  store[appointmentId] = {
    ...g,
    revoked: true,
    revokedAt: Date.now(),
    revokeReason: "provider_change",
  };
  writeStore(store);
}

/** Mark a grant as needing reconfirmation after a reschedule. */
export function markGrantPendingReconfirm(appointmentId: string): void {
  const store = readStore();
  const g = store[appointmentId];
  if (!g || g.revoked) return;
  store[appointmentId] = { ...g, pendingReconfirm: true };
  writeStore(store);
}

/** User reconfirmed after a reschedule; extend expiration from the new date. */
export function reconfirmGrant(
  appointmentId: string,
  newAppointmentTs?: number,
): ProviderShareGrant | null {
  const store = readStore();
  const g = store[appointmentId];
  if (!g) return null;
  const now = Date.now();
  const base = newAppointmentTs && newAppointmentTs > now ? newAppointmentTs : now;
  const next: ProviderShareGrant = {
    ...g,
    pendingReconfirm: false,
    expiresAt: base + SEVEN_DAYS_MS,
    updatedAt: now,
  };
  store[appointmentId] = next;
  writeStore(store);
  return next;
}

export function subscribeProviderShares(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORE_KEY) handler();
  };
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener("storage", onStorage);
  };
}