import { useEffect, useMemo, useState } from "react";
import { ShieldAlert, Ban } from "lucide-react";
import rxIcon from "@/assets/rx-icon.png.asset.json";
import PassportEmptyState from "@/components/passport/PassportEmptyState";
import {
  listSignedPrescriptions,
  subscribePrescriptionDocuments,
  type SignedPrescriptionDocument,
} from "@/lib/prescription/documents";
import { ensureSamplePrescriptionRecord } from "@/lib/prescription/sampleRecord";
import { prescriptionViewHref } from "@/lib/prescription/viewHandoff";
import MedicationList from "@/components/passport/MedicationList";

const PAGE_SIZE = 4;

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "valid", label: "Still valid" },
  { key: "expired", label: "Expired" },
  { key: "voided", label: "Voided" },
] as const;

/** Opens the document behind an opaque id — no patient, medication or
 *  prescription data ever appears in the URL. */
function prescriptionHref(
  doc: SignedPrescriptionDocument,
  opts?: { download?: boolean },
): string {
  return prescriptionViewHref({
    appointmentId: doc.appointmentId,
    country: doc.country,
    clientName: doc.patientName,
    providerName: doc.identity?.fullName,
    docId: doc.id,
    document: doc,
  }, opts);
}

/**
 * Client-facing prescription record: every prescription issued to them,
 * newest first, so they never need to open an appointment to view or
 * download a prescription.
 */
