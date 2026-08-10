// One signing experience for both jurisdictions. What differs is the
// credential and authentication requirement, decided by the patient's
// jurisdiction, the prescriber's verified authority and the medication
// classification. Nothing here fabricates a verification: an unverified
// credential stays unverified and blocks the signature.
import type { Prescription, PrescriptionMedication, RxCountry } from "./store";
import type { PrescriberIdentity } from "./credentials";

/** Stable, order-independent content hash of everything the signature covers.
 *  Any edit to a medication, direction or patient identity changes the hash,
 *  which is how a signature is bound to one exact prescription version. */
export function prescriptionContentHash(args: {
  medications: PrescriptionMedication[];
  patientName?: string;
  patientAgeYears?: number | null;
  patientSex?: string;
  country: RxCountry;
  version: number;
}): string {
  const canonical = JSON.stringify({
    country: args.country,
    version: args.version,
    patient: [args.patientName ?? "", args.patientAgeYears ?? "", args.patientSex ?? ""],
    meds: args.medications
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
          m.controlled ? "controlled" : "",
        ]
          .map((v) => String(v).trim().toLowerCase())
          .join("|"),
      )
      .sort(),
  });
  return fnv1a64(canonical);
}

/** Hash of the currently stored prescription, using its live version. */
export function currentContentHash(
  rx: Prescription,
  country: RxCountry,
  patientName?: string,
  ageYears?: number | null,
): string {
  return prescriptionContentHash({
    medications: rx.medications,
    patientName,
    patientAgeYears: ageYears ?? null,
    patientSex: rx.patientInfo?.sex,
    country,
    version: rx.version ?? 1,
  });
}

/** 64-bit FNV-1a, rendered as 16 hex characters and grouped for readability. */
function fnv1a64(input: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash ^ BigInt(input.charCodeAt(i))) & mask;
    hash = (hash * prime) & mask;
  }
  return hash.toString(16).padStart(16, "0");
}

export function formatHash(hash: string): string {
  return (hash.match(/.{1,4}/g) ?? [hash]).join(" ").toUpperCase();
}

// ---------------------------------------------------------------- authority

export type AuthorityCheck = {
  key: string;
  label: string;
  /** Satisfied — the signature may proceed on this point. */
  ok: boolean;
  /** Text shown whether or not the check passes. */
  detail: string;
  /** A failed check with blocking: true prevents the signature entirely. */
  blocking: boolean;
};

export type AuthorityResult = {
  checks: AuthorityCheck[];
  blockers: AuthorityCheck[];
  /** True when the prescriber may sign this exact prescription. */
  authorised: boolean;
  /** How the prescriber will authenticate this signature. */
  method: SigningMethod;
};

export type SigningMethod = "password-reauth" | "epcs-two-factor";

export const SIGNING_METHOD_LABEL: Record<SigningMethod, string> = {
  "password-reauth": "Re-authenticated with account password",
  "epcs-two-factor":
    "EPCS two-factor signing — identity-proofed account password plus registered authenticator",
};

/** Generic prescribing is mandatory in the Philippines. */
export function genericPrescribingGaps(meds: PrescriptionMedication[]): string[] {
  return meds
    .filter((m) => m.name.trim().length > 0 && !(m.genericName ?? "").trim())
    .map((m) => m.name.trim());
}

export function controlledMedications(meds: PrescriptionMedication[]): PrescriptionMedication[] {
  return meds.filter((m) => m.name.trim().length > 0 && m.controlled);
}

