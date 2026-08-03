// AI-drafted prescriptions per appointment. Demo storage in localStorage,
// keyed by appointmentId. Every medication must be individually approved
// by the clinician before the prescription can be finalised.

export type MedicationOrigin = "ai" | "ai-option" | "manual";

/** State of a patient-specific safety check. A check is never described as
 *  "checked" unless it actually ran — the UI states the real state instead.
 *  "checked" / "unavailable" are legacy values kept for stored drafts. */
export type CheckStatus =
  | "not-run"
  | "info-required"
  | "no-issue"
  | "review-needed"
  | "blocking"
  /** @deprecated legacy */
  | "checked"
  /** @deprecated legacy */
  | "unavailable";

export type MedicationCheck = {
  status: CheckStatus;
  detail: string;
  /** What information this result was based on. */
  informationUsed?: string;
  /** When this check last ran. */
  checkedAt?: number;
};

export type MedicationChecks = {
  allergies?: MedicationCheck;
  currentMedications?: MedicationCheck;
  interactions?: MedicationCheck;
  contraindications?: MedicationCheck;
  conditions?: MedicationCheck;
  monitoring?: MedicationCheck;
  missingInformation?: string;
};

/** Where a piece of patient information came from. */
export type InfoSource = "passport" | "provider" | "review";

export const INFO_SOURCE_LABEL: Record<InfoSource, string> = {
  passport: "From the Health Passport",
  provider: "From provider documentation",
  review: "Added during this review",
};

/** Documentation state of a whole information category. "None known" and
 *  "not documented" are deliberately distinct. */
export type InfoDocState = "documented" | "none-known" | "not-documented";

export type PatientInfoStatus = "active" | "past" | "suspected" | "resolved";

export const INFO_STATUS_LABEL: Record<PatientInfoStatus, string> = {
  active: "Active",
  past: "Past",
  suspected: "Suspected",
  resolved: "Resolved",
};

/** One structured patient-information item. */
export type PatientInfoEntry = {
  id: string;
  name: string;
  detail?: string;
  status?: PatientInfoStatus;
  source?: InfoSource;
  updatedAt?: number;
};

/** Patient information the safety review needs. Captured directly in the
 *  prescription section so the provider never leaves for an unspecified page.
 *  Allergies, current medications and conditions are structured entries; the
 *  free-text fields remain for narrative details only. */
export type PatientSafetyInfo = {
  allergies?: string;
  currentMedications?: string;
  conditions?: string;
  pregnancy?: string;
  labs?: string;
  allergyEntries?: PatientInfoEntry[];
  medicationEntries?: PatientInfoEntry[];
  conditionEntries?: PatientInfoEntry[];
  allergyState?: InfoDocState;
  medicationState?: InfoDocState;
  conditionState?: InfoDocState;
  updatedAt?: number;
};

/** Why the AI prepared this line item — never labelled "AI clinical notes". */
export type DraftBasis = {
  clinicalInformationUsed?: string;
  whyIncluded?: string;
  patientConsiderations?: string;
  missingInformation?: string;
  generatedAt?: number;
};

export type MedicationSource = {
  title: string;
  url?: string;
  revisedAt?: string; // publication / revision date as reported by the source
  jurisdiction?: string;
};

export type MedicationReferenceGeneral = {
  genericName?: string;
  brandNames?: string;
  medicationClass?: string;
  approvedIndications?: string;
  mechanism?: string;
  strengthsForms?: string;
  referenceDosing?: string;
  administration?: string;
  commonAdverseEffects?: string;
  seriousAdverseEffects?: string;
  boxedWarning?: string;
  contraindications?: string;
  interactions?: string;
  monitoring?: string;
  renalHepatic?: string;
  pregnancyLactation?: string;
  discontinuation?: string;
  controlledSubstance?: string;
  availability?: string;
};

export type MedicationReferencePatient = {
  aiRationale?: string;
  targetSymptoms?: string;
  patientInfoConsidered?: string;
  allergiesReviewed?: string;
  currentMedicationsReviewed?: string;
  potentialInteractions?: string;
  relevantConditions?: string;
  previousTrials?: string;
  labMonitoring?: string;
  missingInformation?: string;
};

