// Pure Phase 1 prescribing blockers.
//
// Every rule here is enforced again on the backend before a signing challenge is
// issued and before a signature is written. Nothing in the browser can waive a
// blocker: the frontend only uses these to explain the state to the provider.

import {
  DANGEROUS_DRUG_MESSAGE,
  RX_DANGEROUS_DRUGS_ENABLED,
  isPrescribingJurisdictionEnabled,
  JURISDICTION_UNAVAILABLE_MESSAGE,
} from "./flags";
import type { StructuredRxItem } from "./canonical";
import { effectiveSig } from "./canonical";

export type ClinicalState = "documented" | "none_known" | "not_applicable" | "not_assessed";

export type CatalogProduct = {
  id: string;
  medication_concept_id: string;
  generic_name: string;
  active: boolean;
  approval_status: "draft" | "in_review" | "approved" | "rejected";
  dangerous_drug: boolean;
  requires_s2: boolean;
};

export type Blocker = { code: string; message: string };

/** "not assessed" is never a negative result. */
export function allergiesRuledOut(state: ClinicalState): boolean {
  return state === "none_known" || state === "not_applicable";
}

export function stateIsAssessed(state: ClinicalState): boolean {
  return state !== "not_assessed";
}

/** Catalogue-level blockers for a single product. */
export function productBlockers(product: CatalogProduct | null | undefined): Blocker[] {
  const out: Blocker[] = [];
  if (!product) {
    out.push({
      code: "not_mapped",
      message:
        "This medication is not mapped to an approved Philippine catalogue entry, so it cannot be signed.",
    });
    return out;
  }
  if (product.approval_status !== "approved" || !product.active) {
    out.push({
      code: "catalog_unapproved",
      message:
        "This catalogue entry has not been clinically approved yet, so it cannot be prescribed.",
    });
  }
  if (product.dangerous_drug || product.requires_s2) {
    out.push({ code: "dangerous_drug", message: DANGEROUS_DRUG_MESSAGE });
  }
  return out;
}

/** True when the medication may be suggested, added or signed at all. */
export function productIsPrescribable(product: CatalogProduct | null | undefined): boolean {
  if (RX_DANGEROUS_DRUGS_ENABLED) {
    // Reserved for a future phase; the flag is false in Phase 1.
    return !!product && product.active && product.approval_status === "approved";
  }
  return productBlockers(product).length === 0;
}

const REQUIRED_ITEM_FIELDS: (keyof StructuredRxItem)[] = [
  "generic_name",
  "strength",
  "dose_amount",
  "route",
  "frequency",
  "quantity",
  "refills",
];

export function itemFieldBlockers(item: StructuredRxItem): Blocker[] {
  const missing = REQUIRED_ITEM_FIELDS.filter((field) => {
    const value = item[field];
    return value == null || String(value).trim() === "";
  });
  const out: Blocker[] = missing.map((field) => ({
    code: `missing_${String(field)}`,
    message: `${String(field).replace(/_/g, " ")} is required before signing.`,
  }));
  if (!effectiveSig(item).trim()) {
    out.push({ code: "missing_sig", message: "The patient SIG is required before signing." });
  }
  return out;
}

export type PreSignInput = {
  jurisdiction_code: string;
  patient_location_country: string | null;
  can_prescribe: boolean;
  patient: {
    full_legal_name: string | null;
    date_of_birth: string | null;
    residential_address: string | null;
  };
  allergy_state: ClinicalState;
  items: { item: StructuredRxItem; product: CatalogProduct | null }[];
  safety_review: { reviewed_at: string; stale_at: string | null } | null;
  unacknowledged_findings: number;
  clinical_confirmation_at: string | null;
};

/** The complete pre-signing gate. The backend calls this before every signature. */
export function preSignBlockers(input: PreSignInput): Blocker[] {
  const out: Blocker[] = [];

  if (!isPrescribingJurisdictionEnabled(input.jurisdiction_code)) {
    out.push({ code: "jurisdiction", message: JURISDICTION_UNAVAILABLE_MESSAGE });
  }
  if ((input.patient_location_country ?? "").toUpperCase() !== "PH") {
    out.push({
      code: "patient_location",
      message:
        "The Phase 1 prescribing flow requires the patient to be located in the Philippines during the encounter.",
    });
  }
  if (!input.can_prescribe) {
    out.push({
      code: "authority",
      message: "Your Lubin prescribing authority for the Philippines is not currently active.",
    });
  }
  if (!input.patient.full_legal_name?.trim()) {
    out.push({ code: "patient_name", message: "The patient's full legal name is required." });
  }
  if (!input.patient.date_of_birth) {
    out.push({ code: "patient_dob", message: "The patient's date of birth is required." });
  }
  if (!input.patient.residential_address?.trim()) {
    out.push({ code: "patient_address", message: "The patient's residential address is required." });
  }
  if (!stateIsAssessed(input.allergy_state)) {
    out.push({
      code: "allergy_not_assessed",
      message: "Allergy status has not been assessed. Record it before signing.",
    });
  }
  if (input.items.length === 0) {
    out.push({ code: "no_items", message: "Add at least one medication before signing." });
  }
  for (const entry of input.items) {
    for (const blocker of productBlockers(entry.product)) {
      out.push({ ...blocker, message: `${entry.item.generic_name}: ${blocker.message}` });
    }
    for (const blocker of itemFieldBlockers(entry.item)) {
      out.push({ ...blocker, message: `${entry.item.generic_name}: ${blocker.message}` });
    }
  }
  if (!input.safety_review) {
    out.push({ code: "safety_missing", message: "Run the safety review before signing." });
  } else if (input.safety_review.stale_at) {
    out.push({
      code: "safety_stale",
      message: "Patient or medication information changed. Run the safety review again.",
    });
  }
  if (input.unacknowledged_findings > 0) {
    out.push({
      code: "findings_unacknowledged",
      message: "Acknowledge the outstanding safety findings before signing.",
    });
  }
  if (!input.clinical_confirmation_at) {
    out.push({
      code: "confirmation_missing",
      message: "Record your final clinical confirmation before signing.",
    });
  }
  return out;
}
