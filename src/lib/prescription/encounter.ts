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
      "No clinical encounter took place, so the prescription step is Not applicable for this appointment. Any prescription created here is voided for this encounter: it stays saved for audit and history, but it cannot be signed, issued, or received by the client.",
  },
  provider_no_show: {
    title: "Prescribing is closed — recorded as a provider no-show",
    reason:
      "No clinical encounter took place, so the prescription step is Not applicable for this appointment. Any prescription created here is voided for this encounter: it stays saved for audit and history, but it cannot be signed, issued, or received by the client.",
  },
  cancelled: {
    title: "Prescribing is closed — this appointment is cancelled",
    reason:
      "The scheduled clinical encounter did not take place, so the prescription step is Not applicable for this appointment. Any prescription created here is voided for this encounter and will not reach the client, though it stays saved for audit and history.",
  },
  rescheduled: {
    title: "Prescribing has moved to the rescheduled appointment",
    reason:
      "The prescription step is Not applicable for this appointment, so any prescription created here is voided for this encounter and will not reach the client. Prescribing can be completed again from the rescheduled appointment if clinically appropriate.",
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
  "A prescription has already been signed from this appointment, so this outcome cannot be recorded yet. Keeping the appointment as Completed is what lets the client receive it. If the medication should not stand, void the signed prescription first — voiding is permanent and the client will not receive it.";

export const UNSIGNED_DRAFT_WARNING =
  "A prescription has already been created for this appointment. Continuing with this outcome voids it for this encounter — it stays saved for audit and history, but it can no longer be signed or issued, and the client will not receive any medication. Mark the appointment as Completed instead if the prescription should reach the client.";

export const RX_COMPLETED_RELEASE_NOTE =
  "A prescription has been created for this appointment. Marking it Completed keeps the prescription valid, so it can be signed and issued and the client can receive it.";

/** Confirmation copy for each appointment outcome. */
export type OutcomeCopy = {
  eyebrow: string;
  title: string;
  primaryDescription: string;
  secondaryDescription: string;
  primaryButton: string;
  secondaryButton: string;
};

const PRESCRIBER_OUTCOME_COPY: Record<AppointmentOutcome, OutcomeCopy> = {
  completed: {
    eyebrow: "APPOINTMENT COMPLETED",
    title: "Mark this appointment as completed?",
    primaryDescription:
      "Use this when the scheduled clinical encounter took place and the visit is finished. This is the only outcome that keeps prescribing open, so a prescription created here can be signed, issued and received by the client.",
    secondaryDescription:
      "Your clinical notes, the client summary and any prescription decision from this encounter stay part of the appointment record.",
    primaryButton: "Mark as completed",
    secondaryButton: "Go back",
  },
  client_no_show: {
    eyebrow: "CLIENT DID NOT ATTEND",
    title: "Mark this appointment as a client no-show?",
    primaryDescription:
      "Use this when the client did not attend and a clinical encounter did not take place.",
    secondaryDescription:
      "The prescription step becomes Not applicable for this appointment. Any prescription already created here is voided for this encounter — it stays saved for audit and history, but it cannot be signed or issued and the client will not receive it. Choose Completed instead if the prescription should reach the client.",
    primaryButton: "Mark as client no-show",
    secondaryButton: "Go back",
  },
  provider_no_show: {
    eyebrow: "PROVIDER DID NOT ATTEND",
    title: "Mark this appointment as a provider no-show?",
    primaryDescription:
      "Use this when the scheduled clinical encounter did not take place because the provider was unavailable.",
    secondaryDescription:
      "The prescription step becomes Not applicable for this appointment. Any prescription already created here is voided for this encounter — it stays saved for audit and history, but it cannot be signed or issued and the client will not receive it. Choose Completed instead if the prescription should reach the client.",
    primaryButton: "Mark as provider no-show",
    secondaryButton: "Go back",
  },
  cancelled: {
    eyebrow: "APPOINTMENT CANCELLED",
    title: "Mark this appointment as cancelled?",
    primaryDescription:
      "Use this when the appointment was cancelled and the scheduled clinical encounter did not take place.",
    secondaryDescription:
      "The prescription step becomes Not applicable for this appointment. Any prescription already created here is voided for this encounter — it stays saved for audit and history, but it cannot be signed or issued and the client will not receive it. Choose Completed instead if the prescription should reach the client.",
    primaryButton: "Mark as cancelled",
    secondaryButton: "Go back",
  },
  rescheduled: {
    eyebrow: "APPOINTMENT RESCHEDULED",
    title: "Mark this appointment as rescheduled?",
    primaryDescription:
      "Use this when this appointment will not take place at the original date or time and a new appointment will be scheduled instead.",
    secondaryDescription:
      "The prescription step becomes Not applicable for this appointment, so any prescription created here is voided for this encounter and will not reach the client. Prescribing can be completed again from the rescheduled appointment if clinically appropriate.",
    primaryButton: "Mark as rescheduled",
    secondaryButton: "Go back",
  },
};

const NON_PRESCRIBER_OUTCOME_COPY: Record<AppointmentOutcome, OutcomeCopy> = {
  completed: {
    eyebrow: "APPOINTMENT COMPLETED",
    title: "Mark this appointment as completed?",
    primaryDescription:
      "Use this when the scheduled clinical encounter took place and the visit is finished.",
    secondaryDescription:
      "Your clinical notes and the client summary from this encounter stay part of the appointment record. The session status will be updated to completed.",
    primaryButton: "Mark as completed",
    secondaryButton: "Go back",
  },
  client_no_show: {
    eyebrow: "CLIENT DID NOT ATTEND",
    title: "Mark this appointment as a client no-show?",
    primaryDescription:
      "Use this when the client did not attend and a clinical encounter did not take place.",
    secondaryDescription:
      "The session status will be updated to client no-show. The appointment will be recorded as not delivered.",
    primaryButton: "Mark as client no-show",
    secondaryButton: "Go back",
  },
  provider_no_show: {
    eyebrow: "PROVIDER DID NOT ATTEND",
    title: "Mark this appointment as a provider no-show?",
    primaryDescription:
      "Use this when the scheduled clinical encounter did not take place because the provider was unavailable.",
    secondaryDescription:
      "The session status will be updated to provider no-show. The appointment will be recorded as not delivered.",
    primaryButton: "Mark as provider no-show",
    secondaryButton: "Go back",
  },
  cancelled: {
    eyebrow: "APPOINTMENT CANCELLED",
    title: "Mark this appointment as cancelled?",
    primaryDescription:
      "Use this when the appointment was cancelled and the scheduled clinical encounter did not take place.",
    secondaryDescription:
      "The session status will be updated to cancelled. The appointment will be recorded as not delivered.",
    primaryButton: "Mark as cancelled",
    secondaryButton: "Go back",
  },
  rescheduled: {
    eyebrow: "APPOINTMENT RESCHEDULED",
    title: "Mark this appointment as rescheduled?",
    primaryDescription:
      "Use this when this appointment will not take place at the original date or time and a new appointment will be scheduled instead.",
    secondaryDescription:
      "The session status will be updated to rescheduled. A new appointment will be scheduled separately.",
    primaryButton: "Mark as rescheduled",
    secondaryButton: "Go back",
  },
};

export const OUTCOME_COPY = PRESCRIBER_OUTCOME_COPY;

export function getOutcomeCopy(
  outcome: AppointmentOutcome,
  isPrescriber: boolean,
): OutcomeCopy {
  return isPrescriber ? PRESCRIBER_OUTCOME_COPY[outcome] : NON_PRESCRIBER_OUTCOME_COPY[outcome];
}


export const SIGNED_RX_MODAL = {
  eyebrow: "SIGNED PRESCRIPTION EXISTS",
  title: "A signed prescription already exists for this appointment",
  description: SIGNED_RX_CONFLICT,
  primaryButton: "Review prescription",
  secondaryButton: "Go back",
};