export type MedicationReference = {
  medicationName: string;
  country: RxCountry;
  general: MedicationReferenceGeneral;
  patient: MedicationReferencePatient;
  sources: MedicationSource[];
  /** False when authoritative prescribing information could not be retrieved. */
  sourcesAvailable: boolean;
  checkedAt: number;
};

export type PrescriptionMedication = {
  id: string;
  name: string;
  genericName?: string;
  dose: string;
  route?: string; // e.g. "Oral"
  frequency: string; // e.g. "Once daily at bedtime"
  duration?: string; // e.g. "4 weeks"
  strength?: string; // strength and formulation, e.g. "50 mg film-coated tablet"
  quantity?: string; // e.g. "30 tablets"
  refills?: string; // e.g. "1 refill"
  indication?: string; // why it's being prescribed
  instructions: string; // patient-facing guidance
  warnings?: string; // side effects / red flags
  rationale?: string; // why AI suggested this, from the visit context
  availabilityNote?: string; // country-specific availability / regulatory note
  origin?: MedicationOrigin; // provenance of this line item
  reference?: MedicationReference; // cached medication reference
  /** Structured basis for the AI-prepared draft. */
  basis?: DraftBasis;
  /** Patient-specific safety checks surfaced on the card. */
  checks?: MedicationChecks;
  /** When the patient-specific safety review last ran for this medication. */
  safetyReviewedAt?: number;
  /** Signature of the clinically significant fields at the moment the safety
   *  review ran. A mismatch means the review is out of date. */
  safetySignature?: string;
  /** Per-check explicit provider acknowledgement, keyed by check name. */
  checkReviews?: Partial<Record<string, number>>;
  /** When the provider ticked the verification acknowledgement. */
  acknowledgedAt?: number;
  /** Pregnancy / breastfeeding status is relevant for this medication. */
  requiresPregnancyStatus?: boolean;
  /** Laboratory or organ-function information is required before prescribing. */
  requiresLabs?: boolean;
  /** True when this medication is a controlled / dangerous drug and needs the
   *  restricted issuing workflow instead of the standard signature. */
  controlled?: boolean;
  controlledLabel?: string;
  /** Sample clinical content for demonstration purposes only. */
  demo?: boolean;
  /** When this medication was individually verified by the clinician. */
  verifiedAt?: number;
  /** Set when the clinician confirmed the medication through another
   *  authoritative source because official information was unavailable. */
  externallyVerifiedAt?: number;
  approved: boolean;
};

export type RxCountry = "US" | "PH";

export type Prescription = {
  appointmentId: string;
  medications: PrescriptionMedication[];
  clinicalNotes?: string;
  country?: RxCountry;
  /** Pharmacy or delivery destination recorded on the final review screen. */
  destination?: string;
  /** Patient information captured for the safety review. */
  patientInfo?: PatientSafetyInfo;
  /** Final legal acknowledgement recorded on the final review screen. */
  legalAcknowledgedAt?: number;
  generatedAt?: number;
  /** Set when the clinician completed the whole-prescription review step. */
  reviewedAt?: number;
  /** Controlled-substance issuing acknowledged on the official form. */
  restrictedAcknowledgedAt?: number;
  /** Set when the clinician recorded that no prescription is needed. */
  skippedAt?: number;
  /** Clinical information the AI needs before a draft can be prepared. */
  missingInformation?: string[];
  /** Sample prescription used for demonstration purposes only. */
  demo?: boolean;
  finalisedAt?: number;
  finalisedBy?: string;
  /** Signature of the clinically significant fields at the moment the
   *  prescribing-information review was confirmed. Any change resets it. */
  verifiedSignature?: string;
  verifiedAt?: number;
  updatedAt: number;
};

/** Fields whose change must reset the prescribing-information verification. */
export function verificationSignature(meds: PrescriptionMedication[]): string {
  return meds
    .map((m) =>
      [m.name, m.dose, m.route ?? "", m.frequency, m.duration ?? ""]
        .map((v) => v.trim().toLowerCase())
        .join("|"),
    )
    .join("~");
}

export function isVerificationCurrent(rx: Prescription): boolean {
  if (!rx.verifiedSignature) return false;
  return rx.verifiedSignature === verificationSignature(rx.medications);
}

export const ORIGIN_LABELS: Record<MedicationOrigin, string> = {
  ai: "AI suggested",
  "ai-option": "Clinician selected from AI options",
  manual: "Added manually by clinician",
};

