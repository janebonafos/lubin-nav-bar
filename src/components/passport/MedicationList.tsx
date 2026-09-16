import { useEffect, useState } from "react";
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
 * "Registry style": flat divided rows with text actions — visually lighter
 * than the official prescription document cards below it.
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
    const unsubDocs = subscribePrescriptionDocuments(read);
    const unsubMeds = subscribeMedications(read);
    return () => {
      unsubDocs();
      unsubMeds();
    };
  }, []);

  const { current, past } = groupMedications(entries);

  return (
    <section aria-label="Medication list">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-[#3D2E6B]">
          Current medication list
        </h3>
        <p className="text-sm text-[#6F6889]">
          Your active daily schedule — a simple list, not the official Rx
          documents.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#EAE7F5] bg-white shadow-sm">
        {current.length ? (
          <ul className="divide-y divide-[#F3F1FB]">
            {current.map((entry) => (
              <MedicationRow
                key={entry.id}
                entry={entry}
                onOpenPrescription={onOpenPrescription}
              />
            ))}
          </ul>
        ) : (
          <p className="p-6 text-[13px] italic text-[#8A7FB0]">
            Nothing recorded right now.
          </p>
        )}

        {past.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              aria-expanded={showHistory}
              className="w-full border-t border-[#F3F1FB] py-4 text-[13px] font-bold uppercase tracking-wide text-[#7E6BAF] transition-colors hover:bg-[#F8F7FC]"
            >
              {showHistory
                ? "Hide previous medications"
                : `Show ${past.length} previous medication${past.length === 1 ? "" : "s"}`}
            </button>
            {showHistory && (
              <ul className="divide-y divide-[#F3F1FB] border-t border-[#F3F1FB]">
                {past.map((entry) => (
                  <MedicationRow
                    key={entry.id}
                    entry={entry}
                    onOpenPrescription={onOpenPrescription}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </div>
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
      description:
        "This only hides it here — your prescription record is untouched.",
    });
  };

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-5 transition-colors hover:bg-[#F8F7FC] sm:p-6">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h4 className="text-[15px] font-bold text-[#3D2E6B]">
            {entry.name}
            {entry.strength ? (
              <span className="font-semibold"> · {entry.strength}</span>
            ) : null}
          </h4>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusTone(entry.status)}`}
          >
            {statusLabel(entry.status)}
          </span>
        </div>
        <p className="text-sm text-[#6F6889]">
          {[entry.dose, entry.frequency].filter(Boolean).join(" • ") ||
            "No instructions recorded"}
        </p>
        {entry.prescriptionNumber ? (
          <p className="mt-1 text-[11px] font-medium text-[#A89BD0]">
            From prescription {entry.prescriptionNumber}
            {entry.startedAt ? ` · started ${formatMedDate(entry.startedAt)}` : ""}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-5">
        {canOpen ? (
          <button
            type="button"
            onClick={() => onOpenPrescription!(entry.prescriptionId!)}
            className="text-sm font-semibold text-[#7E6BAF] transition-colors hover:text-[#3D2E6B]"
          >
            View details
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleRemove}
          aria-label={`Remove ${entry.name} from list`}
          className="text-sm font-semibold text-[#B9B0CF] transition-colors hover:text-[#A14343]"
        >
          Remove
        </button>
      </div>
    </li>
  );
}

function statusLabel(status: MedicationEntry["status"]) {
  return status === "current"
    ? "Current"
    : status === "completed"
      ? "Completed"
      : "Stopped";
}

function statusTone(status: MedicationEntry["status"]) {
  if (status === "current")
    return "border-[#CDE9DB] bg-[#EAF6EF] text-[#256B47]";
  if (status === "completed")
    return "border-[#E3DBF5] bg-[#F3F0FA] text-[#5B4B8A]";
  return "border-[#F2D5D5] bg-[#FDF1F1] text-[#8A3B3B]";
}
