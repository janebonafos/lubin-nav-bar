// A signed prescription is its own clinical document. It is stored in the
// patient's medication / prescription record — never inside the session
// summary — and is immutable once signed.
import type { Prescription, PatientSafetyInfo, PrescriptionMedication, RxCountry } from "./store";
import type { PrescriberIdentity } from "./credentials";
import type { DeliveryMethod, DeliveryState } from "./status";

export type SignedPrescriptionDocument = {
  id: string;
  /** Human-readable prescription number shown on the document. */
  number: string;
  appointmentId: string;
  patientName: string;
  /** Optional patient photo URL; the avatar falls back to initials without it. */
  patientPhotoUrl?: string;
  patientAgeYears?: number;
  patientSex?: string;
  country: RxCountry;
  version: number;
  signedAt: number;
  signedBy: string;
  authenticationMethod: string;
  identity: PrescriberIdentity;
  medications: PrescriptionMedication[];
  controlled: boolean;
  /** Immutable snapshot of the patient record as it stood at signing, so the
   *  issued document always renders complete, independent of later drafts. */
  patientInfo?: PatientSafetyInfo;
  /** Signature metadata captured at signing. */
  signature?: Prescription["signature"];
  /** Content hash the signature is bound to. */
  signedHash?: string;
  /** Clinical notes / directions context carried with the issued document. */
  clinicalNotes?: string;
  /** Expiry derived from the jurisdiction validity rule at the moment of
   *  signing. Undefined when no rule is configured. Immutable once signed:
   *  only delivery and void metadata may be patched afterwards. */
  validUntil?: number;
  /** Label the jurisdiction uses for the expiry ("Valid until" / "Dispense by"). */
  validityLabel?: string;
  delivery?: { method: DeliveryMethod; state: DeliveryState; destination?: string; at?: number };
  /** Set when the prescriber voided the prescription. The signed document and
   *  its signature are preserved for the record — only marked void. */
  voided?: { at: number; reason: string; by?: string };
};

const KEY = "lubin.prescriptionDocuments.v1";
const CHANGE_EVENT = "lubin-prescription-documents-change";

function readAll(): SignedPrescriptionDocument[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SignedPrescriptionDocument[]) : [];
  } catch {
    return [];
  }
}

function writeAll(docs: SignedPrescriptionDocument[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(docs.slice(0, 300)));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* noop */
  }
}

export function prescriptionNumber(country: RxCountry, at: number): string {
  const d = new Date(at);
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const prefix = `LBN-${country}-${stamp}-`;
  // Sequential within the day so each issued prescription carries a unique,
  // immutable identifier (e.g. LBN-PH-20260810-0001).
  const used = readAll()
    .filter((doc) => doc.number.startsWith(prefix))
    .map((doc) => Number(doc.number.slice(prefix.length)))
    .filter((n) => Number.isFinite(n));
  const next = (used.length ? Math.max(...used) : 0) + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export function saveSignedPrescription(
  doc: Omit<SignedPrescriptionDocument, "id" | "number">,
): SignedPrescriptionDocument {
  const full: SignedPrescriptionDocument = {
    ...doc,
    id: "rxdoc_" + Math.random().toString(36).slice(2, 10),
    number: prescriptionNumber(doc.country, doc.signedAt),
  };
  writeAll([full, ...readAll()]);
  return full;
}

export function listSignedPrescriptions(filter?: {
  appointmentId?: string;
  patientName?: string;
}): SignedPrescriptionDocument[] {
  return readAll().filter(
    (d) =>
      (!filter?.appointmentId || d.appointmentId === filter.appointmentId) &&
      (!filter?.patientName || d.patientName === filter.patientName),
  );
}

export function latestSignedPrescription(
  appointmentId: string,
): SignedPrescriptionDocument | undefined {
  return listSignedPrescriptions({ appointmentId }).sort((a, b) => b.signedAt - a.signedAt)[0];
}

export function updateSignedPrescription(
  id: string,
  patch: Partial<Pick<SignedPrescriptionDocument, "delivery" | "voided">>,
) {
  writeAll(readAll().map((d) => (d.id === id ? { ...d, ...patch } : d)));
}

/** Voids a signed prescription without destroying it: the signature, the
 *  document and the audit trail are all preserved and it is marked void. */
export function voidSignedPrescription(
  id: string,
  args: { reason: string; by?: string; at?: number },
) {
  updateSignedPrescription(id, {
    voided: { at: args.at ?? Date.now(), reason: args.reason, by: args.by },
  });
}

/** Withdrawing a signature removes the issued document from the record. */
export function removeSignedPrescription(id: string) {
  writeAll(readAll().filter((d) => d.id !== id));
}

export function subscribePrescriptionDocuments(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, fn);
  return () => window.removeEventListener(CHANGE_EVENT, fn);
}

export function findSignedPrescription(id: string): SignedPrescriptionDocument | undefined {
  return readAll().find((d) => d.id === id);
}

/** Rebuilds a signed, immutable Prescription view from an issued document so
 *  the record can be rendered without depending on the local working draft. */
export function prescriptionFromSignedDocument(
  doc: SignedPrescriptionDocument,
): Prescription {
  return {
    appointmentId: doc.appointmentId,
    medications: doc.medications,
    suggestions: [],
    country: doc.country,
    clinicalNotes: doc.clinicalNotes,
    patientInfo: doc.patientInfo,
    delivery: doc.delivery
      ? {
          method: doc.delivery.method,
          state: doc.delivery.state,
          destination: doc.delivery.destination,
          at: doc.delivery.at,
        }
      : undefined,
    signature: doc.signature ?? {
      method: "credentialed-attestation",
      at: doc.signedAt,
      by: doc.signedBy,
      credentials: "",
      jurisdiction: doc.country,
      version: doc.version,
      methodLabel: doc.authenticationMethod,
    },
    signedHash: doc.signedHash,
    version: doc.version,
    documentId: doc.id,
    voided: doc.voided,
    finalisedAt: doc.signedAt,
    finalisedBy: doc.signedBy,
    legalAcknowledgedAt: doc.signedAt,
    recordAttestedAt: doc.signedAt,
    reviewedAt: doc.signedAt,
    updatedAt: doc.signedAt,
  } as Prescription;
}
