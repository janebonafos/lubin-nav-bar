// Bring what the client already shared in their intake form into the
// prescription safety review, instead of asking the provider to retype it.
//
// The client answered these questions themselves (Health Passport prefill or
// their own words) and shared them with this provider for this appointment.
// Nothing is written automatically: the provider sees the shared answer and
// chooses to accept it, so the clinical record stays clinician-attested.
import { getResponse, PREFER_IN_PERSON_TEXT } from "@/lib/intake/store";
import { loadHealthDetails, sharedHealthDetails } from "@/lib/intake/healthDetails";
import { getProviderGrant } from "@/lib/share/providerShareStore";
import { genRxId, type PatientSafetyInfo, type PregnancyStatus } from "./store";
import { infoLabel, type InfoKey } from "./safety";

export type SharedIntakeItem = {
  key: InfoKey;
  label: string;
  /** Where the answer came from: the intake form, or the shared Health Passport. */
  source: "intake" | "passport";
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
    id: genRxId(),
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
 * Health Passport fields the client explicitly consented to share with this
 * provider for this appointment. Fields the client left out of the consent
 * (or never filled) are simply absent — the provider is never prompted to ask
 * for them, and the safety check stays blank.
 */
function consentedPassportValues(appointmentId: string): Record<string, string> {
  const grant = getProviderGrant(appointmentId);
  if (!grant || grant.revoked) return {};
  if (!grant.includedKeys?.includes("health")) return {};
  const allow = grant.healthFieldIds;
  const details = loadHealthDetails();
  const out: Record<string, string> = {};
  for (const group of sharedHealthDetails(details)) {
    for (const item of group.items) {
      if (allow && !allow.includes(item.id)) continue;
      const v = (item.value ?? "").trim();
      if (v) out[item.id] = v;
    }
  }
  return out;
}

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
  const passport = consentedPassportValues(appointmentId);
  const sources: Record<string, "intake" | "passport"> = {};
  const answer = (id: string) => {
    const v = (values[id] ?? "").trim();
    if (v && v !== PREFER_IN_PERSON_TEXT) {
      sources[id] = "intake";
      return v;
    }
    const shared = (passport[id] ?? "").trim();
    if (shared) {
      sources[id] = "passport";
      return shared;
    }
    return "";
  };
  const src = (id: string): "intake" | "passport" => sources[id] ?? "intake";
  const out: SharedIntakeItem[] = [];
  const want = (k: InfoKey) => keys.includes(k);

  const allergies = answer("history.allergies");
  if (want("allergies") && allergies && (info?.allergyState ?? "not-documented") === "not-documented") {
    out.push({
      key: "allergies",
      label: infoLabel("allergies"),
      source: src("history.allergies"),
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
      source: src("medication.list"),
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
      source: src("history.conditions"),
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
      source: src("identity.dob"),
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
      source: src("history.pregnancy"),
      value: pregnancy,
      question: "Pregnancy or breastfeeding",
      patch: { pregnancyStatus: mapped },
    });
  }

  return out;
}

export type SharedSourceItem = {
  key: InfoKey;
  /** Where it came from: the client's intake answers, or their health card. */
  source: "intake" | "passport";
  /** What the client's own record says right now, verbatim. */
  value: string;
  question: string;
};

/**
 * What the client shared for this appointment, per safety check — regardless of
 * whether the provider has already saved it to the clinical record. Used to
 * label information as client-shared and to compare the saved record against
 * what the health card currently says. Nothing here is read without consent.
 */
export function sharedSourceMap(appointmentId: string): Record<string, SharedSourceItem> {
  const values = getResponse(appointmentId).values ?? {};
  const passport = consentedPassportValues(appointmentId);
  const pick = (
    id: string,
  ): { source: "intake" | "passport"; value: string } | null => {
    const v = (values[id] ?? "").trim();
    if (v && v !== PREFER_IN_PERSON_TEXT) return { source: "intake", value: v };
    const shared = (passport[id] ?? "").trim();
    if (shared) return { source: "passport", value: shared };
    return null;
  };
  const map: Record<string, SharedSourceItem> = {};
  const add = (key: InfoKey, id: string, question: string) => {
    const found = pick(id);
    if (!found) return;
    map[key] = { key, source: found.source, value: found.value, question };
  };
  add("allergies", "history.allergies", "Any allergies or reactions?");
  add("currentMedications", "medication.list", "Anything you're taking right now?");
  add("conditions", "history.conditions", "Any conditions or past care that feels relevant?");
  add("age", "identity.dob", "Date of birth");
  add("pregnancy", "history.pregnancy", "Pregnancy or breastfeeding");
  return map;
}
