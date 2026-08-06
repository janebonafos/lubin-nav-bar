// Structured patient information for the prescription safety review.
// Allergies, current medications and relevant conditions are captured as
// searchable entries with a status, a source and a last-updated date.
// "None known" and "Not documented" are deliberately distinct states.
import { useState } from "react";
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
    "Seizure disorder",
    "Bleeding disorder",
    "Liver impairment",
    "Renal impairment",
    "Thyroid disorder",
    "Hypertension",
    "Diabetes mellitus",
    "Pregnancy",
    "Glaucoma",
  ],
};

const DOC_STATES: { value: InfoDocState; label: string }[] = [
  { value: "documented", label: "Documented items" },
  { value: "none-known", label: "None known" },
  { value: "not-documented", label: "Not documented" },
];

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
}: {
  keys: InfoKey[];
  info?: PatientSafetyInfo;
  onChange: (p: Partial<PatientSafetyInfo>) => void;
  onSave: () => void;
  /** Medication-specific reason shown under an item, so nothing looks universal. */
  relevanceFor?: (key: InfoKey) => string;
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

  return (
    <div className="mt-3 space-y-4 border-t border-[#EDEBF3] pt-3">
      {structured.map((key) => {
        const entries = entriesFor(view, key);
        const state = docStateFor(view, key);
        return (
          <div key={key}>
            <p className="text-[12.5px] font-semibold text-[#2C2B4B]">{infoLabel(key)}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {DOC_STATES.map((s) => (
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
                          placeholder="Search or type a name"
                          onChange={(e) => {
                            const next = [...entries];
                            next[i] = { ...entry, name: e.target.value, updatedAt: Date.now() };
                            setEntries(key, next);
                          }}
                          className={inputClass}
                        />
                        <input
                          value={entry.detail ?? ""}
                          placeholder={
                            key === "allergies"
                              ? "Reaction and severity"
                              : key === "currentMedications"
                                ? "Dose and frequency"
                                : "Relevant details"
                          }
                          onChange={(e) => {
                            const next = [...entries];
                            next[i] = { ...entry, detail: e.target.value, updatedAt: Date.now() };
                            setEntries(key, next);
                          }}
                          className={inputClass}
                        />
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
          <p className="text-[12.5px] font-semibold text-[#2C2B4B]">Bipolar or mania history</p>
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
              placeholder="Brief detail (episode, year, treatment)"
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
          <p className="text-[12.5px] font-semibold text-[#2C2B4B]">Age or date of birth</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <label className="text-[12px] text-[#5A4A8A]">
              <span className="mb-1 block">Date of birth</span>
              <input
                type="date"
                value={view.dob ?? ""}
                onChange={(e) => stage({ dob: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="text-[12px] text-[#5A4A8A]">
              <span className="mb-1 block">or age in years</span>
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
          </div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-[#5A4A8A]">
            {patientAge(view) !== null
              ? `Recorded age ${patientAge(view)}. Age-dependent warnings can now be evaluated.`
              : (relevanceFor?.("age") ??
                "Age-dependent warnings stay hidden until the age or date of birth is recorded.")}
          </p>
        </div>
      )}

      {showPregnancy && (
        <div>
          <p className="text-[12.5px] font-semibold text-[#2C2B4B]">
            Pregnancy and breastfeeding status
          </p>
          <select
            value={view.pregnancyStatus ?? "not-documented"}
            onChange={(e) => stage({ pregnancyStatus: e.target.value as PregnancyStatus })}
            className={`mt-1.5 ${inputClass}`}
          >
            {(
              [
                "pregnant",
                "breastfeeding",
                "trying",
                "not-pregnant",
                "not-applicable",
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
              ? "“Not documented” leaves the pregnancy and breastfeeding check incomplete. It never means “not pregnant”."
              : (relevanceFor?.("pregnancy") ?? "Recorded status is used by the safety review.")}
          </p>
        </div>
      )}

      {showLabs && (
        <label className="block">
          <span className="mb-1 block text-[12.5px] font-semibold text-[#2C2B4B]">
            {labsField.label}
          </span>
          <textarea
            rows={2}
            value={view.labs ?? ""}
            placeholder={labsField.placeholder}
            onChange={(e) => stage({ labs: e.target.value })}
            className={inputClass}
          />
          <span className="mt-1.5 block text-[12px] leading-relaxed text-[#5A4A8A]">
            {relevanceFor?.("labs") ??
              "Recorded only when this medication or this patient needs monitoring."}
          </span>
        </label>
      )}

      <div>
        <button
          type="button"
          onClick={() => {
            if (dirty) onChange(patch);
            setPatch({});
            setSaved(Date.now());
            onSave();
          }}
          className="inline-flex h-9 items-center rounded-[10px] border border-[#D9D5E3] bg-white px-3.5 text-[13px] font-semibold text-[#3D2E6B] hover:bg-[#F7F5FB]"
        >
          Save patient information
        </button>
        <p className="mt-1.5 text-[12px] leading-relaxed text-[#5A4A8A]">
          {dirty
            ? "Not saved yet — press “Save patient information” to record these details. "
            : ""}
          This information is saved to the client&rsquo;s private clinical record and is not
          included in the client summary.
          {saved ? ` Saved ${new Date(saved).toLocaleTimeString()}.` : ""}
        </p>
      </div>
    </div>
  );
}
