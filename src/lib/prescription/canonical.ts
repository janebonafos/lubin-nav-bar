// Canonical prescription representation.
//
// The canonical JSON is the exact document the prescriber signs. It is built on
// the backend and hashed with SHA-256 there; this module holds the pure,
// deterministic shaping so it can be unit tested.

export type StructuredRxItem = {
  medication_concept_id: string | null;
  medication_product_id: string | null;
  generic_name: string;
  brand_name?: string | null;
  strength?: string | null;
  dosage_form?: string | null;
  dose_amount?: string | null;
  dose_unit?: string | null;
  route?: string | null;
  frequency?: string | null;
  timing?: string | null;
  duration?: string | null;
  stop_or_review_date?: string | null;
  quantity?: string | null;
  quantity_unit?: string | null;
  refills?: string | null;
  indication?: string | null;
  prn?: boolean;
  prn_reason?: string | null;
  max_daily_dose?: string | null;
  titration_instructions?: string | null;
  taper_instructions?: string | null;
  special_administration?: string | null;
  follow_up_plan?: string | null;
  patient_instructions?: string | null;
  generated_sig?: string | null;
  sig_override?: string | null;
};

/** Deterministic JSON: object keys sorted, undefined dropped. */
export function canonicalize(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      const v = source[key];
      if (v === undefined) continue;
      out[key] = sortValue(v);
    }
    return out;
  }
  return value ?? null;
}

/** Patient-facing SIG derived from the structured fields. */
export function buildSig(item: StructuredRxItem): string {
  const dose = [item.dose_amount, item.dose_unit].filter(Boolean).join(" ").trim();
  const parts: string[] = [];
  parts.push(
    ["Take", dose || item.strength || null, item.dosage_form?.toLowerCase() ?? null]
      .filter(Boolean)
      .join(" "),
  );
  if (item.route) parts.push(`by ${item.route.toLowerCase()} route`);
  if (item.frequency) parts.push(item.frequency.toLowerCase());
  if (item.timing) parts.push(item.timing.toLowerCase());
  if (item.prn) parts.push(`as needed${item.prn_reason ? ` for ${item.prn_reason.toLowerCase()}` : ""}`);
  if (item.duration) parts.push(`for ${item.duration.toLowerCase()}`);
  const sentence = parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  const extras: string[] = [];
  if (item.max_daily_dose) extras.push(`Maximum ${item.max_daily_dose} per day.`);
  if (item.titration_instructions) extras.push(item.titration_instructions.trim());
  if (item.taper_instructions) extras.push(item.taper_instructions.trim());
  if (item.special_administration) extras.push(item.special_administration.trim());
  const head = sentence ? `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.` : "";
  return [head, ...extras].filter(Boolean).join(" ").trim();
}

/** The SIG that appears on the document: provider override wins. */
export function effectiveSig(item: StructuredRxItem): string {
  const override = (item.sig_override ?? "").trim();
  if (override) return override;
  const generated = (item.generated_sig ?? "").trim();
  return generated || buildSig(item);
}

export type CanonicalInput = {
  prescription_number: string;
  prescription_version: number;
  jurisdiction_code: string;
  country_code: string;
  issued_at: string;
  patient: {
    full_legal_name: string;
    date_of_birth: string | null;
    age: number | null;
    clinically_relevant_sex?: string | null;
    residential_address: string | null;
  };
  prescriber: {
    full_legal_name: string;
    professional_designation: string | null;
    prc_number: string;
    ptr_number: string;
    practice_name: string | null;
    practice_address: string | null;
    professional_contact: string | null;
    verification_status: string;
    verification_snapshot_at: string | null;
  };
  items: StructuredRxItem[];
  safety_review: {
    service_name: string;
    service_version: string;
    limited_screening: boolean;
    reviewed_at: string;
  } | null;
  attestation: string;
};

/** Fields that legally matter, in a stable shape, ready for SHA-256 hashing. */
export function canonicalPrescriptionPayload(input: CanonicalInput) {
  return sortValue({
    ...input,
    items: input.items.map((item) => ({
      medication_concept_id: item.medication_concept_id,
      medication_product_id: item.medication_product_id,
      generic_name: item.generic_name,
      brand_name: item.brand_name ?? null,
      strength: item.strength ?? null,
      dosage_form: item.dosage_form ?? null,
      dose_amount: item.dose_amount ?? null,
      dose_unit: item.dose_unit ?? null,
      route: item.route ?? null,
      frequency: item.frequency ?? null,
      timing: item.timing ?? null,
      duration: item.duration ?? null,
      stop_or_review_date: item.stop_or_review_date ?? null,
      quantity: item.quantity ?? null,
      quantity_unit: item.quantity_unit ?? null,
      refills: item.refills ?? null,
      indication: item.indication ?? null,
      prn: !!item.prn,
      prn_reason: item.prn_reason ?? null,
      max_daily_dose: item.max_daily_dose ?? null,
      titration_instructions: item.titration_instructions ?? null,
      taper_instructions: item.taper_instructions ?? null,
      special_administration: item.special_administration ?? null,
      follow_up_plan: item.follow_up_plan ?? null,
      patient_instructions: item.patient_instructions ?? null,
      sig: effectiveSig(item),
    })),
  }) as Record<string, unknown>;
}

/** Fields whose change invalidates verification, safety review and signing. */
export function itemSignature(item: StructuredRxItem): string {
  return canonicalize({
    concept: item.medication_concept_id,
    product: item.medication_product_id,
    generic: item.generic_name,
    strength: item.strength,
    dose: [item.dose_amount, item.dose_unit].filter(Boolean).join(" "),
    route: item.route,
    frequency: item.frequency,
    quantity: [item.quantity, item.quantity_unit].filter(Boolean).join(" "),
    refills: item.refills,
    sig: effectiveSig(item),
  });
}
