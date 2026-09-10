import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  
  Plus,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import PatientAvatar from "@/components/profile/PatientAvatar";
import {
  createPatientRecord,
  emptyInfo,
  listPatientRecords,
  subscribePatientRecords,
  type PatientRecordView,
} from "@/lib/prescription/patientRecords";
import {
  listSignedPrescriptions,
  subscribePrescriptionDocuments,
  type SignedPrescriptionDocument,
} from "@/lib/prescription/documents";
import { ensureSamplePrescriptionRecord } from "@/lib/prescription/sampleRecord";
import { stashPrescriptionView } from "@/lib/prescription/viewHandoff";
import { ASSESSMENTS_BY_SLUG, GROUP_LABELS } from "@/lib/patterns/assessments";
import { getAssessmentStatus } from "@/lib/patterns/scoring";
import {
  INFO_STATUS_LABEL,
  PREGNANCY_STATUS_LABEL,
  type PatientSafetyInfo,
  type PregnancyStatus,
} from "@/lib/prescription/store";
import { sharedHealthCardValues } from "@/lib/prescription/intakeImport";
import {
  ALL_HEALTH_DETAIL_FIELDS,
  type HealthDetailField,
} from "@/lib/intake/healthDetails";


const card = "rounded-2xl border border-[#E9E2F8] bg-white p-5";
const label = "text-[11px] font-semibold uppercase tracking-wide text-[#7E6BAF]";

/** Opens the document behind an opaque id — no patient, medication or
 *  prescription data ever appears in the URL. */
function prescriptionHref(doc: SignedPrescriptionDocument): string {
  const id = stashPrescriptionView({
    appointmentId: doc.appointmentId,
    country: doc.country,
    clientName: doc.patientName,
    providerName: doc.identity?.fullName,
    docId: doc.id,
    document: doc,
  });
  return `/e-prescription/${id}`;
}

function formatDate(at?: number): string {
  if (!at) return "—";
  return new Date(at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function entryList(
  state: PatientSafetyInfo["allergyState"],
  entries: PatientSafetyInfo["allergyEntries"],
): string {
  if (entries && entries.length > 0) {
    return entries
      .map(
        (e) =>
          `${e.name}${e.status ? ` (${INFO_STATUS_LABEL[e.status]})` : ""}${e.detail ? ` — ${e.detail}` : ""}`,
      )
      .join("; ");
  }
  if (state === "none-known") return "None known";
  return "Not documented";
}

const SEX_LABEL: Record<NonNullable<PatientSafetyInfo["sex"]>, string> = {
  female: "Female",
  male: "Male",
  intersex: "Intersex",
  "prefer-not-to-say": "Prefer not to say",
  "not-documented": "Not documented",
};

const inputCls =
  "h-10 w-full rounded-xl border border-[#E3DBF5] bg-white px-3 text-[13px] text-[#3D2E6B] placeholder:text-[#A89BD0] focus:border-[#7E6BAF] focus:outline-none";

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

function noteEntries(text: string, source: "provider" = "provider") {
  const items = text
    .split(/[,\n;]/)
    .map((t) => t.trim())
    .filter(Boolean);
  return items.map((name, i) => ({
    id: `e_${Date.now()}_${i}`,
    name,
    status: "active" as const,
    source,
    updatedAt: Date.now(),
  }));
}

/**
 * The same questions the client answers on their own health card, so a record a
 * provider types matches a record a client shares — one wording, one option set.
 */
function hcField(id: string): HealthDetailField | undefined {
  return ALL_HEALTH_DETAIL_FIELDS.find((f) => f.id === id);
}

function hcLabel(id: string, fallback: string): string {
  return hcField(id)?.label ?? fallback;
}

function hcHelp(id: string): string | undefined {
  return hcField(id)?.help;
}

/** Tap-to-select chips for a tags field — same options the client sees on their
 *  health card. "+ Add other" reveals a small input for anything not listed. */
function TagField({
  fieldId,
  value,
  onChange,
  placeholder,
}: {
  fieldId: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const field = hcField(fieldId);
  const options = field?.options ?? [];
  const exclusive = field?.exclusiveOption;
  const items = value
    .split(/[,\n;]/)
    .map((s) => s.trim())
    .filter(Boolean);

  function toggle(opt: string) {
    if (opt === exclusive) {
      onChange(items.includes(opt) ? "" : opt);
      return;
    }
    const kept = items.filter((i) => i !== exclusive);
    const next = kept.includes(opt) ? kept.filter((i) => i !== opt) : [...kept, opt];
    onChange(next.join(", "));
  }

  function commitDraft() {
    const d = draft.trim();
    setDraft("");
    setAdding(false);
    if (!d) return;
    const kept =
      exclusive && items.includes(exclusive) ? [] : items.filter((i) => i !== exclusive);
    if (kept.includes(d)) return;
    onChange([...kept, d].join(", "));
  }

  const chipCls = (on: boolean) =>
    `rounded-[12px] border px-4 py-2 text-[12.5px] font-semibold transition ${
        on
          ? "border-transparent bg-[#5B4A93] text-white shadow-sm"
          : "border-[#E9E5F3] bg-white text-slate-600 hover:border-[#7E6BAF] hover:bg-[#F8F6FD]"
      }`;

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2">
      {options
        .filter((o) => o !== "Other")
        .map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={chipCls(items.includes(opt))}
          >
            {opt}
          </button>
        ))}
      {adding ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitDraft();
            }
          }}
          onBlur={commitDraft}
          placeholder={placeholder ?? "Type and press Enter"}
            className="h-9 w-44 rounded-[12px] border border-[#7E6BAF] bg-white px-3 text-[12.5px] text-[#3D2E6B] placeholder:text-[#A89BD0] focus:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-[12px] border border-dashed border-[#C9B6EC] px-4 py-2 text-[12.5px] font-medium text-[#5B4A93] transition hover:border-[#7E6BAF] hover:text-[#7E6BAF]"
        >
          + Add other
        </button>
      )}
    </div>
  );
}

