import { loadAttempts } from "@/lib/patterns/storage";
import { ASSESSMENTS } from "@/lib/patterns/assessments";
import type { Attempt } from "@/lib/patterns/types";

export type RangeKey = "latest" | "30d" | "90d" | "12m" | "all";

export type MoodCheckin = {
  id: string;
  mood: number;
  note: string;
  date: string;
};

export type SupportStats = {
  resourcesAccessed: number;
  checkinsCompleted: number;
  appointmentsBooked: number;
};

export type SummaryData = {
  range: RangeKey;
  rangeLabel: string;
  dateSpan: string;
  checkinsInRange: MoodCheckin[];
  attemptsInRange: Attempt[];
  moodLabel: string; // e.g., "Mostly okay"
  stressLabel: string; // e.g., "Elevated"
  directionLabel: string; // "Improving" | "Steady" | "Heavier"
  insight: string;
  themes: { label: string; count: number }[];
  support: SupportStats;
  hasAnyData: boolean;
};

const MOOD_BANDS = [
  { max: 1.5, label: "Very low" },
  { max: 2.5, label: "Low" },
  { max: 3.5, label: "Mostly okay" },
  { max: 4.5, label: "Mostly good" },
  { max: 5.1, label: "Mostly bright" },
];

function rangeWindow(range: RangeKey, checkins: MoodCheckin[]): {
  start: number;
  end: number;
  label: string;
} {
  const end = Date.now();
  if (range === "30d") {
    return { start: end - 30 * 86_400_000, end, label: "Last 30 days" };
  }
  if (range === "90d") {
    return { start: end - 90 * 86_400_000, end, label: "Last 3 months" };
  }
  if (range === "12m") {
    return { start: end - 365 * 86_400_000, end, label: "Last 12 months" };
  }
  if (range === "all") {
    return { start: 0, end, label: "Full history" };
  }
  // latest
  const latest = checkins[0];
  const start = latest ? new Date(latest.date).getTime() : end;
  return { start, end: start, label: "Latest check-in" };
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function bandLabel(avg: number): string {
  for (const b of MOOD_BANDS) {
    if (avg <= b.max) return b.label;
  }
  return "Mostly bright";
}

function extractThemes(
  checkins: MoodCheckin[],
  attempts: Attempt[],
): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  const KEYWORDS = [
    "sleep",
    "work",
    "stress",
    "anxiety",
    "family",
    "money",
    "relationship",
    "energy",
    "focus",
    "health",
  ];
  for (const c of checkins) {
    const text = (c.note || "").toLowerCase();
    for (const k of KEYWORDS) {
      if (text.includes(k)) counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  // Add a soft boost from completed assessments by category.
  for (const a of attempts) {
    const meta = ASSESSMENTS.find((x) => x.id === a.assessmentId);
    if (!meta) continue;
    const tag =
      meta.group === "core"
        ? "mood"
        : meta.group === "emotional"
        ? "stress"
        : meta.group === "patterns"
        ? "focus"
        : "health";
    counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

export function buildSummary(
  range: RangeKey,
  inputs: { checkins: MoodCheckin[]; resourcesAccessed?: number; appointmentsBooked?: number } = {
    checkins: [],
  },
): SummaryData {
  const allCheckins = [...inputs.checkins].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const allAttempts =
    typeof window === "undefined"
      ? []
      : loadAttempts().sort((a, b) => b.takenAt - a.takenAt);

  const win = rangeWindow(range, allCheckins);

  const checkinsInRange =
    range === "latest"
      ? allCheckins.slice(0, 1)
      : allCheckins.filter((c) => {
          const t = new Date(c.date).getTime();
          return t >= win.start && t <= win.end;
        });

  const attemptsInRange =
    range === "latest"
      ? allAttempts.slice(0, 3)
      : allAttempts.filter((a) => a.takenAt >= win.start && a.takenAt <= win.end);

  const moods = checkinsInRange.map((c) => c.mood);
  const avg =
    moods.length > 0 ? moods.reduce((s, m) => s + m, 0) / moods.length : 3;
  const moodLabel = bandLabel(avg);

  // Direction: compare first vs last half of the window.
  let directionLabel = "Steady";
  if (moods.length >= 4) {
    const half = Math.floor(moods.length / 2);
    const early = moods.slice(half).reduce((s, m) => s + m, 0) / (moods.length - half);
    const recent = moods.slice(0, half).reduce((s, m) => s + m, 0) / half;
    const diff = recent - early;
    if (diff > 0.4) directionLabel = "Improving";
    else if (diff < -0.4) directionLabel = "Heavier";
  }

  // Stress estimate: lower mood ≈ more stress, plus emotional-group attempts.
  const stressFromMood = avg <= 2.5 ? "Elevated" : avg <= 3.4 ? "Noticeable" : "Settled";
  const emotionalAttempts = attemptsInRange.filter((a) => {
    const meta = ASSESSMENTS.find((x) => x.id === a.assessmentId);
    return meta?.group === "emotional";
  });
  const stressLabel = emotionalAttempts.length > 0 ? "Noticeable" : stressFromMood;

  const themes = extractThemes(checkinsInRange, attemptsInRange);

  // Plain-language insight composed from the signals above.
  const insightParts: string[] = [];
  if (moods.length === 0 && attemptsInRange.length === 0) {
    insightParts.push("Not much has been logged in this window yet.");
  } else {
    if (directionLabel === "Improving") {
      insightParts.push(
        `Lately, things have felt ${moodLabel.toLowerCase()} — and there are gentle signs of improvement.`,
      );
    } else if (directionLabel === "Heavier") {
      insightParts.push(
        `Lately, things have felt ${moodLabel.toLowerCase()}, and the last stretch has been a little heavier.`,
      );
    } else {
      insightParts.push(
        `Things have felt fairly ${moodLabel.toLowerCase()}, holding steady through this window.`,
      );
    }
    if (themes[0]) {
      insightParts.push(
        `${themes[0].label.toLowerCase()} has come up the most in your reflections.`,
      );
    }
  }

  const support: SupportStats = {
    resourcesAccessed: inputs.resourcesAccessed ?? 0,
    checkinsCompleted: checkinsInRange.length,
    appointmentsBooked: inputs.appointmentsBooked ?? 0,
  };

  const dateSpan =
    range === "latest"
      ? checkinsInRange[0]
        ? fmtDate(new Date(checkinsInRange[0].date).getTime())
        : "No check-ins yet"
      : `${fmtDate(win.start)} – ${fmtDate(win.end)}`;

  return {
    range,
    rangeLabel: win.label,
    dateSpan,
    checkinsInRange,
    attemptsInRange,
    moodLabel,
    stressLabel,
    directionLabel,
    insight: insightParts.join(" "),
    themes,
    support,
    hasAnyData: checkinsInRange.length > 0 || attemptsInRange.length > 0,
  };
}

export const RANGE_OPTIONS: { id: RangeKey; label: string }[] = [
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 3 months" },
  { id: "12m", label: "Last 12 months" },
  { id: "all", label: "Full history" },
];

export const INCLUDE_OPTIONS: {
  key: string;
  label: string;
  description: string;
  /** Sensitive items stay unchecked until the person opts in. */
  defaultOff?: boolean;
}[] = [
  {
    key: "mood",
    label: "Mood patterns",
    description: "Your emotional trends and how often you've checked in",
  },
  {
    key: "assessments",
    label: "Assessment results",
    description: "Checks you completed from Self Discovery",
  },
  {
    key: "notes",
    label: "My written notes",
    description: "The actual words you wrote in your check-ins. Off unless you turn it on.",
    defaultOff: true,
  },
];

export const RECIPIENT_OPTIONS: {
  id: import("./shareStore").RecipientId;
  emoji: string;
  label: string;
  description: string;
  clinical: boolean;
}[] = [
  { id: "therapist", emoji: "🤝", label: "My therapist", description: "Clinical format", clinical: true },
  { id: "psychiatrist", emoji: "✨", label: "My psychiatrist", description: "Clinical format", clinical: true },
  { id: "counselor", emoji: "💬", label: "My counselor", description: "Clinical format", clinical: true },
  { id: "doctor", emoji: "🩺", label: "My doctor or GP", description: "Clinical format", clinical: true },
  { id: "other-mhp", emoji: "👤", label: "Other mental health professional", description: "Clinical format", clinical: true },
  {
    id: "trusted",
    emoji: "👥",
    label: "Someone I trust",
    description: "You'll receive a general summary, not a clinical format.",
    clinical: false,
  },
];

export function recipientLabel(id: import("./shareStore").RecipientId): string {
  return RECIPIENT_OPTIONS.find((r) => r.id === id)?.label ?? "Recipient";
}

export function mockSummary(): SummaryData {
  const base = buildSummary("30d", {
    checkins: [
      { id: "1", mood: 3, note: "Work stress and sleep have been tough.", date: new Date(Date.now() - 2 * 86400000).toISOString() },
      { id: "2", mood: 2, note: "Anxiety about money this week.", date: new Date(Date.now() - 5 * 86400000).toISOString() },
      { id: "3", mood: 4, note: "Better sleep last night, energy returning.", date: new Date(Date.now() - 6 * 86400000).toISOString() },
      { id: "4", mood: 3, note: "Work felt heavy again, focus is hard.", date: new Date(Date.now() - 10 * 86400000).toISOString() },
      { id: "5", mood: 2, note: "Family stress and money worries.", date: new Date(Date.now() - 14 * 86400000).toISOString() },
      { id: "6", mood: 3, note: "Walked outside, mood lifted a little.", date: new Date(Date.now() - 18 * 86400000).toISOString() },
      { id: "7", mood: 4, note: "Therapy session helped with anxiety.", date: new Date(Date.now() - 22 * 86400000).toISOString() },
      { id: "8", mood: 3, note: "Sleep was off, work stress lingering.", date: new Date(Date.now() - 26 * 86400000).toISOString() },
    ],
    resourcesAccessed: 4,
    appointmentsBooked: 2,
  });

  // Inject mock assessment attempts so the report has clinical content even
  // when the device has no local pattern history.
  const mockAttempts: Attempt[] = [
    {
      id: "mock-phq9",
      assessmentId: "phq-9",
      assessmentName: "Depression check (PHQ-9)",
      score: 11,
      summary: "Moderate range",
      takenAt: Date.now() - 4 * 86400000,
      answers: [],
    },
    {
      id: "mock-phq9-2",
      assessmentId: "phq-9",
      assessmentName: "Depression check (PHQ-9)",
      score: 14,
      summary: "Moderate range",
      takenAt: Date.now() - 14 * 86400000,
      answers: [],
    },
    {
      id: "mock-phq9-3",
      assessmentId: "phq-9",
      assessmentName: "Depression check (PHQ-9)",
      score: 17,
      summary: "Moderately severe",
      takenAt: Date.now() - 27 * 86400000,
      answers: [],
    },
    {
      id: "mock-gad7",
      assessmentId: "gad-7",
      assessmentName: "Anxiety check (GAD-7)",
      score: 9,
      summary: "Mild range",
      takenAt: Date.now() - 12 * 86400000,
      answers: [],
    },
    {
      id: "mock-gad7-2",
      assessmentId: "gad-7",
      assessmentName: "Anxiety check (GAD-7)",
      score: 12,
      summary: "Moderate range",
      takenAt: Date.now() - 25 * 86400000,
      answers: [],
    },
    {
      id: "mock-pss10",
      assessmentId: "pss-10",
      assessmentName: "Stress check (PSS-10)",
      score: 22,
      summary: "Elevated",
      takenAt: Date.now() - 20 * 86400000,
      answers: [],
    },
  ];

  return {
    ...base,
    attemptsInRange: mockAttempts,
    hasAnyData: true,
  };
}