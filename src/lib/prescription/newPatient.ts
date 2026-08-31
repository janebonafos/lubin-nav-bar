// Local prototype helpers for the new / non-recorded patient prescribing flow.
// Everything here is mock data held in memory — no backend, no network.

import type { PatientRecordView } from "./patientRecords";

export type PhAddress = {
  street: string;
  barangay: string;
  city: string;
  province: string;
  postalCode: string;
};

export function emptyPhAddress(): PhAddress {
  return { street: "", barangay: "", city: "", province: "", postalCode: "" };
}

export function formatPhAddress(a: PhAddress): string {
  return [a.street, a.barangay, a.city, a.province, a.postalCode]
    .map((x) => x.trim())
    .filter(Boolean)
    .join(", ");
}

export type Guardian = {
  name: string;
  relationship: string;
  contact: string;
};

export function emptyGuardian(): Guardian {
  return { name: "", relationship: "", contact: "" };
}

/** Possible duplicate patient records, matched on the identifiers a clinic
 *  actually has: name, date of birth, mobile and email. */
export type DuplicateMatch = {
  record: PatientRecordView;
  reasons: string[];
};

export function findDuplicateMatches(
  records: PatientRecordView[],
  input: { fullName: string; dob: string; mobile: string; email: string },
): DuplicateMatch[] {
  const name = input.fullName.trim().toLowerCase();
  const mobile = digits(input.mobile);
  const email = input.email.trim().toLowerCase();
  const out: DuplicateMatch[] = [];

  for (const r of records) {
    const reasons: string[] = [];
    const rName = r.fullName.trim().toLowerCase();
    if (name.length > 2 && (rName === name || rName.includes(name) || name.includes(rName))) {
      reasons.push("Same or similar full name");
    }
    if (input.dob && r.info.dob === input.dob) reasons.push("Same date of birth");
    if (mobile.length >= 7 && digits(r.info.phone ?? "").endsWith(mobile.slice(-7))) {
      reasons.push("Same mobile number");
    }
    if (email && (r.info.email ?? "").trim().toLowerCase() === email) {
      reasons.push("Same email address");
    }
    if (reasons.length > 0) out.push({ record: r, reasons });
  }
  return out.slice(0, 4);
}

function digits(v: string): string {
  return v.replace(/\D/g, "");
}

/** Mock Health Network / Health Passport profile the patient already shared.
 *  Blank voluntary fields are represented as undefined — "not provided",
 *  never "none known". */
export type HealthNetworkProfile = {
  matchedOn: string;
  sharedAt: number;
  updatedAt: number;
  dob?: string;
  mobile?: string;
  email?: string;
  medications?: string[];
  allergies?: string[];
  conditions?: string[];
  pregnancy?: string;
  careProviders?: string[];
};

const DAY = 86_400_000;

const MOCK_NETWORK: { keys: string[]; profile: Omit<HealthNetworkProfile, "matchedOn"> }[] = [
  {
    keys: ["anna reyes", "09175550142", "+639175550142", "anna@email.com"],
    profile: {
      sharedAt: Date.now() - 9 * DAY,
      updatedAt: Date.now() - 4 * DAY,
      dob: "1996-04-18",
      mobile: "+63 917 555 0142",
      email: "anna@email.com",
      medications: ["Sertraline hydrochloride 50 mg — once daily in the morning"],
      allergies: ["Penicillin — rash"],
      conditions: ["Recurrent depressive episode", "Iron-deficiency anaemia (past)"],
      pregnancy: "Not pregnant / not breastfeeding",
      careProviders: ["Dr. Liza Mendoza — primary care, Quezon City"],
    },
  },
  {
    keys: ["miguel santos", "09180001122", "miguel@email.com"],
    profile: {
      sharedAt: Date.now() - 2 * DAY,
      updatedAt: Date.now() - 2 * DAY,
      dob: "2009-11-02",
      mobile: "+63 918 000 1122",
      medications: [],
      allergies: [],
      // conditions / pregnancy deliberately absent — voluntary and not provided.
      careProviders: ["Bright Minds Clinic — school counsellor referral"],
    },
  },
];

export function lookupHealthNetwork(input: {
  fullName: string;
  mobile: string;
  email: string;
}): HealthNetworkProfile | null {
  const candidates = [
    input.fullName.trim().toLowerCase(),
    digits(input.mobile),
    input.email.trim().toLowerCase(),
  ].filter((x) => x.length > 3);
  if (candidates.length === 0) return null;

  for (const entry of MOCK_NETWORK) {
    const hit = entry.keys.find((k) =>
      candidates.some((c) => k === c || digits(k) === c || k.includes(c)),
    );
    if (hit) {
      return {
        ...entry.profile,
        matchedOn: hit.includes("@")
          ? "email address"
          : /\d/.test(hit)
            ? "mobile number"
            : "full name",
      };
    }
  }
  return null;
}

/** Prescribing readiness states. "Not assessed" is a real, blocking state. */
export type AllergyReadiness = "none-known" | "recorded" | "not-assessed";
export type MedicationReadiness = "nothing" | "recorded" | "not-assessed";

export const ALLERGY_READINESS_LABEL: Record<AllergyReadiness, string> = {
  "none-known": "No known allergies",
  recorded: "Allergies recorded",
  "not-assessed": "Not assessed",
};

export const MEDICATION_READINESS_LABEL: Record<MedicationReadiness, string> = {
  nothing: "Nothing currently",
  recorded: "Medications recorded",
  "not-assessed": "Not assessed",
};

export type RxPurpose = "new-treatment" | "continuation";

export type NewTreatmentBasis = "linked-appointment" | "external-consult" | "focused-assessment";
export type ContinuationBasis = "mine-outside" | "other-clinician" | "patient-supplied";

export const NEW_TREATMENT_BASIS_LABEL: Record<NewTreatmentBasis, string> = {
  "linked-appointment": "Use a completed Lubin consultation",
  "external-consult": "Record a consultation I completed outside Lubin",
  "focused-assessment": "Document an assessment I'm completing now",
};

export const CONTINUATION_BASIS_LABEL: Record<ContinuationBasis, string> = {
  "mine-outside": "Previously prescribed by me outside Lubin",
  "other-clinician": "Prescribed by another clinician",
  "patient-supplied": "Patient supplied a previous prescription",
};

export type ConsultMode = "in-person" | "video" | "phone" | "other";

export const CONSULT_MODE_LABEL: Record<ConsultMode, string> = {
  "in-person": "In person",
  video: "Video",
  phone: "Phone",
  other: "Other",
};
