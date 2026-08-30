// Fallback prescription data used when the live AI drafting service is unavailable
// or when insufficient clinical information has been recorded. Values are clinically
// realistic and must be verified against the patient record before signing.
import type { PatientSafetyInfo, Prescription, PrescriptionMedication } from "./store";
import { genRxId } from "./store";
import { medSafetySignature, runSafetyReview } from "./safety";

export const REVIEW_BANNER =
  "Please confirm every value against the patient record before signing.";

export function fallbackPrescription(
  appointmentId: string,
  withSuggestions: boolean = true,
): Prescription {
  const generatedAt = Date.now() - 4 * 60 * 1000;
  const med: PrescriptionMedication = {
    id: genRxId(),
    name: "Sertraline",
    genericName: "Sertraline hydrochloride",
    dose: "50 mg",
    route: "Oral",
    frequency: "Once daily in the morning",
    duration: "4 weeks, then review",
    strength: "50 mg film-coated tablet",
    quantity: "30 tablets (30-day supply)",
    refills: "No refills — review before continuing",
    indication: "Moderate depressive symptoms with anxiety",
    instructions:
      "Take one 50 mg tablet each morning with food. Do not stop suddenly. If a dose is missed, take it the same day and skip it if the next dose is due. Report worsening mood, agitation or thoughts of self-harm immediately.",
    warnings:
      "Common: nausea, headache, sleep changes, reduced appetite in the first two weeks. Serious: increased suicidal ideation early in treatment, serotonin syndrome, bleeding risk with NSAIDs.",
    availabilityNote:
      "Widely available in the Philippines as a generic under the Generics Act. Prescription-only, not a Dangerous Drug — standard prescription form.",
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
        "Presenting concerns, session observations, clinician plan and the client's shared assessment results recorded for this visit.",
      whyIncluded:
        "This option was shown because the visit plan records starting medication alongside continued therapy for the documented depressive and anxiety symptoms. Whether an SSRI, or this SSRI, is appropriate is a clinical decision for the prescriber — check the linked product information before deciding.",
      patientConsiderations:
        "No documented SSRI trial, no reported allergy to sertraline, and no recorded condition that would exclude an SSRI.",
      missingInformation:
        "Complete current medication list and any recent laboratory results have not been recorded for this visit.",
    },
  };

  const patientInfo: PatientSafetyInfo = {
    allergyState: "none-known",
    allergyEntries: [],
    conditionState: "documented",
    conditionEntries: [
      {
        id: genRxId(),
        name: "Generalised anxiety",
        detail: "Ongoing, managed with therapy",
        status: "active",
        // No share grant exists in this sample record, so nothing may claim to
        // have come from the patient's health card.
        source: "provider",
        updatedAt: generatedAt,
      },
      {
        id: genRxId(),
        name: "Bipolar disorder",
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
    bipolarDetail: "Screened at this visit; no manic or hypomanic episode reported",
    dob: "1991-04-12",
    updatedAt: generatedAt,
  };
  // Single source of truth: the checks are derived from the recorded patient
  // information, so nothing can report "no issue" while information is missing.
  med.checks = runSafetyReview(med, patientInfo);
  med.safetySignature = medSafetySignature(med);

  return {
    appointmentId,
    country: "PH",
    demo: true,
    // Suggestion-only: nothing is in the prescription until the provider
    // explicitly accepts a suggestion for review.
    medications: [],
    suggestions: withSuggestions ? [med] : [],
    suggestedAt: withSuggestions ? generatedAt : undefined,
    patientInfo,
    generatedAt,
    updatedAt: Date.now(),
  };
}
