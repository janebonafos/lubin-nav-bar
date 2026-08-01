import type {
  MedicationReference,
  PrescriptionMedication,
  RxCountry,
} from "./store";
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
  const res = await fetch("/api/medication-reference", {
    method: "POST",
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