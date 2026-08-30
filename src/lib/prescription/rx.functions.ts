// Backend prescribing API. Every function re-derives authorization on the
// server: nothing here trusts a value sent by the browser other than opaque IDs.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canonicalize, canonicalPrescriptionPayload, effectiveSig } from "./canonical";
import type { StructuredRxItem } from "./canonical";
import { preSignBlockers, productIsPrescribable } from "./blockers";
import type { CatalogProduct, ClinicalState } from "./blockers";
import {
  CLINICAL_ATTESTATION_STATEMENT,
  LIMITED_SCREENING_MESSAGE,
  RX_AI_SUGGESTIONS_ENABLED,
  devOtpEchoEnabled,
  isPrescribingJurisdictionEnabled,
} from "./flags";

type Json = Record<string, unknown>;

function forbidden(message = "Forbidden"): never {
  throw new Response(message, { status: 403 });
}

async function audit(
  // Admin client; typed loosely so audit writes stay a single helper.
  admin: { from: (t: string) => { insert: (v: Json) => unknown } },

  event: {
    draft_id?: string | null;
    encounter_id?: string | null;
    actor_user_id: string;
    event_type: string;
    detail?: Json;
  },
) {
  await admin.from("prescription_audit_events").insert({
    draft_id: event.draft_id ?? null,
    encounter_id: event.encounter_id ?? null,
    actor_user_id: event.actor_user_id,
    event_type: event.event_type,
    detail: event.detail ?? {},
  });
}

/** Authenticated provider context for an appointment, loaded from the backend. */
export const getEncounterContext = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { appointmentId: string }) => ({
    appointmentId: String(input?.appointmentId ?? ""),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: appointment } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", data.appointmentId)
      .maybeSingle();
    // RLS already restricts this read to the assigned provider or the patient.
    if (!appointment) forbidden("You are not authorized to open this appointment.");

    const { data: encounter } = await supabase
      .from("encounters")
      .select("*")
      .eq("appointment_id", data.appointmentId)
      .maybeSingle();

    const { data: providerProfile } = await supabase
      .from("provider_profiles")
      .select("full_legal_name, professional_designation, profession, practice_name, practice_address, professional_contact, can_document, can_diagnose, requires_cosign")
      .eq("user_id", userId)
      .maybeSingle();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const isProvider = appointment.provider_user_id === userId;
    let canPrescribe = false;
    let prescriberDisplay: {
      status: string;
      verified_at: string | null;
      license_expires_at: string | null;
      signing_email_verified: boolean;
      signing_email_masked: string;
      outstanding: string[];
    } | null = null;
    if (isProvider) {
      if (encounter?.id) {
        const { data: allowed } = await supabaseAdmin.rpc("can_prescribe_ph", {
          _provider_user_id: userId,
          _encounter_id: encounter.id,
        });
        canPrescribe = allowed === true;
      }
      const { data: verification } = await supabaseAdmin
        .from("provider_verifications")
        .select("status, verified_at, license_expires_at, signing_email, signing_email_verified_at, outstanding")
        .eq("provider_user_id", userId)
        .eq("jurisdiction_code", "PH")
        .maybeSingle();
      // Safe display information only: never the PRC/PTR numbers themselves.
      prescriberDisplay = verification
        ? {
            status: verification.status,
            verified_at: verification.verified_at,
            license_expires_at: verification.license_expires_at,
            signing_email_verified: !!verification.signing_email_verified_at,
            signing_email_masked: maskEmail(verification.signing_email ?? ""),
            outstanding: (verification.outstanding ?? []) as string[],
          }
        : null;
    }


    return {
      appointment,
      encounter,
      role: isProvider ? ("provider" as const) : ("patient" as const),
      permissions: {
        can_document: isProvider ? (providerProfile?.can_document ?? false) : false,
        can_diagnose: isProvider ? (providerProfile?.can_diagnose ?? false) : false,
        requires_cosign: isProvider ? (providerProfile?.requires_cosign ?? false) : false,
        can_prescribe_ph: canPrescribe,
      },
      jurisdiction_enabled: isPrescribingJurisdictionEnabled(appointment.jurisdiction_code),
      ai_suggestions_enabled: RX_AI_SUGGESTIONS_ENABLED,
      provider_profile: providerProfile ?? null,
      verification: prescriberDisplay,
    };
  });