/** Single-select chips for choice fields — same options as the health card. */
function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-2">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`rounded-[12px] border px-4 py-2 text-[12.5px] font-medium transition ${
              on
                ? "border-transparent bg-[#F3F0FA] text-[#7E6BAF]"
                : "border-[#E9E5F3] text-slate-600 hover:border-[#7E6BAF] hover:bg-[#F8F6FD]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const SEX_OPTIONS: { value: NonNullable<PatientSafetyInfo["sex"]>; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
];

const PREGNANCY_OPTIONS: { value: PregnancyStatus; label: string }[] = (
  Object.keys(PREGNANCY_STATUS_LABEL) as PregnancyStatus[]
).map((k) => ({ value: k, label: PREGNANCY_STATUS_LABEL[k] }));

const PREVIOUS_CARE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Not documented" },
  ...(hcField("care.previous")?.options ?? []).map((o) => ({ value: o, label: o })),
];

/** Create a client record before or outside an appointment. */
function NewClientForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (id: string) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState<NonNullable<PatientSafetyInfo["sex"]>>("not-documented");
  const [address, setAddress] = useState("");
  const [allergies, setAllergies] = useState("");
  const [conditions, setConditions] = useState("");
  const [medications, setMedications] = useState("");
  const [pregnancy, setPregnancy] = useState<PregnancyStatus>("not-documented");
  // "Care you already have" — the same two questions on the client's health card.
  const [previousCare, setPreviousCare] = useState("");
  const [clinicians, setClinicians] = useState("");
  const [error, setError] = useState("");

  // Optional details beyond the standard intake set.
  const [showMore, setShowMore] = useState(false);
  const [preferredName, setPreferredName] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [providerNotes, setProviderNotes] = useState("");
  const [customFields, setCustomFields] = useState<
    { id: string; label: string; value: string }[]
  >([]);

  const age = ageFromDob(dob);

  function addCustom() {
    setShowMore(true);
    setCustomFields((list) => [
      ...list,
      { id: `cf_${Date.now().toString(36)}_${list.length}`, label: "", value: "" },
    ]);
  }

  function patchCustom(id: string, patch: Partial<{ label: string; value: string }>) {
    setCustomFields((list) => list.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function submit() {
    if (fullName.trim().length < 2) {
      setError("Enter the client's full legal name.");
      return;
    }
    const info: PatientSafetyInfo = {
      ...emptyInfo(),
      dob: dob || undefined,
      ageYears: age,
      sex,
      address: address.trim() || undefined,
      allergyEntries: noteEntries(allergies),
      allergyState: allergies.trim() ? "documented" : "not-documented",
      conditionEntries: noteEntries(conditions),
      conditionState: conditions.trim() ? "documented" : "not-documented",
      medicationEntries: noteEntries(medications),
      medicationState: medications.trim() ? "documented" : "not-documented",
      pregnancyStatus: pregnancy,
      preferredName: preferredName.trim() || undefined,
      pronouns: pronouns.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      emergencyContact: emergencyContact.trim() || undefined,
      referralSource: referralSource.trim() || undefined,
      providerNotes: providerNotes.trim() || undefined,
      customFields: [
        ...(previousCare.trim()
          ? [
              {
                id: "care.previous",
                label: hcLabel("care.previous", "Therapy or psychiatric care before"),
                value: previousCare.trim(),
              },
            ]
          : []),
        ...(clinicians.trim()
          ? [
              {
                id: "care.clinicians",
                label: hcLabel("care.clinicians", "Anyone currently involved in their care"),
                value: clinicians.trim(),
              },
            ]
          : []),
        ...customFields
          .map((f) => ({ ...f, label: f.label.trim(), value: f.value.trim() }))
          .filter((f) => f.label && f.value),
      ],
    };
    const record = createPatientRecord({ fullName, info });
    onCreated(record.id);
  }

  return (
    <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-[#E9E5F3] bg-white">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-3">
        <div>
          <h4 className="text-lg font-semibold text-[#2D2D2D]">New client record</h4>
          <p className="mt-1 text-[13px] text-[#7E6BAF]/80">
            Tap to select common values, type only when needed.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          className="rounded-full p-1.5 text-[#8A7FB0] transition hover:bg-[#F4F0FC]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-7 px-6 pb-6">
        {/* Primary info */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="nc-name">
              {hcLabel("identity.fullName", "Full name")}{" "}
              <span className="text-[#B4453C]">*</span>
            </label>
            <input
              id="nc-name"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setError("");
              }}
              placeholder="First, middle, last"
              className={`${inputCls} mt-1.5`}
            />
          </div>
          <div>
            <label className={label} htmlFor="nc-dob">
              Date of birth
            </label>
            <input
              id="nc-dob"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className={`${inputCls} mt-1.5`}
            />
            <p className="mt-1 text-[11.5px] text-[#8A7FB0]">
              {age !== undefined ? `Age ${age}` : "Age is calculated automatically"}
            </p>
          </div>
        </div>

        {/* Sex */}
        <div>
          <label className={label}>Sex</label>
          <ChoiceChips options={SEX_OPTIONS} value={sex} onChange={setSex} />
        </div>

        {/* Pregnancy */}
        <div>
          <label className={label}>
            {hcLabel("history.pregnancy", "Pregnant, breastfeeding or trying to conceive?")}
          </label>
          <ChoiceChips
            options={PREGNANCY_OPTIONS}
            value={pregnancy}
            onChange={setPregnancy}
          />
        </div>

        {/* Conditions */}
        <div>
          <label className={label}>
            {hcLabel("history.conditions", "Conditions or past care that feels relevant")}
          </label>
          <TagField
            fieldId="history.conditions"
            value={conditions}
            onChange={setConditions}
            placeholder="Type a condition"
          />
        </div>

        {/* Allergies + Medications */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className={label}>
              {hcLabel("history.allergies", "Allergies or reactions")}
            </label>
            <TagField
              fieldId="history.allergies"
              value={allergies}
              onChange={setAllergies}
              placeholder="Type an allergy"
            />
          </div>
          <div>
            <label className={label}>
              {hcLabel("medication.list", "Anything you take right now")}
            </label>
            <TagField
              fieldId="medication.list"
              value={medications}
              onChange={setMedications}
              placeholder="Type a medication"
            />
          </div>
        </div>

        {/* Care */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className={label}>
              {hcLabel("care.previous", "Had therapy or psychiatric care before?")}
            </label>
            <ChoiceChips
              options={PREVIOUS_CARE_OPTIONS}
              value={previousCare}
              onChange={setPreviousCare}
            />
          </div>
          <div>
            <label className={label}>
              {hcLabel("care.clinicians", "Anyone currently involved in their care")}
            </label>
            <TagField
              fieldId="care.clinicians"
              value={clinicians}
              onChange={setClinicians}
              placeholder="Type a clinician"
            />
          </div>
        </div>

        {/* Address & extra details (collapsible) */}
        <div className="rounded-2xl border border-[#EDE7FA] bg-[#FBFAFE]">
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
          >
            <div>
              <p className="text-[13px] font-semibold text-[#3D2E6B]">
                Address & extra details
              </p>
              <p className="mt-0.5 text-[12px] text-[#6F6889]">
                Optional — add now or during a session.
              </p>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-[#8A7FB0] transition ${showMore ? "rotate-180" : ""}`}
            />
          </button>

          {showMore && (
            <div className="space-y-4 border-t border-[#EDE7FA] px-4 py-4">
              <div>
                <label className={label} htmlFor="nc-address">
                  Address
                </label>
                <input
                  id="nc-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, city, province / state"
                  className={`${inputCls} mt-1.5`}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    [
                      hcLabel("identity.preferredName", "Preferred name"),
                      preferredName,
                      setPreferredName,
                      "What they'd like to be called",
                    ],
                    ["Pronouns", pronouns, setPronouns, "e.g. she/her"],
                    [
                      hcLabel("contact.phone", "Mobile number"),
                      phone,
                      setPhone,
                      "912 345 6789",
                    ],
                    [hcLabel("contact.email", "Email"), email, setEmail, "you@email.com"],
                    [
                      "Emergency contact",
                      emergencyContact,
                      setEmergencyContact,
                      "Name, relationship, number",
                    ],
                    ["Referral source", referralSource, setReferralSource, "Who referred them"],
                  ] as const
                ).map(([lbl, value, set, placeholder]) => (
                  <div key={lbl}>
                    <label className={label}>{lbl}</label>
                    <input
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      placeholder={placeholder}
                      className={`${inputCls} mt-1`}
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className={label} htmlFor="nc-notes">
                  Other notes
                </label>
                <textarea
                  id="nc-notes"
                  value={providerNotes}
                  onChange={(e) => setProviderNotes(e.target.value)}
                  rows={3}
                  placeholder="Anything else you want on this record"
                  className="mt-1 w-full rounded-xl border border-[#E3DBF5] bg-white px-3 py-2 text-[13px] text-[#3D2E6B] placeholder:text-[#A89BD0] focus:border-[#7E6BAF] focus:outline-none"
                />
              </div>

              {customFields.length > 0 && (
                <div className="space-y-2">
                  {customFields.map((f) => (
                    <div key={f.id} className="flex flex-wrap items-center gap-2">
                      <input
                        value={f.label}
                        onChange={(e) => patchCustom(f.id, { label: e.target.value })}
                        placeholder="Detail name"
                        className={`${inputCls} sm:w-[200px]`}
                      />
                      <input
                        value={f.value}
                        onChange={(e) => patchCustom(f.id, { value: e.target.value })}
                        placeholder="Value"
                        className={`${inputCls} flex-1`}
                      />
                      <button
                        type="button"
                        aria-label="Remove detail"
                        onClick={() =>
                          setCustomFields((list) => list.filter((x) => x.id !== f.id))
                        }
                        className="rounded-full p-1.5 text-[#8A7FB0] transition hover:bg-[#F4F0FC]"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={addCustom}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-dashed border-[#C9B6EC] bg-white px-3.5 text-[12.5px] font-semibold text-[#5B4A93] transition hover:bg-white/60"
              >
                <Plus className="h-3.5 w-3.5" /> Add your own field
              </button>
            </div>
          )}
        </div>

        {error && <p className="text-[12.5px] font-semibold text-[#B4453C]">{error}</p>}

        {/* Footer */}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={submit}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-[#3D2E6B] px-5 text-[13px] font-semibold text-white transition hover:bg-[#33265A]"
          >
            Create client record
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-11 items-center rounded-xl border border-[#D8C7F0] bg-white px-5 text-[13px] font-semibold text-[#3D2E6B] transition hover:bg-[#FBF9FF]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Clients the provider has a record for: identity, clinical profile, the health
 * passport information the client shared, and the prescriptions issued to them.
 */
export default function ProviderClientsSection() {
  const [records, setRecords] = useState<PatientRecordView[]>([]);
  const [docs, setDocs] = useState<SignedPrescriptionDocument[]>([]);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    ensureSamplePrescriptionRecord();
    const read = () => {
      setRecords(listPatientRecords());
      setDocs(listSignedPrescriptions());
    };
    read();
    const a = subscribePatientRecords(read);
    const b = subscribePrescriptionDocuments(read);
    return () => {
      a();
      b();
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? records.filter((r) => r.fullName.toLowerCase().includes(q)) : records;
  }, [records, query]);

  const active = records.find((r) => r.id === openId) ?? null;

  const activeDocs = useMemo(
    () =>
      active
        ? docs
            .filter(
              (d) => d.patientName.trim().toLowerCase() === active.fullName.trim().toLowerCase(),
            )
            .sort((a, b) => b.signedAt - a.signedAt)
        : [],
    [docs, active],
  );

  const passportItems = useMemo(() => {
    const attempts = active?.passport?.attemptsInRange ?? [];
    return attempts.map((a) => {
      const meta = Object.values(ASSESSMENTS_BY_SLUG).find((x) => x.id === a.assessmentId);
      const maxScore = meta?.maxScore ?? 0;
      const status =
        maxScore > 0
          ? getAssessmentStatus(a.assessmentId, a.score, maxScore, !!meta?.lowerIsBetter)
          : null;
      return {
        id: a.id,
        assessmentId: a.assessmentId,
        group: meta?.group ?? "core",
        name: meta?.name ?? a.assessmentName,
        clinicalName: meta?.clinicalName,
        score: a.score,
        maxScore,
        statusLabel: status?.label,
        isCrisis: status?.isCrisis,
        takenAt: a.takenAt,
      };
    });
  }, [active]);

  /** One row per assessment tool (latest result), bucketed by category so the
   *  provider reads four short lists instead of one endless attempt log. */
  const passportGroups = useMemo(() => {
    const byTool = new Map<string, { latest: typeof passportItems[number]; count: number }>();
    for (const item of [...passportItems].sort((a, b) => b.takenAt - a.takenAt)) {
      const found = byTool.get(item.assessmentId);
      if (found) found.count += 1;
      else byTool.set(item.assessmentId, { latest: item, count: 1 });
    }
    const groups = (Object.keys(GROUP_LABELS) as (keyof typeof GROUP_LABELS)[]).map((key) => ({
      key,
      title: GROUP_LABELS[key].title,
      rows: [...byTool.values()]
        .filter((r) => r.latest.group === key)
        .sort((a, b) => b.latest.takenAt - a.latest.takenAt),
    }));
    return groups.filter((g) => g.rows.length > 0);
  }, [passportItems]);

  /** What the client themselves answered in the health part of their health
   *  card, so the record shows the same questions they were asked. */
  const clientAnswers = useMemo(
    () => (active ? sharedHealthCardValues(active.appointmentIds ?? []) : {}),
    [active],
  );




  if (active) {
    return (
      <section className="space-y-4">
        <button
          type="button"
          onClick={() => setOpenId(null)}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#7E6BAF] transition hover:text-[#3D2E6B]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All clients
        </button>

        <div className={card}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <PatientAvatar name={active.fullName} size={44} />
              <div>
                <h3 className="text-[16px] font-bold text-[#3D2E6B]">{active.fullName}</h3>
                <p className="text-[12px] text-[#8A7FB0]">
                  {active.info.ageYears ? `${active.info.ageYears} years · ` : ""}
                  {activeDocs.length} prescription{activeDocs.length === 1 ? "" : "s"}
                  {active.passport ? " · health passport shared" : ""}
                </p>
              </div>
            </div>
          </div>

          <dl className="mt-5 grid gap-x-6 gap-y-3 text-[12.5px] sm:grid-cols-2">
            <div>
              <dt className={label}>Date of birth</dt>
              <dd className="text-[#3D2E6B]">{active.info.dob || "Not documented"}</dd>
            </div>
            <div>
              <dt className={label}>Sex</dt>
              <dd className="text-[#3D2E6B]">
                {SEX_LABEL[active.info.sex ?? "not-documented"]}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className={label}>Address</dt>
              <dd className="text-[#3D2E6B]">{active.info.address || "Not documented"}</dd>
            </div>
            <div>
              <dt className={label}>Record since</dt>
              <dd className="text-[#3D2E6B]">{formatDate(active.createdAt)}</dd>
            </div>
            <div>
              <dt className={label}>Last prescription</dt>
              <dd className="text-[#3D2E6B]">{formatDate(active.lastIssuedAt)}</dd>
            </div>
          </dl>

          {(() => {
            const extras: { label: string; value: string }[] = [
              { label: "Preferred name", value: active.info.preferredName ?? "" },
              { label: "Pronouns", value: active.info.pronouns ?? "" },
              { label: "Phone", value: active.info.phone ?? "" },
              { label: "Email", value: active.info.email ?? "" },
              { label: "Emergency contact", value: active.info.emergencyContact ?? "" },
              { label: "Referral source", value: active.info.referralSource ?? "" },
              ...(active.info.customFields ?? []).map((f) => ({
                label: f.label,
                value: f.value,
              })),
            ].filter((e) => e.value.trim());
            if (extras.length === 0 && !active.info.providerNotes) return null;
            return (
              <div className="mt-5 border-t border-[#EDEBF3] pt-4">
                <dl className="grid gap-x-6 gap-y-3 text-[12.5px] sm:grid-cols-2">
                  {extras.map((e) => (
                    <div key={e.label}>
                      <dt className={label}>{e.label}</dt>
                      <dd className="text-[#3D2E6B]">{e.value}</dd>
                    </div>
                  ))}
                  {active.info.providerNotes && (
                    <div className="sm:col-span-2">
                      <dt className={label}>Other notes</dt>
                      <dd className="whitespace-pre-line text-[#3D2E6B]">
                        {active.info.providerNotes}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            );
          })()}
        </div>

        <div className={card}>
          <h4 className="text-[13.5px] font-bold text-[#3D2E6B]">Clinical profile</h4>
          <p className="mt-1 text-[12px] text-[#8A7FB0]">
            The same health questions the client answered on their health card.
          </p>
          <dl className="mt-3 space-y-3 text-[12.5px]">
            {(() => {
              const recorded = (
                fieldId: string,
                recordedValue: string,
                undocumented: boolean,
              ) => {
                const shared = clientAnswers[fieldId];
                if (undocumented && shared?.value) {
                  return { value: shared.value, fromClient: true };
                }
                return { value: recordedValue, fromClient: false };
              };
              const pregnancyStatus = active.info.pregnancyStatus ?? "not-documented";
              const rows: {
                key: string;
                label: string;
                value: string;
                fromClient: boolean;
              }[] = [
                {
                  key: "medication.list",
                  label: "Anything you take right now",
                  ...recorded(
                    "medication.list",
                    entryList(active.info.medicationState, active.info.medicationEntries),
                    (active.info.medicationState ?? "not-documented") === "not-documented" &&
                      !(active.info.medicationEntries?.length),
                  ),
                },
                {
                  key: "history.allergies",
                  label: "Allergies or reactions",
                  ...recorded(
                    "history.allergies",
                    entryList(active.info.allergyState, active.info.allergyEntries),
                    (active.info.allergyState ?? "not-documented") === "not-documented" &&
                      !(active.info.allergyEntries?.length),
                  ),
                },
                {
                  key: "history.conditions",
                  label: "Conditions or past care that feels relevant",
                  ...recorded(
                    "history.conditions",
                    entryList(active.info.conditionState, active.info.conditionEntries),
                    (active.info.conditionState ?? "not-documented") === "not-documented" &&
                      !(active.info.conditionEntries?.length),
                  ),
                },
                {
                  key: "history.pregnancy",
                  label: "Pregnant, breastfeeding or trying to conceive?",
                  ...recorded(
                    "history.pregnancy",
                    PREGNANCY_STATUS_LABEL[pregnancyStatus],
                    pregnancyStatus === "not-documented",
                  ),
                },
                {
                  key: "care.previous",
                  label: "Therapy or psychiatric care before?",
                  ...recorded("care.previous", "Not documented", true),
                },
                {
                  key: "care.clinicians",
                  label: "Anyone currently involved in their care",
                  ...recorded("care.clinicians", "Not documented", true),
                },
              ];
              return rows.map((row) => (
                <div key={row.key}>
                  <dt className={label}>{row.label}</dt>
                  <dd className="text-[#4B4468]">
                    {row.value}
                    {row.fromClient && (
                      <span className="ml-2 rounded-full bg-[#F3EEFF] px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-[#7E6BAF]">
                        Client answered
                      </span>
                    )}
                  </dd>
                </div>
              ));
            })()}
          </dl>
        </div>


        <div className={card}>
          <h4 className="text-[13.5px] font-bold text-[#3D2E6B]">
            Health passport shared with you
          </h4>
          {active.passport ? (
            <>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Mood", value: active.passport.moodLabel },
                  { label: "Stress", value: active.passport.stressLabel },
                  { label: "Direction", value: active.passport.directionLabel },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-[#EDEBF3] bg-[#FBFAFE] p-3">
                    <p className={label}>{s.label}</p>
                    <p className="mt-1 text-[13.5px] font-semibold text-[#3D2E6B]">{s.value}</p>
                  </div>
                ))}
              </div>
              {active.passport.insight && (
                <p className="mt-3 rounded-xl bg-[#F7F3FF] px-4 py-3 text-[12.5px] text-[#4B4468]">
                  {active.passport.insight}
                </p>
              )}
              {passportGroups.length > 0 && (
                <div className="mt-4 space-y-3">
                  {passportGroups.map((group, gi) => (
                    <details
                      key={group.key}
                      open={gi === 0}
                      className="group rounded-xl border border-[#EDEBF3] bg-[#FBFAFE]"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                        <span className="text-[13px] font-bold text-[#3D2E6B]">
                          {group.title}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#7E6BAF]">
                            {group.rows.length} assessment{group.rows.length === 1 ? "" : "s"}
                          </span>
                          <ChevronDown className="h-4 w-4 text-[#8A7FB0] transition group-open:rotate-180" />
                        </span>
                      </summary>
                      <ul className="space-y-2 px-4 pb-4">
                        {group.rows.map(({ latest: p, count }) => (
                          <li
                            key={p.assessmentId}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#EDEBF3] bg-white px-4 py-3"
                          >
                            <span className="min-w-0">
                              <span className="block text-[13px] font-semibold text-[#3D2E6B]">
                                {p.name}
                                {p.clinicalName ? ` · ${p.clinicalName}` : ""}
                              </span>
                              <span className="block text-[11.5px] text-[#8A7FB0]">
                                Latest {formatDate(p.takenAt)}
                                {count > 1 ? ` · ${count} results shared` : ""}
                              </span>
                            </span>
                            <span className="flex items-center gap-2">
                              {p.isCrisis && (
                                <span className="rounded-full bg-[#FBF1D8] px-2.5 py-1 text-[11px] font-semibold text-[#6B4E10]">
                                  Safety response flagged
                                </span>
                              )}
                              <span className="rounded-full bg-[#EFE9FB] px-2.5 py-1 text-[11.5px] font-semibold text-[#3D2E6B]">
                                {p.score}
                                {p.maxScore ? `/${p.maxScore}` : ""}
                                {p.statusLabel ? ` · ${p.statusLabel}` : ""}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="mt-3 rounded-xl border border-dashed border-[#DCD4F0] bg-[#FBFAFE] px-4 py-4 text-[12.5px] text-[#6F6889]">
              This client has not shared their health passport with you. They can share it
              from their Health Passport tab for an upcoming appointment.
            </p>
          )}
        </div>

        <div className={card}>
          <h4 className="text-[13.5px] font-bold text-[#3D2E6B]">Prescription history</h4>
          {activeDocs.length === 0 ? (
            <p className="mt-3 text-[12.5px] text-[#6F6889]">
              No prescriptions issued to this client yet.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {activeDocs.map((doc) => (
                <li
                  key={doc.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[#EDEBF3] bg-[#FBFAFE] px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-[12px] font-semibold text-[#3D2E6B]">
                      {doc.number}
                    </p>
                    <p className="mt-1 text-[13px] font-semibold text-[#2C2B4B]">
                      {doc.medications
                        .map((m) => `${m.genericName || m.name}${m.strength ? ` ${m.strength}` : ""}`)
                        .join(" · ") || "No medication recorded"}
                    </p>
                    <p className="mt-1 text-[11.5px] text-[#8A7FB0]">
                      Signed {formatDate(doc.signedAt)} · {doc.country}
                      {doc.voided ? " · voided" : ""}
                    </p>
                  </div>
                  <a
                    href={prescriptionHref(doc)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 shrink-0 items-center rounded-xl bg-[#3D2E6B] px-4 text-[12.5px] font-semibold text-white transition hover:bg-[#33265A]"
                  >
                    View prescription
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[#E3DBF5]/60 bg-[#FBF9FF]/90 p-6 shadow-md shadow-[#3D2E6B]/5 backdrop-blur-xl sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-[15px] font-bold text-[#3D2E6B]">Your clients</h3>
          <p className="mt-1 text-[13px] text-[#6F6889]">
            Open a client to see their clinical profile, shared health passport, and
            prescription history.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#3D2E6B] px-4 text-[12.5px] font-semibold text-white transition hover:bg-[#33265A]"
          >
            <UserPlus className="h-4 w-4" /> Add client
          </button>
          <div className="relative w-full sm:w-[260px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A89BD0]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients"
            className="h-10 w-full rounded-xl border border-[#E3DBF5] bg-white pl-9 pr-3 text-[13px] text-[#3D2E6B] placeholder:text-[#A89BD0] focus:border-[#7E6BAF] focus:outline-none"
          />
          </div>
        </div>
      </div>

      {adding && (
        <NewClientForm
          onCancel={() => setAdding(false)}
          onCreated={(id) => {
            setAdding(false);
            setRecords(listPatientRecords());
            setOpenId(id);
          }}
        />
      )}

      {records.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[#DCD4F0] bg-white/70 px-5 py-8 text-center">
          <Users className="mx-auto h-7 w-7 text-[#A89BD0]" />
          <p className="mt-2 text-[13.5px] font-semibold text-[#3D2E6B]">No clients yet</p>
          <p className="mt-1 text-[12.5px] text-[#6F6889]">
            Add a client manually, or a record appears here after their first session or
            the first prescription you issue.
          </p>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#3D2E6B] px-4 text-[12.5px] font-semibold text-white transition hover:bg-[#33265A]"
          >
            <UserPlus className="h-4 w-4" /> Add client
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-6 text-[13px] text-[#6F6889]">No clients match “{query}”.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {filtered.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setOpenId(r.id)}
                className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E3DBF5]/70 bg-white px-5 py-4 text-left transition hover:border-[#C9BCE9]"
              >
                <span className="flex items-center gap-3">
                  <PatientAvatar name={r.fullName} size={38} />
                  <span>
                    <span className="block text-[14px] font-bold text-[#3D2E6B]">
                      {r.fullName}
                    </span>
                    <span className="block text-[11.5px] text-[#8A7FB0]">
                      {r.prescriptionCount} prescription{r.prescriptionCount === 1 ? "" : "s"}
                      {r.lastIssuedAt ? ` · last ${formatDate(r.lastIssuedAt)}` : ""}
                    </span>
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  {r.passport && (
                    <span className="rounded-full bg-[#EFE9FB] px-2.5 py-1 text-[11px] font-semibold text-[#3D2E6B]">
                      Health passport shared
                    </span>
                  )}
                  <span className="text-[12.5px] font-semibold text-[#7E6BAF]">Open record</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