/** Everything the jurisdiction requires before this prescription can be signed. */
export function prescribingAuthority(args: {
  rx: Prescription;
  country: RxCountry;
  identity: PrescriberIdentity;
  /** US: the state the patient is located in for this encounter. */
  patientState?: string;
  /** Name the prescription is issued to, when it is not stored on the record. */
  patientName?: string;
}): AuthorityResult {
  const { rx, country, identity } = args;
  const meds = rx.medications.filter((m) => m.name.trim().length > 0);
  const controlled = controlledMedications(meds);
  const checks: AuthorityCheck[] = [];

  const has = (v?: string) => !!(v ?? "").trim();

  const patientGaps = patientLegalGaps({
    info: rx.patientInfo,
    patientName: args.patientName ?? rx.patientInfo?.["patientName" as never],
    country,
  });
  checks.push({
    key: "patient-identifiers",
    label:
      country === "US"
        ? "Patient full name, date of birth and address"
        : "Patient full name and date of birth",
    ok: patientGaps.length === 0,
    detail:
      patientGaps.length === 0
        ? "The prescription carries the patient identifiers required in this jurisdiction."
        : `Record ${patientGaps.join(", ").toLowerCase()} before signing. These fields cannot be left blank on an issued prescription.`,
    blocking: true,
  });

  if (country === "PH") {
    checks.push({
      key: "ph-authority",
      label: "Authorised to prescribe in the Philippines",
      ok: has(identity.prcNumber) && !!identity.licenseVerifiedAt,
      detail: has(identity.prcNumber)
        ? identity.licenseVerifiedAt
          ? `PRC ${identity.prcNumber} verified ${new Date(identity.licenseVerifiedAt).toLocaleDateString()}.`
          : `PRC ${identity.prcNumber} is on file but has not been verified for prescribing.`
        : "No PRC registration number is on file.",
      blocking: true,
    });
    checks.push({
      key: "ph-ptr",
      label: "PTR number",
      ok: has(identity.ptrNumber),
      detail: has(identity.ptrNumber) ? `PTR ${identity.ptrNumber}.` : "No PTR number is on file.",
      blocking: true,
    });
    checks.push({
      key: "ph-clinic",
      label: "Clinic name, address and contact information",
      ok: has(identity.clinicName) && has(identity.clinicAddress) && has(identity.clinicContact),
      detail:
        has(identity.clinicName) && has(identity.clinicAddress) && has(identity.clinicContact)
          ? `${identity.clinicName} · ${identity.clinicAddress} · ${identity.clinicContact}`
          : "Clinic information printed on a Philippine prescription is incomplete.",
      blocking: true,
    });
    const gaps = genericPrescribingGaps(meds);
    checks.push({
      key: "ph-generic",
      label: "Generic prescribing",
      ok: meds.length > 0 && gaps.length === 0,
      detail:
        meds.length === 0
          ? "No medication added."
          : gaps.length === 0
            ? "Every medication carries its generic name, written first on the prescription."
            : `Add the generic name for ${gaps.join(", ")}. A Philippine prescription must be written generically.`,
      blocking: true,
    });
    if (controlled.length > 0) {
      const auth = rx.controlledAuth ?? {};
      checks.push({
        key: "ph-s2",
        label: "S2 licence and official special prescription form",
        ok: has(identity.s2Number) && has(auth.s2SerialNumber),
        detail: !has(identity.s2Number)
          ? "No S2 licence number is on file. A dangerous drug cannot be prescribed without it."
          : has(auth.s2SerialNumber)
            ? `S2 ${identity.s2Number} · official form serial ${auth.s2SerialNumber}.`
            : `S2 ${identity.s2Number} on file. Record the serial number of the official special prescription form used for ${controlled.map((m) => m.genericName || m.name).join(", ")}.`,
        blocking: true,
      });
    }
  } else {
    const state = (identity.licenseState || "").trim();
    const patientState = (args.patientState || "").trim();
    const stateOk = has(identity.licenseNumber) && !!identity.licenseVerifiedAt && !!state;
    checks.push({
      key: "us-license",
      label: "State licence verified for the patient's state",
      ok: stateOk && (!patientState || state.toLowerCase() === patientState.toLowerCase()),
      detail: !has(identity.licenseNumber)
        ? "No state medical licence is on file."
        : !identity.licenseVerifiedAt
          ? `Licence ${identity.licenseNumber} (${state || "state not set"}) has not been verified.`
          : patientState && state.toLowerCase() !== patientState.toLowerCase()
            ? `Your verified licence covers ${state}. This patient is located in ${patientState}, so a licence for ${patientState} is required.`
            : `Licence ${identity.licenseNumber} · ${state} · verified ${new Date(identity.licenseVerifiedAt).toLocaleDateString()}.`,
      blocking: true,
    });
    checks.push({
      key: "us-npi",
      label: "NPI number",
      ok: has(identity.npiNumber),
      detail: has(identity.npiNumber) ? `NPI ${identity.npiNumber}.` : "No NPI number is on file.",
      blocking: true,
    });
    checks.push({
      key: "us-practice",
      label: "Practice name, address and contact information",
      ok: has(identity.clinicName) && has(identity.clinicAddress) && has(identity.clinicContact),
      detail:
        has(identity.clinicName) && has(identity.clinicAddress) && has(identity.clinicContact)
          ? `${identity.clinicName} · ${identity.clinicAddress} · ${identity.clinicContact}`
          : "Practice information printed on the prescription is incomplete.",
      blocking: true,
    });
    if (state) {
      checks.push({
        key: "us-state-rules",
        label: `${state} prescription requirements`,
        ok: true,
        detail: stateRuleSummary(state, controlled.length > 0),
        blocking: false,
      });
    }
    if (controlled.length > 0) {
      checks.push({
        key: "us-dea",
        label: "DEA registration valid in the patient's state",
        ok: has(identity.deaNumber) && !!identity.deaVerifiedAt,
        detail: !has(identity.deaNumber)
          ? "No DEA registration is on file."
          : identity.deaVerifiedAt
            ? `DEA ${identity.deaNumber} verified ${new Date(identity.deaVerifiedAt).toLocaleDateString()}.`
            : `DEA ${identity.deaNumber} is on file but has not been verified for controlled prescribing.`,
        blocking: true,
      });
      const epcs = epcsReadiness(identity);
      checks.push({
        key: "us-epcs",
        label: "DEA-compliant EPCS: identity proofing and two-factor signing",
        ok: epcs.ready,
        detail: epcs.detail,
        blocking: true,
      });
    }
  }

  const blockers = checks.filter((c) => c.blocking && !c.ok);
  return {
    checks,
    blockers,
    authorised: blockers.length === 0 && meds.length > 0,
    method: country === "US" && controlled.length > 0 ? "epcs-two-factor" : "password-reauth",
  };
}

