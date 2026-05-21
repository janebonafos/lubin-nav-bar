import type { Assessment, Attempt, TrendDirection } from "./types";

export const COOLDOWN_DAYS = 14;
const DAY_MS = 86_400_000;

export function daysUntilAvailable(latest: Attempt | null): number {
  if (!latest) return 0;
  const elapsed = Date.now() - latest.takenAt;
  const remaining = COOLDOWN_DAYS * DAY_MS - elapsed;
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / DAY_MS);
}

export function isLocked(latest: Attempt | null): boolean {
  return daysUntilAvailable(latest) > 0;
}

/**
 * Compare latest vs previous attempt for the same assessment, but only when
 * the two attempts are at least 14 days apart. Returns up/down/stable or null.
 * "Up" / "down" describe the *user-facing* direction: an improvement is
 * always shown as "up" regardless of whether higher or lower scoring is
 * clinically better.
 */
export function computeTrend(
  assessment: Assessment,
  attempts: Attempt[],
): TrendDirection {
  if (attempts.length < 2) return null;
  const sorted = [...attempts].sort((a, b) => b.takenAt - a.takenAt);
  const [latest, previous] = sorted;
  if (Math.abs(latest.takenAt - previous.takenAt) < COOLDOWN_DAYS * DAY_MS) {
    return null;
  }
  const diff = latest.score - previous.score;
  if (Math.abs(diff) < 1.5) return "stable";
  // If lower is better, a negative diff is improvement (up).
  const improving = assessment.lowerIsBetter ? diff < 0 : diff > 0;
  return improving ? "up" : "down";
}

export function formatDaysRemaining(days: number): string {
  if (days <= 0) return "Available now";
  if (days === 1) return "Available again in 1 day";
  return `Available again in ${days} days`;
}

/**
 * Generic warm summary helper. Individual assessments may override via their
 * own summarize() function. Bands are intentionally vague — we never show
 * clinical severity labels.
 */
export function warmBand(score: number, max: number, lowerIsBetter: boolean): string {
  const ratio = max > 0 ? score / max : 0;
  // Map ratio into 4 warm bands depending on direction.
  if (lowerIsBetter) {
    if (ratio < 0.2) return "Things feel pretty light right now.";
    if (ratio < 0.45) return "A little weight is showing, but nothing overwhelming.";
    if (ratio < 0.7) return "There's quite a lot sitting with you at the moment.";
    return "You're carrying a lot right now — that matters.";
  }
  if (ratio > 0.8) return "You're in a really good place right now.";
  if (ratio > 0.55) return "Things are feeling steady and supportive.";
  if (ratio > 0.3) return "There's some balance, but also some heaviness.";
  return "It sounds like this area needs some extra care right now.";
}

export type StatusTier = {
  label: string;
  /** Tailwind utility classes for pill background + text. */
  tone: string;
};

/**
 * Soft, non-clinical status tier derived from raw score, intended for tiny
 * status pills next to historical attempts.
 */
export function statusTier(
  score: number,
  max: number,
  lowerIsBetter: boolean,
): StatusTier {
  const ratio = max > 0 ? Math.max(0, Math.min(1, score / max)) : 0;
  // Normalize so higher "intensity" always means "heavier".
  const intensity = lowerIsBetter ? ratio : 1 - ratio;
  if (intensity < 0.25)
    return { label: "Light", tone: "bg-emerald-50 text-emerald-700 ring-emerald-200/70" };
  if (intensity < 0.5)
    return { label: "Mild", tone: "bg-amber-50 text-amber-700 ring-amber-200/70" };
  if (intensity < 0.75)
    return { label: "Notable", tone: "bg-orange-50 text-orange-700 ring-orange-200/70" };
  return { label: "Heavy", tone: "bg-rose-50 text-rose-700 ring-rose-200/70" };
}