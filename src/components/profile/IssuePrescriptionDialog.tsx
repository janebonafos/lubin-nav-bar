import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,

  Download,
  FileText,
  Info,
  Mail,
  MessageSquare,
  Paperclip,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";

import SoapNotesPanel from "@/components/clinical/SoapNotesPanel";
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
import {
  ALLERGY_READINESS_LABEL,
  CONSULT_MODE_LABEL,
  CONTINUATION_BASIS_LABEL,
  MEDICATION_READINESS_LABEL,
  NEW_TREATMENT_BASIS_LABEL,
  emptyGuardian,
  emptyPhAddress,
  findDuplicateMatches,
  formatPhAddress,
  type AllergyReadiness,
  type ConsultMode,
  type ContinuationBasis,
  type Guardian,
  type MedicationReadiness,
  type NewTreatmentBasis,
  type PhAddress,
  type RxPurpose,
} from "@/lib/prescription/newPatient";
import {
  PHASE1_DANGEROUS_MESSAGE,
  buildSig,
  findPhCatalogue,
  searchPhCatalogue,
  type PhCatalogueItem,
} from "@/lib/prescription/phCatalogue";

type PatientSex = NonNullable<PatientSafetyInfo["sex"]>;

const SEX_OPTIONS: { value: PatientSex; label: string }[] = [
  { value: "not-documented", label: "Not documented" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "intersex", label: "Intersex" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
];

/** SOAP note attached to a clinical encounter. Fictional prototype fixture. */
type SoapNote = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
};

/** Local demo appointments a prescription can be linked to. Prototype fixture data. */
type DemoAppointment = {
  id: string;
  patient: string;
  date: string;
  time: string;
  type: string;
  status: "completed" | "cancelled" | "upcoming";
  prescriber: string;
  soap: SoapNote;
};
const DEMO_APPOINTMENTS: DemoAppointment[] = [
  {
    id: "c9",
    patient: "Miguel Santos",
    date: "30 Aug 2026",
    time: "4:00 PM",
    type: "Psychiatric consultation",
    status: "completed",
    prescriber: "Dr. Maria Santos",
    soap: {
      subjective:
        "Low mood, poor sleep and reduced interest for about ten weeks. No self-harm thoughts today.",
      objective:
        "Alert, cooperative, mildly slowed. PHQ-9 completed before the session — moderate range.",
      assessment: "Moderate depressive episode, first presentation. No safety concerns today.",
      plan: "Start an SSRI at a low dose, review in 4 weeks, sleep hygiene plan agreed.",
    },
  },
  {
    id: "a4",
    patient: "Anna Reyes",
    date: "24 Aug 2026",
    time: "10:30 AM",
    type: "Follow-up consultation",
    status: "completed",
    prescriber: "Dr. Maria Santos",
    soap: {
      subjective: "No headaches or dizziness. Taking medication daily, home readings improving.",
      objective: "",
      assessment: "Hypertension, BP improved on current dose.",
      plan: "Continue current medication, review BP log and side effects in 6 weeks.",
    },
  },
  {
    id: "x1",
    patient: "Miguel Santos",
    date: "2 Sep 2026",
    time: "2:00 PM",
    type: "Follow-up consultation",
    status: "upcoming",
    prescriber: "Dr. Maria Santos",
    soap: { subjective: "", objective: "", assessment: "", plan: "" },
  },
  {
    id: "x2",
    patient: "Anna Reyes",
    date: "10 Aug 2026",
    time: "9:00 AM",
    type: "Psychiatric consultation",
    status: "cancelled",
    prescriber: "Dr. Maria Santos",
    soap: { subjective: "", objective: "", assessment: "", plan: "" },
  },
];
/** Only completed consultations are eligible to support a new prescription. */
const ELIGIBLE_APPOINTMENTS = DEMO_APPOINTMENTS.filter((a) => a.status === "completed");

/** Which SOAP sections of a reused note still need the prescriber's input. */
function missingSoapSections(note: SoapNote): (keyof SoapNote)[] {
  return (["subjective", "objective", "assessment", "plan"] as (keyof SoapNote)[]).filter(
    (k) => !note[k].trim(),
  );
}
const SOAP_LABEL: Record<keyof SoapNote, string> = {
  subjective: "Subjective",
  objective: "Objective",
  assessment: "Assessment",
  plan: "Plan",
};

/** Where the clinical assessment supporting this prescription was documented. */
type EntryPoint = "lubin" | "outside" | "standalone" | "renewal";
const ENTRY_POINTS: { value: EntryPoint; title: string; description: string }[] = [
  {
    value: "lubin",
    title: "Use a completed Lubin consultation",
    description:
      "Link this prescription to an appointment you completed in Lubin. Its SOAP note, allergies and current medications are reused.",
  },
  {
    value: "outside",
    title: "Use a consultation I completed outside Lubin",
    description:
      "Use this when you personally assessed the patient in your clinic or another telehealth system.",
  },
  {
    value: "standalone",
    title: "Standalone prescribing encounter",
    description:
      "No scheduled appointment is required. Document the focused clinical assessment supporting this prescription.",
  },
  {
    value: "renewal",
    title: "Medication continuation / renewal",
    description:
      "Continue a medication the patient is already taking using a focused renewal review.",
  },
];


type MedForm = {
  id: string;
  genericName: string;
  brandName: string;
  strength: string;
  route: string;
  dose: string;
  frequency: string;
  duration: string;
  quantity: string;
  unit: string;
  refills: string;
  followUp: string;
  /** Structured SIG — generated, then editable. */
  sig: string;
  sigEdited: boolean;
  instructions: string;
  pharmacistNotes: string;
  internalNotes: string;
  dangerous?: boolean;
  warnings?: string;
  rationale?: string;
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
    route: "Oral",
    dose: "",
    frequency: "",
    duration: "",
    quantity: "",
    unit: "tablets",
    refills: "No refills",
    followUp: "",
    sig: "",
    sigEdited: false,
    instructions: "",
    pharmacistNotes: "",
    internalNotes: "",
  };
}

