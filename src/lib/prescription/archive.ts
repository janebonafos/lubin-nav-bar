// Local-only archive flags for signed prescriptions. Archiving never alters or
// deletes the signed document — it only hides it from the active list so a long
// record stays readable.
const KEY = "lubin.prescriptionArchive.v1";
const CHANGE_EVENT = "lubin-prescription-archive-change";

function readIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeIds(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...new Set(ids)].slice(0, 500)));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* noop */
  }
}

export function listArchivedPrescriptionIds(): string[] {
  return readIds();
}

export function archivePrescription(id: string) {
  writeIds([id, ...readIds()]);
}

export function unarchivePrescription(id: string) {
  writeIds(readIds().filter((existing) => existing !== id));
}

export function subscribePrescriptionArchive(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, fn);
  return () => window.removeEventListener(CHANGE_EVENT, fn);
}
