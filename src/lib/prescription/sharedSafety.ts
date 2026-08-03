// Shared assessment safety response carried into the prescription review.
// The response itself is the signal — never inferred from the total score.
import { getAnyProviderGrant } from "@/lib/share/providerShareStore";
import { ASSESSMENTS } from "@/lib/patterns/assessments";

export type SharedSafetyResponse = {
  assessmentName: string;
  clinicalName: string;
  itemText: string;
  /** The exact option the client selected. */
  response: string;
  takenAt: number;
};

/** The most recent shared assessment attempt with a safety-related response. */
export function sharedSafetyResponse(appointmentId: string): SharedSafetyResponse | null {
  const grant = getAnyProviderGrant(appointmentId);
  if (!grant || grant.revoked) return null;
  if (!grant.includedKeys?.includes("assessments")) return null;
  const meta = ASSESSMENTS.find((a) => a.id === "phq-9");
  if (!meta) return null;
  const attempts = (grant.snapshot?.attemptsInRange ?? [])
    .filter((a) => a.assessmentId === "phq-9")
    .sort((a, b) => b.takenAt - a.takenAt);
  for (const a of attempts) {
    const value = a.answers?.[8];
    if (typeof value !== "number" || value <= 0) continue;
    const q = meta.questions[8];
    const selIdx = a.selections?.[8];
    const opt =
      (typeof selIdx === "number" && q?.options[selIdx]) ||
      q?.options.find((o) => o.value === value) ||
      null;
    return {
      assessmentName: meta.name,
      clinicalName: meta.clinicalName,
      itemText: q?.text ?? "",
      response: opt?.label ?? String(value),
      takenAt: a.takenAt,
    };
  }
  return null;
}