function FieldHint({ text }: { text: string }) {
  return (
    <span className="group/hint relative ml-1 inline-flex align-middle">
      <Info className="h-3.5 w-3.5 cursor-help text-[#A89BD0]" tabIndex={0} aria-label={text} />
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
const chip =
  "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[12.5px] font-semibold transition";


/**
 * Four-step prescribing flow for a new or non-recorded patient. Prototype only:
 * all data is local, the OTP is simulated, and AI assistance is optional and
 * never signs or issues anything.
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
  const [step, setStep] = useState(0);

  // ---------- Step 1: patient ----------
  const [records, setRecords] = useState<PatientRecordView[]>([]);
  const [patientQuery, setPatientQuery] = useState("");
  const [selected, setSelected] = useState<PatientRecordView | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);

  const [patientName, setPatientName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState<PatientSex>("not-documented");
  const [address, setAddress] = useState<PhAddress>(emptyPhAddress());
  const [patientEmail, setPatientEmail] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [guardian, setGuardian] = useState<Guardian>(emptyGuardian());
  const [emergencyContact] = useState({
    name: "Rosa Santos",
    relationship: "Mother",
    contact: "+63 917 222 8890",
  });
  const [duplicatesDismissed, setDuplicatesDismissed] = useState(false);

  // ---------- Step 2: clinical documentation ----------
  // One SOAP note per prescription — documented once, reused everywhere. There is
  // no second clinical-context questionnaire.
  const [entry, setEntry] = useState<EntryPoint>("lubin");
  const purpose: RxPurpose = entry === "renewal" ? "continuation" : "new-treatment";
  const [linkedAppointment, setLinkedAppointment] = useState<string>("");
  const [apptSearch, setApptSearch] = useState("");
  const [reviewSoapOpen, setReviewSoapOpen] = useState(false);
  const [materialChange, setMaterialChange] = useState<
    "none" | "update" | "reassess" | null
  >(null);
  const [consultDate, setConsultDate] = useState("");
  const [consultMode, setConsultMode] = useState<ConsultMode>("in-person");
  const [consultLocation, setConsultLocation] = useState("");
  /** Outside consultation: write a focused SOAP, or paste/dictate an existing note. */
  const [noteSource, setNoteSource] = useState<"write" | "paste">("write");
  const [pastedNote, setPastedNote] = useState("");
  const [soapDrafted, setSoapDrafted] = useState(false);
  const [soap, setSoap] = useState<SoapNote>({
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
  });
  /** Objective findings are optional and explicit — never silently blank. */
  const [objectiveMode, setObjectiveMode] = useState<"none" | "not-obtained" | "add">("none");

  const [renewal, setRenewal] = useState({
    medication: "",
    indication: "",
    lastAssessment: "",
    response: "",
    sideEffects: "",
    adherence: "",
    changes: "",
    allergyChanges: "",
    quantity: "",
    followUp: "",
  });
  const [savedForReview, setSavedForReview] = useState(false);

  const [allergyState, setAllergyState] = useState<AllergyReadiness>("not-assessed");
  const [allergyDetail, setAllergyDetail] = useState("");
  const [medicationState, setMedicationState] = useState<MedicationReadiness>("not-assessed");
  const [medicationDetail, setMedicationDetail] = useState("");
  const [reviewedNoChanges, setReviewedNoChanges] = useState(false);
  const [conditionsText, setConditionsText] = useState("");
  const [pregnancyText, setPregnancyText] = useState("");
  const [weightText, setWeightText] = useState("");
  const [bpText, setBpText] = useState("");
  const [hrText, setHrText] = useState("");
  const [otherVitalsText, setOtherVitalsText] = useState("");

  // ---------- Step 3: prescription ----------
  const [meds, setMeds] = useState<MedForm[]>([emptyMed()]);

  const [suggestions, setSuggestions] = useState<AiMedication[]>([]);
  const [confirmedSuggestions, setConfirmedSuggestions] = useState<string[]>([]);
  const [missingInfo, setMissingInfo] = useState<string[]>([]);
  const [aiNote, setAiNote] = useState("");
  const [aiError, setAiError] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // ---------- Step 4: review + simulated signing ----------
  const [attested, setAttested] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpEntry, setOtpEntry] = useState("");
  const [otpInvalidated, setOtpInvalidated] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [issued, setIssued] = useState<SignedPrescriptionDocument | null>(null);


  useEffect(() => {
    if (!open) return;
    const id = loadIdentity();
    setIdentity(id);
    setRecords(listPatientRecords());
    const found = detectJurisdiction();
    if (found.country) setCountry(found.country);
  }, [open]);


  const ageYears = ageFromDob(dob);
  const isMinor = ageYears !== undefined && ageYears < 18;
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
    const list = q ? records.filter((r) => r.fullName.toLowerCase().includes(q)) : records;
    return list.slice(0, 6);
  }, [records, patientQuery]);

  const duplicates = useMemo(() => {
    if (!creatingNew || duplicatesDismissed) return [];
    return findDuplicateMatches(records, {
      fullName: patientName,
      dob,
      mobile: patientPhone,
      email: patientEmail,
    });
  }, [creatingNew, duplicatesDismissed, records, patientName, dob, patientPhone, patientEmail]);

  /**
   * Patients can share an unbounded number of results. Providers should never
   * be shown a raw list of hundreds of rows, so results are grouped per tool:
   * one summary row per assessment with the latest result, a total count and a
   * short (max 5) recent history that can be expanded on demand.
   */
  const passportItems = useMemo(() => {
    const attempts = [...(selected?.passport?.attemptsInRange ?? [])].sort(
      (a, b) => (b.takenAt ?? 0) - (a.takenAt ?? 0),
    );
    const byTool = new Map<string, typeof attempts>();
    for (const a of attempts) {
      const list = byTool.get(a.assessmentId);
      if (list) list.push(a);
      else byTool.set(a.assessmentId, [a]);
    }
    return [...byTool.entries()].map(([assessmentId, list]) => {
      const meta = Object.values(ASSESSMENTS_BY_SLUG).find((x) => x.id === assessmentId);
      const maxScore = meta?.maxScore ?? 0;
      const statusOf = (score: number) =>
        maxScore > 0
          ? getAssessmentStatus(assessmentId, score, maxScore, !!meta?.lowerIsBetter)?.label
          : undefined;
      const latest = list[0]!;
      const previous = list[1];
      return {
        id: latest.id,
        assessmentId,
        name: meta?.name ?? latest.assessmentName,
        clinicalName: meta?.clinicalName,
        score: latest.score,
        maxScore,
        statusLabel: statusOf(latest.score),
        takenAt: latest.takenAt,
        totalCount: list.length,
        change: previous ? latest.score - previous.score : null,
        recent: list.slice(0, 5).map((a) => ({
          id: a.id,
          score: a.score,
          takenAt: a.takenAt,
          statusLabel: statusOf(a.score),
        })),
      };
    });
  }, [selected]);



  const readyMeds = meds.filter((m) => m.genericName.trim() && m.dose.trim() && m.frequency.trim());
  const dangerousMeds = meds.filter((m) => m.dangerous);

  /** The linked Lubin consultation, if any — only completed ones are eligible. */
  const linkedAppt = ELIGIBLE_APPOINTMENTS.find((a) => a.id === linkedAppointment);
  /** Sections the reused note is missing — the provider is asked for those only. */
  const missingFromLinked = linkedAppt ? missingSoapSections(linkedAppt.soap) : [];
  /**
   * "Document once, reuse everywhere": a linked consultation's SOAP is the note.
   * Anything it is missing is topped up from the provider's input in this step.
   */
  const effectiveSoap: SoapNote = linkedAppt
    ? {
        subjective: linkedAppt.soap.subjective || soap.subjective,
        objective: linkedAppt.soap.objective || soap.objective,
        assessment: linkedAppt.soap.assessment || soap.assessment,
        plan: linkedAppt.soap.plan || soap.plan,
      }
    : soap;

  // ---------- gating ----------
  const patientGaps: string[] = [];
  if (!patientName.trim()) patientGaps.push("Full legal name");
  if (!dob) patientGaps.push("Date of birth");
  if (sex === "not-documented") patientGaps.push("Sex");
  // City / municipality is the only address field required to issue a
  // prescription; the rest are optional. It identifies the patient's
  // locality on the prescription.
  if (!address.city.trim()) patientGaps.push("City / municipality");
  if (isMinor && (!guardian.name.trim() || !guardian.contact.trim()))
    patientGaps.push("Parent or legal guardian details");

  // Step 2 — clinical documentation. One note per prescription: an existing SOAP,
  // a focused SOAP, or a focused renewal note. Never both a SOAP and a
  // separate clinical-context questionnaire.
  const contextGaps: string[] = [];
  if (entry === "lubin") {
    if (!linkedAppointment) contextGaps.push("A completed Lubin consultation");
    else {
      for (const k of missingFromLinked) {
        if (k === "objective") continue; // objective findings are optional
        if (!soap[k].trim()) contextGaps.push(`${SOAP_LABEL[k]} (missing from the reused note)`);
      }
      if (!materialChange) contextGaps.push("Whether clinical information has changed");
      if (materialChange === "reassess")
        contextGaps.push("A new assessment — this patient needs reassessment");
    }
  }
  if (entry === "outside") {
    if (!consultDate) contextGaps.push("Consultation date");
    if (noteSource === "paste") {
      if (!pastedNote.trim()) contextGaps.push("The consultation note");
      else if (!soapDrafted) contextGaps.push("Prepare and review the SOAP draft");
    }
    if (noteSource === "write" || soapDrafted) {
      if (!soap.subjective.trim()) contextGaps.push("Subjective");
      if (!soap.assessment.trim()) contextGaps.push("Assessment");
      if (!soap.plan.trim()) contextGaps.push("Plan");
    }
  }
  if (entry === "standalone") {
    if (!soap.subjective.trim()) contextGaps.push("Subjective");
    if (!soap.assessment.trim()) contextGaps.push("Assessment");
    if (!soap.plan.trim()) contextGaps.push("Plan");
  }
  if (entry === "renewal") {
    if (!renewal.medication.trim()) contextGaps.push("Medication and current SIG");
    if (!renewal.indication.trim()) contextGaps.push("Indication");
    if (!renewal.response.trim()) contextGaps.push("Current response");
  }
  // "Not assessed" is a real state and blocks review and signing.
  if (allergyState === "not-assessed") contextGaps.push("Allergy status (not assessed)");
  if (medicationState === "not-assessed")
    contextGaps.push("Current medication status (not assessed)");

  const docGaps: string[] = [];

  const rxGaps: string[] = [];
  if (readyMeds.length === 0)
    rxGaps.push("One medication with generic name, dose and frequency");
  for (const m of readyMeds) {
    const name = m.genericName.trim();
    if (!m.strength.trim()) rxGaps.push(`${name}: strength and dosage form`);
    if (!m.route.trim()) rxGaps.push(`${name}: route`);
    if (!m.sig.trim()) rxGaps.push(`${name}: complete SIG`);
    if (!m.quantity.trim() || !m.unit.trim()) rxGaps.push(`${name}: quantity and unit`);
    if (!m.refills.trim()) rxGaps.push(`${name}: refills`);
    if (!m.instructions.trim()) rxGaps.push(`${name}: patient instructions`);
  }
  if (dangerousMeds.length > 0) rxGaps.push("Remove the dangerous-drug entry");

  /** Nothing in this prototype flow is review-only: the prescriber signs their own work. */
  const reviewOnly = false;

  const allGaps = [...patientGaps, ...contextGaps, ...docGaps, ...rxGaps];
  const canReview = allGaps.length === 0;
  const canSign =
    canReview &&
    !reviewOnly &&
    identityGaps.length === 0 &&
    attested &&
    !!otpCode &&
    !otpInvalidated &&
    otpEntry.trim().length === 6;

  // Any edit after a code has been sent invalidates that code.
  const signatureBasis = JSON.stringify({
    patientName,
    dob,
    sex,
    address,
    guardian,
    entry,
    linkedAppointment,
    materialChange,
    consultDate,
    consultMode,
    consultLocation,
    noteSource,
    soap,
    renewal,
    meds,
    allergyState,
    medicationState,
  });

  const lastBasis = useRef(signatureBasis);
  useEffect(() => {
    if (lastBasis.current === signatureBasis) return;
    lastBasis.current = signatureBasis;
    if (otpCode && !issued) {
      setOtpInvalidated(true);
      setOtpEntry("");
    }
  }, [signatureBasis, otpCode, issued]);

  function selectRecord(record: PatientRecordView) {
    setSelected(record);
    setCreatingNew(false);
    setPatientName(record.fullName);
    setDob(record.info.dob ?? "");
    setSex((record.info.sex as PatientSex) ?? "not-documented");
    const existing = (record.info.address ?? "").split(",").map((p) => p.trim());
    setAddress({
      street: existing[0] ?? "",
      barangay: existing[1] ?? "",
      city: existing[2] ?? "",
      province: existing[3] ?? "",
      postalCode: existing[4] ?? "",
    });
    setPatientEmail(record.info.email ?? "");
    setPatientPhone(record.info.phone ?? "");
    setSuggestions([]);
    setMissingInfo([]);
    setConfirmedSuggestions([]);
    setAiNote("");
  }

  function startNewPatient() {
    setSelected(null);
    setCreatingNew(true);
    setPatientName(patientQuery.trim());
    setPreferredName("");
    setDob("");
    setSex("not-documented");
    setAddress(emptyPhAddress());
    setPatientEmail("");
    setPatientPhone("");
    setGuardian(emptyGuardian());
    setDuplicatesDismissed(false);

    setSuggestions([]);
    setMissingInfo([]);
    setConfirmedSuggestions([]);
    setAiNote("");
  }

  function resetAll() {
    setStep(0);
    setSelected(null);
    setCreatingNew(false);
    setPatientQuery("");
    setPatientName("");
    setPreferredName("");
    setDob("");
    setSex("not-documented");
    setAddress(emptyPhAddress());
    setPatientEmail("");
    setPatientPhone("");
    setGuardian(emptyGuardian());
    setPurpose("new-treatment");
    setLinkedAppointment("");
    setConsultDate("");
    setConsultLocation("");
    setPresenting("");
    setRelevantHistory("");
    setCurrentSymptoms("");
    setAssessment("");
    setFindings("");
    setPlan("");
    setFollowUpPlan("");
    setRenewal({
      medication: "",
      indication: "",
      lastAssessment: "",
      response: "",
      sideEffects: "",
      adherence: "",
      changes: "",
      quantity: "",
      followUp: "",
    });
    setUploadName("");
    setVerifiedContinuation(false);
    setSavedForReview(false);
    setAllergyState("not-assessed");
    setAllergyDetail("");
    setMedicationState("not-assessed");
    setMedicationDetail("");
    setConditionsText("");
    setPregnancyText("");
    setWeightText("");
    setBpText("");
    setHrText("");
    setOtherVitalsText("");
    setFocusedNote("");
    setShowSoap(false);
    setMeds([emptyMed()]);
    setSuggestions([]);
    setConfirmedSuggestions([]);
    setMissingInfo([]);
    setAiNote("");
    setAiError("");
    setAttested(false);
    setOtpCode("");
    setOtpEntry("");
    setOtpInvalidated(false);
    setOtpError("");
    setIssued(null);
  }

  const linkedAppt = DEMO_APPOINTMENTS.find((a) => a.id === linkedAppointment);
  const planText =
    purpose === "continuation"
      ? [renewal.medication, renewal.indication, renewal.response].filter(Boolean).join(" · ")
      : linkedAppt
        ? `${linkedAppt.assessment} ${linkedAppt.plan}`
        : [assessment, plan, focusedNote].filter(Boolean).join(" ");

  async function draftFromPlan() {
    setAiLoading(true);
    setAiError("");
    setAiNote("");
    setMissingInfo([]);
    try {
      const res = await fetch("/api/generate-prescription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country,
          patientContext: {
            firstName: (preferredName || patientName).split(" ")[0] || undefined,
            age: ageYears,
            sex: sex === "not-documented" ? undefined : sex,
          },
          presenting: presenting || renewal.indication || planText,
          observations: findings || focusedNote,
          plan: planText,
          includedAssessments: passportItems.map((p) => ({
            name: p.name,
            clinicalName: p.clinicalName,
            score: p.score,
            statusLabel: p.statusLabel,
          })),
          currentMedications:
            medicationState === "recorded" && medicationDetail
              ? [{ name: medicationDetail, dose: "", frequency: "" }]
              : (selected?.pastMedications ?? []).slice(0, 5).map((m) => ({
                  name: m.genericName || m.name,
                  dose: m.dose,
                  frequency: m.frequency,
                })),
          allergies: allergyState === "recorded" ? allergyDetail : undefined,
        }),
      });
      const data = (await res.json()) as {
        medications?: AiMedication[];
        missingInfo?: string[];
        clinicalNotes?: string;
        error?: string;
      };
      if (!res.ok) {
        setAiError(data.error || "Could not prepare a draft right now.");
        return;
      }
      setSuggestions(data.medications ?? []);
      setMissingInfo(data.missingInfo ?? []);
      setConfirmedSuggestions([]);
      setAiNote(data.clinicalNotes ?? "");
    } catch {
      setAiError("Could not reach the drafting service.");
    } finally {
      setAiLoading(false);
    }
  }

  function suggestionKey(s: AiMedication, i: number) {
    return `${s.genericName || s.name}-${i}`;
  }

  function confirmSuggestion(s: AiMedication, key: string) {
    const generic = s.genericName || s.name;
    const cat = findPhCatalogue(generic);
    const next: MedForm = {
      ...emptyMed(),
      genericName: cat?.generic ?? generic,
      brandName: s.genericName && s.name !== s.genericName ? s.name : "",
      strength: cat?.forms[0] ?? "",
      route: s.route || cat?.routes[0] || "Oral",
      dose: s.dose,
      frequency: s.frequency,
      duration: s.duration ?? "",
      unit: cat?.unit ?? "tablets",
      instructions: s.instructions,
      warnings: s.warnings,
      rationale: s.rationale,
      dangerous: cat?.dangerous,
    };
    next.sig = buildSig({
      dose: next.dose,
      route: next.route,
      frequency: next.frequency,
      duration: next.duration,
      form: next.strength,
    });
    setMeds((cur) => {
      const blankOnly = cur.length === 1 && !cur[0]!.genericName.trim() && !cur[0]!.dose.trim();
      return blankOnly ? [next] : [...cur, next];
    });
    setConfirmedSuggestions((cur) => (cur.includes(key) ? cur : [...cur, key]));
  }

  function patch(id: string, key: keyof MedForm, value: string | boolean) {
    setMeds((cur) =>
      cur.map((m) => {
        if (m.id !== id) return m;
        const next = { ...m, [key]: value } as MedForm;
        if (!next.sigEdited && ["dose", "frequency", "duration", "route", "strength"].includes(key as string)) {
          next.sig = buildSig({
            dose: next.dose,
            route: next.route,
            frequency: next.frequency,
            duration: next.duration,
            form: next.strength,
          });
        }
        return next;
      }),
    );
  }

  function applyCatalogue(id: string, item: PhCatalogueItem) {
    setMeds((cur) =>
      cur.map((m) =>
        m.id === id
          ? {
              ...m,
              genericName: item.generic,
              strength: item.forms[0] ?? "",
              route: item.routes[0] ?? "Oral",
              unit: item.unit,
              dangerous: item.dangerous,
            }
          : m,
      ),
    );
  }

  function sendCode() {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setOtpCode(code);
    setOtpEntry("");
    setOtpInvalidated(false);
    setOtpError("");
    lastBasis.current = signatureBasis;
  }

  function signAndIssue() {
    if (!identity || !canSign) return;
    if (otpEntry.trim() !== otpCode) {
      setOtpError("That code does not match the one sent to your verified email.");
      return;
    }
    const signedAt = Date.now();
    const appointmentId = linkedAppointment || `direct_${signedAt}`;
    const info: PatientSafetyInfo = {
      ...(selected?.info ?? emptyInfo()),
      allergyState:
        allergyState === "recorded"
          ? "documented"
          : allergyState === "none-known"
            ? "none-known"
            : "not-documented",
      medicationState:
        medicationState === "recorded"
          ? "documented"
          : medicationState === "nothing"
            ? "none-known"
            : "not-documented",
      allergies: allergyDetail.trim() || undefined,
      currentMedications: medicationDetail.trim() || undefined,
      conditions: conditionsText.trim() || undefined,
      pregnancy: pregnancyText.trim() || undefined,
      labs:
        [
          weightText.trim() && `Weight ${weightText.trim()}`,
          bpText.trim() && `BP ${bpText.trim()}`,
          hrText.trim() && `HR ${hrText.trim()}`,
          otherVitalsText.trim(),
        ]
          .filter(Boolean)
          .join(" · ") || undefined,
      dob,
      ageYears,
      sex,
      address: formatPhAddress(address),
      email: patientEmail.trim() || undefined,
      phone: patientPhone.trim() || undefined,
      updatedAt: signedAt,
    };

    const indication = purpose === "continuation" ? renewal.indication : assessment;

    const medications: PrescriptionMedication[] = readyMeds.map((m) => ({
      id: m.id,
      name: m.brandName.trim() || m.genericName.trim(),
      genericName: m.genericName.trim(),
      strength: m.strength.trim() || undefined,
      dose: m.dose.trim(),
      route: m.route.trim() || "Oral",
      frequency: m.frequency.trim(),
      duration: m.duration.trim() || undefined,
      quantity: [m.quantity.trim(), m.unit.trim()].filter(Boolean).join(" ") || undefined,
      refills: m.refills.trim() || undefined,
      followUp: m.followUp.trim() || undefined,
      indication: indication.trim() || undefined,
      instructions: [m.sig.trim(), m.instructions.trim()].filter(Boolean).join(" "),
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
      authenticationMethod: "Verified with a one-time code sent to the prescriber's registered email",
      identity,
      medications,
      controlled: false,
      clinicalNotes: undefined,
      patientInfo: info,
      signature: {
        method: "two-factor",
        at: signedAt,
        by: identity.fullName,
        credentials,
        jurisdiction: country,
        version: 1,
        methodLabel: "Verified with a one-time code sent to the prescriber's registered email",
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

    setIssued(doc);
    onIssued?.(doc);
  }

  if (!open) return null;

  const hasPatient = !!patientName.trim() || creatingNew || !!selected;
  const stepGaps = [patientGaps, contextGaps, [...docGaps, ...rxGaps], []][step] ?? [];
  const canAdvance =
    step === 0
      ? hasPatient && patientGaps.length === 0
      : step === 1
        ? contextGaps.length === 0
        : step === 2
          ? docGaps.length === 0 && rxGaps.length === 0
          : false;

  const drawer = (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#1B1330]/50 p-3 backdrop-blur-sm sm:p-6">
      <div className="flex h-full max-h-[calc(100vh-24px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#E3DBF5] bg-[#FBF9FF] shadow-2xl sm:max-h-[92vh]">
        <header className="shrink-0 border-b border-[#EDEBF3] bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[16px] font-bold text-[#3D2E6B]">New prescription</h2>
              <p className="mt-1 text-[12.5px] text-[#6F6889]">
                Patient, clinical context, prescription, then review and sign. A signed
                prescription cannot be edited.
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
          </div>
        </header>


        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-6">
          {issued ? (
            <section className={cardCls}>
              <p className="flex items-center gap-2 text-[14px] font-bold text-[#3D2E6B]">
                <CheckCircle2 className="h-5 w-5" /> Prescription issued
              </p>
              <p className="mt-1 text-[12.5px] text-[#6F6889]">
                Signed for {issued.patientName}. Choose how the patient receives it.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button type="button" className={`${chip} justify-center border-[#D9CEF3] bg-white text-[#3D2E6B]`}>
                  <MessageSquare className="h-4 w-4" /> Send secure link by SMS
                </button>
                <button type="button" className={`${chip} justify-center border-[#D9CEF3] bg-white text-[#3D2E6B]`}>
                  <Mail className="h-4 w-4" /> Send by email
                </button>
                <button type="button" className={`${chip} justify-center border-[#D9CEF3] bg-white text-[#3D2E6B]`}>
                  <Download className="h-4 w-4" /> Download or print
                </button>
                <button type="button" className={`${chip} justify-center border-[#D9CEF3] bg-white text-[#3D2E6B]`}>
                  <UserPlus className="h-4 w-4" /> Invite to create a Lubin account
                </button>
              </div>
              <p className="mt-3 text-[11.5px] text-[#8A7FB0]">
                Prototype only — no message is actually sent.
              </p>
            </section>
          ) : (
            <>
              {/* ---------------- STEP 1 — PATIENT ---------------- */}
              <Acc
                index={0}
                label="Patient"
                hint="Identity and contact details"
                open={step === 0}
                onToggle={setStep}
                done={hasPatient && patientGaps.length === 0}
              >
                {() => (
                <>

                  <section className={cardCls}>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-[13.5px] font-bold text-[#3D2E6B]">Patient</h3>
                      {(selected || creatingNew) && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelected(null);
                            setCreatingNew(false);
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
                                  : "New patient record"}
                              </span>
                              <span className="block text-[11.5px] text-[#8A7FB0]">
                                For a first-time patient who isn’t in your records yet — no Lubin
                                account needed
                              </span>
                            </span>
                          </button>
                        </div>
                      </>
                    )}

                    {hasPatient && (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <label className={label} htmlFor="rx-patient">
                            Full legal name
                          </label>
                          <input
                            id="rx-patient"
                            className={`${field} mt-1.5`}
                            value={patientName}
                            onChange={(e) => setPatientName(e.target.value)}
                            placeholder="e.g. Anna Marie Reyes"
                          />
                        </div>
                        <div>
                          <label className={label} htmlFor="rx-preferred">
                            Preferred name{" "}
                            <span className="font-normal normal-case tracking-normal text-[#A89BD0]">
                              (optional)
                            </span>
                          </label>
                          <input
                            id="rx-preferred"
                            className={`${field} mt-1.5`}
                            value={preferredName}
                            onChange={(e) => setPreferredName(e.target.value)}
                            placeholder="e.g. Anna"
                          />
                        </div>
                        <div>
                          <label className={label} htmlFor="rx-dob">
                            Date of birth
                          </label>
                          <input
                            id="rx-dob"
                            type="date"
                            className={`${field} mt-1.5`}
                            value={dob}
                            onChange={(e) => setDob(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className={label} htmlFor="rx-age">
                            Age
                          </label>
                          <div
                            id="rx-age"
                            className={`${field} mt-1.5 flex items-center ${ageYears === undefined ? "text-[#A89BD0]" : "text-[#3D2E6B]"}`}
                          >
                            {ageYears !== undefined ? `${ageYears} years old` : "—"}
                          </div>
                        </div>
                        <div>
                          <label className={label} htmlFor="rx-sex">
                            Sex
                          </label>
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
                        <p className="sm:col-span-2 mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#8A7FB0]">
                          Address
                        </p>
                        <div className="sm:col-span-2">
                          <label className={label} htmlFor="rx-street">
                            House / street <span className="normal-case font-normal text-[#A99BCB]">(optional)</span>
                          </label>
                          <input
                            id="rx-street"
                            className={`${field} mt-1.5`}
                            value={address.street}
                            onChange={(e) => setAddress({ ...address, street: e.target.value })}
                            placeholder="e.g. 24 Mabini Street"
                          />
                        </div>
                        <div>
                          <label className={label} htmlFor="rx-brgy">
                            Barangay <span className="normal-case font-normal text-[#A99BCB]">(optional)</span>
                          </label>
                          <input
                            id="rx-brgy"
                            className={`${field} mt-1.5`}
                            value={address.barangay}
                            onChange={(e) => setAddress({ ...address, barangay: e.target.value })}
                            placeholder="e.g. Barangay Kapitolyo"
                          />
                        </div>
                        <div>
                          <label className={label} htmlFor="rx-city">
                            City / municipality <span className="text-[#C2410C] font-semibold">*</span>
                          </label>
                          <input
                            id="rx-city"
                            className={`${field} mt-1.5`}
                            value={address.city}
                            onChange={(e) => setAddress({ ...address, city: e.target.value })}
                            placeholder="e.g. Pasig City"
                          />
                        </div>
                        <div>
                          <label className={label} htmlFor="rx-province">
                            Province <span className="normal-case font-normal text-[#A99BCB]">(optional)</span>
                          </label>
                          <input
                            id="rx-province"
                            className={`${field} mt-1.5`}
                            value={address.province}
                            onChange={(e) => setAddress({ ...address, province: e.target.value })}
                            placeholder="e.g. Metro Manila"
                          />
                        </div>
                        <div>
                          <label className={label} htmlFor="rx-postal">
                            Postal code <span className="normal-case font-normal text-[#A99BCB]">(optional)</span>
                          </label>
                          <input
                            id="rx-postal"
                            className={`${field} mt-1.5`}
                            value={address.postalCode}
                            onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                            placeholder="e.g. 1603"
                          />
                        </div>
                        <div>
                          <label className={label} htmlFor="rx-phone">
                            Mobile number <span className="normal-case font-normal text-[#A99BCB]">(optional)</span>
                          </label>
                          <input
                            id="rx-phone"
                            type="tel"
                            className={`${field} mt-1.5`}
                            value={patientPhone}
                            onChange={(e) => setPatientPhone(e.target.value)}
                            placeholder="e.g. +63 917 000 0000"
                          />
                        </div>
                        <div>
                          <label className={label} htmlFor="rx-email">
                            Email <span className="normal-case font-normal text-[#A99BCB]">(optional)</span>
                          </label>
                          <input
                            id="rx-email"
                            type="email"
                            className={`${field} mt-1.5`}
                            value={patientEmail}
                            onChange={(e) => setPatientEmail(e.target.value)}
                            placeholder="e.g. anna@email.com"
                          />
                        </div>
                        <p className="sm:col-span-2 -mt-1 text-[11.5px] leading-snug text-[#8A7FB0]">
                          City / municipality is required. All other address fields are optional.
                          If you add a mobile number or email, the signed prescription can be
                          delivered by text or email. The patient does not need a Lubin account
                          before you continue.
                        </p>
                      </div>
                    )}
                  </section>

                  {/* Duplicate matches */}
                  {duplicates.length > 0 && (
                    <section className="rounded-2xl border border-[#EFE6D2] bg-[#FDF9EF] p-5">
                      <p className="flex items-center gap-2 text-[13px] font-bold text-[#6B4E10]">
                        <AlertTriangle className="h-4 w-4" /> Possible existing record
                      </p>
                      <p className="mt-1 text-[12px] text-[#6B4E10]">
                        These records match on name, date of birth, mobile or email. Open one
                        instead of creating a duplicate.
                      </p>
                      <div className="mt-3 space-y-2">
                        {duplicates.map((d) => (
                          <div
                            key={d.record.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#EFE6D2] bg-white px-3.5 py-3"
                          >
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-[#3D2E6B]">
                                {d.record.fullName}
                              </p>
                              <p className="text-[11.5px] text-[#8A6B1F]">{d.reasons.join(" · ")}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => selectRecord(d.record)}
                              className="inline-flex h-9 items-center rounded-xl bg-[#3D2E6B] px-3 text-[12px] font-semibold text-white"
                            >
                              Use this record
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setDuplicatesDismissed(true)}
                        className="mt-3 text-[12px] font-semibold text-[#6B4E10] underline"
                      >
                        None of these — continue creating a new record
                      </button>
                    </section>
                  )}

                  {/* Guardian — minors only */}
                  {hasPatient && isMinor && (
                    <section className={cardCls}>
                      <h3 className="text-[13.5px] font-bold text-[#3D2E6B]">
                        Parent or legal guardian
                      </h3>
                      <p className="mt-1 text-[12px] text-[#6F6889]">
                        Required because the patient is {ageYears} years old. An emergency contact
                        is not automatically the legal guardian.
                      </p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className={label}>Guardian name</label>
                          <input
                            className={`${field} mt-1.5`}
                            value={guardian.name}
                            onChange={(e) => setGuardian({ ...guardian, name: e.target.value })}
                            placeholder="Full name"
                          />
                        </div>
                        <div>
                          <label className={label}>Relationship</label>
                          <input
                            className={`${field} mt-1.5`}
                            value={guardian.relationship}
                            onChange={(e) =>
                              setGuardian({ ...guardian, relationship: e.target.value })
                            }
                            placeholder="e.g. Mother"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className={label}>Mobile or email</label>
                          <input
                            className={`${field} mt-1.5`}
                            value={guardian.contact}
                            onChange={(e) => setGuardian({ ...guardian, contact: e.target.value })}
                            placeholder="+63 917 000 0000 or name@email.com"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setGuardian({
                            name: emergencyContact.name,
                            relationship: emergencyContact.relationship,
                            contact: emergencyContact.contact,
                          })
                        }
                        className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#D9CEF3] bg-white px-3 text-[12px] font-semibold text-[#3D2E6B] hover:bg-[#F7F4FE]"
                      >
                        <Plus className="h-3.5 w-3.5" /> Copy confirmed emergency contact (
                        {emergencyContact.name})
                      </button>
                      <p className="mt-2 text-[11.5px] text-[#8A7FB0]">
                        Confirm with the patient that this contact is the legal guardian before
                        copying.
                      </p>
                    </section>
                  )}

                </>
              )}
              </Acc>


              {/* ---------------- STEP 2 — CLINICAL CONTEXT ---------------- */}
              <Acc
                index={1}
                label="Clinical context"
                hint="Assessment source and readiness"
                open={step === 1}
                onToggle={setStep}
                done={contextGaps.length === 0}
              >
                {() => (
                <>

                  <section className={cardCls}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-[13.5px] font-bold text-[#3D2E6B]">
                          Which clinical assessment supports this prescription?
                        </h3>
                        <p className="mt-1.5 text-[12px] leading-relaxed text-[#6F6889]">
                          Every new medication must be connected to a clinical assessment completed
                          by the prescriber. Choose where that assessment was documented.
                        </p>
                      </div>
                      <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-[11.5px] font-semibold text-[#6F6889]">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 accent-[#3D2E6B]"
                          checked={skipContext}
                          onChange={(e) => setSkipContext(e.target.checked)}
                        />
                        Skip
                      </label>
                    </div>
                    {skipContext && (
                      <p className="mt-2.5 rounded-xl border border-[#E6DEFA] bg-[#F7F4FE] px-3 py-2 text-[11.5px] leading-relaxed text-[#6F5BA0]">
                        Clinical context is skipped for this prescription. You can fill it in later,
                        but signing is allowed without it.
                      </p>
                    )}

                    {!skipContext && purpose === "new-treatment" ? (
                      <>
                        <div className="mt-4 space-y-2">
                          {/* Option 1 — completed Lubin consultation */}
                          <div
                            className={`rounded-xl border px-3.5 py-3 ${
                              newBasis === "linked-appointment"
                                ? "border-[#3D2E6B] bg-[#F7F4FE]"
                                : "border-[#EDEBF3] bg-white"
                            }`}
                          >
                            <label className="flex cursor-pointer items-start gap-3">
                              <input
                                type="radio"
                                className="mt-0.5 h-4 w-4 accent-[#3D2E6B]"
                                checked={newBasis === "linked-appointment"}
                                onChange={() => setNewBasis("linked-appointment")}
                              />
                              <span className="flex flex-col">
                                <span className="text-[12.5px] font-semibold text-[#3D2E6B]">
                                  Use a completed Lubin consultation
                                </span>
                                <span className="mt-0.5 text-[12px] leading-snug text-[#6F6889]">
                                  Link this prescription to an appointment you completed in Lubin.
                                  Relevant clinical documentation will be reused.
                                </span>
                              </span>
                            </label>
                            {newBasis === "linked-appointment" && (
                            <div className="mt-3 border-t border-[#EDEBF3] pt-3">
                              <label className={label}>Completed Lubin consultations</label>
                              <p className="mt-1 text-[11.5px] leading-snug text-[#6F6889]">
                                Search by patient name, appointment type, or ID to find the
                                consultation you want to link.
                              </p>
                              <div className="relative mt-1.5">
                                <input
                                  className={`${field} pr-9`}
                                  value={apptSearch}
                                  onChange={(e) => setApptSearch(e.target.value)}
                                  placeholder="Search name, title or ID…"
                                />
                                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#A89BD0]">
                                  ⌕
                                </span>
                              </div>
                              {(() => {
                                const q = apptSearch.trim().toLowerCase();
                                const matches = q
                                  ? ELIGIBLE_APPOINTMENTS.filter(
                                      (a) =>
                                        a.patient.toLowerCase().includes(q) ||
                                        a.type.toLowerCase().includes(q) ||
                                        a.id.toLowerCase().includes(q),
                                    )
                                  : [];
                                if (!q) {
                                  return (
                                    <p className="mt-2 text-[11.5px] text-[#9A93B5]">
                                      {ELIGIBLE_APPOINTMENTS.length} completed consultations
                                      available — start typing to search.
                                    </p>
                                  );
                                }
                                if (matches.length === 0) {
                                  return (
                                    <p className="mt-2 text-[11.5px] text-[#9A93B5]">
                                      No completed consultations match “{apptSearch}”.
                                    </p>
                                  );
                                }
                                return (
                                  <div className="mt-2 space-y-2">
                                    {matches.map((a) => (
                                      <label
                                        key={a.id}
                                        className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 ${
                                          linkedAppointment === a.id
                                            ? "border-[#3D2E6B] bg-[#F7F4FE]"
                                            : "border-[#EDEBF3] bg-white"
                                        }`}
                                      >
                                        <input
                                          type="radio"
                                          className="mt-0.5 h-4 w-4 accent-[#3D2E6B]"
                                          checked={linkedAppointment === a.id}
                                          onChange={() => setLinkedAppointment(a.id)}
                                        />
                                        <span className="flex flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                                          <span className="text-[12.5px] font-semibold text-[#3D2E6B]">
                                            {a.patient} · {a.type}
                                          </span>
                                          <span className="text-[12px] text-[#6F6889]">
                                            {a.date}, {a.time}
                                          </span>
                                          <span className="ml-auto rounded-full bg-[#F0EBFB] px-2 py-0.5 text-[10.5px] font-semibold capitalize text-[#3D2E6B]">
                                            {a.status}
                                          </span>
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                );
                              })()}
                              {linkedAppt && (
                                <p className="mt-2 rounded-xl bg-[#F7F4FE] px-3 py-2 text-[12px] text-[#4B4468]">
                                  Documentation from this consultation will be reused — you will not
                                  be asked to write it again.
                                </p>
                              )}
                            </div>
                            )}
                          </div>

                          {/* Option 2 — outside consultation */}
                          <div
                            className={`rounded-xl border px-3.5 py-3 ${
                              newBasis === "external-consult"
                                ? "border-[#3D2E6B] bg-[#F7F4FE]"
                                : "border-[#EDEBF3] bg-white"
                            }`}
                          >
                            <label className="flex cursor-pointer items-start gap-3">
                              <input
                                type="radio"
                                className="mt-0.5 h-4 w-4 accent-[#3D2E6B]"
                                checked={newBasis === "external-consult"}
                                onChange={() => setNewBasis("external-consult")}
                              />
                              <span className="flex flex-col">
                                <span className="text-[12.5px] font-semibold text-[#3D2E6B]">
                                  Record a consultation I completed outside Lubin
                                </span>
                                <span className="mt-0.5 text-[12px] leading-snug text-[#6F6889]">
                                  Use this when you personally assessed the patient outside Lubin,
                                  such as in your clinic or another telehealth system.
                                </span>
                              </span>
                            </label>
                            {newBasis === "external-consult" && (
                            <div className="mt-3 grid gap-3 border-t border-[#EDEBF3] pt-3 sm:grid-cols-2">
                              <div>
                                <label className={label}>Consultation date</label>
                                <input
                                  type="date"
                                  className={`${field} mt-1.5`}
                                  value={consultDate}
                                  onChange={(e) => setConsultDate(e.target.value)}
                                />
                              </div>
                              <div>
                                <label className={label}>Consultation method</label>
                                <select
                                  className={`${field} mt-1.5`}
                                  value={consultMode}
                                  onChange={(e) => setConsultMode(e.target.value as ConsultMode)}
                                >
                                  {(Object.keys(CONSULT_MODE_LABEL) as ConsultMode[]).map((m) => (
                                    <option key={m} value={m}>
                                      {CONSULT_MODE_LABEL[m]}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="sm:col-span-2">
                                <label className={label}>Location / practice</label>
                                <input
                                  className={`${field} mt-1.5`}
                                  value={consultLocation}
                                  onChange={(e) => setConsultLocation(e.target.value)}
                                  placeholder="e.g. Private clinic, Makati"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className={label}>Presenting concern</label>
                                <input
                                  className={`${field} mt-1.5`}
                                  value={presenting}
                                  onChange={(e) => setPresenting(e.target.value)}
                                  placeholder="e.g. Recurring headaches for 3 months"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className={label}>Relevant findings</label>
                                <textarea
                                  rows={2}
                                  className={`${area} mt-1.5`}
                                  value={findings}
                                  onChange={(e) => setFindings(e.target.value)}
                                  placeholder="Examination findings, vitals, relevant screening…"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className={label}>Assessment</label>
                                <input
                                  className={`${field} mt-1.5`}
                                  value={assessment}
                                  onChange={(e) => setAssessment(e.target.value)}
                                  placeholder="e.g. Tension-type headache"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className={label}>Treatment plan</label>
                                <textarea
                                  rows={2}
                                  className={`${area} mt-1.5`}
                                  value={plan}
                                  onChange={(e) => setPlan(e.target.value)}
                                  placeholder="What you intend to start, monitor and review"
                                />
                              </div>
                            </div>
                            )}
                          </div>

                          {/* Option 3 — assessment now */}
                          <div
                            className={`rounded-xl border px-3.5 py-3 ${
                              newBasis === "focused-assessment"
                                ? "border-[#3D2E6B] bg-[#F7F4FE]"
                                : "border-[#EDEBF3] bg-white"
                            }`}
                          >
                            <label className="flex cursor-pointer items-start gap-3">
                              <input
                                type="radio"
                                className="mt-0.5 h-4 w-4 accent-[#3D2E6B]"
                                checked={newBasis === "focused-assessment"}
                                onChange={() => setNewBasis("focused-assessment")}
                              />
                              <span className="flex flex-col">
                                <span className="text-[12.5px] font-semibold text-[#3D2E6B]">
                                  Document an assessment I’m completing now
                                </span>
                                <span className="mt-0.5 text-[12px] leading-snug text-[#6F6889]">
                                  Complete a focused clinical assessment now before preparing the
                                  prescription.
                                </span>
                              </span>
                            </label>
                            {newBasis === "focused-assessment" && (
                            <div className="mt-3 grid gap-3 border-t border-[#EDEBF3] pt-3 sm:grid-cols-2">
                              <div className="sm:col-span-2">
                                <label className={label}>How are you assessing the patient?</label>
                                <select
                                  className={`${field} mt-1.5`}
                                  value={consultMode}
                                  onChange={(e) => setConsultMode(e.target.value as ConsultMode)}
                                >
                                  {(["in-person", "video", "phone"] as ConsultMode[]).map((m) => (
                                    <option key={m} value={m}>
                                      {CONSULT_MODE_LABEL[m]}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="sm:col-span-2">
                                <label className={label}>Presenting concern</label>
                                <input
                                  className={`${field} mt-1.5`}
                                  value={presenting}
                                  onChange={(e) => setPresenting(e.target.value)}
                                  placeholder="e.g. Recurring headaches for 3 months"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className={label}>Relevant history</label>
                                <textarea
                                  rows={2}
                                  className={`${area} mt-1.5`}
                                  value={relevantHistory}
                                  onChange={(e) => setRelevantHistory(e.target.value)}
                                  placeholder="Medical history relevant to this presentation…"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className={label}>Current symptoms</label>
                                <textarea
                                  rows={2}
                                  className={`${area} mt-1.5`}
                                  value={currentSymptoms}
                                  onChange={(e) => setCurrentSymptoms(e.target.value)}
                                  placeholder="Symptoms reported today, severity and duration…"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className={label}>Relevant findings</label>
                                <textarea
                                  rows={2}
                                  className={`${area} mt-1.5`}
                                  value={findings}
                                  onChange={(e) => setFindings(e.target.value)}
                                  placeholder="Examination findings, vitals, relevant screening…"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className={label}>Assessment / diagnosis</label>
                                <input
                                  className={`${field} mt-1.5`}
                                  value={assessment}
                                  onChange={(e) => setAssessment(e.target.value)}
                                  placeholder="e.g. Tension-type headache"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className={label}>Treatment rationale</label>
                                <textarea
                                  rows={2}
                                  className={`${area} mt-1.5`}
                                  value={plan}
                                  onChange={(e) => setPlan(e.target.value)}
                                  placeholder="Why this treatment, what you intend to start and monitor"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className={label}>Follow-up plan</label>
                                <input
                                  className={`${field} mt-1.5`}
                                  value={followUpPlan}
                                  onChange={(e) => setFollowUpPlan(e.target.value)}
                                  placeholder="e.g. Review response and side effects in 4 weeks"
                                />
                              </div>
                            </div>
                            )}
                          </div>
                        </div>

                        <p className="mt-3 rounded-xl border border-[#EFE6D2] bg-[#FDF9EF] px-3.5 py-2.5 text-[12px] leading-relaxed text-[#8A6B1F]">
                          A medication request or message alone is not a clinical assessment.
                          Confirm that you personally assessed the patient before issuing a new
                          treatment.
                        </p>

                        <p className="mt-4 text-[12px] text-[#6F6889]">
                          Is this a medication renewal?{" "}
                          <button
                            type="button"
                            onClick={() => setPurpose("continuation")}
                            className="font-semibold text-[#3D2E6B] underline underline-offset-2 hover:text-[#2A1F4D]"
                          >
                            Use the continuation flow instead.
                          </button>
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <label className={label}>Existing medication and SIG</label>
                            <input
                              className={`${field} mt-1.5`}
                              value={renewal.medication}
                              onChange={(e) =>
                                setRenewal((r) => ({ ...r, medication: e.target.value }))
                              }
                              placeholder="e.g. Losartan 50 mg — 1 tablet once daily"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className={label}>Indication</label>
                            <input
                              className={`${field} mt-1.5`}
                              value={renewal.indication}
                              onChange={(e) =>
                                setRenewal((r) => ({ ...r, indication: e.target.value }))
                              }
                              placeholder="e.g. Hypertension, newly diagnosed"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className={label}>Current response</label>
                            <textarea
                              rows={2}
                              className={`${area} mt-1.5`}
                              value={renewal.response}
                              onChange={(e) =>
                                setRenewal((r) => ({ ...r, response: e.target.value }))
                              }
                              placeholder="Symptom control, side effects, adherence…"
                            />
                          </div>
                        </div>
                        <p className="mt-4 text-[12px] text-[#6F6889]">
                          Starting something new?{" "}
                          <button
                            type="button"
                            onClick={() => setPurpose("new-treatment")}
                            className="font-semibold text-[#3D2E6B] underline underline-offset-2 hover:text-[#2A1F4D]"
                          >
                            Use the new treatment flow instead.
                          </button>
                        </p>
                      </>
                    )}
                  </section>

                  {/* Prescribing readiness */}
                  {!skipContext && (
                  <section className={cardCls}>
                    <h3 className="text-[13.5px] font-bold text-[#3D2E6B]">Prescribing readiness</h3>
                    <p className="mt-1 text-[12px] text-[#6F6889]">
                      “Not assessed” is a real state and blocks signing — it is never read as “none”.
                    </p>

                    <p className={`${label} mt-4`}>Allergies</p>
                    <div className="mt-1.5 grid grid-cols-3 gap-2">
                      {(Object.keys(ALLERGY_READINESS_LABEL) as AllergyReadiness[]).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setAllergyState(s)}
                          className={`${chip} w-full justify-center text-center ${
                            allergyState === s
                              ? "border-[#3D2E6B] bg-[#3D2E6B] text-white"
                              : "border-[#D9CEF3] bg-white text-[#3D2E6B]"
                          }`}
                        >
                          {ALLERGY_READINESS_LABEL[s]}
                        </button>
                      ))}
                    </div>
                    {allergyState === "recorded" && (
                      <input
                        className={`${field} mt-2`}
                        value={allergyDetail}
                        onChange={(e) => setAllergyDetail(e.target.value)}
                        placeholder="e.g. Penicillin — rash"
                      />
                    )}

                    <p className={`${label} mt-4`}>Current medications</p>
                    <div className="mt-1.5 grid grid-cols-3 gap-2">
                      {(Object.keys(MEDICATION_READINESS_LABEL) as MedicationReadiness[]).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setMedicationState(s)}
                          className={`${chip} w-full justify-center text-center ${
                            medicationState === s
                              ? "border-[#3D2E6B] bg-[#3D2E6B] text-white"
                              : "border-[#D9CEF3] bg-white text-[#3D2E6B]"
                          }`}
                        >
                          {MEDICATION_READINESS_LABEL[s]}
                        </button>
                      ))}
                    </div>
                    {medicationState === "recorded" && (
                      <input
                        className={`${field} mt-2`}
                        value={medicationDetail}
                        onChange={(e) => setMedicationDetail(e.target.value)}
                        placeholder="e.g. Losartan 50 mg once daily"
                      />
                    )}

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className={label}>Relevant conditions</label>
                        <input
                          className={`${field} mt-1.5`}
                          value={conditionsText}
                          onChange={(e) => setConditionsText(e.target.value)}
                          placeholder="e.g. Hypertension, migraine"
                        />
                      </div>
                      {sex !== "male" && (
                        <div className="sm:col-span-2">
                          <label className={label}>Pregnancy / breastfeeding</label>
                          <input
                            className={`${field} mt-1.5`}
                            value={pregnancyText}
                            onChange={(e) => setPregnancyText(e.target.value)}
                            placeholder="e.g. Not pregnant / not breastfeeding"
                          />
                        </div>
                      )}
                      <div className="sm:col-span-2">
                        <p className={`${label} normal-case`}>
                          Weight & vitals
                          <FieldHint text="Only when clinically relevant to the medication being prescribed — all optional." />
                        </p>
                        <div className="mt-1.5 grid gap-3 sm:grid-cols-3">
                          <input
                            className={field}
                            value={weightText}
                            onChange={(e) => setWeightText(e.target.value)}
                            placeholder="Weight — e.g. 58 kg"
                          />
                          <input
                            className={field}
                            value={bpText}
                            onChange={(e) => setBpText(e.target.value)}
                            placeholder="BP — e.g. 118/74"
                          />
                          <input
                            className={field}
                            value={hrText}
                            onChange={(e) => setHrText(e.target.value)}
                            placeholder="HR — e.g. 72 bpm"
                          />
                        </div>
                        <input
                          className={`${field} mt-3`}
                          value={otherVitalsText}
                          onChange={(e) => setOtherVitalsText(e.target.value)}
                          placeholder="Other vitals or labs — e.g. FBS 5.2 mmol/L (optional)"
                        />
                      </div>
                    </div>

                    {(!skipContext && (allergyState === "not-assessed" || medicationState === "not-assessed")) && (
                      <p className="mt-3 flex items-start gap-2 rounded-xl bg-[#FDF6E7] px-3 py-2 text-[12px] font-semibold text-[#6B4E10]">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        Allergy and current-medication status must be assessed before you can sign.
                      </p>
                    )}
                  </section>
                  )}
                </>
              )}
              </Acc>


              {/* ---------------- STEP 3 — DOCUMENTATION + PRESCRIPTION ---------------- */}
              <Acc
                index={2}
                label="Prescription"
                hint="Documentation and medications"
                open={step === 2}
                onToggle={setStep}
                done={docGaps.length === 0 && rxGaps.length === 0}
              >
                {() => (
                <>

                  <section className={cardCls}>
                    <h3 className="text-[13.5px] font-bold text-[#3D2E6B]">
                      Clinical documentation
                    </h3>

                    {purpose === "new-treatment" && linkedAppt && (
                      <div className="mt-3 rounded-xl border border-[#E3DBF5] bg-[#F7F3FF] p-4">
                        <p className="flex items-center gap-2 text-[12.5px] font-semibold text-[#3D2E6B]">
                          <CalendarClock className="h-4 w-4" /> Using documentation from this
                          consultation
                        </p>
                        <p className="mt-2 text-[12px] text-[#4B4468]">
                          <span className="font-semibold">Assessment: </span>
                          {linkedAppt.assessment}
                        </p>
                        <p className="mt-1 text-[12px] text-[#4B4468]">
                          <span className="font-semibold">Plan: </span>
                          {linkedAppt.plan}
                        </p>
                        <a
                          href={`/appointment/details?id=${linkedAppt.id}`}
                          className="mt-3 inline-flex h-9 items-center rounded-xl border border-[#D9CEF3] bg-white px-3 text-[12px] font-semibold text-[#3D2E6B] hover:bg-[#F7F4FE]"
                        >
                          View or edit clinical documentation
                        </a>
                      </div>
                    )}

                    {purpose === "new-treatment" && !linkedAppt && (
                      <>
                        <p className="mt-1 text-[12px] text-[#6F6889]">
                          Your structured documentation from the previous step is the clinical
                          record for this prescription. Add an optional note or a full SOAP note
                          only if you want more detail.
                        </p>
                        <label className={`${label} mt-3 block`}>Additional note (optional)</label>
                        <textarea
                          rows={4}
                          className={`${area} mt-1.5`}
                          value={focusedNote}
                          onChange={(e) => setFocusedNote(e.target.value)}
                          placeholder="Anything else you want on the record, in your own words…"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSoap((v) => !v)}
                          className="mt-3 inline-flex h-9 items-center rounded-xl border border-[#D9CEF3] bg-white px-3 text-[12px] font-semibold text-[#3D2E6B] hover:bg-[#F7F4FE]"
                        >
                          {showSoap ? "Hide full SOAP note" : "Open full SOAP note (optional)"}
                        </button>
                        {showSoap && (
                          <div className="mt-3">
                            <SoapNotesPanel
                              recordKey={`rx:${selected?.id ?? "new-patient"}`}
                              defaultOpen
                              context={() => ({
                                country,
                                patientContext: {
                                  firstName: (preferredName || patientName).split(" ")[0] || undefined,
                                  age: ageYears,
                                  sex: sex === "not-documented" ? undefined : sex,
                                },
                                caseNotes: focusedNote,
                                presenting,
                                observations: [relevantHistory, currentSymptoms, findings]
                                  .filter(Boolean)
                                  .join("\n"),
                                plan: [plan, followUpPlan].filter(Boolean).join("\n"),
                              })}
                            />
                          </div>
                        )}
                      </>
                    )}

                    {purpose === "continuation" && (
                      <div className="mt-3 rounded-xl border border-[#E3DBF5] bg-[#F7F3FF] p-4">
                        <p className="text-[12.5px] font-semibold text-[#3D2E6B]">
                          Focused renewal review recorded
                        </p>
                        <p className="mt-1 text-[12px] text-[#4B4468]">
                          {renewal.medication || "—"} · {renewal.indication || "—"} ·{" "}
                          {renewal.response || "—"}
                        </p>
                        <p className="mt-1.5 text-[11.5px] text-[#8A7FB0]">
                          A full SOAP note is not required for a continuation.
                        </p>
                      </div>
                    )}
                  </section>

                  {/* AI drafting */}
                  <section className={cardCls}>
                    <h3 className="text-[13.5px] font-bold text-[#3D2E6B]">Assistive drafting</h3>
                    <p className="mt-1 text-[12px] leading-relaxed text-[#6F6889]">
                      Lubin can turn what you documented into structured prescription fields and
                      patient instructions, and point out missing information. It does not diagnose,
                      choose a medication, sign or issue. Manual entry below always works without it,
                      and every drafted medication needs your individual confirmation.
                    </p>
                    <button
                      type="button"
                      onClick={draftFromPlan}
                      disabled={aiLoading || !planText.trim()}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#3D2E6B] py-3.5 text-[13.5px] font-semibold text-white transition hover:bg-[#2A1F4D] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {aiLoading ? "Drafting…" : "Draft prescription from my plan"}
                    </button>

                    {aiError && (
                      <p className="mt-3 rounded-xl bg-[#FDF2F2] px-3 py-2 text-[12px] font-semibold text-[#9B3B33]">
                        {aiError}
                      </p>
                    )}
                    {missingInfo.length > 0 && (
                      <div className="mt-4 rounded-xl border border-[#EFE6D2] bg-[#FDF9EF] p-4">
                        <p className="text-[11.5px] font-bold uppercase tracking-wide text-[#8A6B1F]">
                          Missing information
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {missingInfo.map((m) => (
                            <span
                              key={m}
                              className="rounded-xl bg-white px-2.5 py-1 text-[12px] font-medium text-[#6B4E10] ring-1 ring-[#EFE6D2]"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {aiNote && (
                      <p className="mt-3 rounded-xl bg-[#FDF6E7] px-3 py-2 text-[12px] text-[#6B4E10]">
                        {aiNote}
                      </p>
                    )}
                    {suggestions.length > 0 && (
                      <div className="mt-4 space-y-3">
                        <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[#8A7FB0]">
                          Drafts for your review — confirm each one individually
                        </p>
                        {suggestions.map((s, i) => {
                          const key = suggestionKey(s, i);
                          const done = confirmedSuggestions.includes(key);
                          return (
                            <div
                              key={key}
                              className="rounded-xl border border-[#E9E2F8] bg-[#FBFAFE] p-4"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-[13.5px] font-bold text-[#3D2E6B]">
                                    {s.genericName || s.name}
                                  </p>
                                  <p className="mt-1 text-[12.5px] text-[#4B4468]">
                                    {s.dose} · {s.frequency}
                                    {s.duration ? ` · ${s.duration}` : ""}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => confirmSuggestion(s, key)}
                                  className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-[12px] font-semibold transition ${
                                    done
                                      ? "border border-[#D9CEF3] bg-white text-[#3D2E6B]"
                                      : "bg-[#3D2E6B] text-white"
                                  }`}
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  {done ? "Confirmed — add again" : "Confirm this medication"}
                                </button>
                              </div>
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
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  {/* Prescription entry */}
                  <section className={cardCls}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-[13.5px] font-bold text-[#3D2E6B]">
                        Medications on this prescription
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
                        <MedicationCard
                          key={m.id}
                          med={m}
                          index={i}
                          removable={meds.length > 1}
                          onRemove={() => setMeds((cur) => cur.filter((x) => x.id !== m.id))}
                          onPatch={(k, v) => patch(m.id, k, v)}
                          onPick={(item) => applyCatalogue(m.id, item)}
                        />
                      ))}
                    </div>
                  </section>
                </>
              )}
              </Acc>


              {/* ---------------- STEP 4 — REVIEW AND SIGN ---------------- */}
              <Acc
                index={3}
                label="Review and sign"
                hint="Read-only preview, then sign"
                open={step === 3}
                onToggle={setStep}
                done={false}
              >
                {() => (
                <>

                  <section className={cardCls}>
                    <h3 className="text-[13.5px] font-bold text-[#3D2E6B]">
                      Prescription preview
                    </h3>
                    <p className="mt-1 text-[12px] text-[#6F6889]">
                      Read-only. Clinical notes are never printed on the prescription.
                    </p>
                    <dl className="mt-3 grid gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-2">
                      <Detail label="Patient" value={patientName || "—"} />
                      <Detail
                        label="Date of birth / age"
                        value={`${dob || "—"}${ageYears !== undefined ? ` · ${ageYears} years` : ""}`}
                      />
                      <Detail label="Address" value={formatPhAddress(address) || "—"} />
                      <Detail label="Issue date" value={new Date().toLocaleDateString()} />
                      {isMinor && (
                        <Detail
                          label="Guardian"
                          value={`${guardian.name || "—"}${guardian.relationship ? ` (${guardian.relationship})` : ""}`}
                        />
                      )}
                      <Detail label="Prescriber" value={identity?.fullName || "—"} />
                      <Detail label="Clinic" value={identity?.clinicName || "—"} />
                      <Detail
                        label={country === "PH" ? "PRC / PTR" : "NPI / Licence"}
                        value={
                          country === "PH"
                            ? `${identity?.prcNumber || "—"} / ${identity?.ptrNumber || "—"}`
                            : `${identity?.npiNumber || "—"} / ${identity?.licenseNumber || "—"}`
                        }
                      />
                      <Detail
                        label={validity.label}
                        value={
                          validity.validUntil ? formatValidityDate(validity.validUntil) : "—"
                        }
                      />
                    </dl>

                    <ol className="mt-4 space-y-3">
                      {readyMeds.map((m, i) => (
                        <li key={m.id} className="rounded-xl border border-[#EDEBF3] bg-[#FBFAFE] p-4">
                          <p className="text-[13px] font-bold text-[#3D2E6B]">
                            {i + 1}. {m.genericName}
                            {m.brandName ? ` (${m.brandName})` : ""} {m.strength}
                          </p>
                          <p className="mt-1 text-[12.5px] text-[#4B4468]">
                            {m.sig ||
                              buildSig({
                                dose: m.dose,
                                route: m.route,
                                frequency: m.frequency,
                                duration: m.duration,
                              })}
                          </p>
                          <p className="mt-1 text-[12px] text-[#6F6889]">
                            Quantity {[m.quantity, m.unit].filter(Boolean).join(" ") || "—"} ·
                            Refills {m.refills || "none"}
                          </p>
                          {m.instructions.trim() && (
                            <p className="mt-1.5 text-[12px] text-[#4B4468]">
                              <span className="font-semibold">For the patient: </span>
                              {m.instructions}
                            </p>
                          )}
                          {m.pharmacistNotes.trim() && (
                            <p className="mt-1 text-[12px] text-[#4B4468]">
                              <span className="font-semibold">For the pharmacist: </span>
                              {m.pharmacistNotes}
                            </p>
                          )}
                        </li>
                      ))}
                    </ol>
                  </section>

                  <section className={cardCls}>
                    <h3 className="text-[13.5px] font-bold text-[#3D2E6B]">Safety review</h3>
                    <ul className="mt-2 space-y-1.5 text-[12.5px] text-[#4B4468]">
                      <li>Allergies — {ALLERGY_READINESS_LABEL[allergyState]}
                        {allergyState === "recorded" && allergyDetail ? `: ${allergyDetail}` : ""}
                      </li>
                      <li>
                        Current medications — {MEDICATION_READINESS_LABEL[medicationState]}
                        {medicationState === "recorded" && medicationDetail
                          ? `: ${medicationDetail}`
                          : ""}
                      </li>
                      <li>Conditions — {conditionsText || "Not provided"}</li>
                      {sex !== "male" && (
                        <li>Pregnancy / breastfeeding — {pregnancyText || "Not provided"}</li>
                      )}
                      <li>Controlled or dangerous drug — none on this prescription</li>
                    </ul>
                    {(allGaps.length > 0 || identityGaps.length > 0 || reviewOnly) && (
                      <div className="mt-3 rounded-xl border border-[#EFE6D2] bg-[#FDF9EF] p-3.5">
                        <p className="text-[12px] font-bold uppercase tracking-wide text-[#8A6B1F]">
                          Unresolved items
                        </p>
                        <ul className="mt-1.5 space-y-1 text-[12px] text-[#6B4E10]">
                          {[...allGaps, ...identityGaps].map((g) => (
                            <li key={g}>· {g}</li>
                          ))}
                          {reviewOnly && (
                            <li>· Medication not personally verified — review required</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </section>

                  <section className={cardCls}>
                    <h3 className="text-[13.5px] font-bold text-[#3D2E6B]">Attest and sign</h3>
                    <label className="mt-3 flex items-start gap-3 rounded-xl border border-[#E3DBF5] bg-[#FBFAFE] p-4">
                      <input
                        type="checkbox"
                        checked={attested}
                        onChange={(e) => setAttested(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-[#C9BCE9]"
                      />
                      <span className="text-[12.5px] text-[#4B4468]">
                        I assessed this patient, the medication and directions above are clinically
                        appropriate, and I am signing this prescription under my own professional
                        licence.
                      </span>
                    </label>

                    {reviewOnly ? (
                      <div className="mt-3 rounded-xl border border-[#EFE6D2] bg-[#FDF9EF] p-3.5">
                        <p className="text-[12.5px] font-semibold text-[#6B4E10]">
                          Immediate issuing is blocked
                        </p>
                        <p className="mt-1 text-[12px] text-[#6B4E10]">
                          You have not verified this medication yourself, so this prescription can
                          only be saved for clinical review.
                        </p>
                        <button
                          type="button"
                          onClick={() => setSavedForReview(true)}
                          className="mt-2 inline-flex h-9 items-center rounded-xl bg-[#3D2E6B] px-3.5 text-[12px] font-semibold text-white"
                        >
                          {savedForReview ? "Saved for clinical review" : "Save for clinical review"}
                        </button>
                      </div>
                    ) : (
                      <div className="mt-3">
                        {!otpCode || otpInvalidated ? (
                          <>
                            {otpInvalidated && (
                              <p className="mb-2 rounded-xl bg-[#FDF2F2] px-3 py-2 text-[12px] font-semibold text-[#9B3B33]">
                                The prescription changed after the last code was sent — that code is
                                no longer valid.
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={sendCode}
                              disabled={!attested || !canReview}
                              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#3D2E6B] px-4 text-[12.5px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
                            >
                              <Mail className="h-4 w-4" /> Send verification code
                            </button>
                          </>
                        ) : (
                          <>
                            <p className="text-[12px] text-[#6F6889]">
                              A 6-digit code was sent to your verified prescriber email. Prototype
                              code: <span className="font-bold text-[#3D2E6B]">{otpCode}</span>
                            </p>
                            <input
                              className={`${field} mt-2 tracking-[0.34em]`}
                              inputMode="numeric"
                              value={otpEntry}
                              onChange={(e) => {
                                setOtpEntry(e.target.value.replace(/\D/g, "").slice(0, 6));
                                setOtpError("");
                              }}
                              placeholder="000000"
                            />
                            {otpError && (
                              <p className="mt-2 text-[12px] font-semibold text-[#9B3B33]">
                                {otpError}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    {identityGaps.length > 0 && (
                      <p className="mt-3 flex items-start gap-2 rounded-xl bg-[#FDF6E7] px-3 py-2 text-[12px] font-semibold text-[#6B4E10]">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        Complete your prescriber details before signing: {identityGaps.join(", ")}.
                      </p>
                    )}
                  </section>
                </>
              )}
              </Acc>

            </>
          )}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[#EDEBF3] bg-white px-6 py-4">
          <p className="text-[11.5px] text-[#8A7FB0]">
            {issued
              ? "Prescription signed and recorded."
              : stepGaps.length > 0
                ? `Still needed: ${stepGaps.slice(0, 3).join(" · ")}`
                : "Ready to continue."}
          </p>
          <div className="flex items-center gap-2">
            {issued ? (
              <button
                type="button"
                onClick={() => {
                  resetAll();
                  onClose();
                }}
                className="inline-flex h-10 items-center rounded-xl bg-[#3D2E6B] px-5 text-[12.5px] font-semibold text-white"
              >
                Done
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => (step <= 0 ? onClose() : setStep(step - 1))}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#D8C7F0] bg-white px-4 text-[12.5px] font-semibold text-[#3D2E6B] transition hover:bg-[#FBF9FF]"
                >
                  {step <= 0 ? "Cancel" : (
                    <>
                      <ArrowLeft className="h-4 w-4" /> Back
                    </>
                  )}
                </button>
                {step < 3 ? (
                  <button
                    type="button"
                    onClick={() => setStep(step < 0 ? 0 : step + 1)}
                    disabled={step >= 0 && !canAdvance}

                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#3D2E6B] px-5 text-[12.5px] font-semibold text-white transition hover:bg-[#33265A] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {step === 2 ? "Review prescription" : "Continue"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={signAndIssue}
                    disabled={!canSign}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#3D2E6B] px-5 text-[12.5px] font-semibold text-white transition hover:bg-[#33265A] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <ShieldCheck className="h-4 w-4" /> Sign and issue
                  </button>
                )}
              </>
            )}
          </div>
        </footer>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(drawer, document.body);
}

function Detail({ label: l, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className={label}>{l}</dt>
      <dd className="text-[#3D2E6B]">{value}</dd>
    </div>
  );
}

function MedicationCard({
  med,
  index,
  removable,
  onRemove,
  onPatch,
  onPick,
}: {
  med: MedForm;
  index: number;
  removable: boolean;
  onRemove: () => void;
  onPatch: (key: keyof MedForm, value: string | boolean) => void;
  onPick: (item: PhCatalogueItem) => void;
}) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchPhCatalogue(query), [query]);
  const item = findPhCatalogue(med.genericName);

  return (
    <div className="rounded-xl border border-[#EDEBF3] bg-[#FBFAFE] p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11.5px] font-bold uppercase tracking-wide text-[#8A7FB0]">
          Medication {index + 1}
        </p>
        {removable && (
          <button
            type="button"
            aria-label={`Remove medication ${index + 1}`}
            onClick={onRemove}
            className="rounded-lg p-1.5 text-[#A89BD0] transition hover:bg-[#FDF2F2] hover:text-[#B4483F]"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-3">
        <label className={label}>
          Search the Philippine catalogue
          <FieldHint text="Search by generic (INN) or brand name. The generic name is always used first on the prescription." />
        </label>
        <div className="relative mt-1.5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A89BD0]" />
          <input
            className={`${field} pl-9`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. losartan or Cozaar"
          />
        </div>
        {results.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {results.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(r);
                    setQuery("");
                  }}
                  className="w-full rounded-xl border border-[#EDEBF3] bg-white px-3 py-2 text-left transition hover:border-[#C9BCE9]"
                >
                  <span className="block text-[12.5px] font-semibold text-[#3D2E6B]">
                    {r.generic}
                  </span>
                  <span className="block text-[11.5px] text-[#8A7FB0]">
                    {r.brands.join(", ") || "No brand listed"}
                    {r.className ? ` · ${r.className}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {med.dangerous && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-[#FDF2F2] px-3 py-2 text-[12px] font-semibold text-[#9B3B33]">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {PHASE1_DANGEROUS_MESSAGE}
        </p>
      )}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label}>Generic name</label>
          <input
            className={`${field} mt-1.5`}
            value={med.genericName}
            onChange={(e) => onPatch("genericName", e.target.value)}
            placeholder="e.g. Losartan potassium"
          />
        </div>
        <div>
          <label className={label}>Brand (optional)</label>
          <input
            className={`${field} mt-1.5`}
            value={med.brandName}
            onChange={(e) => onPatch("brandName", e.target.value)}
            placeholder="e.g. Cozaar"
          />
        </div>
        <div>
          <label className={label}>Strength / form</label>
          {item ? (
            <select
              className={`${field} mt-1.5`}
              value={med.strength}
              onChange={(e) => onPatch("strength", e.target.value)}
            >
              <option value="">Select strength and form</option>
              {item.forms.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          ) : (
            <input
              className={`${field} mt-1.5`}
              value={med.strength}
              onChange={(e) => onPatch("strength", e.target.value)}
              placeholder="50 mg tablet"
            />
          )}
        </div>
        <div>
          <label className={label}>Route</label>
          {item ? (
            <select
              className={`${field} mt-1.5`}
              value={med.route}
              onChange={(e) => onPatch("route", e.target.value)}
            >
              {item.routes.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          ) : (
            <input
              className={`${field} mt-1.5`}
              value={med.route}
              onChange={(e) => onPatch("route", e.target.value)}
              placeholder="Oral"
            />
          )}
        </div>
        <div>
          <label className={label}>Dose</label>
          <input
            className={`${field} mt-1.5`}
            value={med.dose}
            onChange={(e) => onPatch("dose", e.target.value)}
            placeholder="50 mg"
          />
        </div>
        <div>
          <label className={label}>Frequency</label>
          <input
            className={`${field} mt-1.5`}
            value={med.frequency}
            onChange={(e) => onPatch("frequency", e.target.value)}
            placeholder="Once daily in the morning"
          />
        </div>
        <div>
          <label className={label}>Duration</label>
          <input
            className={`${field} mt-1.5`}
            value={med.duration}
            onChange={(e) => onPatch("duration", e.target.value)}
            placeholder="4 weeks, then review"
          />
        </div>
        <div>
          <label className={label}>Refills</label>
          <select
            className={`${field} mt-1.5`}
            value={med.refills}
            onChange={(e) => onPatch("refills", e.target.value)}
          >
            {["No refills", "1 refill", "2 refills", "3 refills"].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Quantity to dispense</label>
          <input
            className={`${field} mt-1.5`}
            value={med.quantity}
            onChange={(e) => onPatch("quantity", e.target.value)}
            placeholder="30"
          />
        </div>
        <div>
          <label className={label}>Dispensing unit</label>
          <select
            className={`${field} mt-1.5`}
            value={med.unit}
            onChange={(e) => onPatch("unit", e.target.value)}
          >
            {["tablets", "capsules", "mL", "bottles", "sachets"].map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={label}>
            SIG (generated — editable)
            <FieldHint text="Assembled from dose, route, frequency and duration. Edit it and your wording is kept." />
          </label>
          <textarea
            rows={2}
            className={`${area} mt-1.5`}
            value={med.sig}
            onChange={(e) => {
              onPatch("sigEdited", true);
              onPatch("sig", e.target.value);
            }}
            placeholder="Take 50 mg by oral route once daily in the morning for 4 weeks."
          />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Patient instructions</label>
          <textarea
            rows={2}
            className={`${area} mt-1.5`}
            value={med.instructions}
            onChange={(e) => onPatch("instructions", e.target.value)}
            placeholder="Take with food. Do not stop suddenly."
          />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Pharmacist notes</label>
          <input
            className={`${field} mt-1.5`}
            value={med.pharmacistNotes}
            onChange={(e) => onPatch("pharmacistNotes", e.target.value)}
            placeholder="e.g. Dispense generic; counsel on nausea"
          />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Internal follow-up note (not printed)</label>
          <input
            className={`${field} mt-1.5`}
            value={med.internalNotes}
            onChange={(e) => onPatch("internalNotes", e.target.value)}
            placeholder="e.g. Check response and tolerability at 4 weeks"
          />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Follow-up needed</label>
          <input
            className={`${field} mt-1.5`}
            value={med.followUp}
            onChange={(e) => onPatch("followUp", e.target.value)}
            placeholder="Review in 4 weeks before continuing"
          />
        </div>
      </div>
    </div>
  );
}

function Acc({
  index,
  label,
  hint,
  open,
  done,
  onToggle,
  children,
}: {
  index: number;
  label: string;
  hint?: string;
  open: boolean;
  done?: boolean;
  onToggle: (i: number) => void;
  children: () => React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#E3DBF5] bg-white">
      <button
        type="button"
        onClick={() => onToggle(open ? -1 : index)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-[#FBF9FF]"
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${
            done
              ? "bg-[#3D2E6B] text-white"
              : open
                ? "border border-[#3D2E6B] text-[#3D2E6B]"
                : "border border-[#E5DDF4] text-[#A89BCA]"
          }`}
        >
          {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-bold text-[#3D2E6B]">{label}</span>
          {hint && <span className="mt-0.5 block text-[11.5px] text-[#8A7FB0]">{hint}</span>}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#A89BCA] transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="space-y-5 border-t border-[#EDEBF3] bg-[#FBF9FF] px-5 py-5">
          {children()}
        </div>
      )}
    </section>
  );
}
