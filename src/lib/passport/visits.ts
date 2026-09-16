/**
 * Prototype-only visit and checkup records for the patient Health Passport.
 * All records below are fictional demo data. No backend, no real patient data.
 */

export type VisitKind = "completed" | "scheduled";

export type VisitTest = {
  name: string;
  status: "Ordered" | "Result available" | "Sample collected";
  detail?: string;
};

export type VisitPrescriptionLink = {
  label: string;
  detail: string;
};

export type PassportVisit = {
  id: string;
  kind: VisitKind;
  /** ISO date of the visit or appointment. */
  date: string;
  time?: string;
  clinic: string;
  clinician: string;
  clinicianRole: string;
  reason: string;
  /** Visit summary — only present on completed visits. */
  summary?: string;
  /** Diagnoses or findings, only when the clinician provided them. */
  findings?: string[];
  tests?: VisitTest[];
  prescriptions?: VisitPrescriptionLink[];
  followUp?: string;
  nextAppointment?: string;
  /** Set when the record came from the clinic rather than the patient. */
  recordedBy?: string;
  preparation?: string[];
  /** "patient" = added by the patient for a visit that happened outside Lubin. */
  origin?: "lubin" | "patient";
  /** Patient's own note about an outside visit. */
  note?: string;
  addedAt?: number;
};

export const PASSPORT_VISITS: PassportVisit[] = [
  {
    id: "v-2026-10-02",
    kind: "scheduled",
    date: "2026-10-02",
    time: "10:30 AM",
    clinic: "Lubin Telehealth (online)",
    clinician: "Dr. Reyes Mendoza",
    clinicianRole: "Psychiatrist",
    reason: "Four-week medication review",
    followUp: "Bring your check-in notes from the last two weeks.",
    preparation: [
      "Share your Health Passport before the visit",
      "Complete the pre-visit intake form",
      "List any side effects you noticed",
    ],
  },
  {
    id: "v-2026-09-20",
    kind: "scheduled",
    date: "2026-09-20",
    time: "3:00 PM",
    clinic: "Mercy Family Clinic, Quezon City",
    clinician: "Dr. Alina Cruz",
    clinicianRole: "Family medicine",
    reason: "Annual physical examination",
    preparation: ["Fast 8 hours before the blood test", "Bring your current medication list"],
  },
  {
    id: "v-2026-08-29",
    kind: "completed",
    date: "2026-08-29",
    time: "11:00 AM",
    clinic: "Lubin Telehealth (online)",
    clinician: "Dr. Reyes Mendoza",
    clinicianRole: "Psychiatrist",
    reason: "Medication review — low mood and poor sleep",
    summary:
      "Mood and sleep have improved since the last visit. Sleep now averages six to seven hours with fewer night awakenings. No side effects reported. Agreed to continue the current dose for another four weeks and keep daily check-ins.",
    findings: ["Major depressive episode, moderate — improving", "Sleep disturbance, improving"],
    tests: [
      { name: "PHQ-9 (in-visit)", status: "Result available", detail: "Score 9 — mild" },
      { name: "Thyroid panel (TSH, FT4)", status: "Result available", detail: "Within normal range" },
    ],
    prescriptions: [
      { label: "Sertraline 50 mg tablet", detail: "Once daily in the morning · 30 days · issued Aug 29, 2026" },
    ],
    followUp: "Continue current dose. Log mood and sleep daily. Contact the clinic if sleep worsens for more than three nights.",
    nextAppointment: "Oct 2, 2026 · 10:30 AM with Dr. Reyes Mendoza",
    recordedBy: "Recorded by the clinic",
  },
  {
    id: "v-2026-07-14",
    kind: "completed",
    date: "2026-07-14",
    clinic: "Mercy Family Clinic, Quezon City",
    clinician: "Dr. Alina Cruz",
    clinicianRole: "Family medicine",
    reason: "Persistent dry cough for two weeks",
    summary:
      "Dry cough with no fever or breathlessness. Chest examination clear. Likely post-viral cough. Advised rest, fluids, and honey-based relief. Asked to return if the cough lasts beyond three more weeks.",
    findings: ["Post-viral cough"],
    tests: [{ name: "Chest X-ray", status: "Result available", detail: "No abnormality seen" }],
    followUp: "Return if the cough persists past Aug 4, 2026 or if fever develops.",
    recordedBy: "Recorded by the clinic",
  },
  {
    id: "v-2026-05-06",
    kind: "completed",
    date: "2026-05-06",
    clinic: "Lubin Telehealth (online)",
    clinician: "Ana Villamor, RPsy",
    clinicianRole: "Psychologist",
    reason: "First therapy consultation",
    summary:
      "Discussed work-related stress and sleep difficulty. Agreed on weekly sessions for six weeks with sleep-routine work between sessions.",
    followUp: "Weekly therapy sessions; keep a short evening wind-down routine.",
    recordedBy: "Recorded by the clinic",
  },
];

