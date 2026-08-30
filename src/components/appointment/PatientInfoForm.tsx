// Structured patient information for the prescription safety review.
// Allergies, current medications and relevant conditions are captured as
// searchable entries with a status, a source and a last-updated date.
// "None known" and "Not documented" are deliberately distinct states.
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  INFO_SOURCE_LABEL,
  INFO_STATUS_LABEL,
  HISTORY_STATE_LABEL,
  PREGNANCY_STATUS_LABEL,
  genRxId,
  type InfoDocState,
  type HistoryState,
  type InfoSource,
  type PatientInfoEntry,
  type PatientInfoStatus,
  type PatientSafetyInfo,
  type PregnancyStatus,
} from "@/lib/prescription/store";
import {
  INFO_FIELDS,
  docStateFor,
  entriesFor,
  entryField,
  infoLabel,
  isStructuredKey,
  stateField,
  patientAge,
  type InfoKey,
  type StructuredKey,
} from "@/lib/prescription/safety";
import { MEDICATION_CATALOGUE } from "@/lib/prescription/catalogue";
import { sharedIntakeInfo } from "@/lib/prescription/intakeImport";

const SUGGESTIONS: Record<StructuredKey, string[]> = {
  allergies: [
    "Penicillin",
    "Amoxicillin",
    "Sulfonamides",
    "Aspirin",
    "Ibuprofen",
    "Codeine",
    "Sertraline",
    "Fluoxetine",
    "Lamotrigine",
    "Carbamazepine",
  ],
  currentMedications: MEDICATION_CATALOGUE.map((c) => c.name),
  conditions: [
    "Bipolar disorder",
    "Epilepsy",
    "Seizure disorder",
    "Bleeding disorder",
    "Liver impairment",
    "Liver disease",
    "Renal impairment",
    "Thyroid disorder",
    "Hypertension",
    "Diabetes mellitus",
    "Pregnancy",
    "Glaucoma",
  ],
};

const DOCUMENTED_LABEL: Record<StructuredKey, string> = {
  allergies: "Documented allergies",
  currentMedications: "Documented medications",
  conditions: "Documented conditions",
};

const docStates = (key: StructuredKey): { value: InfoDocState; label: string }[] => [
  { value: "documented", label: DOCUMENTED_LABEL[key] },
  { value: "none-known", label: "None known" },
  { value: "not-documented", label: "Not documented" },
];

const SEVERITIES: { value: NonNullable<PatientInfoEntry["severity"]>; label: string }[] = [
  { value: "mild", label: "Mild" },
  { value: "moderate", label: "Moderate" },
  { value: "severe", label: "Severe" },
  { value: "unknown", label: "Severity unknown" },
];

const REACTION_TYPES: { value: NonNullable<PatientInfoEntry["reactionType"]>; label: string }[] = [
  { value: "allergy", label: "Allergy" },
  { value: "intolerance", label: "Intolerance / side effect" },
  { value: "unknown", label: "Not distinguished" },
];

const TAKING: { value: NonNullable<PatientInfoEntry["taking"]>; label: string }[] = [
  { value: "yes", label: "Actively taking" },
  { value: "no", label: "Not currently taking" },
  { value: "unknown", label: "Unclear" },
];

const ROUTES = ["Oral", "Sublingual", "Intramuscular", "Intravenous", "Topical", "Other"];

const STATUSES: PatientInfoStatus[] = ["active", "past", "suspected", "resolved"];
const SOURCES: InfoSource[] = ["passport", "provider", "review"];

const inputClass =
  "w-full rounded-lg border border-[#DEDAE8] bg-white px-3 py-2 text-[13px] text-[#2C2B4B] placeholder:text-[#9C96AF] focus:border-[#6E4FD3] focus:outline-none focus:ring-2 focus:ring-[#6E4FD3]/20";

