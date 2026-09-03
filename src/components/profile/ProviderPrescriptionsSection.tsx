import { useEffect, useMemo, useState } from "react";
import { Archive, ArchiveRestore, Plus, Search, ShieldAlert } from "lucide-react";
import {
  archivePrescription,
  listArchivedPrescriptionIds,
  subscribePrescriptionArchive,
  unarchivePrescription,
} from "@/lib/prescription/archive";
import rxIcon from "@/assets/rx-icon.png.asset.json";
import PatientAvatar from "@/components/profile/PatientAvatar";
import IssuePrescriptionDialog from "@/components/profile/IssuePrescriptionDialog";
import {
  listPrescriptionDrafts,
  subscribePrescriptionDrafts,
  type PrescriptionDraft,
} from "@/lib/prescription/drafts";
import {
  listSignedPrescriptions,
  subscribePrescriptionDocuments,
  type SignedPrescriptionDocument,
} from "@/lib/prescription/documents";
import { ensureSamplePrescriptionRecord } from "@/lib/prescription/sampleRecord";
import { stashPrescriptionView } from "@/lib/prescription/viewHandoff";

/** Opens the document behind an opaque id — no patient, medication or
 *  prescription data ever appears in the URL. */
function prescriptionHref(doc: SignedPrescriptionDocument): string {
  const id = stashPrescriptionView({
    appointmentId: doc.appointmentId,
    country: doc.country,
    clientName: doc.patientName,
    providerName: doc.identity?.fullName,
    docId: doc.id,
    document: doc,
  });
  return `/e-prescription/${id}`;
}

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
  const [drafts, setDrafts] = useState<PrescriptionDraft[]>([]);
  const [query, setQuery] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [archivedIds, setArchivedIds] = useState<string[]>([]);
  const [view, setView] = useState<"active" | "archived">("active");

  useEffect(() => {
    ensureSamplePrescriptionRecord();
    const read = () => setDocs(listSignedPrescriptions());
    const readDrafts = () => setDrafts(listPrescriptionDrafts());
    const readArchive = () => setArchivedIds(listArchivedPrescriptionIds());
    read();
    readDrafts();
    readArchive();
    const unsubscribeDocs = subscribePrescriptionDocuments(read);
    const unsubscribeDrafts = subscribePrescriptionDrafts(readDrafts);
    const unsubscribeArchive = subscribePrescriptionArchive(readArchive);
    return () => {
      unsubscribeDocs();
      unsubscribeDrafts();
      unsubscribeArchive();
    };
  }, []);

  const archivedCount = useMemo(
    () => docs.filter((d) => archivedIds.includes(d.id)).length,
    [docs, archivedIds],
  );

  const groups = useMemo<PatientGroup[]>(() => {
    const q = query.trim().toLowerCase();
    const matched = docs.filter((d) => {
      const isArchived = archivedIds.includes(d.id);
      if (view === "archived" ? !isArchived : isArchived) return false;
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
  }, [docs, query, archivedIds, view]);

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
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="relative w-full sm:w-[280px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A89BD0]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search patient, Rx no. or medication"
              className="h-10 w-full rounded-xl border border-[#E3DBF5] bg-white pl-9 pr-3 text-[13px] text-[#3D2E6B] placeholder:text-[#A89BD0] focus:border-[#7E6BAF] focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setResetToken((token) => token + 1);
              setIssuing(true);
            }}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#3D2E6B] px-4 text-[12.5px] font-semibold text-white transition hover:bg-[#33265A]"
          >
            <Plus className="h-4 w-4" /> New prescription
          </button>
        </div>
      </div>

      <div className="mt-5 inline-flex rounded-xl border border-[#E3DBF5] bg-white p-1">
        {(["active", "archived"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setView(tab)}
            className={`rounded-lg px-3.5 py-1.5 text-[12px] font-semibold transition ${
              view === tab ? "bg-[#3D2E6B] text-white" : "text-[#6F6889] hover:text-[#3D2E6B]"
            }`}
          >
            {tab === "active" ? "Active" : `Archived${archivedCount ? ` (${archivedCount})` : ""}`}
          </button>
        ))}
      </div>

      <IssuePrescriptionDialog
        open={issuing}
        resetToken={resetToken}
        onClose={() => setIssuing(false)}
        onIssued={() => setDocs(listSignedPrescriptions())}
      />

      {drafts.length > 0 && (
        <div className="mt-6 rounded-2xl border border-[#E3DBF5]/70 bg-white p-5">
          <h4 className="text-[14px] font-bold text-[#3D2E6B]">Prescription drafts</h4>
          <p className="mt-1 text-[12px] text-[#6F6889]">Unfinished prescriptions saved when you cancelled.</p>
          <ul className="mt-3 space-y-2">
            {drafts.map((draft) => (
              <li key={draft.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#EDEBF3] bg-[#FBFAFE] px-4 py-3">
                <div>
                  <p className="text-[13px] font-semibold text-[#3D2E6B]">{draft.patientName}</p>
                  <p className="mt-0.5 text-[11.5px] text-[#8A7FB0]">Step {draft.step + 1} · Saved {formatDateTime(draft.savedAt)}</p>
                </div>
                <span className="rounded-full bg-[#F4F0FE] px-2.5 py-1 text-[11px] font-semibold text-[#6F5BA0]">Draft</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {docs.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[#DCD4F0] bg-white/70 px-5 py-8 text-center">
          <img src={rxIcon.url} alt="Rx" className="mx-auto h-8 w-8" />
          <p className="mt-2 text-[13.5px] font-semibold text-[#3D2E6B]">
            No prescriptions issued yet
          </p>
          <p className="mt-1 text-[12.5px] text-[#6F6889]">
            Prescriptions you sign after a session appear here with the patient,
            medications, and Rx number.
          </p>
          <button
            type="button"
            onClick={() => {
              setResetToken((token) => token + 1);
              setIssuing(true);
            }}
            className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#3D2E6B] px-4 text-[12.5px] font-semibold text-white transition hover:bg-[#33265A]"
          >
            <Plus className="h-4 w-4" /> Issue a prescription
          </button>
        </div>
      ) : groups.length === 0 ? (
        <p className="mt-6 text-[13px] text-[#6F6889]">
          {query
            ? `No prescriptions match “${query}”.`
            : view === "archived"
              ? "No archived prescriptions."
              : "No active prescriptions — check the Archived tab."}
        </p>
      ) : (
        <div className="mt-6 max-h-[620px] space-y-4 overflow-y-auto pr-1">
          {groups.map((group) => (
            <div
              key={group.patientName}
              className="rounded-2xl border border-[#E3DBF5]/70 bg-white p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <PatientAvatar
                    name={group.patientName}
                    photoUrl={group.docs[0]!.patientPhotoUrl}
                    size={36}
                  />
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
              </div>

              <ul className="mt-4 space-y-3">
                {group.docs.map((doc) => (
                  <li
                    key={doc.id}
                    className="rounded-xl border border-[#EDEBF3] bg-[#FBFAFE] px-4 py-3"
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
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
                      <div className="flex shrink-0 flex-col items-end gap-2 self-start">
                        <a
                          href={prescriptionHref(doc)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl bg-[#3D2E6B] px-4 text-[12.5px] font-semibold text-white transition hover:bg-[#33265A]"
                        >
                          View prescription
                        </a>
                        <button
                          type="button"
                          onClick={() =>
                            view === "archived"
                              ? unarchivePrescription(doc.id)
                              : archivePrescription(doc.id)
                          }
                          className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-[#E3DBF5] bg-white px-3 text-[11.5px] font-semibold text-[#6F5BA0] transition hover:border-[#7E6BAF]"
                        >
                          {view === "archived" ? (
                            <>
                              <ArchiveRestore className="h-3.5 w-3.5" /> Restore
                            </>
                          ) : (
                            <>
                              <Archive className="h-3.5 w-3.5" /> Archive
                            </>
                          )}
                        </button>
                      </div>
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
