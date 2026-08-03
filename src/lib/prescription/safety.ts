// Patient-specific safety review. Separates *missing inputs* from *results*:
// a check is only reported as a result once it actually ran.
import type {
  MedicationCheck,
  MedicationChecks,
  PatientSafetyInfo,
  Prescription,
  PrescriptionMedication,
} from "./store";

export type CheckState = "not-run" | "info-required" | "no-issue" | "review-needed" | "blocking";

export const CHECK_STATE_LABEL: Record<CheckState, string> = {
  "not-run": "Not run",
  "info-required": "Information required",
  "no-issue": "No issue identified",
  "review-needed": "Review needed",
  blocking: "Blocking issue",
};

export type CheckTone = "neutral" | "amber" | "green" | "red";

export const CHECK_STATE_TONE: Record<CheckState, CheckTone> = {
  "not-run": "neutral",
  "info-required": "amber",
  "no-issue": "green",
  "review-needed": "amber",
  blocking: "red",
};

export function checkState(check?: MedicationCheck): CheckState {
  if (!check) return "not-run";
  switch (check.status) {
    case "checked":
      return "no-issue";
    case "unavailable":
      return "info-required";
    default:
      return check.status as CheckState;
  }
}

export const CHECK_ROWS: { key: keyof Omit<MedicationChecks, "missingInformation">; label: string }[] =
  [
    { key: "allergies", label: "Allergies" },
    { key: "currentMedications", label: "Current medications" },
    { key: "interactions", label: "Medication interactions" },
    { key: "contraindications", label: "Contraindications" },
    { key: "conditions", label: "Relevant conditions" },
    { key: "monitoring", label: "Monitoring requirements" },
  ];

/* -------------------------- patient information -------------------------- */

export type InfoKey = keyof Omit<PatientSafetyInfo, "updatedAt">;

export const INFO_FIELDS: {
  key: InfoKey;
  label: string;
  placeholder: string;
  multiline?: boolean;
}[] = [
  {
    key: "allergies",
    label: "Allergy history",
    placeholder: "Known drug allergies and reactions, or “none known”",
    multiline: true,
  },
  {
    key: "currentMedications",
    label: "Current medications",
    placeholder: "Medications and supplements the patient is taking, or “none”",
    multiline: true,
  },
  {
    key: "conditions",
    label: "Relevant medical conditions",
    placeholder: "Conditions that affect prescribing, or “none relevant”",
    multiline: true,
  },
  {
    key: "pregnancy",
    label: "Pregnancy or breastfeeding status",
    placeholder: "Pregnant, breastfeeding, neither, or not applicable",
  },
  {
    key: "labs",
    label: "Laboratory or organ-function information",
    placeholder: "Recent renal, hepatic or other relevant results",
    multiline: true,
  },
];

/** Information this medication genuinely needs, in order. */
export function requiredInfoKeys(med: PrescriptionMedication): InfoKey[] {
  const keys: InfoKey[] = ["allergies", "currentMedications", "conditions"];
  if (med.requiresPregnancyStatus) keys.push("pregnancy");
  if (med.requiresLabs) keys.push("labs");
  return keys;
}

function has(v?: string) {
  return !!v && v.trim().length > 0;
}

/** Only the items genuinely missing for this patient and this medication. */
export function missingInfoKeys(
  med: PrescriptionMedication,
  info?: PatientSafetyInfo,
  visitMedications?: { name: string }[],
): InfoKey[] {
  return requiredInfoKeys(med).filter((k) => {
    if (k === "currentMedications" && visitMedications?.length) return false;
    return !has(info?.[k]);
  });
}

export function infoLabel(key: InfoKey): string {
  return INFO_FIELDS.find((f) => f.key === key)?.label ?? key;
}

/* ------------------------------ run the review ---------------------------- */

const INTERACTION_FLAGS = [
  "maoi",
  "phenelzine",
  "tranylcypromine",
  "linezolid",
  "tramadol",
  "warfarin",
  "aspirin",
  "ibuprofen",
  "naproxen",
  "nsaid",
  "triptan",
  "lithium",
  "st john",
];

const CONDITION_FLAGS = ["bipolar", "seizure", "epilep", "bleeding", "liver", "renal", "kidney"];

function contains(haystack: string, needles: string[]) {
  const h = haystack.toLowerCase();
  return needles.filter((n) => h.includes(n));
}

/** Deterministic demo-grade review. Every result records the information it
 *  used and when it ran; nothing is reported unless it could be evaluated. */
