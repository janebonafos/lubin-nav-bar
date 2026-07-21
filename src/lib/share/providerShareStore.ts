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
  /** Immutable snapshot of the summary at the moment the grant was created. */
  snapshot: SummaryData;
  createdAt: number;
  /** Defaults to 7 days after the appointment. */
  expiresAt: number;
  revoked?: boolean;
  /**
   * When the user picks "Update shared information", we create a new
   * snapshot and bump this timestamp; older snapshots are replaced.
   */
  updatedAt?: number;
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

export function createProviderGrant(input: {
  appointmentId: string;
  providerId?: string;
  providerName: string;
  appointmentLabel: string;
  appointmentTs?: number;
  includedKeys: string[];
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
    snapshot: input.snapshot,
    createdAt: now,
    expiresAt: base + SEVEN_DAYS_MS,
  };
  const store = readStore();
  store[input.appointmentId] = grant;
  writeStore(store);
  return grant;
}

export function updateProviderGrant(
  appointmentId: string,
  patch: { includedKeys?: string[]; snapshot?: SummaryData },
): ProviderShareGrant | null {
  const store = readStore();
  const g = store[appointmentId];
  if (!g) return null;
  const next: ProviderShareGrant = {
    ...g,
    ...(patch.includedKeys ? { includedKeys: patch.includedKeys } : {}),
    ...(patch.snapshot ? { snapshot: patch.snapshot } : {}),
    updatedAt: Date.now(),
  };
  store[appointmentId] = next;
  writeStore(store);
  return next;
}

export function revokeProviderGrant(appointmentId: string): void {
  const store = readStore();
  if (!store[appointmentId]) return;
  store[appointmentId] = { ...store[appointmentId], revoked: true };
  writeStore(store);
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