const KEY_PREFIX = "lubin.prescription.v1:";
const CHANGE_EVENT = "lubin-prescription-change";

function keyFor(id: string) {
  return KEY_PREFIX + id;
}

export function genRxId(): string {
  return "rx_" + Math.random().toString(36).slice(2, 10);
}

export function emptyPrescription(appointmentId: string): Prescription {
  return { appointmentId, medications: [], updatedAt: Date.now() };
}

export function loadPrescription(appointmentId: string): Prescription {
  if (typeof window === "undefined") return emptyPrescription(appointmentId);
  try {
    const raw = window.localStorage.getItem(keyFor(appointmentId));
    if (!raw) return emptyPrescription(appointmentId);
    const parsed = JSON.parse(raw) as Prescription;
    return {
      ...emptyPrescription(appointmentId),
      ...parsed,
      medications: parsed.medications ?? [],
    };
  } catch {
    return emptyPrescription(appointmentId);
  }
}

export function savePrescription(rx: Prescription) {
  if (typeof window === "undefined") return;
  try {
    const next = { ...rx, updatedAt: Date.now() };
    window.localStorage.setItem(keyFor(rx.appointmentId), JSON.stringify(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* noop */
  }
}

export function updatePrescription(
  appointmentId: string,
  patch: Partial<Prescription>,
): Prescription {
  const cur = loadPrescription(appointmentId);
  const next: Prescription = {
    ...cur,
    ...patch,
    medications: patch.medications ?? cur.medications,
    updatedAt: Date.now(),
  };
  savePrescription(next);
  return next;
}

export function subscribePrescription(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, fn);
  return () => window.removeEventListener(CHANGE_EVENT, fn);
}

/** Read the stored provider profile profession — used to decide whether the
 * prescription workflow should be exposed for this account. */
export function getProviderProfession(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("lubin.providerProfile.v1");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { profession?: string };
    return parsed.profession ?? null;
  } catch {
    return null;
  }
}

const PRESCRIBER_PROFESSIONS = [
  "psychiatrist",
  "psychiatric nurse practitioner",
  "doctor",
  "physician",
  "md",
];

export function isPrescriber(profession?: string | null): boolean {
  if (!profession) return false;
  const p = profession.toLowerCase();
  return PRESCRIBER_PROFESSIONS.some((k) => p.includes(k));
}

/** Service / appointment types that can carry a prescription or medication
 *  review. Talk-therapy style sessions never expose the Rx surface, even for
 *  a fully verified prescriber. */
const RX_SERVICE_TYPES = [
  "psychiatry",
  "psychiatric",
  "medication",
  "med review",
  "med check",
  "prescription",
  "follow-up (psychiatry)",
];

export function serviceSupportsPrescription(
  serviceType?: string | null,
  explicit?: boolean,
): boolean {
  if (typeof explicit === "boolean") return explicit;
  if (!serviceType) return false;
  const t = serviceType.toLowerCase();
  return RX_SERVICE_TYPES.some((k) => t.includes(k));
}

/** True only when the provider is (a) in a prescribing profession AND
 *  (b) has verified prescribing credentials on file, AND (c) — when a
 *  client jurisdiction is supplied — is licensed to prescribe there.
 *  The prescription / medication surface must stay hidden until every
 *  condition is true. Being labelled "provider" is never enough. */
export function isVerifiedPrescriber(clientJurisdiction?: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem("lubin.providerProfile.v1");
    if (!raw) return false;
    const parsed = JSON.parse(raw) as {
      profession?: string;
      credentialsVerified?: boolean;
      credentialsVerifiedAt?: number | string;
      prescribingCredentialsVerified?: boolean;
      prescribingJurisdictions?: string[];
    };
    if (!isPrescriber(parsed.profession)) return false;
    const credsOk = !!(
      parsed.prescribingCredentialsVerified ||
      parsed.credentialsVerified ||
      parsed.credentialsVerifiedAt
    );
    if (!credsOk) return false;
    if (!clientJurisdiction) return true;
    const jurisdictions = (parsed.prescribingJurisdictions ?? []).map((j) => j.toLowerCase());
    return jurisdictions.includes(clientJurisdiction.toLowerCase());
  } catch {
    return false;
  }
}
