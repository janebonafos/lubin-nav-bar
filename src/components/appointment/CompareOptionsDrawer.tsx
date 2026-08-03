import { useEffect, useState } from "react";
import { X, Loader2, Columns3, Check } from "lucide-react";
import {
  type MedicationReference,
  type PrescriptionMedication,
  type RxCountry,
} from "@/lib/prescription/store";
import {
  AI_SUMMARY_CAVEAT,
  fetchMedicationReference,
} from "@/lib/prescription/reference";
import { OriginBadge } from "./MedicationReferenceDrawer";

const NEUTRAL_LABELS = [
  "Option to consider",
  "Additional option",
  "Not suitable based on available information",
] as const;

const ROWS: {
  label: string;
  get: (r: MedicationReference | undefined, m: PrescriptionMedication) => string;
}[] = [
  { label: "Indication", get: (r, m) => r?.general.approvedIndications || m.indication || "" },
  { label: "Medication class", get: (r) => r?.general.medicationClass ?? "" },
  {
    label: "Dosing considerations",
    get: (r, m) =>
      r?.general.referenceDosing ||
      [m.dose, m.frequency, m.duration].filter(Boolean).join(" · "),
  },
  { label: "Common adverse effects", get: (r) => r?.general.commonAdverseEffects ?? "" },
  { label: "Serious adverse effects", get: (r) => r?.general.seriousAdverseEffects ?? "" },
  { label: "Contraindications", get: (r) => r?.general.contraindications ?? "" },
  { label: "Interactions", get: (r) => r?.general.interactions ?? "" },
  { label: "Monitoring needs", get: (r) => r?.general.monitoring ?? "" },
  {
    label: "Patient-specific considerations",
    get: (r) =>
      [r?.patient.potentialInteractions, r?.patient.relevantConditions]
        .filter(Boolean)
        .join(" — "),
  },
  { label: "Jurisdictional availability", get: (r, m) => r?.general.availability || m.availabilityNote || "" },
];

