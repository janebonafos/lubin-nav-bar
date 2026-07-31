import type { Assessment, Attempt, TrendDirection } from "./types";

const DAY_MS = 86_400_000;

/**
 * Recommended wait period (in days) between attempts for each assessment.
 * This is guidance — never a hard lock. The user can always retake.
 */
export const RECOMMENDED_DAYS: Record<string, number> = {
  // Quick to change — weekly gives a useful pattern
  "phq-9": 7,
  "who-5": 7,
  "mdq": 7,
  // Measure the last 2 weeks — space them out
  "pss-10": 14,
  "gad-7": 14,
  "sleep-rest": 14,
  "asrs-6": 14,
  "pdss-sr": 14,
  "spin": 14,
  // Reflect longer patterns — monthly is enough
  "pcl-5": 30,
  "oci-r": 30,
  "scoff": 30,
  "audit": 30,
};

const DEFAULT_RECOMMENDED_DAYS = 14;

export function recommendedDaysFor(assessmentId: string): number {
  return RECOMMENDED_DAYS[assessmentId] ?? DEFAULT_RECOMMENDED_DAYS;
}

/**
 * Days remaining in the soft recommended-wait window. Zero when the window
 * has elapsed or no attempts exist. This is NEVER used to disable the CTA —
 * it only powers the soft guidance copy.
 */
export function cooldownDaysRemaining(
  assessmentId: string,
  latest: Attempt | null,
): number {
  if (!latest) return 0;
  const recommendedMs = recommendedDaysFor(assessmentId) * DAY_MS;
  const elapsed = Date.now() - latest.takenAt;
  const remaining = recommendedMs - elapsed;
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / DAY_MS);
}

/** True when the latest attempt is still inside the recommended wait window. */
export function isInCooldown(
  assessmentId: string,
  latest: Attempt | null,
): boolean {
  return cooldownDaysRemaining(assessmentId, latest) > 0;
}

/**
 * Compare latest vs previous attempt for the same assessment, but only when
 * the two attempts are at least the recommended wait apart. Returns
 * up/down/stable or null. Early retakes are saved but don't move the trend.
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
  const recommendedMs = recommendedDaysFor(assessment.id) * DAY_MS;
  if (Math.abs(latest.takenAt - previous.takenAt) < recommendedMs) {
    return null;
  }
  const diff = latest.score - previous.score;
  if (Math.abs(diff) < 1.5) return "stable";
  // If lower is better, a negative diff is improvement (up).
  const improving = assessment.lowerIsBetter ? diff < 0 : diff > 0;
  return improving ? "up" : "down";
}

/**
 * Soft, non-blocking guidance copy. Phrased as a suggestion — never a lock.
 */
export function formatRetakeHint(days: number): string {
  if (days <= 0) return "Ready to retake";
  if (days === 1) return "Best retaken in 1 day";
  return `Best retaken in ${days} days`;
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
    return { label: "Heavy", tone: "bg-[#F4ECFB] text-[#5A3E8F] ring-[#D9C8EF]" };
}

// ============================================================
// Per-assessment status mapping
//
// Each assessment uses its OWN score-to-status mapping. We deliberately
// avoid a single universal scale — different tools measure different
// things and their published cutoffs vary. Labels are grouped into three
// "kinds" so the pill tone stays consistent:
//   - concern     : Low / Mild / Moderate / High
//   - wellbeing   : Low / Moderate / Strong / Very strong wellbeing
//   - screening   : Not elevated / Some signs present / Elevated /
//                   Strongly elevated
//   - sleep       : Restful / Healthy range / Some sleep concerns /
//                   Significant sleep concerns
// ============================================================

export type StatusKind = "concern" | "wellbeing" | "screening" | "sleep";

export type AssessmentStatus = {
  label: string;
  /** Tailwind classes for a soft pill background + text + ring. */
  tone: string;
  /** One-sentence plain-language explanation of the band. */
  explanation: string;
  /** True when the score falls in a band we treat as urgent/at-risk. */
  isCrisis: boolean;
  kind: StatusKind;
};

const TONE = {
  calm: "bg-emerald-50 text-emerald-700 ring-emerald-200/70",
  gentle: "bg-sky-50 text-sky-700 ring-sky-200/70",
  amber: "bg-amber-50 text-amber-800 ring-amber-200/70",
  warm: "bg-orange-50 text-orange-700 ring-orange-200/70",
  heavy: "bg-[#F4ECFB] text-[#5A3E8F] ring-[#D9C8EF]",
} as const;

