// Client intake form library. Providers pick from this set — there is no custom
// question builder — so clients always see familiar, short, standard asks.
//
// Sections follow what therapists, psychologists and psychiatrists normally
// collect at intake: client identification, contact and emergency details,
// presenting concern, clinical background, and consent/billing admin.
//
// Nothing here is ever a hard requirement: the client can confirm a prefilled
// answer, write their own, or say they'd rather talk about it in the session.

export type IntakeFieldType =
  | "long-text"
  | "short-text"
  | "date"
  | "tel"
  | "email"
  | "choice"
  | "ack";

export type IntakeField = {
  id: string;
  label: string;
  help?: string;
  type: IntakeFieldType;
  placeholder?: string;
  options?: string[];
  /** One-tap starter answers for free-text fields — tap to fill, edit freely. */
  suggestions?: string[];
  /** Which Health Passport signal can prefill this field, if any. */
  prefill?: "recent-mood" | "recent-themes" | "recent-assessments" | "sleep-energy";
};

/** Grouping used in the provider's intake form builder. */
export type IntakeGroup =
  | "Client identification"
  | "Contact & emergency"
  | "Reason for care"
  | "Clinical background"
  | "Consent & admin";

export type IntakeTemplate = {
  id: string;
  label: string;
  group: IntakeGroup;
  /** Why it helps — shown to the client, in their language. */
  why: string;
  /** Rough time to answer, shown as reassurance. */
  minutes: number;
  fields: IntakeField[];
};

