// Prescriber identity that must appear on a legal prescription. Stored once
// per provider account and reused on every prescription. Nothing is invented:
// a field that is not on file stays visibly empty until the prescriber fills it.
import type { RxCountry } from "./store";

const KEY = "lubin.prescriberIdentity.v1";
const CHANGE_EVENT = "lubin-prescriber-identity-change";

export type PrescriberIdentity = {
  fullName: string;
  /** e.g. "MD, FPPA" — shown after the name on the prescription. */
  qualifications: string;
  clinicName: string;
  clinicAddress: string;
  clinicContact: string;
  /** Philippines */
  prcNumber: string;
  ptrNumber: string;
  s2Number: string;
  /** United States */
  npiNumber: string;
  deaNumber: string;
  /** Professional licence used to prescribe. PH: mirrors the PRC record.
   *  US: the state medical licence for the state the patient is in. */
  licenseNumber: string;
  /** US state that issued the licence, e.g. "California". */
  licenseState: string;
  /** Set only when the licence was verified against the issuing register. */
  licenseVerifiedAt?: number;
  /** Certified EPCS provider connected to this account, if any. */
  epcsProvider?: string;
  /** Identity proofing completed with the EPCS provider. */
  epcsIdentityProofedAt?: number;
  /** Two-factor authenticator registered with the EPCS provider. */
  epcsTokenRegisteredAt?: number;
  /** Set when the DEA registration was verified for controlled prescribing. */
  deaVerifiedAt?: number;
  /** Salted hash of the prescriber's signing passphrase, used to
   *  re-authenticate at the moment of signing. The passphrase itself is
   *  never stored. */
  signingPassphrase?: { salt: string; hash: string; setAt: number };
  updatedAt?: number;
};

export function emptyIdentity(): PrescriberIdentity {
  return {
    fullName: "",
    qualifications: "",
    clinicName: "",
    clinicAddress: "",
    clinicContact: "",
    prcNumber: "",
    ptrNumber: "",
    s2Number: "",
    npiNumber: "",
    deaNumber: "",
    licenseNumber: "",
    licenseState: "",
  };
}

export function loadIdentity(fallbackName?: string): PrescriberIdentity {
  const base = emptyIdentity();
  if (typeof window === "undefined") return { ...base, fullName: fallbackName ?? "" };
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<PrescriberIdentity>) : {};
    return { ...base, ...parsed, fullName: parsed.fullName || fallbackName || "" };
  } catch {
    return { ...base, fullName: fallbackName ?? "" };
  }
}

export function saveIdentity(next: PrescriberIdentity): PrescriberIdentity {
  const value = { ...next, updatedAt: Date.now() };
  if (typeof window === "undefined") return value;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(value));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* noop */
  }
  return value;
}

export function subscribeIdentity(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, fn);
  return () => window.removeEventListener(CHANGE_EVENT, fn);
}

/** Fields that must appear on a valid prescription in this jurisdiction. */
export const IDENTITY_FIELDS: Record<
  RxCountry,
  { key: keyof PrescriberIdentity; label: string; required: boolean; hint?: string }[]
> = {
  PH: [
    { key: "fullName", label: "Prescriber full name", required: true },
    { key: "qualifications", label: "Qualifications", required: false, hint: "e.g. MD, FPPA" },
    { key: "clinicName", label: "Clinic name", required: true },
    { key: "clinicAddress", label: "Clinic address", required: true },
    {
      key: "clinicContact",
      label: "Clinic contact information",
      required: true,
      hint: "Landline, mobile or email printed on the prescription",
    },
    { key: "prcNumber", label: "PRC registration number", required: true },
    { key: "ptrNumber", label: "PTR number", required: true },
    {
      key: "s2Number",
      label: "S2 licence number",
      required: false,
      hint: "Required only when prescribing dangerous drugs",
    },
  ],
  US: [
    { key: "fullName", label: "Prescriber full name", required: true },
    { key: "qualifications", label: "Qualifications", required: false, hint: "e.g. MD, DO, NP" },
    { key: "clinicName", label: "Practice name", required: true },
    { key: "clinicAddress", label: "Practice address", required: true },
    { key: "clinicContact", label: "Practice contact information", required: true },
    { key: "licenseNumber", label: "State licence number", required: true },
    {
      key: "licenseState",
      label: "State of licensure",
      required: true,
      hint: "Must cover the state the patient is located in",
    },
    { key: "npiNumber", label: "NPI number", required: true },
    {
      key: "deaNumber",
      label: "DEA registration number",
      required: false,
      hint: "Required only for controlled substances",
    },
  ],
};

/** Identity fields still missing for a standard (non-controlled) prescription. */
export function missingIdentityFields(id: PrescriberIdentity, country: RxCountry): string[] {
  return IDENTITY_FIELDS[country]
    .filter((f) => f.required && !String(id[f.key] ?? "").trim())
    .map((f) => f.label);
}

/** Credentials recorded in the audit log alongside the signature. */
export function credentialSummary(id: PrescriberIdentity, country: RxCountry): string {
  const parts =
    country === "PH"
      ? [id.prcNumber && `PRC ${id.prcNumber}`, id.ptrNumber && `PTR ${id.ptrNumber}`, id.s2Number && `S2 ${id.s2Number}`]
      : [id.npiNumber && `NPI ${id.npiNumber}`, id.deaNumber && `DEA ${id.deaNumber}`];
  return parts.filter(Boolean).join(" · ") || "No credentials on file";
}

// ------------------------------------------------- signing re-authentication

function hashPassphrase(passphrase: string, salt: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  const input = `${salt}:${passphrase}`;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash ^ BigInt(input.charCodeAt(i))) & mask;
    hash = (hash * prime) & mask;
  }
  return hash.toString(16).padStart(16, "0");
}

/** Sets the passphrase the prescriber must re-enter to sign. */
export function setSigningPassphrase(
  identity: PrescriberIdentity,
  passphrase: string,
): PrescriberIdentity {
  const salt = Math.random().toString(36).slice(2, 12);
  return saveIdentity({
    ...identity,
    signingPassphrase: { salt, hash: hashPassphrase(passphrase, salt), setAt: Date.now() },
  });
}

export function hasSigningPassphrase(identity: PrescriberIdentity): boolean {
  return !!identity.signingPassphrase?.hash;
}

export function verifySigningPassphrase(
  identity: PrescriberIdentity,
  passphrase: string,
): boolean {
  const stored = identity.signingPassphrase;
  if (!stored) return false;
  return hashPassphrase(passphrase, stored.salt) === stored.hash;
}
