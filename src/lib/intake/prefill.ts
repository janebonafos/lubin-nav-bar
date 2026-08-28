// Prefill session prep answers from what the Health Passport already knows,
// so the client only confirms or fills the gaps.
import { loadAttempts } from "@/lib/patterns/storage";
import { ASSESSMENTS } from "@/lib/patterns/assessments";
import { loadHealthDetails } from "./healthDetails";

export type PrefillValue = { value: string; source: string };

type StoredCheckIn = { id: string; mood: number; note: string; date: string };

const MOOD_WORDS: Record<number, string> = {
  1: "mostly low",
  2: "up and down, leaning low",
  3: "mostly okay",
  4: "mostly good",
  5: "mostly bright",
};

function readCheckins(): StoredCheckIn[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("lubinai_checkins");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as StoredCheckIn[]) : [];
  } catch {
    return [];
  }
}

const THEME_WORDS = [
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

/** Field id -> suggested answer, keyed off each template field's `prefill`. */
export function buildIntakePrefill(): Record<string, PrefillValue> {
  const out: Record<string, PrefillValue> = {};
  const checkins = readCheckins().slice(0, 14);
  const attempts = loadAttempts();

  if (checkins.length) {
    const avg = checkins.reduce((s, c) => s + (c.mood || 3), 0) / checkins.length;
    const word = MOOD_WORDS[Math.max(1, Math.min(5, Math.round(avg)))];
    const latestNote = checkins.find((c) => (c.note || "").trim())?.note?.trim();
    out["recent.summary"] = {
      value: `Across my last ${checkins.length} check-in${checkins.length === 1 ? "" : "s"} I've been ${word}.${
        latestNote ? ` Most recently: ${latestNote}` : ""
      }`,
      source: `${checkins.length} recent check-in${checkins.length === 1 ? "" : "s"}`,
    };

    const counts = new Map<string, number>();
    for (const c of checkins) {
      const text = (c.note || "").toLowerCase();
      for (const w of THEME_WORDS) if (text.includes(w)) counts.set(w, (counts.get(w) ?? 0) + 1);
    }
    const themes = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (themes.length) {
      out["recent.themes"] = {
        value: themes.map(([w]) => w).join(", "),
        source: "themes in your check-in notes",
      };
    }

    const sleepy = checkins.filter((c) => (c.note || "").toLowerCase().includes("sleep")).length;
    if (sleepy) {
      out["sleep.hours"] = { value: "Broken sleep", source: "your check-in notes mention sleep" };
    }
    if (avg <= 2.5) {
      out["sleep.energy"] = { value: "Mostly low", source: "your recent mood check-ins" };
    }
  }

  if (attempts.length) {
    const recent = attempts.slice(-3).reverse();
    const names = recent
      .map((a) => ASSESSMENTS.find((x) => x.id === a.assessmentId)?.name ?? a.assessmentId)
      .filter(Boolean);
    if (names.length) {
      out["__assessments"] = {
        value: names.join(", "),
        source: "completed in your Health Passport",
      };
    }
  }

  // Health details the client volunteered in their Health Passport take
  // precedence — they typed these themselves.
  const details = loadHealthDetails();
  for (const [fieldId, value] of Object.entries(details)) {
    if (!value?.trim()) continue;
    out[fieldId] = { value, source: "your Health Passport details" };
  }

  return out;
}
