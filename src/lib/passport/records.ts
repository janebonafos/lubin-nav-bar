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
  fileName?: string;
  fileSizeLabel?: string;
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
    id: "r-thyroid-2026-08-29",
    type: "lab",
    title: "Thyroid panel (TSH, free T4)",
    date: "2026-08-29",
    source: "Hi-Precision Diagnostics, Pasig",
    summary: "TSH 2.1 mIU/L · Free T4 normal. No thyroid cause found for fatigue.",
    visitId: "v-2026-08-29",
    visitLabel: "Medication review · Aug 29, 2026",
    origin: "lubin",
  },
  {
    id: "r-cbc-2026-08-20",
    type: "lab",
    title: "Complete blood count",
    date: "2026-08-20",
    source: "Mercy Family Clinic laboratory",
    summary: "All values within normal range.",
    origin: "uploaded",
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
  return [...loadUploadedRecords(), ...DEMO_RECORDS].sort((a, b) =>
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
