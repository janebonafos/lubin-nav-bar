// Patient-specific safety review. Separates *missing inputs* from *results*:
// a check is only reported as a result once it actually ran.
import type {
  MedicationCheck,
  MedicationChecks,
  HistoryState,
  InfoDocState,
  PatientInfoEntry,
  PatientSafetyInfo,
  PregnancyStatus,
  Prescription,
  PrescriptionMedication,
} from "./store";
import { PREGNANCY_STATUS_LABEL, HISTORY_STATE_LABEL } from "./store";

export type CheckState = "not-run" | "info-required" | "no-issue" | "review-needed" | "blocking";

export const CHECK_STATE_LABEL: Record<CheckState, string> = {
  "not-run": "Not run",
  "info-required": "Information not available",
  "no-issue": "No conflict identified",
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

export const CHECK_ROWS: {
  key: keyof Omit<MedicationChecks, "missingInformation">;
  label: string;
}[] = [
  { key: "allergies", label: "Allergies" },
  { key: "currentMedications", label: "Current medications" },
  { key: "interactions", label: "Medication interactions" },
  { key: "contraindications", label: "Contraindications" },
  { key: "conditions", label: "Relevant conditions" },
  { key: "bipolarHistory", label: "Bipolar or mania history" },
  { key: "pregnancy", label: "Pregnancy and breastfeeding" },
  { key: "age", label: "Age-dependent warnings" },
  { key: "organFunction", label: "Laboratory and organ function" },
  { key: "monitoring", label: "Monitoring requirements" },
];

/** A short, item-specific line for the checklist row — never just the category. */
export function checkHeadline(check?: MedicationCheck): string {
  if (!check) return "Not evaluated yet";
  const first = check.detail.split(/(?<=\.)\s/)[0] ?? check.detail;
  return first.length > 130 ? `${first.slice(0, 127)}…` : first;
}

/* -------------------------- patient information -------------------------- */

export type InfoKey =
  | "allergies"
  | "currentMedications"
  | "conditions"
  | "bipolarHistory"
  | "age"
  | "pregnancy"
  | "labs";

export type CheckKey = keyof Omit<MedicationChecks, "missingInformation">;

/* ------------------- required vs advisory information ------------------- */

export type InfoRequirement = "required" | "recommended" | "optional";

export const INFO_REQUIREMENT_LABEL: Record<InfoRequirement, string> = {
  required: "Required for this prescription",
  recommended: "Recommended",
  optional: "Optional for this medication",
};

/** Why each item is being requested, so nothing looks like a blanket rule. */
export const INFO_RELEVANCE: Record<InfoKey, string> = {
  allergies:
    "Needed to rule out a documented reaction to this medication or its class before prescribing.",
  currentMedications:
    "Interaction checking cannot be completed without the current medication list.",
  conditions:
    "Used to check contraindications and conditions that change the dose or the monitoring plan.",
  bipolarHistory:
    "An antidepressant started without a bipolar or mania history check can precipitate a manic episode.",
  age: "Age-dependent warnings, including the early-treatment suicidality warning for younger patients and dose caution in older patients, cannot be evaluated without the date of birth.",
  pregnancy:
    "Required when clinically applicable: affects whether this medication can be used and at what dose.",
  labs: "Requested only when this medication, the patient's history or the jurisdiction requires baseline or ongoing monitoring.",
};

/** Medication- and patient-specific reason, so nothing looks universal. */
export function infoRelevance(med: PrescriptionMedication, key: InfoKey): string {
  if (key === "labs") {
    if (med.requiresLabs) {
      return (
        med.labsReason ??
        `Required for ${med.name || "this medication"} because its prescribing information calls for baseline or ongoing laboratory or organ-function monitoring at this dose.`
      );
    }
    return "Recommended, not required: no laboratory or organ-function result is needed by this medication's prescribing information for this patient. Record any result you already have.";
  }
  if (key === "pregnancy" && !med.requiresPregnancyStatus) {
    return "Recommended, not required for this medication. Record the structured status so the check can be completed.";
  }
  if (key === "bipolarHistory" && !med.requiresBipolarScreen) {
    return "Recommended, not required for this medication. Record the screening result so the check can be completed.";
  }
  return INFO_RELEVANCE[key];
}

/** Requirement level for one item against this specific medication. */
export function infoRequirement(med: PrescriptionMedication, key: InfoKey): InfoRequirement {
  switch (key) {
    case "allergies":
    case "currentMedications":
    case "conditions":
    case "age":
      return "required";
    case "bipolarHistory":
      return med.requiresBipolarScreen ? "required" : "recommended";
    case "pregnancy":
      return med.requiresPregnancyStatus ? "required" : "recommended";
    case "labs":
      return med.requiresLabs ? "required" : "recommended";
  }
}

export const ALL_INFO_KEYS: InfoKey[] = [
  "allergies",
  "currentMedications",
  "conditions",
  "bipolarHistory",
  "age",
  "pregnancy",
  "labs",
];

/** Categories captured as structured, searchable entries. */
export const STRUCTURED_KEYS = ["allergies", "currentMedications", "conditions"] as const;
export type StructuredKey = (typeof STRUCTURED_KEYS)[number];

const ENTRY_FIELD: Record<
  StructuredKey,
  "allergyEntries" | "medicationEntries" | "conditionEntries"
> = {
  allergies: "allergyEntries",
  currentMedications: "medicationEntries",
  conditions: "conditionEntries",
};

const STATE_FIELD: Record<StructuredKey, "allergyState" | "medicationState" | "conditionState"> = {
  allergies: "allergyState",
  currentMedications: "medicationState",
  conditions: "conditionState",
};

export function isStructuredKey(key: InfoKey): key is StructuredKey {
  return (STRUCTURED_KEYS as readonly string[]).includes(key);
}

export function entryField(key: StructuredKey) {
  return ENTRY_FIELD[key];
}

export function stateField(key: StructuredKey) {
  return STATE_FIELD[key];
}

export function entriesFor(
  info: PatientSafetyInfo | undefined,
  key: StructuredKey,
): PatientInfoEntry[] {
  return info?.[ENTRY_FIELD[key]] ?? [];
}

export function docStateFor(info: PatientSafetyInfo | undefined, key: StructuredKey): InfoDocState {
  const explicit = info?.[STATE_FIELD[key]];
  if (explicit) return explicit;
  return entriesFor(info, key).length > 0 ? "documented" : "not-documented";
}

/** Text used by the deterministic review for a structured category. */
function structuredText(info: PatientSafetyInfo | undefined, key: StructuredKey): string {
  const entries = entriesFor(info, key)
    .map((e) =>
      [e.name, e.strength, e.dose, e.frequency, e.route, e.reaction, e.detail]
        .filter(Boolean)
        .join(" "),
    )
    .join(", ");
  const legacy = key === "currentMedications" ? info?.currentMedications : info?.[key];
  return [entries, legacy ?? ""].filter((v) => v && v.trim()).join(", ");
}

/** Same as `structuredText`, but ignores entries the record marks as resolved. */
function activeStructuredText(info: PatientSafetyInfo | undefined, key: StructuredKey): string {
  const entries = entriesFor(info, key)
    .filter((e) => e.status !== "resolved")
    .map((e) =>
      [e.name, e.strength, e.dose, e.frequency, e.route, e.reaction, e.detail]
        .filter(Boolean)
        .join(" "),
    )
    .join(", ");
  const legacy = key === "currentMedications" ? info?.currentMedications : info?.[key];
  return [entries, legacy ?? ""].filter((v) => v && v.trim()).join(", ");
}

/** Plain-language provenance for a structured category, so the provider can
 *  see whether each recorded item came from the patient or from their own
 *  documentation. Nothing here is inferred — it reads the entry sources. */
function entrySourceSummary(info: PatientSafetyInfo | undefined, key: StructuredKey): string {
  const entries = entriesFor(info, key);
  if (!entries.length) return "";
  const shared = entries.filter((e) => e.source === "passport" || e.source === "intake").length;
  const mine = entries.length - shared;
  const parts: string[] = [];
  if (shared) parts.push(`${shared} shared by the patient`);
  if (mine) parts.push(`${mine} documented by you in this record`);
  return parts.join(", ");
}


/** A structured category counts as recorded when it has entries or an
 *  explicit "none known" statement. "Not documented" is not enough. */
function structuredRecorded(info: PatientSafetyInfo | undefined, key: StructuredKey): boolean {
  if (entriesFor(info, key).length > 0) return true;
  // An explicit clinician decision — "none known" or "not documented" — is a
  // recorded answer. Only an untouched field stays outstanding.
  const state = info?.[STATE_FIELD[key]];
  if (state === "none-known" || state === "not-documented") return true;
  const legacy = key === "currentMedications" ? info?.currentMedications : info?.[key];
  return !!legacy && legacy.trim().length > 0;
}

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
    key: "bipolarHistory",
    label: "Bipolar disorder or history of mania/hypomania",
    placeholder: "Screening result",
  },
  {
    key: "age",
    label: "Date of birth",
    placeholder: "MM / DD / YYYY",
  },
  {
    key: "pregnancy",
    label: "Pregnancy / breastfeeding status",
    placeholder: "Select a status",
  },
  {
    key: "labs",
    label: "Relevant labs / organ function",
    placeholder: "e.g. Creatinine: 0.9 mg/dL",
    multiline: true,
  },
];

