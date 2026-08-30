// Voluntary health details the client can add to their Health Passport at any
// time — never asked as a task, never required. Whatever they add here quietly
// prefills the questions providers ask when a session is booked, so the same
// answer is never typed twice.
//
// Field ids intentionally match the intake template field ids
// (src/lib/intake/templates.ts) so prefill is a direct lookup.

const KEY = "lubin.passport.healthDetails.v1";
const CHANGE_EVENT = "lubin-health-details-change";

export type HealthDetailField = {
  id: string;
  label: string;
  help?: string;
  /**
   * "tags" keeps answers structured: the client picks from suggestions or adds
   * short entries (one item each), stored as a comma-separated list so a
   * clinician sees discrete items rather than a paragraph to interpret.
   */
  type: "short-text" | "long-text" | "date" | "tel" | "email" | "choice" | "tags" | "meds";
  placeholder?: string;
  options?: string[];
  /** For "tags": an option that clears every other selection (e.g. "None"). */
  exclusiveOption?: string;
  /** For "tags": max characters per added item. */
  maxItemLength?: number;
  /** For "tags": max number of items. */
  maxItems?: number;
  /** For text inputs: hard character cap. */
  maxLength?: number;
};

export type HealthDetailGroup = {
  id: string;
  label: string;
  /** Plain-language reason, in the client's interest — not the clinic's. */
  why: string;
  fields: HealthDetailField[];
};

export const HEALTH_DETAIL_GROUPS: HealthDetailGroup[] = [
  {
    id: "about-you",
    label: "About you",
    why: "Saves you filling in the basics every time you book someone new.",
    fields: [
      { id: "identity.fullName", label: "Full name", type: "short-text", placeholder: "First, middle, last" },
      { id: "identity.preferredName", label: "Preferred name", type: "short-text", placeholder: "What you'd like to be called" },
      { id: "identity.dob", label: "Date of birth", type: "date" },
    ],
  },
  {
    id: "reach-you",
    label: "How to reach you",
    why: "Used for your session reminders — never shared outside a provider you book.",
    fields: [
      { id: "contact.phone", label: "Mobile number", type: "tel", placeholder: "912 345 6789" },
      { id: "contact.email", label: "Best email", type: "email", placeholder: "you@email.com" },
      { id: "contact.address", label: "City and country", type: "short-text", placeholder: "City, country" },
    ],
  },
  {
    id: "safety-net",
    label: "Someone to call",
    why: "Only ever used if there's a serious concern for your safety. It's okay if you don't have someone right now.",
    fields: [
      {
        id: "emergency.none",
        label: "Do you have someone we can call in an emergency?",
        type: "choice",
        options: ["No one right now", "Yes, I have someone"],
      },
      { id: "emergency.name", label: "Emergency contact", type: "short-text", placeholder: "Name" },
      { id: "emergency.relationship", label: "Their relationship to you", type: "short-text", placeholder: "e.g. partner, parent" },
      { id: "emergency.phone", label: "Their number", type: "tel", placeholder: "912 345 6789" },
    ],
  },
  {
    id: "health",
    label: "Health that's useful to know",
    why: "If you ever need medication, this is what keeps prescribing safe — and means no one asks you mid-session.",
    fields: [
      {
        id: "medication.list",
        label: "Anything you take right now",
        help:
          "This means anything you take regularly — not just mental-health medication. Prescriptions, over-the-counter medicine, vitamins, supplements, birth control: list them all so prescribing stays safe. Add a row for each.",
        type: "meds",
        placeholder: "e.g. Sertraline 50mg",
        exclusiveOption: "Nothing right now",
        options: [
          "Nothing right now",
          "Antidepressant",
          "Anti-anxiety",
          "Sleep aid",
          "ADHD medication",
          "Birth control",
          "Vitamins or supplements",
        ],
        maxItemLength: 40,
        maxItems: 10,
      },
      {
        id: "history.allergies",
        label: "Allergies or reactions",
        help: "One allergy per item — no need to explain the story.",
        type: "tags",
        placeholder: "e.g. Penicillin",
        exclusiveOption: "None known",
        options: ["None known", "Penicillin", "Aspirin / NSAIDs", "Sulfa drugs", "Food", "Latex"],
        maxItemLength: 30,
        maxItems: 10,
      },
      {
        id: "history.conditions",
        label: "Conditions or past care that feels relevant",
        help: "Tap any that apply. Add your own only if it isn't listed.",
        type: "tags",
        placeholder: "e.g. Migraine",
        exclusiveOption: "None",
        options: [
          "None",
          "Anxiety",
          "Depression",
          "Bipolar disorder",
          "ADHD",
          "PTSD or trauma",
          "Sleep problems",
          "Thyroid condition",
          "High blood pressure",
          "Diabetes",
          "Liver or kidney condition",
          "Seizures",
          "Pregnancy-related care",
        ],
        maxItemLength: 30,
        maxItems: 12,
      },
      {
        id: "history.pregnancy",
        label: "Pregnant, breastfeeding or trying to conceive?",
        help: "Only matters because it changes what's safe to prescribe.",
        type: "choice",
        options: [
          "None of these apply",
          "I'm pregnant",
          "I'm breastfeeding",
          "Trying to conceive",
          "Prefer not to say",
        ],
      },
    ],
  },
  {
    id: "care",
    label: "Care you already have",
    why: "So a new provider works alongside anyone already supporting you.",
    fields: [
      {
        id: "care.previous",
        label: "Have you had therapy or psychiatric care before?",
        type: "choice",
        options: ["No, this is my first time", "Yes, in the past", "Yes, currently"],
      },
      {
        id: "care.clinicians",
        label: "Anyone currently involved in your care",
        help: "Just their role — one per item.",
        type: "tags",
        placeholder: "e.g. GP",
        exclusiveOption: "No one right now",
        options: ["No one right now", "GP / family doctor", "Psychiatrist", "Therapist", "Specialist"],
        maxItemLength: 30,
        maxItems: 6,
      },
    ],
  },
];

export const ALL_HEALTH_DETAIL_FIELDS: HealthDetailField[] =
  HEALTH_DETAIL_GROUPS.flatMap((g) => g.fields);

export type HealthDetails = Record<string, string>;

function emit() {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* noop */
  }
}

export function subscribeHealthDetails(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, fn);
  return () => window.removeEventListener(CHANGE_EVENT, fn);
}

export function loadHealthDetails(): HealthDetails {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as HealthDetails) : {};
  } catch {
    return {};
  }
}

export function setHealthDetail(fieldId: string, value: string): void {
  if (typeof window === "undefined") return;
  const next = { ...loadHealthDetails() };
  if (value.trim()) next[fieldId] = value;
  else delete next[fieldId];
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* noop */
  }
  emit();
}

export type HealthDetailsProgress = {
  filled: number;
  total: number;
  /** Groups with at least one answer. */
  groupsStarted: number;
};

export function healthDetailsProgress(details = loadHealthDetails()): HealthDetailsProgress {
  const filled = ALL_HEALTH_DETAIL_FIELDS.filter((f) => (details[f.id] ?? "").trim()).length;
  return {
    filled,
    total: ALL_HEALTH_DETAIL_FIELDS.length,
    groupsStarted: HEALTH_DETAIL_GROUPS.filter((g) =>
      g.fields.some((f) => (details[f.id] ?? "").trim()),
    ).length,
  };
}

export function groupFilledCount(group: HealthDetailGroup, details: HealthDetails): number {
  return group.fields.filter((f) => (details[f.id] ?? "").trim()).length;
}
