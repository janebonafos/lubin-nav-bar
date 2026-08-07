// Standard e-prescribing lifecycle. "Verified" is only ever used for an
// individual medication's clinical review — never as the status of the
// prescription as a whole.
import type { Prescription } from "./store";

export type RxStatus =
  | "none"
  | "ai-draft"
  | "review-complete"
  | "ready-to-sign"
  | "signed"
  | "issued";

export const RX_STATUS_LABEL: Record<RxStatus, string> = {
  none: "No prescription prepared",
  "ai-draft": "AI-prepared draft",
  "review-complete": "Clinical review complete",
  "ready-to-sign": "Ready to sign",
  signed: "Signed",
  issued: "Sent / Issued",
};

export const RX_STATUS_HINT: Record<RxStatus, string> = {
  none: "Prepare a draft with AI or add a medication yourself.",
  "ai-draft": "Complete the clinical review for every medication in this draft.",
  "review-complete": "Confirm the prescriber authorisation to unlock signing.",
  "ready-to-sign": "Sign the prescription to make it a legal document.",
  signed: "Choose how this signed prescription reaches the patient.",
  issued: "This prescription has been signed and delivered.",
};

export const RX_STATUS_ORDER: RxStatus[] = [
  "ai-draft",
  "review-complete",
  "ready-to-sign",
  "signed",
  "issued",
];

/** Delivery of a signed prescription — separate from signing. */
export type DeliveryMethod = "pharmacy" | "patient";

export type DeliveryState = "not-chosen" | "sending" | "sent" | "failed" | "given";

export const DELIVERY_STATE_LABEL: Record<DeliveryState, string> = {
  "not-chosen": "Delivery not chosen",
  sending: "Sending to pharmacy…",
  sent: "Sent to pharmacy",
  failed: "Send failed",
  given: "Signed copy given to patient",
};

export function deliveryComplete(rx: Prescription): boolean {
  const s = rx.delivery?.state;
  return s === "sent" || s === "given";
}

/** Single source of truth for the prescription's lifecycle status. */
export function prescriptionStatus(
  rx: Prescription,
  opts: { readyToSign: boolean },
): RxStatus {
  const named = rx.medications.filter((m) => m.name.trim().length > 0);
  if (rx.finalisedAt) return deliveryComplete(rx) ? "issued" : "signed";
  if (named.length === 0) return "none";
  const allReviewed = named.every((m) => m.approved);
  if (!allReviewed) return "ai-draft";
  return opts.readyToSign ? "ready-to-sign" : "review-complete";
}

/** Status text used in compact places (task pills, rails). */
export function prescriptionStatusLabel(rx: Prescription, opts: { readyToSign: boolean }): string {
  const status = prescriptionStatus(rx, opts);
  if (status === "issued") {
    return rx.delivery?.method === "pharmacy" ? "Sent to pharmacy" : "Issued to patient";
  }
  return RX_STATUS_LABEL[status];
}