/** Information this medication genuinely needs before verification, in order. */
export function requiredInfoKeys(med: PrescriptionMedication): InfoKey[] {
  return ALL_INFO_KEYS.filter((k) => infoRequirement(med, k) === "required");
}

function has(v?: string) {
  return !!v && v.trim().length > 0;
}

/** Age in years derived from either the recorded age or the date of birth. */
export function patientAge(info?: PatientSafetyInfo): number | null {
  if (typeof info?.ageYears === "number" && info.ageYears > 0) return Math.floor(info.ageYears);
  if (info?.dob) {
    const d = new Date(info.dob);
    if (!Number.isNaN(d.getTime())) {
      const now = new Date();
      let age = now.getFullYear() - d.getFullYear();
      const m = now.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
      if (age >= 0 && age < 130) return age;
    }
  }
  return null;
}

export function pregnancyStatus(info?: PatientSafetyInfo): PregnancyStatus {
  return info?.pregnancyStatus ?? "not-documented";
}

export function bipolarHistoryState(info?: PatientSafetyInfo): HistoryState {
  return info?.bipolarHistory ?? "not-documented";
}

/** Single source of truth: is this information actually on the record?
 *  "Not documented" and blank never count as recorded. */
export function infoRecorded(
  key: InfoKey,
  info?: PatientSafetyInfo,
  visitMedications?: { name: string }[],
): boolean {
  switch (key) {
    case "allergies":
    case "conditions":
      return structuredRecorded(info, key);
    case "currentMedications":
      return structuredRecorded(info, "currentMedications") || !!visitMedications?.length;
    case "bipolarHistory":
      return bipolarHistoryState(info) !== "not-documented";
    case "age":
      return patientAge(info) !== null;
    case "pregnancy":
      return pregnancyStatus(info) !== "not-documented";
    case "labs":
      // A stray keystroke should not mark monitoring info as documented.
      return (info?.labs ?? "").trim().length >= 3;
  }
}

