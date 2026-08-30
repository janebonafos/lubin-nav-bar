// Phase 1 prescribing feature flags.
//
// These are read on both client and server. The client uses them to hide
// surfaces; the backend re-reads them so a flag can never be flipped from the
// browser.

function envFlag(name: string, fallback: boolean): boolean {
  const fromServer =
    typeof process !== "undefined" && process.env ? process.env[name] : undefined;
  const fromClient = (import.meta.env as Record<string, string | undefined>)[`VITE_${name}`];
  const raw = fromServer ?? fromClient;
  if (raw == null || raw === "") return fallback;
  return raw === "true" || raw === "1";
}

/** Dangerous-drug / S2 prescribing is not supported in Lubin. */
export const RX_DANGEROUS_DRUGS_ENABLED = envFlag("RX_DANGEROUS_DRUGS_ENABLED", false);

/**
 * AI medication suggestions stay off until the Philippine medication catalogue
 * and its clinical review process are approved. Manual prescribing can be
 * exercised independently of this flag.
 */
export const RX_AI_SUGGESTIONS_ENABLED = envFlag("RX_AI_SUGGESTIONS_ENABLED", false);

/** Jurisdictions where Lubin prescribing is available. Phase 1 is PH only. */
export const ENABLED_PRESCRIBING_JURISDICTIONS = ["PH"] as const;

export type EnabledJurisdiction = (typeof ENABLED_PRESCRIBING_JURISDICTIONS)[number];

export const JURISDICTION_UNAVAILABLE_MESSAGE =
  "Prescribing through Lubin is not currently available in this jurisdiction.";

export const DANGEROUS_DRUG_MESSAGE =
  "This medication requires the Philippine dangerous-drug/S2 prescribing pathway, which is not supported in Lubin yet. Use your existing compliant prescribing process.";

export const AI_UNAVAILABLE_MESSAGE =
  "Medication options could not be generated safely. Review the missing information or add a medication manually.";

export const LIMITED_SCREENING_MESSAGE =
  "Limited screening completed — comprehensive interaction and contraindication review is not available.";

export const CLINICAL_ATTESTATION_STATEMENT =
  "I have reviewed the patient information, medication, dose, SIG, quantity, refills, safety findings and available references. I intend to issue this prescription and accept clinical responsibility for it.";

export function isPrescribingJurisdictionEnabled(code: string | null | undefined): boolean {
  if (!code) return false;
  return (ENABLED_PRESCRIBING_JURISDICTIONS as readonly string[]).includes(code.toUpperCase());
}

/** Local-development-only OTP echo. Never true in a production build. */
export function devOtpEchoEnabled(): boolean {
  if (typeof process === "undefined" || !process.env) return false;
  if (process.env["NODE_ENV"] === "production") return false;
  return process.env["RX_DEV_OTP_ECHO"] === "true";
}
