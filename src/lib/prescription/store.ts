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
  bipolarHistory?: MedicationCheck;
  pregnancy?: MedicationCheck;
  age?: MedicationCheck;
  organFunction?: MedicationCheck;
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

/** Structured pregnancy / lactation status. "Not documented" is never "no". */
export type PregnancyStatus =
  | "pregnant"
  | "breastfeeding"
  | "trying"
  | "not-pregnant"
  | "not-applicable"
  | "not-documented";

export const PREGNANCY_STATUS_LABEL: Record<PregnancyStatus, string> = {
  pregnant: "Pregnant",
  breastfeeding: "Breastfeeding",
  trying: "Trying to conceive",
  "not-pregnant": "Not pregnant / not breastfeeding",
  "not-applicable": "Not applicable",
  "not-documented": "Unknown / not assessed",
};

/** Bipolar / mania history is a distinct screening question, not a free-text note. */
export type HistoryState = "present" | "none-known" | "not-documented";

export const HISTORY_STATE_LABEL: Record<HistoryState, string> = {
  present: "Documented history",
  "none-known": "None known",
  "not-documented": "Not assessed / not documented",
};

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
  /** Medication entries: structured prescribing detail for interaction checking. */
  strength?: string;
  dose?: string;
  frequency?: string;
  route?: string;
  /** Medication entries: is the patient actively taking it right now? */
  taking?: "yes" | "no" | "unknown";
  /** Allergy entries: reaction, severity and allergy vs intolerance. */
  reaction?: string;
  severity?: "mild" | "moderate" | "severe" | "unknown";
  reactionType?: "allergy" | "intolerance" | "unknown";
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
  /** Structured pregnancy / lactation status. */
  pregnancyStatus?: PregnancyStatus;
  /** Date of birth (ISO yyyy-mm-dd) and/or age in years. */
  dob?: string;
  ageYears?: number;
  /** Date of birth is genuinely unavailable — never treated as "none known". */
  dobUnavailable?: boolean;
  /** Patient address as printed on the legal prescription layer. Required in
   *  the U.S.; recorded where it is legally required. */
  address?: string;
  /** Date the recorded laboratory / organ-function result was taken. */
  labsAt?: string;
  /** Sex recorded on the prescription (required on a PH prescription). */
  sex?: "female" | "male" | "intersex" | "prefer-not-to-say" | "not-documented";
  /** Bipolar or mania history screening result. */
  bipolarHistory?: HistoryState;
  bipolarDetail?: string;
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

/** How authoritative a linked document is. Never call everything "official". */
export type SourceKind = "label" | "formulary" | "secondary" | "ai";

export const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  label: "Official approved product label",
  formulary: "Government formulary or reference",
  secondary: "Secondary drug reference",
  ai: "AI-generated explanation",
};