export function formatVisitDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function visitCounts(visits: PassportVisit[] = PASSPORT_VISITS) {
  return {
    scheduled: visits.filter((v) => v.kind === "scheduled").length,
    completed: visits.filter((v) => v.kind === "completed").length,
  };
}

/* ------------------------------------------------------------------ *
 * Patient-added visits from outside Lubin (prototype, local only).
 * ------------------------------------------------------------------ */

export const OUTSIDE_LABEL = "Added by you · Outside Lubin";

/** Fictional demo outside visit shipped with the prototype. */
export const DEMO_OUTSIDE_VISIT: PassportVisit = {
  id: "ov-demo-2026-09-16",
  kind: "completed",
  origin: "patient",
  date: "2026-09-16",
  clinic: "Sample Community Clinic",
  clinician: "Not recorded",
  clinicianRole: "Outside Lubin",
  reason: "General checkup",
  note: "Bring the laboratory results to my follow-up.",
};

const VISITS_KEY = "lubin.passport.visits.outside.v1";
const VISITS_EVENT = "lubin:passport-visits";

export function loadOutsideVisits(): PassportVisit[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(VISITS_KEY);
    return raw ? (JSON.parse(raw) as PassportVisit[]) : [];
  } catch {
    return [];
  }
}

export function saveOutsideVisit(input: {
  date: string;
  clinic: string;
  reason?: string;
  note?: string;
}): PassportVisit {
  const entry: PassportVisit = {
    id: `ov-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kind: "completed",
    origin: "patient",
    date: input.date,
    clinic: input.clinic.trim(),
    clinician: "Not recorded",
    clinicianRole: "Outside Lubin",
    reason: input.reason?.trim() || "Visit outside Lubin",
    note: input.note?.trim() || undefined,
    addedAt: Date.now(),
  };
  try {
    window.localStorage.setItem(VISITS_KEY, JSON.stringify([entry, ...loadOutsideVisits()]));
  } catch {
    /* prototype only */
  }
  window.dispatchEvent(new Event(VISITS_EVENT));
  return entry;
}

export function removeOutsideVisit(id: string) {
  try {
    window.localStorage.setItem(
      VISITS_KEY,
      JSON.stringify(loadOutsideVisits().filter((v) => v.id !== id)),
    );
  } catch {
    /* prototype only */
  }
  window.dispatchEvent(new Event(VISITS_EVENT));
}

export function subscribeVisits(fn: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(VISITS_EVENT, fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener(VISITS_EVENT, fn);
    window.removeEventListener("storage", fn);
  };
}

/** Lubin visits plus every patient-added outside visit. */
export function allVisits(): PassportVisit[] {
  return [...loadOutsideVisits(), DEMO_OUTSIDE_VISIT, ...PASSPORT_VISITS];
}

/** Short label used in the "Related visit" field and on document links. */
export function visitOptionLabel(visit: PassportVisit): string {
  return `${visit.reason} · ${formatVisitDate(visit.date)}${
    visit.origin === "patient" ? " · Outside Lubin" : ""
  }`;
}
