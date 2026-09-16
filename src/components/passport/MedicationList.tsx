import { useEffect, useState } from "react";
import { ChevronDown, Eye, Pill, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  formatMedDate,
  groupMedications,
  medicationList,
  removeMedication,
  subscribeMedications,
  type MedicationEntry,
} from "@/lib/passport/medications";
import { subscribePrescriptionDocuments } from "@/lib/prescription/documents";
import { ensureSamplePrescriptionRecord } from "@/lib/prescription/sampleRecord";

/**
 * Compact medication list shared by My Prescriptions and the Health Passport.
 * Each entry is a single row with open (when a prescription exists) and remove
 * icons. Demo data comes from src/lib/passport/medications.ts.
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
    const unsubDocs = subscribePrescriptionDocuments(read);
    const unsubMeds = subscribeMedications(read);
    return () => {
      unsubDocs();
      unsubMeds();
    };
  }, []);

  const { current, past } = groupMedications(entries);

  return (
    <section className="rounded-2xl border border-[#E3DBF5]/70 bg-white p-5 sm:p-6" aria-label="Medication list">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-[15px] font-bold text-[#3D2E6B]">
            <Pill className="h-4 w-4 text-[#7E6BAF]" /> Medication list
          </h3>
          <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-[#6F6889]">
            Everything you take right now, kept as a simple list. Older medicines stay in your history.
          </p>
        </div>
      </div>

      <h4 className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#7E6BAF]">
        Taking now
      </h4>
      {current.length ? (
        <ul className="mt-2.5 space-y-2">
          {current.map((entry) => (
            <MedicationRow key={entry.id} entry={entry} onOpenPrescription={onOpenPrescription} />
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[12.5px] italic text-[#8A7FB0]">Nothing recorded right now.</p>
      )}

      {past.length > 0 && (
        <>
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
            <ul className="mt-3 space-y-2">
              {past.map((entry) => (
                <MedicationRow key={entry.id} entry={entry} onOpenPrescription={onOpenPrescription} />
              ))}
            </ul>
          )}
        </>
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
  const canOpen = Boolean(entry.prescriptionId) && Boolean(onOpenPrescription);

  const handleRemove = () => {
    removeMedication(entry.id);
    toast(`Removed ${entry.name} from your list`, {
      description: "This only hides it here — your prescription record is untouched.",
    });
  };

  return (
    <li className="flex items-center gap-3 rounded-xl border border-[#E3DBF5]/60 bg-[#FBF9FF]/60 px-4 py-3 transition hover:border-[#C9BDEF]/70 hover:bg-white">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-[#2C2B4B]">
          {entry.name}
          {entry.strength ? <span className="font-medium text-[#3D2E6B]"> · {entry.strength}</span> : null}
        </p>
        <p className="mt-0.5 truncate text-[12.5px] text-[#6F6889]">
          {[entry.dose, entry.frequency].filter(Boolean).join(" · ") || "No instructions recorded"}
        </p>
      </div>

      <span
        className={`hidden shrink-0 rounded-[10px] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] sm:inline-flex ${statusTone(entry.status)}`}
      >
        {statusLabel(entry.status)}
      </span>

      <div className="flex shrink-0 items-center gap-1">
        {canOpen ? (
          <button
            type="button"
            onClick={() => onOpenPrescription!(entry.prescriptionId!)}
            title={`Open prescription${entry.prescriptionNumber ? ` ${entry.prescriptionNumber}` : ""}`}
            aria-label={`Open prescription${entry.prescriptionNumber ? ` ${entry.prescriptionNumber}` : ""}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#7E6BAF] transition hover:bg-[#F2EEFB] hover:text-[#3D2E6B]"
          >
            <Eye className="h-4 w-4" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleRemove}
          title="Remove from list"
          aria-label={`Remove ${entry.name} from list`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#9A8FB5] transition hover:bg-[#FDF1F1] hover:text-[#8A3B3B]"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

function statusLabel(status: MedicationEntry["status"]) {
  return status === "current" ? "Current" : status === "completed" ? "Completed" : "Stopped";
}

function statusTone(status: MedicationEntry["status"]) {
  if (status === "current") return "bg-[#EAF6EF] text-[#256B47]";
  if (status === "completed") return "bg-[#F3F0FA] text-[#5B4B8A]";
  return "bg-[#FDF1F1] text-[#8A3B3B]";
}
