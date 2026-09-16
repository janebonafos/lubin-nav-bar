/**
 * Records and results held in the Health Passport. Prototype only: demo records
 * are fictional and uploads are kept in localStorage (file contents are never
 * stored or sent anywhere).
 */
export type RecordType =
  | "lab"
  | "imaging"
  | "vaccination"
  | "referral"
  | "discharge"
  | "other";

export type PassportRecord = {
  id: string;
  type: RecordType;
  title: string;
  /** Document date as written on the record. */
  date: string;
  /** Clinic, laboratory or other source that produced the record. */
  source: string;
  summary?: string;
  /** Related visit from the visit timeline, when known. */
  visitId?: string;
  visitLabel?: string;
  /** "Uploaded by you" records come from outside Lubin. */
  origin: "lubin" | "uploaded";
  /** Who put the record in the passport, when it was not the patient. */
  addedBy?: string;
  addedByRole?: string;
  /** Explicit clinician review of this record, when one actually happened. */
  reviewedBy?: string;
  reviewedByRole?: string;
  reviewedAt?: string;
  /** Clinician-authored records cannot be edited by the patient. */
  authoredByClinician?: boolean;
  fileName?: string;
  fileSizeLabel?: string;
  /** Prototype only: data URL of the uploaded file, kept locally so it can be opened. */
  fileDataUrl?: string;
  fileMime?: string;
  addedAt?: number;
};

export const RECORD_TYPES: { id: RecordType; label: string; blurb: string }[] = [
  { id: "lab", label: "Laboratory results", blurb: "Blood tests, urine tests, panels" },
  { id: "imaging", label: "Imaging reports", blurb: "X-ray, ultrasound, CT, MRI" },
  { id: "vaccination", label: "Vaccinations", blurb: "Vaccine cards and certificates" },
  { id: "referral", label: "Referrals", blurb: "Letters to another clinician" },
  { id: "discharge", label: "Discharge summaries", blurb: "Hospital admission summaries" },
  { id: "other", label: "Other medical documents", blurb: "Fit-to-work notes, receipts, anything else" },
];

export function recordTypeLabel(type: RecordType): string {
  return RECORD_TYPES.find((t) => t.id === type)?.label ?? "Other medical documents";
}

export const DEMO_RECORDS: PassportRecord[] = [
  {
    id: "r-outside-rx-2026-09-16",
    type: "other",
    title: "Prescription from Sample Community Clinic",
    date: "2026-09-16",
    source: "Sample Community Clinic",
    summary: "Demo document linked to a visit you added yourself.",
    visitId: "ov-demo-2026-09-16",
    visitLabel: "General checkup \u00b7 Sep 16, 2026 \u00b7 Outside Lubin",
    origin: "uploaded",
    fileName: "Prescription.pdf",
    fileSizeLabel: "220 KB",
  },
  {
    id: "r-outside-lab-2026-09-16",
    type: "lab",
    title: "Laboratory results from Sample Community Clinic",
    date: "2026-09-16",
    source: "Sample Community Clinic",
    summary: "Demo document linked to a visit you added yourself.",
    visitId: "ov-demo-2026-09-16",
    visitLabel: "General checkup \u00b7 Sep 16, 2026 \u00b7 Outside Lubin",
    origin: "uploaded",
    fileName: "Laboratory-results.pdf",
    fileSizeLabel: "348 KB",
  },
  {
    id: "r-thyroid-2026-08-29",
    type: "lab",
    title: "Thyroid panel (TSH, free T4)",
    date: "2026-08-29",
    source: "Hi-Precision Diagnostics, Pasig",
    summary: "TSH 2.1 mIU/L · Free T4 normal. No thyroid cause found for fatigue.",
    visitId: "v-2026-08-29",
    visitLabel: "Medication review · Aug 29, 2026",
    origin: "lubin",
    addedBy: "Dr. Reyes Mendoza",
    addedByRole: "Psychiatrist",
    authoredByClinician: true,
    reviewedBy: "Dr. Reyes Mendoza",
    reviewedByRole: "Psychiatrist",
    reviewedAt: "2026-08-29",
  },
  {
    id: "r-cbc-2026-08-20",
    type: "lab",
    title: "Complete blood count",
    date: "2026-08-20",
    source: "Mercy Family Clinic laboratory",
    summary: "All values within normal range.",
    origin: "uploaded",
    addedBy: "Mercy Family Clinic",
    fileName: "cbc-aug-2026.pdf",
    fileSizeLabel: "412 KB",
  },
  {
    id: "r-chest-xray-2026-07-14",
    type: "imaging",
    title: "Chest X-ray (PA view)",
    date: "2026-07-14",
    source: "Mercy Family Clinic, Quezon City",
    summary: "Clear lung fields. No signs of pneumonia.",
    visitId: "v-2026-07-14",
    visitLabel: "Cough consultation · Jul 14, 2026",
    origin: "lubin",
  },
  {
    id: "r-flu-2026-06-05",
    type: "vaccination",
    title: "Influenza vaccine (quadrivalent)",
    date: "2026-06-05",
    source: "Quezon City Health Center",
    summary: "Single dose, left arm. Next dose due June 2027.",
    origin: "uploaded",
    fileName: "flu-vaccine-card.jpg",
    fileSizeLabel: "1.1 MB",
  },
  {
    id: "r-referral-2026-05-02",
    type: "referral",
    title: "Referral to psychiatry",
    date: "2026-05-02",
    source: "Dr. Alina Cruz · Mercy Family Clinic",
    summary: "Referred for assessment of low mood and sleep disturbance.",
    addedBy: "Dr. Alina Cruz",
    addedByRole: "Family doctor",
    authoredByClinician: true,
    visitId: "v-2026-05-06",
    visitLabel: "First therapy session · May 6, 2026",
    origin: "lubin",
  },
  {
    id: "r-discharge-2025-11-18",
    type: "discharge",
    title: "Discharge summary — 2-day admission",
    date: "2025-11-18",
    source: "St. Luke's Medical Center, Quezon City",
    summary: "Admitted for severe dehydration after gastroenteritis. Discharged well on oral fluids.",
    origin: "uploaded",
    fileName: "discharge-summary-nov-2025.pdf",
    fileSizeLabel: "780 KB",
  },
  {
    id: "r-fit-note-2026-07-16",
    type: "other",
    title: "Fit-to-work certificate",
    addedBy: "Dr. Alina Cruz",
    addedByRole: "Family doctor",
    authoredByClinician: true,
    date: "2026-07-16",
    source: "Mercy Family Clinic, Quezon City",
    visitId: "v-2026-07-14",
    visitLabel: "Cough consultation · Jul 14, 2026",
    origin: "lubin",
  },
];

