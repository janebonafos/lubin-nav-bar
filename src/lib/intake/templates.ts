// Session prep templates. Providers pick from this library — there is no
// custom question builder — so the client always sees familiar, short asks.
//
// Nothing here is ever a hard requirement: the client can confirm a prefilled
// answer, write their own, or say they'd rather talk about it in the session.

export type IntakeFieldType = "long-text" | "short-text" | "choice" | "ack";

export type IntakeField = {
  id: string;
  label: string;
  help?: string;
  type: IntakeFieldType;
  placeholder?: string;
  options?: string[];
  /** Which Health Passport signal can prefill this field, if any. */
  prefill?: "recent-mood" | "recent-themes" | "recent-assessments" | "sleep-energy";
};

export type IntakeTemplate = {
  id: string;
  label: string;
  /** Why it helps — shown to the client, in their language. */
  why: string;
  /** Rough time to answer, shown as reassurance. */
  minutes: number;
  fields: IntakeField[];
};

export const INTAKE_TEMPLATES: IntakeTemplate[] = [
  {
    id: "goals",
    label: "Your goals for this session",
    why: "So your provider can start with what matters to you instead of asking you to explain from scratch.",
    minutes: 1,
    fields: [
      {
        id: "goals.focus",
        label: "What would you like to get out of this session?",
        type: "long-text",
        placeholder: "Even a sentence helps — e.g. \"I want help sleeping again.\"",
      },
    ],
  },
  {
    id: "recent",
    label: "What's been going on lately",
    why: "Gives your provider the short version of the last few weeks before you meet.",
    minutes: 1,
    fields: [
      {
        id: "recent.summary",
        label: "How have the last couple of weeks been?",
        type: "long-text",
        prefill: "recent-mood",
        placeholder: "A few words is enough.",
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
    why: "Keeps your provider from having to ask through the list during your time together.",
    minutes: 1,
    fields: [
      {
        id: "medication.list",
        label: "Anything you're taking right now?",
        help: "Include supplements. \"None\" is a perfectly good answer.",
        type: "long-text",
        placeholder: "Name and dose if you know it.",
      },
    ],
  },
  {
    id: "history",
    label: "Relevant medical history",
    why: "Helps your provider work safely from the first minute.",
    minutes: 2,
    fields: [
      {
        id: "history.conditions",
        label: "Any conditions or past care that feels relevant?",
        type: "long-text",
        placeholder: "Only what you're comfortable sharing.",
      },
      {
        id: "history.allergies",
        label: "Any allergies or reactions?",
        type: "short-text",
        placeholder: "e.g. penicillin — or \"none known\"",
      },
    ],
  },
  {
    id: "sleep",
    label: "Sleep, energy, appetite",
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
    id: "consent",
    label: "Consent and practice policies",
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

export function templateById(id: string): IntakeTemplate | undefined {
  return INTAKE_TEMPLATES.find((t) => t.id === id);
}

/** Sensible starting set for a provider who hasn't chosen yet. */
export const DEFAULT_TEMPLATE_IDS = ["goals", "recent", "medication"];
