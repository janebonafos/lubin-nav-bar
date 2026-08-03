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
        status: "checked",
        detail: "No allergy to sertraline or other SSRIs recorded (demo).",
      },
      currentMedications: {
        status: "unavailable",
        detail: "Unable to complete — current medication list is missing.",
      },
      interactions: {
        status: "unavailable",
        detail: "Unable to complete — current medication list is missing.",
      },
      contraindications: {
        status: "checked",
        detail: "No recorded MAOI use, pimozide use or known contraindication (demo).",
      },
      conditions: {
        status: "checked",
        detail: "No recorded bipolar disorder, seizure disorder or bleeding disorder (demo).",
      },
      missingInformation: "Current medications and recent laboratory results.",
    },
  };

  return {
    appointmentId,
    country: "PH",
    demo: true,
    medications: [med],
    generatedAt,
    updatedAt: Date.now(),
  };
}
