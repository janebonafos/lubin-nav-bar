import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  formatMedDate,
  groupMedications,
  markMedicationNotTaking,
  medicationList,
  removeMedication,
  restoreMedication,
  resumeMedication,
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
const PAGE_SIZE = 4;

export default function MedicationList({
  onOpenPrescription,
}: {
  onOpenPrescription?: (prescriptionId: string) => void;
}) {
  const [entries, setEntries] = useState<MedicationEntry[]>([]);
  const [page, setPage] = useState(1);

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

  // One continuous list: current medications first, then history.
  const ordered = [...current, ...past];
  const pageCount = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = ordered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <section aria-label="Medication list">
      <div className="mb-4">
        <h3 className="font-display text-xl font-semibold text-[#3D2E6B]">
          Current medication list
        </h3>
        <p className="text-sm text-[#6F6889]">
          Your active daily schedule — a simple list, not the official Rx
          documents.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#EAE7F5] bg-white shadow-sm">
        {visible.length ? (
          <ul className="divide-y divide-[#F3F1FB]">
            {visible.map((entry) => (
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

        {pageCount > 1 && (
          <div className="flex items-center justify-between border-t border-[#F3F1FB] px-4 py-3 sm:px-5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="rounded-[12px] px-3 py-1.5 text-[13px] font-semibold text-[#5B4B8A] transition-colors hover:bg-[#F8F7FC] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <p className="text-[12.5px] text-[#6F6889]">
              Page {safePage} of {pageCount} · {ordered.length} medication
              {ordered.length === 1 ? "" : "s"}
            </p>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={safePage === pageCount}
              className="rounded-[12px] px-3 py-1.5 text-[13px] font-semibold text-[#5B4B8A] transition-colors hover:bg-[#F8F7FC] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
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

  const handleNotTaking = () => {
    markMedicationNotTaking(entry.id);
    toast(`Recorded: you are no longer taking ${entry.name}`, {
      description:
        "Moved to your medication history as patient-reported. Your prescription record stays unchanged. Talk to your clinician about any change in medication.",
      action: {
        label: "Undo",
        onClick: () => resumeMedication(entry.id),
      },
    });
  };

  const handleRemove = () => {
    removeMedication(entry.id);
    toast(`Removed ${entry.name} as an incorrect entry`, {
      description:
        "This only hides it here — your prescription record is untouched.",
      action: {
        label: "Undo",
        onClick: () => restoreMedication(entry.id),
      },
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
        </div>
        <p className="text-sm text-[#6F6889]">
          {[entry.dose, entry.frequency].filter(Boolean).join(" • ") ||
            "No instructions recorded"}
        </p>
        {entry.prescriptionNumber ? (
          <p className="mt-1 text-[11px] font-medium text-[#A89BD0]">
            From prescription {entry.prescriptionNumber}
            {entry.startDate ? ` · started ${formatMedDate(entry.startDate)}` : ""}
          </p>
        ) : null}
        {entry.patientReportedStop ? (
          <p className="mt-1 text-[11px] font-semibold text-[#8A7FB0]">
            You reported no longer taking this ·{" "}
            {formatMedDate(entry.patientReportedStop)} · Patient-reported
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusTone(entry.status)}`}
        >
          {statusLabel(entry.status)}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Actions for ${entry.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold leading-none text-[#A89BD0] transition-colors hover:bg-[#F3F0FA] hover:text-[#3D2E6B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D8C7F0]"
          >
            ⋯
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {canOpen ? (
              <DropdownMenuItem
                onClick={() => onOpenPrescription!(entry.prescriptionId!)}
              >
                View details
              </DropdownMenuItem>
            ) : null}
            {entry.status === "current" ? (
              <DropdownMenuItem onClick={handleNotTaking}>
                Mark as no longer taking
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              onClick={handleRemove}
              className="text-[#A14343] focus:text-[#A14343]"
            >
              Remove incorrect entry
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
