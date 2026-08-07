// Prescription audit log. Every signature and every delivery attempt is
// recorded with who signed, under which credentials and jurisdiction, for
// which patient, which prescription version, when, how they authenticated
// and where it was sent.
export type RxAuditAction =
  | "signed"
  | "controlled-signed"
  | "delivery-chosen"
  | "sent-to-pharmacy"
  | "send-failed"
  | "copy-given"
  | "unlocked";

export const RX_AUDIT_LABEL: Record<RxAuditAction, string> = {
  signed: "Prescription signed",
  "controlled-signed": "Controlled prescription signed",
  "delivery-chosen": "Delivery method chosen",
  "sent-to-pharmacy": "Sent to pharmacy",
  "send-failed": "Send to pharmacy failed",
  "copy-given": "Signed copy given to patient",
  unlocked: "Signature withdrawn",
};

export type RxAuditEvent = {
  id: string;
  appointmentId: string;
  at: number;
  action: RxAuditAction;
  providerName: string;
  credentials: string;
  jurisdiction: string;
  patient: string;
  /** Prescription version the action applied to. */
  version: number;
  /** How the prescriber authenticated for this action. */
  authenticationMethod: string;
  destination?: string;
  detail?: string;
};

const KEY = "lubin.prescriptionAudit.v1";
const CHANGE_EVENT = "lubin-prescription-audit-change";

function readAll(): RxAuditEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RxAuditEvent[]) : [];
  } catch {
    return [];
  }
}

export function appendRxAudit(event: Omit<RxAuditEvent, "id" | "at">): RxAuditEvent {
  const full: RxAuditEvent = {
    ...event,
    id: "aud_" + Math.random().toString(36).slice(2, 10),
    at: Date.now(),
  };
  if (typeof window === "undefined") return full;
  try {
    window.localStorage.setItem(KEY, JSON.stringify([full, ...readAll()].slice(0, 500)));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* noop */
  }
  return full;
}

export function loadRxAudit(appointmentId?: string): RxAuditEvent[] {
  const all = readAll();
  return appointmentId ? all.filter((e) => e.appointmentId === appointmentId) : all;
}

export function subscribeRxAudit(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, fn);
  return () => window.removeEventListener(CHANGE_EVENT, fn);
}
