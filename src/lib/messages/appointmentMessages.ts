// Prototype-only message thread attached to an appointment.
// Stored in localStorage; every message is mirrored as a simulated email
// notification to BOTH the client and the provider, and replies always come
// back into this thread so personal email addresses are never exchanged.

export type ThreadRole = "provider" | "client";

export type AppointmentMessage = {
  id: string;
  from: ThreadRole;
  authorName: string;
  body: string;
  at: number;
  /** Masked relay recipients notified by email for this message. */
  notified: string[];
};

const KEY_PREFIX = "lubin:appt-thread:";
const EVENT = "lubin:appt-thread-change";

function key(appointmentId: string) {
  return `${KEY_PREFIX}${appointmentId}`;
}

/** Masked relay address shown in the UI — never a personal inbox. */
export function relayAddress(appointmentId: string, role: ThreadRole) {
  const short = appointmentId.replace(/[^a-z0-9]/gi, "").slice(0, 8).toLowerCase();
  return `${role}-${short}@messages.lubin.care`;
}

export function getThread(appointmentId: string): AppointmentMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key(appointmentId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AppointmentMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function sendMessage(
  appointmentId: string,
  input: { from: ThreadRole; authorName: string; body: string },
): AppointmentMessage {
  const message: AppointmentMessage = {
    id: `m${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    from: input.from,
    authorName: input.authorName,
    body: input.body.trim(),
    at: Date.now(),
    notified: [
      relayAddress(appointmentId, "client"),
      relayAddress(appointmentId, "provider"),
    ],
  };
  const next = [...getThread(appointmentId), message];
  try {
    window.localStorage.setItem(key(appointmentId), JSON.stringify(next));
  } catch {
    /* noop */
  }
  try {
    window.dispatchEvent(
      new CustomEvent(EVENT, { detail: { appointmentId } }),
    );
  } catch {
    /* noop */
  }
  return message;
}

export function subscribeThread(appointmentId: string, handler: () => void) {
  if (typeof window === "undefined") return () => {};
  const onLocal = (e: Event) => {
    const detail = (e as CustomEvent).detail as { appointmentId?: string };
    if (!detail?.appointmentId || detail.appointmentId === appointmentId) handler();
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === key(appointmentId)) handler();
  };
  window.addEventListener(EVENT, onLocal);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, onLocal);
    window.removeEventListener("storage", onStorage);
  };
}

export function formatMessageTime(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}