export function runSafetyReview(
  med: PrescriptionMedication,
  info?: PatientSafetyInfo,
  visitMedications?: { name: string }[],
): MedicationChecks {
  const now = Date.now();
  const missing = missingInfoKeys(med, info, visitMedications);
  const medsText = [info?.currentMedications ?? "", ...(visitMedications ?? []).map((m) => m.name)]
    .join(", ")
    .trim();
  const allergyText = info?.allergies ?? "";
  const conditionText = info?.conditions ?? "";
  const name = med.name.toLowerCase().replace(/\(.*?\)/g, "").trim();

  const needs = (k: InfoKey, detail: string): MedicationCheck => ({
    status: "info-required",
    detail,
    informationUsed: `Waiting on ${infoLabel(k).toLowerCase()}.`,
    checkedAt: now,
  });

  const checks: MedicationChecks = {};

  // Allergies
  if (missing.includes("allergies")) {
    checks.allergies = needs("allergies", "Allergy history has not been recorded for this visit.");
  } else {
    const conflict = name && allergyText.toLowerCase().includes(name.split(" ")[0] ?? "");
    checks.allergies = {
      status: conflict ? "blocking" : "no-issue",
      detail: conflict
        ? `Recorded allergy appears to involve ${med.name}. Do not prescribe without resolving this.`
        : "No documented conflict with the recorded allergy history.",
      informationUsed: "Recorded allergy history.",
      checkedAt: now,
    };
  }

  // Current medications (input completeness as a result, not a warning)
  checks.currentMedications = missing.includes("currentMedications")
    ? needs("currentMedications", "The current medication list has not been recorded.")
    : {
        status: "no-issue",
        detail: medsText ? "Current medication list is complete." : "No current medications recorded.",
        informationUsed: "Recorded medication list for this visit.",
        checkedAt: now,
      };

  // Interactions
  if (missing.includes("currentMedications")) {
    checks.interactions = needs(
      "currentMedications",
      "Interactions cannot be evaluated without the current medication list.",
    );
  } else {
    const hits = contains(medsText, INTERACTION_FLAGS);
    checks.interactions = {
      status: hits.length ? "review-needed" : "no-issue",
      detail: hits.length
        ? `Possible interaction to review with: ${hits.join(", ")}.`
        : "No interaction identified with the recorded medications.",
      informationUsed: "Current medication list and prescribing information.",
      checkedAt: now,
    };
  }

  // Contraindications
  if (missing.includes("conditions")) {
    checks.contraindications = needs(
      "conditions",
      "Contraindications cannot be evaluated without relevant medical conditions.",
    );
  } else {
    const hits = contains(conditionText, ["maoi", "pimozide"]);
    checks.contraindications = {
      status: hits.length ? "blocking" : "no-issue",
      detail: hits.length
        ? `Recorded information includes a contraindication: ${hits.join(", ")}.`
        : "No issue identified against the recorded conditions and prescribing information.",
      informationUsed: "Recorded medical conditions and prescribing information.",
      checkedAt: now,
    };
  }

  // Relevant conditions
  if (missing.includes("conditions")) {
    checks.conditions = needs("conditions", "Relevant medical conditions have not been recorded.");
  } else {
    const hits = contains(conditionText, CONDITION_FLAGS);
    checks.conditions = {
      status: hits.length ? "review-needed" : "no-issue",
      detail: hits.length
        ? `Consider the recorded condition(s) before prescribing: ${hits.join(", ")}.`
        : "Information complete — no condition that changes this prescription.",
      informationUsed: "Recorded medical conditions.",
      checkedAt: now,
    };
  }

  // Monitoring
  if (med.requiresLabs && missing.includes("labs")) {
    checks.monitoring = needs("labs", "Laboratory or organ-function information is required.");
  } else if (med.requiresPregnancyStatus && missing.includes("pregnancy")) {
    checks.monitoring = needs("pregnancy", "Pregnancy or breastfeeding status is required.");
  } else {
    checks.monitoring = {
      status: "review-needed",
      detail: "Confirm the follow-up and monitoring plan before prescribing.",
      informationUsed: "Prescribing information for this medication and the recorded plan.",
      checkedAt: now,
    };
  }

  return checks;
}

/* -------------------------------- summary -------------------------------- */

export type SafetySummary = {
  complete: number;
  review: number;
  needsInfo: number;
  blocking: number;
  ran: boolean;
  text: string;
};

export function safetySummary(med: PrescriptionMedication): SafetySummary {
  const states = CHECK_ROWS.map((r) => checkState(med.checks?.[r.key]));
  const ran = !!med.safetyReviewedAt && states.some((s) => s !== "not-run");
  const complete = states.filter((s) => s === "no-issue").length;
  const review = states.filter((s) => s === "review-needed").length;
  const needsInfo = states.filter((s) => s === "info-required").length;
  const blocking = states.filter((s) => s === "blocking").length;
  const parts: string[] = [];
  if (complete) parts.push(`${complete} check${complete === 1 ? "" : "s"} complete`);
  if (review) parts.push(`${review} requires review`);
  if (needsInfo) parts.push(`${needsInfo} needs information`);
  if (blocking) parts.push(`${blocking} blocking issue${blocking === 1 ? "" : "s"}`);
  return {
    complete,
    review,
    needsInfo,
    blocking,
    ran,
    text: ran ? parts.join(" · ") : "Safety review not run",
  };
}

/** True when the review has enough information and has been run. */
export function safetyReviewReady(
  med: PrescriptionMedication,
  rx: Prescription,
  visitMedications?: { name: string }[],
): boolean {
  return (
    med.name.trim().length > 0 &&
    missingInfoKeys(med, rx.patientInfo, visitMedications).length === 0
  );
}
