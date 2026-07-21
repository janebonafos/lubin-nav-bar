import type { Attempt } from "./types";
import { ASSESSMENTS } from "./assessments";
import { getAssessmentStatus, type AssessmentStatus } from "./scoring";

export type AttemptWithStatus = Attempt & {
  status: AssessmentStatus | null;
  clinicalName: string;
  friendlyName: string;
};

export type AssessmentGroup = {
  assessmentId: string;
  friendlyName: string;
  clinicalName: string;
  /** Sorted newest first. */
  attempts: AttemptWithStatus[];
  latest: AttemptWithStatus;
  previous: AttemptWithStatus | null;
  /** latest.score - previous.score (raw numeric change). */
  change: number | null;
  /** "increased" / "decreased" / "stable" — describes score movement, not clinical outcome. */
  direction: "increased" | "decreased" | "stable" | null;
  /** True when the *score movement* is a clinical improvement. */
  improving: boolean | null;
  lowerIsBetter: boolean;
  maxScore: number;
  /** PHQ-9 item 9 safety flag on the latest attempt only. Never treat as clinical. */
  safetyFlag: {
    itemIndex: number;
    itemText: string;
    response: string;
    responseValue: number;
    date: number;
  } | null;
};

export function groupAttemptsByAssessment(attempts: Attempt[]): AssessmentGroup[] {
  const by = new Map<string, Attempt[]>();
  for (const a of attempts) {
    if (!by.has(a.assessmentId)) by.set(a.assessmentId, []);
    by.get(a.assessmentId)!.push(a);
  }
  const groups: AssessmentGroup[] = [];
  for (const [id, list] of by) {
    const meta = ASSESSMENTS.find((x) => x.id === id);
    if (!meta) continue;
    const sorted = [...list].sort((a, b) => b.takenAt - a.takenAt);
    const withStatus: AttemptWithStatus[] = sorted.map((a) => ({
      ...a,
      status: getAssessmentStatus(meta.id, a.score, meta.maxScore, meta.lowerIsBetter),
      clinicalName: meta.clinicalName,
      friendlyName: meta.name,
    }));
    const latest = withStatus[0]!;
    const previous = withStatus[1] ?? null;
    const change = previous ? latest.score - previous.score : null;
    let direction: AssessmentGroup["direction"] = null;
    let improving: AssessmentGroup["improving"] = null;
    if (change !== null) {
      if (Math.abs(change) < 1) direction = "stable";
      else direction = change > 0 ? "increased" : "decreased";
      if (direction === "stable") improving = null;
      else improving = meta.lowerIsBetter ? direction === "decreased" : direction === "increased";
    }

    let safetyFlag: AssessmentGroup["safetyFlag"] = null;
    if (id === "phq-9") {
      const q9val = latest.answers?.[8];
      if (typeof q9val === "number" && q9val > 0) {
        const q = meta.questions[8];
        // Prefer the exact option the user selected if we have it.
        const selIdx = latest.selections?.[8];
        const opt =
          (typeof selIdx === "number" && q?.options[selIdx]) ||
          q?.options.find((o) => o.value === q9val) ||
          null;
        safetyFlag = {
          itemIndex: 8,
          itemText: q?.text ?? "",
          response: opt?.label ?? String(q9val),
          responseValue: q9val,
          date: latest.takenAt,
        };
      }
    }

    groups.push({
      assessmentId: id,
      friendlyName: meta.name,
      clinicalName: meta.clinicalName,
      attempts: withStatus,
      latest,
      previous,
      change,
      direction,
      improving,
      lowerIsBetter: meta.lowerIsBetter,
      maxScore: meta.maxScore,
      safetyFlag,
    });
  }
  return groups.sort((a, b) => b.latest.takenAt - a.latest.takenAt);
}

export function formatShortDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function trendChip(g: AssessmentGroup): {
  label: string;
  tone: "improving" | "worsening" | "stable" | "single";
} {
  if (g.direction === null || g.change === null) {
    return { label: "Single result", tone: "single" };
  }
  const abs = Math.abs(g.change);
  const prevDate = g.previous ? formatShortDate(g.previous.takenAt) : "";
  const pts = abs === 1 ? "point" : "points";
  if (g.direction === "stable") {
    return { label: `No change since ${prevDate}`, tone: "stable" };
  }
  const arrow = g.direction === "increased" ? "↑" : "↓";
  return { label: `${arrow} ${abs} ${pts} since ${prevDate}`, tone: "stable" };
}

/**
 * Look up the exact answer label for a scored item. Prefer the recorded
 * `selections` index (which handles reverse-keyed items correctly); fall
 * back to matching the stored `value` against the options list.
 */
export function labelForItem(
  attempt: Attempt,
  assessmentId: string,
  index: number,
): { text: string; response: string; value: number } | null {
  const meta = ASSESSMENTS.find((x) => x.id === assessmentId);
  if (!meta) return null;
  const q = meta.questions[index];
  if (!q) return null;
  const value = attempt.answers?.[index];
  if (typeof value !== "number") return null;
  const selIdx = attempt.selections?.[index];
  const opt =
    (typeof selIdx === "number" && q.options[selIdx]) ||
    q.options.find((o) => o.value === value) ||
    null;
  return {
    text: q.text,
    response: opt?.label ?? String(value),
    value,
  };
}