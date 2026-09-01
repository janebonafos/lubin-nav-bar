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
  Plus,
  Search,
  ShieldCheck,
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
  listSignedPrescriptions,
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
import { getResponse } from "@/lib/intake/store";
import { loadHealthDetails } from "@/lib/intake/healthDetails";
import {
  ALLERGY_READINESS_LABEL,
  CONSULT_MODE_LABEL,
  MEDICATION_READINESS_LABEL,
  emptyGuardian,
  emptyPhAddress,
  findDuplicateMatches,
  formatPhAddress,
  type AllergyReadiness,
  type ConsultMode,
  type Guardian,
  type MedicationReadiness,
  type PhAddress,
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
const SOAP_FULL_LABEL: Record<keyof SoapNote, string> = {
  subjective: "S — Subjective",
  objective: "O — Objective",
  assessment: "A — Assessment",
  plan: "P — Plan",
};
/**
 * Assistive drafting never invents clinical information. Anything the provider
 * did not supply is marked with this phrase and must be completed by hand.
 */
const NEEDS_CONFIRMATION = "Needs provider confirmation";

/**
 * Neutral placeholders used when the provider's notes contain nothing for a
 * section. The draft never claims a section is "not required" and never
 * fabricates findings, diagnoses or treatment.
 */
const NO_OBJECTIVE = "No objective findings documented.";
const NO_ASSESSMENT = "Assessment not yet documented.";
const NO_PLAN = "Plan not yet documented.";
const SOAP_PLACEHOLDERS = [NO_OBJECTIVE, NO_ASSESSMENT, NO_PLAN, NEEDS_CONFIRMATION];

/** Placeholder text is a visible gap, never documented content. */
function isSoapPlaceholder(value: string): boolean {
  const v = value.trim();
  return !v || SOAP_PLACEHOLDERS.some((p) => v === p);
}

const OBJECTIVE_HINTS =
  /\b(bp|blood pressure|hr|heart rate|pulse|temp|temperature|spo2|sat|rr|weight|kg|lbs|bmi|exam|examination|auscultation|chest|abdomen|lungs|clear|tender|swelling|rash|mmhg|bpm|°c|celsius|lab|labs|result|x-ray|ecg|cbc|glucose)\b/i;
const PLAN_HINTS =
  /\b(start|started|continue|continued|prescribe|prescribed|advis|recommend|refer|follow[- ]?up|review in|monitor|increase|decrease|taper|stop|counsel|instruct|return if|rest|hydrat)\b/i;
const NEGATIVE_HINTS = /\b(no|denies|without|negative for|absent)\b/i;

/** Splits raw dictation into sentence-like fragments, preserving every fact. */
function soapSentences(raw: string): string[] {
  return raw
    .split(/\n+|(?<=[.;!?])\s+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/**
 * Organises the provider's own words into S/O/A/P. Nothing is invented: each
 * sentence is routed to a section, negatives are preserved verbatim, and empty
 * sections receive a neutral placeholder.
 */
function organiseSoap(raw: string): {
  soap: SoapNote;
  aiFields: (keyof SoapNote)[];
  questions: string[];
} {
  const sentences = soapSentences(raw);
  const objective: string[] = [];
  const plan: string[] = [];
  const subjective: string[] = [];

  for (const s of sentences) {
    if (PLAN_HINTS.test(s)) plan.push(s);
    else if (OBJECTIVE_HINTS.test(s) && /\d/.test(s)) objective.push(s);
    else if (OBJECTIVE_HINTS.test(s) && !NEGATIVE_HINTS.test(s)) objective.push(s);
    else subjective.push(s);
  }

  const subjectiveText = subjective.length
    ? subjective
        .map((s) => (/^patient|^pt\b/i.test(s) ? s : `Patient reports ${s.charAt(0).toLowerCase()}${s.slice(1)}`))
        .join(" ")
        .replace(/\.\./g, ".")
    : raw.trim();

  // The assessment restates the documented complaint without adding a cause.
  const durationMatch = raw.match(/(\d+\s*(?:day|days|week|weeks|month|months|year|years))/i);
  const complaint = (subjective[0] ?? sentences[0] ?? "")
    .replace(/^patient (reports|has|complains of|c\/o)\s*/i, "")
    .replace(/\.$/, "");
  const assessment = complaint
    ? `${complaint.charAt(0).toUpperCase()}${complaint.slice(1)}${
        durationMatch && !complaint.toLowerCase().includes(durationMatch[1]!.toLowerCase())
          ? ` of ${durationMatch[1]} duration`
          : ""
      }; cause not yet established.`
    : NO_ASSESSMENT;

  const soap: SoapNote = {
    subjective: subjectiveText,
    objective: objective.length ? objective.join(" ") : NO_OBJECTIVE,
    assessment,
    plan: plan.length ? plan.join(" ") : NO_PLAN,
  };

  const questions: string[] = [];
  if (!objective.length)
    questions.push("Were any findings or vitals obtained today (BP, HR, temperature, exam)?");
  if (assessment === NO_ASSESSMENT)
    questions.push("What is your working clinical impression for this visit?");
  if (!plan.length)
    questions.push("What treatment, medication or investigation are you planning?");
  if (!/follow[- ]?up|review in|return/i.test(raw))
    questions.push("When should this patient be reviewed again?");

  return {
    soap,
    aiFields: ["subjective", "objective", "assessment", "plan"],
    questions,
  };
}





/** Is this a new treatment, or a continuation of something already prescribed? */
type RxPurposeChoice = "new" | "renewal";
const PURPOSE_OPTIONS: { value: RxPurposeChoice; title: string; description: string }[] = [
  {
    value: "new",
    title: "New treatment",
    description: "A medication this patient is not already taking. A SOAP note is required.",
  },
  {
    value: "renewal",
    title: "Medication renewal",
    description:
      "Continue a medication the patient is already taking, using a focused renewal review.",
  },
];

/** Where the clinical assessment supporting a NEW treatment was documented. */
type EntryPoint = "lubin" | "outside" | "standalone" | "renewal";
const ENTRY_POINTS: { value: EntryPoint; title: string; short: string; description: string }[] = [
  {
    value: "lubin",
    title: "Use SOAP from a Lubin consultation",
    short: "Lubin consultation",
    description:
      "Link this prescription to an appointment you completed in Lubin. Its SOAP note is reused.",
  },
  {
    value: "outside",
    title: "Add SOAP from an outside consultation",
    short: "Outside consultation",
    description:
      "Use this when you personally assessed the patient in your clinic or another telehealth system.",
  },
  {
    value: "standalone",
    title: "Document assessment now — no Lubin appointment",
    short: "Assessment documented now",
    description:
      "Use when you personally assessed the patient in person, by video or by phone.",
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

/** Normalise a date of birth value to ISO `YYYY-MM-DD` so the `<input type="date">`
 *  and age calculation always work, even when a stored record used a locale
 *  format such as `12/05/1996` or `Dec 5, 1996`. Returns "" when unparseable. */
function normalizeDob(value: string): string {
  const v = (value ?? "").trim();
  if (!v) return "";
  // Already ISO — pass through.
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const parsed = new Date(v);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    // Guard against absurd years from malformed strings.
    if (y > 1000 && y < 2100) return `${y}-${m}-${d}`;
  }
  // numeric split: 12/05/1996 or 12-05-1996 — assume MM/DD/YYYY (en-PH/en-US).
  const parts = v.split(/[/-]/).map((p) => p.trim());
  if (parts.length === 3) {
    const [a, b, c] = parts.map((p) => parseInt(p, 10));
    if (c > 1000 && c < 2100 && a >= 1 && a <= 12 && b >= 1 && b <= 31) {
      return `${c}-${String(a).padStart(2, "0")}-${String(b).padStart(2, "0")}`;
    }
    // YYYY/MM/DD
    if (a > 1000 && a < 2100 && b >= 1 && b <= 12 && c >= 1 && c <= 31) {
      return `${a}-${String(b).padStart(2, "0")}-${String(c).padStart(2, "0")}`;
    }
  }
  return v;
}

function ageFromDob(dob: string): number | undefined {
  if (!dob) return undefined;
  const iso = normalizeDob(dob);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : undefined;
}

/**
 * Details an existing patient already provided themselves: the intake answers
 * for any of their appointments, plus the Health Passport details they shared
 * with this practice. Used only to prefill blank fields — nothing is invented.
 */
function sharedPatientDetails(record: PatientRecordView): Record<string, string> {
  const out: Record<string, string> = {};
  for (const appointmentId of record.appointmentIds) {
    const values = getResponse(appointmentId).values ?? {};
    for (const [id, value] of Object.entries(values)) {
      const v = String(value ?? "").trim();
      if (v && !out[id]) out[id] = v;
    }
  }
  if (record.passport) {
    for (const [id, value] of Object.entries(loadHealthDetails())) {
      const v = String(value ?? "").trim();
      if (v && !out[id]) out[id] = v;
    }
  }
  return out;
}



const field =
  "h-10 w-full rounded-xl border border-[#E3DBF5] bg-white px-3 text-[13px] text-[#3D2E6B] placeholder:text-[#A89BD0] focus:border-[#7E6BAF] focus:outline-none";
const area =
  "w-full rounded-xl border border-[#E3DBF5] bg-white px-3 py-2 text-[13px] text-[#3D2E6B] placeholder:text-[#A89BD0] focus:border-[#7E6BAF] focus:outline-none";
const label = "text-[11px] font-semibold uppercase tracking-wide text-[#8A7FB0]";
const cardCls = "rounded-2xl border border-[#E9E2F8] bg-white p-5";
const chevron =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236F6889' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")";
const selectField =
  "h-10 w-full appearance-none rounded-xl border border-[#E3DBF5] bg-white px-3 pr-9 text-[13px] text-[#3D2E6B] focus:border-[#7E6BAF] focus:outline-none bg-no-repeat [background-position:right_0.7rem_center] [background-size:1rem_1rem]";
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
  appointmentId,
}: {
  open: boolean;
  onClose: () => void;
  onIssued?: (doc: SignedPrescriptionDocument) => void;
  /** When opened from an appointment, that consultation's SOAP is linked automatically. */
  appointmentId?: string;
}) {
  const [identity, setIdentity] = useState<PrescriberIdentity | null>(null);
  const [country, setCountry] = useState<RxCountry>("PH");
  const [step, setStep] = useState(0);

  // ---------- Step 1: patient ----------
  const [records, setRecords] = useState<PatientRecordView[]>([]);
  const [patientQuery, setPatientQuery] = useState("");
  const [selected, setSelected] = useState<PatientRecordView | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  /** Existing patients show saved details read-only until the prescriber edits them. */
  const [editPatient, setEditPatient] = useState(false);


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
  // Nothing clinical is preselected — the prescriber chooses every clinical fact.
  const [purpose, setPurpose] = useState<RxPurposeChoice | null>(null);
  const [entry, setEntry] = useState<EntryPoint | null>(null);
  const [linkedAppointment, setLinkedAppointment] = useState<string>("");
  const [apptSearch, setApptSearch] = useState("");
  const [reviewSoapOpen, setReviewSoapOpen] = useState(false);
  /** Existing patients confirm or update the safety information already on file. */
  const [allergyConfirm, setAllergyConfirm] = useState<"idle" | "unchanged" | "update">("idle");
  const [medsConfirm, setMedsConfirm] = useState<"idle" | "unchanged" | "update">("idle");
  const [materialChange, setMaterialChange] = useState<
    "none" | "update" | "reassess" | null
  >(null);
  const [consultDate, setConsultDate] = useState("");
  const [consultMode, setConsultMode] = useState<ConsultMode | null>(null);
  const [consultLocation, setConsultLocation] = useState("");
  /** How the provider wants to produce the SOAP note. AI drafting is open by
   *  default — writing manually is the secondary action. */
  const [soapMode, setSoapMode] = useState<"ai" | "manual">("ai");
  const [pastedNote, setPastedNote] = useState("");
  const [soapDrafted, setSoapDrafted] = useState(false);
  /** The provider must explicitly review and approve the note. */
  const [soapApproved, setSoapApproved] = useState(false);
  /** Which sections still carry AI wording, so they can be highlighted. */
  const [aiFields, setAiFields] = useState<Record<keyof SoapNote, boolean>>({
    subjective: false,
    objective: false,
    assessment: false,
    plan: false,
  });
  /** Targeted questions the assistant asks instead of guessing. */
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);


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
    refills: "",
    followUp: "",
  });
  /** Which previously signed prescription the renewal was prefilled from. */
  const [renewalSource, setRenewalSource] = useState("");
  /** Optional extra renewal detail, collapsed by default. */
  const [renewalMore, setRenewalMore] = useState(false);
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

  /** Opened from an appointment: link and reuse that consultation's SOAP, no search. */
  const fromAppointment = appointmentId
    ? ELIGIBLE_APPOINTMENTS.find((a) => a.id === appointmentId)
    : undefined;
  useEffect(() => {
    if (!open || !fromAppointment) return;
    setPurpose("new");
    setEntry("lubin");
    setLinkedAppointment(fromAppointment.id);
  }, [open, fromAppointment]);

  /** Only this patient's completed Lubin consultations are eligible. */
  const patientForAppointments = (selected?.fullName || patientName).trim().toLowerCase();
  const patientAppointments = ELIGIBLE_APPOINTMENTS.filter(
    (a) => !patientForAppointments || a.patient.trim().toLowerCase() === patientForAppointments,
  );

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
  if (!preferredName.trim()) patientGaps.push("Preferred name");
  if (!dob) patientGaps.push("Date of birth");
  if (sex === "not-documented") patientGaps.push("Sex");
  // City / municipality is the only address field required to issue a
  // prescription; the rest are optional. It identifies the patient's
  // locality on the prescription.
  if (!address.city.trim()) patientGaps.push("City / municipality");
  if (isMinor && (!guardian.name.trim() || !guardian.contact.trim()))
    patientGaps.push("Parent or legal guardian details");

  /** Safety information already on file for an existing patient (synthetic demo data). */
  const savedAllergyEntries = (selected?.info?.allergyEntries ?? []).map((e) => e.name).filter(Boolean);
  const savedMedicationEntries = (selected?.info?.medicationEntries ?? [])
    .map((e) => e.name)
    .filter(Boolean);
  const savedAllergies =
    savedAllergyEntries.length > 0
      ? savedAllergyEntries.join(", ")
      : selected?.info?.allergyState === "none-known"
        ? "No known allergies"
        : "Nothing recorded on file";
  const savedMedications =
    savedMedicationEntries.length > 0
      ? savedMedicationEntries.join(", ")
      : selected?.info?.medicationState === "none-known"
        ? "Nothing currently"
        : "Nothing recorded on file";
  /** Whether the record actually holds safety information to reconfirm. When it
   *  does not, the prescriber records it here instead of confirming nothing. */
  const allergyOnFile =
    savedAllergyEntries.length > 0 || selected?.info?.allergyState === "none-known";
  const medicationOnFile =
    savedMedicationEntries.length > 0 || selected?.info?.medicationState === "none-known";
  const savedAllergyState: AllergyReadiness =
    savedAllergyEntries.length > 0 ? "recorded" : "none-known";
  const savedMedicationState: MedicationReadiness =
    savedMedicationEntries.length > 0 ? "recorded" : "nothing";

  // Step 2 — clinical documentation. One note per prescription: an existing SOAP,
  // a focused SOAP, or a focused renewal note. Never both a SOAP and a
  // separate clinical-context questionnaire.
  const contextGaps: string[] = [];
  if (!purpose) contextGaps.push("Treatment type");
  if (purpose === "new" && !entry) contextGaps.push("The clinical note supporting this prescription");
  if (purpose === "new" && entry === "lubin") {
    if (!linkedAppointment) contextGaps.push("A completed Lubin consultation");
    else {
      for (const k of missingFromLinked) {
        if (k === "objective") continue; // objective findings are optional
        if (!soap[k].trim()) contextGaps.push(`${SOAP_LABEL[k]} (missing from the reused note)`);
        else if (soap[k].includes(NEEDS_CONFIRMATION))
          contextGaps.push(`${SOAP_LABEL[k]} needs provider confirmation`);
      }

      if (!materialChange) contextGaps.push("Whether clinical information has changed");
      if (materialChange === "reassess")
        contextGaps.push("A new assessment — this patient needs reassessment");
    }
  }
  if (purpose === "new" && (entry === "outside" || entry === "standalone")) {
    if (entry === "outside" && !consultDate) contextGaps.push("Consultation date");
    if (!consultMode) contextGaps.push("Consultation method");
    if (soapMode === "ai") {
      if (!pastedNote.trim()) contextGaps.push("Add clinical notes");
      else if (!soapDrafted) contextGaps.push("Draft the SOAP note with AI");
    }
    if (soapMode === "manual" || soapDrafted) {
      if (isSoapPlaceholder(soap.subjective)) contextGaps.push("Subjective");
      if (isSoapPlaceholder(soap.assessment)) contextGaps.push("Confirm assessment");
      if (isSoapPlaceholder(soap.plan)) contextGaps.push("Add evaluation or treatment plan");
      if (!soapApproved) contextGaps.push("Confirm SOAP draft");
    }

  }

  if (purpose === "renewal") {
    if (!renewal.medication.trim()) contextGaps.push("Current medication and directions (SIG)");
    if (!renewal.response.trim()) contextGaps.push("Is the medication helping?");
    if (!renewal.sideEffects.trim()) contextGaps.push("Any side effects?");
    if (!renewal.changes.trim()) contextGaps.push("Any medication or allergy changes?");
  }

  /** Everything still missing from the clinical note itself, without the
   *  separate safety confirmation. Statuses must never claim a note is
   *  complete while one of these remains. */
  const soapGaps = [...contextGaps];

  // "Not assessed" is a real state and blocks review and signing.
  if (allergyState === "not-assessed") contextGaps.push("Review allergies");
  if (medicationState === "not-assessed") contextGaps.push("Review current medications");

  /** Visible SOAP status for the Step 2 accordion and the standalone card. */
  const soapTouched = Boolean(
    soap.subjective.trim() || soap.objective.trim() || soap.assessment.trim() || soap.plan.trim(),
  );
  const renewalTouched = Boolean(
    renewal.medication.trim() ||
      renewal.response.trim() ||
      renewal.sideEffects.trim() ||
      renewal.changes.trim(),
  );
  const soapStatusLabel =
    purpose === "renewal"
      ? soapGaps.length === 0
        ? "Quick renewal review complete"
        : renewalTouched
          ? "Quick renewal review incomplete"
          : "Quick renewal review not started"
      : entry === "lubin" && linkedAppt && missingFromLinked.length === 0 && soapGaps.length === 0
        ? "Existing SOAP reused"
        : soapGaps.length === 0 && (soapTouched || Boolean(linkedAppt))
          ? "SOAP note complete"
          : soapTouched || Boolean(linkedAppt)
            ? "SOAP note incomplete"
            : "SOAP note not started";
  const soapSourceLabel =
    entry === "lubin"
      ? "Existing SOAP note from a completed Lubin consultation"
      : entry === "outside"
        ? "Focused SOAP note — consultation completed outside Lubin"
        : purpose === "renewal"
          ? "Quick renewal review"
          : "Focused SOAP note — assessment documented at prescribing";
  const soapDateLabel =
    entry === "lubin"
      ? linkedAppt?.date || "Not selected"
      : entry === "outside"
        ? consultDate || "Not documented"
        : new Date().toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });

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
  /** Steps 2–4 only open once Step 1 holds a complete patient. */
  const patientReady =
    (!!patientName.trim() || creatingNew || !!selected) && patientGaps.length === 0;
  /** Review and sign stays locked until steps 1–3 are genuinely complete. */
  const goStep = (i: number) => {
    if (i > 0 && !patientReady) return;
    if (i === 3 && !canReview) return;
    setStep(i);
  };


  /** Previously signed prescriptions for this patient — the renewal source. */
  const previousPrescriptions = useMemo(() => {
    const name = (selected?.fullName || patientName).trim();
    if (!name) return [];
    return listSignedPrescriptions({ patientName: name }).slice(0, 5);
  }, [selected, patientName, open]);

  /** Prefills the renewal review and the prescription from a past prescription. */
  function prefillRenewal(doc: SignedPrescriptionDocument) {
    const m = doc.medications[0];
    if (!m) return;
    setRenewalSource(doc.id);
    setRenewal((r) => ({
      ...r,
      medication: [m.genericName || m.name, m.strength, m.frequency].filter(Boolean).join(" · "),
      indication: m.indication ?? r.indication,
      quantity: m.quantity ?? r.quantity,
      refills: m.refills ?? r.refills,
      followUp: m.followUp ?? r.followUp,
    }));
    setMeds([
      {
        ...emptyMed(),
        genericName: m.genericName || m.name,
        brandName: m.genericName ? m.name : "",
        strength: m.strength ?? "",
        route: m.route ?? "",
        dose: m.dose ?? "",
        frequency: m.frequency ?? "",
        quantity: (m.quantity ?? "").replace(/[^\d]/g, ""),
        unit: (m.quantity ?? "").replace(/[\d\s]/g, "") || "tablets",
        refills: m.refills ?? "",
        sig: [m.dose, m.frequency].filter(Boolean).join(" "),
        instructions: m.instructions ?? "",
        followUp: m.followUp ?? "",
      },
    ]);
  }
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
    soapMode,
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
    // What the patient already provided — the clinical record first, then the
    // intake answers / Health Passport details they shared for their visits.
    const shared = sharedPatientDetails(record);
    const pick = (a: string | undefined, ...ids: string[]) => {
      const v = (a ?? "").trim();
      if (v) return v;
      for (const id of ids) {
        const s = (shared[id] ?? "").trim();
        if (s) return s;
      }
      return "";
    };
    setSelected(record);
    setCreatingNew(false);
    setEditPatient(false);
    setPatientName(pick(record.fullName, "identity.fullName"));
    setPreferredName(pick(undefined, "identity.preferredName"));
    setDob(normalizeDob(pick(record.info.dob, "identity.dob")));
    const recordSex = (record.info.sex as PatientSex) ?? "not-documented";
    const sharedSex = (shared["identity.gender"] ?? "").trim().toLowerCase();
    setSex(
      recordSex !== "not-documented"
        ? recordSex
        : SEX_OPTIONS.some((o) => o.value === sharedSex)
          ? (sharedSex as PatientSex)
          : recordSex,
    );
    const existing = (record.info.address ?? "").split(",").map((p) => p.trim());
    const sharedAddress = (shared["contact.address"] ?? "").split(",").map((p) => p.trim());
    setAddress({
      street: existing[0] ?? "",
      barangay: existing[1] ?? "",
      city: existing[2] || sharedAddress[0] || "",
      province: existing[3] || sharedAddress[1] || "",
      postalCode: existing[4] ?? "",
    });
    setPatientEmail(pick(record.info.email, "contact.email"));
    setPatientPhone(pick(record.info.phone, "contact.phone"));
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
    setPurpose(null);
    setEntry(null);
    setConsultMode(null);
    setLinkedAppointment("");
    setApptSearch("");
    setReviewSoapOpen(false);
    setMaterialChange(null);
    setConsultDate("");
    setConsultLocation("");
    setSoapMode("ai");
    setPastedNote("");
    setSoapDrafted(false);
    setSoapApproved(false);
    setAiFields({ subjective: false, objective: false, assessment: false, plan: false });
    setAiQuestions([]);


    setSoap({ subjective: "", objective: "", assessment: "", plan: "" });
    setObjectiveMode("none");
    setRenewal({
      medication: "",
      indication: "",
      lastAssessment: "",
      response: "",
      sideEffects: "",
      adherence: "",
      changes: "",
      allergyChanges: "",
      quantity: "",
      refills: "",
      followUp: "",
    });
    setRenewalSource("");
    setRenewalMore(false);
    setSavedForReview(false);
    setAllergyState("not-assessed");
    setAllergyDetail("");
    setMedicationState("not-assessed");
    setMedicationDetail("");
    setReviewedNoChanges(false);
    setConditionsText("");
    setPregnancyText("");
    setWeightText("");
    setBpText("");
    setHrText("");
    setOtherVitalsText("");
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

  /** The clinical plan the prescription is prepared from. */
  const planText =
    purpose === "renewal"
      ? [renewal.medication, renewal.indication, renewal.response].filter(Boolean).join(" · ")
      : [effectiveSoap.assessment, effectiveSoap.plan].filter(Boolean).join(" ");

  /**
   * Design-only assistive drafting. Everything below is produced locally from
   * fictional fixture data — no AI service, network call or backend is involved.
   */
  function prepareSoapDraft() {
    const raw = pastedNote.trim();
    if (!raw) return;
    setAiLoading(true);
    window.setTimeout(() => {
      const { soap: drafted, aiFields: drafts, questions } = organiseSoap(raw);
      setSoap(drafted);
      setAiFields({
        subjective: drafts.includes("subjective"),
        objective: drafts.includes("objective"),
        assessment: drafts.includes("assessment"),
        plan: drafts.includes("plan"),
      });
      setAiQuestions(questions);
      setSoapApproved(false);
      setSoapDrafted(true);
      setAiLoading(false);
      // Take the provider straight to the generated note.
      window.setTimeout(() => {
        document
          .getElementById("soap-generated-sections")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    }, 1200);
  }



  function draftFromPlan() {
    setAiLoading(true);
    setAiError("");
    setAiNote("");
    setMissingInfo([]);
    const source = `${planText} ${effectiveSoap.subjective}`.toLowerCase();
    const hits = searchPhCatalogue(source ? source.slice(0, 60) : "")
      .filter((c) => source.includes(c.generic.toLowerCase()))
      .slice(0, 2);
    const drafts: AiMedication[] = hits.map((c) => ({
      name: c.generic,
      genericName: c.generic,
      dose: `1 ${c.unit.replace(/s$/, "")}`,
      route: c.routes[0] ?? "Oral",
      frequency: "once daily",
      duration: "30 days",
      indication: effectiveSoap.assessment || renewal.indication || undefined,
      instructions: `Take 1 ${c.unit.replace(/s$/, "")} by ${(c.routes[0] ?? "oral").toLowerCase()} route once daily.`,
      rationale: "Drafted from your documented Plan — fictional prototype suggestion.",
    }));
    const gaps: string[] = [];
    if (!effectiveSoap.assessment.trim()) gaps.push("Assessment / indication");
    if (allergyState !== "recorded" && allergyState !== "none-known") gaps.push("Allergy status");
    if (medicationState !== "recorded" && medicationState !== "nothing")
      gaps.push("Current medications");
    window.setTimeout(() => {
      setSuggestions(drafts);
      setMissingInfo(gaps);
      setConfirmedSuggestions([]);
      setAiNote(
        drafts.length === 0
          ? "No medication could be drafted from the documented Plan. Name the medication in your Plan, or enter it manually below."
          : "AI-assisted draft — provider review required. Nothing is added to the prescription until you confirm it.",
      );
      setAiLoading(false);
    }, 400);
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

    // The SOAP Assessment is the indication — the provider never retypes it.
    const indication = purpose === "renewal" ? renewal.indication : effectiveSoap.assessment;


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
                Patient, clinical documentation, prescription, then review and sign. Documented
                information is reused, never retyped.
              </p>
              <p className="mt-2 inline-flex rounded-xl bg-[#F4F0FE] px-2.5 py-1 text-[11px] font-semibold text-[#6F5BA0]">
                Design prototype — fictional data only. Not for clinical use.
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

        {/* Compact patient summary — stays visible through steps 2–4 */}
        {!issued && hasPatient && patientGaps.length === 0 && step > 0 && (
          <div className="shrink-0 border-b border-[#EDEBF3] bg-[#F7F4FE] px-6 py-2.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-[12.5px] font-bold text-[#3D2E6B]">
                {patientName || "Patient"}
              </span>
              <span className="text-[11.5px] text-[#6F6889]">
                {ageYears !== undefined ? `${ageYears} yrs` : dob || "DOB —"} ·{" "}
                {sex === "not-documented" ? "Sex —" : sex.replace(/-/g, " ")}
              </span>
              <span className="text-[11.5px] font-semibold text-[#3D2E6B]">
                Allergies:{" "}
                {allergyState === "recorded"
                  ? allergyDetail || "recorded"
                  : allergyState === "none-known"
                    ? "none known"
                    : "not yet reviewed"}
              </span>
              <span className="text-[11.5px] text-[#6F6889]">
                Medications:{" "}
                {medicationState === "recorded"
                  ? medicationDetail || "recorded"
                  : medicationState === "nothing"
                    ? "none"
                    : "not yet reviewed"}
              </span>
              <button
                type="button"
                onClick={() => setStep(0)}
                className="ml-auto text-[11.5px] font-semibold text-[#6F5BA0] underline decoration-[#D9CEF3] underline-offset-2 transition hover:text-[#3D2E6B]"
              >
                Change patient
              </button>
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">

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
              {identityGaps.length > 0 && (
                <p className="mb-3 flex items-start gap-2 rounded-xl bg-[#FDF6E7] px-3 py-2.5 text-[12px] font-semibold text-[#6B4E10]">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Complete your prescriber profile before issuing a prescription —{" "}
                    {identityGaps.join(", ")}.
                  </span>
                </p>
              )}

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
                            setEditPatient(false);
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

                    {selected && !editPatient && (
                      <div className="mt-4 rounded-2xl border border-[#E9E2F8] bg-[#FBF9FF] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-[12px] font-semibold uppercase tracking-wide text-[#8A7FB0]">
                            Saved patient details
                          </p>
                          <button
                            type="button"
                            onClick={() => setEditPatient(true)}
                            className="shrink-0 text-[12px] font-semibold text-[#7E6BAF] underline transition hover:text-[#3D2E6B]"
                          >
                            Update patient details
                          </button>
                        </div>
                        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                          {[
                            ["Full legal name", patientName],
                            ["Preferred name", preferredName],
                            [
                              "Date of birth",
                              dob
                                ? `${dob}${ageYears !== undefined ? ` · ${ageYears} years old` : ""}`
                                : "",
                            ],
                            [
                              "Sex",
                              SEX_OPTIONS.find((o) => o.value === sex && o.value !== "not-documented")
                                ?.label ?? "",
                            ],
                            [
                              "Address",
                              [
                                address.street,
                                address.barangay,
                                address.city,
                                address.province,
                                address.postalCode,
                              ]
                                .filter(Boolean)
                                .join(", "),
                            ],
                            ["Mobile number", patientPhone],
                            ["Email", patientEmail],
                          ].map(([k, v]) => (
                            <div key={k}>
                              <dt className={label}>{k}</dt>
                              <dd
                                className={`mt-1 text-[13px] ${v ? "text-[#3D2E6B]" : "text-[#A89BD0]"}`}
                              >
                                {v || "Not on file"}
                              </dd>
                            </div>
                          ))}
                        </dl>
                        <p className="mt-3 text-[11.5px] leading-snug text-[#8A7FB0]">
                          Reused from this patient’s record and the information they shared — nothing
                          to re-enter.
                        </p>
                      </div>
                    )}

                    {hasPatient && (!selected || editPatient) && (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">

                        <div className="sm:col-span-2">
                           <label className={label} htmlFor="rx-patient">
                            Full legal name <span className="text-[#B4436C]">*</span>
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
                            Preferred name <span className="text-[#B4436C]">*</span>
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
                            Date of birth <span className="text-[#B4436C]">*</span>
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
                            Age <span className="text-[#B4436C]">*</span>
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
                            Sex <span className="text-[#B4436C]">*</span>
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


              {/* ---------------- STEP 2 — CLINICAL DOCUMENTATION ---------------- */}
              <Acc
                index={1}
                label="SOAP / clinical note"
                hint="Reuse an existing SOAP or complete one focused note"

                open={step === 1}
                onToggle={goStep}
                locked={!patientReady}
                lockedHint="Add a patient in Step 1 first"
                done={patientReady && (contextGaps.length === 0)}
              >
                {() => {
                  const today = new Date().toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });
                  const passportUpdated = selected?.info?.updatedAt
                    ? new Date(selected.info.updatedAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : null;
                  const scrollToSoapField = (key: keyof SoapNote) => {
                    if (isSoapPlaceholder(soap[key])) {
                      setAiFields((f) => ({ ...f, [key]: false }));
                      if (key !== "objective") setSoap((s) => ({ ...s, [key]: "" }));
                    }
                    if (key === "objective" && isSoapPlaceholder(soap[key])) {
                      setObjectiveMode("add");
                      setSoap((s) => ({ ...s, objective: "" }));
                    }
                    const el =
                      document.getElementById(`soap-field-${key}`) ??
                      document.getElementById("soap-generated-sections");
                    el?.scrollIntoView({ behavior: "smooth", block: "center" });
                    el?.querySelector("textarea")?.focus({ preventScroll: true });
                  };

                  const soapField = (
                    key: keyof SoapNote,
                    hint: string,
                    rows = 2,
                  ) => {
                    const placeholder = isSoapPlaceholder(soap[key]);
                    const aiWritten = aiFields[key] && !placeholder;
                    return (
                      <div id={`soap-field-${key}`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <label className={label}>{SOAP_FULL_LABEL[key]}</label>
                          {aiWritten && (
                            <span className="rounded-full bg-[#EFE8FB] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#3D2E6B]">
                              AI draft — confirm
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[11.5px] leading-snug text-[#8A7FB0]">{hint}</p>
                        <textarea
                          rows={rows}
                          className={`${area} mt-1.5 ${
                            placeholder
                              ? "text-[#8A7FB0]"
                              : aiWritten
                                ? "border-[#D9CEF3] bg-[#FAF8FF]"
                                : ""
                          }`}
                          value={soap[key]}
                          onChange={(e) => {
                            setSoapApproved(false);
                            setAiFields((f) => ({ ...f, [key]: false }));
                            setSoap((s) => ({ ...s, [key]: e.target.value }));
                          }}
                        />
                        {key === "plan" && (
                          <p className="mt-1.5 text-[11.5px] leading-snug text-[#8A7FB0]">
                            Optional —{" "}
                            <button
                              type="button"
                              onClick={() => {
                                setSoapApproved(false);
                                setSoap((s) => ({
                                  ...s,
                                  plan: `${isSoapPlaceholder(s.plan) ? "" : `${s.plan} `}Follow-up: `.trim(),
                                }));
                              }}
                              className="font-semibold text-[#6F5BA0] underline decoration-[#D9CEF3] underline-offset-2 transition hover:text-[#3D2E6B]"
                            >
                              add follow-up
                            </button>
                            {" · "}
                            <button
                              type="button"
                              onClick={() => {
                                setSoapApproved(false);
                                setSoap((s) => ({
                                  ...s,
                                  plan: `${isSoapPlaceholder(s.plan) ? "" : `${s.plan} `}Patient instructions and warning signs: `.trim(),
                                }));
                              }}
                              className="font-semibold text-[#6F5BA0] underline decoration-[#D9CEF3] underline-offset-2 transition hover:text-[#3D2E6B]"
                            >
                              add patient instructions and warning signs
                            </button>
                          </p>
                        )}
                      </div>
                    );
                  };

                  /** Actual blockers only — shown once, compactly. Follow-up and
                   *  patient instructions are optional prompts inside Plan instead. */
                  const blockers: { label: string; key: keyof SoapNote }[] = [];
                  if (isSoapPlaceholder(soap.objective))
                    blockers.push({ label: "Confirm objective findings status", key: "objective" });
                  if (isSoapPlaceholder(soap.plan))
                    blockers.push({ label: "Complete the Plan", key: "plan" });

                  const infoNeededPanel = soapDrafted || soapMode === "manual" ? (
                    <>
                      {blockers.length > 0 && (
                        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-xl border border-[#E3DBF5] bg-[#FAF8FF] px-3 py-2.5">
                          <p className="text-[11.5px] font-bold text-[#3D2E6B]">
                            Required before continuing:
                          </p>
                          {blockers.map((item) => (
                            <button
                              key={item.label}
                              type="button"
                              onClick={() => scrollToSoapField(item.key)}
                              className="text-[11.5px] font-semibold text-[#6F5BA0] underline decoration-[#D9CEF3] underline-offset-2 transition hover:text-[#3D2E6B]"
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {aiQuestions.length > 0 && (
                        <div className="mt-3 rounded-xl border border-[#E3DBF5] bg-[#FAF8FF] p-4">
                          <div className="flex items-center gap-2">
                            <p className="text-[12.5px] font-bold text-[#3D2E6B]">AI questions</p>
                            <span className="rounded-full bg-[#EFE8FB] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-[#3D2E6B]">
                              AI
                            </span>
                          </div>
                          <p className="mt-1 text-[11.5px] leading-snug text-[#8A7FB0]">
                            The AI needs a little more detail — nothing here enters the clinical
                            record until you answer.
                          </p>
                          <ul className="mt-2.5 space-y-2">
                            {aiQuestions.map((q) => (
                              <li
                                key={q}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#EDEBF3] bg-white px-3 py-2"
                              >
                                <span className="min-w-0 text-[12px] text-[#4B4468]">{q}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const key: keyof SoapNote = /finding|vital/i.test(q)
                                      ? "objective"
                                      : /impression/i.test(q)
                                        ? "assessment"
                                        : "plan";
                                    setSoapApproved(false);
                                    setAiFields((f) => ({ ...f, [key]: false }));
                                    setSoap((s) => ({
                                      ...s,
                                      [key]: isSoapPlaceholder(s[key])
                                        ? `${q} — `
                                        : `${s[key]} ${q} — `,
                                    }));
                                    setAiQuestions((list) => list.filter((x) => x !== q));
                                    scrollToSoapField(key);
                                  }}
                                  className="shrink-0 rounded-xl border border-[#D9CEF3] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[#3D2E6B] transition hover:bg-[#F7F4FE]"
                                >
                                  Add response
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : null;


                  /** Prominent AI-vs-manual choice, shared by every SOAP authoring flow. */
                  /** One quiet switch between AI drafting and writing manually. */
                  const soapModeChoice = (
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setSoapMode(soapMode === "ai" ? "manual" : "ai");
                          setSoapDrafted(false);
                          setSoapApproved(false);
                        }}
                        className="text-[11.5px] font-semibold text-[#6F5BA0] underline decoration-[#D9CEF3] underline-offset-2 transition hover:text-[#3D2E6B]"
                      >
                        {soapMode === "ai" ? "Write SOAP manually" : "Draft SOAP with AI instead"}
                      </button>
                    </div>
                  );

                  /** The paste-or-dictate field plus the visible AI drafting action. */
                  const soapAiPanel = (
                    <div className="mt-2 rounded-xl border border-[#E3DBF5] bg-white p-4">
                      <label className={label}>Paste or dictate your clinical notes</label>
                      <textarea
                        rows={5}
                        className={`${area} mt-2`}
                        value={pastedNote}
                        onChange={(e) => {
                          setPastedNote(e.target.value);
                          setSoapDrafted(false);
                          setSoapApproved(false);
                        }}
                        placeholder="e.g. Patient seen today for follow-up of hypertension. BP 138/86. Tolerating current medication…"
                      />
                      <button
                        type="button"
                        onClick={prepareSoapDraft}
                        disabled={aiLoading || !pastedNote.trim()}
                        className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-[#3D2E6B] px-4 text-[12.5px] font-semibold text-white transition hover:bg-[#2A1F4D] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {aiLoading ? "Generating SOAP note…" : "Draft SOAP with AI"}
                      </button>
                      <p className="mt-2 text-[11.5px] leading-relaxed text-[#8A7FB0]">
                        AI only organizes what you wrote — it never adds symptoms, findings or
                        treatment.
                      </p>
                      <details className="mt-1.5 group">
                        <summary className="cursor-pointer list-none text-[11.5px] font-semibold text-[#7E6BAF] underline decoration-[#D9CEF3] underline-offset-2 transition hover:text-[#3D2E6B]">
                          How AI helps draft your SOAP note
                        </summary>
                        <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#8A7FB0]">
                          Paste or dictate your raw clinical notes above, then click “Draft SOAP with
                          AI.” Lubin sorts what you wrote into the four SOAP sections — Subjective
                          (what the patient reports, including negatives), Objective (findings and
                          vitals), Assessment (your impression) and Plan (next steps). It never
                          invents symptoms, examinations, diagnoses, results or treatment. Anything
                          you did not document is left as an open gap and listed under “Information
                          needed”, and every section stays editable. In this prototype the drafts are
                          generated locally for demonstration.
                        </p>
                      </details>
                      {aiLoading && (
                        <p className="mt-2 flex items-center gap-2 rounded-xl bg-[#F7F3FF] px-3 py-2 text-[11.5px] font-semibold text-[#4B3F7A]">
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#D3C6F0] border-t-[#3D2E6B]" />
                          Generating your SOAP note — organizing your notes into S, O, A and P…
                        </p>
                      )}
                      {!aiLoading && soapDrafted && (
                        <p className="mt-2 rounded-xl bg-[#F7F3FF] px-3 py-2 text-[11.5px] font-semibold text-[#4B3F7A]">
                          AI draft created — review and complete the highlighted sections.
                        </p>
                      )}
                    </div>
                  );


                  /** One explicit confirmation of the whole draft. */
                  const soapApproval = (
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setSoapApproved(true)}
                        disabled={soapApproved || infoNeeded.some((i) => i.label === "Confirm assessment" || i.label === "Add evaluation or treatment plan")}
                        className="inline-flex h-10 items-center rounded-xl bg-[#3D2E6B] px-4 text-[12.5px] font-semibold text-white transition hover:bg-[#2A1F4D] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {soapApproved ? "SOAP draft confirmed" : "Confirm SOAP draft"}
                      </button>
                      <p className="text-[11.5px] leading-snug text-[#8A7FB0]">
                        {soapApproved
                          ? "You confirmed Subjective, Objective, Assessment and Plan."
                          : "Review all four sections — your signature at the end provides the final authorization."}
                      </p>
                    </div>
                  );



                  return (
                    <>
                      {/* Once chosen, both selections collapse into one line */}
                      {purpose && (purpose === "renewal" || !!entry) ? (
                        <section className="flex items-center justify-between gap-3 rounded-2xl border border-[#E3DBF5] bg-white px-4 py-3">
                          <p className="min-w-0 truncate text-[12.5px] font-semibold text-[#3D2E6B]">
                            {purpose === "renewal"
                              ? "Medication renewal"
                              : `New treatment · ${
                                  ENTRY_POINTS.find((o) => o.value === entry)?.short ??
                                  ENTRY_POINTS.find((o) => o.value === entry)?.title ??
                                  "Assessment documented"
                                }`}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setPurpose(null);
                              setEntry(null);
                            }}
                            className="shrink-0 text-[11.5px] font-semibold text-[#6F5BA0] underline decoration-[#D9CEF3] underline-offset-2 transition hover:text-[#3D2E6B]"
                          >
                            Change
                          </button>
                        </section>
                      ) : (
                        <>
                          <section className={cardCls}>
                            <h3 className="text-[13.5px] font-bold text-[#3D2E6B]">
                              New treatment or medication renewal?
                            </h3>
                            <div className="mt-3 space-y-2">
                              {PURPOSE_OPTIONS.map((opt) => (
                                <label
                                  key={opt.value}
                                  className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 ${
                                    purpose === opt.value
                                      ? "border-[#3D2E6B] bg-[#F7F4FE]"
                                      : "border-[#EDEBF3] bg-white"
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    className="mt-0.5 h-4 w-4 accent-[#3D2E6B]"
                                    checked={purpose === opt.value}
                                    onChange={() => {
                                      setPurpose(opt.value);
                                      setEntry(opt.value === "renewal" ? "renewal" : null);
                                    }}
                                  />
                                  <span className="flex flex-col">
                                    <span className="text-[12.5px] font-semibold text-[#3D2E6B]">
                                      {opt.title}
                                    </span>
                                    <span className="mt-0.5 text-[12px] leading-snug text-[#6F6889]">
                                      {opt.description}
                                    </span>
                                  </span>
                                </label>
                              ))}
                            </div>
                          </section>

                          {purpose === "new" && !fromAppointment && (
                            <section className={cardCls}>
                              <h3 className="text-[13.5px] font-bold text-[#3D2E6B]">
                                SOAP note supporting this prescription
                              </h3>
                              <div className="mt-3 space-y-2">
                                {ENTRY_POINTS.map((opt) => (
                                  <label
                                    key={opt.value}
                                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 ${
                                      entry === opt.value
                                        ? "border-[#3D2E6B] bg-[#F7F4FE]"
                                        : "border-[#EDEBF3] bg-white"
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      className="mt-0.5 h-4 w-4 accent-[#3D2E6B]"
                                      checked={entry === opt.value}
                                      onChange={() => setEntry(opt.value)}
                                    />
                                    <span className="flex flex-col">
                                      <span className="text-[12.5px] font-semibold text-[#3D2E6B]">
                                        {opt.title}
                                      </span>
                                      <span className="mt-0.5 text-[12px] leading-snug text-[#6F6889]">
                                        {opt.description}
                                      </span>
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </section>
                          )}
                        </>
                      )}

                      {purpose === "new" && fromAppointment && (
                        <section className={cardCls}>
                          <p className="flex items-center gap-2 text-[12.5px] font-bold text-[#3D2E6B]">
                            <CheckCircle2 className="h-4 w-4" />
                            Linked to this appointment automatically
                          </p>
                          <p className="mt-1.5 text-[12px] leading-relaxed text-[#6F6889]">
                            {fromAppointment.patient} · {fromAppointment.type} ·{" "}
                            {fromAppointment.date}. Its SOAP note is reused — no search needed.
                          </p>
                        </section>
                      )}

                      {/* A — completed Lubin consultation */}
                      {purpose === "new" && entry === "lubin" && (
                        <section className={cardCls}>
                          {!fromAppointment && (
                            <>
                          <label className={label}>
                            Completed Lubin consultations
                            {selected ? ` — ${selected.fullName}` : ""}
                          </label>
                          <p className="mt-1 text-[11.5px] leading-snug text-[#6F6889]">
                            Only this patient’s completed consultations are shown. Search by
                            appointment type, date or ID.
                          </p>
                          <div className="relative mt-1.5">
                            <input
                              className={`${field} pr-9`}
                              value={apptSearch}
                              onChange={(e) => setApptSearch(e.target.value)}
                              placeholder="Search title, date or ID…"
                            />
                            <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#A89BD0]" />
                          </div>
                          {(() => {
                            const q = apptSearch.trim().toLowerCase();
                            const matches = q
                              ? patientAppointments.filter(
                                  (a) =>
                                    a.patient.toLowerCase().includes(q) ||
                                    a.type.toLowerCase().includes(q) ||
                                    a.date.toLowerCase().includes(q) ||
                                    a.id.toLowerCase().includes(q),
                                )
                              : [];
                            if (!q)
                              return (
                                <p className="mt-2 text-[11.5px] text-[#9A93B5]">
                                  {patientAppointments.length} completed consultation
                                  {patientAppointments.length === 1 ? "" : "s"} for this patient —
                                  start typing to search.
                                </p>
                              );
                            if (matches.length === 0)
                              return (
                                <p className="mt-2 text-[11.5px] text-[#9A93B5]">
                                  No completed consultations for this patient match “{apptSearch}”.
                                </p>
                              );
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
                            </>
                          )}

                          {linkedAppt && (
                            <>
                              {/* Compact "documentation ready" card */}
                              <div className="mt-4 rounded-xl border border-[#E3DBF5] bg-[#F7F3FF] p-4">
                                <p className="flex items-center gap-2 text-[12.5px] font-bold text-[#3D2E6B]">
                                  <CheckCircle2 className="h-4 w-4" />
                                  SOAP note from Lubin consultation
                                </p>

                                <dl className="mt-2.5 grid gap-x-6 gap-y-1.5 text-[12px] text-[#4B4468] sm:grid-cols-2">
                                  <div>
                                    <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-[#8A7FB0]">
                                      Consultation date
                                    </dt>
                                    <dd>{linkedAppt.date}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-[#8A7FB0]">
                                      Appointment type
                                    </dt>
                                    <dd>{linkedAppt.type}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-[#8A7FB0]">
                                      SOAP status
                                    </dt>
                                    <dd>
                                      {missingFromLinked.length === 0
                                        ? "Complete"
                                        : `Incomplete — missing ${missingFromLinked
                                            .map((k) => SOAP_LABEL[k])
                                            .join(", ")}`}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-[#8A7FB0]">
                                      Prescriber
                                    </dt>
                                    <dd>{identity?.fullName || linkedAppt.prescriber}</dd>
                                  </div>
                                  <div className="sm:col-span-2">
                                    <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-[#8A7FB0]">
                                      Assessment / diagnosis
                                    </dt>
                                    <dd>{effectiveSoap.assessment || "Not documented"}</dd>
                                  </div>
                                </dl>

                                <p
                                  className={`mt-3 rounded-xl px-3 py-2 text-[11.5px] font-semibold ${
                                    missingFromLinked.length === 0
                                      ? "bg-[#F0EBFB] text-[#3D2E6B]"
                                      : "bg-[#FDF9EF] text-[#8A6B1F]"
                                  }`}
                                >
                                  {missingFromLinked.length === 0
                                    ? "SOAP complete — no additional clinical note required."
                                    : "SOAP incomplete — complete the missing section below."}
                                </p>

                                <div className="mt-3 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setReviewSoapOpen((v) => !v)}
                                    className="inline-flex h-9 items-center rounded-xl border border-[#D9CEF3] bg-white px-3 text-[12px] font-semibold text-[#3D2E6B] hover:bg-[#F7F4FE]"
                                  >
                                    {reviewSoapOpen ? "Hide SOAP" : "Review SOAP"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    disabled={contextGaps.length > 0}
                                    className="inline-flex h-9 items-center rounded-xl bg-[#3D2E6B] px-3 text-[12px] font-semibold text-white transition hover:bg-[#2A1F4D] disabled:cursor-not-allowed disabled:opacity-45"
                                  >
                                    Use this SOAP
                                  </button>
                                </div>


                                {reviewSoapOpen && (
                                  <div className="mt-3 space-y-2 border-t border-[#E3DBF5] pt-3">
                                    {(Object.keys(SOAP_LABEL) as (keyof SoapNote)[]).map((k) => (
                                      <p key={k} className="text-[12px] leading-relaxed text-[#4B4468]">
                                        <span className="font-semibold text-[#3D2E6B]">
                                          {SOAP_FULL_LABEL[k]}:{" "}
                                        </span>
                                        {linkedAppt.soap[k] || (
                                          <span className="text-[#8A7FB0]">
                                            Not documented — provider confirmation required
                                          </span>
                                        )}
                                      </p>
                                    ))}
                                    <p className="text-[11.5px] text-[#8A7FB0]">
                                      Reused from the consultation record — read-only here.
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Ask only for the missing SOAP section(s) */}
                              {missingFromLinked.length > 0 && (
                                <div className="mt-4 space-y-3 rounded-xl border border-[#EDEBF3] bg-white p-4">
                                  <p className="text-[12.5px] font-semibold text-[#3D2E6B]">
                                    Complete the missing section
                                    {missingFromLinked.length > 1 ? "s" : ""} only
                                  </p>
                                  <button
                                    type="button"
                                    disabled={aiLoading}
                                    onClick={() => {
                                      setAiLoading(true);
                                      window.setTimeout(() => {
                                        setSoap((s) => {
                                          const next = { ...s };
                                          for (const k of missingFromLinked)
                                            if (!next[k].trim()) next[k] = NEEDS_CONFIRMATION;
                                          return next;
                                        });
                                        setAiLoading(false);
                                      }, 350);
                                    }}
                                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#D9CEF3] bg-white px-3.5 text-[12px] font-semibold text-[#3D2E6B] transition hover:bg-[#F7F4FE] disabled:opacity-45"
                                  >
                                    {aiLoading ? "Working…" : "Complete missing sections with AI"}
                                    <span className="rounded-full bg-[#EFE8FB] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider">
                                      AI
                                    </span>
                                  </button>
                                  <p className="text-[11.5px] leading-snug text-[#8A7FB0]">
                                    AI never invents findings — each gap is marked “
                                    {NEEDS_CONFIRMATION}” for you to complete.
                                  </p>

                                  {missingFromLinked.map((k) => (
                                    <div key={k}>
                                      {soapField(
                                        k,
                                        k === "objective"
                                          ? "Optional — leave blank if no objective findings were obtained."
                                          : "Not documented in the reused note.",
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Forgotten prescription after a past consultation */}
                              <div className="mt-4 rounded-xl border border-[#EDEBF3] bg-white p-4">
                                <p className="text-[12.5px] font-semibold text-[#3D2E6B]">
                                  Prescription being issued after consultation
                                </p>
                                <div className="mt-2 grid gap-x-6 gap-y-1.5 text-[12px] text-[#4B4468] sm:grid-cols-3">
                                  <p>
                                    <span className="block text-[10.5px] font-semibold uppercase tracking-wide text-[#8A7FB0]">
                                      Consultation
                                    </span>
                                    {linkedAppt.date}
                                  </p>
                                  <p>
                                    <span className="block text-[10.5px] font-semibold uppercase tracking-wide text-[#8A7FB0]">
                                      Prescription prepared
                                    </span>
                                    {today}
                                  </p>
                                  <p>
                                    <span className="block text-[10.5px] font-semibold uppercase tracking-wide text-[#8A7FB0]">
                                      Signing date
                                    </span>
                                    On signing — never backdated
                                  </p>
                                </div>

                                <p className={`${label} mt-4`}>
                                  Has any important clinical information changed since this
                                  consultation?
                                </p>
                                <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
                                  {(
                                    [
                                      ["none", "No material changes"],
                                      ["update", "Update clinical information"],
                                      ["reassess", "Patient requires reassessment"],
                                    ] as const
                                  ).map(([value, text]) => (
                                    <button
                                      key={value}
                                      type="button"
                                      onClick={() => setMaterialChange(value)}
                                      className={`${chip} w-full justify-center text-center ${
                                        materialChange === value
                                          ? "border-[#3D2E6B] bg-[#3D2E6B] text-white"
                                          : "border-[#D9CEF3] bg-white text-[#3D2E6B]"
                                      }`}
                                    >
                                      {text}
                                    </button>
                                  ))}
                                </div>
                                {materialChange === "update" && (
                                  <div className="mt-3 space-y-3">
                                    {soapField(
                                      "subjective",
                                      "What has changed since the consultation.",
                                    )}
                                    {soapField("plan", "Updated treatment decision or monitoring.")}
                                  </div>
                                )}
                                {materialChange === "reassess" && (
                                  <p className="mt-3 rounded-xl border border-[#EFE6D2] bg-[#FDF9EF] px-3 py-2 text-[12px] leading-relaxed text-[#8A6B1F]">
                                    This patient needs a new assessment. Use “Standalone prescribing
                                    encounter” or book a consultation before prescribing.
                                  </p>
                                )}
                              </div>
                            </>
                          )}
                        </section>
                      )}

                      {/* B — consultation completed outside Lubin */}
                      {purpose === "new" && entry === "outside" && (
                        <section className={cardCls}>
                          <div className="grid gap-3 sm:grid-cols-2">
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
                                className={`${selectField} mt-1.5`} style={{ backgroundImage: chevron }}
                                value={consultMode ?? ""}
                                onChange={(e) =>
                                  setConsultMode((e.target.value || null) as ConsultMode | null)
                                }
                              >
                                <option value="">Select…</option>
                                {(Object.keys(CONSULT_MODE_LABEL) as ConsultMode[]).map((m) => (
                                  <option key={m} value={m}>
                                    {CONSULT_MODE_LABEL[m]}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="sm:col-span-2">
                              <label className={label}>Clinic / platform</label>
                              <input
                                className={`${field} mt-1.5`}
                                value={consultLocation}
                                onChange={(e) => setConsultLocation(e.target.value)}
                                placeholder="e.g. Private clinic, Makati"
                              />
                            </div>
                          </div>


                          {soapModeChoice}
                          {soapMode === "ai" && soapAiPanel}

                          {(soapMode === "manual" || soapDrafted) && (
                            <div id="soap-generated-sections" className="mt-4 rounded-xl border border-[#E3DBF5] bg-white p-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <h4 className="text-[13px] font-bold text-[#3D2E6B]">
                                  Focused SOAP note
                                </h4>
                                <span className="rounded-full bg-[#F0EBFB] px-2.5 py-0.5 text-[10.5px] font-semibold text-[#3D2E6B]">
                                  {soapStatusLabel}
                                </span>
                              </div>
                              <div className="mt-3 space-y-3">
                                {soapField(
                                  "subjective",
                                  "Patient-reported reason for treatment, relevant symptoms and history.",
                                )}
                                {soapField(
                                  "objective",
                                  "Relevant observations, findings, results or vital signs.",
                                )}
                                {soapField(
                                  "assessment",
                                  "Diagnosis, clinical impression or indication supporting treatment.",
                                  1,
                                )}
                                {soapField(
                                  "plan",
                                  "Treatment decision, medication plan, monitoring and follow-up.",
                                )}
                              </div>
                              {infoNeededPanel}
                          {soapApproval}
                            </div>
                          )}


                        </section>
                      )}

                      {/* C — standalone prescribing encounter */}
                      {purpose === "new" && entry === "standalone" && (
                        <section className={cardCls}>
                          <div>
                            <label className={label}>How are you assessing the patient?</label>
                            <select
                              className={`${selectField} mt-1.5`} style={{ backgroundImage: chevron }}
                              value={consultMode ?? ""}
                              onChange={(e) =>
                                setConsultMode((e.target.value || null) as ConsultMode | null)
                              }
                            >
                              <option value="">Select…</option>
                              {(["in-person", "video", "phone", "other"] as ConsultMode[]).map((m) => (
                                <option key={m} value={m}>
                                  {CONSULT_MODE_LABEL[m]}
                                </option>
                              ))}
                            </select>
                          </div>

                          {soapModeChoice}
                          {soapMode === "ai" && soapAiPanel}

                          {(soapMode === "manual" || soapDrafted) && (
                          <div id="soap-generated-sections" className="mt-4 rounded-xl border border-[#E3DBF5] bg-white p-4">

                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h4 className="text-[13px] font-bold text-[#3D2E6B]">
                                Focused SOAP note
                              </h4>
                              <span className="rounded-full bg-[#F0EBFB] px-2.5 py-0.5 text-[10.5px] font-semibold text-[#3D2E6B]">
                                {soapStatusLabel}
                              </span>
                            </div>
                            <p className="mt-1 text-[12px] leading-relaxed text-[#6F6889]">
                              This SOAP note documents the assessment supporting the prescription.
                            </p>
                          <div className="mt-4 space-y-3">

                            {soapField(
                              "subjective",
                              "Patient-reported reason for treatment, relevant symptoms and history.",
                            )}

                            <div>
                              <label className={label}>Objective</label>
                              <p className="mt-1 text-[11.5px] leading-snug text-[#8A7FB0]">
                                Relevant observations, findings, results or vital signs.
                              </p>
                              <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
                                {(
                                  [
                                    ["none", "No objective findings required"],
                                    ["not-obtained", "Not obtained — remote assessment"],
                                    ["add", "Add relevant findings / vitals"],
                                  ] as const
                                ).map(([value, text]) => (
                                  <button
                                    key={value}
                                    type="button"
                                    onClick={() => {
                                      setObjectiveMode(value);
                                      if (value !== "add")
                                        setSoap((s) => ({
                                          ...s,
                                          objective:
                                            value === "not-obtained"
                                              ? "Not obtained — remote assessment"
                                              : "No objective findings required",
                                        }));
                                      else setSoap((s) => ({ ...s, objective: "" }));
                                    }}
                                    className={`${chip} w-full justify-center text-center ${
                                      objectiveMode === value
                                        ? "border-[#3D2E6B] bg-[#3D2E6B] text-white"
                                        : "border-[#D9CEF3] bg-white text-[#3D2E6B]"
                                    }`}
                                  >
                                    {text}
                                  </button>
                                ))}
                              </div>
                              {objectiveMode === "add" && (
                                <>
                                  <textarea
                                    rows={2}
                                    className={`${area} mt-2`}
                                    value={soap.objective}
                                    onChange={(e) =>
                                      setSoap((s) => ({ ...s, objective: e.target.value }))
                                    }
                                    placeholder="Examination findings, results…"
                                  />
                                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
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
                                    className={`${field} mt-2`}
                                    value={otherVitalsText}
                                    onChange={(e) => setOtherVitalsText(e.target.value)}
                                    placeholder="Other findings or labs (optional)"
                                  />
                                </>
                              )}
                            </div>

                            {soapField(
                              "assessment",
                              "Diagnosis, clinical impression or indication supporting treatment.",
                              1,
                            )}
                            {soapField(
                              "plan",
                              "Treatment decision, medication plan, monitoring and follow-up.",
                            )}
                            <p
                              className={`rounded-xl px-3 py-2 text-[11.5px] font-semibold ${
                                contextGaps.length === 0
                                  ? "bg-[#F0EBFB] text-[#3D2E6B]"
                                  : "bg-[#F7F6FA] text-[#8A7FB0]"
                              }`}
                            >
                              {contextGaps.length === 0 ? "Focused SOAP complete" : soapStatusLabel}
                            </p>
                          </div>
                          {infoNeededPanel}
                          {soapApproval}
                          </div>
                          )}



                          <p className="mt-3 text-[11.5px] text-[#8A7FB0]">
                            Prescribe only after personally assessing the patient.
                          </p>
                        </section>
                      )}

                      {/* D — renewal */}
                      {purpose === "renewal" && (
                        <section className={cardCls}>
                          <h3 className="text-[13.5px] font-bold text-[#3D2E6B]">
                            Quick renewal review
                          </h3>
                          <p className="mt-1.5 text-[12px] leading-relaxed text-[#6F6889]">
                            Pick the prescription you are continuing, then answer three questions. A
                            full new-treatment SOAP note is not required.
                          </p>

                          {previousPrescriptions.length > 0 ? (
                            <div className="mt-3 space-y-2">
                              {previousPrescriptions.map((p) => {
                                const m = p.medications[0];
                                const active = renewalSource === p.id;
                                return (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => prefillRenewal(p)}
                                    className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                                      active
                                        ? "border-[#3D2E6B] bg-[#F4F0FF]"
                                        : "border-[#EDEBF3] bg-white hover:border-[#D9CEF3]"
                                    }`}
                                  >
                                    <span className="min-w-0">
                                      <span className="block truncate text-[12.5px] font-semibold text-[#3D2E6B]">
                                        {m ? m.genericName || m.name : p.number}
                                        {m?.strength ? ` ${m.strength}` : ""}
                                      </span>
                                      <span className="mt-0.5 block truncate text-[11.5px] text-[#8A7FB0]">
                                        {p.number} ·{" "}
                                        {new Date(p.signedAt).toLocaleDateString(undefined, {
                                          month: "short",
                                          day: "numeric",
                                          year: "numeric",
                                        })}
                                      </span>
                                    </span>
                                    <span className="shrink-0 text-[11.5px] font-semibold text-[#3D2E6B]">
                                      {active ? "Prefilled" : "Continue this"}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="mt-3 rounded-xl border border-dashed border-[#DCD4F0] bg-white px-3 py-2.5 text-[12px] text-[#6F6889]">
                              No previous prescription on file for this patient — enter the
                              medication below.
                            </p>
                          )}

                          <div className="mt-4 grid gap-3">
                            <div>
                              <label className={label}>
                                Current medication and directions (SIG)
                              </label>
                              <input
                                className={`${field} mt-1.5`}
                                value={renewal.medication}
                                onChange={(e) =>
                                  setRenewal((r) => ({ ...r, medication: e.target.value }))
                                }
                                placeholder="e.g. Losartan 50 mg — 1 tablet once daily"
                              />
                            </div>
                            <div>
                              <label className={label}>Is the medication helping?</label>
                              <textarea
                                rows={2}
                                className={`${area} mt-1.5`}
                                value={renewal.response}
                                onChange={(e) =>
                                  setRenewal((r) => ({ ...r, response: e.target.value }))
                                }
                                placeholder="Symptom control since the last review…"
                              />
                            </div>
                            <div>
                              <label className={label}>Any side effects?</label>
                              <input
                                className={`${field} mt-1.5`}
                                value={renewal.sideEffects}
                                onChange={(e) =>
                                  setRenewal((r) => ({ ...r, sideEffects: e.target.value }))
                                }
                                placeholder="e.g. None reported"
                              />
                            </div>
                            <div>
                              <label className={label}>
                                Any medication or allergy changes?
                              </label>
                              <input
                                className={`${field} mt-1.5`}
                                value={renewal.changes}
                                onChange={(e) =>
                                  setRenewal((r) => ({ ...r, changes: e.target.value }))
                                }
                                placeholder="e.g. No new medications or allergies"
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setRenewalMore((v) => !v)}
                            className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#3D2E6B]"
                          >
                            <ChevronDown
                              className={`h-3.5 w-3.5 transition ${renewalMore ? "rotate-180" : ""}`}
                            />
                            Add more clinical details
                          </button>

                          {renewalMore && (
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              <div className="sm:col-span-2">
                                <label className={label}>Indication</label>
                                <input
                                  className={`${field} mt-1.5`}
                                  value={renewal.indication}
                                  onChange={(e) =>
                                    setRenewal((r) => ({ ...r, indication: e.target.value }))
                                  }
                                  placeholder="e.g. Hypertension"
                                />
                              </div>
                              <div>
                                <label className={label}>Adherence</label>
                                <input
                                  className={`${field} mt-1.5`}
                                  value={renewal.adherence}
                                  onChange={(e) =>
                                    setRenewal((r) => ({ ...r, adherence: e.target.value }))
                                  }
                                  placeholder="e.g. Takes daily, no missed doses"
                                />
                              </div>
                              <div>
                                <label className={label}>Allergy changes</label>
                                <input
                                  className={`${field} mt-1.5`}
                                  value={renewal.allergyChanges}
                                  onChange={(e) =>
                                    setRenewal((r) => ({ ...r, allergyChanges: e.target.value }))
                                  }
                                  placeholder="e.g. No new allergies"
                                />
                              </div>
                              <div>
                                <label className={label}>Last clinical assessment date</label>
                                <input
                                  type="date"
                                  className={`${field} mt-1.5`}
                                  value={renewal.lastAssessment}
                                  onChange={(e) =>
                                    setRenewal((r) => ({ ...r, lastAssessment: e.target.value }))
                                  }
                                />
                              </div>
                              <div>
                                <label className={label}>Requested quantity</label>
                                <input
                                  className={`${field} mt-1.5`}
                                  value={renewal.quantity}
                                  onChange={(e) =>
                                    setRenewal((r) => ({ ...r, quantity: e.target.value }))
                                  }
                                  placeholder="e.g. 30 tablets"
                                />
                              </div>
                              <div>
                                <label className={label}>Refills</label>
                                <input
                                  className={`${field} mt-1.5`}
                                  value={renewal.refills}
                                  onChange={(e) =>
                                    setRenewal((r) => ({ ...r, refills: e.target.value }))
                                  }
                                  placeholder="e.g. No refills"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className={label}>Follow-up plan</label>
                                <input
                                  className={`${field} mt-1.5`}
                                  value={renewal.followUp}
                                  onChange={(e) =>
                                    setRenewal((r) => ({ ...r, followUp: e.target.value }))
                                  }
                                  placeholder="e.g. Review BP log in 8 weeks"
                                />
                              </div>
                            </div>
                          )}
                          <p className="mt-3 rounded-xl bg-[#F7F3FF] px-3 py-2 text-[12px] font-semibold text-[#4B3F7A]">
                            Submitting a renewal still requires the prescriber’s clinical review.
                          </p>
                        </section>
                      )}

                      {/* Medication safety check */}
                      <section className={cardCls}>
                        <h3 className="text-[13.5px] font-bold text-[#3D2E6B]">
                          Medication safety check
                        </h3>
                        <p className="mt-1 text-[12px] text-[#6F6889]">
                          Confirm drug allergies and current medications before prescribing.
                        </p>
                        {passportUpdated && (
                          <p className="mt-2 text-[11.5px] font-semibold text-[#8A7FB0]">
                            Patient-reported · Last updated {passportUpdated}
                          </p>
                        )}

                        {/* Existing patients confirm what is already on file. */}
                        <p className={`${label} mt-4`}>Allergies</p>
                        {selected && allergyOnFile && allergyConfirm !== "update" ? (
                          <>
                            <p className="mt-1.5 rounded-xl border border-[#EDEBF3] bg-white px-3 py-2 text-[12.5px] text-[#4B4468]">
                              {savedAllergies}
                            </p>
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setAllergyConfirm("unchanged");
                                  setReviewedNoChanges(true);
                                  setAllergyState(savedAllergyState);
                                  if (savedAllergyState === "recorded")
                                    setAllergyDetail(savedAllergies);
                                }}
                                className={`${chip} w-full justify-center ${
                                  allergyConfirm === "unchanged"
                                    ? "border-[#3D2E6B] bg-[#3D2E6B] text-white"
                                    : "border-[#D9CEF3] bg-white text-[#3D2E6B]"
                                }`}
                              >
                                <Check className="h-3.5 w-3.5" />
                                {allergyConfirm === "unchanged"
                                  ? `Confirmed unchanged · ${today}`
                                  : "Confirm unchanged"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setAllergyConfirm("update")}
                                className={`${chip} w-full justify-center border-[#D9CEF3] bg-white text-[#3D2E6B]`}
                              >
                                Update
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="mt-1.5 grid grid-cols-2 gap-2">
                              {(["none-known", "recorded"] as AllergyReadiness[]).map((s) => (
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
                          </>
                        )}

                        <p className={`${label} mt-4`}>Current medications</p>
                        {selected && medicationOnFile && medsConfirm !== "update" ? (
                          <>
                            <p className="mt-1.5 rounded-xl border border-[#EDEBF3] bg-white px-3 py-2 text-[12.5px] text-[#4B4468]">
                              {savedMedications}
                            </p>
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setMedsConfirm("unchanged");
                                  setMedicationState(savedMedicationState);
                                  if (savedMedicationState === "recorded")
                                    setMedicationDetail(savedMedications);
                                }}
                                className={`${chip} w-full justify-center ${
                                  medsConfirm === "unchanged"
                                    ? "border-[#3D2E6B] bg-[#3D2E6B] text-white"
                                    : "border-[#D9CEF3] bg-white text-[#3D2E6B]"
                                }`}
                              >
                                <Check className="h-3.5 w-3.5" />
                                {medsConfirm === "unchanged"
                                  ? `Confirmed unchanged · ${today}`
                                  : "Confirm unchanged"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setMedsConfirm("update")}
                                className={`${chip} w-full justify-center border-[#D9CEF3] bg-white text-[#3D2E6B]`}
                              >
                                Update
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="mt-1.5 grid grid-cols-2 gap-2">
                              {(["nothing", "recorded"] as MedicationReadiness[]).map((s) => (
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
                          </>
                        )}
                        {!selected && (
                          <p className="mt-3 text-[11.5px] leading-snug text-[#8A7FB0]">
                            This patient is new to your practice — allergies and current medications
                            are recorded once here.
                          </p>
                        )}

                        {(allergyState === "not-assessed" || medicationState === "not-assessed") && (
                          <p className="mt-2.5 text-[11.5px] text-[#8A7FB0]">
                            Complete both safety checks to continue.
                          </p>
                        )}

                        {/* Conditions / pregnancy are shown only when clinically relevant. */}
                        {(objectiveMode === "add" || dangerousMeds.length > 0 || conditionsText) && (
                          <div className="mt-4 grid gap-3">
                            <div>
                              <label className={label}>Relevant conditions</label>
                              <input
                                className={`${field} mt-1.5`}
                                value={conditionsText}
                                onChange={(e) => setConditionsText(e.target.value)}
                                placeholder="e.g. Hypertension, migraine"
                              />
                            </div>
                            {sex !== "male" && (
                              <div>
                                <label className={label}>
                                  Pregnancy / breastfeeding
                                  <FieldHint text="Shown because findings or the selected medication make it clinically relevant." />
                                </label>
                                <input
                                  className={`${field} mt-1.5`}
                                  value={pregnancyText}
                                  onChange={(e) => setPregnancyText(e.target.value)}
                                  placeholder="e.g. Not pregnant / not breastfeeding"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </section>
                    </>
                  );
                }}
              </Acc>



              {/* ---------------- STEP 3 — DOCUMENTATION + PRESCRIPTION ---------------- */}
              <Acc
                index={2}
                label="Prescription"
                hint="Documentation and medications"
                open={step === 2}
                onToggle={goStep}
                locked={!patientReady}
                lockedHint="Add a patient in Step 1 first"
                done={patientReady && (docGaps.length === 0 && rxGaps.length === 0)}
              >
                {() => (
                <>

                  {/* Reused documentation — read-only. Nothing is retyped here. */}
                  <section className={cardCls}>
                    <h3 className="text-[13.5px] font-bold text-[#3D2E6B]">
                      SOAP information used for this prescription
                    </h3>
                    {purpose === "renewal" ? (
                      <div className="mt-3 rounded-xl border border-[#E3DBF5] bg-[#F7F3FF] p-4">
                        <p className="text-[12.5px] font-semibold text-[#3D2E6B]">
                          {soapStatusLabel}
                        </p>
                        <p className="mt-1 text-[12px] text-[#4B4468]">
                          {renewal.medication || "—"} · {renewal.indication || "—"} ·{" "}
                          {renewal.response || "—"}
                        </p>
                        <p className="mt-1.5 text-[11.5px] text-[#8A7FB0]">
                          A complete new-treatment SOAP note is not required for an ordinary
                          medication continuation.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-3 rounded-xl border border-[#E3DBF5] bg-[#F7F3FF] p-4">
                        <dl className="grid gap-x-6 gap-y-1.5 text-[12px] text-[#4B4468] sm:grid-cols-2">
                          <div>
                            <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-[#8A7FB0]">
                              Source of SOAP note
                            </dt>
                            <dd>{soapSourceLabel}</dd>
                          </div>
                          <div>
                            <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-[#8A7FB0]">
                              SOAP date
                            </dt>
                            <dd>{soapDateLabel}</dd>
                          </div>
                        </dl>
                        {linkedAppt && (
                          <p className="mt-2 flex items-center gap-2 text-[12.5px] font-semibold text-[#3D2E6B]">
                            <CalendarClock className="h-4 w-4" /> {linkedAppt.type} ·{" "}
                            {linkedAppt.date}
                          </p>
                        )}
                        <p className="mt-2 text-[12px] text-[#4B4468]">
                          <span className="font-semibold">
                            Indication (SOAP note — Assessment):{" "}
                          </span>
                          {effectiveSoap.assessment || "Not documented — provider confirmation required"}
                        </p>
                        <p className="mt-1 text-[12px] text-[#4B4468]">
                          <span className="font-semibold">
                            Treatment context (SOAP note — Plan):{" "}
                          </span>
                          {effectiveSoap.plan || "Not documented — provider confirmation required"}
                        </p>
                        <p className="mt-1.5 text-[11.5px] text-[#8A7FB0]">
                          Reused from the SOAP note — nothing needs to be retyped here.
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="inline-flex h-9 items-center rounded-xl border border-[#D9CEF3] bg-white px-3 text-[12px] font-semibold text-[#3D2E6B] hover:bg-[#F7F4FE]"
                          >
                            Review SOAP
                          </button>
                          {linkedAppt && (
                            <a
                              href={`/appointment/details?id=${linkedAppt.id}`}
                              className="inline-flex h-9 items-center rounded-xl border border-[#D9CEF3] bg-white px-3 text-[12px] font-semibold text-[#3D2E6B] hover:bg-[#F7F4FE]"
                            >
                              Open the consultation record
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </section>


                  {/* Design-only assistive drafting — synthetic, in-memory, no AI service. */}
                  <section className={cardCls}>
                    <h3 className="text-[13.5px] font-bold text-[#3D2E6B]">
                      Draft prescription with AI
                    </h3>
                    <p className="mt-1 text-[12px] leading-relaxed text-[#6F6889]">
                      Lubin drafts prescription fields from your SOAP Plan. Review every field before
                      signing.
                    </p>
                    <details className="mt-2 group">
                      <summary className="cursor-pointer list-none text-[12px] font-semibold text-[#7E6BAF] underline decoration-[#D9CEF3] transition hover:text-[#3D2E6B]">
                        How AI works
                      </summary>
                      <p className="mt-2 text-[12px] leading-relaxed text-[#6F6889]">
                        Lubin turns your documented Plan into structured prescription fields and
                        patient instructions, and points out missing information. It never diagnoses,
                        chooses a medication, signs or issues, and it never silently fills a gap —
                        anything undocumented is shown as “Not documented — provider confirmation
                        required”. Manual entry always works, and every drafted medication needs your
                        individual confirmation. In this prototype the drafts are synthetic.
                      </p>
                    </details>

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
                onToggle={goStep}
                locked={!patientReady || !canReview}
                lockedHint={!patientReady ? "Add a patient in Step 1 first" : "Complete Steps 1–3 first"}
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
          <div className="min-w-0">
            {issued ? (
              <p className="text-[11.5px] text-[#8A7FB0]">Prescription signed and recorded.</p>
            ) : stepGaps.length > 0 ? (
              <>
                <p className="text-[12px] font-bold text-[#3D2E6B]">
                  {stepGaps.length} item{stepGaps.length === 1 ? "" : "s"} remaining
                </p>
                <ul className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                  {stepGaps.slice(0, 3).map((g) => (
                    <li key={g} className="text-[11.5px] text-[#8A7FB0]">
                      · {g}
                    </li>
                  ))}
                </ul>
              </>
            ) : allGaps.length > 0 ? (
              <p className="text-[11.5px] text-[#8A7FB0]">
                Still to resolve: {allGaps.slice(0, 3).join(" · ")}
              </p>
            ) : (
              <p className="text-[11.5px] text-[#8A7FB0]">Ready to continue.</p>
            )}
          </div>
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
                    {step === 2
                      ? "Review prescription"
                      : step === 1
                        ? purpose === "renewal"
                          ? "Continue with renewal"
                          : entry === "lubin"
                            ? "Use SOAP and continue"
                            : "Continue to prescription"
                        : "Continue"}
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
  const [instrLoading, setInstrLoading] = useState(false);
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
          Search medication — Philippines
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
              className={`${selectField} mt-1.5`} style={{ backgroundImage: chevron }}
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
              className={`${selectField} mt-1.5`} style={{ backgroundImage: chevron }}
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
            className={`${selectField} mt-1.5`} style={{ backgroundImage: chevron }}
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
            className={`${selectField} mt-1.5`} style={{ backgroundImage: chevron }}
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
            Directions (SIG) — editable
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className={label}>Patient instructions</label>
            <button
              type="button"
              disabled={instrLoading}
              onClick={() => {
                setInstrLoading(true);
                window.setTimeout(() => {
                  onPatch(
                    "instructions",
                    [
                      med.sig.trim() ||
                        `Take ${med.dose || "your dose"} ${med.frequency || "as directed"}.`,
                      "Take it at the same time each day.",
                      "Do not stop suddenly — contact your prescriber first.",
                      "Tell your prescriber about any new symptom or side effect.",
                    ].join(" "),
                  );
                  setInstrLoading(false);
                }, 700);
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-[#3D2E6B] px-2.5 text-[11.5px] font-semibold text-white transition hover:bg-[#2A1F4D] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="inline-flex h-4 items-center rounded-md bg-white/15 px-1 text-[9px] font-bold tracking-wide text-white">
                AI
              </span>
              {instrLoading ? "Generating…" : "Generate patient-friendly instructions"}
            </button>
          </div>
          <textarea
            rows={2}
            className={`${area} mt-1.5`}
            value={med.instructions}
            onChange={(e) => onPatch("instructions", e.target.value)}
            placeholder="Take with food. Do not stop suddenly."
          />
          {instrLoading && (
            <p className="mt-1.5 flex items-center gap-2 rounded-xl bg-[#F7F3FF] px-3 py-1.5 text-[11px] font-semibold text-[#4B3F7A]">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#D3C6F0] border-t-[#3D2E6B]" />
              Generating patient-friendly instructions…
            </p>
          )}
          {!instrLoading && med.instructions.trim() && (
            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-[#8A7FB0]">
              <span className="inline-flex h-3.5 items-center rounded-md bg-[#EDE7FA] px-1 text-[8.5px] font-bold tracking-wide text-[#4B3F7A]">
                AI
              </span>
              AI-assisted draft — provider review required.
            </p>
          )}
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
          <label className={label}>Follow-up plan</label>
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
  locked,
  lockedHint,
  onToggle,
  children,
}: {
  index: number;
  label: string;
  hint?: string;
  open: boolean;
  done?: boolean;
  locked?: boolean;
  lockedHint?: string;
  onToggle: (i: number) => void;
  children: () => React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#E3DBF5] bg-white">
      <button
        type="button"
        onClick={() => onToggle(open ? -1 : index)}
        aria-expanded={open}
        disabled={locked}
        className={`flex w-full items-center gap-3 px-5 py-4 text-left transition ${
          locked ? "cursor-not-allowed opacity-55" : "hover:bg-[#FBF9FF]"
        }`}
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
          {locked && lockedHint ? (
            <span className="mt-0.5 block text-[11.5px] text-[#8A7FB0]">{lockedHint}</span>
          ) : (
            hint && <span className="mt-0.5 block text-[11.5px] text-[#8A7FB0]">{hint}</span>
          )}
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
