export type PrescriptionDraft = {
  id: string;
  patientId?: string;
  patientName: string;
  step: number;
  purpose?: string;
  source?: string;
  snapshot?: Record<string, unknown>;
  savedAt: number;
};

const KEY = "lubin.prescriptionDrafts.v1";
const CHANGE_EVENT = "lubin-prescription-drafts-change";

function readAll(): PrescriptionDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PrescriptionDraft[]) : [];
  } catch {
    return [];
  }
}

function writeAll(drafts: PrescriptionDraft[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(drafts.slice(0, 100)));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* noop */
  }
}

export function savePrescriptionDraft(draft: Omit<PrescriptionDraft, "id" | "savedAt">) {
  const next: PrescriptionDraft = {
    ...draft,
    id: "rxdraft_" + Math.random().toString(36).slice(2, 10),
    savedAt: Date.now(),
  };
  writeAll([next, ...readAll()]);
  return next;
}

export function listPrescriptionDrafts(): PrescriptionDraft[] {
  return readAll().sort((a, b) => b.savedAt - a.savedAt);
}

export function subscribePrescriptionDrafts(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, fn);
  return () => window.removeEventListener(CHANGE_EVENT, fn);
}
