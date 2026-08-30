// Pre-payment "pending" share selection. The user chooses what to share
// on the checkout / booking review page, but the grant is not activated
// until payment succeeds and the appointment is confirmed.

export type PendingShare = {
  bookingKey: string;
  providerName: string;
  providerId: string;
  appointmentLabel: string; // e.g. "Fri, Jun 28 · 3:00 PM"
  includedKeys: string[];
  /** When set, narrows shared assessment results to these attempt IDs. */
  attemptIds?: string[];
  /** When set, narrows shared Health Passport details to these field IDs. */
  healthFieldIds?: string[];
  createdAt: number;
};

const KEY = "lubin.pendingShare.v1";

export function bookingKeyFor(providerId: string, date: string, time: string): string {
  return `${providerId}::${date}::${time}`;
}

function read(): Record<string, PendingShare> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, PendingShare>) : {};
  } catch {
    return {};
  }
}

function write(store: Record<string, PendingShare>) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

export function getPendingShare(bookingKey: string): PendingShare | null {
  return read()[bookingKey] ?? null;
}

export function setPendingShare(share: PendingShare): void {
  const store = read();
  store[share.bookingKey] = share;
  write(store);
}

export function clearPendingShare(bookingKey: string): void {
  const store = read();
  delete store[bookingKey];
  write(store);
}