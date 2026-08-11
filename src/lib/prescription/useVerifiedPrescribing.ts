import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPrescribingVerification } from "./verification.functions";
import type { VerifiedPrescriberRecord, VerificationStatus } from "./verification.server";
import { isPrescriber, type RxCountry } from "./store";
import { emptyIdentity, type PrescriberIdentity } from "./credentials";
import { prescriberPrintGaps } from "./legal";

export type { VerifiedPrescriberRecord, VerificationStatus };

export const VERIFICATION_STATUS_LABEL: Record<VerificationStatus, string> = {
  verified: "Verified by Lubin",
  "in-review": "Verification in review",
  "action-required": "Verification needs your action",
  "not-submitted": "Verification not started",
  expired: "Verification expired",
  suspended: "Prescribing suspended",
};

/** Reads the provider profile saved on this device, for the account lookup. */
export function localProviderProfile(): { name?: string; profession?: string } {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem("lubin.providerProfile.v1");
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { name?: string; fullName?: string; profession?: string };
    return { name: parsed.name || parsed.fullName, profession: parsed.profession };
  } catch {
    return {};
  }
}

/** Fetches the Lubin verification record for the signed-in provider. */
export function useVerifiedPrescribing(providerName?: string, profession?: string) {
  const fetchVerification = useServerFn(getPrescribingVerification);
  const local = localProviderProfile();
  const name = providerName || local.name || "";
  const prof = profession || local.profession || "";
  return useQuery({
    queryKey: ["prescribing-verification", name, prof],
    queryFn: () => fetchVerification({ data: { providerName: name, profession: prof } }),
    staleTime: 5 * 60 * 1000,
  });
}

export type PrescribingGate = {
  allowed: boolean;
  status: VerificationStatus;
  /** Plain-language reason prescribing is unavailable. */
  reason?: string;
  outstanding: string[];
};

/** Being a doctor is not enough: Lubin must have verified prescribing
 *  authority for the jurisdiction this patient is being treated in. */
export function prescribingGate(args: {
  record?: VerifiedPrescriberRecord | null;
  country: RxCountry;
  profession?: string;
}): PrescribingGate {
  const { record, country } = args;
  const profession = args.profession || record?.profession;
  if (!record)
    return {
      allowed: false,
      status: "not-submitted",
      reason: "Your prescribing verification could not be loaded.",
      outstanding: [],
    };
  if (!isPrescriber(profession))
    return {
      allowed: false,
      status: record.status,
      reason: "Your registered profession does not include prescribing.",
      outstanding: [],
    };
  if (record.status !== "verified")
    return {
      allowed: false,
      status: record.status,
      reason:
        record.status === "in-review"
          ? "Lubin is still verifying your prescribing credentials."
          : record.status === "expired"
            ? "Your verified prescribing credentials have expired."
            : record.status === "suspended"
              ? "Prescribing on Lubin is suspended for your account."
              : "You have not completed Lubin's prescribing verification.",
      outstanding: record.outstanding,
    };
  if (record.expiresAt && record.expiresAt < Date.now())
    return {
      allowed: false,
      status: "expired",
      reason: "Your verified prescribing credentials have expired.",
      outstanding: ["Renew your credentials and resubmit them to Lubin"],
    };
  if (!record.jurisdictions.includes(country))
    return {
      allowed: false,
      status: record.status,
      reason: `Your prescribing authority is verified for ${record.jurisdictions.join(", ") || "no jurisdiction"}, not for ${country === "PH" ? "the Philippines" : "the United States"}.`,
      outstanding: [
        `Add ${country === "PH" ? "Philippine" : "United States"} prescribing credentials to your Lubin verification`,
      ],
    };
  // Verified authority is not enough: everything that must be printed on a
  // legal prescription has to already be on file, so a prescriber is never
  // asked to fix their own details while issuing a prescription.
  const printGaps = prescriberPrintGaps(
    applyVerifiedRecord(emptyIdentity(), record).identity,
    country,
    false,
  );
  if (printGaps.length > 0)
    return {
      allowed: false,
      status: record.status,
      reason:
        "Your verified prescriber details are incomplete, so a compliant prescription cannot be printed yet.",
      outstanding: printGaps.map(
        (label) => `Add ${label.toLowerCase()} to your Lubin prescribing verification`,
      ),
    };
  return { allowed: true, status: "verified", outstanding: [] };
}

/** Credential fields supplied by Lubin's verification record. These are
 *  read-only at prescribing time — a prescriber cannot type over a verified
 *  licence number. */
export const BACKED_IDENTITY_KEYS = [
  "fullName",
  "qualifications",
  "clinicName",
  "clinicAddress",
  "clinicContact",
  "prcNumber",
  "ptrNumber",
  "s2Number",
  "licenseNumber",
  "licenseState",
  "npiNumber",
  "deaNumber",
] as const satisfies readonly (keyof PrescriberIdentity)[];

/** Overlays the verified record onto the local identity. Only fields the
 *  backend actually holds are locked; anything missing stays editable so the
 *  prescriber can see exactly what is not on file. */
export function applyVerifiedRecord(
  identity: PrescriberIdentity,
  record?: VerifiedPrescriberRecord | null,
): { identity: PrescriberIdentity; locked: Set<string> } {
  if (!record) return { identity, locked: new Set() };
  const next: PrescriberIdentity = { ...identity };
  const locked = new Set<string>();
  for (const key of BACKED_IDENTITY_KEYS) {
    const value = (record as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) {
      (next as Record<string, unknown>)[key] = value;
      locked.add(key);
    }
  }
  if (record.accountEmail?.trim()) {
    next.signingEmail = record.accountEmail.trim();
    locked.add("signingEmail");
  }
  if (record.status === "verified" && record.verifiedAt) next.licenseVerifiedAt = record.verifiedAt;
  if (record.deaVerifiedAt) next.deaVerifiedAt = record.deaVerifiedAt;
  if (record.epcsProvider) next.epcsProvider = record.epcsProvider;
  if (record.epcsIdentityProofedAt) next.epcsIdentityProofedAt = record.epcsIdentityProofedAt;
  if (record.epcsTokenRegisteredAt) next.epcsTokenRegisteredAt = record.epcsTokenRegisteredAt;
  return { identity: next, locked };
}
