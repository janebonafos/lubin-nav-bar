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
  "A prescription has already been signed from this encounter. Resolve the prescription before changing the appointment outcome to no-show, cancelled, or rescheduled.";

export const UNSIGNED_DRAFT_WARNING =
  "An unsigned prescription draft exists for this appointment. It will remain saved for audit/history but cannot be signed or issued from this encounter after you confirm this outcome.";

/** Confirmation copy for each appointment outcome. */
export type OutcomeCopy = {
  eyebrow: string;
  title: string;
  primaryDescription: string;
  secondaryDescription: string;
  primaryButton: string;
  secondaryButton: string;
};

export const OUTCOME_COPY: Record<AppointmentOutcome, OutcomeCopy> = {
  completed: {
    eyebrow: "APPOINTMENT COMPLETED",
    title: "Mark this appointment as completed?",
    primaryDescription:
      "Use this when the scheduled clinical encounter took place and the visit is finished.",
    secondaryDescription:
      "Your completed notes, client summary, and any prescription decision from this encounter will remain part of the appointment record.",
    primaryButton: "Mark as completed",
    secondaryButton: "Go back",
  },
  client_no_show: {
    eyebrow: "CLIENT DID NOT ATTEND",
    title: "Mark this appointment as a client no-show?",
    primaryDescription:
      "Use this when the client did not attend and a clinical encounter did not take place.",
    secondaryDescription:
      "The prescription step will be marked Not applicable for this appointment. Any unsigned prescription draft will not be issued from this encounter.",
    primaryButton: "Mark as client no-show",
    secondaryButton: "Go back",
  },
  provider_no_show: {
    eyebrow: "PROVIDER DID NOT ATTEND",
    title: "Mark this appointment as a provider no-show?",
    primaryDescription:
      "Use this when the scheduled clinical encounter did not take place because the provider was unavailable.",
    secondaryDescription:
      "The prescription step will be marked Not applicable for this appointment. Any unsigned prescription draft will not be issued from this encounter.",
    primaryButton: "Mark as provider no-show",
    secondaryButton: "Go back",
  },
  cancelled: {
    eyebrow: "APPOINTMENT CANCELLED",
    title: "Mark this appointment as cancelled?",
    primaryDescription:
      "Use this when the appointment was cancelled and the scheduled clinical encounter did not take place.",
    secondaryDescription:
      "The prescription step will be marked Not applicable for this appointment. Any unsigned prescription draft will not be issued from this encounter.",
    primaryButton: "Mark as cancelled",
    secondaryButton: "Go back",
  },
  rescheduled: {
    eyebrow: "APPOINTMENT RESCHEDULED",
    title: "Mark this appointment as rescheduled?",
    primaryDescription:
      "Use this when this appointment will not take place at the original date or time and a new appointment will be scheduled instead.",
    secondaryDescription:
      "The prescription step will be marked Not applicable for this appointment. Prescribing can be completed from the rescheduled encounter if clinically appropriate.",
    primaryButton: "Mark as rescheduled",
    secondaryButton: "Go back",
  },
};

export const SIGNED_RX_MODAL = {
  eyebrow: "SIGNED PRESCRIPTION EXISTS",
  title: "This appointment has a signed prescription",
  description: SIGNED_RX_CONFLICT,
  primaryButton: "Review prescription",
  secondaryButton: "Go back",
};
