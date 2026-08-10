// Cross-tab + in-app event bus for appointment state changes.
// Lets the appointments list lock a row when an action is in-flight
// (in another tab) and refresh ASAP when that action completes.

export type AppointmentEvent =
  | { type: "lock"; id: string; action: "cancel" | "reschedule" }
  | { type: "unlock"; id: string }
  | { type: "cancelled"; id: string }
  | { type: "rescheduled"; id: string; date?: string; time?: string }
  | { type: "appt-updated"; id: string; patch: Record<string, unknown> };

const CHANNEL = "lubin-appointments";
const STORAGE_KEY = "lubin:appt-event";
/** Same-tab delivery: BroadcastChannel never echoes to the sending tab, and
 *  `storage` events never fire in the tab that wrote them. */
const LOCAL_EVENT = "lubin-appointments-local";

let bc: BroadcastChannel | null = null;
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    bc = new BroadcastChannel(CHANNEL);
  } catch {
    bc = null;
  }
}

export function publishAppointmentEvent(evt: AppointmentEvent) {
  if (typeof window === "undefined") return;
  try {
    bc?.postMessage(evt);
  } catch {
    /* noop */
  }
  try {
    window.dispatchEvent(new CustomEvent(LOCAL_EVENT, { detail: evt }));
  } catch {
    /* noop */
  }
  try {
    // storage event fallback for browsers without BroadcastChannel
    const payload = JSON.stringify({ ...evt, _ts: Date.now() });
    window.localStorage.setItem(STORAGE_KEY, payload);
  } catch {
    /* noop */
  }
}

export function subscribeAppointmentEvents(
  handler: (evt: AppointmentEvent) => void,
) {
  if (typeof window === "undefined") return () => {};
  const onBc = (e: MessageEvent) => handler(e.data as AppointmentEvent);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return;
    try {
      const parsed = JSON.parse(e.newValue) as AppointmentEvent;
      handler(parsed);
    } catch {
      /* noop */
    }
  };
  bc?.addEventListener("message", onBc);
  window.addEventListener("storage", onStorage);
  const onLocal = (e: Event) => handler((e as CustomEvent).detail as AppointmentEvent);
  window.addEventListener(LOCAL_EVENT, onLocal);
  return () => {
    bc?.removeEventListener("message", onBc);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(LOCAL_EVENT, onLocal);
  };
}