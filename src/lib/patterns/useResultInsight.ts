import { useEffect, useState } from "react";

import type { Assessment } from "@/lib/patterns/types";
import type { AssessmentStatus } from "@/lib/patterns/scoring";

export type Insight = {
  meaning: string;
  gauge: string;
  steps: { title: string; detail: string }[];
  encouragement: string;
};

export function fallbackInsight(
  assessment: Assessment,
  status: AssessmentStatus,
): Insight {
  return {
    meaning: `${status.explanation} This is a snapshot of the last little while — not a label, and not something you have to fix on your own.`,
    gauge: assessment.lowerIsBetter
      ? "On this scale, the further left you sit the lighter things tend to feel."
      : "On this scale, the further right you sit the more supported things tend to feel.",
    steps: [
      {
        title: "Name one thing that's heaviest",
        detail: "Write a single sentence about what's taking the most from you lately.",
      },
      {
        title: "Protect one small routine",
        detail: "Pick one anchor — sleep, a walk, a meal, a message to a friend — and keep it this week.",
      },
      {
        title: "Check in again in a couple of weeks",
        detail: "Patterns tell you far more than any single result.",
      },
    ],
    encouragement:
      "You showed up and answered honestly — that's already the hard part. We'll keep looking at this with you.",
  };
}

/** Shared in-flight/result cache so multiple sections trigger one request. */
const cache = new Map<string, Promise<Insight>>();

async function load(
  assessment: Assessment,
  score: number,
  status: AssessmentStatus,
): Promise<Insight> {
  try {
    const res = await fetch("/api/result-insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: assessment.name,
        clinicalName: assessment.clinicalName,
        score,
        maxScore: assessment.maxScore,
        band: status.label,
        bandExplanation: status.explanation,
        lowerIsBetter: assessment.lowerIsBetter,
      }),
    });
    const data = (await res.json()) as Partial<Insight>;
    if (!res.ok || !data.meaning || !Array.isArray(data.steps)) {
      return fallbackInsight(assessment, status);
    }
    const fb = fallbackInsight(assessment, status);
    return {
      meaning: data.meaning,
      gauge: data.gauge ?? fb.gauge,
      steps: data.steps.slice(0, 3),
      encouragement: data.encouragement ?? fb.encouragement,
    };
  } catch {
    return fallbackInsight(assessment, status);
  }
}

export function useResultInsight(
  assessment: Assessment,
  score: number,
  status: AssessmentStatus,
) {
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const key = `${assessment.id}:${score}:${status.label}`;
    setLoading(true);
    let pending = cache.get(key);
    if (!pending) {
      pending = load(assessment, score, status);
      cache.set(key, pending);
    }
    pending.then((value) => {
      if (cancelled) return;
      setInsight(value);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [assessment, score, status]);

  return { insight, loading };
}
