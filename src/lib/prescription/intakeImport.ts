// Bring what the client already shared in their intake form into the
// prescription safety review, instead of asking the provider to retype it.
//
// The client answered these questions themselves (Health Passport prefill or
// their own words) and shared them with this provider for this appointment.
// Nothing is written automatically: the provider sees the shared answer and
// chooses to accept it, so the clinical record stays clinician-attested.
import { getResponse, PREFER_IN_PERSON_TEXT } from "@/lib/intake/store";
import { genRxId, type PatientSafetyInfo, type PregnancyStatus } from "./store";
import { infoLabel, type InfoKey } from "./safety";

export type SharedIntakeItem = {
  key: InfoKey;
  label: string;
  /** The client's own answer, shown verbatim before it is accepted. */
  value: string;
  /** Which intake question it came from. */
  question: string;
  patch: Partial<PatientSafetyInfo>;
};

const NONE_WORDS = ["none", "none known", "no", "n/a", "nothing", "no allergies"];

function isNone(text: string): boolean {
  return NONE_WORDS.includes(text.trim().toLowerCase().replace(/[.!]$/, ""));
}

function entry(name: string) {
  return {
    id: genRxId("pi"),
    name: name.trim(),
    status: "active" as const,
    source: "passport" as const,
    updatedAt: Date.now(),
  };
}

function splitList(text: string): string[] {
  return text
    .split(/[\n,;•]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
}

const PREGNANCY_MAP: Record<string, PregnancyStatus> = {
  "i'm pregnant": "pregnant",
  "currently pregnant": "pregnant",
  "i'm breastfeeding": "breastfeeding",
  breastfeeding: "breastfeeding",
  "trying to conceive": "trying",
  "none of these apply": "not-pregnant",
  "not pregnant": "not-pregnant",
  "prefer not to say": "not-documented",
};

/**
 * Answers the client shared that map onto the requested safety information.
 * Items already documented in the record are left out.
 */
export function sharedIntakeInfo(
  appointmentId: string,
  keys: InfoKey[],
  info?: PatientSafetyInfo,
): SharedIntakeItem[] {
  const values = getResponse(appointmentId).values ?? {};
  const answer = (id: string) => {
    const v = (values[id] ?? "").trim();
    if (!v || v === PREFER_IN_PERSON_TEXT) return "";
    return v;
  };
  const out: SharedIntakeItem[] = [];
  const want = (k: InfoKey) => keys.includes(k);

  const allergies = answer("history.allergies");
  if (want("allergies") && allergies && (info?.allergyState ?? "not-documented") === "not-documented") {
    out.push({
      key: "allergies",
      label: infoLabel("allergies"),
      value: allergies,
      question: "Any allergies or reactions?",
      patch: isNone(allergies)
        ? { allergyState: "none-known", allergyEntries: [] }
        : { allergyState: "documented", allergyEntries: splitList(allergies).map(entry) },
    });
  }

  const meds = answer("medication.list");
  if (
    want("currentMedications") &&
    meds &&
    (info?.medicationState ?? "not-documented") === "not-documented"
  ) {
    out.push({
      key: "currentMedications",
      label: infoLabel("currentMedications"),
      value: meds,
      question: "Anything you're taking right now?",
      patch: isNone(meds)
        ? { medicationState: "none-known", medicationEntries: [] }
        : { medicationState: "documented", medicationEntries: splitList(meds).map(entry) },
    });
  }

  const conditions = answer("history.conditions");
  if (
    want("conditions") &&
    conditions &&
    (info?.conditionState ?? "not-documented") === "not-documented"
  ) {
    out.push({
      key: "conditions",
      label: infoLabel("conditions"),
      value: conditions,
      question: "Any conditions or past care that feels relevant?",
      patch: isNone(conditions)
        ? { conditionState: "none-known", conditionEntries: [] }
        : { conditionState: "documented", conditionEntries: splitList(conditions).map(entry) },
    });
  }

  const dob = answer("identity.dob");
  if (want("age") && dob && !info?.dob) {
    out.push({
      key: "age",
      label: infoLabel("age"),
      value: dob,
      question: "Date of birth",
      patch: { dob, dobUnavailable: false },
    });
  }

  const pregnancy = answer("history.pregnancy");
  const mapped = PREGNANCY_MAP[pregnancy.trim().toLowerCase()];
  if (
    want("pregnancy") &&
    mapped &&
    (info?.pregnancyStatus ?? "not-documented") === "not-documented"
  ) {
    out.push({
      key: "pregnancy",
      label: infoLabel("pregnancy"),
      value: pregnancy,
      question: "Pregnancy or breastfeeding",
      patch: { pregnancyStatus: mapped },
    });
  }

  return out;
}
