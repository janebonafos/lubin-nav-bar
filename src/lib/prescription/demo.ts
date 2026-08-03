// Sample prescription used only to demonstrate the AI-prepared review flow.
// Every clinical value here is demo data and is labelled as such in the UI.
import type { PatientSafetyInfo, Prescription, PrescriptionMedication } from "./store";
import { genRxId } from "./store";
import { medSafetySignature, runSafetyReview } from "./safety";

export const DEMO_BANNER =
  "Demo data — all clinical information in this prescription is sample content for demonstration only.";

export function demoPrescription(appointmentId: string): Prescription {
  const generatedAt = Date.now() - 4 * 60 * 1000;
  const med: PrescriptionMedication = {
    id: genRxId(),
    name: "Sertraline",
    genericName: "Sertraline hydrochloride (demo data)",
    dose: "50 mg",
    route: "Oral",
    frequency: "Once daily in the morning",
    duration: "4 weeks, then review",
    strength: "50 mg film-coated tablet",
    quantity: "30 tablets (30-day supply) — demo",
    refills: "No refills — review before continuing (demo)",
    indication: "Moderate depressive symptoms with anxiety (demo indication)",
    instructions:
      "Take one 50 mg tablet each morning with food. Do not stop suddenly. If a dose is missed, take it the same day and skip it if the next dose is due. Report worsening mood, agitation or thoughts of self-harm immediately. (Demo instructions.)",
    warnings:
      "Common: nausea, headache, sleep changes, reduced appetite in the first two weeks. Serious: increased suicidal ideation early in treatment, serotonin syndrome, bleeding risk with NSAIDs. (Demo warnings.)",
    availabilityNote:
      "Widely available in the Philippines as a generic under the Generics Act. Prescription-only, not a Dangerous Drug — standard prescription form. (Demo note.)",
    origin: "ai",
    demo: true,
    controlled: false,
    approved: false,
    requiresLabs: false,
    requiresPregnancyStatus: true,
    requiresBipolarScreen: true,
    safetyReviewedAt: generatedAt,
    basis: {
      generatedAt,
      clinicalInformationUsed:
        "Presenting concerns, session observations, clinician plan and the client's shared assessment results recorded for this visit (demo content).",
      whyIncluded:
        "This option was shown because the visit plan records starting medication alongside continued therapy for the documented depressive and anxiety symptoms. Whether an SSRI, or this SSRI, is appropriate is a clinical decision for the prescriber — check the linked product information before deciding (demo content).",
      patientConsiderations:
        "No documented SSRI trial, no reported allergy to sertraline, and no recorded condition that would exclude an SSRI (demo content).",
      missingInformation:
        "Complete current medication list and any recent laboratory results have not been recorded for this visit.",
    },
  };

  const patientInfo: PatientSafetyInfo = PATIENT_INFO(generatedAt);
  // Single source of truth: the checks are derived from the recorded patient
  // information, so nothing can report "no issue" while information is missing.
  med.checks = runSafetyReview(med, patientInfo);
  med.safetySignature = medSafetySignature(med);

  return {
    appointmentId,
    country: "PH",
    demo: true,
    medications: [med],
    patientInfo: {
      allergyState: "none-known",
      allergyEntries: [],
      conditionState: "documented",
      conditionEntries: [
        {
          id: genRxId(),
          name: "Generalised anxiety (demo)",
          detail: "Ongoing, managed with therapy",
          status: "active",
          source: "passport",
          updatedAt: generatedAt,
        },
        {
          id: genRxId(),
          name: "Bipolar disorder (demo)",
          detail: "Screened and not present",
          status: "resolved",
          source: "provider",
          updatedAt: generatedAt,
        },
      ],
      medicationState: "not-documented",
      medicationEntries: [],
      pregnancyStatus: "not-documented",
      bipolarHistory: "none-known",
      bipolarDetail: "Screened at this visit; no manic or hypomanic episode reported (demo)",
      dob: "1991-04-12",
      updatedAt: generatedAt,
    },
    generatedAt,
    updatedAt: Date.now(),
  };
}
