// SOAP note storage for prescriber documentation. Demo storage in
// localStorage, keyed by a caller-supplied record key (appointment id or
// patient record id) so a server implementation can swap these helpers.

export type SoapNote = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  updatedAt?: number;
  aiAssistedAt?: number;
};

const KEY_PREFIX = "lubin.soapNote.v1:";
const CHANGE_EVENT = "lubin-soap-note-change";

export function emptySoapNote(): SoapNote {
  return { subjective: "", objective: "", assessment: "", plan: "" };
}

export function loadSoapNote(recordKey: string): SoapNote {
  if (typeof window === "undefined") return emptySoapNote();
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + recordKey);
    if (!raw) return emptySoapNote();
    const parsed = JSON.parse(raw) as Partial<SoapNote>;
    return { ...emptySoapNote(), ...parsed };
  } catch {
    return emptySoapNote();
  }
}

export function saveSoapNote(recordKey: string, note: SoapNote): SoapNote {
  const next: SoapNote = { ...note, updatedAt: Date.now() };
  if (typeof window === "undefined") return next;
  try {
    window.localStorage.setItem(KEY_PREFIX + recordKey, JSON.stringify(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* noop */
  }
  return next;
}

export function subscribeSoapNotes(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, fn);
  return () => window.removeEventListener(CHANGE_EVENT, fn);
}

export function isSoapNoteEmpty(note: SoapNote): boolean {
  return !(
    note.subjective.trim() ||
    note.objective.trim() ||
    note.assessment.trim() ||
    note.plan.trim()
  );
}

export function soapNoteComplete(note: SoapNote): boolean {
  return Boolean(
    note.subjective.trim() &&
      note.objective.trim() &&
      note.assessment.trim() &&
      note.plan.trim(),
  );
}

/** Plain-text export, useful for copying into an external record. */
export function soapNoteToText(note: SoapNote): string {
  return [
    `S — Subjective\n${note.subjective.trim() || "—"}`,
    `O — Objective\n${note.objective.trim() || "—"}`,
    `A — Assessment\n${note.assessment.trim() || "—"}`,
    `P — Plan\n${note.plan.trim() || "—"}`,
  ].join("\n\n");
}
