// Prototype-only prescription fee state. Design placeholder: real payment and
// pricing come from the production system. Stored locally per record id.
import type { SignedPrescriptionDocument } from "./documents";

export const PRESCRIPTION_FEE = 500;
export const FEE_LABEL = "₱500";

export type PaymentState = "awaiting" | "paid" | "promo";
export type PaymentRecord = { state: PaymentState; at?: number };

const KEY = "lubin.rxPayments.v1";
const EVENT = "lubin-rx-payments-change";
const DAY = 24 * 60 * 60 * 1000;

function read(): Record<string, PaymentRecord> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function loadPayments() {
  return read();
}

export function markPaid(id: string, promo: boolean) {
  if (typeof window === "undefined") return;
  const all = read();
  all[id] = { state: promo ? "promo" : "paid", at: Date.now() };
  window.localStorage.setItem(KEY, JSON.stringify(all));
  window.dispatchEvent(new Event(EVENT));
}

export function resetPayments() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

export function subscribePayments(fn: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}

export type DemoPaymentRow = {
  doc: SignedPrescriptionDocument;
  /** Initial payment state before anything is stored locally. */
  initial: PaymentState;
  /** Deadline to pay; after it passes an unpaid record expires at no charge. */
  payBy?: number;
  requestNote: string;
};

/** Fictional placeholder records cloned from an existing document so every
 *  payment state can be reviewed. Never written to the real record store. */
export function buildDemoPaymentRows(template: SignedPrescriptionDocument | undefined): DemoPaymentRow[] {
  if (!template) return [];
  const now = Date.now();
  const med = template.medications[0];
  const make = (
    id: string,
    seq: string,
    signedAt: number,
    name: string,
    extra: Partial<SignedPrescriptionDocument> = {},
  ): SignedPrescriptionDocument => ({
    ...template,
    id,
    number: `LBN-PH-${stamp(signedAt)}-${seq}`,
    signedAt,
    signedBy: "Maria Santos",
    identity: { ...template.identity, fullName: "Maria Santos" },
    medications: med ? [{ ...med, name, genericName: name }] : [],
    validUntil: signedAt + 30 * DAY,
    voided: undefined,
    ...extra,
  });
  return [
    {
      doc: make("demo_pay_1", "0101", now - 2 * 60 * 60 * 1000, "Sertraline hydrochloride"),
      initial: "awaiting",
      payBy: now + 7 * DAY,
      requestNote: "Renewal requested in chat — sertraline 50 mg.",
    },
    {
      doc: make("demo_pay_2", "0087", now - 6 * DAY, "Escitalopram oxalate"),
      initial: "awaiting",
      payBy: now + 20 * 60 * 60 * 1000,
      requestNote: "New prescription requested in chat — anxiety support.",
    },
    {
      doc: make("demo_pay_3", "0042", now - 60 * DAY, "Fluoxetine hydrochloride", {
        validUntil: now - 20 * DAY,
      }),
      initial: "paid",
      requestNote: "Renewal requested in chat.",
    },
    {
      doc: make("demo_pay_4", "0031", now - 40 * DAY, "Mirtazapine"),
      initial: "awaiting",
      payBy: now - 33 * DAY,
      requestNote: "New prescription requested in chat — sleep.",
    },
    {
      doc: make("demo_pay_5", "0019", now - 50 * DAY, "Bupropion hydrochloride", {
        voided: { at: now - 48 * DAY, reason: "Issued in error", by: "Maria Santos" },
      }),
      initial: "paid",
      requestNote: "Renewal requested in chat.",
    },
  ];
}

function stamp(at: number) {
  const d = new Date(at);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}
