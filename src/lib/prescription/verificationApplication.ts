// The provider-facing side of Lubin's prescribing verification: what a
// psychiatrist or mental-health doctor submits, and how far along they are.
//
// Being a doctor is never enough. This module only tracks a *submission*.
// Prescribing authority itself is granted by Lubin's backend record
// (verification.server.ts) — nothing written here can unlock prescribing.

export type RxJurisdiction = "PH" | "US";

export type VerificationApplication = {
  /** Prescribing profession the provider declares. */
  profession: string;
  jurisdictions: RxJurisdiction[];
  /** Identity */
  fullName: string;
  qualifications: string;
  dateOfBirth: string;
  govIdType: string;
  govIdUploaded: boolean;
  selfieUploaded: boolean;
  /** Philippines */
  prcNumber: string;
  prcExpiry: string;
  prcUploaded: boolean;
  ptrNumber: string;
  ptrYear: string;
  ptrUploaded: boolean;
  s2Number: string;
  /** United States */
  licenseNumber: string;
  licenseState: string;
  licenseUploaded: boolean;
  npiNumber: string;
  deaNumber: string;
  deaUploaded: boolean;
  wantsControlled: boolean;
  epcsProvider: string;
  /** Practice */
  clinicName: string;
  clinicAddress: string;
  clinicContact: string;
  /** Attestation */
  attestTrue: boolean;
  attestScope: boolean;
  attestAudit: boolean;
  signature: string;
  /** Set when the provider sent it to Lubin for review. */
  submittedAt?: number;
};

const STORAGE_KEY = "lubin.prescribingVerification.v1";

export function emptyApplication(seed?: {
  profession?: string;
  fullName?: string;
}): VerificationApplication {
  return {
    profession: seed?.profession ?? "",
    jurisdictions: [],
    fullName: seed?.fullName ?? "",
    qualifications: "",
    dateOfBirth: "",
    govIdType: "",
    govIdUploaded: false,
    selfieUploaded: false,
    prcNumber: "",
    prcExpiry: "",
    prcUploaded: false,
    ptrNumber: "",
    ptrYear: "",
    ptrUploaded: false,
    s2Number: "",
    licenseNumber: "",
    licenseState: "",
    licenseUploaded: false,
    npiNumber: "",
    deaNumber: "",
    deaUploaded: false,
    wantsControlled: false,
    epcsProvider: "",
    clinicName: "",
    clinicAddress: "",
    clinicContact: "",
    attestTrue: false,
    attestScope: false,
    attestAudit: false,
    signature: "",
  };
}

export function loadApplication(): VerificationApplication | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return { ...emptyApplication(), ...(JSON.parse(raw) as VerificationApplication) };
  } catch {
    return null;
  }
}

export function saveApplication(app: VerificationApplication) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(app));
  } catch {
    /* noop */
  }
}

export const PRESCRIBING_PROFESSIONS = [
  "Psychiatrist",
  "Physician (mental health)",
  "Psychiatric nurse practitioner",
] as const;

export type StepId = "profession" | "identity" | "credentials" | "practice" | "attest";

export const STEP_TITLES: Record<StepId, string> = {
  profession: "Profession and where you prescribe",
  identity: "Identity",
  credentials: "Licence and prescribing credentials",
  practice: "Practice details on the prescription",
  attest: "Declaration and submit",
};

export const STEP_ORDER: StepId[] = [
  "profession",
  "identity",
  "credentials",
  "practice",
  "attest",
];

/** What is still missing in each step, in the provider's own words. */
export function stepGaps(app: VerificationApplication, step: StepId): string[] {
  const gaps: string[] = [];
  const ph = app.jurisdictions.includes("PH");
  const us = app.jurisdictions.includes("US");
  if (step === "profession") {
    if (!app.profession) gaps.push("Choose your prescribing profession");
    if (app.jurisdictions.length === 0) gaps.push("Choose at least one country you prescribe in");
  }
  if (step === "identity") {
    if (!app.fullName.trim()) gaps.push("Full legal name as it appears on your licence");
    if (!app.qualifications.trim()) gaps.push("Qualifications shown after your name");
    if (!app.dateOfBirth) gaps.push("Date of birth");
    if (!app.govIdType) gaps.push("Choose a government ID type");
    if (!app.govIdUploaded) gaps.push("Attach your government ID");
    if (!app.selfieUploaded) gaps.push("Complete the liveness photo");
  }
  if (step === "credentials") {
    if (!ph && !us) gaps.push("Choose a country in step 1 first");
    if (ph) {
      if (!app.prcNumber.trim()) gaps.push("PRC registration number");
      if (!app.prcExpiry) gaps.push("PRC expiry date");
      if (!app.prcUploaded) gaps.push("Attach your PRC registration card");
      if (!app.ptrNumber.trim()) gaps.push("PTR number for the current year");
      if (!app.ptrUploaded) gaps.push("Attach your PTR receipt");
    }
    if (us) {
      if (!app.licenseNumber.trim()) gaps.push("State medical licence number");
      if (!app.licenseState.trim()) gaps.push("Licensing state");
      if (!app.licenseUploaded) gaps.push("Attach your state licence");
      if (!app.npiNumber.trim()) gaps.push("NPI number");
      if (app.wantsControlled) {
        if (!app.deaNumber.trim()) gaps.push("DEA registration number");
        if (!app.deaUploaded) gaps.push("Attach your DEA certificate");
        if (!app.epcsProvider) gaps.push("Choose a certified EPCS provider for two-factor signing");
      }
    }
  }
  if (step === "practice") {
    if (!app.clinicName.trim()) gaps.push("Practice or clinic name");
    if (!app.clinicAddress.trim()) gaps.push("Practice address");
    if (!app.clinicContact.trim()) gaps.push("Practice contact number or email");
  }
  if (step === "attest") {
    if (!app.attestTrue) gaps.push("Confirm the information is true and current");
    if (!app.attestScope) gaps.push("Confirm you will prescribe only within your scope");
    if (!app.attestAudit) gaps.push("Acknowledge Lubin's record keeping and audit");
    if (!app.signature.trim()) gaps.push("Type your full name as a signature");
  }
  return gaps;
}

export function stepComplete(app: VerificationApplication, step: StepId): boolean {
  return stepGaps(app, step).length === 0;
}

export function applicationGaps(app: VerificationApplication): string[] {
  return STEP_ORDER.flatMap((s) => stepGaps(app, s));
}

export function canSubmit(app: VerificationApplication): boolean {
  return applicationGaps(app).length === 0;
}

/** Working state of the submission itself, separate from Lubin's decision. */
export type ApplicationStage = "not-started" | "in-progress" | "submitted";

export function applicationStage(app: VerificationApplication | null): ApplicationStage {
  if (!app) return "not-started";
  if (app.submittedAt) return "submitted";
  const done = STEP_ORDER.filter((s) => stepComplete(app, s)).length;
  return done === 0 ? "not-started" : "in-progress";
}

export function completedStepCount(app: VerificationApplication): number {
  return STEP_ORDER.filter((s) => stepComplete(app, s)).length;
}