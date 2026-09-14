import { useEffect, useState } from "react";
import { ChevronDown, FileText, Pill, Sparkles, User } from "lucide-react";

import {
  formatMedDate,
  groupMedications,
  medicationList,
  type MedicationEntry,
} from "@/lib/passport/medications";
import { subscribePrescriptionDocuments } from "@/lib/prescription/documents";
import { ensureSamplePrescriptionRecord } from "@/lib/prescription/sampleRecord";

/**
 * Structured medication list shared by My Prescriptions and the Health Passport.
 * Demo data comes from src/lib/passport/medications.ts.
 */
export default function MedicationList({
  onOpenPrescription,
}: {
  onOpenPrescription?: (prescriptionId: string) => void;
}) {
  const [entries, setEntries] = useState<MedicationEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    ensureSamplePrescriptionRecord();
    const read = () => setEntries(medicationList());
    read();
    return subscribePrescriptionDocuments(read);
  }, []);

  const { current, past } = groupMedications(entries);
  const prescribedCount = current.filter((e) => e.source === "prescribed").length;
  const reportedCount = current.filter((e) => e.source === "patient-reported").length;

  return (
    <section className="rounded-2xl border border-[#E3DBF5]/70 bg-white p-5 sm:p-6" aria-label="Medication list">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-[15px] font-bold text-[#3D2E6B]">
            <Pill className="h-4 w-4 text-[#7E6BAF]" /> Medication list
          </h3>
          <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-[#6F6889]">
            Everything you take right now, with what a prescriber prescribed kept separate from what
            you told us you take. Older medicines stay in your history.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Tag tone="prescribed">{prescribedCount} prescribed</Tag>
          <Tag tone="reported">{reportedCount} patient reports taking</Tag>
        </div>
      </div>

      <h4 className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#7E6BAF]">
        Taking now
      </h4>
      {current.length ? (
        <ul className="mt-2.5 space-y-2.5">
          {current.map((entry) => (
            <MedicationRow key={entry.id} entry={entry} onOpenPrescription={onOpenPrescription} />
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[12.5px] italic text-[#8A7FB0]">Nothing recorded right now.</p>
      )}

      <button
        type="button"
        onClick={() => setShowHistory((v) => !v)}
        aria-expanded={showHistory}
        className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#3D2E6B] hover:text-[#7E6BAF]"
      >
        <ChevronDown className={`h-4 w-4 transition-transform ${showHistory ? "rotate-180" : ""}`} />
        Previous medications ({past.length})
      </button>
      {showHistory && (
        <ul className="mt-3 space-y-2.5">
          {past.map((entry) => (
            <MedicationRow key={entry.id} entry={entry} onOpenPrescription={onOpenPrescription} />
          ))}
        </ul>
      )}
    </section>
  );
}

function MedicationRow({
  entry,
  onOpenPrescription,
}: {
  entry: MedicationEntry;
  onOpenPrescription?: (prescriptionId: string) => void;
}) {
  const prescribed = entry.source === "prescribed";
  return (
    <li className="rounded-2xl border border-[#E3DBF5]/70 bg-[#FBF9FF]/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-[#2C2B4B]">
            {entry.name}
            {entry.strength ? <span className="font-semibold text-[#3D2E6B]"> · {entry.strength}</span> : null}
          </p>
          <p className="mt-1 text-[12.5px] text-[#6F6889]">
            {[entry.dose, entry.route, entry.frequency].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Tag tone={prescribed ? "prescribed" : "reported"}>
            {prescribed ? "Prescribed" : entry.supplement ? "Patient reports taking · supplement" : "Patient reports taking"}
          </Tag>
          <Tag tone={entry.status}>{statusLabel(entry.status)}</Tag>
        </div>
      </div>

      <dl className="mt-3 grid gap-x-6 gap-y-2 border-t border-[#E3DBF5]/70 pt-3 text-[12px] sm:grid-cols-2">
        <Field label="Started">{formatMedDate(entry.startDate)}</Field>
        <Field label="Ended">{entry.endDate ? formatMedDate(entry.endDate) : "Ongoing"}</Field>
        <Field label="Prescriber">
          {prescribed ? (
            <span className="inline-flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-[#7E6BAF]" />
              {entry.prescriber ?? "Not recorded"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#7E6BAF]" /> No prescriber — self-managed
            </span>
          )}
        </Field>
        <Field label="Last reviewed">{formatMedDate(entry.lastReviewed)}</Field>
        <Field label="Source" wide>
          {entry.sourceDetail}
        </Field>
      </dl>

      {entry.note ? (
        <p className="mt-2 text-[12px] leading-relaxed text-[#6F6889]">{entry.note}</p>
      ) : null}

      {entry.prescriptionId && onOpenPrescription ? (
        <button
          type="button"
          onClick={() => onOpenPrescription(entry.prescriptionId!)}
          className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#3D2E6B] hover:text-[#7E6BAF]"
        >
          <FileText className="h-3.5 w-3.5" />
          Open prescription{entry.prescriptionNumber ? ` ${entry.prescriptionNumber}` : ""}
        </button>
      ) : null}
    </li>
  );
}

function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#A79BC7]">{label}</dt>
      <dd className="mt-0.5 font-medium text-[#3D2E6B]">{children}</dd>
    </div>
  );
}

function statusLabel(status: MedicationEntry["status"]) {
  return status === "current" ? "Current" : status === "completed" ? "Completed" : "Stopped";
}

function Tag({
  tone,
  children,
}: {
  tone: "prescribed" | "reported" | "current" | "completed" | "stopped";
  children: React.ReactNode;
}) {
  const styles: Record<string, string> = {
    prescribed: "bg-[#3D2E6B] text-white",
    reported: "border border-[#DCD4F0] bg-white text-[#5B4B8A]",
    current: "bg-[#EAF6EF] text-[#256B47]",
    completed: "bg-[#F3F0FA] text-[#5B4B8A]",
    stopped: "bg-[#FDF1F1] text-[#8A3B3B]",
  };
  return (
    <span
      className={`inline-flex items-center rounded-[10px] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] ${styles[tone]}`}
    >
      {children}
    </span>
  );
}
