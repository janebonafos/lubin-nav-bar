// AI Provider Brief cache. The brief is a compact, patient-consented
// summary intended for the provider to scan before the session. It is
// generated once per share snapshot and only regenerated when the patient
// explicitly re-shares updated information (tracked via `sharedAt`).

export type BriefBullet = {
  text: string;
  sourceLabel: string; // e.g. "PHQ-9 · Jul 18, 2026"
  sourceType: "assessment" | "checkin" | "conversation" | "patient" | "system";
};

export type ProviderBrief = {
  version: number;
  generatedAt: number;
  sharedAt: number; // the share-grant timestamp this brief was generated from
  sections: {
    seekingSupport: BriefBullet[];
    currentConcerns: BriefBullet[];
    recentPatterns: BriefBullet[];
    relevantAssessments: BriefBullet[];
    changesOverTime: BriefBullet[];
    medications: BriefBullet[];
    whatHelps: BriefBullet[];
    patientGoals: BriefBullet[];
  };
};

export const BRIEF_SECTION_ORDER: {
  key: keyof ProviderBrief["sections"];
  label: string;
}[] = [
  { key: "seekingSupport", label: "Why they’re seeking support" },
  { key: "currentConcerns", label: "Current concerns" },
  { key: "recentPatterns", label: "Recent patterns" },
  { key: "relevantAssessments", label: "Relevant assessments" },
  { key: "changesOverTime", label: "Changes over time" },
  { key: "medications", label: "Medication information" },
  { key: "whatHelps", label: "What appears to help" },
  { key: "patientGoals", label: "Patient’s goals or questions" },
];

const KEY_PREFIX = "lubin.providerBrief.v1:";
const CHANGE_EVENT = "lubin-provider-brief-change";

function keyFor(id: string) {
  return KEY_PREFIX + id;
}

export function loadBrief(appointmentId: string): ProviderBrief | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(keyFor(appointmentId));
    return raw ? (JSON.parse(raw) as ProviderBrief) : null;
  } catch {
    return null;
  }
}

export function saveBrief(appointmentId: string, brief: ProviderBrief) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(keyFor(appointmentId), JSON.stringify(brief));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* noop */
  }
}

export function subscribeBriefChanges(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, fn);
  return () => window.removeEventListener(CHANGE_EVENT, fn);
}

export function clearBrief(appointmentId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(keyFor(appointmentId));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* noop */
  }
}

/**
 * The brief is considered stale (needs regeneration) when the patient's
 * grant has been re-confirmed / updated after the brief was generated.
 */
export function isStale(brief: ProviderBrief | null, sharedAt: number) {
  if (!brief) return true;
  return brief.sharedAt < sharedAt;
}