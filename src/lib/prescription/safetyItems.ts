// ---------------------------------------------------------------------------
// SAFETY ITEM CONFIG — the single place a dev adds a new safety-critical item.
//
// A "safety item" is one specific question inside a clinical assessment whose
// answer requires provider review on its own, regardless of the total score.
// The scanner in ./sharedSafety.ts reads ONLY this config, so adding support
// for another assessment means adding a rule here — no UI or logic changes.
//
// How to add a rule:
//   1. Find the assessment in src/lib/patterns/assessments.ts and note its `id`.
//   2. Count the position of the question in that assessment's `questions`
//      array (0-based). PHQ-9 "item 9" is index 8.
//   3. Set `minValue` — the lowest selected option value that requires review.
//      PHQ-9 item 9 uses 1, meaning any answer other than "Not at all".
//   4. Write `reason` in plain language. It is shown to the provider verbatim.
// ---------------------------------------------------------------------------

export type SafetyItemRule = {
  /** Assessment id from src/lib/patterns/assessments.ts */
  assessmentId: string;
  /** 0-based index of the question in that assessment's `questions` array. */
  itemIndex: number;
  /** Flag when the client's selected option value is >= this number. */
  minValue: number;
  /** Plain-language explanation of why this answer requires review. */
  reason: string;
};

export const SAFETY_ITEM_RULES: SafetyItemRule[] = [
  {
    assessmentId: "phq-9",
    itemIndex: 8, // PHQ-9 item 9 — self-harm / passive suicidal ideation screen
    minValue: 1, // any answer other than "Not at all"
    reason:
      "Any answer other than “Not at all” on this item is a standard prompt for clinical review of self-harm risk.",
  },
  // Candidates a clinician can approve before enabling:
  //   { assessmentId: "mdq", itemIndex: ..., minValue: 1, reason: "..." }
  //   { assessmentId: "audit", itemIndex: ..., minValue: 3, reason: "..." }
  // Do NOT add a rule without a clinician confirming the item and threshold.
];

export function rulesForAssessment(assessmentId: string): SafetyItemRule[] {
  return SAFETY_ITEM_RULES.filter((r) => r.assessmentId === assessmentId);
}
