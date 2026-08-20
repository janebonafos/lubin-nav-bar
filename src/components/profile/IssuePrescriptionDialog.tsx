import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, X, ShieldCheck, AlertTriangle } from "lucide-react";

import { loadIdentity, type PrescriberIdentity } from "@/lib/prescription/credentials";
import { genRxId, type PatientSafetyInfo, type PrescriptionMedication, type RxCountry } from "@/lib/prescription/store";

type PatientSex = NonNullable<PatientSafetyInfo["sex"]>;

const SEX_OPTIONS: { value: PatientSex; label: string }[] = [
  { value: "not-documented", label: "Not documented" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "intersex", label: "Intersex" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
];
import {
  formatValidityDate,
  prescriberPrintGaps,
  prescriptionValidity,
} from "@/lib/prescription/legal";
import { saveSignedPrescription, type SignedPrescriptionDocument } from "@/lib/prescription/documents";

type MedForm = {
  id: string;
  genericName: string;
  brandName: string;
  strength: string;
  dose: string;
  frequency: string;
  duration: string;
  quantity: string;
  refills: string;
  instructions: string;
};

function emptyMed(): MedForm {
  return {
    id: genRxId(),
    genericName: "",
    brandName: "",
    strength: "",
    dose: "",
    frequency: "",
    duration: "",
    quantity: "",
    refills: "",
    instructions: "",
  };
}

function ageFromDob(dob: string): number | undefined {
  if (!dob) return undefined;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : undefined;
}

const field =
  "h-10 w-full rounded-xl border border-[#E3DBF5] bg-white px-3 text-[13px] text-[#3D2E6B] placeholder:text-[#A89BD0] focus:border-[#7E6BAF] focus:outline-none";
const label = "text-[11.5px] font-semibold uppercase tracking-wide text-[#8A7FB0]";

/**
 * Direct issuing flow: the prescriber writes a prescription outside a session,
 * signs it with their on-file credentials, and it lands in the prescription
 * record as an immutable signed document.
 */
export default function IssuePrescriptionDialog({
  open,
  onClose,
  onIssued,
}: {
  open: boolean;
  onClose: () => void;
  onIssued?: (doc: SignedPrescriptionDocument) => void;
}) {
  const [identity, setIdentity] = useState<PrescriberIdentity | null>(null);
  const [country, setCountry] = useState<RxCountry>("PH");
  const [patientName, setPatientName] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState<PatientSex>("not-documented");
  const [address, setAddress] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [meds, setMeds] = useState<MedForm[]>([emptyMed()]);
  const [authorised, setAuthorised] = useState(false);
  const [issuing, setIssuing] = useState(false);

  useEffect(() => {
    if (!open) return;
    setIdentity(loadIdentity());
  }, [open]);

  const ageYears = ageFromDob(dob);
  const validity = useMemo(
    () => prescriptionValidity({ country, controlled: false, issuedAt: Date.now() }),
    [country],
  );
  const identityGaps = useMemo(
    () => (identity ? prescriberPrintGaps(identity, country, false) : ["Prescriber name"]),
    [identity, country],
  );

  const readyMeds = meds.filter(
    (m) => m.genericName.trim() && m.dose.trim() && m.frequency.trim(),
  );
  const gaps: string[] = [];
  if (!patientName.trim()) gaps.push("Patient full name");
  if (!dob) gaps.push("Patient date of birth");
  if (country === "PH" && !address.trim()) gaps.push("Patient address");
  if (readyMeds.length === 0) gaps.push("At least one medication with dose and frequency");
  const canIssue =
    gaps.length === 0 && identityGaps.length === 0 && authorised && !issuing;

  if (!open) return null;

  const patch = (id: string, key: keyof MedForm, value: string) =>
    setMeds((cur) => cur.map((m) => (m.id === id ? { ...m, [key]: value } : m)));

  function issue() {
    if (!identity || !canIssue) return;
    setIssuing(true);
    const signedAt = Date.now();
    const medications: PrescriptionMedication[] = readyMeds.map((m) => ({
      id: m.id,
      name: m.brandName.trim() || m.genericName.trim(),
      genericName: m.genericName.trim(),
      strength: m.strength.trim() || undefined,
      dose: m.dose.trim(),
      route: "Oral",
      frequency: m.frequency.trim(),
      duration: m.duration.trim() || undefined,
      quantity: m.quantity.trim() || undefined,
      refills: m.refills.trim() || undefined,
      indication: diagnosis.trim() || undefined,
      instructions: m.instructions.trim(),
      origin: "manual",
      controlled: false,
      approved: true,
      verifiedAt: signedAt,
      acknowledgedAt: signedAt,
    }));

    const credentials =
      country === "PH"
        ? `PRC ${identity.prcNumber} · PTR ${identity.ptrNumber}`
        : `NPI ${identity.npiNumber} · Licence ${identity.licenseNumber} (${identity.licenseState})`;

    const doc = saveSignedPrescription({
      appointmentId: `direct_${signedAt}`,
      patientName: patientName.trim(),
      patientAgeYears: ageYears,
      patientSex: sex,
      country,
      version: 1,
      signedAt,
      signedBy: identity.fullName,
      authenticationMethod: "Signed by the prescriber with credentials on file",
      identity,
      medications,
      controlled: false,
      clinicalNotes: notes.trim() || undefined,
      patientInfo: {
        allergyState: "not-documented",
        allergyEntries: [],
        conditionState: diagnosis.trim() ? "documented" : "not-documented",
        conditionEntries: diagnosis.trim()
          ? [
              {
                id: genRxId(),
                name: diagnosis.trim(),
                status: "active",
                source: "provider",
                updatedAt: signedAt,
              },
            ]
          : [],
        medicationState: "not-documented",
        medicationEntries: [],
        pregnancyStatus: "not-applicable",
        bipolarHistory: "not-documented",
        dob,
        ageYears,
        sex,
        address: address.trim() || undefined,
        updatedAt: signedAt,
      },
      signature: {
        method: "credentialed-attestation",
        at: signedAt,
        by: identity.fullName,
        credentials,
        jurisdiction: country,
        version: 1,
        methodLabel: "Signed by the prescriber with credentials on file",
      },
      validUntil: validity.validUntil,
      validityLabel: validity.label,
      delivery: {
        method: "patient",
        state: "given",
        destination: "Given to the patient",
        at: signedAt,
      },
    });

    setIssuing(false);
    setPatientName("");
    setDob("");
    setSex("not-documented");
    setAddress("");
    setDiagnosis("");
    setNotes("");
    setMeds([emptyMed()]);
    setAuthorised(false);
    onIssued?.(doc);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#1B1330]/50 p-4 backdrop-blur-sm sm:p-8">
      <div className="w-full max-w-3xl rounded-2xl border border-[#E3DBF5] bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-[#EDEBF3] px-6 py-5">
          <div>
            <h2 className="text-[16px] font-bold text-[#3D2E6B]">New prescription</h2>
            <p className="mt-1 text-[12.5px] text-[#6F6889]">
              Write and sign a prescription directly. It is added to your
              prescription record and cannot be edited once signed.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-xl p-2 text-[#8A7FB0] transition hover:bg-[#F5F1FF]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-6 px-6 py-6">
          <div>
            <p className={label}>Jurisdiction</p>
            <div className="mt-2 inline-flex rounded-xl border border-[#E3DBF5] bg-[#FBF9FF] p-1">
              {(["PH", "US"] as RxCountry[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCountry(c)}
                  className={`h-9 rounded-lg px-4 text-[12.5px] font-semibold transition ${
                    country === c
                      ? "bg-[#3D2E6B] text-white"
                      : "text-[#6F6889] hover:text-[#3D2E6B]"
                  }`}
                >
                  {c === "PH" ? "Philippines" : "United States"}
                </button>
              ))}
            </div>
          </div>

          <section className="rounded-2xl border border-[#E3DBF5]/70 bg-[#FBF9FF]/70 p-5">
            <h3 className="text-[13.5px] font-bold text-[#3D2E6B]">Patient</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="rx-patient">Full name</label>
                <input
                  id="rx-patient"
                  className={`${field} mt-1.5`}
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. Anna Reyes"
                />
              </div>
              <div>
                <label className={label} htmlFor="rx-dob">Date of birth</label>
                <input
                  id="rx-dob"
                  type="date"
                  className={`${field} mt-1.5`}
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
                {ageYears !== undefined && (
                  <p className="mt-1 text-[11.5px] text-[#8A7FB0]">{ageYears} years old</p>
                )}
              </div>
              <div>
                <label className={label} htmlFor="rx-sex">Sex</label>
                <select
                  id="rx-sex"
                  className={`${field} mt-1.5`}
                  value={sex}
                  onChange={(e) => setSex(e.target.value as PatientSex)}
                >
                  {SEX_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label} htmlFor="rx-address">Address</label>
                <input
                  id="rx-address"
                  className={`${field} mt-1.5`}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, city"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={label} htmlFor="rx-dx">Diagnosis / indication</label>
                <input
                  id="rx-dx"
                  className={`${field} mt-1.5`}
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="e.g. Moderate depressive episode"
                />
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between">
              <h3 className="text-[13.5px] font-bold text-[#3D2E6B]">Medications</h3>
              <button
                type="button"
                onClick={() => setMeds((cur) => [...cur, emptyMed()])}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#D8C7F0] bg-white px-3 text-[12.5px] font-semibold text-[#3D2E6B] transition hover:bg-[#FBF9FF]"
              >
                <Plus className="h-3.5 w-3.5" /> Add medication
              </button>
            </div>
            <div className="mt-3 space-y-4">
              {meds.map((m, i) => (
                <div
                  key={m.id}
                  className="rounded-2xl border border-[#EDEBF3] bg-white p-5"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] font-bold uppercase tracking-wide text-[#8A7FB0]">
                      Medication {i + 1}
                    </p>
                    {meds.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Remove medication ${i + 1}`}
                        onClick={() => setMeds((cur) => cur.filter((x) => x.id !== m.id))}
                        className="rounded-lg p-1.5 text-[#A89BD0] transition hover:bg-[#FDF2F2] hover:text-[#B4483F]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className={label}>Generic name</label>
                      <input
                        className={`${field} mt-1.5`}
                        value={m.genericName}
                        onChange={(e) => patch(m.id, "genericName", e.target.value)}
                        placeholder="e.g. Sertraline hydrochloride"
                      />
                    </div>
                    <div>
                      <label className={label}>Brand (optional)</label>
                      <input
                        className={`${field} mt-1.5`}
                        value={m.brandName}
                        onChange={(e) => patch(m.id, "brandName", e.target.value)}
                        placeholder="e.g. Zoloft"
                      />
                    </div>
                    <div>
                      <label className={label}>Strength / form</label>
                      <input
                        className={`${field} mt-1.5`}
                        value={m.strength}
                        onChange={(e) => patch(m.id, "strength", e.target.value)}
                        placeholder="50 mg tablet"
                      />
                    </div>
                    <div>
                      <label className={label}>Dose</label>
                      <input
                        className={`${field} mt-1.5`}
                        value={m.dose}
                        onChange={(e) => patch(m.id, "dose", e.target.value)}
                        placeholder="50 mg"
                      />
                    </div>
                    <div>
                      <label className={label}>Frequency</label>
                      <input
                        className={`${field} mt-1.5`}
                        value={m.frequency}
                        onChange={(e) => patch(m.id, "frequency", e.target.value)}
                        placeholder="Once daily in the morning"
                      />
                    </div>
                    <div>
                      <label className={label}>Duration</label>
                      <input
                        className={`${field} mt-1.5`}
                        value={m.duration}
                        onChange={(e) => patch(m.id, "duration", e.target.value)}
                        placeholder="4 weeks, then review"
                      />
                    </div>
                    <div>
                      <label className={label}>Quantity to dispense</label>
                      <input
                        className={`${field} mt-1.5`}
                        value={m.quantity}
                        onChange={(e) => patch(m.id, "quantity", e.target.value)}
                        placeholder="30 tablets"
                      />
                    </div>
                    <div>
                      <label className={label}>Refills</label>
                      <input
                        className={`${field} mt-1.5`}
                        value={m.refills}
                        onChange={(e) => patch(m.id, "refills", e.target.value)}
                        placeholder="No refills"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={label}>Directions for the patient</label>
                      <textarea
                        rows={3}
                        className="mt-1.5 w-full rounded-xl border border-[#E3DBF5] bg-white px-3 py-2 text-[13px] text-[#3D2E6B] placeholder:text-[#A89BD0] focus:border-[#7E6BAF] focus:outline-none"
                        value={m.instructions}
                        onChange={(e) => patch(m.id, "instructions", e.target.value)}
                        placeholder="Take one tablet each morning with food. Do not stop suddenly."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11.5px] text-[#8A7FB0]">
              Controlled and dangerous-drug prescriptions are not issued here —
              they follow the restricted workflow inside the session.
            </p>
          </section>

          <section>
            <label className={label} htmlFor="rx-notes">Clinical notes (optional)</label>
            <textarea
              id="rx-notes"
              rows={3}
              className="mt-1.5 w-full rounded-xl border border-[#E3DBF5] bg-white px-3 py-2 text-[13px] text-[#3D2E6B] placeholder:text-[#A89BD0] focus:border-[#7E6BAF] focus:outline-none"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Context carried with the issued prescription."
            />
          </section>

          <section className="rounded-2xl border border-[#E3DBF5]/70 bg-[#FBF9FF]/70 p-5">
            <h3 className="text-[13.5px] font-bold text-[#3D2E6B]">Prescriber on this document</h3>
            <dl className="mt-3 grid gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-2">
              <div>
                <dt className={label}>Name</dt>
                <dd className="text-[#3D2E6B]">{identity?.fullName || "—"}</dd>
              </div>
              <div>
                <dt className={label}>Practice / clinic</dt>
                <dd className="text-[#3D2E6B]">{identity?.clinicName || "—"}</dd>
              </div>
              <div>
                <dt className={label}>{country === "PH" ? "PRC / PTR" : "NPI / Licence"}</dt>
                <dd className="text-[#3D2E6B]">
                  {country === "PH"
                    ? `${identity?.prcNumber || "—"} / ${identity?.ptrNumber || "—"}`
                    : `${identity?.npiNumber || "—"} / ${identity?.licenseNumber || "—"}`}
                </dd>
              </div>
              <div>
                <dt className={label}>{validity.label}</dt>
                <dd className="text-[#3D2E6B]">
                  {validity.validUntil ? formatValidityDate(validity.validUntil) : "Not configured"}
                </dd>
              </div>
            </dl>
            {identityGaps.length > 0 && (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-[#FDF6E7] px-3 py-2 text-[12px] font-semibold text-[#6B4E10]">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Complete your prescriber details before signing: {identityGaps.join(", ")}.
              </p>
            )}
          </section>

          <label className="flex items-start gap-3 rounded-2xl border border-[#E3DBF5] bg-white p-4">
            <input
              type="checkbox"
              checked={authorised}
              onChange={(e) => setAuthorised(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[#C9BCE9] text-[#3D2E6B]"
            />
            <span className="text-[12.5px] text-[#4B4468]">
              I confirm I assessed this patient, the medication and directions above
              are clinically appropriate, and I am signing this prescription under my
              own professional licence.
            </span>
          </label>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EDEBF3] px-6 py-5">
          <p className="text-[11.5px] text-[#8A7FB0]">
            {gaps.length > 0 ? `Still needed: ${gaps.join(" · ")}` : "Ready to sign."}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center rounded-xl border border-[#D8C7F0] bg-white px-4 text-[12.5px] font-semibold text-[#3D2E6B] transition hover:bg-[#FBF9FF]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={issue}
              disabled={!canIssue}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#3D2E6B] px-5 text-[12.5px] font-semibold text-white transition hover:bg-[#33265A] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <ShieldCheck className="h-4 w-4" /> Sign &amp; issue prescription
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
