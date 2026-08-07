import type {
  MedicationReference,
  PatientSafetyInfo,
  PrescriptionMedication,
  RxCountry,
} from "./store";
import { PREGNANCY_STATUS_LABEL, HISTORY_STATE_LABEL } from "./store";
import { entriesFor, docStateFor, patientAge } from "./safety";
import { sharedSafetyResponse } from "./sharedSafety";
import { loadWorkspace } from "@/lib/visit-workspace/store";

/** One human-readable line per structured item — "not documented" stays visible. */
function structuredLine(
  info: PatientSafetyInfo | undefined,
  key: "allergies" | "currentMedications" | "conditions",
): string {
  const state = docStateFor(info, key);
  if (state === "none-known") return "None known (confirmed by the prescribing clinician)";
  if (state === "not-documented") return "";
  const entries = entriesFor(info, key);
  if (!entries.length) return "";
  return entries
    .filter((e) => e.name.trim())
    .map((e) => `${e.name}${e.detail ? ` (${e.detail})` : ""}`)
    .join("; ");
}

/** Fetch an AI medication-reference summary plus authoritative sources. */
export async function fetchMedicationReference(args: {
  appointmentId: string;
  med: PrescriptionMedication;
  country: RxCountry;
  clientName?: string;
  /** The single source of truth for patient safety data. */
  patientInfo?: PatientSafetyInfo;
}): Promise<MedicationReference> {
  const ws = loadWorkspace(args.appointmentId);
  const info = args.patientInfo;
  const shared = sharedSafetyResponse(args.appointmentId);
  const age = patientAge(info);
  const recordedMeds = structuredLine(info, "currentMedications");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 40000);
  let res: Response;
  try {
    res = await fetch("/api/medication-reference", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        country: args.country,
        medication: {
          name: args.med.name,
          genericName: args.med.genericName,
          dose: args.med.dose,
          route: args.med.route,
          frequency: args.med.frequency,
          duration: args.med.duration,
          indication: args.med.indication,
          rationale: args.med.rationale,
        },
        patientContext: {
          firstName: args.clientName,
          ...(age !== null ? { age } : {}),
        },
        presenting: ws.notes.presenting,
        observations: ws.notes.observations,
        plan: ws.notes.plan,
        allergies: structuredLine(info, "allergies"),
        conditions: structuredLine(info, "conditions"),
        pregnancyStatus: info?.pregnancyStatus
          ? PREGNANCY_STATUS_LABEL[info.pregnancyStatus]
          : "Not documented",
        bipolarHistory: info?.bipolarHistory
          ? HISTORY_STATE_LABEL[info.bipolarHistory]
          : "Not documented",
        ...(age !== null ? { ageYears: age } : {}),
        labs: info?.labs,
        ...(shared
          ? {
              sharedSafetyResponse: {
                assessment: `${shared.assessmentName} (${shared.clinicalName})`,
                item: shared.itemText,
                response: shared.response,
                date: new Date(shared.takenAt).toISOString().slice(0, 10),
              },
            }
          : {}),
        currentMedications: recordedMeds
          ? [{ name: recordedMeds }]
          : (ws.medications ?? []).map((m) => ({
              name: m.name,
              dose: m.dose,
              frequency: m.frequency,
            })),
      }),
    });
  } catch {
    throw new Error(
      "The reference service could not be reached or took too long to respond. Check your connection and try again.",
    );
  } finally {
    clearTimeout(timer);
  }
  const data = (await res.json()) as MedicationReference & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Could not load medication reference.");
  return data;
}

export const AI_SUMMARY_CAVEAT =
  "AI summaries may omit important information. Verify against the linked prescribing information before issuing the prescription.";

export const PATIENT_REVIEW_CAVEAT =
  "Based on the verified information currently available. The prescribing clinician must independently determine whether this medication is appropriate.";

export const VERIFICATION_STATEMENT =
  "I reviewed the relevant prescribing information and patient-specific considerations for each medication included in this prescription.";

/** Record-integrity attestation, modelled on standard prescriber attestations. */
export const RECORD_ATTESTATION_STATEMENT =
  "I attest that I personally reviewed this client's clinical record for this prescription, and that all information I have added, edited or removed — including medications, allergies, conditions, pregnancy or lactation status, laboratory or monitoring results and mental-health assessment responses — is truthful, accurate and taken from the client's record or reported directly by the client during this appointment. I have reviewed the patient-specific safety findings, and I take full clinical responsibility for the decision to prescribe.";

/** Deliberate, per-medication verification statement. */
export const MED_VERIFICATION_STATEMENT =
  "I reviewed the medication, dose, route, frequency, duration, indication, patient instructions, prescribing information and patient-specific considerations. I confirm that this medication is clinically appropriate and accurate.";

export const DRAFT_STATUS_TITLE = "AI-prepared draft — not yet a prescription";

export const DRAFT_STATUS_BODY =
  "This draft was prepared from the clinical information recorded for this visit. Review every field, check the supporting information and verify each medication. Nothing can be signed or issued until you complete the review.";

export const DRAFT_BASIS_TITLE = "Why this draft was prepared";

export const DRAFT_BASIS_BODY =
  "Based on the clinical information recorded for this visit. Review the information below and confirm that it is complete and accurate before verifying the medication.";

/** Single authorisation recorded in place of the old pair of checkboxes. */
export const FINAL_AUTHORISATION_STATEMENT =
  "I have reviewed this prescription and the relevant patient information. I confirm that it is clinically appropriate and authorize it under my verified prescribing credentials.";