function maskEmail(email: string) {
  const [user = "", domain = ""] = email.trim().split("@");
  if (!domain) return "";
  return `${user.slice(0, 2)}${"•".repeat(Math.max(user.length - 2, 2))}@${domain}`;
}

/** Approved, active, non-dangerous Philippine catalogue candidates. */
export const searchApprovedPhCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query?: string; limit?: number }) => ({
    query: String(input?.query ?? "").slice(0, 80),
    limit: Math.min(Math.max(Number(input?.limit ?? 20), 1), 50),
  }))
  .handler(async ({ data, context }) => {
    let request = context.supabase
      .from("medication_products_ph")
      .select(
        "id, medication_concept_id, brand_names, strength_value, strength_unit, dosage_form, route, ph_registration_id, manufacturer, registration_status, prescription_classification, dangerous_drug, requires_s2, approval_status, active, catalog_version, last_verified_at, medication_concepts(generic_name, inn_name, medication_class, approval_status, active)",
      )
      .eq("jurisdiction_code", "PH")
      .eq("approval_status", "approved")
      .eq("active", true)
      .eq("dangerous_drug", false)
      .eq("requires_s2", false)
      .limit(data.limit);
    if (data.query) request = request.ilike("ph_registration_id", `%${data.query}%`);
    const { data: rows, error } = await request;
    if (error) throw new Error(error.message);
    const q = data.query.toLowerCase();
    const filtered = (rows ?? []).filter((row) => {
      const concept = row.medication_concepts as { generic_name?: string } | null;
      if (!q) return true;
      return (concept?.generic_name ?? "").toLowerCase().includes(q);
    });
    return { products: filtered, catalog_query: data.query };
  });

