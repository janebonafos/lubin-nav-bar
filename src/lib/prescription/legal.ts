// Rules that separate the *legal* prescription layer from the patient-friendly
// medication summary. Nothing here invents data: a required field that is not
// recorded is reported as a gap so issuance can be blocked.
import type { PatientSafetyInfo, PrescriptionMedication, RxCountry } from "./store";
import type { PrescriberIdentity } from "./credentials";

/** The formal refill field is always a number, never free prose. */
export function refillCount(raw?: string): number {
  const text = (raw ?? "").trim();
  if (!text) return 0;
  const match = text.match(/\d+/);
  if (match) return Number(match[0]);
  return /no(ne)?\b/i.test(text) ? 0 : 0;
}

/** Patient guidance shown underneath the formal refill value. */
export function refillNote(raw?: string): string {
  const text = (raw ?? "").trim();
  const count = refillCount(text);
  if (count === 0)
    return "Contact your prescriber for review before continuing this medication.";
  return `This prescription may be refilled ${count} time${count === 1 ? "" : "s"}. Your prescriber will review before further refills.`;
}

export function formatDob(info?: PatientSafetyInfo): string | null {
  const dob = (info?.dob ?? "").trim();
  if (!dob) return null;
  const d = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** Patient-side fields the legal prescription layer requires.
 *
 *  Address: the DEA requires the patient's full name and address on every
 *  electronically prescribed controlled substance, and Philippine dangerous
 *  drug / senior-citizen / PWD prescription rules require name, age, sex and
 *  address. Requirements for ordinary non-controlled prescriptions vary by
 *  state, so the address is recorded and printed everywhere, but only blocks
 *  issuance where a rule clearly requires it. */
export function patientLegalGaps(args: {
  info?: PatientSafetyInfo;
  patientName?: string;
  country: RxCountry;
  /** True when the prescription contains a controlled / dangerous drug. */
  controlled?: boolean;
}): string[] {
  const gaps: string[] = [];
  if (!(args.patientName ?? "").trim()) gaps.push("Patient full name");
  if (!(args.info?.dob ?? "").trim()) gaps.push("Patient date of birth");
  if (args.controlled && !(args.info?.address ?? "").trim())
    gaps.push("Patient address");
  return gaps;
}

/** Address is recorded on every prescription, but is only legally mandatory
 *  in some contexts. Used for the wording next to the field. */
export function addressRequirement(controlled: boolean): "mandatory" | "recommended" {
  return controlled ? "mandatory" : "recommended";
}

/** A Philippine dangerous drug must be issued on the official special
 *  prescription form (DDB, effective 21 July 2023) — never as a standard
 *  Lubin e-prescription with an S2 number added to it. */
export function requiresPhSpecialForm(
  meds: PrescriptionMedication[],
  country: RxCountry,
): PrescriptionMedication[] {
  if (country !== "PH") return [];
  return meds.filter((m) => m.name.trim().length > 0 && m.controlled);
}

/** Prescriber fields that must be printed, per jurisdiction. Returns the
 *  labels still missing so the preview can warn and issuance can be blocked. */
export function prescriberPrintGaps(
  identity: PrescriberIdentity,
  country: RxCountry,
  controlled: boolean,
): string[] {
  const has = (v?: string) => !!(v ?? "").trim();
  const gaps: string[] = [];
  if (!has(identity.fullName)) gaps.push("Prescriber name");
  if (country === "PH") {
    if (!has(identity.clinicAddress)) gaps.push("Professional / practice address");
    if (!has(identity.clinicContact)) gaps.push("Professional contact");
    if (!has(identity.prcNumber)) gaps.push("PRC number");
    if (!has(identity.ptrNumber)) gaps.push("PTR number");
    if (controlled && !has(identity.s2Number)) gaps.push("S2 licence number");
  } else {
    if (!has(identity.clinicAddress)) gaps.push("Professional / practice address");
    if (!has(identity.clinicContact)) gaps.push("Professional contact");
    if (!has(identity.licenseNumber)) gaps.push("State licence number");
    if (!has(identity.licenseState)) gaps.push("State of licensure");
    if (!has(identity.npiNumber)) gaps.push("NPI number");
    if (controlled && !has(identity.deaNumber)) gaps.push("DEA registration number");
  }
  return gaps;
}

// ------------------------------------------------------------------ validity

/** Result of the jurisdiction validity rule for one prescription. */
export type PrescriptionValidity = {
  /** False when no rule is configured for this jurisdiction / prescription type. */
  configured: boolean;
  /** Days the prescription stays dispensable, when a rule is configured. */
  days?: number;
  /** Absolute expiry, derived from the issue date and the configured rule. */
  validUntil?: number;
  /** Field label the jurisdiction uses on the document. */
  label: string;
  /** True when a validity period is legally required for this prescription. */
  legallyRequired: boolean;
  /** Short plain-language note about the applicable rule. */
  note: string;
};

/** Configured validity rules, keyed by jurisdiction and prescription type.
 *  Nothing is defaulted globally: a combination with no entry reports
 *  `configured: false` so the document never shows an invented date. */
const VALIDITY_RULES: Record<
  string,
  { days: number; label: string; legallyRequired: boolean; note: string }
> = {
  "US:standard": {
    days: 365,
    label: "Dispense by",
    legallyRequired: true,
    note: "Non-controlled prescriptions in the United States are dispensable for up to 12 months from the date issued, subject to state limits.",
  },
  "PH:standard": {
    days: 365,
    label: "Valid until",
    legallyRequired: false,
    note: "Philippine non-dangerous-drug prescriptions are treated as valid for 12 months from the date issued for dispensing and refills.",
  },
};

export function prescriptionValidity(args: {
  country: RxCountry;
  controlled: boolean;
  /** Date the prescription is (or would be) issued. */
  issuedAt: number;
}): PrescriptionValidity {
  const type = args.controlled ? "controlled" : "standard";
  const rule = VALIDITY_RULES[`${args.country}:${type}`];
  if (!rule) {
    return {
      configured: false,
      label: args.country === "PH" ? "Valid until" : "Dispense by",
      // A controlled / dangerous-drug prescription is only dispensable inside a
      // legally defined window, so issuance cannot proceed without the rule.
      legallyRequired: args.controlled,
      note:
        "Validity rule not configured for this jurisdiction and prescription type. No expiry date can be printed until the rule is configured.",
    };
  }
  const validUntil = args.issuedAt + rule.days * 24 * 60 * 60 * 1000;
  return {
    configured: true,
    days: rule.days,
    validUntil,
    label: rule.label,
    legallyRequired: rule.legallyRequired,
    note: rule.note,
  };
}

export function formatValidityDate(at: number): string {
  return new Date(at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
