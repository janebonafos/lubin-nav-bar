// Sample prescription used only to demonstrate the AI-prepared review flow.
// Every clinical value here is demo data and is labelled as such in the UI.
import type { Prescription, PrescriptionMedication } from "./store";
import { genRxId } from "./store";

export const DEMO_BANNER =
  "Demo data — all clinical information in this prescription is sample content for demonstration only.";

export function demoPrescription(appointmentId: string): Prescription {
  const generatedAt = Date.now() - 4 * 60 * 1000;
  const med: PrescriptionMedication = {
    id: genRxId(),
    name: "Sertraline (Zoloft) — demo",
    genericName: "Sertraline hydrochloride",
    dose: "50 mg",
    route: "Oral",
    frequency: "Once daily in the morning",
    duration: "4 weeks, then review",
    strength: "50 mg film-coated tablet (demo)",
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
    requiresLabs: true,
    requiresPregnancyStatus: false,
    safetyReviewedAt: generatedAt,
    basis: {
      generatedAt,
      clinicalInformationUsed:
        "Presenting concerns, session observations, clinician plan and the client's shared assessment results recorded for this visit (demo content).",
      whyIncluded:
        "An SSRI is conventional first-line pharmacotherapy for the recorded depressive and anxiety symptoms, and the visit plan records starting medication alongside continued therapy (demo content).",
      patientConsiderations:
        "No documented SSRI trial, no reported allergy to sertraline, and no recorded condition that would exclude an SSRI (demo content).",
      missingInformation:
        "Complete current medication list and any recent laboratory results have not been recorded for this visit.",
    },
    checks: {
      allergies: {
        status: "no-issue",
        detail: "No documented conflict with sertraline or other SSRIs (demo).",
        informationUsed: "Recorded allergy history.",
        checkedAt: generatedAt,
      },
      currentMedications: {
        status: "info-required",
        detail: "The current medication list has not been recorded.",
        informationUsed: "Waiting on current medications.",
        checkedAt: generatedAt,
      },
      interactions: {
        status: "info-required",
        detail: "Interactions cannot be evaluated without the current medication list.",
        informationUsed: "Waiting on current medications.",
        checkedAt: generatedAt,
      },
      contraindications: {
        status: "no-issue",
        detail: "No issue identified against the recorded conditions and prescribing information.",
        informationUsed: "Recorded medical conditions and prescribing information.",
        checkedAt: generatedAt,
      },
      conditions: {
        status: "no-issue",
        detail: "Information complete — no condition that changes this prescription (demo).",
        informationUsed: "Recorded medical conditions.",
        checkedAt: generatedAt,
      },
      monitoring: {
        status: "review-needed",
        detail: "Confirm review at two weeks and the monitoring plan before prescribing (demo).",
        informationUsed: "Prescribing information and the recorded plan.",
        checkedAt: generatedAt,
      },
    },
  };

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
      updatedAt: generatedAt,
    },
    generatedAt,
    updatedAt: Date.now(),
  };
}