const KEY = "lubin.passport.records.uploaded.v1";
const EVENT = "lubin:passport-records";

export function loadUploadedRecords(): PassportRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PassportRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveUploadedRecord(record: Omit<PassportRecord, "id" | "origin">): PassportRecord {
  const entry: PassportRecord = {
    ...record,
    id: `r-upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    origin: "uploaded",
    addedAt: Date.now(),
  };
  const next = [entry, ...loadUploadedRecords()];
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* prototype only */
  }
  window.dispatchEvent(new Event(EVENT));
  return entry;
}

export function removeUploadedRecord(id: string) {
  const next = loadUploadedRecords().filter((r) => r.id !== id);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* prototype only */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeRecords(fn: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener(EVENT, fn);
    window.removeEventListener("storage", fn);
  };
}

export function allRecords(): PassportRecord[] {
  return withLinks([...loadUploadedRecords(), ...DEMO_RECORDS]).sort((a, b) =>
    b.date.localeCompare(a.date),
  );
}

export function formatRecordDate(date?: string): string {
  if (!date) return "—";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function fileSizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Where a record came from, shown automatically in record details. Clinician
 * review is only ever mentioned when a review actually happened.
 */
export function recordSourceLabel(record: PassportRecord): string {
  if (record.origin === "uploaded") {
    return record.addedBy ? `Uploaded by ${record.addedBy}` : "Entered by you";
  }
  if (record.addedBy) {
    return `Added by ${record.addedBy}${record.addedByRole ? ` · ${record.addedByRole}` : ""}`;
  }
  return "Added by your care team";
}

/** Non-empty only when an explicit clinician review was recorded. */
export function recordReviewLabel(record: PassportRecord): string | null {
  if (!record.reviewedBy) return null;
  const when = record.reviewedAt ? formatRecordDate(record.reviewedAt) : null;
  return `Clinician-reviewed by ${record.reviewedBy}${when ? ` · ${when}` : ""}`;
}

/** Patients edit their own entries; clinician-authored records stay unchanged. */
export function canPatientEdit(record: PassportRecord): boolean {
  return record.origin === "uploaded" && !record.authoredByClinician;
}

/* ------------------------------------------------------------------ *
 * Linking existing records to a visit (prototype, local only).
 * A record is only ever linked — never copied — so it stays a single
 * document that appears both in Records and inside the visit.
 * ------------------------------------------------------------------ */

type VisitLink = { visitId: string; visitLabel: string };
const LINK_KEY = "lubin.passport.records.visitlinks.v1";

function loadLinks(): Record<string, VisitLink | null> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LINK_KEY);
    return raw ? (JSON.parse(raw) as Record<string, VisitLink | null>) : {};
  } catch {
    return {};
  }
}

function writeLinks(next: Record<string, VisitLink | null>) {
  try {
    window.localStorage.setItem(LINK_KEY, JSON.stringify(next));
  } catch {
    /* prototype only */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function linkRecordToVisit(recordId: string, visitId: string, visitLabel: string) {
  writeLinks({ ...loadLinks(), [recordId]: { visitId, visitLabel } });
}

export function unlinkRecordFromVisit(recordId: string) {
  writeLinks({ ...loadLinks(), [recordId]: null });
}

function withLinks(records: PassportRecord[]): PassportRecord[] {
  const links = loadLinks();
  return records.map((r) => {
    if (!(r.id in links)) return r;
    const link = links[r.id];
    if (!link) return { ...r, visitId: undefined, visitLabel: undefined };
    return { ...r, visitId: link.visitId, visitLabel: link.visitLabel };
  });
}

/** Every record in the passport, with patient-made visit links applied. */
export function recordsForVisit(visitId: string): PassportRecord[] {
  return allRecords().filter((r) => r.visitId === visitId);
}