/** EPCS can only be used through a certified provider that has completed
 *  identity proofing and registered a two-factor authenticator for this
 *  prescriber. Lubin never stands in for that provider. */
export function epcsReadiness(identity: PrescriberIdentity): {
  ready: boolean;
  detail: string;
  provider?: string;
} {
  const provider = (identity.epcsProvider ?? "").trim();
  if (!provider)
    return {
      ready: false,
      detail:
        "No certified EPCS provider is connected to this account. Controlled substances cannot be signed here — issue them through your certified EPCS system. No confirmation in Lubin can take the place of EPCS.",
    };
  if (!identity.epcsIdentityProofedAt)
    return {
      ready: false,
      provider,
      detail: `${provider} is connected but identity proofing is not complete. Finish identity proofing with ${provider} before signing a controlled prescription.`,
    };
  if (!identity.epcsTokenRegisteredAt)
    return {
      ready: false,
      provider,
      detail: `Identity proofing is complete, but no two-factor authenticator is registered with ${provider}. Register your authenticator to enable EPCS signing.`,
    };
  return {
    ready: true,
    provider,
    detail: `${provider} · identity proofed ${new Date(identity.epcsIdentityProofedAt).toLocaleDateString()} · authenticator registered ${new Date(identity.epcsTokenRegisteredAt).toLocaleDateString()}.`,
  };
}

/** Plain-language note about state requirements that affect the document. */
function stateRuleSummary(state: string, controlled: boolean): string {
  const base = `Electronic prescribing is the default in ${state}. The prescription carries your NPI, practice address and contact information.`;
  return controlled
    ? `${base} Controlled substances additionally require EPCS and a valid DEA registration for ${state}, and are reported to the state prescription monitoring programme.`
    : base;
}

export const SIGNING_BUTTON_COPY = {
  standard: "Authenticate and sign",
  epcs: "Authenticate and sign with EPCS",
} as const;
