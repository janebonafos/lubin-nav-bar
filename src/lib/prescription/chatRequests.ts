// Prescription requests that arrive from the client-facing chat AI.
// Kept deliberately separate from prescriptions a provider creates manually
// inside an appointment (store.ts, keyed by appointmentId). Demo-only local
// storage with fictional patients — no live prescribing or messaging.

import type { InfoDocState, PatientInfoEntry, RxCountry } from "./store";

export type ChatRxKind = "new" | "renewal";

export type ChatRxRequest = {
  id: string;
  kind: ChatRxKind;
  receivedAt: number;
  country: RxCountry;
  patient: {
    name: string;
    dob: string;
    ageYears: number;
    sex: string;
    /** Only present when identity was actually verified. */
    verification?: { method: string; at: number };
  };
  requestedMedication?: string;
  chatSummary: string;
  conversation: { from: "client" | "assistant"; text: string; at: number }[];
  intake: { q: string; a: string }[];
  allergyState: InfoDocState;
  allergies: (PatientInfoEntry & { reviewStatus: "clinician-reviewed" | "patient-reported" })[];
  currentMedications: string[];
  ai: { reasoning: string[]; missing: string[] };
  suggestion?: Partial<DraftFields>;
  /** Simulates one failed delivery attempt so retry can be demonstrated. */
  failFirstDelivery?: boolean;
};

export type DraftFields = {
  medicine: string;
  strength: string;
  dose: string;
  route: string;
  frequency: string;
  duration: string;
  quantity: string;
  assessment: string;
  followUp: string;
};

export const DRAFT_FIELD_LABELS: Record<keyof DraftFields, string> = {
  medicine: "Medicine",
  strength: "Strength & form",
  dose: "Dose",
  route: "Route",
  frequency: "Frequency",
  duration: "Duration",
  quantity: "Quantity",
  assessment: "Assessment",
  followUp: "Follow-up plan",
};

export const EMPTY_DRAFT: DraftFields = {
  medicine: "",
  strength: "",
  dose: "",
  route: "",
  frequency: "",
  duration: "",
  quantity: "",
  assessment: "",
  followUp: "",
};

export type NextStepKind = "consultation" | "referral" | "other";

export type ChatRxResponse = {
  questions: { open: boolean; text: string; sentAt?: number; reply?: { text: string; at: number } };
  draft: {
    open: boolean;
    fields: DraftFields;
    aiFilled?: { fields: (keyof DraftFields)[]; before: DraftFields };
    signedAt?: number;
    delivery: "not-sent" | "delivering" | "delivered" | "failed";
    deliveryAttempts: number;
    deliveredAt?: number;
  };
  advice: { open: boolean; text: string; sentAt?: number };
  nextStep: { open: boolean; kind: NextStepKind; note: string; sentAt?: number };
  updatedAt: number;
};

export type ChatRxStatus = "New" | "Draft" | "Sent" | "Waiting for patient" | "Signed" | "Delivered";

export function emptyResponse(): ChatRxResponse {
  return {
    questions: { open: false, text: "" },
    draft: { open: false, fields: { ...EMPTY_DRAFT }, delivery: "not-sent", deliveryAttempts: 0 },
    advice: { open: false, text: "" },
    nextStep: { open: false, kind: "consultation", note: "" },
    updatedAt: 0,
  };
}

export function responseStatus(r: ChatRxResponse): ChatRxStatus {
  if (r.draft.delivery === "delivered") return "Delivered";
  if (r.draft.signedAt) return "Signed";
  if (r.questions.sentAt && !r.questions.reply) return "Waiting for patient";
  if (r.questions.sentAt || r.advice.sentAt || r.nextStep.sentAt) return "Sent";
  const typed =
    r.questions.text.trim() ||
    r.advice.text.trim() ||
    r.nextStep.note.trim() ||
    Object.values(r.draft.fields).some((v) => v.trim());
  return typed ? "Draft" : "New";
}

const KEY = "lubin.chatRxResponses.v1";
const EVT = "lubin-chat-rx-change";

export function loadResponses(): Record<string, ChatRxResponse> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveResponse(id: string, r: ChatRxResponse) {
  const all = loadResponses();
  all[id] = { ...r, updatedAt: Date.now() };
  window.localStorage.setItem(KEY, JSON.stringify(all));
  window.dispatchEvent(new Event(EVT));
}

export function resetResponses() {
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVT));
}

export function subscribeResponses(fn: () => void) {
  window.addEventListener(EVT, fn);
  return () => window.removeEventListener(EVT, fn);
}

