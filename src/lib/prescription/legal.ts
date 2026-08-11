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

/** Patient-side fields the legal prescription layer requires. Address is
 *  mandatory in the U.S. (DEA requires patient name and address on controlled
 *  prescriptions and it is standard practice on all U.S. prescriptions). */
export function patientLegalGaps(args: {
  info?: PatientSafetyInfo;
  patientName?: string;
  country: RxCountry;
}): string[] {
  const gaps: string[] = [];
  if (!(args.patientName ?? "").trim()) gaps.push("Patient full name");
  if (!(args.info?.dob ?? "").trim()) gaps.push("Patient date of birth");
  if (args.country === "US" && !(args.info?.address ?? "").trim())
    gaps.push("Patient address");
  return gaps;
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