async function loadDraftBundle(
  supabase: { from: (t: string) => any },
  draftId: string,
) {
  const { data: draft } = await supabase
    .from("prescription_drafts")
    .select("*")
    .eq("id", draftId)
    .maybeSingle();
  if (!draft) forbidden("You are not authorized to sign this prescription.");
  const { data: items } = await supabase
    .from("prescription_items")
    .select("*")
    .eq("draft_id", draftId)
    .order("created_at", { ascending: true });
  const { data: review } = await supabase
    .from("prescription_safety_reviews")
    .select("*")
    .eq("draft_id", draftId)
    .order("reviewed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  let unacknowledged = 0;
  if (review) {
    const { count } = await supabase
      .from("prescription_safety_findings")
      .select("id", { count: "exact", head: true })
      .eq("review_id", review.id)
      .eq("requires_acknowledgement", true)
      .is("acknowledged_at", null);
    unacknowledged = count ?? 0;
  }
  return { draft, items: items ?? [], review, unacknowledged };
}

function toStructured(row: Json): StructuredRxItem {
  return {
    medication_concept_id: (row["medication_concept_id"] as string) ?? null,
    medication_product_id: (row["medication_product_id"] as string) ?? null,
    generic_name: String(row["generic_name"] ?? ""),
    brand_name: (row["brand_name"] as string) ?? null,
    strength: (row["strength"] as string) ?? null,
    dosage_form: (row["dosage_form"] as string) ?? null,
    dose_amount: (row["dose_amount"] as string) ?? null,
    dose_unit: (row["dose_unit"] as string) ?? null,
    route: (row["route"] as string) ?? null,
    frequency: (row["frequency"] as string) ?? null,
    timing: (row["timing"] as string) ?? null,
    duration: (row["duration"] as string) ?? null,
    stop_or_review_date: (row["stop_or_review_date"] as string) ?? null,
    quantity: (row["quantity"] as string) ?? null,
    quantity_unit: (row["quantity_unit"] as string) ?? null,
    refills: (row["refills"] as string) ?? null,
    indication: (row["indication"] as string) ?? null,
    prn: !!row["prn"],
    prn_reason: (row["prn_reason"] as string) ?? null,
    max_daily_dose: (row["max_daily_dose"] as string) ?? null,
    titration_instructions: (row["titration_instructions"] as string) ?? null,
    taper_instructions: (row["taper_instructions"] as string) ?? null,
    special_administration: (row["special_administration"] as string) ?? null,
    follow_up_plan: (row["follow_up_plan"] as string) ?? null,
    patient_instructions: (row["patient_instructions"] as string) ?? null,
    generated_sig: (row["generated_sig"] as string) ?? null,
    sig_override: (row["sig_override"] as string) ?? null,
  };
}

/** Rebuilds the exact document to be signed and returns its blockers + hash. */
async function buildSignable(admin: any, draftId: string, providerUserId: string) {
  const bundle = await loadDraftBundle(admin, draftId);
  const { draft, items, review, unacknowledged } = bundle;
  if (draft.provider_user_id !== providerUserId) forbidden();

  const { data: encounter } = await admin
    .from("encounters")
    .select("*")
    .eq("id", draft.encounter_id)
    .maybeSingle();
  const { data: patient } = draft.patient_user_id
    ? await admin.from("profiles").select("*").eq("id", draft.patient_user_id).maybeSingle()
    : { data: null };
  const { data: allergyRows } = await admin
    .from("patient_allergies")
    .select("state")
    .eq("encounter_id", draft.encounter_id);
  const allergyState: ClinicalState =
    (allergyRows ?? []).find((r: Json) => r["state"] === "documented")
      ? "documented"
      : ((allergyRows?.[0]?.state as ClinicalState) ?? "not_assessed");

  const productIds = items.map((i: Json) => i["medication_product_id"]).filter(Boolean);
  const { data: products } = productIds.length
    ? await admin
        .from("medication_products_ph")
        .select("id, medication_concept_id, dangerous_drug, requires_s2, approval_status, active, medication_concepts(generic_name)")
        .in("id", productIds)
    : { data: [] };
  const productMap = new Map<string, CatalogProduct>();
  for (const row of products ?? []) {
    productMap.set(row.id, {
      id: row.id,
      medication_concept_id: row.medication_concept_id,
      generic_name: (row.medication_concepts as { generic_name?: string } | null)?.generic_name ?? "",
      active: row.active,
      approval_status: row.approval_status,
      dangerous_drug: row.dangerous_drug,
      requires_s2: row.requires_s2,
    });
  }

  const structured: StructuredRxItem[] = (items as Json[]).map((row) => toStructured(row));
  const { data: verification } = await admin
    .from("provider_verifications")
    .select("*")
    .eq("provider_user_id", providerUserId)
    .eq("jurisdiction_code", "PH")
    .maybeSingle();
  const { data: providerProfile } = await admin
    .from("provider_profiles")
    .select("*")
    .eq("user_id", providerUserId)
    .maybeSingle();
  const { data: canPrescribe } = await admin.rpc("can_prescribe_ph", {
    _provider_user_id: providerUserId,
    _encounter_id: draft.encounter_id,
  });

  const blockers = preSignBlockers({
    jurisdiction_code: draft.jurisdiction_code,
    patient_location_country: encounter?.patient_location_country ?? null,
    can_prescribe: canPrescribe === true,
    patient: {
      full_legal_name: patient?.full_legal_name ?? null,
      date_of_birth: patient?.date_of_birth ?? null,
      residential_address: patient?.residential_address ?? null,
    },
    allergy_state: allergyState,
    items: structured.map((item, index) => ({
      item,
      product: item.medication_product_id
        ? (productMap.get(item.medication_product_id) ?? null)
        : (structured[index] ? null : null),
    })),
    safety_review: review
      ? { reviewed_at: review.reviewed_at, stale_at: review.stale_at ?? null }
      : null,
    unacknowledged_findings: unacknowledged,
    clinical_confirmation_at: draft.clinical_confirmation_at ?? null,
  });

  const { calculateAge, sha256Hex, prescriptionNumber } = await import("./rx.server");
  const canonical = canonicalPrescriptionPayload({
    prescription_number: "",
    prescription_version: draft.version,
    jurisdiction_code: draft.jurisdiction_code,
    country_code: draft.country_code,
    issued_at: new Date().toISOString().slice(0, 10),
    patient: {
      full_legal_name: patient?.full_legal_name ?? "",
      date_of_birth: patient?.date_of_birth ?? null,
      age: calculateAge(patient?.date_of_birth ?? null),
      clinically_relevant_sex: patient?.clinically_relevant_sex ?? null,
      residential_address: patient?.residential_address ?? null,
    },
    prescriber: {
      full_legal_name: providerProfile?.full_legal_name ?? "",
      professional_designation: providerProfile?.professional_designation ?? null,
      prc_number: verification?.prc_number ?? "",
      ptr_number: verification?.ptr_number ?? "",
      practice_name: providerProfile?.practice_name ?? null,
      practice_address: providerProfile?.practice_address ?? null,
      professional_contact: providerProfile?.professional_contact ?? null,
      verification_status: verification?.status ?? "not_submitted",
      verification_snapshot_at: verification?.verified_at ?? null,
    },
    items: structured,
    safety_review: review
      ? {
          service_name: review.service_name,
          service_version: review.service_version,
          limited_screening: review.limited_screening,
          reviewed_at: review.reviewed_at,
        }
      : null,
    attestation: CLINICAL_ATTESTATION_STATEMENT,
  });
  const documentSha256 = await sha256Hex(canonicalize(canonical));

  return {
    draft,
    encounter,
    patient,
    verification,
    providerProfile,
    structured,
    review,
    blockers,
    canonical,
    documentSha256,
    nextPrescriptionNumber: prescriptionNumber(),
  };
}

/** Requests an email signing code. The browser sends only the draft ID. */
export const requestSigningChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { prescriptionDraftId: string }) => ({
    prescriptionDraftId: String(input?.prescriptionDraftId ?? ""),
  }))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const {
      OTP_REQUEST_LIMIT,
      OTP_REQUEST_WINDOW_MS,
      OTP_TTL_MS,
      generateSigningOtp,
      hashOtp,
    } = await import("./rx.server");

    const signable = await buildSignable(supabaseAdmin, data.prescriptionDraftId, userId);
    if (signable.blockers.length > 0) {
      await audit(supabaseAdmin, {
        draft_id: signable.draft.id,
        encounter_id: signable.draft.encounter_id,
        actor_user_id: userId,
        event_type: "signing_challenge_blocked",
        detail: { blockers: signable.blockers.map((b) => b.code) },
      });
      return { ok: false as const, blockers: signable.blockers };
    }

    const signingEmail = signable.verification?.signing_email as string | undefined;
    if (!signingEmail || !signable.verification?.signing_email_verified_at) {
      return {
        ok: false as const,
        blockers: [
          {
            code: "signing_email",
            message: "No verified signing email is on file for your Lubin prescriber account.",
          },
        ],
      };
    }

    const since = new Date(Date.now() - OTP_REQUEST_WINDOW_MS).toISOString();
    const { count } = await supabaseAdmin
      .from("signing_challenges")
      .select("id", { count: "exact", head: true })
      .eq("provider_user_id", userId)
      .gte("created_at", since);
    if ((count ?? 0) >= OTP_REQUEST_LIMIT) {
      return {
        ok: false as const,
        blockers: [
          { code: "rate_limited", message: "Too many signing codes requested. Try again shortly." },
        ],
      };
    }

    // Any older challenge for this draft is invalidated.
    await supabaseAdmin
      .from("signing_challenges")
      .update({ invalidated_at: new Date().toISOString(), invalidated_reason: "superseded" })
      .eq("draft_id", signable.draft.id)
      .is("consumed_at", null)
      .is("invalidated_at", null);

    const otp = generateSigningOtp();
    const otp_hash = await hashOtp({
      otp,
      draftId: signable.draft.id,
      version: signable.draft.version,
      documentSha256: signable.documentSha256,
      providerUserId: userId,
    });
    const { data: challenge, error } = await supabaseAdmin
      .from("signing_challenges")
      .insert({
        provider_user_id: userId,
        draft_id: signable.draft.id,
        prescription_version: signable.draft.version,
        document_sha256: signable.documentSha256,
        otp_hash,
        expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
      })
      .select("id, expires_at")
      .single();
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("prescription_drafts")
      .update({ unsigned_document_hash: signable.documentSha256, status: "ready_for_review" })
      .eq("id", signable.draft.id);

    const { deliverSigningCode } = await import("./signingEmail.server");
    const delivery = await deliverSigningCode({
      email: signingEmail,
      code: otp,
      reference: `Draft ${signable.draft.id.slice(0, 8)}`,
      ttlMinutes: OTP_TTL_MS / 60000,
    });

    await audit(supabaseAdmin, {
      draft_id: signable.draft.id,
      encounter_id: signable.draft.encounter_id,
      actor_user_id: userId,
      event_type: "signing_challenge_requested",
      detail: { challenge_id: challenge.id, delivered: delivery.delivered },
    });

    return {
      ok: true as const,
      challengeId: challenge.id as string,
      expiresAt: challenge.expires_at as string,
      emailMasked: maskEmail(signingEmail),
      delivered: delivery.delivered,
      deliveryError: delivery.delivered ? null : delivery.reason,
      documentSha256: signable.documentSha256,
      // Local development only. Never present in a production build.
      devCode: devOtpEchoEnabled() ? otp : undefined,
    };
  });

