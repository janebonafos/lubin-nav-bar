// Post-appointment provider workspace state. Demo storage in localStorage,
// keyed by appointmentId. Structured so a server-side implementation can
// replace the read/write helpers without touching call sites.

export type VisitNotes = {
  presenting?: string;
  observations?: string;
  plan?: string;
  private?: string;
};

export type IncludedAssessments = Record<string, boolean>; // attemptId -> include

export type MedicationEntry = {
  id: string;
  name: string;
  dose?: string;
  frequency?: string;
  instructions?: string;
  action?: "start" | "continue" | "adjust" | "stop";
};

export type PublishedSummary = {
  version: number;
  publishedAt: number;
  markdown: string;
};

export type VisitWorkspace = {
  appointmentId: string;
  notes: VisitNotes;
  includedAssessments: IncludedAssessments;
  aiDraft?: string; // markdown, patient-facing
  aiDraftGeneratedAt?: number;
  medications: MedicationEntry[];
  medicationsAcknowledgedAt?: number;
  published?: PublishedSummary;
  updatedAt: number;
};

const KEY_PREFIX = "lubin.visitWorkspace.v1:";
const CHANGE_EVENT = "lubin-visit-workspace-change";

function keyFor(id: string) {
  return KEY_PREFIX + id;
}

export function loadWorkspace(appointmentId: string): VisitWorkspace {
  if (typeof window === "undefined") return emptyWorkspace(appointmentId);
  try {
    const raw = window.localStorage.getItem(keyFor(appointmentId));
    if (!raw) return emptyWorkspace(appointmentId);
    const parsed = JSON.parse(raw) as VisitWorkspace;
    return {
      ...emptyWorkspace(appointmentId),
      ...parsed,
      notes: { ...parsed.notes },
      medications: parsed.medications ?? [],
      includedAssessments: parsed.includedAssessments ?? {},
    };
  } catch {
    return emptyWorkspace(appointmentId);
  }
}

export function saveWorkspace(ws: VisitWorkspace) {
  if (typeof window === "undefined") return;
  try {
    const next = { ...ws, updatedAt: Date.now() };
    window.localStorage.setItem(keyFor(ws.appointmentId), JSON.stringify(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* noop */
  }
}

export function updateWorkspace(
  appointmentId: string,
  patch: Partial<VisitWorkspace>,
): VisitWorkspace {
  const cur = loadWorkspace(appointmentId);
  const next: VisitWorkspace = {
    ...cur,
    ...patch,
    notes: { ...cur.notes, ...(patch.notes ?? {}) },
    medications: patch.medications ?? cur.medications,
    includedAssessments: patch.includedAssessments ?? cur.includedAssessments,
    updatedAt: Date.now(),
  };
  saveWorkspace(next);
  return next;
}

export function subscribeWorkspace(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, fn);
  return () => window.removeEventListener(CHANGE_EVENT, fn);
}

function emptyWorkspace(appointmentId: string): VisitWorkspace {
  return {
    appointmentId,
    notes: {},
    includedAssessments: {},
    medications: [],
    updatedAt: Date.now(),
  };
}

export function genMedId(): string {
  return "med_" + Math.random().toString(36).slice(2, 10);
}