export default function ClientPrescriptionsSection({
  forceEmpty = false,
}: {
  forceEmpty?: boolean;
}) {
  const [docs, setDocs] = useState<SignedPrescriptionDocument[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "valid" | "expired" | "voided">("all");
  const [order, setOrder] = useState<"newest" | "oldest">("newest");
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    ensureSamplePrescriptionRecord();
    const read = () => setDocs(listSignedPrescriptions());
    read();
    return subscribePrescriptionDocuments(read);
  }, []);

  const sorted = useMemo(
    () => [...docs].sort((a, b) => b.signedAt - a.signedAt),
    [docs],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = Date.now();
    const list = sorted.filter((doc) => {
      const expired = !!doc.validUntil && doc.validUntil < now;
      if (status === "voided" && !doc.voided) return false;
      if (status === "expired" && (doc.voided || !expired)) return false;
      if (status === "valid" && (doc.voided || expired)) return false;
      if (!q) return true;
      const haystack = [
        doc.number,
        doc.identity?.fullName,
        ...doc.medications.map((m) => `${m.name ?? ""} ${m.genericName ?? ""}`),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
    return order === "newest" ? list : [...list].reverse();
  }, [sorted, query, status, order]);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [query, status, order]);

  if (forceEmpty) {
    return (
      <section className="rounded-2xl border border-[#E3DBF5]/60 bg-[#FBF9FF]/90 p-6 shadow-md shadow-[#3D2E6B]/5 backdrop-blur-xl sm:p-8">
        <PassportEmptyState
          eyebrow="My prescriptions"
          title="No prescriptions yet"
          description="When a prescriber issues a prescription after a session, it appears here with the medication details and a copy you can download. You can also add medications you're currently taking to keep your daily list in one place."
        />
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[#E3DBF5]/60 bg-[#FBF9FF]/90 p-6 shadow-md shadow-[#3D2E6B]/5 backdrop-blur-xl sm:p-8">
      <div className="mb-8">
        <h3 className="font-display text-2xl font-semibold text-[#3D2E6B]">My prescriptions</h3>
        <p className="mt-1 text-[15px] text-[#7E6BAF]">
          Manage your daily medications and access official issued records.
        </p>
      </div>

      <MedicationList
        onOpenPrescription={(id) => {
          const doc = sorted.find((d) => d.id === id);
          if (doc) window.open(prescriptionHref(doc), "_blank", "noopener,noreferrer");
        }}
      />

      <div className="mt-12 mb-6">
        <h4 className="text-xl font-bold text-[#3D2E6B]">
          Official prescription copies
        </h4>
        <p className="mt-1 text-sm text-[#6F6889]">
          Formal records issued by your prescribers — view or download one any
          time, without finding the appointment first.
        </p>
      </div>

      {sorted.length > 0 && (
        <div className="mb-6 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by medication, prescriber or record number"
              className="w-full rounded-xl border border-[#DCD4F0] bg-white px-4 py-2.5 text-sm text-[#3D2E6B] placeholder:text-[#9C93B8] focus:border-[#7E6BAF] focus:outline-none"
            />
            <select
              value={order}
              onChange={(e) => setOrder(e.target.value as typeof order)}
              className="rounded-xl border border-[#DCD4F0] bg-white px-4 py-2.5 text-sm font-medium text-[#3D2E6B] focus:border-[#7E6BAF] focus:outline-none sm:w-48"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setStatus(f.key)}
                className={`rounded-[12px] px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                  status === f.key
                    ? "bg-[#7E6BAF] text-white"
                    : "border border-[#DCD4F0] bg-white text-[#5B4B8A] hover:bg-[#EAE7F5]"
                }`}
              >
                {f.label}
              </button>
            ))}
            <span className="ml-auto text-[12.5px] text-[#6F6889]">
              {filtered.length} of {sorted.length} records
            </span>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#DCD4F0] bg-white/70 px-5 py-8 text-center">
          <img src={rxIcon.url} alt="Rx" className="mx-auto h-8 w-8" />
          <p className="mt-2 text-[13.5px] font-semibold text-[#3D2E6B]">
            No prescriptions yet
          </p>
          <p className="mt-1 text-[12.5px] text-[#6F6889]">
            If a prescriber issues a prescription after a session, it appears
            here with the medication details and a copy you can download.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#DCD4F0] bg-white/70 px-5 py-8 text-center">
          <p className="text-[13.5px] font-semibold text-[#3D2E6B]">
            No prescriptions match your search
          </p>
          <p className="mt-1 text-[12.5px] text-[#6F6889]">
            Try a different medication, prescriber or record number, or clear
            the filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setStatus("all");
            }}
            className="mt-3 rounded-[12px] border border-[#A89BD0] bg-white px-4 py-2 text-[13px] font-semibold text-[#3D2E6B] hover:bg-[#EAE7F5]"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {filtered.slice(0, visible).map((doc) => {
            const medNames = doc.medications
              .map((m) => m.genericName || m.name)
              .filter(Boolean);
            const includes =
              medNames.length === 0
                ? "No medication recorded"
                : medNames.length === 1
                  ? medNames[0]
                  : `${medNames[0]}, ${medNames.length - 1} other${medNames.length - 1 === 1 ? "" : "s"}`;
            return (
              <li
                key={doc.id}
                className="relative rounded-2xl border-2 border-dashed border-[#A89BD0]/40 bg-[#EAE7F5]/30 p-6"
              >
                <span className="absolute right-6 top-6 rounded border border-[#A89BD0]/20 bg-white px-2 py-1 font-mono text-[10px] font-bold text-[#3D2E6B]">
                  {doc.number}
                </span>
                <h5 className="mb-1 pr-24 text-lg font-bold text-[#3D2E6B]">
                  Prescription document
                </h5>
                <p className="mb-6 text-xs font-semibold uppercase tracking-wider text-[#7E6BAF]">
                  Issued {formatDate(doc.signedAt)}
                </p>

                <div className="mb-6 space-y-3">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-[#6F6889]">Prescriber</span>
                    <span className="text-right font-medium text-[#3D2E6B]">
                      {doc.identity?.fullName || "Not recorded"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-[#6F6889]">
                      {doc.validityLabel || "Valid until"}
                    </span>
                    <span className="text-right font-medium text-[#3D2E6B]">
                      {doc.validUntil ? formatDate(doc.validUntil) : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-[#6F6889]">Includes</span>
                    <span className="text-right font-medium text-[#3D2E6B]">
                      {includes}
                    </span>
                  </div>
                </div>

                {(doc.voided || doc.controlled) && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {doc.voided && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-[#5B4B8A]">
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
                )}

                <div className="grid grid-cols-2 gap-3">
                  <a
                    href={prescriptionHref(doc)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-xl border border-[#A89BD0] bg-white px-4 py-2.5 text-sm font-bold text-[#3D2E6B] transition-colors hover:bg-[#EAE7F5]"
                  >
                    View record
                  </a>
                  <a
                    href={prescriptionHref(doc, { download: true })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-xl bg-[#7E6BAF] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#3D2E6B]"
                  >
                    Download PDF
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {filtered.length > visible && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="rounded-[12px] border border-[#A89BD0] bg-white px-5 py-2.5 text-sm font-bold text-[#3D2E6B] transition-colors hover:bg-[#EAE7F5]"
          >
            Show {Math.min(PAGE_SIZE, filtered.length - visible)} more
          </button>
          <p className="text-[12px] text-[#6F6889]">
            Showing {visible} of {filtered.length} records
          </p>
        </div>
      )}

      {visible > PAGE_SIZE && filtered.length <= visible && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setVisible(PAGE_SIZE)}
            className="rounded-[12px] border border-[#DCD4F0] bg-white px-5 py-2.5 text-sm font-semibold text-[#5B4B8A] transition-colors hover:bg-[#EAE7F5]"
          >
            Show fewer
          </button>
        </div>
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