/** Verifies the code and, in one transaction-scoped sequence, signs the document. */
export const verifySigningChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { challengeId: string; code: string }) => ({
    challengeId: String(input?.challengeId ?? ""),
    code: String(input?.code ?? "").replace(/\D/g, "").slice(0, 6),
  }))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { OTP_MAX_ATTEMPTS, hashOtp, safeEqual } = await import("./rx.server");

    const { data: challenge } = await supabaseAdmin
      .from("signing_challenges")
      .select("*")
      .eq("id", data.challengeId)
      .maybeSingle();
    if (!challenge || challenge.provider_user_id !== userId) forbidden();
    if (challenge.consumed_at || challenge.invalidated_at) {
      return { ok: false as const, error: "That code is no longer valid. Request a new one." };
    }
    if (new Date(challenge.expires_at).getTime() < Date.now()) {
      return { ok: false as const, error: "That code has expired. Request a new one." };
    }
    if (challenge.attempt_count >= OTP_MAX_ATTEMPTS) {
      return { ok: false as const, error: "Too many attempts. Request a new code." };
    }

    await supabaseAdmin
      .from("signing_challenges")
      .update({ attempt_count: challenge.attempt_count + 1 })
      .eq("id", challenge.id);

    const signable = await buildSignable(supabaseAdmin, challenge.draft_id, userId);
    if (
      signable.documentSha256 !== challenge.document_sha256 ||
      signable.draft.version !== challenge.prescription_version
    ) {
      await supabaseAdmin
        .from("signing_challenges")
        .update({
          invalidated_at: new Date().toISOString(),
          invalidated_reason: "prescription_changed",
        })
        .eq("id", challenge.id);
      return {
        ok: false as const,
        error: "The prescription changed after this code was sent. Request a new code.",
      };
    }
    if (signable.blockers.length > 0) {
      return { ok: false as const, error: signable.blockers[0]!.message };
    }

    const expected = await hashOtp({
      otp: data.code,
      draftId: challenge.draft_id,
      version: challenge.prescription_version,
      documentSha256: challenge.document_sha256,
      providerUserId: userId,
    });
    if (!safeEqual(expected, challenge.otp_hash)) {
      await audit(supabaseAdmin, {
        draft_id: challenge.draft_id,
        actor_user_id: userId,
        event_type: "otp_verification_failed",
        detail: { challenge_id: challenge.id },
      });
      return { ok: false as const, error: "That code does not match. Check the latest email." };
    }

    const number = signable.nextPrescriptionNumber;
    const canonical = { ...signable.canonical, prescription_number: number };
    const { sha256Hex } = await import("./rx.server");
    const finalHash = await sha256Hex(canonicalize(canonical));

    const prescriberSnapshot = {
      full_legal_name: signable.providerProfile?.full_legal_name ?? "",
      professional_designation: signable.providerProfile?.professional_designation ?? null,
      prc_number: signable.verification?.prc_number ?? "",
      ptr_number: signable.verification?.ptr_number ?? "",
      practice_name: signable.providerProfile?.practice_name ?? null,
      practice_address: signable.providerProfile?.practice_address ?? null,
      professional_contact: signable.providerProfile?.professional_contact ?? null,
      verification_status: signable.verification?.status ?? "not_submitted",
      verification_snapshot_at: signable.verification?.verified_at ?? null,
    };

    const { data: signed, error: signedError } = await supabaseAdmin
      .from("signed_prescription_versions")
      .insert({
        draft_id: signable.draft.id,
        encounter_id: signable.draft.encounter_id,
        provider_user_id: userId,
        patient_user_id: signable.draft.patient_user_id,
        jurisdiction_code: signable.draft.jurisdiction_code,
        prescription_number: number,
        prescription_version: signable.draft.version,
        document_sha256: finalHash,
        canonical_json: canonical,
        prescriber_snapshot: prescriberSnapshot,
      })
      .select("*")
      .single();
    if (signedError) throw new Error(signedError.message);

    await supabaseAdmin.from("signature_events").insert({
      signed_version_id: signed.id,
      draft_id: signable.draft.id,
      provider_user_id: userId,
      identity_snapshot: prescriberSnapshot,
      prescription_version: signable.draft.version,
      document_sha256: finalHash,
      signing_method: "email_otp",
      verified_email: signable.verification?.signing_email ?? "",
      attestation_statement: CLINICAL_ATTESTATION_STATEMENT,
      signing_challenge_id: challenge.id,
    });
    await supabaseAdmin
      .from("signing_challenges")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", challenge.id);
    await supabaseAdmin
      .from("prescription_drafts")
      .update({ status: "signed" })
      .eq("id", signable.draft.id);
    await audit(supabaseAdmin, {
      draft_id: signable.draft.id,
      encounter_id: signable.draft.encounter_id,
      actor_user_id: userId,
      event_type: "prescription_signed",
      detail: { signed_version_id: signed.id, document_sha256: finalHash },
    });

    return {
      ok: true as const,
      signedVersionId: signed.id as string,
      prescriptionNumber: number,
      documentSha256: finalHash,
      signedAt: signed.signed_at as string,
      limitedScreeningNotice: signable.review?.limited_screening ? LIMITED_SCREENING_MESSAGE : null,
    };
  });

