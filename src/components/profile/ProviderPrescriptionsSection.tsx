import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Pill, Search, ShieldAlert, ExternalLink, User, FileText } from "lucide-react";
import {
  listSignedPrescriptions,
  subscribePrescriptionDocuments,
  type SignedPrescriptionDocument,
} from "@/lib/prescription/documents";

type PatientGroup = {
  patientName: string;
  docs: SignedPrescriptionDocument[];
  lastSignedAt: number;
};

/**
 * Prescription record for the prescriber: every prescription they signed,
 * grouped by patient so a past prescription is one click away. Read-only —
 * a signed prescription is immutable.
 */
export default function ProviderPrescriptionsSection() {
  const [docs, setDocs] = useState<SignedPrescriptionDocument[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const read = () => setDocs(listSignedPrescriptions());
    read();
    return subscribePrescriptionDocuments(read);
  }, []);

  const groups = useMemo<PatientGroup[]>(() => {
    const q = query.trim().toLowerCase();
    const matched = docs.filter((d) => {
      if (!q) return true;
      const meds = d.medications
        .map((m) => `${m.genericName ?? ""} ${m.name}`)
        .join(" ");
      return `${d.patientName} ${d.number} ${meds}`.toLowerCase().includes(q);
    });
    const byPatient = new Map<string, SignedPrescriptionDocument[]>();
    for (const d of matched) {
      const key = d.patientName || "Unnamed patient";
      byPatient.set(key, [...(byPatient.get(key) ?? []), d]);
    }
    return [...byPatient.entries()]
      .map(([patientName, list]) => {
        const sorted = [...list].sort((a, b) => b.signedAt - a.signedAt);
        return { patientName, docs: sorted, lastSignedAt: sorted[0]!.signedAt };
      })
      .sort((a, b) => b.lastSignedAt - a.lastSignedAt);
  }, [docs, query]);

  return (
    <section className="rounded-2xl border border-[#E3DBF5]/60 bg-[#FBF9FF]/90 p-6 shadow-md shadow-[#3D2E6B]/5 backdrop-blur-xl sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-[15px] font-bold text-[#3D2E6B]">Issued prescriptions</h3>
          <p className="mt-1 text-[13px] text-[#6F6889]">
            Every prescription you signed, grouped by patient. Signed prescriptions
            are part of the patient record and cannot be edited.
          </p>
        </div>
        <div className="relative w-full sm:w-[280px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A89BD0]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search patient, Rx no. or medication"
            className="h-10 w-full rounded-xl border border-[#E3DBF5] bg-white pl-9 pr-3 text-[13px] text-[#3D2E6B] placeholder:text-[#A89BD0] focus:border-[#7E6BAF] focus:outline-none"
          />
        </div>
      </div>

      {docs.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[#DCD4F0] bg-white/70 px-5 py-8 text-center">
          <Pill className="mx-auto h-6 w-6 text-[#A89BD0]" />
          <p className="mt-2 text-[13.5px] font-semibold text-[#3D2E6B]">
            No prescriptions issued yet
          </p>
          <p className="mt-1 text-[12.5px] text-[#6F6889]">
            Prescriptions you sign after a session appear here with the patient,
            medications, and Rx number.
          </p>
        </div>
      ) : groups.length === 0 ? (
        <p className="mt-6 text-[13px] text-[#6F6889]">
          No prescriptions match “{query}”.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {groups.map((group) => (
            <div
              key={group.patientName}
              className="rounded-2xl border border-[#E3DBF5]/70 bg-white p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#EFE8FB] text-[#3D2E6B]">
                    <User className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[14px] font-bold text-[#3D2E6B]">
                      {group.patientName}
                    </p>
                    <p className="text-[11.5px] text-[#8A7FB0]">
                      {group.docs.length} prescription
                      {group.docs.length > 1 ? "s" : ""} · last issued{" "}
                      {formatDate(group.lastSignedAt)}
                    </p>
                  </div>
                </div>
                <Link
                  to="/appointment/details"
                  search={{ id: group.docs[0]!.appointmentId }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#DCD4F0] px-3 text-[12.5px] font-semibold text-[#3D2E6B] transition hover:bg-[#F5F1FE]"
                >
                  Open session <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>

              <ul className="mt-4 space-y-3">
                {group.docs.map((doc) => (
                  <li
                    key={doc.id}
                    className="rounded-xl border border-[#EDEBF3] bg-[#FBFAFE] px-4 py-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-[12px] font-semibold text-[#3D2E6B]">
                          {doc.number}
                        </p>
                        <p className="mt-1 text-[13px] font-semibold text-[#2C2B4B]">
                          {doc.medications
                            .map(
                              (m) =>
                                `${m.genericName || m.name}${m.strength ? ` ${m.strength}` : ""}`,
                            )
                            .join(" · ") || "No medication recorded"}
                        </p>
                        <p className="mt-1 text-[11.5px] text-[#8A7FB0]">
                          Signed {formatDateTime(doc.signedAt)} · {doc.country} ·{" "}
                          {doc.authenticationMethod}
                        </p>
                        {doc.controlled && (
                          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#FDF6E7] px-2.5 py-1 text-[11px] font-semibold text-[#6B4E10]">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            {doc.country === "PH"
                              ? "Dangerous drug"
                              : "Controlled substance"}
                          </p>
                        )}
                      </div>
                      <a
                        href={ePrescriptionHref(doc)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-[#3D2E6B] px-3 text-[12.5px] font-semibold text-white transition hover:bg-[#33265A]"
                      >
                        <FileText className="h-3.5 w-3.5" /> View prescription
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ePrescriptionHref(doc: SignedPrescriptionDocument): string {
  const params = new URLSearchParams({
    appointment: doc.appointmentId,
    country: doc.country,
  });
  if (doc.patientName) params.set("client", doc.patientName);
  if (doc.identity?.fullName) params.set("provider", doc.identity.fullName);
  return `/e-prescription?${params.toString()}`;
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
