/**
 * Appointment outcome → prescribing encounter rules.
 *
 * A prescription may only be created, signed or issued against an appointment
 * that actually happened as a clinical encounter. No-shows, cancellations and
 * rescheduled slots are not prescribing encounters: the medication workflow is
 * closed on them, and any signed prescription must be resolved through the
 * void/cancel lifecycle rather than by rewriting the appointment outcome.
 */
export type AppointmentOutcome =
  | "completed"
  | "client_no_show"
  | "provider_no_show"
  | "cancelled"
  | "rescheduled";

export type EncounterBlock = { title: string; reason: string };

const BLOCKED: Record<Exclude<AppointmentOutcome, "completed">, EncounterBlock> = {
  client_no_show: {
    title: "Prescribing is closed — recorded as a client no-show",
    reason:
      "No clinical encounter took place, so a prescription cannot be created, signed or issued for this appointment. Prescribe from a completed appointment instead.",
  },
  provider_no_show: {
    title: "Prescribing is closed — recorded as a provider no-show",
    reason:
      "No clinical encounter took place, so a prescription cannot be created, signed or issued for this appointment.",
  },
  cancelled: {
    title: "Prescribing is closed — this appointment is cancelled",
    reason:
      "A cancelled appointment is not a prescribing encounter. Medication decisions belong to an appointment that was delivered.",
  },
  rescheduled: {
    title: "Prescribing has moved to the rescheduled appointment",
    reason:
      "This slot is closed. The prescription workflow becomes available on the rescheduled encounter when it is delivered and clinically appropriate.",
  },
};

/** Null when prescribing may proceed for this outcome. */
export function encounterPrescribingBlock(
  outcome?: AppointmentOutcome | null,
): EncounterBlock | null {
  if (!outcome || outcome === "completed") return null;
  return BLOCKED[outcome];
}

export function outcomeAllowsPrescribing(outcome?: AppointmentOutcome | null): boolean {
  return encounterPrescribingBlock(outcome) === null;
}

export const SIGNED_RX_CONFLICT =
  "A signed prescription exists for this appointment. It cannot be changed to a no-show, cancelled or rescheduled outcome. Resolve the prescription first — void it using the prescription lifecycle in step 3 — so the signed document and its audit history are preserved.";

export const UNSIGNED_DRAFT_WARNING =
  "An unsigned prescription draft exists for this appointment. If you close it with this outcome, the draft will no longer be associated with an active prescribing encounter and cannot be signed or issued here.";
