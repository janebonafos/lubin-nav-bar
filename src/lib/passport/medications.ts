/**
 * Single source of demo medication information shared by My Prescriptions and
 * the Health Passport. Prescribed entries are derived from the signed
 * prescription records the prototype already holds; patient-reported entries
 * and older history are fictional demo data.
 */
import { listSignedPrescriptions } from "@/lib/prescription/documents";

export type MedicationStatus = "current" | "completed" | "stopped";
export type MedicationSource = "prescribed" | "patient-reported";

export type MedicationEntry = {
  id: string;
  /** Medication name including strength, e.g. "Sertraline 50 mg tablet". */
  name: string;
  strength: string;
  dose: string;
  route: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  prescriber?: string;
  status: MedicationStatus;
  source: MedicationSource;
  /** Where the entry came from in plain language. */
  sourceDetail: string;
  lastReviewed: string;
  /** Set for vitamins, supplements and over-the-counter items. */
  supplement?: boolean;
  note?: string;
  /** Present when a prescription document can be opened for this entry. */
  prescriptionId?: string;
  prescriptionNumber?: string;
};

const DEMO_PRESCRIBED: MedicationEntry[] = [
  {
    id: "med-sertraline",
    name: "Sertraline",
    strength: "50 mg film-coated tablet",
    dose: "1 tablet (50 mg)",
    route: "Oral",
    frequency: "Once daily in the morning",
    startDate: "2026-08-29",
    prescriber: "Dr. Reyes Mendoza · Psychiatrist",
    status: "current",
    source: "prescribed",
    sourceDetail: "From prescription issued at the Aug 29, 2026 visit",
    lastReviewed: "2026-08-29",
    note: "Take with food. Do not stop suddenly.",
  },
  {
    id: "med-melatonin-rx",
    name: "Melatonin",
    strength: "2 mg prolonged-release tablet",
    dose: "1 tablet (2 mg)",
    route: "Oral",
    frequency: "Once nightly, one hour before bed",
    startDate: "2026-06-02",
    endDate: "2026-08-29",
    prescriber: "Dr. Reyes Mendoza · Psychiatrist",
    status: "completed",
    source: "prescribed",
    sourceDetail: "Short course completed as planned",
    lastReviewed: "2026-08-29",
  },
  {
    id: "med-fluoxetine",
    name: "Fluoxetine",
    strength: "20 mg capsule",
    dose: "1 capsule (20 mg)",
    route: "Oral",
    frequency: "Once daily in the morning",
    startDate: "2026-02-10",
    endDate: "2026-05-18",
    prescriber: "Dr. Alina Cruz · Family medicine",
    status: "stopped",
    source: "prescribed",
    sourceDetail: "Stopped after persistent nausea; switched treatment",
    lastReviewed: "2026-05-18",
    note: "Stopped by the prescriber, not by the patient.",
  },
];

const DEMO_REPORTED: MedicationEntry[] = [
  {
    id: "med-vitamin-d",
    name: "Vitamin D3",
    strength: "1,000 IU softgel",
    dose: "1 softgel",
    route: "Oral",
    frequency: "Once daily with breakfast",
    startDate: "2025-11-04",
    status: "current",
    source: "patient-reported",
    sourceDetail: "Patient reports taking · bought over the counter",
    lastReviewed: "2026-09-12",
    supplement: true,
  },
  {
    id: "med-paracetamol",
    name: "Paracetamol",
    strength: "500 mg tablet",
    dose: "1–2 tablets",
    route: "Oral",
    frequency: "As needed for headache, up to 4 times a day",
    startDate: "2026-01-15",
    status: "current",
    source: "patient-reported",
    sourceDetail: "Patient reports taking · over the counter",
    lastReviewed: "2026-09-12",
  },
  {
    id: "med-iron",
    name: "Ferrous sulfate",
    strength: "325 mg tablet",
    dose: "1 tablet",
    route: "Oral",
    frequency: "Once daily",
    startDate: "2025-08-01",
    endDate: "2026-01-20",
    status: "stopped",
    source: "patient-reported",
    sourceDetail: "Patient reports stopping · upset stomach",
    lastReviewed: "2026-07-14",
    supplement: true,
  },
];

function isoDate(at: number) {
  return new Date(at).toISOString().slice(0, 10);
}

/**
 * The shared medication list. Signed prescriptions in this prototype are folded
 * into the prescribed entries so both views always agree.
 */
export function medicationList(): MedicationEntry[] {
  const prescribed = [...DEMO_PRESCRIBED];

  for (const doc of listSignedPrescriptions()) {
    for (const medication of doc.medications) {
      const generic = medication.genericName || medication.name;
      const match = prescribed.find(
        (entry) => entry.name.toLowerCase() === (generic || "").split(" ")[0]?.toLowerCase(),
      );
      if (match) {
        match.prescriptionId = doc.id;
        match.prescriptionNumber = doc.number;
        match.prescriber = doc.identity?.fullName
          ? `${doc.identity.fullName}${doc.identity.qualifications ? ` · ${doc.identity.qualifications}` : ""}`
          : match.prescriber;
        match.status = doc.voided ? "stopped" : match.status;
        if (doc.voided) match.sourceDetail = "Prescription voided by the prescriber";
        continue;
      }
      prescribed.unshift({
        id: `${doc.id}-${medication.id}`,
        name: generic || "Medication",
        strength: medication.strength || medication.dose || "",
        dose: medication.dose || "",
        route: medication.route || "Oral",
        frequency: medication.frequency || "",
        startDate: isoDate(doc.signedAt),
        prescriber: doc.identity?.fullName,
        status: doc.voided ? "stopped" : "current",
        source: "prescribed",
        sourceDetail: doc.voided
          ? "Prescription voided by the prescriber"
          : `From prescription ${doc.number}`,
        lastReviewed: isoDate(doc.signedAt),
        prescriptionId: doc.id,
        prescriptionNumber: doc.number,
      });
    }
  }

  return [...prescribed, ...DEMO_REPORTED];
}

export function groupMedications(entries: MedicationEntry[] = medicationList()) {
  const rank = (entry: MedicationEntry) => (entry.source === "prescribed" ? 0 : 1);
  const current = entries
    .filter((entry) => entry.status === "current")
    .sort((a, b) => rank(a) - rank(b) || b.startDate.localeCompare(a.startDate));
  const past = entries
    .filter((entry) => entry.status !== "current")
    .sort((a, b) => (b.endDate ?? b.startDate).localeCompare(a.endDate ?? a.startDate));
  return { current, past };
}

export function formatMedDate(date?: string) {
  if (!date) return "—";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
