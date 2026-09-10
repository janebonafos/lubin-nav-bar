export type PrescriptionDraft = {
  id: string;
  patientId?: string;
  patientName: string;
  step: number;
  purpose?: string;
  source?: string;
  snapshot?: Record<string, unknown>;
  savedAt: number;
  archivedAt?: number;
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

export function removePrescriptionDraft(id: string) {
  writeAll(readAll().filter((d) => d.id !== id));
}

export function listPrescriptionDrafts(): PrescriptionDraft[] {
  return readAll().sort((a, b) => b.savedAt - a.savedAt);
}

export function archivePrescriptionDraft(id: string) {
  writeAll(
    readAll().map((d) => (d.id === id ? { ...d, archivedAt: Date.now() } : d)),
  );
}

export function unarchivePrescriptionDraft(id: string) {
  writeAll(
    readAll().map((d) => {
      if (d.id !== id) return d;
      const { archivedAt: _archivedAt, ...rest } = d;
      return rest as PrescriptionDraft;
    }),
  );
}

/** Seeds one sample archived draft so the Archived tab shows how archived
 *  drafts look. Prototype only. */
export function ensureSampleArchivedDraft() {
  const existing = readAll();
  if (existing.some((d) => d.id === "rxdraft_sample_archived")) return;
  writeAll([
    ...existing,
    {
      id: "rxdraft_sample_archived",
      patientName: "Miguel Torres",
      step: 1,
      purpose: "new",
      savedAt: Date.now() - 9 * 24 * 60 * 60 * 1000,
      archivedAt: Date.now() - 6 * 24 * 60 * 60 * 1000,
      snapshot: {
        reason: "Follow-up: sleep difficulty and daytime fatigue",
      },
    },
  ]);
}

export function subscribePrescriptionDrafts(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, fn);
  return () => window.removeEventListener(CHANGE_EVENT, fn);
}