export type MedicationSource = {
  title: string;
  url?: string;
  revisedAt?: string; // publication / revision date as reported by the source
  jurisdiction?: string;
  /** Category of the document. Defaults to "secondary" when unknown. */
  kind?: SourceKind;
  /** Publisher / organisation as reported by the source. */
  organisation?: string;
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
  /** Why laboratory or organ-function information is required for this
   *  medication and patient. Required whenever requiresLabs is true. */
  labsReason?: string;
  /** Bipolar / mania screening is required before this medication (e.g. an
   *  antidepressant started as monotherapy). */
  requiresBipolarScreen?: boolean;
  /** Provider acknowledgement of the shared assessment safety response. */
  sharedSafetyAcknowledgedAt?: number;
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
  /** AI-suggested medications for the prescriber's consideration only.
   *  A suggestion is NOT part of the prescription: it carries no directions
   *  the provider has accepted, is never signed, and must be explicitly
   *  accepted into the draft (and then verified) before it can be issued. */
  suggestions?: PrescriptionMedication[];
  /** When suggestions were last prepared. */
  suggestedAt?: number;
  clinicalNotes?: string;
  country?: RxCountry;
  /** Legacy free-text destination from earlier drafts. Replaced by `delivery`. */
  destination?: string;
  /** Delivery of the signed prescription — chosen only after signing. */
  delivery?: {
    method: "pharmacy" | "patient";
    state: "not-chosen" | "sending" | "sent" | "failed" | "given";
    pharmacyId?: string;
    /** Resolved destination line stored with the signed document. */
    destination?: string;
    error?: string;
    attempts?: number;
    at?: number;
  };
  /** How the prescriber authenticated the signature. */
  signature?: {
    method: "password-reauth" | "epcs-two-factor" | "credentialed-attestation" | "two-factor";
    at: number;
    by: string;
    credentials: string;
    jurisdiction: RxCountry;
    /** Content hash the signature is bound to. */
    documentHash?: string;
    /** Prescription version the signature covers. */
    version?: number;
    /** Human-readable description of how the prescriber authenticated. */
    methodLabel?: string;
  };
  /** Set when a signed prescription was edited, voiding its signature. */
  signatureInvalidatedAt?: number;
  /** Content hash of the prescription that was signed, kept for comparison. */
  signedHash?: string;
  /** Increments whenever medications or directions change after a signature. */
  version?: number;
  /** Signed clinical document created at signing, stored in the patient record. */
  documentId?: string;
  /** Controlled-substance authority captured for the restricted workflow. */
  controlledAuth?: {
    deaNumber?: string;
    deaConfirmedAt?: number;
    twoFactorAt?: number;
    s2Number?: string;
    s2SerialNumber?: string;
  };
  /** Patient information captured for the safety review. */
  patientInfo?: PatientSafetyInfo;
  /** Final legal acknowledgement recorded on the final review screen. */
  legalAcknowledgedAt?: number;
  /** Record-integrity attestation recorded on the final review screen. */
  recordAttestedAt?: number;
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
  let next: Prescription = {
    ...cur,
    ...patch,
    medications: patch.medications ?? cur.medications,
    updatedAt: Date.now(),
  };
  next = invalidateSignatureIfEdited(cur, next, patch);
  savePrescription(next);
  return next;
}

/** A signature covers one exact prescription version. If a signed
 *  prescription is edited, the signature is void and the prescription returns
 *  to clinical review at a new version. */
function invalidateSignatureIfEdited(
  cur: Prescription,
  next: Prescription,
  patch: Partial<Prescription>,
): Prescription {
  // Signing and delivery themselves are not edits.
  if (!cur.finalisedAt || patch.finalisedAt !== undefined || patch.delivery !== undefined)
    return next;
  const before = signedContentKey(cur);
  const after = signedContentKey(next);
  if (before === after) return next;
  return {
    ...next,
    finalisedAt: undefined,
    finalisedBy: undefined,
    legalAcknowledgedAt: undefined,
    recordAttestedAt: undefined,
    signature: undefined,
    signedHash: undefined,
    documentId: undefined,
    delivery: undefined,
    signatureInvalidatedAt: Date.now(),
    version: (cur.version ?? 1) + 1,
  };
}

/** Everything a signature covers, flattened for change detection. */
function signedContentKey(rx: Prescription): string {
  return JSON.stringify([
    rx.medications
      .filter((m) => m.name.trim().length > 0)
      .map((m) =>
        [
          m.genericName ?? "",
          m.name,
          m.strength ?? "",
          m.dose,
          m.route ?? "",
          m.frequency,
          m.duration ?? "",
          m.quantity ?? "",
          m.refills ?? "",
          m.instructions ?? "",
          m.controlled ? "c" : "",
        ].join("|"),
      )
      .sort(),
    rx.patientInfo?.sex ?? "",
    rx.patientInfo?.dob ?? "",
    rx.patientInfo?.ageYears ?? "",
  ]);
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
