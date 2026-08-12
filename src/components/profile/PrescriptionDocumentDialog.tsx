import { useEffect, useState } from "react";
import { Printer, ExternalLink, X } from "lucide-react";

import { EPrescriptionDocument } from "@/components/appointment/EPrescriptionDocument";
import { loadPrescription, type Prescription } from "@/lib/prescription/store";
import { loadIdentity, type PrescriberIdentity } from "@/lib/prescription/credentials";
import type { SignedPrescriptionDocument } from "@/lib/prescription/documents";

/**
 * In-app viewer for a signed prescription file. Both the prescriber and the
 * patient open the same immutable document here — no need to leave the
 * Prescriptions tab. Printing and opening a standalone tab stay available.
 */
export default function PrescriptionDocumentDialog({
  doc,
  onClose,
}: {
  doc: SignedPrescriptionDocument;
  onClose: () => void;
}) {
  const [rx, setRx] = useState<Prescription | null>(null);
  const [identity, setIdentity] = useState<PrescriberIdentity | null>(null);

  useEffect(() => {
    setRx(loadPrescription(doc.appointmentId));
    setIdentity(loadIdentity(doc.identity?.fullName));
  }, [doc.appointmentId, doc.identity?.fullName]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const standaloneHref = (() => {
    const params = new URLSearchParams({
      appointment: doc.appointmentId,
      country: doc.country,
    });
    if (doc.patientName) params.set("client", doc.patientName);
    if (doc.identity?.fullName) params.set("provider", doc.identity.fullName);
    return `/e-prescription?${params.toString()}`;
  })();

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#2C2B4B]/60 p-0 backdrop-blur-sm sm:p-6">
      <div className="mx-auto flex h-full w-full max-w-[900px] flex-col overflow-hidden rounded-none bg-[#F3F0FA] shadow-2xl sm:rounded-2xl">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#E3DBF5] bg-white px-5 py-3 print:hidden">
          <div className="min-w-0">
            <p className="font-mono text-[12px] font-semibold text-[#3D2E6B]">
              {doc.number}
            </p>
            <p className="text-[12px] text-[#6F6889]">
              {doc.patientName || "Patient"} ·{" "}
              {doc.country === "PH" ? "Philippines" : "United States"}
              {doc.voided ? " · Voided" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#DCD4F0] px-3 text-[12.5px] font-semibold text-[#3D2E6B] transition hover:bg-[#F5F1FE]"
            >
              <Printer className="h-3.5 w-3.5" /> Print / save PDF
            </button>
            <a
              href={standaloneHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#DCD4F0] px-3 text-[12.5px] font-semibold text-[#3D2E6B] transition hover:bg-[#F5F1FE]"
            >
              Open in new tab <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close prescription"
              className="grid h-9 w-9 place-items-center rounded-xl bg-[#3D2E6B] text-white transition hover:bg-[#33265A]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {rx && identity ? (
            <EPrescriptionDocument
              rx={rx}
              country={doc.country}
              clientName={doc.patientName}
              providerName={doc.identity?.fullName}
              identity={identity}
            />
          ) : (
            <p className="p-8 text-center text-[13.5px] text-[#6F6889]">
              Loading the prescription…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}