// Lubin's prescribing verification records. This is the only place a
// prescriber's regulated credential numbers live: they are held by the
// backend after Lubin verifies them against the issuing register, and are
// never entered by hand at prescribing time and never shown to clients.
//
// Being a doctor is not enough. A provider can prescribe only when Lubin has
// verified their prescribing authority for the patient's jurisdiction.

export type VerificationStatus =
  | "verified"
  | "in-review"
  | "action-required"
  | "not-submitted"
  | "expired"
  | "suspended";

/** Credential values printed on a prescription, held by Lubin. */
export type VerifiedPrescriberRecord = {
  providerKey: string;
  status: VerificationStatus;
  /** Set only when Lubin completed verification. */
  verifiedAt?: number;
  /** Verification expiry, when the credential itself expires. */
  expiresAt?: number;
  /** Jurisdictions this provider may prescribe in, e.g. ["PH"]. */
  jurisdictions: ("PH" | "US")[];
  /** What the provider still has to do, when the status is not verified. */
  outstanding: string[];
  profession?: string;
  fullName: string;
  qualifications: string;
  clinicName: string;
  clinicAddress: string;
  clinicContact: string;
  /** Philippines */
  prcNumber?: string;
  ptrNumber?: string;
  s2Number?: string;
  /** United States */
  licenseNumber?: string;
  licenseState?: string;
  npiNumber?: string;
  deaNumber?: string;
  deaVerifiedAt?: number;
  /** Certified EPCS provider connected for controlled prescribing. */
  epcsProvider?: string;
  epcsIdentityProofedAt?: number;
  epcsTokenRegisteredAt?: number;
};

// Demo verification records use fixed dates so the signing flow can always be
// reviewed: nothing here expires because time passed since the demo was built.
const VERIFIED_ON = Date.UTC(2026, 0, 15);
const EXPIRES_ON = Date.UTC(2030, 11, 31);

/** Verification records held by Lubin, keyed by provider account. */
const RECORDS: Record<string, VerifiedPrescriberRecord> = {
  "dr-maria-santos": {
    providerKey: "dr-maria-santos",
    status: "verified",
    verifiedAt: VERIFIED_ON,
    expiresAt: EXPIRES_ON,
    jurisdictions: ["PH", "US"],
    outstanding: [],
    profession: "Psychiatrist",
    fullName: "Dr. Maria Santos",
    qualifications: "MD, FPPA",
    clinicName: "Lubin Psychiatry — Bonifacio Global City",
    clinicAddress: "12th Floor, One Bonifacio High Street, 5th Ave, Taguig City 1634",
    clinicContact: "(02) 8894 1120 · care@lubin.health",
    prcNumber: "0102934",
    ptrNumber: "PTR-2026-0038211",
    s2Number: "S2-PH-104773",
    licenseNumber: "A-092416",
    licenseState: "California",
    npiNumber: "1902847361",
  },
  "dr-mateo-reyes": {
    providerKey: "dr-mateo-reyes",
    status: "verified",
    verifiedAt: VERIFIED_ON,
    expiresAt: EXPIRES_ON,
    jurisdictions: ["PH"],
    outstanding: [],
    profession: "Psychiatrist",
    fullName: "Dr. Mateo Reyes",
    qualifications: "MD, FPPA",
    clinicName: "Lubin Psychiatry — Makati",
    clinicAddress: "8th Floor, Alveo Financial Tower, 6794 Ayala Ave, Makati City 1226",
    clinicContact: "(02) 8541 2280 · care@lubin.health",
    prcNumber: "0114872",
    ptrNumber: "PTR-2026-0041938",
    s2Number: "S2-PH-118420",
  },
  "dr-ana-villaruel": {
    providerKey: "dr-ana-villaruel",
    status: "verified",
    verifiedAt: VERIFIED_ON,
    expiresAt: EXPIRES_ON,
    jurisdictions: ["US"],
    outstanding: [],
    profession: "Psychiatrist",
    fullName: "Dr. Ana Villaruel",
    qualifications: "MD",
    clinicName: "Lubin Behavioral Health — San Diego",
    clinicAddress: "2650 Camino del Rio N, Suite 305, San Diego, CA 92108",
    clinicContact: "(619) 555 0142 · care@lubin.health",
    licenseNumber: "A-148902",
    licenseState: "California",
    npiNumber: "1487203941",
  },
  // United States prescriber set up for controlled substances: verified DEA
  // authority plus a certified EPCS provider with identity proofing and a
  // registered two-factor token.
  "dr-james-whitfield": {
    providerKey: "dr-james-whitfield",
    status: "verified",
    verifiedAt: VERIFIED_ON,
    expiresAt: EXPIRES_ON,
    jurisdictions: ["US"],
    outstanding: [],
    profession: "Psychiatrist",
    fullName: "Dr. James Whitfield",
    qualifications: "MD, DFAPA",
    clinicName: "Lubin Behavioral Health — Austin",
    clinicAddress: "1201 W 6th St, Suite C200, Austin, TX 78703",
    clinicContact: "(512) 555 0188 · care@lubin.health",
    licenseNumber: "TX-K4820",
    licenseState: "Texas",
    npiNumber: "1730254881",
    deaNumber: "BW4820117",
    deaVerifiedAt: VERIFIED_ON,
    epcsProvider: "IdentiTrust EPCS",
    epcsIdentityProofedAt: VERIFIED_ON,
    epcsTokenRegisteredAt: VERIFIED_ON,
  },
  "dr-paolo-cruz": {
    providerKey: "dr-paolo-cruz",
    status: "in-review",
    jurisdictions: [],
    outstanding: [
      "PRC registration is being verified against the Professional Regulation Commission register",
      "PTR number for the current year",
    ],
    profession: "Psychiatrist",
    fullName: "Dr. Paolo Cruz",
    qualifications: "MD",
    clinicName: "",
    clinicAddress: "",
    clinicContact: "",
  },
};

export function lookupPrescribingVerification(
  providerKey: string,
  fallbackName?: string,
  profession?: string,
): VerifiedPrescriberRecord {
  const found = RECORDS[providerKey.toLowerCase()];
  if (found) return found;
  // Unknown account: never assume authority. Prescribing stays closed until
  // the provider completes Lubin's verification process.
  return {
    providerKey,
    status: "not-submitted",
    jurisdictions: [],
    outstanding: [
      "Submit your professional licence and prescribing credentials to Lubin",
      "Complete identity verification",
    ],
    profession,
    fullName: fallbackName ?? "",
    qualifications: "",
    clinicName: "",
    clinicAddress: "",
    clinicContact: "",
  };
}

/** Slug used to look an account up. Mirrors how the provider profile is keyed. */
export function providerKeyFromName(name?: string): string {
  return (name ?? "")
    .trim()
    .toLowerCase()
    .replace(/[.']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
