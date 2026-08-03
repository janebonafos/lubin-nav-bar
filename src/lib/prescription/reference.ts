import type { MedicationReference, PrescriptionMedication, RxCountry } from "./store";
import { loadWorkspace } from "@/lib/visit-workspace/store";

/** Fetch an AI medication-reference summary plus authoritative sources. */
export async function fetchMedicationReference(args: {
  appointmentId: string;
  med: PrescriptionMedication;
  country: RxCountry;
  clientName?: string;
  allergies?: string;
}): Promise<MedicationReference> {
  const ws = loadWorkspace(args.appointmentId);
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
        patientContext: { firstName: args.clientName },
        presenting: ws.notes.presenting,
        observations: ws.notes.observations,
        plan: ws.notes.plan,
        allergies: args.allergies,
        currentMedications: (ws.medications ?? []).map((m) => ({
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

/** Deliberate, per-medication verification statement. */
export const MED_VERIFICATION_STATEMENT =
  "I reviewed the medication, dose, route, frequency, duration, indication, patient instructions, prescribing information and patient-specific considerations. I confirm that this medication is clinically appropriate and accurate.";

export const DRAFT_STATUS_TITLE = "AI-prepared draft — not yet a prescription";

export const DRAFT_STATUS_BODY =
  "This draft was prepared from the clinical information recorded for this visit. Review every field, check the supporting information and verify each medication. Nothing can be signed or issued until you complete the review.";

export const DRAFT_BASIS_TITLE = "Why this draft was prepared";

export const DRAFT_BASIS_BODY =
  "Based on the clinical information recorded for this visit. Review the information below and confirm that it is complete and accurate before verifying the medication.";
