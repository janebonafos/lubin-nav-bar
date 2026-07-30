// AI-drafted prescriptions per appointment. Demo storage in localStorage,
// keyed by appointmentId. Every medication must be individually approved
// by the clinician before the prescription can be finalised.

export type PrescriptionMedication = {
  id: string;
  name: string;
  genericName?: string;
  dose: string;
  route?: string; // e.g. "Oral"
  frequency: string; // e.g. "Once daily at bedtime"
  duration?: string; // e.g. "4 weeks"
  indication?: string; // why it's being prescribed
  instructions: string; // patient-facing guidance
  warnings?: string; // side effects / red flags
  approved: boolean;
};

export type Prescription = {
  appointmentId: string;
  medications: PrescriptionMedication[];
  clinicalNotes?: string;
  generatedAt?: number;
  finalisedAt?: number;
  finalisedBy?: string;
  updatedAt: number;
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
    const jurisdictions = (parsed.prescribingJurisdictions ?? []).map((j) =>
      j.toLowerCase(),
    );
    return jurisdictions.includes(clientJurisdiction.toLowerCase());
  } catch {
    return false;
  }
}