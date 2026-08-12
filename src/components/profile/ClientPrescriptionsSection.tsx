import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldAlert, ExternalLink, Ban, FileText } from "lucide-react";
import rxIcon from "@/assets/rx-icon.png.asset.json";
import PrescriptionDocumentDialog from "@/components/profile/PrescriptionDocumentDialog";
import {
  listSignedPrescriptions,
  subscribePrescriptionDocuments,
  type SignedPrescriptionDocument,
} from "@/lib/prescription/documents";

/**
 * Client-facing prescription record: every prescription issued to them,
 * newest first, so they never need to open an appointment to view or
 * download a prescription.
 */
export default function ClientPrescriptionsSection() {
  const [docs, setDocs] = useState<SignedPrescriptionDocument[]>([]);
  const [openDoc, setOpenDoc] = useState<SignedPrescriptionDocument | null>(null);

  useEffect(() => {
    const read = () => setDocs(listSignedPrescriptions());
    read();
    return subscribePrescriptionDocuments(read);
  }, []);

  const sorted = useMemo(
    () => [...docs].sort((a, b) => b.signedAt - a.signedAt),
    [docs],
  );

  return (
    <section className="rounded-2xl border border-[#E3DBF5]/60 bg-[#FBF9FF]/90 p-6 shadow-md shadow-[#3D2E6B]/5 backdrop-blur-xl sm:p-8">
      <div>
        <h3 className="text-[15px] font-bold text-[#3D2E6B]">My prescriptions</h3>
        <p className="mt-1 text-[13px] text-[#6F6889]">
          Prescriptions your prescriber issued to you. Open or download a copy
          any time — you don’t need to find the appointment first.
        </p>
      </div>

      {sorted.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[#DCD4F0] bg-white/70 px-5 py-8 text-center">
          <img src={rxIcon.url} alt="Rx" className="mx-auto h-8 w-8" />
          <p className="mt-2 text-[13.5px] font-semibold text-[#3D2E6B]">
            No prescriptions yet
          </p>
          <p className="mt-1 text-[12.5px] text-[#6F6889]">
            If a prescriber issues a prescription after a session, it appears
            here with the medication details and a copy you can download.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {sorted.map((doc) => (
            <li
              key={doc.id}
              className="rounded-2xl border border-[#E3DBF5]/70 bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[12px] font-semibold text-[#3D2E6B]">
                    {doc.number}
                  </p>
                  <p className="mt-1 text-[14px] font-bold text-[#2C2B4B]">
                    {doc.medications
                      .map(
                        (m) =>
                          `${m.genericName || m.name}${m.strength ? ` ${m.strength}` : ""}`,
                      )
                      .join(" · ") || "No medication recorded"}
                  </p>
                  <p className="mt-1 text-[11.5px] text-[#8A7FB0]">
                    Issued {formatDateTime(doc.signedAt)}
                    {doc.identity?.fullName ? ` · ${doc.identity.fullName}` : ""}
                    {doc.validUntil
                      ? ` · ${doc.validityLabel || "Valid until"} ${formatDate(doc.validUntil)}`
                      : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {doc.voided && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F3F0FA] px-2.5 py-1 text-[11px] font-semibold text-[#5B4B8A]">
                        <Ban className="h-3.5 w-3.5" /> Voided — not dispensable
                      </span>
                    )}
                    {doc.controlled && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FDF6E7] px-2.5 py-1 text-[11px] font-semibold text-[#6B4E10]">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        {doc.country === "PH"
                          ? "Dangerous drug"
                          : "Controlled substance"}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                  <Link
                    to="/appointment/details"
                    search={{ id: doc.appointmentId }}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#DCD4F0] px-3 text-[12.5px] font-semibold text-[#3D2E6B] transition hover:bg-[#F5F1FE]"
                  >
                    Session <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setOpenDoc(doc)}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#3D2E6B] px-3 text-[12.5px] font-semibold text-white transition hover:bg-[#33265A]"
                  >
                    <FileText className="h-3.5 w-3.5" /> View / download
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {openDoc && (
        <PrescriptionDocumentDialog doc={openDoc} onClose={() => setOpenDoc(null)} />
      )}
    </section>
  );
}

function formatDate(at: number): string {
  return new Date(at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(at: number): string {
  return new Date(at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
