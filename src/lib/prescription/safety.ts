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
import { PREGNANCY_STATUS_LABEL } from "./store";

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
  required: "Required before verification",
  recommended: "Review recommended",
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
  age: "Age-dependent warnings, including the early-treatment suicidality warning for younger patients and dose caution in older patients, cannot be evaluated without the patient's age or date of birth.",
  pregnancy: "Affects whether this medication can be used and at what dose.",
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
    .map((e) => [e.name, e.detail].filter(Boolean).join(" "))
    .join(", ");
  const legacy = key === "currentMedications" ? info?.currentMedications : info?.[key];
  return [entries, legacy ?? ""].filter((v) => v && v.trim()).join(", ");
}

/** A structured category counts as recorded when it has entries or an
 *  explicit "none known" statement. "Not documented" is not enough. */
function structuredRecorded(info: PatientSafetyInfo | undefined, key: StructuredKey): boolean {
  if (entriesFor(info, key).length > 0) return true;
  if (info?.[STATE_FIELD[key]] === "none-known") return true;
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
    if (isStructuredKey(k)) return !structuredRecorded(info, k);
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
  const medsText = [
    structuredText(info, "currentMedications"),
    ...(visitMedications ?? []).map((m) => m.name),
  ]
    .join(", ")
    .trim();
  const allergyText = structuredText(info, "allergies");
  const conditionText = structuredText(info, "conditions");
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

/* --------------------- outstanding information (all levels) --------------------- */

export type OutstandingInfo = { key: InfoKey; requirement: InfoRequirement };

/** Every relevant item that has not been recorded yet, labelled by requirement. */
export function outstandingInfo(
  med: PrescriptionMedication,
  info?: PatientSafetyInfo,
  visitMedications?: { name: string }[],
): OutstandingInfo[] {
  return ALL_INFO_KEYS.filter((k) => {
    if (k === "currentMedications" && visitMedications?.length) return false;
    if (isStructuredKey(k)) return !structuredRecorded(info, k);
    return !has(info?.[k]);
  }).map((key) => ({ key, requirement: infoRequirement(med, key) }));
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

export type Blocker = { kind: BlockerKind; label: string };

/** Everything standing between this medication and verification. */
export function verificationBlockers(args: {
  med: PrescriptionMedication;
  info?: PatientSafetyInfo;
  visitMedications?: { name: string }[];
  fieldsComplete: boolean;
  acknowledged: boolean;
}): Blocker[] {
  const { med, info, visitMedications, fieldsComplete, acknowledged } = args;
  const out: Blocker[] = [];
  if (!fieldsComplete)
    out.push({
      kind: "fields",
      label: "Add medication, dose, frequency and patient instructions.",
    });
  for (const k of missingInfoKeys(med, info, visitMedications)) {
    out.push({ kind: "info", label: `Record ${infoLabel(k).toLowerCase()}.` });
  }
  const s = safetySummary(med);
  if (!s.ran) out.push({ kind: "review", label: "Run the patient-specific safety review." });
  else if (reviewStale(med, info))
    out.push({ kind: "stale", label: "Run the safety review again with the updated information." });
  if (s.blocking > 0)
    out.push({
      kind: "blocking",
      label: `Resolve ${s.blocking} blocking safety issue${s.blocking === 1 ? "" : "s"}.`,
    });
  for (const k of unreviewedCheckKeys(med)) {
    const row = CHECK_ROWS.find((r) => r.key === k);
    out.push({ kind: "review", label: `Mark ${(row?.label ?? k).toLowerCase()} as reviewed.` });
  }
  if (!acknowledged)
    out.push({ kind: "acknowledgement", label: "Tick the verification acknowledgement." });
  return out;
}

/** "Complete 2 required items and review 1 safety item before verifying." */
export function blockerSentence(blockers: Blocker[]): string {
  if (blockers.length === 0) return "";
  const reviewCount = blockers.filter((b) => b.kind === "review" || b.kind === "stale").length;
  const requiredCount = blockers.length - reviewCount;
  const parts: string[] = [];
  if (requiredCount > 0)
    parts.push(`Complete ${requiredCount} required item${requiredCount === 1 ? "" : "s"}`);
  if (reviewCount > 0)
    parts.push(
      `${parts.length ? "review" : "Review"} ${reviewCount} safety item${reviewCount === 1 ? "" : "s"}`,
    );
  return `${parts.join(" and ")} before verifying.`;
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