function band<T>(score: number, bands: Array<{ upTo: number; value: T }>): T {
  for (const b of bands) if (score <= b.upTo) return b.value;
  return bands[bands.length - 1]!.value;
}

type StatusMapEntry = Omit<AssessmentStatus, "isCrisis">;

/**
 * Returns the per-assessment status band + short explanation for a raw
 * score. Falls back to a generic mapping when an assessment id isn't
 * explicitly mapped.
 */
export function getAssessmentStatus(
  assessmentId: string,
  score: number,
  maxScore: number,
  lowerIsBetter: boolean,
  selfHarmFlag = false,
): AssessmentStatus {
  const s = statusForId(assessmentId, score, maxScore, lowerIsBetter);
  const isCrisis = computeIsCrisis(assessmentId, score, selfHarmFlag);
  return { ...s, isCrisis };
}

function statusForId(
  id: string,
  score: number,
  maxScore: number,
  lowerIsBetter: boolean,
): StatusMapEntry {
  switch (id) {
    case "phq-9":
      return band<StatusMapEntry>(score, [
        { upTo: 4, value: { kind: "concern", label: "Minimal", tone: TONE.calm, explanation: "Little sign of low mood in the last two weeks." } },
        { upTo: 9, value: { kind: "concern", label: "Mild", tone: TONE.gentle, explanation: "Some mild low-mood signs — worth a gentle check-in with yourself." } },
        { upTo: 14, value: { kind: "concern", label: "Moderate", tone: TONE.amber, explanation: "Moderate low-mood signs — talking to someone could help." } },
        { upTo: 19, value: { kind: "concern", label: "Moderately severe", tone: TONE.warm, explanation: "Moderately severe low-mood signs — reaching out for support is a kind next step." } },
        { upTo: 27, value: { kind: "concern", label: "Severe", tone: TONE.heavy, explanation: "Severe low-mood signs — please consider reaching out for support soon." } },
      ]);
    case "gad-7":
      return band<StatusMapEntry>(score, [
        { upTo: 4, value: { kind: "concern", label: "Minimal", tone: TONE.calm, explanation: "Little sign of worry or unease this week." } },
        { upTo: 9, value: { kind: "concern", label: "Mild", tone: TONE.gentle, explanation: "Some mild anxiety signs — steady, but worth noticing." } },
        { upTo: 14, value: { kind: "concern", label: "Moderate", tone: TONE.amber, explanation: "Moderate anxiety signs — practices or a chat with a pro can help." } },
        { upTo: 21, value: { kind: "concern", label: "Severe", tone: TONE.heavy, explanation: "Severe anxiety signs — please consider reaching out for support." } },
      ]);
    case "who-5":
      // WHO-5 scaled = raw * 4 (0–100). Higher = better.
      return band<StatusMapEntry>(score, [
        { upTo: 7, value: { kind: "wellbeing", label: "Low wellbeing", tone: TONE.heavy, explanation: "Wellbeing is feeling low — extra care and support could really help." } },
        { upTo: 12, value: { kind: "wellbeing", label: "Moderate wellbeing", tone: TONE.amber, explanation: "Wellbeing is a little muted — small daily rituals may lift it." } },
        { upTo: 18, value: { kind: "wellbeing", label: "Strong wellbeing", tone: TONE.gentle, explanation: "Wellbeing feels steady and mostly bright." } },
        { upTo: 25, value: { kind: "wellbeing", label: "Very strong wellbeing", tone: TONE.calm, explanation: "Wellbeing is in a really good place right now." } },
      ]);
    case "pss-10":
      return band<StatusMapEntry>(score, [
        { upTo: 13, value: { kind: "concern", label: "Low stress", tone: TONE.calm, explanation: "Stress load feels light this month." } },
        { upTo: 19, value: { kind: "concern", label: "Mild stress", tone: TONE.gentle, explanation: "Some stress showing up — manageable, but worth noticing." } },
        { upTo: 26, value: { kind: "concern", label: "Moderate stress", tone: TONE.amber, explanation: "A moderate amount of stress is sitting with you — rest and support matter." } },
        { upTo: 40, value: { kind: "concern", label: "High stress", tone: TONE.heavy, explanation: "Stress is high — please be gentle with yourself and consider help." } },
      ]);
    case "sleep-rest":
      // Higher = better, max 24
      return band<StatusMapEntry>(score, [
        { upTo: 6, value: { kind: "sleep", label: "Significant sleep concerns", tone: TONE.heavy, explanation: "Sleep and rest are struggling — this is worth talking through with a pro." } },
        { upTo: 12, value: { kind: "sleep", label: "Some sleep concerns", tone: TONE.amber, explanation: "Some rest is missing — small routine shifts can help a lot." } },
        { upTo: 18, value: { kind: "sleep", label: "Healthy range", tone: TONE.gentle, explanation: "Sleep is mostly doing its job — a little room to feel more rested." } },
        { upTo: 24, value: { kind: "sleep", label: "Restful", tone: TONE.calm, explanation: "Nights and downtime feel genuinely restorative." } },
      ]);
    case "pcl-5":
      return band<StatusMapEntry>(score, [
        { upTo: 32, value: { kind: "screening", label: "Not elevated", tone: TONE.calm, explanation: "Few signs of post-trauma stress right now." } },
        { upTo: 49, value: { kind: "screening", label: "Some signs present", tone: TONE.gentle, explanation: "Some signs are showing — go gently and consider support." } },
        { upTo: 64, value: { kind: "screening", label: "Elevated", tone: TONE.amber, explanation: "Signs are elevated — talking to a trauma-informed pro is a good next step." } },
        { upTo: 80, value: { kind: "screening", label: "Strongly elevated", tone: TONE.heavy, explanation: "Signs are strongly elevated — please consider professional support." } },
      ]);
    case "oci-r":
      return band<StatusMapEntry>(score, [
        { upTo: 20, value: { kind: "screening", label: "Not elevated", tone: TONE.calm, explanation: "Few signs of intrusive-thought patterns." } },
        { upTo: 35, value: { kind: "screening", label: "Some signs present", tone: TONE.gentle, explanation: "Some patterns are showing — worth keeping an eye on." } },
        { upTo: 49, value: { kind: "screening", label: "Elevated", tone: TONE.amber, explanation: "Patterns are elevated — a chat with a pro could help loosen them." } },
        { upTo: 72, value: { kind: "screening", label: "Strongly elevated", tone: TONE.heavy, explanation: "Patterns are strongly elevated — please consider professional support." } },
      ]);
    case "pdss-sr":
      return band<StatusMapEntry>(score, [
        { upTo: 7, value: { kind: "screening", label: "Not elevated", tone: TONE.calm, explanation: "Few signs of panic-related distress this week." } },
        { upTo: 14, value: { kind: "screening", label: "Some signs present", tone: TONE.gentle, explanation: "Some panic-related signs are showing — go gently." } },
        { upTo: 21, value: { kind: "screening", label: "Elevated", tone: TONE.amber, explanation: "Panic signs are elevated — a pro can share practices that really help." } },
        { upTo: 28, value: { kind: "screening", label: "Strongly elevated", tone: TONE.heavy, explanation: "Panic signs are strongly elevated — please consider support." } },
      ]);
    case "spin":
      return band<StatusMapEntry>(score, [
        { upTo: 20, value: { kind: "screening", label: "Not elevated", tone: TONE.calm, explanation: "Social situations feel largely comfortable." } },
        { upTo: 40, value: { kind: "screening", label: "Some signs present", tone: TONE.gentle, explanation: "Some social discomfort is showing — noticing it is a first step." } },
        { upTo: 50, value: { kind: "screening", label: "Elevated", tone: TONE.amber, explanation: "Social anxiety signs are elevated — support can make a real difference." } },
        { upTo: 68, value: { kind: "screening", label: "Strongly elevated", tone: TONE.heavy, explanation: "Social anxiety signs are strongly elevated — please consider a pro." } },
      ]);
    case "mdq":
      return band<StatusMapEntry>(score, [
        { upTo: 3, value: { kind: "screening", label: "Not elevated", tone: TONE.calm, explanation: "Energy and mood feel fairly steady." } },
        { upTo: 6, value: { kind: "screening", label: "Some signs present", tone: TONE.gentle, explanation: "Some bigger waves of energy or mood are showing." } },
        { upTo: 9, value: { kind: "screening", label: "Elevated", tone: TONE.amber, explanation: "Signs of larger swings — worth talking through with a pro." } },
        { upTo: 13, value: { kind: "screening", label: "Strongly elevated", tone: TONE.heavy, explanation: "Strong signs of energy and mood swings — please consider professional support." } },
      ]);
    case "asrs-6":
      return band<StatusMapEntry>(score, [
        { upTo: 8, value: { kind: "screening", label: "Not elevated", tone: TONE.calm, explanation: "Focus and follow-through feel largely on track." } },
        { upTo: 14, value: { kind: "screening", label: "Some signs present", tone: TONE.gentle, explanation: "Some attention patterns are showing — worth noticing." } },
        { upTo: 19, value: { kind: "screening", label: "Elevated", tone: TONE.amber, explanation: "Attention patterns are elevated — a pro can help make sense of them." } },
        { upTo: 24, value: { kind: "screening", label: "Strongly elevated", tone: TONE.heavy, explanation: "Attention patterns are strongly elevated — professional support is worth considering." } },
      ]);
    case "scoff":
      return band<StatusMapEntry>(score, [
        { upTo: 1, value: { kind: "screening", label: "Not elevated", tone: TONE.calm, explanation: "Relationship with food and body sounds fairly steady." } },
        { upTo: 2, value: { kind: "screening", label: "Some signs present", tone: TONE.gentle, explanation: "A couple of signs — worth a gentle check-in with someone you trust." } },
        { upTo: 4, value: { kind: "screening", label: "Elevated", tone: TONE.amber, explanation: "Signs are elevated — talking to a pro is a kind next step." } },
        { upTo: 5, value: { kind: "screening", label: "Strongly elevated", tone: TONE.heavy, explanation: "Strong signs — please reach out to a professional you trust." } },
      ]);
    case "audit":
      return band<StatusMapEntry>(score, [
        { upTo: 7, value: { kind: "concern", label: "Low", tone: TONE.calm, explanation: "Drinking pattern is in a low-risk range." } },
        { upTo: 15, value: { kind: "concern", label: "Mild", tone: TONE.gentle, explanation: "Some risk showing — worth being thoughtful about." } },
        { upTo: 19, value: { kind: "concern", label: "Moderate", tone: TONE.amber, explanation: "Moderate risk — cutting back or a chat with a pro is worth considering." } },
        { upTo: 40, value: { kind: "concern", label: "High", tone: TONE.heavy, explanation: "High risk — please consider talking to a professional." } },
      ]);
    default: {
      // Generic fallback — use warmBand + a simple 4-tier concern scale.
      const ratio = maxScore > 0 ? score / maxScore : 0;
      const intensity = lowerIsBetter ? ratio : 1 - ratio;
      if (intensity < 0.25)
        return { kind: "concern", label: "Low", tone: TONE.calm, explanation: "This area feels light right now." };
      if (intensity < 0.5)
        return { kind: "concern", label: "Mild", tone: TONE.gentle, explanation: "Some signs — mostly manageable." };
      if (intensity < 0.75)
        return { kind: "concern", label: "Moderate", tone: TONE.amber, explanation: "A moderate amount is sitting with you here." };
      return { kind: "concern", label: "High", tone: TONE.heavy, explanation: "This area is carrying a lot — support could help." };
    }
  }
}