/** Only the items genuinely missing for this patient and this medication. */
export function missingInfoKeys(
  med: PrescriptionMedication,
  info?: PatientSafetyInfo,
  visitMedications?: { name: string }[],
): InfoKey[] {
  return requiredInfoKeys(med).filter((k) => !infoRecorded(k, info, visitMedications));
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
  const medsText = [
    structuredText(info, "currentMedications"),
    ...(visitMedications ?? []).map((m) => m.name),
  ]
    .join(", ")
    .trim();
  const allergyText = structuredText(info, "allergies");
  const conditionText = structuredText(info, "conditions");
  // Only conditions the patient (or the prescriber) records as current can flag
  // a history. An entry explicitly marked resolved — e.g. "bipolar disorder,
  // screened and not present" — must never read back as "history documented".
  const activeConditionText = activeStructuredText(info, "conditions");
  const conditionProvenance = entrySourceSummary(info, "conditions");

  const name = med.name
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .trim();

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
        detail: medsText
          ? "Current medication list is complete."
          : "No current medications recorded.",
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
        : "No contraindication identified from the conditions recorded for this visit.",
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
        ? `${hits.map((h) => h.replace(/^\w/, (c) => c.toUpperCase())).join(", ")} history documented. Review whether this affects medication choice or monitoring before prescribing.`
        : "No condition identified from the available information that changes this prescription.",
      informationUsed: "Recorded medical conditions.",
      checkedAt: now,
    };
  }

  // Monitoring
  // Bipolar / mania history
  if (!infoRecorded("bipolarHistory", info)) {
    checks.bipolarHistory = needs(
      "bipolarHistory",
      med.requiresBipolarScreen
        ? "Bipolar or mania history has not been documented. This check cannot be completed."
        : "Bipolar or mania history has not been documented, so this check is incomplete. It does not block verification for this medication.",
    );
  } else {
    const state = bipolarHistoryState(info);
    checks.bipolarHistory = {
      status: state === "present" ? "review-needed" : "no-issue",
      detail:
        state === "present"
          ? `Bipolar or mania history documented${info?.bipolarDetail ? ` — ${info.bipolarDetail}` : ""}. Review whether this affects medication choice or monitoring before prescribing — an antidepressant started without this review can precipitate a manic episode.`
          : "Documented as none known by the prescribing clinician.",
      informationUsed: "Recorded bipolar or mania screening result.",
      checkedAt: now,
    };
  }

  // Pregnancy and breastfeeding
  if (!infoRecorded("pregnancy", info)) {
    checks.pregnancy = needs(
      "pregnancy",
      med.requiresPregnancyStatus
        ? "Pregnancy and breastfeeding status has not been documented. This check cannot be completed."
        : "Pregnancy and breastfeeding status has not been documented, so this check is incomplete. It does not block verification for this medication.",
    );
  } else {
    const st = pregnancyStatus(info);
    const flagged = st === "pregnant" || st === "breastfeeding" || st === "trying";
    checks.pregnancy = {
      status: flagged ? "review-needed" : "no-issue",
      detail: flagged
        ? `Recorded status: ${PREGNANCY_STATUS_LABEL[st]}. Use the pregnancy and lactation wording from this product's approved information before prescribing.`
        : `Recorded status: ${PREGNANCY_STATUS_LABEL[st]}.`,
      informationUsed: "Recorded pregnancy and breastfeeding status.",
      checkedAt: now,
    };
  }

  // Age-dependent warnings — never evaluated without an age or date of birth
  const age = patientAge(info);
  if (age === null) {
    checks.age = needs(
      "age",
      "Age-dependent warnings cannot be shown or evaluated until the patient's age or date of birth is recorded.",
    );
  } else {
    const young = age < 25;
    const older = age >= 65;
    checks.age = {
      status: young || older ? "review-needed" : "no-issue",
      detail: young
        ? `Recorded age ${age}. Review the early-treatment warning about increased suicidal thoughts in patients under 25.`
        : older
          ? `Recorded age ${age}. Review dose caution, hyponatraemia and fall risk in older patients.`
          : `Recorded age ${age}. No age-dependent warning applies to this medication at this age.`,
      informationUsed: "Recorded age or date of birth and the prescribing information.",
      checkedAt: now,
    };
  }

  // Laboratory and organ function
  if (!infoRecorded("labs", info)) {
    checks.organFunction = needs(
      "labs",
      med.requiresLabs
        ? (med.labsReason ??
            "Laboratory or organ-function information is required by this medication's prescribing information.")
        : "No relevant results documented. Recommended, not required for this medication — it does not block verification.",
    );
  } else {
    const hits = contains(info?.labs ?? "", ["abnormal", "elevated", "impair", "low", "high"]);
    checks.organFunction = {
      status: hits.length ? "review-needed" : "no-issue",
      detail: hits.length
        ? `Recorded results flagged (${hits.join(", ")}). Review whether this affects dose or monitoring before prescribing.`
        : "No abnormality identified in the laboratory or organ-function information available.",
      informationUsed: "Recorded laboratory / organ-function result and the date it was taken.",
      checkedAt: now,
    };
  }

  checks.monitoring = {
    status: "review-needed",
    detail: med.requiresLabs
      ? `Baseline and follow-up monitoring is called for by this medication${med.labsReason ? ` — ${med.labsReason}` : ""}. Confirm the follow-up interval and monitoring plan before prescribing.`
      : "Confirm the follow-up interval and monitoring plan before prescribing.",
    informationUsed: "Prescribing information for this medication and the recorded plan.",
    checkedAt: now,
  };

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

