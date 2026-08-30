import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  FileText,
  HelpCircle,
  Info,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";

import { loadIdentity, type PrescriberIdentity } from "@/lib/prescription/credentials";
import {
  genRxId,
  type PatientSafetyInfo,
  type PrescriptionMedication,
  type RxCountry,
} from "@/lib/prescription/store";
import {
  formatValidityDate,
  prescriberPrintGaps,
  prescriptionValidity,
} from "@/lib/prescription/legal";
import {
  saveSignedPrescription,
  type SignedPrescriptionDocument,
} from "@/lib/prescription/documents";
import {
  createPatientRecord,
  emptyInfo,
  listPatientRecords,
  updatePatientRecord,
  type PatientRecordView,
} from "@/lib/prescription/patientRecords";
import { detectJurisdiction } from "@/lib/prescription/jurisdiction";
import { ASSESSMENTS_BY_SLUG } from "@/lib/patterns/assessments";
import { getAssessmentStatus } from "@/lib/patterns/scoring";
import PatientAvatar from "@/components/profile/PatientAvatar";

type PatientSex = NonNullable<PatientSafetyInfo["sex"]>;

const SEX_OPTIONS: { value: PatientSex; label: string }[] = [
  { value: "not-documented", label: "Not documented" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "intersex", label: "Intersex" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
];

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
  followUp: string;
  instructions: string;
  warnings?: string;
  rationale?: string;
  availabilityNote?: string;
};

type AiMedication = {
  name: string;
  genericName?: string;
  dose: string;
  route?: string;
  frequency: string;
  duration?: string;
  indication?: string;
  instructions: string;
  warnings?: string;
  rationale?: string;
  availabilityNote?: string;
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
    followUp: "",
    instructions: "",
  };
}

