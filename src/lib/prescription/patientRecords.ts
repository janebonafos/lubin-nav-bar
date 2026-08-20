// Provider-side patient records. A record is what the prescriber can legally
// rely on: the patient's identity, the clinical profile last documented, and
// any health passport information the patient shared. Records are created here
// when the patient is new to the prescriber, and read back on later visits.
import type { PatientSafetyInfo, PrescriptionMedication } from "./store";
import { listSignedPrescriptions } from "./documents";
import { getAnyProviderGrant } from "@/lib/share/providerShareStore";
import type { SummaryData } from "@/lib/share/summary";

export type PatientRecord = {
  id: string;
  fullName: string;
  info: PatientSafetyInfo;
  /** Appointments this patient is linked to, newest first. */
  appointmentIds: string[];
  createdAt: number;
  updatedAt: number;
};

export type PatientRecordView = PatientRecord & {
  /** Prescriptions previously issued to this patient. */
  pastMedications: PrescriptionMedication[];
  prescriptionCount: number;
  lastIssuedAt?: number;
  /** Health passport information the patient shared with the provider. */
  passport?: SummaryData;
};

const KEY = "lubin.patientRecords.v1";
const CHANGE_EVENT = "lubin-patient-records-change";

function readAll(): PatientRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PatientRecord[]) : [];
  } catch {
    return [];
  }
}

function writeAll(records: PatientRecord[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(records.slice(0, 500)));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* noop */
  }
}

export function subscribePatientRecords(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, fn);
  return () => window.removeEventListener(CHANGE_EVENT, fn);
}

export function createPatientRecord(input: {
  fullName: string;
  info: PatientSafetyInfo;
  appointmentId?: string;
}): PatientRecord {
  const now = Date.now();
  const record: PatientRecord = {
    id: "pat_" + Math.random().toString(36).slice(2, 10),
    fullName: input.fullName.trim(),
    info: input.info,
    appointmentIds: input.appointmentId ? [input.appointmentId] : [],
    createdAt: now,
    updatedAt: now,
  };
  writeAll([record, ...readAll()]);
  return record;
}

export function updatePatientRecord(
  id: string,
  patch: { info?: PatientSafetyInfo; appointmentId?: string },
): void {
  writeAll(
    readAll().map((r) =>
      r.id === id
        ? {
            ...r,
            info: patch.info ?? r.info,
            appointmentIds: patch.appointmentId
              ? [patch.appointmentId, ...r.appointmentIds.filter((a) => a !== patch.appointmentId)]
              : r.appointmentIds,
            updatedAt: Date.now(),
          }
        : r,
    ),
  );
}

/** Every patient the prescriber has a record for: explicitly created records
 *  plus patients reconstructed from prescriptions already issued to them. */
export function listPatientRecords(): PatientRecordView[] {
  const explicit = readAll();
  const docs = listSignedPrescriptions().sort((a, b) => b.signedAt - a.signedAt);
  const byName = new Map<string, PatientRecordView>();

  for (const r of explicit) {
    byName.set(r.fullName.toLowerCase(), {
      ...r,
      pastMedications: [],
      prescriptionCount: 0,
    });
  }

  for (const doc of docs) {
    const key = doc.patientName.trim().toLowerCase();
    if (!key) continue;
    const existing = byName.get(key);
    if (existing) {
      existing.pastMedications = [...existing.pastMedications, ...doc.medications];
      existing.prescriptionCount += 1;
      existing.lastIssuedAt = existing.lastIssuedAt ?? doc.signedAt;
      if (!existing.appointmentIds.includes(doc.appointmentId)) {
        existing.appointmentIds = [...existing.appointmentIds, doc.appointmentId];
      }
      if (!existing.info.dob && doc.patientInfo) existing.info = doc.patientInfo;
      continue;
    }
    byName.set(key, {
      id: "doc_" + doc.id,
      fullName: doc.patientName,
      info: doc.patientInfo ?? emptyInfo(),
      appointmentIds: [doc.appointmentId],
      createdAt: doc.signedAt,
      updatedAt: doc.signedAt,
      pastMedications: [...doc.medications],
      prescriptionCount: 1,
      lastIssuedAt: doc.signedAt,
    });
  }

  // Attach any health passport the patient shared for a linked appointment.
  for (const record of byName.values()) {
    for (const appointmentId of record.appointmentIds) {
      const grant = getAnyProviderGrant(appointmentId);
      if (grant && !grant.revoked) {
        record.passport = grant.snapshot;
        break;
      }
    }
  }

  return [...byName.values()].sort(
    (a, b) => (b.lastIssuedAt ?? b.updatedAt) - (a.lastIssuedAt ?? a.updatedAt),
  );
}

export function emptyInfo(): PatientSafetyInfo {
  return {
    allergyState: "not-documented",
    allergyEntries: [],
    conditionState: "not-documented",
    conditionEntries: [],
    medicationState: "not-documented",
    medicationEntries: [],
    pregnancyStatus: "not-applicable",
    bipolarHistory: "not-documented",
    updatedAt: Date.now(),
  };
}
