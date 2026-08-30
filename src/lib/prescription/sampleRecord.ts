// Populates the prescription record with one previously issued prescription so
// the Prescriptions tab shows a real, openable prescription file before the
// account has signed one. Runs once and never overwrites real records.
import { savePrescription, loadPrescription, genRxId, type Prescription } from "./store";
import { listSignedPrescriptions, saveSignedPrescription } from "./documents";
import { loadIdentity, saveIdentity } from "./credentials";

const APPOINTMENT_ID = "c7";
const PATIENT = "Anna Reyes";

export function ensureSamplePrescriptionRecord() {
  if (typeof window === "undefined") return;
  if (listSignedPrescriptions().length > 0) return;

  const signedAt = Date.now() - 2 * 24 * 60 * 60 * 1000;

  let identity = loadIdentity("Maria Santos");
  if (!identity.clinicName || !identity.prcNumber) {
    identity = saveIdentity({
      ...identity,
      fullName: identity.fullName || "Maria Santos",
      qualifications: identity.qualifications || "MD, FPPA",
      clinicName: identity.clinicName || "Lubin Psychiatry Clinic",
      clinicAddress:
        identity.clinicAddress || "12F One Corporate Centre, Ortigas, Pasig City",
      clinicContact: identity.clinicContact || "+63 2 8123 4567",
      prcNumber: identity.prcNumber || "0123456",
      ptrNumber: identity.ptrNumber || "PTR-2026-004512",
      licenseNumber: identity.licenseNumber || "0123456",
    });
  }

  const medication = {
    id: genRxId(),
    name: "Sertraline",
    genericName: "Sertraline hydrochloride",
    dose: "50 mg",
    route: "Oral",
    frequency: "Once daily in the morning",
    duration: "4 weeks, then review",
    strength: "50 mg film-coated tablet",
    quantity: "30 tablets (30-day supply)",
    refills: "No refills — review before continuing",
    indication: "Moderate depressive symptoms with anxiety",
    instructions:
      "Take one 50 mg tablet each morning with food. Do not stop suddenly. Report worsening mood, agitation or thoughts of self-harm immediately.",
    warnings:
      "Common: nausea, headache, sleep changes in the first two weeks. Serious: increased suicidal ideation early in treatment, serotonin syndrome.",
    origin: "manual" as const,
    controlled: false,
    approved: true,
    verifiedAt: signedAt,
    acknowledgedAt: signedAt,
  };

  const rx: Prescription = {
    ...loadPrescription(APPOINTMENT_ID),
    appointmentId: APPOINTMENT_ID,
    country: "PH",
    medications: [medication],
    suggestions: [],
    patientInfo: {
      allergyState: "none-known",
      allergyEntries: [],
      conditionState: "documented",
      conditionEntries: [
        {
          id: genRxId(),
          name: "Generalised anxiety",
          detail: "Ongoing, managed with therapy",
          status: "active",
          source: "provider",
          updatedAt: signedAt,
        },
      ],
      medicationState: "none-known",
      medicationEntries: [],
      pregnancyStatus: "not-applicable",
      bipolarHistory: "none-known",
      dob: "1991-04-12",
      ageYears: 35,
      sex: "female",
      address: "45 Kalayaan Avenue, Quezon City, Metro Manila",
      updatedAt: signedAt,
    },
    legalAcknowledgedAt: signedAt,
    recordAttestedAt: signedAt,
    reviewedAt: signedAt,
    finalisedAt: signedAt,
    finalisedBy: identity.fullName,
    version: 1,
    signature: {
      method: "credentialed-attestation",
      at: signedAt,
      by: identity.fullName,
      credentials: `PRC ${identity.prcNumber} · PTR ${identity.ptrNumber}`,
      jurisdiction: "PH",
      version: 1,
      methodLabel: "One-time code sent to the prescriber's registered email",
    },
    updatedAt: signedAt,
  };

  const doc = saveSignedPrescription({
    appointmentId: APPOINTMENT_ID,
    patientName: PATIENT,
    patientAgeYears: 35,
    patientSex: "female",
    country: "PH",
    version: 1,
    signedAt,
    signedBy: identity.fullName,
    authenticationMethod: "One-time code sent to the prescriber's registered email",
    identity,
    medications: [medication],
    controlled: false,
    patientInfo: rx.patientInfo,
    signature: rx.signature,
    validUntil: signedAt + 180 * 24 * 60 * 60 * 1000,
    validityLabel: "Valid until",
    delivery: {
      method: "patient",
      state: "given",
      destination: "Given to the patient",
      at: signedAt,
    },
  });

  savePrescription({ ...rx, documentId: doc.id });
}