const H = 3600_000;
const now = Date.UTC(2026, 8, 25, 5, 0);

export const CHAT_RX_REQUESTS: ChatRxRequest[] = [
  {
    id: "chat-rx-1",
    kind: "renewal",
    receivedAt: now - 2 * H,
    country: "PH",
    patient: {
      name: "Carla Mendoza",
      dob: "1994-03-12",
      ageYears: 32,
      sex: "Female",
      verification: { method: "Government ID + selfie match", at: now - 90 * 24 * H },
    },
    requestedMedication: "Sertraline 50 mg",
    chatSummary:
      "Carla asks to renew sertraline 50 mg once daily, started 5 months ago by Dr. Reyes. She reports steadier mood and sleep, mild nausea in the first two weeks that resolved, and 6 tablets left. No thoughts of self-harm reported in chat.",
    conversation: [
      { from: "client", text: "Hi, I need a refill of my sertraline, I only have about 6 left.", at: now - 2.2 * H },
      { from: "assistant", text: "I can pass a renewal request to a doctor. How has it been working for you?", at: now - 2.2 * H },
      { from: "client", text: "Much better than before. Sleeping ok, mood is steady. Nausea went away after the first weeks.", at: now - 2.1 * H },
      { from: "assistant", text: "Have you had any thoughts of harming yourself recently?", at: now - 2.1 * H },
      { from: "client", text: "No, none.", at: now - 2.05 * H },
    ],
    intake: [
      { q: "What would you like help with?", a: "Renew an existing prescription" },
      { q: "Current dose", a: "50 mg once daily in the morning" },
      { q: "Missed doses in the last month", a: "About 2" },
      { q: "Pregnant, breastfeeding, or trying to conceive?", a: "Not pregnant, not breastfeeding" },
    ],
    allergyState: "documented",
    allergies: [
      {
        id: "a1",
        name: "Penicillin",
        reaction: "Hives",
        severity: "moderate",
        reactionType: "allergy",
        source: "passport",
        reviewStatus: "patient-reported",
      },
    ],
    currentMedications: ["Sertraline 50 mg once daily", "Cetirizine 10 mg as needed"],
    ai: {
      reasoning: [
        "Request matches an existing prescription recorded in the Health Passport.",
        "Client describes benefit and resolved early side effects.",
        "No interaction flagged between sertraline and cetirizine in the demo reference.",
      ],
      missing: [
        "Date of last in-person or video review is not recorded.",
        "Penicillin allergy is patient-reported and has not been reviewed by a clinician.",
      ],
    },
    suggestion: {
      medicine: "Sertraline",
      strength: "50 mg film-coated tablet",
      dose: "1 tablet",
      route: "Oral",
      frequency: "Once daily in the morning",
      duration: "30 days",
      quantity: "30 tablets",
    },
  },
  {
    id: "chat-rx-2",
    kind: "new",
    receivedAt: now - 5 * H,
    country: "PH",
    patient: { name: "Miguel Tan", dob: "1988-11-02", ageYears: 37, sex: "Male" },
    requestedMedication: "Something for sleep",
    chatSummary:
      "Miguel reports trouble falling asleep for about 3 weeks after a job change and asks for sleeping medication. He mentions 2–3 cups of coffee daily, some after 4 pm. He has not tried a medicine for sleep before.",
    conversation: [
      { from: "client", text: "Can I get a prescription for sleeping pills? I can't fall asleep lately.", at: now - 5.3 * H },
      { from: "assistant", text: "I can pass this to a doctor. How long has this been happening?", at: now - 5.2 * H },
      { from: "client", text: "About 3 weeks, since I started a new job. I drink coffee in the afternoon too.", at: now - 5.1 * H },
    ],
    intake: [
      { q: "What would you like help with?", a: "New prescription" },
      { q: "How long has this been happening?", a: "About 3 weeks" },
      { q: "Tried anything already?", a: "Melatonin from the pharmacy, once" },
    ],
    allergyState: "not-documented",
    allergies: [],
    currentMedications: [],
    ai: {
      reasoning: [
        "Short-duration sleep difficulty with a clear trigger and caffeine use.",
        "Sleep hygiene and a consultation may be appropriate before medication.",
      ],
      missing: [
        "Allergies have not been recorded — not the same as none.",
        "Alcohol use, mood symptoms and snoring are not documented.",
        "Identity has not been verified.",
      ],
    },
    failFirstDelivery: true,
  },
];

export function fullName(r: ChatRxRequest) {
  return r.patient.name;
}
