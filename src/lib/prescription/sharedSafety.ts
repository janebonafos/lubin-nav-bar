// Shared assessment safety responses carried into the prescription review.
//
// WHERE THE DATA COMES FROM (end to end):
//   1. Client answers an assessment in Self Discovery. Each answer is stored as
//      a numeric option value plus the selected option index.
//   2. Client explicitly shares results with the provider for an appointment.
//      That creates an immutable snapshot (src/lib/share/providerShareStore).
//   3. This module scans the snapshot's attempts against SAFETY_ITEM_RULES and
//      returns any item-level answer that requires provider review.
//
// The response itself is the signal — never inferred from the total score.
// Nothing here is a diagnosis; it is clinical decision support only.
import { getAnyProviderGrant } from "@/lib/share/providerShareStore";
import { ASSESSMENTS } from "@/lib/patterns/assessments";
import { SAFETY_ITEM_RULES } from "./safetyItems";

export type SharedSafetyResponse = {
  assessmentName: string;
  clinicalName: string;
  itemText: string;
  /** The exact option the client selected. */
  response: string;
  takenAt: number;
  /** Why this answer requires review — from the safety item config. */
  reason: string;
};

/**
 * Every safety-related response in the shared snapshot, newest first.
 * One entry per rule (most recent matching attempt for that rule).
 */
export function sharedSafetyResponses(appointmentId: string): SharedSafetyResponse[] {
  const grant = getAnyProviderGrant(appointmentId);
  if (!grant || grant.revoked) return [];
  if (!grant.includedKeys?.includes("assessments")) return [];

  const found: SharedSafetyResponse[] = [];

  for (const rule of SAFETY_ITEM_RULES) {
    const meta = ASSESSMENTS.find((a) => a.id === rule.assessmentId);
    if (!meta) continue;
    const q = meta.questions[rule.itemIndex];
    if (!q) continue;

    const attempts = (grant.snapshot?.attemptsInRange ?? [])
      .filter((a) => a.assessmentId === rule.assessmentId)
      .sort((a, b) => b.takenAt - a.takenAt);

    for (const a of attempts) {
      const value = a.answers?.[rule.itemIndex];
      if (typeof value !== "number" || value < rule.minValue) continue;
      const selIdx = a.selections?.[rule.itemIndex];
      const opt =
        (typeof selIdx === "number" && q.options[selIdx]) ||
        q.options.find((o) => o.value === value) ||
        null;
      found.push({
        assessmentName: meta.name,
        clinicalName: meta.clinicalName,
        itemText: q.text ?? "",
        response: opt?.label ?? String(value),
        takenAt: a.takenAt,
        reason: rule.reason,
      });
      break; // most recent attempt for this rule only
    }
  }

  return found.sort((x, y) => y.takenAt - x.takenAt);
}

/** The most recent shared safety-related response, if any. */
export function sharedSafetyResponse(appointmentId: string): SharedSafetyResponse | null {
  return sharedSafetyResponses(appointmentId)[0] ?? null;
}