function computeIsCrisis(id: string, score: number, selfHarmFlag: boolean): boolean {
  switch (id) {
    case "phq-9":
      return score >= 20 || selfHarmFlag;
    case "who-5":
      return score * 4 <= 28;
    case "mdq":
      return score >= 7;
    case "pss-10":
      return score >= 27;
    case "gad-7":
      return score >= 15;
    case "pcl-5":
      return score >= 33;
    case "oci-r":
      return score >= 21;
    case "pdss-sr":
      return score >= 15;
    case "spin":
      return score >= 41;
    case "sleep-rest":
      return score <= 6;
    case "asrs-6":
      return score >= 15;
    case "scoff":
      return score >= 2;
    case "audit":
      return score >= 16;
    default:
      return false;
  }
}
// ============================================================
// Score range disclosure ("How this score was calculated")
// ============================================================

export type ScoreRange = { from: number; to: number; label: string };

/**
 * Derives the interpretation ranges for an assessment from its own status
 * bands, so each tool shows its real scoring method rather than a shared
 * scale. Walks every possible raw score and groups consecutive scores that
 * resolve to the same band label.
 */
export function getScoreRanges(
  assessmentId: string,
  maxScore: number,
  lowerIsBetter: boolean,
): ScoreRange[] {
  if (!Number.isFinite(maxScore) || maxScore <= 0) return [];
  const out: ScoreRange[] = [];
  for (let s = 0; s <= maxScore; s++) {
    const label = statusForId(assessmentId, s, maxScore, lowerIsBetter).label;
    const last = out[out.length - 1];
    if (last && last.label === label) last.to = s;
    else out.push({ from: s, to: s, label });
  }
  return out;
}