export const INTAKE_TEMPLATES: IntakeTemplate[] = [
  {
    id: "identity",
    label: "Client details",
    group: "Client identification",
    why: "Standard details every clinician records — your name as it appears on your ID, your date of birth, and how you'd like to be addressed.",
    minutes: 1,
    fields: [
      {
        id: "identity.fullName",
        label: "Full legal name",
        help: "As it appears on your ID — needed for clinical records and any prescription.",
        type: "short-text",
        placeholder: "First, middle, last",
      },
      {
        id: "identity.preferredName",
        label: "Preferred name",
        type: "short-text",
        placeholder: "What you'd like to be called",
      },
      {
        id: "identity.dob",
        label: "Date of birth",
        type: "date",
      },
      {
        id: "identity.pronouns",
        label: "Pronouns",
        type: "short-text",
        placeholder: "e.g. she/her — optional",
      },
      {
        id: "identity.gender",
        label: "Sex / gender recorded for clinical purposes",
        type: "short-text",
        placeholder: "However you'd like it recorded",
      },
    ],
  },
  {
    id: "contact",
    label: "Contact and address",
    group: "Contact & emergency",
    why: "So your provider can reach you about your session and knows which region's rules apply to your care.",
    minutes: 1,
    fields: [
      {
        id: "contact.phone",
        label: "Mobile number",
        type: "tel",
        placeholder: "+63 9XX XXX XXXX",
      },
      {
        id: "contact.email",
        label: "Email",
        type: "email",
        placeholder: "you@email.com",
      },
      {
        id: "contact.address",
        label: "Address (city and country is enough)",
        type: "short-text",
        placeholder: "City, country",
      },
    ],
  },
  {
    id: "emergency",
    label: "Emergency contact",
    group: "Contact & emergency",
    why: "Standard practice in therapy and psychiatry — only used if there's a serious concern for your safety.",
    minutes: 1,
    fields: [
      {
        id: "emergency.name",
        label: "Who should be contacted in an emergency?",
        type: "short-text",
        placeholder: "Name",
      },
      {
        id: "emergency.relationship",
        label: "Their relationship to you",
        type: "short-text",
        placeholder: "e.g. partner, parent, friend",
      },
      {
        id: "emergency.phone",
        label: "Their contact number",
        type: "tel",
        placeholder: "+63 9XX XXX XXXX",
      },
    ],
  },
  {
    id: "presenting",
    label: "What brings you in",
    group: "Reason for care",
    why: "The short version of what you're dealing with, so no one has to start from zero.",
    minutes: 1,
    fields: [
      {
        id: "presenting.concern",
        label: "What's the main thing you'd like help with?",
        type: "long-text",
        placeholder: "In your own words — a sentence or two is plenty.",
        suggestions: [
          "Anxiety or constant worry",
          "Low mood or depression",
          "Trouble sleeping",
          "Stress and burnout",
          "Relationship difficulties",
          "Grief or loss",
        ],
      },
      {
        id: "presenting.duration",
        label: "How long has this been going on?",
        type: "choice",
        options: ["Less than a month", "1–6 months", "6–12 months", "Over a year", "On and off for years"],
      },
    ],
  },
  {
    id: "goals",
    label: "Your goals for this session",
    group: "Reason for care",
    why: "So your provider can start with what matters to you instead of asking you to explain from scratch.",
    minutes: 1,
    fields: [
      {
        id: "goals.focus",
        label: "What would you like to get out of this session?",
        type: "long-text",
        placeholder: "Even a sentence helps — e.g. \"I want help sleeping again.\"",
        suggestions: [
          "Understand what I'm going through",
          "Get practical coping tools",
          "Talk it through with someone",
          "Get a diagnosis or assessment",
          "Review or start medication",
          "Just need someone to listen",
        ],
      },
    ],
  },
  {
    id: "recent",
    label: "What's been going on lately",
    group: "Clinical background",
    why: "Gives your provider the short version of the last few weeks before you meet.",
    minutes: 1,
    fields: [
      {
        id: "recent.summary",
        label: "How have the last couple of weeks been?",
        type: "long-text",
        prefill: "recent-mood",
        placeholder: "A few words is enough.",
        suggestions: [
          "Mostly okay, some hard days",
          "Pretty difficult",
          "Up and down",
          "Better than before",
          "About the same as usual",
        ],
      },
      {
        id: "recent.themes",
        label: "What's been taking up the most space?",
        type: "short-text",
        prefill: "recent-themes",
        placeholder: "e.g. work, sleep, family",
      },
    ],
  },
  {
    id: "medication",
    label: "Current medication and supplements",
    group: "Clinical background",
    why: "Keeps your provider from having to ask through the list during your time together.",
    minutes: 1,
    fields: [
      {
        id: "medication.list",
        label: "Anything you're taking right now?",
        help: "Include supplements. \"None\" is a perfectly good answer.",
        type: "long-text",
        placeholder: "Name and dose if you know it.",
        suggestions: ["None right now", "Only supplements or vitamins"],
      },
    ],
  },
  {
    id: "history",
    label: "Medical and mental health history",
    group: "Clinical background",
    why: "Helps your provider work safely from the first minute.",
    minutes: 2,
    fields: [
      {
        id: "history.conditions",
        label: "Any conditions or past care that feels relevant?",
        type: "long-text",
        placeholder: "Only what you're comfortable sharing.",
        suggestions: [
          "Nothing that feels relevant",
          "I've had therapy before",
          "I have a physical health condition",
        ],
      },
      {
        id: "history.allergies",
        label: "Any allergies or reactions?",
        type: "short-text",
        placeholder: "e.g. penicillin — or \"none known\"",
      },
      {
        id: "history.pregnancy",
        label: "Are you pregnant, breastfeeding or trying to conceive?",
        help: "Only asked because it changes what is safe to prescribe.",
        type: "choice",
        options: [
          "None of these apply",
          "I'm pregnant",
          "I'm breastfeeding",
          "Trying to conceive",
          "Prefer not to say",
        ],
      },
      {
        id: "history.family",
        label: "Anything similar in your family?",
        help: "Common question in psychiatry — skip it if you'd rather talk it through.",
        type: "short-text",
        placeholder: "e.g. a parent treated for depression",
      },
    ],
  },
  {
    id: "care-team",
    label: "Current and previous care",
    group: "Clinical background",
    why: "So your provider can work alongside anyone else already supporting you, instead of duplicating it.",
    minutes: 1,
    fields: [
      {
        id: "care.previous",
        label: "Have you had therapy or psychiatric care before?",
        type: "choice",
        options: ["No, this is my first time", "Yes, in the past", "Yes, currently"],
      },
      {
        id: "care.clinicians",
        label: "Anyone currently involved in your care?",
        help: "A doctor, therapist or psychiatrist — names aren't required.",
        type: "short-text",
        placeholder: "e.g. my GP manages my thyroid medication",
      },
      {
        id: "care.referral",
        label: "Were you referred by someone?",
        type: "short-text",
        placeholder: "Name or \"found you myself\"",
      },
    ],
  },
  {
    id: "sleep",
    label: "Sleep, energy, appetite",
    group: "Clinical background",
    why: "These three tell your provider a lot quickly — and you may have logged some already.",
    minutes: 1,
    fields: [
      {
        id: "sleep.hours",
        label: "How has your sleep been?",
        type: "choice",
        options: ["Sleeping well", "Broken sleep", "Hard to fall asleep", "Sleeping too much"],
        prefill: "sleep-energy",
      },
      {
        id: "sleep.energy",
        label: "And your energy through the day?",
        type: "choice",
        options: ["Steady", "Up and down", "Mostly low", "Exhausted"],
        prefill: "sleep-energy",
      },
      {
        id: "sleep.appetite",
        label: "Appetite?",
        type: "choice",
        options: ["Normal", "Eating less", "Eating more", "Irregular"],
      },
    ],
  },
  {
    id: "insurance",
    label: "Billing and insurance",
    group: "Consent & admin",
    why: "Only needed if you plan to claim your session — otherwise skip it.",
    minutes: 1,
    fields: [
      {
        id: "insurance.provider",
        label: "Insurance or HMO provider",
        type: "short-text",
        placeholder: "e.g. Maxicare — or \"paying myself\"",
      },
      {
        id: "insurance.member",
        label: "Member or policy number",
        type: "short-text",
        placeholder: "Optional",
      },
    ],
  },
  {
    id: "consent",
    label: "Consent and practice policies",
    group: "Consent & admin",
    why: "A quick read now means nothing to sign while your session clock is running.",
    minutes: 1,
    fields: [
      {
        id: "consent.ack",
        label: "I've read how my provider handles confidentiality, notes and cancellations.",
        help: "You can still ask questions about any of it in the session.",
        type: "ack",
      },
    ],
  },
];

export const INTAKE_GROUPS: IntakeGroup[] = [
  "Client identification",
  "Contact & emergency",
  "Reason for care",
  "Clinical background",
  "Consent & admin",
];

export function templateById(id: string): IntakeTemplate | undefined {
  return INTAKE_TEMPLATES.find((t) => t.id === id);
}

/** Sensible starting set for a provider who hasn't chosen yet. */
export const DEFAULT_TEMPLATE_IDS = [
  "identity",
  "contact",
  "emergency",
  "presenting",
  "goals",
  "medication",
];