function FieldHint({ text }: { text: string }) {
  return (
    <span className="group/hint relative ml-1 inline-flex align-middle">
      <Info
        className="h-3.5 w-3.5 cursor-help text-[#A89BD0]"
        tabIndex={0}
        aria-label={text}
      />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 hidden w-56 -translate-x-1/2 rounded-lg bg-[#2C2250] px-2.5 py-2 text-[11.5px] font-normal leading-snug text-white shadow-lg group-hover/hint:block group-focus-within/hint:block">
        {text}
      </span>
    </span>
  );
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
const area =
  "w-full rounded-xl border border-[#E3DBF5] bg-white px-3 py-2 text-[13px] text-[#3D2E6B] placeholder:text-[#A89BD0] focus:border-[#7E6BAF] focus:outline-none";
const label = "text-[11px] font-semibold uppercase tracking-wide text-[#8A7FB0]";
const cardCls = "rounded-2xl border border-[#E9E2F8] bg-white p-5";

/**
 * Direct issuing flow: pick or create the patient record, let AI assist with a
 * suggested regimen (from the shared health passport when there is a record, or
 * from the case the prescriber describes when there is not), then sign.
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
  // Jurisdiction is derived automatically from the prescriber's location —
  // the platform applies the correct PH/US rules without asking the provider.
  const [country, setCountry] = useState<RxCountry>("PH");

  const [records, setRecords] = useState<PatientRecordView[]>([]);
  const [patientQuery, setPatientQuery] = useState("");
  const [selected, setSelected] = useState<PatientRecordView | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);

  const [patientName, setPatientName] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState<PatientSex>("not-documented");
  const [address, setAddress] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [caseNotes, setCaseNotes] = useState("");
  const [notes, setNotes] = useState("");

  const [meds, setMeds] = useState<MedForm[]>([emptyMed()]);
  const [suggestions, setSuggestions] = useState<AiMedication[]>([]);
  const [missingInfo, setMissingInfo] = useState<string[]>([]);
  const [addedSuggestions, setAddedSuggestions] = useState<string[]>([]);
  const [aiNote, setAiNote] = useState("");
  const [aiError, setAiError] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [authorised, setAuthorised] = useState(false);

  useEffect(() => {
    if (!open) return;
    setIdentity(loadIdentity());
    setRecords(listPatientRecords());
    const found = detectJurisdiction();
    if (found.country) setCountry(found.country);
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

  const filteredRecords = useMemo(() => {
    const q = patientQuery.trim().toLowerCase();
    const list = q
      ? records.filter((r) => r.fullName.toLowerCase().includes(q))
      : records;
    return list.slice(0, 6);
  }, [records, patientQuery]);

  const passportItems = useMemo(() => {
    const attempts = selected?.passport?.attemptsInRange ?? [];
    return attempts.slice(0, 8).map((a) => {
      const meta = Object.values(ASSESSMENTS_BY_SLUG).find((x) => x.id === a.assessmentId);
      const maxScore = meta?.maxScore ?? 0;
      const status =
        maxScore > 0
          ? getAssessmentStatus(a.assessmentId, a.score, maxScore, !!meta?.lowerIsBetter)
          : null;
      return {
        id: a.id,
        name: meta?.name ?? a.assessmentName,
        clinicalName: meta?.clinicalName,
        score: a.score,
        maxScore,
        statusLabel: status?.label,
      };
    });
  }, [selected]);

  const readyMeds = meds.filter(
    (m) => m.genericName.trim() && m.dose.trim() && m.frequency.trim(),
  );

  const patientGaps: string[] = [];
  if (!patientName.trim()) patientGaps.push("Patient full name");
  if (!dob) patientGaps.push("Date of birth");
  if (country === "PH" && sex === "not-documented") patientGaps.push("Sex");
  if (!address.trim()) patientGaps.push("Patient address");

  const gaps = [...patientGaps];
  if (readyMeds.length === 0)
    gaps.push("One medication with generic name, dose and frequency");

  const canIssue = gaps.length === 0 && identityGaps.length === 0 && authorised;

  function selectRecord(record: PatientRecordView) {
    setSelected(record);
    setCreatingNew(false);
    setPatientName(record.fullName);
    setDob(record.info.dob ?? "");
    setSex((record.info.sex as PatientSex) ?? "not-documented");
    setAddress(record.info.address ?? "");
    setSuggestions([]);
    setMissingInfo([]);
    setAddedSuggestions([]);
    setAiNote("");
  }

  function startNewPatient() {
    setSelected(null);
    setCreatingNew(true);
    setPatientName(patientQuery.trim());
    setDob("");
    setSex("not-documented");
    setAddress("");
    setSuggestions([]);
    setMissingInfo([]);
    setAddedSuggestions([]);
    setAiNote("");
  }

  function resetAll() {
    setSelected(null);
    setCreatingNew(false);
    setPatientQuery("");
    setPatientName("");
    setDob("");
    setSex("not-documented");
    setAddress("");
    setDiagnosis("");
    setCaseNotes("");
    setNotes("");
    setMeds([emptyMed()]);
    setSuggestions([]);
    setMissingInfo([]);
    setAddedSuggestions([]);
    setAiNote("");
    setAiError("");
    setAuthorised(false);
  }

  async function generateSuggestions() {
    setAiLoading(true);
    setAiError("");
    setAiNote("");
    try {
      const res = await fetch("/api/generate-prescription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country,
          patientContext: {
            firstName: patientName.split(" ")[0] || undefined,
            age: ageYears,
            sex: sex === "not-documented" ? undefined : sex,
          },
          presenting: diagnosis || caseNotes,
          observations: caseNotes,
          plan: notes,
          includedAssessments: passportItems.map((p) => ({
            name: p.name,
            clinicalName: p.clinicalName,
            score: p.score,
            statusLabel: p.statusLabel,
          })),
          currentMedications: (selected?.pastMedications ?? []).slice(0, 5).map((m) => ({
            name: m.genericName || m.name,
            dose: m.dose,
            frequency: m.frequency,
          })),
          allergies:
            selected?.info.allergyEntries?.map((a) => a.name).join(", ") || undefined,
        }),
      });
      const data = (await res.json()) as {
        medications?: AiMedication[];
        missingInfo?: string[];
        clinicalNotes?: string;
        error?: string;
      };
      if (!res.ok) {
        setAiError(data.error || "Could not prepare suggestions right now.");
        return;
      }
      setSuggestions(data.medications ?? []);
      setMissingInfo(data.missingInfo ?? []);
      setAddedSuggestions([]);
      setAiNote(data.clinicalNotes ?? "");
    } catch {
      setAiError("Could not reach the suggestion service.");
    } finally {
      setAiLoading(false);
    }
  }

  function suggestionKey(s: AiMedication, i: number) {
    return `${s.genericName || s.name}-${i}`;
  }

  function addSuggestion(s: AiMedication, key?: string) {
    const next: MedForm = {
      id: genRxId(),
      genericName: s.genericName || s.name,
      brandName: s.genericName && s.name !== s.genericName ? s.name : "",
      strength: "",
      dose: s.dose,
      frequency: s.frequency,
      duration: s.duration ?? "",
      quantity: "",
      refills: "",
      followUp: "",
      instructions: s.instructions,
      warnings: s.warnings,
      rationale: s.rationale,
      availabilityNote: s.availabilityNote,
    };
    setMeds((cur) => {
      const blankOnly =
        cur.length === 1 && !cur[0]!.genericName.trim() && !cur[0]!.dose.trim();
      return blankOnly ? [next] : [...cur, next];
    });
    if (!diagnosis.trim() && s.indication) setDiagnosis(s.indication);
    if (key) setAddedSuggestions((cur) => (cur.includes(key) ? cur : [...cur, key]));
  }

  function addAllSuggestions() {
    suggestions.forEach((s, i) => {
      const key = suggestionKey(s, i);
      if (!addedSuggestions.includes(key)) addSuggestion(s, key);
    });
  }


  function issue() {
    if (!identity || !canIssue) return;
    const signedAt = Date.now();
    const appointmentId = `direct_${signedAt}`;
    const info: PatientSafetyInfo = {
      ...(selected?.info ?? emptyInfo()),
      conditionState: diagnosis.trim() ? "documented" : (selected?.info.conditionState ?? "not-documented"),
      conditionEntries: diagnosis.trim()
        ? [
            {
              id: genRxId(),
              name: diagnosis.trim(),
              status: "active",
              source: "provider",
              updatedAt: signedAt,
            },
            ...(selected?.info.conditionEntries ?? []),
          ]
        : (selected?.info.conditionEntries ?? []),
      dob,
      ageYears,
      sex,
      address: address.trim(),
      updatedAt: signedAt,
    };

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
      followUp: m.followUp.trim() || undefined,
      indication: diagnosis.trim() || undefined,
      instructions: m.instructions.trim(),
      warnings: m.warnings,
      origin: "manual",
      controlled: false,
      approved: true,
      verifiedAt: signedAt,
      acknowledgedAt: signedAt,
    }));

    const credentials =
      country === "PH"
        ? `PRC ${identity.prcNumber} · PTR ${identity.ptrNumber}`
        : `NPI ${identity.npiNumber} · Licence ${identity.licenseNumber}${identity.licenseState ? ` (${identity.licenseState})` : ""}`;

    if (selected && !selected.id.startsWith("doc_")) {
      updatePatientRecord(selected.id, { info, appointmentId });
    } else if (!selected) {
      createPatientRecord({ fullName: patientName.trim(), info, appointmentId });
    }

    const doc = saveSignedPrescription({
      appointmentId,
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
      clinicalNotes: notes.trim() || caseNotes.trim() || undefined,
      patientInfo: info,
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

    resetAll();
    onIssued?.(doc);
    onClose();
  }

  if (!open) return null;

  const patch = (id: string, key: keyof MedForm, value: string) =>
    setMeds((cur) => cur.map((m) => (m.id === id ? { ...m, [key]: value } : m)));

  const hasPatient = !!patientName.trim() || creatingNew || !!selected;

  // Portal to <body>: profile cards use backdrop-blur, which would otherwise
  // trap this fixed overlay inside the card instead of covering the viewport.
  const drawer = (
    <div className="fixed inset-0 z-[70] flex justify-end bg-[#1B1330]/50 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-xl flex-col overflow-hidden border-l border-[#E3DBF5] bg-[#FBF9FF] shadow-2xl">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#EDEBF3] bg-white px-6 py-5">
          <div>
            <h2 className="text-[16px] font-bold text-[#3D2E6B]">New prescription</h2>
            <p className="mt-1 text-[12.5px] text-[#6F6889]">
              Pick or create the patient record, review the suggested regimen, then sign.
              A signed prescription cannot be edited.
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

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-6">
          {/* Jurisdiction is applied automatically from the prescriber's
              detected location — no UI needed here. */}

          {/* Patient */}
          <section className={cardCls}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[13.5px] font-bold text-[#3D2E6B]">1 · Patient</h3>
              {selected && (
                <button
                  type="button"
                  onClick={() => {
                    setSelected(null);
                    setPatientQuery("");
                  }}
                  className="text-[12px] font-semibold text-[#7E6BAF] transition hover:text-[#3D2E6B]"
                >
                  Change patient
                </button>
              )}
            </div>

            {!selected && !creatingNew && (
              <>
                <div className="relative mt-3">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A89BD0]" />
                  <input
                    value={patientQuery}
                    onChange={(e) => setPatientQuery(e.target.value)}
                    placeholder="Search your patient records by name"
                    className={`${field} pl-9`}
                  />
                </div>
                <div className="mt-3 space-y-2">
                  {filteredRecords.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => selectRecord(r)}
                      className="flex w-full items-center gap-3 rounded-xl border border-[#EDEBF3] bg-[#FBFAFE] px-4 py-3 text-left transition hover:border-[#C9BCE9]"
                    >
                      <PatientAvatar name={r.fullName} size={34} />
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-semibold text-[#3D2E6B]">
                          {r.fullName}
                        </span>
                        <span className="block text-[11.5px] text-[#8A7FB0]">
                          {r.prescriptionCount} prescription
                          {r.prescriptionCount === 1 ? "" : "s"}
                          {r.passport ? " · health passport shared" : " · no shared passport"}
                        </span>
                      </span>
                    </button>
                  ))}
                  {patientQuery.trim() && filteredRecords.length === 0 && (
                    <p className="px-1 text-[12.5px] text-[#6F6889]">
                      No patient named “{patientQuery.trim()}” in your records yet.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={startNewPatient}
                    className="flex w-full items-center gap-3 rounded-xl border border-dashed border-[#C9BCE9] bg-[#F7F3FF] px-4 py-3 text-left transition hover:border-[#7E6BAF] hover:bg-[#F1EBFF]"
                  >
                    <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-[#3D2E6B] text-white">
                      <UserPlus className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-[#3D2E6B]">
                        {patientQuery.trim()
                          ? `Create “${patientQuery.trim()}” as a new patient`
                          : "New patient — create a record"}
                      </span>
                      <span className="block text-[11.5px] text-[#8A7FB0]">
                        For a first-time client who isn’t in your records yet
                      </span>
                    </span>
                  </button>
                </div>
              </>
            )}

            {creatingNew && !selected && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#C9BCE9] bg-[#F7F3FF] px-4 py-3">
                <p className="flex items-center gap-2 text-[12.5px] font-semibold text-[#3D2E6B]">
                  <UserPlus className="h-4 w-4" /> New patient record — fill in the details below
                </p>
                <button
                  type="button"
                  onClick={() => setCreatingNew(false)}
                  aria-label="Close new patient form"
                  className="shrink-0 rounded-lg p-2 text-[#7E6BAF] transition hover:bg-[#EDE8FA] hover:text-[#3D2E6B]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {hasPatient && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
                </div>
                <div>
                  <label className={label} htmlFor="rx-age">Age</label>
                  <div
                    id="rx-age"
                    className={`${field} mt-1.5 flex items-center ${ageYears === undefined ? "text-[#A89BD0]" : "text-[#3D2E6B]"}`}
                  >
                    {ageYears !== undefined ? `${ageYears} years old` : "—"}
                  </div>
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
                <div className="sm:col-span-2">
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
            )}

            {selected && (
              <div className="mt-4 rounded-xl border border-[#E3DBF5] bg-[#F7F3FF] p-4">
                <p className="flex items-center gap-2 text-[12.5px] font-semibold text-[#3D2E6B]">
                  <FileText className="h-4 w-4" /> Record pulled for {selected.fullName}
                </p>
                {passportItems.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {passportItems.map((p) => (
                      <li key={p.id} className="text-[12px] text-[#4B4468]">
                        {p.name}
                        {p.clinicalName ? ` (${p.clinicalName})` : ""} — {p.score}
                        {p.maxScore ? `/${p.maxScore}` : ""}
                        {p.statusLabel ? ` · ${p.statusLabel}` : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-[12px] text-[#6F6889]">
                    No health passport information shared. Describe the case below and
                    suggestions will be based on that instead.
                  </p>
                )}
                {selected.pastMedications.length > 0 && (
                  <p className="mt-2 text-[12px] text-[#6F6889]">
                    Previously prescribed:{" "}
                    {selected.pastMedications
                      .slice(0, 4)
                      .map((m) => m.genericName || m.name)
                      .join(", ")}
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Case + AI */}
          {hasPatient && (
            <section className={cardCls}>
              <div className="mb-6 flex items-center gap-2">
                <span className="rounded-full bg-[#F4F0FB] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#3D2E6B]">
                  Step 2 of 3
                </span>
              </div>

              <h3 className="text-xl font-bold text-[#3D2E6B]">
                Case and suggested regimen
              </h3>
              <p className="mt-1 text-[13px] text-[#6F6889]">
                {passportItems.length > 0
                  ? "Suggestions are prepared from the shared health passport and anything you add here."
                  : "Describe the case and suggestions will be prepared from what you enter."}
              </p>

              <div className="mt-5 rounded-r-xl border border-l-4 border-[#E3DBF5] border-l-[#3D2E6B] bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
                <div className="flex items-start gap-4">
                  <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#3D2E6B]" />
                  <div className="space-y-1">
                    <p className="text-[13px] font-semibold text-[#3D2E6B]">
                      How does this work?
                    </p>
                    <p className="text-[12.5px] leading-relaxed text-[#5B4B8A]">
                      Lubin drafts medication suggestions from the patient’s shared health
                      passport, current medications, allergies, and the case notes you
                      enter below. The AI is assistive only — it does not diagnose or
                      prescribe. You remain in control: review every suggestion, edit
                      doses and duration, and sign the prescription before it is issued.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <label className="ml-1 text-[13px] font-medium text-[#3D2E6B]">
                  Clinical case notes
                </label>
                <textarea
                  rows={4}
                  className="min-h-[160px] w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-[13px] text-slate-700 placeholder:text-slate-400 transition-all focus:border-[#3D2E6B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3D2E6B]/20"
                  value={caseNotes}
                  onChange={(e) => setCaseNotes(e.target.value)}
                  placeholder="Presenting concerns, duration, findings, what you have already tried…"
                />
              </div>

              <button
                type="button"
                onClick={generateSuggestions}
                disabled={aiLoading || (!caseNotes.trim() && passportItems.length === 0)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#3D2E6B] py-4 text-[14px] font-semibold text-white shadow-lg shadow-[#3D2E6B]/10 transition-all hover:bg-[#2A1F4D] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Sparkles className="h-5 w-5" />
                {aiLoading ? "Preparing suggestions…" : "Generate suggested medication"}
              </button>

              {aiError && (
                <p className="mt-3 rounded-xl bg-[#FDF2F2] px-3 py-2 text-[12px] font-semibold text-[#9B3B33]">
                  {aiError}
                </p>
              )}
              {missingInfo.length > 0 && (
                <div className="mt-4 rounded-[12px] border border-[#EFE6D2] bg-[#FDF9EF] p-4">
                  <p className="text-[11.5px] font-bold uppercase tracking-wide text-[#8A6B1F]">
                    Confirm before you sign
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {missingInfo.map((m) => (
                      <span
                        key={m}
                        className="rounded-[12px] bg-white px-2.5 py-1 text-[12px] font-medium text-[#6B4E10] ring-1 ring-[#EFE6D2]"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {aiNote && (
                <p className="mt-3 rounded-[12px] bg-[#FDF6E7] px-3 py-2 text-[12px] text-[#6B4E10]">
                  {aiNote}
                </p>
              )}
              {!aiLoading && !aiError && aiNote && suggestions.length === 0 && (
                <button
                  type="button"
                  onClick={generateSuggestions}
                  className="mt-3 rounded-[12px] border border-[#E3DBF5] px-3 py-2 text-[12px] font-semibold text-[#3D2E6B] transition hover:bg-[#F7F4FE]"
                >
                  Add more detail above, then try again
                </button>
              )}
              {suggestions.length > 0 && (
                <div className="mt-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[#8A7FB0]">
                      Suggestions for your review — nothing is prescribed until you sign
                    </p>
                    {suggestions.length > 1 && (
                      <button
                        type="button"
                        onClick={addAllSuggestions}
                        className="rounded-[12px] border border-[#D9CEF3] px-3 py-1.5 text-[12px] font-semibold text-[#3D2E6B] transition hover:bg-[#F7F4FE]"
                      >
                        Use all suggestions
                      </button>
                    )}
                  </div>
                  {suggestions.map((s, i) => {
                    const key = suggestionKey(s, i);
                    const added = addedSuggestions.includes(key);
                    return (
                      <div
                        key={key}
                        className="rounded-[12px] border border-[#E9E2F8] bg-[#FBFAFE] p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[13.5px] font-bold text-[#3D2E6B]">
                              {s.genericName || s.name}
                              {s.genericName && s.name !== s.genericName ? ` (${s.name})` : ""}
                            </p>
                            <p className="mt-1 text-[12.5px] text-[#4B4468]">
                              {s.dose} · {s.frequency}
                              {s.duration ? ` · ${s.duration}` : ""}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => addSuggestion(s, key)}
                            className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[12px] px-3 text-[12px] font-semibold transition ${
                              added
                                ? "border border-[#D9CEF3] bg-white text-[#3D2E6B] hover:bg-[#F7F4FE]"
                                : "bg-[#3D2E6B] text-white hover:bg-[#33265A]"
                            }`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            {added ? "Add again" : "Use this — edit after"}
                          </button>
                        </div>
                        {added && (
                          <p className="mt-2 text-[11.5px] font-semibold text-[#2F6B4F]">
                            Added to the prescription below — dose, frequency and duration stay
                            editable.
                          </p>
                        )}
                        {s.rationale && (
                          <p className="mt-2 text-[12px] text-[#6F6889]">
                            <span className="font-semibold text-[#3D2E6B]">Why: </span>
                            {s.rationale}
                          </p>
                        )}
                        {s.instructions && (
                          <p className="mt-1.5 text-[12px] text-[#6F6889]">
                            <span className="font-semibold text-[#3D2E6B]">Directions: </span>
                            {s.instructions}
                          </p>
                        )}
                        {s.warnings && (
                          <p className="mt-1.5 text-[12px] text-[#6F6889]">
                            <span className="font-semibold text-[#3D2E6B]">Counsel on: </span>
                            {s.warnings}
                          </p>
                        )}
                        {s.availabilityNote && (
                          <p className="mt-1.5 text-[12px] text-[#8A7FB0]">
                            {s.availabilityNote}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Medications */}
          {hasPatient && (
            <section className={cardCls}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[13.5px] font-bold text-[#3D2E6B]">
                  3 · Medications on this prescription
                </h3>
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
                  <div key={m.id} className="rounded-xl border border-[#EDEBF3] bg-[#FBFAFE] p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[11.5px] font-bold uppercase tracking-wide text-[#8A7FB0]">
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
                        <label className={label}>
                          Generic name
                          <FieldHint text="The active ingredient as written on the prescription, e.g. Sertraline hydrochloride." />
                        </label>
                        <input
                          className={`${field} mt-1.5`}
                          value={m.genericName}
                          onChange={(e) => patch(m.id, "genericName", e.target.value)}
                          placeholder="e.g. Sertraline hydrochloride"
                        />
                      </div>
                      <div>
                        <label className={label}>
                          Brand (optional)
                          <FieldHint text="Only needed if a specific brand must be dispensed instead of the generic." />
                        </label>
                        <input
                          className={`${field} mt-1.5`}
                          value={m.brandName}
                          onChange={(e) => patch(m.id, "brandName", e.target.value)}
                          placeholder="e.g. Zoloft"
                        />
                      </div>
                      <div>
                        <label className={label}>
                          Strength / form
                          <FieldHint text="Strength per unit and the formulation, e.g. 50 mg film-coated tablet or 20 mg/mL solution." />
                        </label>
                        <input
                          className={`${field} mt-1.5`}
                          value={m.strength}
                          onChange={(e) => patch(m.id, "strength", e.target.value)}
                          placeholder="50 mg tablet"
                        />
                      </div>
                      <div>
                        <label className={label}>
                          Dose
                          <FieldHint text="How much the patient takes at one time, e.g. 50 mg or 1 tablet." />
                        </label>
                        <input
                          className={`${field} mt-1.5`}
                          value={m.dose}
                          onChange={(e) => patch(m.id, "dose", e.target.value)}
                          placeholder="50 mg"
                        />
                      </div>
                      <div>
                        <label className={label}>
                          Frequency
                          <FieldHint text="How often and when it is taken, e.g. once daily in the morning, or twice daily with meals." />
                        </label>
                        <input
                          className={`${field} mt-1.5`}
                          value={m.frequency}
                          onChange={(e) => patch(m.id, "frequency", e.target.value)}
                          placeholder="Once daily in the morning"
                        />
                      </div>
                      <div>
                        <label className={label}>
                          Duration
                          <FieldHint text="How long the patient should continue, e.g. 4 weeks, 30 days, or until finished." />
                        </label>
                        <input
                          className={`${field} mt-1.5`}
                          value={m.duration}
                          onChange={(e) => patch(m.id, "duration", e.target.value)}
                          placeholder="4 weeks, then review"
                        />
                      </div>
                      <div>
                        <label className={label}>
                          Quantity to dispense
                          <FieldHint text="Total amount to dispense, e.g. 30 tablets or 1 bottle/60 mL." />
                        </label>
                        <input
                          className={`${field} mt-1.5`}
                          value={m.quantity}
                          onChange={(e) => patch(m.id, "quantity", e.target.value)}
                          placeholder="30 tablets"
                        />
                      </div>
                      <div>
                        <label className={label}>
                          Refills
                          <FieldHint text="Number of times the prescription may be refilled without a new order." />
                        </label>
                        <input
                          className={`${field} mt-1.5`}
                          value={m.refills}
                          onChange={(e) => patch(m.id, "refills", e.target.value)}
                          placeholder="No refills"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={label}>
                          Follow-up needed
                          <FieldHint text="When the patient should be seen or reviewed again before continuing or changing this medication. Leave blank if no follow-up is required." />
                        </label>
                        <input
                          className={`${field} mt-1.5`}
                          value={m.followUp}
                          onChange={(e) => patch(m.id, "followUp", e.target.value)}
                          placeholder="Review in 4 weeks before continuing"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={label}>
                          Directions for the patient
                          <FieldHint text="Plain-language directions for the patient, including when/how to take it and what to do if a dose is missed." />
                        </label>
                        <textarea
                          rows={3}
                          className={`${area} mt-1.5`}
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
                Controlled and dangerous-drug prescriptions are not issued here — they
                follow the restricted workflow inside the session.
              </p>
            </section>
          )}

          {/* Prescriber + authorisation */}
          {hasPatient && (
            <section className={cardCls}>
              <h3 className="text-[13.5px] font-bold text-[#3D2E6B]">
                4 · Prescriber and signature
              </h3>
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
                    {validity.validUntil
                      ? formatValidityDate(validity.validUntil)
                      : "Not configured"}
                  </dd>
                </div>
              </dl>
              {identityGaps.length > 0 && (
                <p className="mt-3 flex items-start gap-2 rounded-xl bg-[#FDF6E7] px-3 py-2 text-[12px] font-semibold text-[#6B4E10]">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Complete your prescriber details before signing: {identityGaps.join(", ")}.
                </p>
              )}
              <label className={label + " mt-4 block"} htmlFor="rx-notes">
                Clinical notes carried with the prescription (optional)
              </label>
              <textarea
                id="rx-notes"
                rows={2}
                className={`${area} mt-1.5`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Follow-up plan, monitoring, review date…"
              />
              <label className="mt-4 flex items-start gap-3 rounded-xl border border-[#E3DBF5] bg-[#FBFAFE] p-4">
                <input
                  type="checkbox"
                  checked={authorised}
                  onChange={(e) => setAuthorised(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-[#C9BCE9] text-[#3D2E6B]"
                />
                <span className="text-[12.5px] text-[#4B4468]">
                  I assessed this patient, the medication and directions above are
                  clinically appropriate, and I am signing this prescription under my own
                  professional licence.
                </span>
              </label>
            </section>
          )}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[#EDEBF3] bg-white px-6 py-4">
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

  if (typeof document === "undefined") return null;
  return createPortal(drawer, document.body);
}