export function CompareOptionsDrawer({
  open,
  onClose,
  medications,
  country,
  appointmentId,
  clientName,
  onCached,
  onSelectOption,
}: {
  open: boolean;
  onClose: () => void;
  medications: PrescriptionMedication[];
  country: RxCountry;
  appointmentId: string;
  clientName?: string;
  onCached?: (medId: string, ref: MedicationReference) => void;
  onSelectOption?: (medId: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [refs, setRefs] = useState<Record<string, MedicationReference>>({});
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(medications.slice(0, 3).map((m) => m.id));
  }, [open, medications]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const missing = selected.filter((id) => !refs[id]);
    if (missing.length === 0) return;
    let cancelled = false;
    setBusy(true);
    (async () => {
      for (const id of missing) {
        const med = medications.find((m) => m.id === id);
        if (!med) continue;
        if (med.reference && med.reference.country === country) {
          if (!cancelled) setRefs((p) => ({ ...p, [id]: med.reference! }));
          continue;
        }
        try {
          const data = await fetchMedicationReference({
            appointmentId,
            med,
            country,
            clientName,
          });
          if (cancelled) return;
          setRefs((p) => ({ ...p, [id]: data }));
          onCached?.(id, data);
        } catch {
          /* leave column sparse */
        }
      }
      if (!cancelled) setBusy(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selected, country]);

  if (!open) return null;

  const columns = selected
    .map((id) => medications.find((m) => m.id === id))
    .filter((m): m is PrescriptionMedication => !!m);

  const toggle = (id: string) =>
    setSelected((cur) =>
      cur.includes(id)
        ? cur.filter((x) => x !== id)
        : cur.length >= 3
          ? cur
          : [...cur, id],
    );

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <button
        type="button"
        aria-label="Close comparison"
        onClick={onClose}
        className="absolute inset-0 bg-[#2C2B4B]/40"
      />
      <aside
        role="dialog"
        aria-label="Compare medication options"
        className="relative flex h-full w-full max-w-[860px] flex-col bg-white shadow-2xl"
      >
        <header className="flex items-start gap-3 border-b border-[#ECE7F6] bg-[#FAF7FE] px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#7E6BAF]">
              <Columns3 className="h-3.5 w-3.5" /> Compare options ·{" "}
              {country === "PH" ? "Philippines" : "United States"}
            </p>
            <h2 className="text-base font-semibold text-[#3D2E6B]">
              Side-by-side medication comparison
            </h2>
            <p className="mt-0.5 text-[12px] text-[#5A4A8A]">
              Choose up to three medications. Options are not ranked — the prescribing
              clinician decides.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] p-1.5 text-[#7E6BAF] hover:bg-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-auto px-4 py-4">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {medications.map((m) => {
              const on = selected.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggle(m.id)}
                  className={`rounded-full border px-2.5 py-1 text-[12px] font-semibold transition ${
                    on
                      ? "border-[#7E6BAF] bg-[#EEE8F8] text-[#5A3E8F]"
                      : "border-[#D6CCEC] bg-white text-[#7E6BAF] hover:bg-[#F7F4FB]"
                  }`}
                >
                  {m.name || "Medication draft"}
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border border-[#E1D9F1] bg-[#FAF7FE] px-3 py-2 text-[11px] leading-relaxed text-[#5A4A8A]">
            <span className="font-semibold uppercase tracking-wider text-[#7E6BAF]">
              AI-generated summary
            </span>{" "}
            — {AI_SUMMARY_CAVEAT}
          </div>

          {busy && (
            <p className="mt-3 flex items-center gap-2 text-[12px] text-[#7E6BAF]">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading medication
              references…
            </p>
          )}

          {columns.length === 0 ? (
            <p className="mt-4 text-[13px] text-[#7E6BAF]">
              Select at least one medication to compare.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left align-top">
                <thead>
                  <tr>
                    <th className="w-[150px] border-b border-[#ECE7F6] pb-2 pr-3 text-[10px] font-bold uppercase tracking-wider text-[#7E6BAF]">
                      Attribute
                    </th>
                    {columns.map((m) => (
                      <th
                        key={m.id}
                        className="border-b border-[#ECE7F6] px-3 pb-2 align-top"
                      >
                        <p className="text-[13px] font-semibold text-[#3D2E6B]">
                          {m.name || "Medication draft"}
                        </p>
                        <div className="mt-1">
                          <OriginBadge med={m} />
                        </div>
                        <select
                          value={labels[m.id] ?? NEUTRAL_LABELS[0]}
                          onChange={(e) =>
                            setLabels((p) => ({ ...p, [m.id]: e.target.value }))
                          }
                          className="mt-1.5 w-full rounded-lg border border-[#D6CCEC] bg-white px-2 py-1 text-[11px] font-semibold text-[#5A4A8A] focus:border-[#7E6BAF] focus:outline-none"
                        >
                          {NEUTRAL_LABELS.map((l) => (
                            <option key={l} value={l}>
                              {l}
                            </option>
                          ))}
                        </select>
                        {onSelectOption && (
                          <button
                            type="button"
                            onClick={() => onSelectOption(m.id)}
                            className="mt-1.5 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-[#D6CCEC] bg-white px-2 py-1 text-[11px] font-semibold text-[#5A4A8A] hover:bg-[#F7F4FB]"
                          >
                            <Check className="h-3 w-3" />
                            {m.origin === "ai-option"
                              ? "Selected from AI options"
                              : "Mark as selected from AI options"}
                          </button>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row) => (
                    <tr key={row.label} className="align-top">
                      <th className="border-b border-[#F1ECF9] py-2 pr-3 text-[11px] font-semibold text-[#7E6BAF]">
                        {row.label}
                      </th>
                      {columns.map((m) => {
                        const v = row.get(refs[m.id], m).trim();
                        return (
                          <td
                            key={m.id}
                            className="border-b border-[#F1ECF9] px-3 py-2 text-[12px] leading-relaxed text-[#3D2E6B]"
                          >
                            {v || <span className="text-[#A89BD0]">Not stated</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}