/* --------------------- outstanding information (all levels) --------------------- */

export type OutstandingInfo = { key: InfoKey; requirement: InfoRequirement };

/** Every relevant item that has not been recorded yet, labelled by requirement. */
export function outstandingInfo(
  med: PrescriptionMedication,
  info?: PatientSafetyInfo,
  visitMedications?: { name: string }[],
): OutstandingInfo[] {
  return ALL_INFO_KEYS.filter((k) => !infoRecorded(k, info, visitMedications)).map((key) => ({
    key,
    requirement: infoRequirement(med, key),
  }));
}

export type InfoItem = OutstandingInfo & { recorded: boolean };

/** Every relevant item, recorded or not, so completed entries stay editable.
 *  Outstanding items sort first; recorded items keep their place below. */
export function infoItems(
  med: PrescriptionMedication,
  info?: PatientSafetyInfo,
  visitMedications?: { name: string }[],
): InfoItem[] {
  const items = ALL_INFO_KEYS.map((key) => ({
    key,
    requirement: infoRequirement(med, key),
    recorded: infoRecorded(key, info, visitMedications),
  }));
  // Canonical order only: a row must never jump to the bottom of the list when
  // the clinician records it.
  return items;
}

/** Short human-readable value of what is on record, for the completed row. */
export function infoRecordedSummary(
  key: InfoKey,
  info?: PatientSafetyInfo,
  visitMedications?: { name: string }[],
): string {
  switch (key) {
    case "allergies":
    case "conditions":
    case "currentMedications": {
      const state = docStateFor(info, key);
      if (state === "none-known") return "None known";
      if (state === "not-documented" && !entriesFor(info, key).length)
        return "Not documented at this visit";
      const names = entriesFor(info, key)
        .map((e) => e.name.trim())
        .filter(Boolean);
      if (key === "currentMedications" && !names.length && visitMedications?.length) {
        return visitMedications.map((m) => m.name).join(", ");
      }
      if (!names.length) return "Recorded";
      return names.length > 3 ? `${names.slice(0, 3).join(", ")} +${names.length - 3} more` : names.join(", ");
    }
    case "bipolarHistory":
      return HISTORY_STATE_LABEL[bipolarHistoryState(info)];
    case "age": {
      const age = patientAge(info);
      if (age === null) return "Date of birth unavailable";
      const dob = info?.dob
        ? new Date(info.dob).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : null;
      return dob ? `${age} years · born ${dob}` : `${age} years`;
    }
    case "pregnancy":
      return PREGNANCY_STATUS_LABEL[pregnancyStatus(info)];
    case "labs": {
      const labs = (info?.labs ?? "").trim();
      if (!labs) return "No relevant results documented";
      // A bare "none"/"nil" is ambiguous next to a cleared badge: state it plainly.
      if (/^(none|nil|n\/?a|no results?|no relevant results?)\.?$/i.test(labs))
        return "No relevant results available";
      const taken = info?.labsAt
        ? new Date(info.labsAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : null;
      const value = labs.length > 70 ? `${labs.slice(0, 67)}…` : labs;
      return taken ? `${value} · ${taken}` : value;
    }
  }
}

/* ------------------------- review acknowledgements ------------------------- */

/** Check rows whose finding the provider must explicitly acknowledge. */
export function flaggedCheckKeys(med: PrescriptionMedication): CheckKey[] {
  return CHECK_ROWS.map((r) => r.key).filter((k) => {
    const s = checkState(med.checks?.[k]);
    return s === "review-needed" || s === "blocking";
  });
}

export function checkReviewedAt(med: PrescriptionMedication, key: CheckKey): number | undefined {
  return med.checkReviews?.[key];
}

export function unreviewedCheckKeys(med: PrescriptionMedication): CheckKey[] {
  return flaggedCheckKeys(med).filter((k) => !checkReviewedAt(med, k));
}

/* --------------------------- review freshness ----------------------------- */

/** Clinically significant fields — a change here invalidates the safety review. */
export function medSafetySignature(m: PrescriptionMedication): string {
  return [m.name, m.strength ?? "", m.dose, m.route ?? "", m.frequency, m.duration ?? ""]
    .map((v) => v.trim().toLowerCase())
    .join("|");
}

/** True when the recorded review no longer matches the medication or the
 *  patient information it was based on. */
export function reviewStale(med: PrescriptionMedication, info?: PatientSafetyInfo): boolean {
  if (!med.safetyReviewedAt) return false;
  if (info?.updatedAt && info.updatedAt > med.safetyReviewedAt) return true;
  if (med.safetySignature && med.safetySignature !== medSafetySignature(med)) return true;
  return false;
}

/* ------------------------------ safety status ----------------------------- */

export type SafetyStatus = {
  title: string;
  detail: string;
  tone: CheckTone;
};

/** One prominent status line. Unresolved items always win over completed ones. */
export function safetyStatus(med: PrescriptionMedication, info?: PatientSafetyInfo): SafetyStatus {
  const s = safetySummary(med);
  if (!s.ran) {
    return {
      title: "Safety review not run",
      detail: "Run the patient-specific safety review for this medication.",
      tone: "neutral",
    };
  }
  if (reviewStale(med, info)) {
    return {
      title: "Safety information changed",
      detail:
        "The medication or patient information changed after the last review. Run the review again.",
      tone: "amber",
    };
  }
  const unreviewed = unreviewedCheckKeys(med).length;
  if (s.blocking > 0) {
    return {
      title: "Safety review incomplete",
      detail: `${s.blocking} blocking issue${s.blocking === 1 ? "" : "s"} must be resolved before this medication can be verified.`,
      tone: "red",
    };
  }
  if (s.needsInfo > 0 || unreviewed > 0) {
    const parts: string[] = [];
    if (s.needsInfo > 0)
      parts.push(`${s.needsInfo} check${s.needsInfo === 1 ? "" : "s"} could not be completed`);
    if (unreviewed > 0)
      parts.push(
        `${unreviewed} item${unreviewed === 1 ? "" : "s"} require${unreviewed === 1 ? "s" : ""} your review`,
      );
    return {
      title: "Safety review incomplete",
      detail: `${parts.join(" and ")}.`,
      tone: "amber",
    };
  }
  return {
    title: "Safety review complete · Provider review required",
    detail: `${s.complete} check${s.complete === 1 ? "" : "s"} could be completed with the information recorded. This is not a determination that the medication is safe or appropriate.`,
    tone: "green",
  };
}

/* --------------------------- verification blockers ------------------------ */

export type BlockerKind = "fields" | "acknowledgement" | "info" | "blocking" | "review" | "stale";

/** How an item relates to signing. Only medication-specific required items
 *  can block a signature; everything else is advisory or does not apply. */
export type SafetyClass = "required-before-signing" | "review-recommended" | "not-applicable";

export const SAFETY_CLASS_LABEL: Record<SafetyClass, string> = {
  "required-before-signing": "Required before signing",
  "review-recommended": "Review recommended",
  "not-applicable": "Not applicable",
};

export type Blocker = {
  kind: BlockerKind;
  label: string;
  /** True only for medication-specific items that must block signing. */
  required?: boolean;
};

/** Classification of one patient-information item for this medication. */
export function infoSafetyClass(med: PrescriptionMedication, key: InfoKey): SafetyClass {
  const req = infoRequirement(med, key);
  if (req === "required") return "required-before-signing";
  if (req === "recommended") return "review-recommended";
  return "not-applicable";
}

/** Classification of one safety check row for this medication. */
export function checkSafetyClass(med: PrescriptionMedication, key: CheckKey): SafetyClass {
  const state = checkState(med.checks?.[key]);
  switch (state) {
    case "blocking":
      return "required-before-signing";
    case "info-required":
      // Only required when the underlying information is required here.
      return CHECK_TO_INFO[key] && infoRequirement(med, CHECK_TO_INFO[key]!) === "required"
        ? "required-before-signing"
        : "review-recommended";
    case "review-needed":
      return "review-recommended";
    case "no-issue":
      return "not-applicable";
    case "not-run":
      return "review-recommended";
  }
}

/** Check rows that depend on a specific piece of patient information. */
const CHECK_TO_INFO: Partial<Record<CheckKey, InfoKey>> = {
  allergies: "allergies",
  currentMedications: "currentMedications",
  interactions: "currentMedications",
  conditions: "conditions",
  bipolarHistory: "bipolarHistory",
  pregnancy: "pregnancy",
  age: "age",
  organFunction: "labs",
};

/** Items that must be resolved before this medication can be signed. */
export function requiredSigningBlockers(blockers: Blocker[]): Blocker[] {
  return blockers.filter((b) => b.required);
}

/** Advisory items — surfaced, never blocking. */
export function recommendedBlockers(blockers: Blocker[]): Blocker[] {
  return blockers.filter((b) => !b.required);
}

/** Everything standing between this medication and verification. */
export function verificationBlockers(args: {
  med: PrescriptionMedication;
  info?: PatientSafetyInfo;
  visitMedications?: { name: string }[];
  fieldsComplete: boolean;
  acknowledged: boolean;
  /** Shared assessment safety response awaiting provider acknowledgement. */
  sharedSafetyPending?: boolean;
}): Blocker[] {
  const { med, info, visitMedications, fieldsComplete, acknowledged, sharedSafetyPending } = args;
  const out: Blocker[] = [];
  if (!fieldsComplete)
    out.push({
      kind: "fields",
      label: "Add medication, dose, frequency and patient instructions.",
      required: true,
    });
  for (const k of missingInfoKeys(med, info, visitMedications)) {
    out.push({ kind: "info", label: `Record ${infoLabel(k).toLowerCase()}.`, required: true });
  }
  const s = safetySummary(med);
  if (!s.ran)
    out.push({
      kind: "review",
      label: "Run the patient-specific safety review.",
      required: true,
    });
  else if (reviewStale(med, info))
    out.push({
      kind: "stale",
      label: "Run the safety review again with the updated information.",
      required: true,
    });
  if (s.blocking > 0)
    out.push({
      kind: "blocking",
      label: `Resolve ${s.blocking} blocking safety issue${s.blocking === 1 ? "" : "s"}.`,
      required: true,
    });
  for (const k of unreviewedCheckKeys(med)) {
    const row = CHECK_ROWS.find((r) => r.key === k);
    out.push({
      kind: "review",
      label: `Mark ${(row?.label ?? k).toLowerCase()} as reviewed.`,
      // Advisory: a review-recommended finding never blocks the signature.
      required: checkSafetyClass(med, k) === "required-before-signing",
    });
  }
  if (sharedSafetyPending)
    out.push({
      kind: "review",
      label: "Acknowledge the shared assessment safety response.",
      required: true,
    });
  if (!acknowledged)
    out.push({
      kind: "acknowledgement",
      label: "Confirm the clinical review of this medication.",
      required: true,
    });
  return out;
}

/** "Complete 2 required items and review 1 safety item before signing." */
export function blockerSentence(blockers: Blocker[]): string {
  if (blockers.length === 0) return "";
  const requiredCount = blockers.filter((b) => b.required).length;
  const reviewCount = blockers.length - requiredCount;
  const parts: string[] = [];
  if (requiredCount > 0)
    parts.push(`Complete ${requiredCount} required item${requiredCount === 1 ? "" : "s"}`);
  if (reviewCount > 0)
    parts.push(
      `${parts.length ? "review" : "Review"} ${reviewCount} recommended item${reviewCount === 1 ? "" : "s"}`,
    );
  return `${parts.join(" and ")} before signing.`;
}

export function formatCheckedAt(ts?: number): string {
  if (!ts) return "";
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