export function PatientInfoForm({
  keys,
  info,
  onChange,
  onSave,
  relevanceFor,
  appointmentId,
  clientName,
}: {
  keys: InfoKey[];
  info?: PatientSafetyInfo;
  onChange: (p: Partial<PatientSafetyInfo>) => void;
  onSave: () => void;
  /** Medication-specific reason shown under an item, so nothing looks universal. */
  relevanceFor?: (key: InfoKey) => string;
  /** Used to surface what the client already shared in their intake form. */
  appointmentId?: string;
  clientName?: string;
}) {
  const [saved, setSaved] = useState<number | null>(null);
  /** Nothing is written to the patient record while the provider types. Edits
   *  live in this local draft until "Save patient information" is pressed. */
  const [patch, setPatch] = useState<Partial<PatientSafetyInfo>>({});
  const dirty = Object.keys(patch).length > 0;
  /** What the fields show: the stored record with the unsaved draft on top. */
  const view: PatientSafetyInfo = { ...(info ?? {}), ...patch };
  const stage = (p: Partial<PatientSafetyInfo>) => setPatch((cur) => ({ ...cur, ...p }));
  const structured = keys.filter(isStructuredKey);
  const showBipolar = keys.includes("bipolarHistory");
  const showAge = keys.includes("age");
  const showPregnancy = keys.includes("pregnancy");
  const showLabs = keys.includes("labs");
  const labsField = INFO_FIELDS.find((f) => f.key === "labs")!;

  const setEntries = (key: StructuredKey, entries: PatientInfoEntry[]) =>
    stage({
      [entryField(key)]: entries,
      [stateField(key)]: "documented",
    } as Partial<PatientSafetyInfo>);

  const setState = (key: StructuredKey, state: InfoDocState) =>
    stage({
      [stateField(key)]: state,
      ...(state === "documented" ? {} : { [entryField(key)]: [] }),
    } as Partial<PatientSafetyInfo>);

  /** What the client already shared for this appointment — their intake answers
   *  and the Health Passport fields they consented to share. Computed from the
   *  saved record so the source stays visible after it is applied. */
  const shared = useMemo(
    () => (appointmentId ? sharedIntakeInfo(appointmentId, keys, info) : []),
    [appointmentId, keys, info],
  );

  /** Shared answers prefill the safety checks once, so the provider never has to
   *  ask for something the client already gave. Anything the client did not
   *  share stays blank — it is never turned into a question for the provider.
   *  Nothing is written to the record until "Save patient information". */
  const prefilled = useRef<string | null>(null);
  useEffect(() => {
    if (!appointmentId || shared.length === 0) return;
    if (prefilled.current === appointmentId) return;
    prefilled.current = appointmentId;
    setPatch((cur) => {
      let next = cur;
      for (const item of shared) {
        next = { ...item.patch, ...next };
      }
      return next;
    });
  }, [appointmentId, shared]);

  const applied = (item: (typeof shared)[number]) =>
    Object.entries(item.patch).every(
      ([k, v]) =>
        JSON.stringify((view as Record<string, unknown>)[k]) === JSON.stringify(v) ||
        (Array.isArray(v) && v.length === 0),
    );

  /** Checks with nothing shared — left intentionally blank. */
  const notShared = keys.filter((k) => {
    if (shared.some((s) => s.key === k)) return false;
    if (isStructuredKey(k)) return docStateFor(view, k) === "not-documented";
    if (k === "pregnancy") return (view.pregnancyStatus ?? "not-documented") === "not-documented";
    if (k === "age") return !view.dob;
    return false;
  });

  return (
    <div className="mt-3 space-y-4 border-t border-[#EDEBF3] pt-3">
      {shared.length > 0 && (
        <div className="rounded-xl border border-[#E5DEF5] bg-[#F3F0FB] p-3">
          <p className="text-[12.5px] font-semibold text-[#3D2E6B]">
            {clientName
              ? `Filled in from what ${clientName} shared`
              : "Filled in from what the client shared"}
          </p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-[#5A4A8A]">
            These checks are already answered from their intake form and the Health Passport fields
            they consented to share — no need to ask again. Review, edit anything that changed, then
            save: you stay the author of the clinical record.
          </p>
          <ul className="mt-2 space-y-2">
            {shared.map((item) => (
              <li
                key={item.key}
                className="flex flex-wrap items-start gap-2 rounded-lg border border-[#EDE9F7] bg-white p-2.5"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[11.5px] font-semibold uppercase tracking-wide text-[#6F6889]">
                    {item.question}
                  </span>
                  <span className="mt-0.5 block text-[13px] text-[#2C2B4B]">{item.value}</span>
                </span>
                {applied(item) ? (
                  <span className="inline-flex h-8 items-center rounded-[10px] border border-[#E5DEF5] bg-[#F3F0FB] px-3 text-[11.5px] font-semibold uppercase tracking-wide text-[#6E4FD3]">
                    {item.source === "passport" ? "From Health Passport" : "From intake form"}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => stage(item.patch)}
                    className="inline-flex h-8 items-center rounded-[10px] bg-[#6E4FD3] px-3 text-[12px] font-semibold text-white transition hover:bg-[#5A4A8A]"
                  >
                    Use this answer
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {notShared.length > 0 && (
        <p className="rounded-xl border border-[#EDEBF3] bg-[#FAF9FC] p-3 text-[12px] leading-relaxed text-[#6F6889]">
          {clientName ? `${clientName} hasn't shared` : "The client hasn't shared"}{" "}
          {notShared.map((k) => infoLabel(k).toLowerCase()).join(", ")}. These are left blank on
          purpose — fill them in only if it comes up in the session.
        </p>
      )}
      {structured.map((key) => {
        const entries = entriesFor(view, key);
        const state = docStateFor(view, key);
        return (
          <div key={key}>
            <p className="text-[12.5px] font-semibold text-[#2C2B4B]">{infoLabel(key)}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {docStates(key).map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setState(key, s.value)}
                  className={`inline-flex h-7 items-center rounded-full px-3 text-[11.5px] font-semibold transition ${
                    state === s.value
                      ? "bg-[#6E4FD3] text-white"
                      : "border border-[#DEDAE8] bg-white text-[#5A4A8A] hover:bg-[#F7F5FB]"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {state === "documented" && (
              <>
                <datalist id={`rx-suggest-${key}`}>
                  {SUGGESTIONS[key].map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                <ul className="mt-2 space-y-2">
                  {entries.map((entry, i) => (
                    <li
                      key={entry.id}
                      className="rounded-lg border border-[#EDEBF3] bg-[#FCFBFE] p-2.5"
                    >
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <input
                          list={`rx-suggest-${key}`}
                          value={entry.name}
                          placeholder={
                            key === "allergies"
                              ? "Substance"
                              : key === "currentMedications"
                                ? "Medication name"
                                : "Condition"
                          }
                          onChange={(e) => {
                            const next = [...entries];
                            next[i] = { ...entry, name: e.target.value, updatedAt: Date.now() };
                            setEntries(key, next);
                          }}
                          className={inputClass}
                        />
                        {key === "currentMedications" && (
                          <>
                            <input
                              value={entry.strength ?? ""}
                              placeholder="Strength (e.g. 50 mg)"
                              onChange={(e) => {
                                const next = [...entries];
                                next[i] = {
                                  ...entry,
                                  strength: e.target.value,
                                  updatedAt: Date.now(),
                                };
                                setEntries(key, next);
                              }}
                              className={inputClass}
                            />
                            <input
                              value={entry.dose ?? ""}
                              placeholder="Dose (e.g. 1 tablet)"
                              onChange={(e) => {
                                const next = [...entries];
                                next[i] = { ...entry, dose: e.target.value, updatedAt: Date.now() };
                                setEntries(key, next);
                              }}
                              className={inputClass}
                            />
                            <input
                              value={entry.frequency ?? ""}
                              placeholder="Frequency (e.g. once daily)"
                              onChange={(e) => {
                                const next = [...entries];
                                next[i] = {
                                  ...entry,
                                  frequency: e.target.value,
                                  updatedAt: Date.now(),
                                };
                                setEntries(key, next);
                              }}
                              className={inputClass}
                            />
                            <select
                              value={entry.route ?? "Oral"}
                              onChange={(e) => {
                                const next = [...entries];
                                next[i] = { ...entry, route: e.target.value, updatedAt: Date.now() };
                                setEntries(key, next);
                              }}
                              className={inputClass}
                            >
                              {ROUTES.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                            <select
                              value={entry.taking ?? "yes"}
                              onChange={(e) => {
                                const next = [...entries];
                                next[i] = {
                                  ...entry,
                                  taking: e.target.value as PatientInfoEntry["taking"],
                                  updatedAt: Date.now(),
                                };
                                setEntries(key, next);
                              }}
                              className={inputClass}
                            >
                              {TAKING.map((t) => (
                                <option key={t.value} value={t.value}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                          </>
                        )}
                        {key === "allergies" && (
                          <>
                            <input
                              value={entry.reaction ?? ""}
                              placeholder="Reaction (e.g. rash, angioedema)"
                              onChange={(e) => {
                                const next = [...entries];
                                next[i] = {
                                  ...entry,
                                  reaction: e.target.value,
                                  updatedAt: Date.now(),
                                };
                                setEntries(key, next);
                              }}
                              className={inputClass}
                            />
                            <select
                              value={entry.severity ?? "unknown"}
                              onChange={(e) => {
                                const next = [...entries];
                                next[i] = {
                                  ...entry,
                                  severity: e.target.value as PatientInfoEntry["severity"],
                                  updatedAt: Date.now(),
                                };
                                setEntries(key, next);
                              }}
                              className={inputClass}
                            >
                              {SEVERITIES.map((s) => (
                                <option key={s.value} value={s.value}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                            <select
                              value={entry.reactionType ?? "allergy"}
                              onChange={(e) => {
                                const next = [...entries];
                                next[i] = {
                                  ...entry,
                                  reactionType: e.target.value as PatientInfoEntry["reactionType"],
                                  updatedAt: Date.now(),
                                };
                                setEntries(key, next);
                              }}
                              className={inputClass}
                            >
                              {REACTION_TYPES.map((s) => (
                                <option key={s.value} value={s.value}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                          </>
                        )}
                        {key === "conditions" && (
                          <input
                            value={entry.detail ?? ""}
                            placeholder="Relevant detail (e.g. year, severity, treatment)"
                            onChange={(e) => {
                              const next = [...entries];
                              next[i] = { ...entry, detail: e.target.value, updatedAt: Date.now() };
                              setEntries(key, next);
                            }}
                            className={inputClass}
                          />
                        )}
                        <select
                          value={entry.status ?? "active"}
                          onChange={(e) => {
                            const next = [...entries];
                            next[i] = {
                              ...entry,
                              status: e.target.value as PatientInfoStatus,
                              updatedAt: Date.now(),
                            };
                            setEntries(key, next);
                          }}
                          className={inputClass}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {INFO_STATUS_LABEL[s]}
                            </option>
                          ))}
                        </select>
                        <select
                          value={entry.source ?? "review"}
                          onChange={(e) => {
                            const next = [...entries];
                            next[i] = {
                              ...entry,
                              source: e.target.value as InfoSource,
                              updatedAt: Date.now(),
                            };
                            setEntries(key, next);
                          }}
                          className={inputClass}
                        >
                          {SOURCES.map((s) => (
                            <option key={s} value={s}>
                              {INFO_SOURCE_LABEL[s]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between">
                        <p className="text-[11.5px] text-[#6F6889]">
                          Last updated{" "}
                          {entry.updatedAt ? new Date(entry.updatedAt).toLocaleDateString() : "—"}
                        </p>
                        <button
                          type="button"
                          aria-label="Remove item"
                          onClick={() =>
                            setEntries(
                              key,
                              entries.filter((e) => e.id !== entry.id),
                            )
                          }
                          className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] text-[#7E7794] transition hover:bg-[#F1EEF8] hover:text-[#3D2E6B]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() =>
                    setEntries(key, [
                      ...entries,
                      {
                        id: genRxId(),
                        name: "",
                        status: "active",
                        source: "review",
                        updatedAt: Date.now(),
                      },
                    ])
                  }
                  className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-[10px] border border-[#D9D5E3] bg-white px-3 text-[12.5px] font-semibold text-[#3D2E6B] hover:bg-[#F7F5FB]"
                >
                  <Plus className="h-3.5 w-3.5" /> Add item
                </button>
              </>
            )}
            {state === "none-known" && (
              <p className="mt-1.5 text-[12px] leading-relaxed text-[#5A4A8A]">
                <strong>None known</strong> — You confirmed that the patient currently reports{" "}
                {key === "currentMedications"
                  ? "no medications"
                  : key === "allergies"
                    ? "no allergies"
                    : "no relevant medical conditions"}
                . This is a positive finding and the safety review can use it.
              </p>
            )}
            {state === "not-documented" && (
              <p className="mt-1.5 text-[12px] leading-relaxed text-[#8A6A20]">
                <strong>Not documented</strong> — This information has not been confirmed.{" "}
                {key === "currentMedications"
                  ? "Interaction checking remains incomplete."
                  : key === "allergies"
                    ? "Allergy checking remains incomplete."
                    : "Contraindication checking remains incomplete."}{" "}
                Not documented never means none.
              </p>
            )}
          </div>
        );
      })}

      {showBipolar && (
        <div>
          <p className="text-[12.5px] font-semibold text-[#2C2B4B]">
            Bipolar disorder or history of mania/hypomania
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(["present", "none-known", "not-documented"] as HistoryState[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => stage({ bipolarHistory: s })}
                className={`inline-flex h-7 items-center rounded-full px-3 text-[11.5px] font-semibold transition ${
                  (view.bipolarHistory ?? "not-documented") === s
                    ? "bg-[#6E4FD3] text-white"
                    : "border border-[#DEDAE8] bg-white text-[#5A4A8A] hover:bg-[#F7F5FB]"
                }`}
              >
                {HISTORY_STATE_LABEL[s]}
              </button>
            ))}
          </div>
          {view.bipolarHistory === "present" && (
            <input
              value={view.bipolarDetail ?? ""}
              placeholder="Brief detail — episode type, year, treatment"
              onChange={(e) => stage({ bipolarDetail: e.target.value })}
              className={`mt-2 ${inputClass}`}
            />
          )}
          <p className="mt-1.5 text-[12px] leading-relaxed text-[#5A4A8A]">
            {relevanceFor?.("bipolarHistory") ??
              "Screening result recorded by the prescribing clinician."}
          </p>
        </div>
      )}

      {showAge && (
        <div>
          <p className="text-[12.5px] font-semibold text-[#2C2B4B]">Date of birth</p>
          <div className="mt-1.5 flex flex-wrap items-end gap-3">
            <label className="text-[12px] text-[#5A4A8A]">
              <span className="mb-1 block">MM / DD / YYYY</span>
              <input
                type="date"
                value={view.dob ?? ""}
                onChange={(e) => stage({ dob: e.target.value, dobUnavailable: false })}
                className={inputClass}
              />
            </label>
            <p className="pb-2 text-[12.5px] font-semibold text-[#2C2B4B]">
              {patientAge(view) !== null ? `Age ${patientAge(view)}` : "Age —"}
            </p>
          </div>
          <label className="mt-2 flex items-start gap-2 text-[12px] leading-relaxed text-[#5A4A8A]">
            <input
              type="checkbox"
              checked={!!view.dobUnavailable}
              onChange={(e) =>
                stage({
                  dobUnavailable: e.target.checked,
                  ...(e.target.checked ? { dob: "" } : {}),
                })
              }
              className="mt-0.5 h-4 w-4 flex-none rounded border-[#D9D5E3] text-[#6E4FD3] focus:ring-[#6E4FD3]"
            />
            <span>Date of birth unavailable</span>
          </label>
          {view.dobUnavailable && (
            <label className="mt-2 block text-[12px] text-[#5A4A8A]">
              <span className="mb-1 block">Estimated age in years, if known</span>
              <input
                type="number"
                min={0}
                max={120}
                value={view.ageYears ?? ""}
                onChange={(e) =>
                  stage({
                    ageYears: e.target.value === "" ? undefined : Number(e.target.value),
                  })
                }
                className={inputClass}
              />
            </label>
          )}
          <p className="mt-1.5 text-[12px] leading-relaxed text-[#5A4A8A]">
            {patientAge(view) !== null
              ? "Age is calculated from the date of birth. Age-dependent warnings can now be evaluated."
              : (relevanceFor?.("age") ??
                "Age-dependent warnings stay hidden until the date of birth is recorded.")}
          </p>
          <label className="mt-3 block text-[12px] text-[#5A4A8A]">
            <span className="mb-1 block font-semibold text-[#2C2B4B]">
              Patient residential address
            </span>
            <input
              value={view.address ?? ""}
              placeholder="Street, city, state / province, postal code"
              onChange={(e) => stage({ address: e.target.value })}
              className={inputClass}
            />
            <span className="mt-1 block leading-relaxed">
              Printed on the prescription copy. Mandatory before signing for
              controlled / dangerous drugs — United States electronic controlled
              prescriptions and Philippine dangerous drug, senior-citizen and PWD
              prescriptions all require the patient's address.
            </span>
          </label>
          <label className="mt-3 block text-[12px] text-[#5A4A8A]">
            <span className="mb-1 block font-semibold text-[#2C2B4B]">
              Patient location during this session
            </span>
            <input
              value={view.encounterLocation ?? ""}
              placeholder="City, state / province, country"
              onChange={(e) => stage({ encounterLocation: e.target.value })}
              className={inputClass}
            />
            <span className="mt-1 block leading-relaxed">
              Recorded separately from the residential address. This is where the
              patient was during the consultation, which determines whose
              prescribing rules apply. It is not printed on the prescription.
            </span>
          </label>
        </div>
      )}

      {showPregnancy && (
        <div>
          <p className="text-[12.5px] font-semibold text-[#2C2B4B]">
            Pregnancy / breastfeeding status
          </p>
          <select
            value={view.pregnancyStatus ?? "not-documented"}
            onChange={(e) => stage({ pregnancyStatus: e.target.value as PregnancyStatus })}
            className={`mt-1.5 ${inputClass}`}
          >
            {(
              [
                "not-applicable",
                "not-pregnant",
                "pregnant",
                "breastfeeding",
                "trying",
                "not-documented",
              ] as PregnancyStatus[]
            ).map((s) => (
              <option key={s} value={s}>
                {PREGNANCY_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[12px] leading-relaxed text-[#8A6A20]">
            {(view.pregnancyStatus ?? "not-documented") === "not-documented"
              ? "“Unknown / not assessed” leaves this check incomplete. It never means “not pregnant”. Select “Not applicable” when this is not clinically relevant for the patient."
              : (relevanceFor?.("pregnancy") ?? "Recorded status is used by the safety review.")}
          </p>
        </div>
      )}

      {showLabs && (
        <div>
          <p className="text-[12.5px] font-semibold text-[#2C2B4B]">{labsField.label}</p>
          <textarea
            rows={2}
            value={view.labs ?? ""}
            placeholder={labsField.placeholder}
            onChange={(e) => stage({ labs: e.target.value })}
            className={`mt-1.5 ${inputClass}`}
          />
          <label className="mt-2 block text-[12px] text-[#5A4A8A]">
            <span className="mb-1 block">Date the result was taken</span>
            <input
              type="date"
              value={view.labsAt ?? ""}
              onChange={(e) => stage({ labsAt: e.target.value })}
              className={inputClass}
            />
          </label>
          <button
            type="button"
            onClick={() => stage({ labs: "No relevant results available", labsAt: "" })}
            className="mt-2 inline-flex h-8 items-center rounded-lg border border-[#DEDAE8] bg-white px-3 text-[12px] font-semibold text-[#3D2E6B] hover:bg-[#F7F5FB]"
          >
            No relevant results available
          </button>
          <p className="mt-1.5 text-[12px] leading-relaxed text-[#5A4A8A]">
            {(view.labs ?? "").trim().length < 3
              ? "No relevant results documented. Where no result exists, record “No relevant results available” — that is never the same as a normal result."
              : (relevanceFor?.("labs") ??
                "Recorded only when this medication or this patient needs monitoring.")}
          </p>
        </div>
      )}

      <div>
        {dirty && (
          <button
            type="button"
            onClick={() => {
              onChange(patch);
              setPatch({});
              setSaved(Date.now());
              onSave();
            }}
            className="inline-flex h-9 items-center rounded-[10px] border border-[#D9D5E3] bg-white px-3.5 text-[13px] font-semibold text-[#3D2E6B] hover:bg-[#F7F5FB]"
          >
            Save patient information
          </button>
        )}
        <p className="mt-1.5 text-[12px] leading-relaxed text-[#5A4A8A]">
          {dirty
            ? "Not saved yet — press “Save patient information” to record these details. "
            : ""}
          Information saved here becomes part of the client&rsquo;s clinical record and may be used
          in future medication safety reviews. It is not included in the client summary.
          {saved ? ` Saved ${new Date(saved).toLocaleTimeString()}.` : ""}
        </p>
      </div>
    </div>
  );
}
