import { type ReactNode, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Archive,
  ArchiveRestore,
  Check,
  ChevronDown,
  Download,
  Eye,
  Mail,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import {
  CLAIM_STATE_LABEL,
  claimForDocument,
  claimUrl,
  ensureClaim,
  markClaimSent,
  subscribeClaims,
} from "@/lib/prescription/claim";
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
  archivePrescriptionDraft,
  ensureSampleArchivedDraft,
  listPrescriptionDrafts,
  subscribePrescriptionDrafts,
  unarchivePrescriptionDraft,
  type PrescriptionDraft,
} from "@/lib/prescription/drafts";
import {
  listSignedPrescriptions,
  subscribePrescriptionDocuments,
  voidSignedPrescription,
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
  const [view, setView] = useState<"active" | "drafts" | "archived">("active");
  /** Saved, unfinished prescription being continued in the prescribing flow. */
  const [resumingDraft, setResumingDraft] = useState<PrescriptionDraft | null>(null);
  const [resumeToken, setResumeToken] = useState(0);
  /** Per-patient accordion state. Multi-prescription patients start collapsed
   *  so a long record stays scannable; single-prescription patients stay open. */
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  /** Draft pending archive confirmation. */
  const [archiveConfirm, setArchiveConfirm] = useState<PrescriptionDraft | null>(null);
  /** Signed prescription the prescriber asked to correct — needs confirmation
   *  first, because a correction must be signed again. */
  const [editConfirm, setEditConfirm] = useState<SignedPrescriptionDocument | null>(null);
  /** The signed prescription currently being replaced by a correction. */
  const [replacing, setReplacing] = useState<SignedPrescriptionDocument | null>(null);

  /** Reopens a signed prescription in the prescribing flow as a correction.
   *  The original stays in the record; the corrected version must be signed. */
  function startCorrection(doc: SignedPrescriptionDocument) {
    setReplacing(doc);
    setResumingDraft({
      id: `rxedit_${doc.id}`,
      patientName: doc.patientName,
      step: 2,
      savedAt: Date.now(),
      snapshot: {
        patientName: doc.patientName,
        sex: doc.patientSex,
        purpose: "new",
        meds: doc.medications,
        soap: { assessment: doc.clinicalNotes ?? "" },
      },
    });
    setResumeToken((token) => token + 1);
    setIssuing(true);
  }

  useEffect(() => {
    ensureSamplePrescriptionRecord();
    ensureSampleArchivedDraft();
    const read = () => {
      const list = listSignedPrescriptions();
      // Every signed prescription carries a claim link from the moment it exists.
      list.forEach(ensureClaim);
      setDocs(list);
    };
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

  const activeDrafts = useMemo(
    () => drafts.filter((d) => !d.archivedAt),
    [drafts],
  );
  const archivedDrafts = useMemo(
    () => drafts.filter((d) => d.archivedAt),
    [drafts],
  );

  const archivedCount = useMemo(
    () =>
      docs.filter((d) => archivedIds.includes(d.id)).length +
      archivedDrafts.length,
    [docs, archivedIds, archivedDrafts],
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
            Every prescription you signed, grouped by patient. Correcting one keeps
            the original in the record and must be signed again.
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
        {(["active", "drafts", "archived"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setView(tab)}
            className={`rounded-lg px-3.5 py-1.5 text-[12px] font-semibold transition ${
              view === tab ? "bg-[#3D2E6B] text-white" : "text-[#6F6889] hover:text-[#3D2E6B]"
            }`}
          >
            {tab === "active"
              ? "Active"
              : tab === "drafts"
                ? `Drafts${activeDrafts.length ? ` (${activeDrafts.length})` : ""}`
                : `Archived${archivedCount ? ` (${archivedCount})` : ""}`}
          </button>
        ))}
      </div>

      <IssuePrescriptionDialog
        open={issuing}
        resetToken={resetToken}
        resumeDraft={resumingDraft}
        resumeToken={resumeToken}
        onClose={() => {
          setIssuing(false);
          setResumingDraft(null);
          setReplacing(null);
        }}
        onIssued={(doc) => {
          // A correction supersedes the original: the first prescription and its
          // signature stay in the record, marked as replaced.
          if (replacing && replacing.id !== doc.id) {
            voidSignedPrescription(replacing.id, {
              reason: `Replaced by corrected prescription ${doc.number}`,
              by: doc.signedBy,
            });
            toast.success("Corrected prescription signed", {
              description: `${doc.number} replaces ${replacing.number}.`,
            });
            setReplacing(null);
          }
          setDocs(listSignedPrescriptions());
        }}
      />


      {view === "drafts" ? (
        activeDrafts.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[#DCD4F0] bg-white/70 px-5 py-10 text-center">
            <p className="text-[13.5px] font-semibold text-[#3D2E6B]">No drafts saved</p>
            <p className="mt-1 text-[12.5px] text-[#6F6889]">
              A prescription you start and leave before signing is saved here so you can pick it up later.
            </p>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-[#E3DBF5]/70 bg-white p-5">
            <p className="text-[12px] text-[#6F6889]">
              Started but not signed yet. Open one to continue where you left off.
            </p>
            <ul className="mt-3 space-y-2">
              {activeDrafts.map((draft) => (
                <li key={draft.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setResumingDraft(draft);
                      setResumeToken((token) => token + 1);
                      setIssuing(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setResumingDraft(draft);
                        setResumeToken((token) => token + 1);
                        setIssuing(true);
                      }
                    }}
                    className="group flex w-full cursor-pointer flex-wrap items-center justify-between gap-3 rounded-xl border border-[#EDEBF3] bg-[#FBFAFE] px-4 py-3 text-left transition hover:border-[#C9BCF2] hover:bg-[#F4F0FE] hover:shadow-sm hover:shadow-[#7E6BAF]/10"
                  >
                    <div>
                      <p className="text-[13px] font-semibold text-[#3D2E6B]">{draft.patientName}</p>
                      <p className="mt-0.5 text-[11.5px] text-[#8A7FB0]">Step {draft.step + 1} · Saved {formatDateTime(draft.savedAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[#F4F0FE] px-2.5 py-1 text-[11px] font-semibold text-[#6F5BA0] transition group-hover:bg-[#EAE2FB]">In progress</span>
                      <button
                        type="button"
                        aria-label="Archive draft"
                        onClick={(e) => {
                          e.stopPropagation();
                          setArchiveConfirm(draft);
                        }}
                        className="group/icon relative inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#8A7FB0] opacity-0 transition hover:text-[#6F5BA0] hover:bg-[#EAE2FB] focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <Archive className="h-3.5 w-3.5" />
                        <TooltipLabel>Archive</TooltipLabel>
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )
      ) : docs.length === 0 ? (
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
      ) : groups.length === 0 && !(view === "archived" && archivedDrafts.length > 0) ? (
        <p className="mt-6 text-[13px] text-[#6F6889]">
          {query
            ? `No prescriptions match “${query}”.`
            : view === "archived"
              ? "No archived prescriptions."
              : "No active prescriptions — check the Archived tab."}
        </p>
      ) : (
        <div className="mt-6 max-h-[620px] space-y-3 overflow-y-auto pr-1">
          {view === "archived" && archivedDrafts.length > 0 && (
            <div className="rounded-2xl border border-[#E3DBF5]/70 bg-white p-5">
              <p className="text-[12px] text-[#6F6889]">
                Archived drafts — started but never signed. Restore one to keep working on it.
              </p>
              <ul className="mt-3 space-y-2">
                {archivedDrafts.map((draft) => (
                  <li
                    key={draft.id}
                    className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-[#EDEBF3] bg-[#FBFAFE] px-4 py-3"
                  >
                    <div>
                      <p className="text-[13px] font-semibold text-[#3D2E6B]">{draft.patientName}</p>
                      <p className="mt-0.5 text-[11.5px] text-[#8A7FB0]">
                        Draft · Step {draft.step + 1} · Saved {formatDateTime(draft.savedAt)}
                        {draft.archivedAt ? ` · Archived ${formatDate(draft.archivedAt)}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Restore draft"
                      onClick={() => {
                        unarchivePrescriptionDraft(draft.id);
                        toast.success("Draft restored", {
                          description: `${draft.patientName}'s draft is back in Drafts.`,
                        });
                      }}
                      className="group/icon relative inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#E3DBF5] text-[#6F6889] transition hover:border-[#DCD4F0] hover:bg-[#F4F0FE] hover:text-[#6F5BA0]"
                    >
                      <ArchiveRestore className="h-3.5 w-3.5" />
                      <TooltipLabel>Restore</TooltipLabel>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {groups.map((group) => {
            const isOpen =
              expanded[group.patientName] ?? group.docs.length === 1;
            const toggle = () =>
              setExpanded((current) => ({
                ...current,
                [group.patientName]: !isOpen,
              }));
            return (
              <div
                key={group.patientName}
                className="rounded-2xl border border-[#E3DBF5]/70 bg-white"
              >
                <button
                  type="button"
                  onClick={toggle}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                >
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
                  {group.docs.length > 1 && (
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-[#A89BD0] transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </button>

                {isOpen && (
                  <ul className="space-y-3 px-5 pb-5">
                    {group.docs.map((doc) => (
                      <DocRow
                        key={doc.id}
                        doc={doc}
                        view={view}
                        onEdit={() => setEditConfirm(doc)}
                      />
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {archiveConfirm &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
            onClick={() => setArchiveConfirm(null)}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-[#E3DBF5] bg-white p-7 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="text-[14px] font-bold text-[#3D2E6B]">Archive this draft?</h4>
              <p className="mt-0.5 text-[12px] text-[#6F6889]">
                {archiveConfirm.patientName}
              </p>
              <p className="mt-3 text-[12.5px] leading-relaxed text-[#6F6889]">
                You can restore it later from the Archived tab, but it won't appear in Drafts until then.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setArchiveConfirm(null)}
                  className="inline-flex h-9 items-center rounded-xl border border-[#E3DBF5] px-4 text-[12.5px] font-semibold text-[#6F6889] transition hover:bg-[#F8F6FE]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    archivePrescriptionDraft(archiveConfirm.id);
                    toast.success("Draft archived", {
                      description: `${archiveConfirm.patientName}'s draft moved to Archived.`,
                    });
                    setArchiveConfirm(null);
                  }}
                  className="inline-flex h-9 items-center rounded-xl bg-[#3D2E6B] px-4 text-[12.5px] font-semibold text-white transition hover:bg-[#33265A]"
                >
                  Yes, archive
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {editConfirm &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
            onClick={() => setEditConfirm(null)}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-[#E3DBF5] bg-white p-7 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="text-[14px] font-bold text-[#3D2E6B]">
                Correct this prescription?
              </h4>
              <p className="mt-0.5 text-[12px] text-[#6F6889]">
                {editConfirm.patientName} · {editConfirm.number}
              </p>
              <p className="mt-3 text-[12.5px] leading-relaxed text-[#6F6889]">
                You'll open a copy with the same patient, clinical basis and
                medications so you can change what's needed. The original stays in
                the patient's record, marked as replaced, and the corrected
                prescription must be signed again before it can be shared.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditConfirm(null)}
                  className="inline-flex h-9 items-center rounded-xl border border-[#E3DBF5] px-4 text-[12.5px] font-semibold text-[#6F6889] transition hover:bg-[#F8F6FE]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    startCorrection(editConfirm);
                    setEditConfirm(null);
                  }}
                  className="inline-flex h-9 items-center rounded-xl bg-[#3D2E6B] px-4 text-[12.5px] font-semibold text-white transition hover:bg-[#33265A]"
                >
                  Edit and re-sign
                </button>
              </div>
            </div>
          </div>,
          document.body,
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

/** Lightweight hover label for icon-only action buttons. */
function TooltipLabel({ children }: { children: ReactNode }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-md bg-[#2C2B4B] px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-md transition-all duration-150 group-hover/icon:translate-y-0 group-hover/icon:opacity-100 group-focus-visible/icon:translate-y-0 group-focus-visible/icon:opacity-100"
    >
      {children}
    </span>
  );
}

/** Small badge showing delivery state of the secure claim link. */
function ClaimBadge({ docId }: { docId: string }) {
  const [tick, setTick] = useState(0);
  useEffect(() => subscribeClaims(() => setTick((t) => t + 1)), []);
  const claim = useMemo(() => {
    void tick;
    return claimForDocument(docId);
  }, [docId, tick]);

  if (!claim?.state || claim.state === "unclaimed") return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
        claim.state === "claimed"
          ? "bg-[#F3FAF6] text-[#2F6B4A]"
          : "bg-[#F4F0FE] text-[#6F5BA0]"
      }`}
    >
      {claim.state === "claimed" && <Check className="h-3 w-3" />}
      {CLAIM_STATE_LABEL[claim.state]}
    </span>
  );
}

/**
 * One signed prescription row: info on the left, all actions in a single
 * compact row on the right so the card stays short. The email-share panel
 * expands below only while it is open.
 */
function DocRow({
  doc,
  view,
  onEdit,
}: {
  doc: SignedPrescriptionDocument;
  view: "active" | "archived";
  /** Opens a correction of this prescription, which must be signed again. */
  onEdit?: () => void;
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => subscribeClaims(() => setTick((t) => t + 1)), []);
  const sentTo = useMemo(() => {
    void tick;
    return claimForDocument(doc.id)?.sentTo;
  }, [doc.id, tick]);

  const iconBtn =
    "group/icon relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#DCD4F0] bg-white text-[#3D2E6B] transition hover:bg-[#F6F4FC]";

  return (
    <li className="rounded-xl border border-[#EDEBF3] bg-[#FBFAFE] px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[12px] font-semibold text-[#3D2E6B]">
            {doc.number}
          </p>
          <p className="mt-0.5 truncate text-[13px] font-semibold text-[#2C2B4B]">
            {doc.medications
              .map(
                (m) =>
                  `${m.genericName || m.name}${m.strength ? ` ${m.strength}` : ""}`,
              )
              .join(" · ") || "No medication recorded"}
          </p>
          <p className="mt-0.5 text-[11.5px] text-[#8A7FB0]">
            Signed {formatDateTime(doc.signedAt)} · {doc.country} ·{" "}
            {doc.authenticationMethod}
          </p>
          {doc.voided && (
            <p className="mt-1 inline-flex rounded-full bg-[#FBF1F1] px-2 py-0.5 text-[11px] font-semibold text-[#8A3A3A]">
              {doc.voided.reason}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {doc.controlled && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FDF6E7] px-2 py-0.5 text-[10.5px] font-semibold text-[#6B4E10]">
              <ShieldAlert className="h-3 w-3" />
              {doc.country === "PH" ? "Dangerous drug" : "Controlled substance"}
            </span>
          )}
          <ClaimBadge docId={doc.id} />
          <a
            href={prescriptionHref(doc)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View prescription"
            className="group/icon relative inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#3D2E6B] text-white transition hover:bg-[#33265A]"
          >
            <Eye className="h-4 w-4" />
            <TooltipLabel>View</TooltipLabel>
          </a>
          <a
            href={`${prescriptionHref(doc)}?download=1`}
            onClick={() =>
              toast.success("Prescription downloaded", {
                description: `${doc.number} for ${doc.patientName || "the patient"}`,
              })
            }
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Download prescription"
            className={iconBtn}
          >
            <Download className="h-4 w-4" />
            <TooltipLabel>Download</TooltipLabel>
          </a>
          {onEdit && !doc.voided && (
            <button
              type="button"
              aria-label="Edit and re-sign prescription"
              onClick={onEdit}
              className={iconBtn}
            >
              <Pencil className="h-4 w-4" />
              <TooltipLabel>Edit &amp; re-sign</TooltipLabel>
            </button>
          )}
          <button
            type="button"
            aria-label={view === "archived" ? "Restore prescription" : "Archive prescription"}
            onClick={() => {
              if (view === "archived") {
                unarchivePrescription(doc.id);
                toast.success("Prescription restored", {
                  description: `${doc.number} is back in Active.`,
                });
              } else {
                archivePrescription(doc.id);
                toast.success("Prescription archived", {
                  description: `${doc.number} for ${doc.patientName || "the patient"} moved to Archived.`,
                });
              }
            }}
            className={iconBtn}
          >
            {view === "archived" ? (
              <ArchiveRestore className="h-4 w-4" />
            ) : (
              <Archive className="h-4 w-4" />
            )}
            <TooltipLabel>{view === "archived" ? "Restore" : "Archive"}</TooltipLabel>
          </button>
          <button
            type="button"
            aria-label={sentTo ? "Resend prescription link" : "Share prescription via email"}
            onClick={() => {
              ensureClaim(doc);
              setShareOpen((o) => !o);
            }}
            className={iconBtn}
          >
            <Mail className="h-4 w-4" />
            <TooltipLabel>{sentTo ? "Resend link" : "Share via email"}</TooltipLabel>
          </button>
        </div>
      </div>

      {sentTo && !shareOpen && (
        <p className="mt-1.5 text-[11.5px] text-[#8A7FB0]">
          Link sent to {sentTo}
        </p>
      )}

      <ShareByEmail doc={doc} open={shareOpen} onSent={() => setShareOpen(false)} />
    </li>
  );
}

/**
 * Delivery of a signed prescription to the patient: a secure claim link the
 * provider shares by email. Prototype only — nothing is actually sent.
 * Controlled panel — the toggle button lives in DocRow's action row.
 */
function ShareByEmail({
  doc,
  open,
  onSent,
}: {
  doc: SignedPrescriptionDocument;
  open: boolean;
  onSent?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => subscribeClaims(() => setTick((t) => t + 1)), []);

  const claim = useMemo(() => {
    void tick;
    return claimForDocument(doc.id);
  }, [doc.id, tick]);

  const link = claim ? claimUrl(claim.claimId) : "";
  const valid = /.+@.+\..+/.test(email.trim());

  if (!open) return null;

  return (
    <div className="mt-3 border-t border-[#EDEBF3] pt-3">
      {open && (
        <div className="mt-2.5 rounded-xl border border-[#E3DBF5] bg-white p-3.5">
          <p className="text-[12px] leading-snug text-[#6F6889]">
            The patient receives the medication details and a secure link. If they already have a
            Lubin account it opens straight from their prescriptions; if not, they can open it and
            create an account to keep it.
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="patient@email.com"
              className="h-9 min-w-[220px] flex-1 rounded-xl border border-[#E3DBF5] bg-white px-3 text-[13px] text-[#3D2E6B] placeholder:text-[#A89BD0] focus:border-[#7E6BAF] focus:outline-none"
            />
            <button
              type="button"
              disabled={!valid || !claim}
              onClick={() => {
                if (!claim) return;
                const to = email.trim();
                markClaimSent(claim.claimId, to);
                toast.success("Prescription sent", {
                  description: `Secure link emailed to ${to}.`,
                });
                onSent?.();
                setEmail("");
              }}
              className="inline-flex h-9 items-center rounded-xl bg-[#3D2E6B] px-4 text-[12.5px] font-semibold text-white transition hover:bg-[#33265A] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Send prescription
            </button>
          </div>
          {link && (
            <p className="mt-2.5 break-all text-[11.5px] text-[#8A7FB0]">
              Secure link (also printed as a QR code on the document):{" "}
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#6E4FD3] underline"
              >
                {link}
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
