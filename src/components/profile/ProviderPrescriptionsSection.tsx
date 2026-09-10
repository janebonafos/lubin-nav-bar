import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Check,
  ChevronDown,
  Download,
  Mail,
  Plus,
  Search,
  ShieldAlert,
} from "lucide-react";
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
        }}
        onIssued={() => setDocs(listSignedPrescriptions())}
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
                    className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-3 rounded-xl border border-[#EDEBF3] bg-[#FBFAFE] px-4 py-3 text-left transition hover:border-[#DCD4F0] hover:bg-[#F6F3FE]"
                  >
                    <div>
                      <p className="text-[13px] font-semibold text-[#3D2E6B]">{draft.patientName}</p>
                      <p className="mt-0.5 text-[11.5px] text-[#8A7FB0]">Step {draft.step + 1} · Saved {formatDateTime(draft.savedAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[#F4F0FE] px-2.5 py-1 text-[11px] font-semibold text-[#6F5BA0]">In progress</span>
                      <button
                        type="button"
                        title="Archive draft"
                        aria-label="Archive draft"
                        onClick={(e) => {
                          e.stopPropagation();
                          archivePrescriptionDraft(draft.id);
                        }}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#B7ACDB] opacity-60 transition hover:bg-[#F4F0FE] hover:text-[#6F5BA0] hover:opacity-100 focus:opacity-100"
                      >
                        <Archive className="h-3.5 w-3.5" />
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
                      title="Restore draft"
                      aria-label="Restore draft"
                      onClick={() => unarchivePrescriptionDraft(draft.id)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#B7ACDB] opacity-60 transition hover:bg-[#F4F0FE] hover:text-[#6F5BA0] hover:opacity-100 focus:opacity-100"
                    >
                      <ArchiveRestore className="h-3.5 w-3.5" />
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
                      <li
                        key={doc.id}
                        className="group rounded-xl border border-[#EDEBF3] bg-[#FBFAFE] px-4 py-3"
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
                                    `${m.genericName || m.name}${
                                      m.strength ? ` ${m.strength}` : ""
                                    }`,
                                )
                                .join(" · ") || "No medication recorded"}
                            </p>
                            <p className="mt-1 text-[11.5px] text-[#8A7FB0]">
                              Signed {formatDateTime(doc.signedAt)} ·{" "}
                              {doc.country} · {doc.authenticationMethod}
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
                            <a
                              href={`${prescriptionHref(doc)}?download=1`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#DCD4F0] bg-white px-3.5 text-[12.5px] font-semibold text-[#3D2E6B] transition hover:bg-[#F6F4FC]"
                            >
                              <Download className="h-3.5 w-3.5" /> Download
                            </a>
                            <button
                              type="button"
                              title={
                                view === "archived"
                                  ? "Restore prescription"
                                  : "Archive prescription"
                              }
                              aria-label={
                                view === "archived"
                                  ? "Restore prescription"
                                  : "Archive prescription"
                              }
                              onClick={() =>
                                view === "archived"
                                  ? unarchivePrescription(doc.id)
                                  : archivePrescription(doc.id)
                              }
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#B7ACDB] opacity-60 transition hover:bg-[#F4F0FE] hover:text-[#6F5BA0] hover:opacity-100 focus:opacity-100"
                            >
                              {view === "archived" ? (
                                <ArchiveRestore className="h-3.5 w-3.5" />
                              ) : (
                                <Archive className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                        <ShareByEmail doc={doc} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
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

/**
 * Delivery of a signed prescription to the patient: a secure claim link the
 * provider shares by email. Prototype only — nothing is actually sent.
 */
function ShareByEmail({ doc }: { doc: SignedPrescriptionDocument }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => subscribeClaims(() => setTick((t) => t + 1)), []);

  const claim = useMemo(() => {
    void tick;
    return claimForDocument(doc.id);
  }, [doc.id, tick]);

  const link = claim ? claimUrl(claim.claimId) : "";
  const valid = /.+@.+\..+/.test(email.trim());

  return (
    <div className="mt-3 border-t border-[#EDEBF3] pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {claim?.state && claim.state !== "unclaimed" && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              claim.state === "claimed"
                ? "bg-[#F3FAF6] text-[#2F6B4A]"
                : "bg-[#F4F0FE] text-[#6F5BA0]"
            }`}
          >
            {claim.state === "claimed" && <Check className="h-3.5 w-3.5" />}
            {CLAIM_STATE_LABEL[claim.state]}
          </span>
        )}
        {(!claim?.state || claim.state === "unclaimed") && <span />}
        <button
          type="button"
          onClick={() => {
            ensureClaim(doc);
            setOpen((o) => !o);
          }}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#DCD4F0] bg-white px-3 text-[12px] font-semibold text-[#3D2E6B] transition hover:bg-[#F6F4FC]"
        >
          <Mail className="h-3.5 w-3.5" />
          {claim?.sentTo ? "Resend link" : "Share via email"}
        </button>
      </div>

      {claim?.sentTo && !open && (
        <p className="mt-2 text-[11.5px] text-[#8A7FB0]">
          Link sent to {claim.sentTo}
          {claim.sentAt ? ` · ${formatDateTime(claim.sentAt)}` : ""}
        </p>
      )}

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
                markClaimSent(claim.claimId, email.trim());
                setOpen(false);
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