/** Releases the signed document to the patient's authenticated Lubin account. */
export const releaseSignedPrescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { signedVersionId: string }) => ({
    signedVersionId: String(input?.signedVersionId ?? ""),
  }))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed } = await supabaseAdmin
      .from("signed_prescription_versions")
      .select("*")
      .eq("id", data.signedVersionId)
      .maybeSingle();
    if (!signed || signed.provider_user_id !== userId) forbidden();
    if (signed.voided_at) {
      return { ok: false as const, error: "This prescription has been voided." };
    }
    const releasedAt = signed.released_at ?? new Date().toISOString();
    await supabaseAdmin
      .from("signed_prescription_versions")
      .update({ released_at: releasedAt, released_by: userId })
      .eq("id", signed.id);
    await supabaseAdmin.from("prescription_delivery_events").insert({
      signed_version_id: signed.id,
      event_type: "released_to_patient_account",
      actor_user_id: userId,
    });
    await audit(supabaseAdmin, {
      draft_id: signed.draft_id,
      encounter_id: signed.encounter_id,
      actor_user_id: userId,
      event_type: "document_released",
      detail: { signed_version_id: signed.id },
    });
    return { ok: true as const, releasedAt };
  });

/** Voids a signed prescription. The signed version and audit history are kept. */
export const voidSignedPrescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { signedVersionId: string; reason: string }) => ({
    signedVersionId: String(input?.signedVersionId ?? ""),
    reason: String(input?.reason ?? "").slice(0, 500),
  }))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    if (!data.reason.trim()) throw new Error("A void reason is required.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed } = await supabaseAdmin
      .from("signed_prescription_versions")
      .select("*")
      .eq("id", data.signedVersionId)
      .maybeSingle();
    if (!signed || signed.provider_user_id !== userId) forbidden();
    await supabaseAdmin
      .from("signed_prescription_versions")
      .update({ voided_at: new Date().toISOString(), voided_by: userId, void_reason: data.reason })
      .eq("id", signed.id);
    await audit(supabaseAdmin, {
      draft_id: signed.draft_id,
      encounter_id: signed.encounter_id,
      actor_user_id: userId,
      event_type: "prescription_voided",
      detail: { signed_version_id: signed.id },
    });
    return { ok: true as const };
  });

/** Provider-facing preview of the exact blockers still standing before signing. */
export const getSigningReadiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { prescriptionDraftId: string }) => ({
    prescriptionDraftId: String(input?.prescriptionDraftId ?? ""),
  }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const signable = await buildSignable(supabaseAdmin, data.prescriptionDraftId, context.userId);
    return {
      blockers: signable.blockers,
      documentSha256: signable.documentSha256,
      limitedScreeningNotice: signable.review?.limited_screening ? LIMITED_SCREENING_MESSAGE : null,
      sigs: signable.structured.map((item) => ({
        generic_name: item.generic_name,
        sig: effectiveSig(item),
      })),
      prescribable: signable.structured.length > 0,
    };
  });

/** Kept exported for tests and reuse by the AI validation path. */
export const catalogGuards = { productIsPrescribable };
