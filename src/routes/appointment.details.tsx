import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { ArrowLeft, CalendarClock, Check, ChevronDown, Lock, Ban } from "lucide-react";
import { toast } from "sonner";
import {
  ApptNotesBlock,
  ApptPayoutStatus,
  type ApptLite,
} from "@/components/profile/ProviderSections";
import { publishAppointmentEvent } from "@/lib/appointments-bus";
import { AiProviderBrief } from "@/components/appointment/AiProviderBrief";
import { AiPrescription } from "@/components/appointment/AiPrescription";
import { DevPatientDataToggle } from "@/components/appointment/DevPatientDataToggle";
import { getAnyProviderGrant, subscribeProviderShares } from "@/lib/share/providerShareStore";
import {
  isPrescriber,
  isVerifiedPrescriber,
  serviceSupportsPrescription,
} from "@/lib/prescription/store";
import { useVerifiedPrescribing } from "@/lib/prescription/useVerifiedPrescribing";
import {
  prescribingGate,
  VERIFICATION_STATUS_LABEL,
} from "@/lib/prescription/useVerifiedPrescribing";
import { loadPrescription, subscribePrescription } from "@/lib/prescription/store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { prescriptionStatusLabel, deliveryComplete } from "@/lib/prescription/status";
import {
  encounterPrescribingBlock,
  getOutcomeCopy,
  SIGNED_RX_MODAL,
  SIGNED_RX_CONFLICT,
  UNSIGNED_DRAFT_WARNING,
  RX_COMPLETED_RELEASE_NOTE,
} from "@/lib/prescription/encounter";

const searchSchema = z.object({
  id: z.string().optional(),
  d: z.string().optional(),
});

type StoredAppt = ApptLite & {
  client?: string;
  day?: string;
  date?: string;
  month?: string;
  time?: string;
  timezone?: string;
  duration?: string;
  type?: string;
  sessionFormat?: "Individual" | "Group";
  mode?: string;
  amount?: string;
  paymentStatus?: "Paid" | "Pending" | "Refunded" | "Failed";
  promoCode?: string;
  /** Patient's jurisdiction — drives which prescribing rules apply. */
  jurisdiction?: "PH" | "US";
  /** Prototype only: lets a demo link open as a specific provider so the
   *  prescribing surface can be reviewed without seeding this browser. */
  providerName?: string;
  providerProfession?: string;
};

type Outcome = NonNullable<ApptLite["outcome"]>;

function getOutcomeOptions(isPrescriber: boolean): {
  value: Outcome;
  label: string;
  consequence: string;
}[] {
  return [
    {
      value: "completed",
      label: "Completed",
      consequence: isPrescriber
        ? "The clinical encounter took place and the visit is finished. Prescribing stays open, so a prescription created here can be signed, issued and received by the client."
        : "The clinical encounter took place and the visit is finished. The session status will be updated to completed.",
    },
    {
      value: "client_no_show",
      label: "Client no-show",
      consequence: isPrescriber
        ? "The client did not attend and no clinical encounter took place. The prescription step becomes Not applicable and any prescription created here is voided — the client will not receive it."
        : "The client did not attend and no clinical encounter took place. The session status will be updated to client no-show.",
    },
    {
      value: "provider_no_show",
      label: "Provider no-show",
      consequence: isPrescriber
        ? "The encounter did not take place because the provider was unavailable. The prescription step becomes Not applicable and any prescription created here is voided — the client will not receive it."
        : "The encounter did not take place because the provider was unavailable. The session status will be updated to provider no-show.",
    },
    {
      value: "cancelled",
      label: "Cancelled",
      consequence: isPrescriber
        ? "The appointment was cancelled and no clinical encounter took place. The prescription step becomes Not applicable and any prescription created here is voided — the client will not receive it."
        : "The appointment was cancelled and no clinical encounter took place. The session status will be updated to cancelled.",
    },
    {
      value: "rescheduled",
      label: "Rescheduled",
      consequence: isPrescriber
        ? "A new appointment will be scheduled instead. Any prescription created here is voided for this encounter, and prescribing can be completed again from the rescheduled appointment."
        : "A new appointment will be scheduled instead. The session status will be updated to rescheduled.",
    },
  ];
}

export const Route = createFileRoute("/appointment/details")({
  validateSearch: (input: Record<string, unknown>) => searchSchema.parse(input),
  component: DetailsPage,
  head: () => ({
    meta: [
      { title: "Session workspace — Lubin" },
      {
        name: "description",
        content:
          "Prepare, document and close out a therapy or psychiatry session in one calm workspace.",
      },
    ],
  }),
});

/* ------------------------------ UI primitives ------------------------------ */

function SectionCard({
  id,
  number,
  eyebrow,
  title,
  description,
  defaultOpen = false,
  hint,
  done = false,
  reference = false,
  pillLabel,
  requirementLabel,
  checkBadge = false,
  locked: lockedProp = false,
  lockedNote,
  dimmed: dimmedProp = false,
  openOverride,
  onToggle,
  children,
}: {
  id?: string;
  number?: number;
  eyebrow?: string;
  title: string;
  description?: string;
  defaultOpen?: boolean;
  hint?: string;
  done?: boolean;
  reference?: boolean;
  pillLabel?: string;
  requirementLabel?: string;
  checkBadge?: boolean;
  locked?: boolean;
  lockedNote?: string;
  dimmed?: boolean;
  openOverride?: boolean;
  onToggle?: () => void;
  children: ReactNode;
}) {
  const [localOpen, setLocalOpen] = useState(defaultOpen);
  // A completed step is never locked or dimmed, even if a prerequisite
  // step is still outstanding — it already reads as done.
  const isComplete = done || checkBadge;
  const locked = lockedProp && !isComplete;
  const dimmed = dimmedProp && !isComplete;
  const controlled = openOverride !== undefined;
  const open = locked ? false : controlled ? openOverride : localOpen;
  // Visual state: done > active (open) > todo. `reference` is a neutral read-only tone.
  // A checked item (checkBadge) reads as complete, so it uses the same
  // "done" treatment as the During-the-session card.
  const state: "done" | "active" | "todo" | "reference" =
    done || checkBadge ? "done" : reference ? "reference" : open ? "active" : "todo";

  const shell =
    state === "done"
      ? "border-[#D8C7F0] bg-[#F4EEFC]"
      : state === "active"
        ? "border-[#6E4FD3] bg-white ring-2 ring-[#6E4FD3]/25"
        : state === "reference"
          ? "border-[#EAE2F6] bg-white"
          : "border-[#EAE2F6] bg-white";
  const lockedShell = locked ? " border-[#EDE8F6] bg-[#FBFAFD] opacity-70" : "";
  const dimmedShell = !locked && dimmed && !open ? " border-[#EDE8F6] bg-[#FBFAFD] opacity-70" : "";

  const badge =
    state === "done"
      ? "bg-[#6E4FD3] text-white"
      : state === "active"
        ? "bg-[#3D2E6B] text-white"
        : "bg-[#EFE8FB] text-[#3D2E6B]";

  return (
    <section
      id={id}
      className={`overflow-hidden rounded-[20px] border transition-all ${shell}${lockedShell}${dimmedShell}`}
    >
      <button
        type="button"
        disabled={locked}
        onClick={() => (controlled ? onToggle?.() : setLocalOpen((v) => !v))}
        className={`flex w-full items-start gap-4 px-5 py-4 text-left transition-colors ${locked ? "cursor-not-allowed" : ""}`}
      >
        {number != null && (
          <span
            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${badge}`}
            aria-label={
              state === "done"
                ? `Step ${number} complete`
                : state === "active"
                  ? `Step ${number} in progress`
                  : `Step ${number}`
            }
          >
            {state === "done" || checkBadge ? "✓" : number}
          </span>
        )}
        <span className="min-w-0 flex-1">
          {eyebrow && (
            <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#A89BD0]">
              {eyebrow}
            </span>
          )}
          <span className="mt-0.5 block text-[15px] font-semibold text-[#2C2B4B]">{title}</span>
          {description && (
            <span className="mt-1 block text-[13px] leading-snug text-[#7E6BAF]">
              {description}
            </span>
          )}
          {hint && <span className="mt-1.5 block text-[12px] italic text-[#A89BD0]">{hint}</span>}
          {locked && lockedNote && (
            <span className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium text-[#A89BD0]">
              <Lock className="h-3 w-3" /> {lockedNote}
            </span>
          )}
          {!locked && dimmed && lockedNote && (
            <span className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium text-[#A89BD0]">
              <Lock className="h-3 w-3" /> {lockedNote}
            </span>
          )}
        </span>
        {locked ? (
          <span className="mt-0.5 hidden shrink-0 items-center sm:flex">
            <span className="rounded-full bg-[#F1EDF8] px-2.5 py-0.5 text-[11px] font-medium text-[#A89BD0]">
              {requirementLabel ?? "Locked"}
            </span>
          </span>
        ) : (
          !(state === "reference" && !pillLabel) && (
            <span className="mt-0.5 hidden shrink-0 items-center gap-1.5 sm:flex">
              {requirementLabel && (
                <span className="rounded-full border border-[#E5DCF5] bg-white px-2 py-0.5 text-[11px] font-medium text-[#A89BD0]">
                  {requirementLabel}
                </span>
              )}
              <span
                className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                style={{
                  backgroundColor:
                    state === "done"
                      ? "#E7DAF8"
                      : state === "active"
                        ? "#3D2E6B"
                        : state === "reference"
                          ? "#F1EAFB"
                          : "#F5F0FB",
                  color: state === "done" ? "#3D2E6B" : state === "active" ? "#FFFFFF" : "#7E6BAF",
                }}
              >
                {pillLabel
                  ? pillLabel
                  : state === "done"
                    ? "Shared"
                    : state === "active"
                      ? "In progress"
                      : state === "reference"
                        ? "Reference"
                        : "Not started"}
              </span>
            </span>
          )
        )}
        {!locked && (
          <ChevronDown
            className={`mt-1 h-5 w-5 shrink-0 text-[#A89BD0] transition-transform ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>
      {open && (
        <div
          className={`border-t px-4 py-5 md:px-6 ${state === "done" ? "border-[#E4D5F5] bg-white" : "border-[#F1EAFB] bg-[#FBF9FF]"}`}
        >
          {children}
        </div>
      )}
    </section>
  );
}

/* --------------------------------- Page ----------------------------------- */

function DetailsPage() {
  const { id, d } = Route.useSearch();
  const [appt, setAppt] = useState<StoredAppt | null>(null);
  const [missing, setMissing] = useState(false);
  const [canPrescribe, setCanPrescribe] = useState(false);
  const [providerDisplayName, setProviderDisplayName] = useState<string | undefined>(undefined);
  const [providerProfession, setProviderProfession] = useState<string | undefined>(undefined);
  const [followUpPublishConfirmed, setFollowUpPublishConfirmed] = useState(false);
  const [privateNotesSaved, setPrivateNotesSaved] = useState(false);
  const [followUpSaved, setFollowUpSaved] = useState(false);
  const [sharedRefOpen, setSharedRefOpen] = useState(false);
  const [rxTick, setRxTick] = useState(0);
  // Step acknowledgements — a provider may have nothing to add, but must say so
  // explicitly instead of silently skipping past the step.
  const [acks, setAcks] = useState<{ notes?: boolean; summary?: boolean }>({});
  const [summaryAckChecked, setSummaryAckChecked] = useState(false);
  const [outcomeChoice, setOutcomeChoice] = useState<Outcome | null>(null);
  // Prescription-driven conflicts on the closeout: a hard block when a signed
  // prescription exists, a confirm-once warning when an unsigned draft does.
  const [outcomeConflict, setOutcomeConflict] = useState<string | null>(null);
  const [draftWarningFor, setDraftWarningFor] = useState<Outcome | null>(null);
  // Selecting a non-delivered outcome closes prescribing immediately, before the
  // appointment is closed, so the provider cannot keep working on medication.
  const [outcomeNoticeOpen, setOutcomeNoticeOpen] = useState(false);
  // Post-completion editing: the form is read-only once the appointment is
  // closed. A provider may reopen it for edits within 24 hours, but only after
  // agreeing that the change is recorded on the clinical record.
  const [editUnlocked, setEditUnlocked] = useState(false);
  const [editConsentOpen, setEditConsentOpen] = useState(false);
  const [editConsentChecked, setEditConsentChecked] = useState(false);
  useEffect(() => subscribePrescription(() => setRxTick((t) => t + 1)), []);

  useEffect(() => {
    if (!id) return;
    try {
      const raw = window.localStorage.getItem(`lubin:appt-steps:${id}`);
      if (raw) setAcks(JSON.parse(raw) as { notes?: boolean; summary?: boolean });
    } catch {
      /* noop */
    }
  }, [id]);

  const setAck = (patch: { notes?: boolean; summary?: boolean }) => {
    setAcks((cur) => {
      const next = { ...cur, ...patch };
      try {
        if (id) window.localStorage.setItem(`lubin:appt-steps:${id}`, JSON.stringify(next));
      } catch {
        /* noop */
      }
      return next;
    });
  };

  useEffect(() => {
    setCanPrescribe(isVerifiedPrescriber());
    try {
      const raw = window.localStorage.getItem("lubin.providerProfile.v1");
      if (raw) {
        const parsed = JSON.parse(raw) as {
          name?: string;
          displayName?: string;
          profession?: string;
        };
        setProviderDisplayName(parsed.displayName || parsed.name || undefined);
        setProviderProfession(parsed.profession || undefined);
      }
    } catch {
      /* noop */
    }
  }, []);

  // Lubin's backend is the source of truth for prescribing authority: a
  // provider may be a doctor on their profile, but the tools stay closed until
  // Lubin has verified their licence and prescribing credentials.
  const verification = useVerifiedPrescribing(providerDisplayName);
  const backendPrescribingVerified =
    verification.data?.status === "verified" && verification.data.jurisdictions.length > 0;

  useEffect(() => {
    if (!id) {
      setMissing(true);
      return;
    }
    try {
      // Prototype only: the appointment payload arrives base64-encoded in the
      // URL so the demo can open in a new tab. Production must load the
      // appointment from authenticated data — never encode clinical or
      // payment details in a link.
      // Prefer the fresh URL payload so seed changes (like new attachments)
      // don't get shadowed by a stale localStorage cache.
      if (d) {
        const decoded = decodeURIComponent(escape(atob(d)));
        const parsed = JSON.parse(decoded) as StoredAppt;
        setAppt(parsed);
        // Prototype only: a demo link may declare which provider is opening it
        // so the prescribing surface can be reviewed without hand-seeding this
        // browser. Production reads the signed-in provider instead.
        if (parsed.providerProfession || parsed.providerName) {
          if (parsed.providerName) setProviderDisplayName(parsed.providerName);
          if (parsed.providerProfession) setProviderProfession(parsed.providerProfession);
          try {
            const rawProfile = window.localStorage.getItem("lubin.providerProfile.v1");
            const profile = rawProfile ? (JSON.parse(rawProfile) as Record<string, unknown>) : {};
            window.localStorage.setItem(
              "lubin.providerProfile.v1",
              JSON.stringify({
                ...profile,
                ...(parsed.providerName ? { name: parsed.providerName } : {}),
                ...(parsed.providerProfession ? { profession: parsed.providerProfession } : {}),
              }),
            );
          } catch {
            /* noop */
          }
        }
        try {
          window.localStorage.setItem(`lubin:appt-details:${id}`, JSON.stringify(parsed));
        } catch {
          /* noop */
        }
        return;
      }
      const raw = window.localStorage.getItem(`lubin:appt-details:${id}`);
      if (raw) {
        setAppt(JSON.parse(raw) as StoredAppt);
        return;
      }
      setMissing(true);
    } catch {
      setMissing(true);
    }
  }, [id, d]);

  const onChange = (patch: Partial<ApptLite>) => {
    if (!appt) return;
    const next = { ...appt, ...patch } as StoredAppt;
    setAppt(next);
    try {
      window.localStorage.setItem(`lubin:appt-details:${appt.id}`, JSON.stringify(next));
    } catch {
      /* noop */
    }
    publishAppointmentEvent({
      type: "appt-updated",
      id: appt.id,
      patch: patch as Record<string, unknown>,
    });
  };

  const appointmentLabel = useMemo(
    () => [appt?.month, appt?.date, appt?.time ? "·" : "", appt?.time].filter(Boolean).join(" "),
    [appt?.month, appt?.date, appt?.time],
  );

  const [shareTick, setShareTick] = useState(0);
  useEffect(() => subscribeProviderShares(() => setShareTick((t) => t + 1)), []);

  const isCompleted = appt?.status === "completed";
  const isSessionReview = appt?.status === "session_review";
  // 24-hour post-completion edit window.
  const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;
  const closedAt = appt?.closedAt;
  const editWindowEndsAt = closedAt ? closedAt + EDIT_WINDOW_MS : null;
  const editWindowExpired = !!editWindowEndsAt && Date.now() > editWindowEndsAt;
  // Read-only once closed, unless the provider reopens it inside the window.
  const formLocked = isCompleted && (editWindowExpired || !editUnlocked);
  const editWindowLabel = editWindowEndsAt
    ? new Date(editWindowEndsAt).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;
  const isCancelled = appt?.status === "cancelled";
  const hasNotes = !!(appt?.notes && appt.notes.trim().length > 0);
  const isPublished = !!appt?.publishedFollowUp;

  const hasFollowUpContent = useMemo(() => {
    const fu = appt?.followUp;
    return !!(
      (fu?.summary && fu.summary.trim().length > 0) ||
      (fu?.homework && fu.homework.trim().length > 0) ||
      (fu?.nextFocus && fu.nextFocus.trim().length > 0) ||
      (fu?.resources && fu.resources.length > 0) ||
      (appt?.attachments && appt.attachments.length > 0)
    );
  }, [appt?.followUp, appt?.attachments]);

  const followUpStatus = useMemo(() => {
    if (isPublished) return "Shared";
    if (followUpPublishConfirmed && hasFollowUpContent) return "Ready to share";
    if (hasFollowUpContent) return "Draft saved";
    return "Not started";
  }, [isPublished, followUpPublishConfirmed, hasFollowUpContent]);

  const docStatus = hasNotes ? "Complete" : "Not started";

  // Lifecycle wording comes from the single e-prescribing status source, so the
  // task pill never says "Verified" for the prescription as a whole.
  const rxLifecycle = useMemo(() => {
    if (!appt?.id) return { label: "Not started", issued: false, skipped: false };
    const rx = loadPrescription(appt.id);
    const named = rx.medications.filter((m) => m.name.trim().length > 0);
    if (rx.skippedAt && named.length === 0)
      return { label: "Skipped", issued: false, skipped: true };
    if (named.length === 0 && rx.medications.length > 0)
      return { label: "Details incomplete", issued: false, skipped: false };
    if (named.length === 0) return { label: "Not started", issued: false, skipped: false };
    return {
      label: prescriptionStatusLabel(rx, { readyToSign: false }),
      issued: !!rx.finalisedAt && deliveryComplete(rx),
      skipped: false,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appt?.id, rxTick]);
  const rxStatus = rxLifecycle.label;

  // Prescription lifecycle facts that constrain which outcomes may be recorded.
  const rxRecordState = useMemo(() => {
    if (!appt?.id) return { signed: false, unsignedDraft: false };
    const rx = loadPrescription(appt.id);
    const named = rx.medications.filter((m) => m.name.trim().length > 0);
    return {
      signed: !!rx.finalisedAt,
      unsignedDraft: !rx.finalisedAt && named.length > 0,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appt?.id, rxTick]);

  const sharedSummaryLine = useMemo(() => {
    if (!appt?.id) return null;
    const grant = getAnyProviderGrant(appt.id);
    if (!grant || grant.revoked) return null;
    const attempts = grant.snapshot?.attemptsInRange ?? [];
    const safety = attempts.some(
      (a) => a.assessmentId?.toLowerCase().includes("phq") && (a.answers?.[8] ?? 0) > 0,
    );
    return [
      grant.snapshot?.rangeLabel ?? grant.dateRangeLabel ?? "Recent activity",
      `${attempts.length} assessment${attempts.length === 1 ? "" : "s"}`,
      safety ? "Safety response requires review" : null,
    ]
      .filter(Boolean)
      .join(" · ");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appt?.id, shareTick]);

  // Only one task stays open at a time; the page opens on the task list.
  const [openStep, setOpenStep] = useState<string | null>(null);
  const toggleStep = (key: string) => setOpenStep((cur) => (cur === key ? null : key));

  // Parse appointment start time. Month/date/time come as strings like
  // "Jun", "19", "2:00 PM". If parsing fails we fall back to "not past".
  const apptStart = useMemo(() => parseApptStart(appt), [appt]);
  const isPastStart = !!apptStart && apptStart.getTime() <= Date.now();
  const showPostSession = isCompleted || isSessionReview || (isPastStart && !isCancelled);

  const recordedOutcome = appt?.outcome;
  // The recorded outcome decides whether this appointment is still a valid
  // prescribing encounter.
  const encounterBlock = encounterPrescribingBlock(recordedOutcome);
  // A pending (selected but not yet recorded) outcome gates prescribing the same
  // way a recorded one does; switching back to Completed restores the workflow.
  const pendingBlock = recordedOutcome
    ? null
    : encounterPrescribingBlock(outcomeChoice ?? undefined);
  const activeBlock = encounterBlock ?? pendingBlock;
  // Confirmation modal state: the appointment outcome is the headline, the
  // prescription consequence is supporting information.
  const noticeOutcome = outcomeChoice ?? null;
  const noticeCopy = noticeOutcome
    ? getOutcomeCopy(noticeOutcome, isPrescriber(providerProfession || verification.data?.profession))
    : null;
  const noticeBlocksRx = !!noticeOutcome && !!encounterPrescribingBlock(noticeOutcome);
  const noticeSignedConflict = noticeBlocksRx && rxRecordState.signed;
  const noticeDraftWarning = noticeBlocksRx && !rxRecordState.signed && rxRecordState.unsignedDraft;
  const rxServiceOnly = serviceSupportsPrescription(appt?.type, appt?.prescriptionEligible);

  // One source of truth for the card header: it can never say "Verified" while
  // the tools inside report expired or unverified credentials.
  const rxCountry: "PH" | "US" = appt?.jurisdiction === "US" ? "US" : "PH";
  const rxGate = useMemo(
    () =>
      prescribingGate({
        record: verification.data ?? null,
        country: rxCountry,
        profession: verification.data?.profession,
      }),
    [verification.data, rxCountry],
  );
  const rxHeaderEyebrow = verification.isLoading
    ? "Checking verification"
    : rxGate.allowed
      ? "Verified prescriber"
      : VERIFICATION_STATUS_LABEL[rxGate.status];

  // Lubin's verification register is the source of truth for prescribing
  // authority; the locally cached flag only corroborates it.
  const rxAllowed =
    rxServiceOnly && (rxGate.allowed || (canPrescribe && backendPrescribingVerified));

  // Sequential gating: 1 → 2 → prescription → close out.
  const step1Done = hasNotes || !!acks.notes;
  // Step 1 is a documentation decision: either notes are recorded, or the
  // provider explicitly recorded that there are none. Either resolves it and
  // unlocks prescribing.
  const clinicalDocForRx = hasNotes || !!acks.notes;
  const step2Done = isPublished || !!acks.summary;
  // Prescribing is a profession-bound surface: only a mental-health doctor,
  // psychiatrist or other prescribing profession ever sees the step. For
  // everyone else it does not exist — it is not shown as locked or unavailable.
  const prescribingProfession = isPrescriber(providerProfession || verification.data?.profession);
  const outcomes = getOutcomeOptions(prescribingProfession);
  const rxShown = rxServiceOnly && showPostSession && prescribingProfession;
  const rxDone = !rxShown || !!activeBlock ? true : rxLifecycle.issued || rxLifecycle.skipped;
  const step2Locked = !step1Done;
  // Prescribing is never gated on the optional shared summary. Access depends on
  // the appointment having occurred, verified prescribing authority, the required
  // patient information and the medication clinical review inside the tool.
  const rxLocked = false;
  const canCloseOut = step1Done && step2Done && rxDone;

  if (missing) {
    return (
      <div className="min-h-screen bg-[#FBF9FF]">
        <div className="mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center">
          <CalendarClock className="h-8 w-8 text-[#A89BD0]" />
          <h1 className="mt-4 text-xl font-bold text-[#3D2E6B]">Session not found</h1>
          <p className="mt-2 text-sm text-[#7E6BAF]">
            This session may have been cleared from this browser. Open it again from your bookings
            list.
          </p>
          <Link
            to="/profile"
            className="mt-6 inline-flex items-center gap-1.5 rounded-[8px] bg-[#3D2E6B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2C2B4B]"
          >
            <ArrowLeft className="h-4 w-4" /> Back to profile
          </Link>
        </div>
      </div>
    );
  }

  if (!appt) {
    return (
      <div className="min-h-screen bg-[#FBF9FF]">
        <div className="mx-auto max-w-3xl space-y-4 px-6 py-12">
          <div className="h-6 w-40 animate-pulse rounded bg-[#EAE7F5]" />
          <div className="h-32 animate-pulse rounded-[14px] bg-[#EAE7F5]" />
          <div className="h-48 animate-pulse rounded-[14px] bg-[#EAE7F5]" />
        </div>
      </div>
    );
  }

  const clientLabel = (appt.client ?? "your client").split(" ")[0];
  const sessionStatusLabel = isCancelled
    ? "Cancelled"
    : isPublished
      ? recordedOutcome
        ? (outcomes.find((o) => o.value === recordedOutcome)?.label ?? "Completed")
        : "Completed"
      : showPostSession
        ? "Session ended · Notes pending"
        : "Confirmed";

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#F5EFFB] via-[#FBF9FF] to-[#FBF9FF] px-4 py-10">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6">
        {/* Back link */}
        <Link
          to="/provider/appointments"
          className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#7E6BAF] hover:text-[#3D2E6B]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Appointments
        </Link>

        {/* Page header */}
        <header className="relative overflow-hidden rounded-[24px] border border-[#EAE2F6] bg-white p-6 shadow-[0_10px_40px_-24px_rgba(61,46,107,0.35)] md:p-7">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#EFE8FB] blur-3xl" />
          <div className="relative flex flex-col gap-5">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold leading-tight text-[#2C2B4B] sm:text-[26px]">
                  Complete your session notes
                </h1>
                <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-[#7E6BAF]">
                  Record your private clinical notes and, if you want, add a client-friendly summary
                  for {clientLabel}. Nothing is shared until you review and confirm.
                </p>
              </div>
              <p className="shrink-0 text-[11px] font-medium text-[#A89BD0] md:text-right">
                Ref: #{appt.id.toString().toUpperCase()}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <FactTile label="Client" value={appt.client ?? "—"} />
              <FactTile
                label="Appointment"
                value={[appt.month, appt.date].filter(Boolean).join(" ") || "—"}
                sub={appt.time}
              />
              <FactTile
                label="Session type"
                value={appt.type ?? "—"}
                sub={[appt.duration, appt.mode].filter(Boolean).join(" · ")}
              />
              <FactTile label="Status" value={sessionStatusLabel} />
            </div>
          </div>
        </header>

        <div className="grid gap-6">
          {/* Main working area */}
          <div className="flex min-w-0 flex-col gap-4">
            {/* Progress timeline — kept at the top so the remaining work is visible first */}
            {showPostSession && (
              <section className="overflow-hidden rounded-[20px] border border-[#EAE2F6] bg-white">
                <div className="px-5 py-4 md:px-6 md:pt-5 md:pb-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#A89BD0]">
                    {isCompleted
                      ? "Appointment completed"
                      : canCloseOut
                        ? "Ready to close this appointment"
                        : "Steps left before you can close this appointment"}
                  </p>
                  <ol
                    className="mt-4 flex flex-col gap-0 sm:grid sm:items-start sm:gap-0"
                    style={{
                      gridTemplateColumns: `repeat(${rxShown ? 4 : 3}, minmax(0, 1fr))`,
                    }}
                  >
                    {[
                      {
                        label: "Private clinical notes",
                        done: step1Done,
                        id: "session-notes" as const,
                      },
                      {
                        label: `Summary for ${clientLabel}`,
                        done: step2Done,
                        id: "care-plan" as const,
                      },
                      ...(rxShown
                        ? [
                            {
                              label: "Prescription",
                              done: rxDone,
                              id: "prescriptions" as const,
                            },
                          ]
                        : []),
                      {
                        label: "Close the appointment",
                        done: isCompleted,
                        id: null,
                      },
                    ].map((s, i, arr) => {
                      const isCurrent = !s.done && arr.slice(0, i).every((p) => p.done);
                      const isLast = i === arr.length - 1;
                      const circle = s.done ? (
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#6E4FD3] text-white transition-transform group-hover:scale-105">
                          <Check className="h-5 w-5" strokeWidth={3} />
                        </span>
                      ) : isCurrent ? (
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-[#6E4FD3] bg-white text-center text-[13px] font-bold leading-none text-[#6E4FD3] shadow-[0_0_0_4px_rgba(110,79,211,0.08)] transition-transform group-hover:scale-105">
                          {i + 1}
                        </span>
                      ) : (
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#E5DCF5] bg-white text-center text-[13px] font-bold leading-none text-[#A89BD0] transition-transform group-hover:scale-105">
                          {i + 1}
                        </span>
                      );
                      return (
                        <li
                          key={s.label}
                          className="group relative flex min-w-0 flex-row items-start gap-3 sm:flex-col sm:items-center sm:gap-0"
                        >
                          {/* Connector: spans from this circle's center to the next circle's center */}
                          {!isLast && (
                            <>
                              <span
                                aria-hidden
                                className={`pointer-events-none absolute left-1/2 hidden h-[2px] w-full sm:block ${
                                  s.done ? "bg-[#6E4FD3]" : "bg-[#E5DCF5]"
                                }`}
                                style={{ top: "17px" }}
                              />
                              <span
                                aria-hidden
                                className={`pointer-events-none absolute left-[17px] w-[2px] sm:hidden ${
                                  s.done ? "bg-[#6E4FD3]" : "bg-[#E5DCF5]"
                                }`}
                                style={{ top: "2.25rem", bottom: 0 }}
                              />
                            </>
                          )}
                          {/* Circle */}
                          <div className="relative z-10 flex shrink-0 items-center justify-center">
                            {s.id ? (
                              <button
                                type="button"
                                onClick={() => setOpenStep(s.id)}
                                className="relative z-10 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6E4FD3] focus-visible:ring-offset-2"
                                aria-label={`Open ${s.label}`}
                              >
                                {circle}
                              </button>
                            ) : (
                              <span className="relative z-10">{circle}</span>
                            )}
                          </div>
                          {/* Label + status */}
                          <div className="relative z-10 min-w-0 pb-5 text-left sm:w-full sm:px-2 sm:pb-0 sm:pt-2.5 sm:text-center">
                            {s.id ? (
                              <button
                                type="button"
                                onClick={() => setOpenStep(s.id)}
                                className={`block w-full text-[13px] font-semibold leading-snug transition-colors hover:text-[#6E4FD3] ${
                                  s.done ? "text-[#A89BD0]" : "text-[#2C2B4B]"
                                }`}
                              >
                                {s.label}
                              </button>
                            ) : (
                              <span
                                className={`block w-full text-[13px] font-semibold leading-snug ${
                                  s.done ? "text-[#A89BD0]" : "text-[#2C2B4B]"
                                }`}
                              >
                                {s.label}
                              </span>
                            )}
                            {isCurrent && (
                              <span className="mt-0.5 block text-[11.5px] font-medium text-[#6E4FD3]">
                                In progress
                              </span>
                            )}
                            {s.done && (
                              <span className="mt-0.5 block text-[11.5px] text-[#A89BD0]">
                                Done
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
                {!isCompleted && (
                  <div className="flex items-center gap-3 border-t border-[#F0EAFA] bg-[#FBF9FF] px-5 py-3.5 md:px-6">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#6E4FD3]" />
                    <p className="text-[12px] leading-snug text-[#5A4A8A]">
                      <span className="font-semibold text-[#3D2E6B]">Next:</span>{" "}
                      {canCloseOut
                        ? "Review and close this appointment."
                        : "Complete the step in progress to unlock the next one."}
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* Client-shared reference material — outside the numbered tasks */}
            {isCompleted && (
              <section
                className={`rounded-[20px] border px-5 py-4 md:px-6 ${
                  formLocked ? "border-[#EAE2F6] bg-white" : "border-[#D8C7F0] bg-[#F7F3FF]"
                }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[14px] font-semibold text-[#2C2B4B]">
                      {formLocked ? (
                        <Lock className="h-4 w-4 text-[#A89BD0]" />
                      ) : (
                        <Check className="h-4 w-4 text-[#6E4FD3]" />
                      )}
                      {formLocked
                        ? editWindowExpired
                          ? "This post-appointment form can no longer be modified"
                          : "This post-appointment form is read-only"
                        : "Editing is open — changes are recorded on the clinical record"}
                    </p>
                    <p className="mt-1 max-w-2xl text-[13px] leading-snug text-[#7E6BAF]">
                      {editWindowExpired
                        ? `The 24-hour edit window closed on ${editWindowLabel}. Your notes, the client summary and any prescription decision stay part of the appointment record and cannot be changed.`
                        : formLocked
                          ? `The appointment is closed, so new post-session details cannot be entered. You can still correct information until ${editWindowLabel ?? "24 hours after closing"} — after that this form is locked permanently.`
                          : `You can now edit the steps below. Editing closes ${editWindowLabel ? `on ${editWindowLabel}` : "24 hours after this appointment was closed"}.`}
                    </p>
                  </div>
                  {!editWindowExpired && (
                    <button
                      type="button"
                      onClick={() => {
                        if (formLocked) {
                          setEditConsentChecked(false);
                          setEditConsentOpen(true);
                        } else {
                          setEditUnlocked(false);
                          setOpenStep(null);
                        }
                      }}
                      className={`inline-flex h-10 shrink-0 items-center rounded-[10px] px-4 text-[13px] font-semibold transition ${
                        formLocked
                          ? "bg-[#6E4FD3] text-white hover:bg-[#5A3EB8]"
                          : "border border-[#D6CCEC] bg-white text-[#3D2E6B] hover:bg-[#F7F4FB]"
                      }`}
                    >
                      {formLocked ? "Edit post-appointment form" : "Finish editing"}
                    </button>
                  )}
                </div>
              </section>
            )}

            <section className="overflow-hidden rounded-[20px] border border-[#EAE2F6] bg-white">
              <button
                type="button"
                onClick={() => setSharedRefOpen((v) => !v)}
                className="flex w-full items-start gap-4 px-5 py-4 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-[#2C2B4B]">
                    Health information {clientLabel} shared
                  </span>
                  <span className="mt-1 block text-[13px] leading-snug text-[#7E6BAF]">
                    Recent check-ins, assessments and Health Passport information shared for this
                    appointment.
                  </span>
                  <span className="mt-1.5 block text-[12px] font-medium text-[#5A4A8A]">
                    {sharedSummaryLine ?? "Nothing shared for this appointment"}
                  </span>
                </span>
                <ChevronDown
                  className={`mt-1 h-5 w-5 shrink-0 text-[#A89BD0] transition-transform ${sharedRefOpen ? "rotate-180" : ""}`}
                />
              </button>
              {!sharedRefOpen && (
                <div className="border-t border-[#F1EAFB] px-5 py-3">
                  <button
                    type="button"
                    onClick={() => setSharedRefOpen(true)}
                    className="rounded-[10px] border border-[#D6CCEC] bg-white px-3.5 py-1.5 text-[12px] font-semibold text-[#3D2E6B] hover:bg-[#F7F4FB]"
                  >
                    Review shared information
                  </button>
                </div>
              )}
              {sharedRefOpen && (
                <div className="border-t border-[#F1EAFB] bg-[#FBF9FF] px-4 py-5 md:px-6">
                  <AiProviderBrief
                    appointmentId={appt.id}
                    providerName={providerDisplayName}
                    clientName={appt.client}
                    appointmentLabel={appointmentLabel}
                    onViewSupporting={() => {
                      document
                        .getElementById("shared-passport-block")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    onViewAssessments={() => {
                      document
                        .getElementById("assessments-block")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    onViewTimeline={() => {
                      document
                        .getElementById("shared-timeline-block")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                  />
                </div>
              )}
            </section>

            {/* Task 1 — private clinical documentation */}
            {showPostSession && (
              <SectionCard
                id="session-notes"
                number={1}
                eyebrow="After the session"
                title="Private clinical notes"
                description={`For your records only. Not shared with ${clientLabel}.`}
                openOverride={openStep === "session-notes"}
                onToggle={() => toggleStep("session-notes")}
                done={step1Done}
                checkBadge={step1Done}
                locked={formLocked}
                lockedNote={
                  formLocked
                    ? editWindowExpired
                      ? "Locked — the 24-hour edit window has closed"
                      : "Read-only — reopen editing to make changes"
                    : undefined
                }
                pillLabel={acks.notes && !hasNotes ? "Nothing to add" : docStatus}
                requirementLabel={rxShown ? "Required before prescribing" : undefined}
              >
                <>
                  <ApptNotesBlock
                    appt={appt}
                    onChange={onChange}
                    variant="private"
                    clientName={appt.client}
                    providerName={providerDisplayName}
                    onPrivateNotesSaved={(saved) => {
                      setPrivateNotesSaved(saved);
                      if (saved) setOpenStep(null);
                    }}
                  />
                  {!hasNotes && !acks.notes && (
                    <div className="mt-4 rounded-2xl border border-[#E5DCF5] bg-white px-4 py-3.5">
                      <p className="text-[13px] leading-snug text-[#5A4A8A]">
                        Nothing to record for this session? You can move on — just confirm it so the
                        step is not left open by accident. You can still add notes afterwards.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setAck({ notes: true });
                          setOpenStep("care-plan");
                        }}
                        className="mt-2.5 inline-flex h-9 items-center rounded-[10px] border border-[#D6CCEC] bg-white px-3.5 text-[12.5px] font-semibold text-[#3D2E6B] hover:bg-[#F7F4FB]"
                      >
                        No private notes for this session
                      </button>
                    </div>
                  )}
                  {!hasNotes && acks.notes && (
                    <div className="mt-4 rounded-2xl border border-[#E5DCF5] bg-white px-4 py-3">
                      <p className="text-[13px] text-[#5A4A8A]">
                        You recorded that there are no private notes for this session. If you decide
                        to document something, use{" "}
                        <span className="font-semibold">Add clinical notes</span> above and save it
                        — that replaces this. Otherwise it stays as no notes.
                      </p>
                    </div>
                  )}
                  {prescribingProfession && (
                    <div className="mt-4">
                      <SoapNotesPanel
                        recordKey={`appt:${appt.id}`}
                        defaultOpen={false}
                        context={() => ({
                          country: rxCountry,
                          patientContext: {
                            firstName: appt.client?.split(" ")[0] || undefined,
                          },
                          caseNotes: appt.notes || undefined,
                          presenting: appt.notes || undefined,
                        })}
                      />
                    </div>
                  )}
                </>

              </SectionCard>
            )}

            {/* Task 2 — summary for the client */}
            {showPostSession && (
              <SectionCard
                id="care-plan"
                number={2}
                eyebrow="After the session"
                title={`Shared summary for ${clientLabel}`}
                description={`Add a session recap, next steps, or resources. ${clientLabel} sees this in their Health Passport once you send it.`}
                openOverride={openStep === "care-plan"}
                onToggle={() => toggleStep("care-plan")}
                done={isPublished || !!acks.summary}
                checkBadge={isPublished || !!acks.summary}
                locked={step2Locked || formLocked}
                lockedNote={
                  formLocked
                    ? editWindowExpired
                      ? "Locked — the 24-hour edit window has closed"
                      : "Read-only — reopen editing to make changes"
                    : "Finish step 1 first"
                }
                pillLabel={
                  acks.summary && !isPublished ? "Complete · Nothing shared" : followUpStatus
                }
                requirementLabel={rxShown ? "Decision required before prescribing" : undefined}
              >
                <>
                  <ApptNotesBlock
                    appt={appt}
                    onChange={onChange}
                    variant="followup"
                    clientName={appt.client}
                    providerName={providerDisplayName}
                    sessionDateLabel={
                      [appt.month, appt.date].filter(Boolean).join(" ") || undefined
                    }
                    prescriptionContext={
                      !rxAllowed
                        ? "none"
                        : rxLifecycle.issued
                          ? "issued"
                          : rxLifecycle.skipped
                            ? "none"
                            : "pending"
                    }
                    onPublishConfirmed={setFollowUpPublishConfirmed}
                    onFollowUpSaved={(saved) => {
                      setFollowUpSaved(saved);
                      if (saved) setOpenStep(null);
                    }}
                    onFollowUpShared={() => setOpenStep(null)}
                  />
                  {!isPublished && !acks.summary && (
                    <div className="mt-4 rounded-2xl border border-[#E5DCF5] bg-white px-4 py-3.5">
                      <p className="text-[13px] font-semibold text-[#2C2B4B]">
                        Not sharing a summary this time?
                      </p>
                      <p className="mt-1 text-[13px] leading-snug text-[#5A4A8A]">
                        {clientLabel} will see nothing new in their Health Passport for this
                        appointment. Confirm you have read this before moving on.
                      </p>
                      <label className="mt-2.5 flex cursor-pointer items-start gap-2.5 text-[12.5px] leading-snug text-[#3D2E6B]">
                        <input
                          type="checkbox"
                          checked={summaryAckChecked}
                          onChange={(e) => setSummaryAckChecked(e.target.checked)}
                          className="mt-0.5 h-4 w-4 accent-[#6E4FD3]"
                        />
                        <span>
                          I have decided not to send a written summary to {clientLabel} for this
                          appointment.
                        </span>
                      </label>
                      <button
                        type="button"
                        disabled={!summaryAckChecked}
                        onClick={() => {
                          setAck({ summary: true });
                          setOpenStep(rxAllowed ? "prescriptions" : null);
                        }}
                        className="mt-3 inline-flex h-9 items-center rounded-[10px] bg-[#6E4FD3] px-4 text-[12.5px] font-semibold text-white transition hover:bg-[#5A3EB8] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        Confirm and continue
                      </button>
                    </div>
                  )}
                  {!isPublished && acks.summary && (
                    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-[#E5DCF5] bg-white px-4 py-3">
                      <p className="text-[13px] text-[#5A4A8A]">
                        You decided not to send a written summary for this appointment.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setAck({ summary: false });
                          setSummaryAckChecked(false);
                        }}
                        className="ml-auto inline-flex h-8 items-center rounded-[10px] border border-[#D6CCEC] bg-white px-3 text-[12px] font-semibold text-[#3D2E6B] hover:bg-[#F7F4FB]"
                      >
                        Undo
                      </button>
                    </div>
                  )}
                </>
              </SectionCard>
            )}

            {/* Task 3 — prescription. Always available so a provider can record
                that no prescription is needed, even when prescribing is closed. */}
            {rxShown && (
              <SectionCard
                id="prescriptions"
                number={3}
                eyebrow={rxHeaderEyebrow}
                title="Prescription"
                description="A separate step from your clinical notes, available only to verified prescribers. Add medication only if clinically indicated, or record that none is needed."
                openOverride={openStep === "prescriptions"}
                onToggle={() => toggleStep("prescriptions")}
                locked={rxLocked || formLocked}
                dimmed={!clinicalDocForRx || !!activeBlock}
                lockedNote={
                  formLocked
                    ? editWindowExpired
                      ? "Locked — the 24-hour edit window has closed"
                      : "Read-only — reopen editing to make changes"
                    : !clinicalDocForRx
                      ? "Prescribing unlocks once step 1 is complete"
                      : undefined
                }
                done={activeBlock ? false : rxDone}
                checkBadge={activeBlock ? false : rxDone}
                pillLabel={activeBlock ? "Not applicable" : rxStatus}
              >
                <AiPrescription
                  appointmentId={appt.id}
                  clientName={appt.client}
                  providerName={providerDisplayName}
                  appointmentLabel={appointmentLabel}
                  jurisdiction={rxCountry}
                  clinicalDocumentationReady={clinicalDocForRx}
                  encounterBlock={activeBlock}
                  onAddClinicalInfo={() => setOpenStep("session-notes")}
                />
              </SectionCard>
            )}

            {/* Close out — only once every step above has been handled */}
            {showPostSession && (
              <section className="rounded-[20px] border border-[#EAE2F6] bg-white px-5 py-5">
                {isCompleted ? (
                  <>
                    <p className="flex items-center gap-2 text-[13.5px] font-semibold text-[#3D2E6B]">
                      <Check className="h-4 w-4 text-[#6E4FD3]" /> This appointment is closed as{" "}
                      {(
                        outcomes.find((o) => o.value === recordedOutcome)?.label ?? "Completed"
                      ).toLowerCase()}
                      .
                    </p>
                    <p className="mt-1 text-[13px] leading-snug text-[#7E6BAF]">
                      Your appointments list has been updated with the new status and details.
                    </p>
                    {recordedOutcome !== "provider_no_show" && (
                      <div className="mt-3.5">
                        <ApptPayoutStatus
                          status={
                            appt.payoutStatus === "approved" || appt.payoutStatus === "paid"
                              ? appt.payoutStatus
                              : "pending_review"
                          }
                        />
                      </div>
                    )}
                  </>
                ) : canCloseOut ? (
                  <>
                    <p className="text-[15px] font-semibold text-[#2C2B4B]">
                      Everything is handled
                    </p>
                    <p className="mt-1 text-[13px] leading-snug text-[#7E6BAF]">
                      You have gone through your notes, the client summary
                      {rxAllowed ? " and the prescription step" : ""}. Record what happened with
                      this appointment to close it.
                    </p>
                    <div className="mt-4 space-y-2">
                      {outcomes.map((o) => (
                        <label
                          key={o.value}
                          className={`flex cursor-pointer items-start gap-3 rounded-[14px] border px-3.5 py-3 transition ${
                            outcomeChoice === o.value
                              ? "border-[#6E4FD3] bg-[#F7F3FF]"
                              : "border-[#EAE2F6] bg-white hover:bg-[#FBF9FF]"
                          }`}
                        >
                          <input
                            type="radio"
                            name="appointment-outcome"
                            value={o.value}
                            checked={outcomeChoice === o.value}
                            onChange={() => {
                              setOutcomeChoice(o.value);
                              setOutcomeConflict(null);
                              setDraftWarningFor(null);
                              // Confirm what this outcome does before anything is
                              // recorded; the modal carries the exact copy.
                              setOutcomeNoticeOpen(true);
                            }}
                            className="mt-0.5 h-4 w-4 accent-[#6E4FD3]"
                          />
                          <span className="min-w-0">
                            <span className="block text-[13.5px] font-semibold text-[#2C2B4B]">
                              {o.label}
                            </span>
                            <span className="mt-0.5 block text-[12.5px] leading-snug text-[#7E6BAF]">
                              {o.consequence}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                    {outcomeConflict && (
                      <div className="mt-3 rounded-[14px] border border-[#E9C3C3] bg-[#FDF4F4] px-3.5 py-3">
                        <p className="text-[13px] font-semibold text-[#9B4A4A]">
                          You cannot record this outcome yet — a signed prescription exists
                        </p>
                        <p className="mt-1 text-[12.5px] leading-snug text-[#5C3B3B]">
                          {outcomeConflict}
                        </p>
                      </div>
                    )}
                    {draftWarningFor && (
                      <div className="mt-3 rounded-[14px] border border-[#EBD3A6] bg-[#FDF8EE] px-3.5 py-3">
                        <p className="text-[13px] font-semibold text-[#8A6420]">
                          This will void the prescription created for this appointment
                        </p>
                        <p className="mt-1 text-[12.5px] leading-snug text-[#6B5327]">
                          {UNSIGNED_DRAFT_WARNING} Choose &ldquo;Close this appointment&rdquo; again
                          to confirm.
                        </p>
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={!outcomeChoice}
                      onClick={() => {
                        if (!outcomeChoice) return;
                        const blocksRx = !!encounterPrescribingBlock(outcomeChoice);
                        if (blocksRx && rxRecordState.signed) {
                          setDraftWarningFor(null);
                          setOutcomeConflict(SIGNED_RX_CONFLICT);
                          return;
                        }
                        if (
                          blocksRx &&
                          rxRecordState.unsignedDraft &&
                          draftWarningFor !== outcomeChoice
                        ) {
                          setOutcomeConflict(null);
                          setDraftWarningFor(outcomeChoice);
                          return;
                        }
                        setOutcomeConflict(null);
                        setDraftWarningFor(null);
                        const label =
                          outcomes.find((o) => o.value === outcomeChoice)?.label ?? "Completed";
                        onChange({
                          status: outcomeChoice === "cancelled" ? "cancelled" : "completed",
                          outcome: outcomeChoice,
                          closedAt: Date.now(),
                        });
                        toast.success(`Appointment closed as ${label.toLowerCase()}`);
                      }}
                      className="mt-3.5 inline-flex h-10 items-center rounded-[10px] bg-[#6E4FD3] px-4 text-[13px] font-semibold text-white transition hover:bg-[#5A3EB8] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Close this appointment
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-[15px] font-semibold text-[#2C2B4B]">
                      A few steps left before you can close this appointment
                    </p>
                    <p className="mt-1 text-[13px] leading-snug text-[#7E6BAF]">
                      The timeline at the top of this page shows what is still open.
                    </p>
                  </>
                )}
              </section>
            )}
          </div>
        </div>
      </div>

      {/* Confirm the appointment outcome */}
      <Dialog open={editConsentOpen} onOpenChange={setEditConsentOpen}>
        <DialogContent className="max-w-[560px] p-0 sm:max-w-[560px]">
          <div className="px-7 py-6">
            <DialogHeader className="space-y-2.5 text-left">
              <DialogTitle className="text-[21px] font-semibold text-[#2C2B4B]">
                Reopen this post-appointment form for editing?
              </DialogTitle>
              <DialogDescription className="text-[15px] leading-relaxed text-[#5A4A8A]">
                This appointment is already closed. Any change you make now is recorded as an
                amendment to the clinical record, and {clientLabel} may see an updated summary.
                Editing is only possible for 24 hours after the appointment was closed
                {editWindowLabel ? ` — until ${editWindowLabel}` : ""}. After that this form can no
                longer be modified.
              </DialogDescription>
            </DialogHeader>
            <label className="mt-5 flex cursor-pointer items-start gap-2.5 rounded-[14px] border border-[#E5DCF5] bg-[#FBF9FF] px-4 py-3 text-[14px] leading-snug text-[#3D2E6B]">
              <input
                type="checkbox"
                checked={editConsentChecked}
                onChange={(e) => setEditConsentChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#6E4FD3]"
              />
              <span>
                I understand this edit will be made to a completed appointment and recorded on the
                clinical record.
              </span>
            </label>
            <div className="mt-6 flex flex-wrap justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditConsentOpen(false)}
                className="inline-flex h-11 items-center rounded-[10px] border border-[#EAE2F6] bg-white px-5 text-[15px] font-semibold text-[#3D2E6B] hover:bg-[#F7F3FF]"
              >
                Go back
              </button>
              <button
                type="button"
                disabled={!editConsentChecked}
                onClick={() => {
                  setEditUnlocked(true);
                  setEditConsentOpen(false);
                  toast.success("Editing reopened for this appointment");
                }}
                className="inline-flex h-11 items-center rounded-[10px] bg-[#6E4FD3] px-5 text-[15px] font-semibold text-white transition hover:bg-[#5A3EB8] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Agree and edit
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={outcomeNoticeOpen && !!noticeCopy} onOpenChange={setOutcomeNoticeOpen}>
        <DialogContent className="max-w-[680px] overflow-hidden p-0 sm:max-w-[680px]">
          <div className="border-b border-[#EFE7FA] bg-[#F7F3FF] px-7 py-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[13px] font-bold uppercase tracking-wider text-[#6E4FD3]">
              {noticeSignedConflict && <Ban className="h-4.5 w-4.5" />}
              {noticeSignedConflict ? SIGNED_RX_MODAL.eyebrow : noticeCopy?.eyebrow}
            </span>
            <DialogHeader className="mt-4 space-y-2.5 text-left">
              <DialogTitle className="text-[24px] font-bold leading-tight text-[#2C2B4B]">
                {noticeSignedConflict ? SIGNED_RX_MODAL.title : noticeCopy?.title}
              </DialogTitle>
              <DialogDescription className="text-[16.5px] leading-relaxed text-[#6E5C99]">
                {noticeSignedConflict
                  ? SIGNED_RX_MODAL.description
                  : noticeCopy?.primaryDescription}
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="px-7 py-6">
            {!noticeSignedConflict && (
              <p className="text-[16px] leading-relaxed text-[#6E5C99]">
                {noticeCopy?.secondaryDescription}
              </p>
            )}
            {noticeDraftWarning && (
              <p className="mt-4 rounded-[14px] border border-[#EBD3A6] bg-[#FDF8EE] px-4.5 py-4 text-[15.5px] leading-relaxed text-[#6B5327]">
                {UNSIGNED_DRAFT_WARNING}
              </p>
            )}
            {noticeOutcome === "completed" &&
              (rxRecordState.signed || rxRecordState.unsignedDraft) && (
                <p className="mt-4 rounded-[14px] border border-[#DCCFF5] bg-[#F7F3FF] px-4.5 py-4 text-[15.5px] leading-relaxed text-[#4A3A7A]">
                  {RX_COMPLETED_RELEASE_NOTE}
                </p>
              )}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setOutcomeChoice(recordedOutcome ?? null);
                  setOutcomeConflict(null);
                  setDraftWarningFor(null);
                  setOutcomeNoticeOpen(false);
                }}
                className="inline-flex h-12 items-center rounded-[12px] border border-[#EAE2F6] bg-white px-5 text-[16px] font-semibold text-[#3D2E6B] transition hover:bg-[#F7F3FF]"
              >
                {noticeSignedConflict
                  ? SIGNED_RX_MODAL.secondaryButton
                  : noticeCopy?.secondaryButton}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (noticeSignedConflict) {
                    setOutcomeChoice(recordedOutcome ?? null);
                    setOutcomeNoticeOpen(false);
                    setOpenStep("prescriptions");
                    return;
                  }
                  setOutcomeNoticeOpen(false);
                }}
                className="inline-flex h-12 items-center rounded-[12px] bg-[#6E4FD3] px-6 text-[16px] font-semibold text-white transition hover:bg-[#5A3EB8]"
              >
                {noticeSignedConflict ? SIGNED_RX_MODAL.primaryButton : noticeCopy?.primaryButton}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {import.meta.env.DEV && appt?.id && (
        <DevPatientDataToggle
          appointmentId={appt.id}
          appointmentLabel={`${appt.type ?? "Session"} · ${appt.day ?? ""} ${appt.date ?? ""} ${appt.month ?? ""}`}
        />
      )}
    </div>
  );
}

function FactTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-[#FBF9FF]/60 px-3.5 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">{label}</p>
      <p className="mt-1 truncate text-[13px] font-semibold text-[#2C2B4B]">{value}</p>
      {sub && <p className="truncate text-[11px] text-[#7E6BAF]">{sub}</p>}
    </div>
  );
}

const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  sept: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

function parseApptStart(appt: StoredAppt | null): Date | null {
  if (!appt?.month || !appt?.date) return null;
  const m = MONTHS[appt.month.slice(0, 3).toLowerCase()];
  const day = parseInt(appt.date, 10);
  if (m == null || Number.isNaN(day)) return null;
  const year = new Date().getFullYear();
  let hours = 0;
  let minutes = 0;
  if (appt.time) {
    const match = appt.time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (match) {
      hours = parseInt(match[1], 10);
      minutes = parseInt(match[2], 10);
      const mer = match[3]?.toUpperCase();
      if (mer === "PM" && hours < 12) hours += 12;
      if (mer === "AM" && hours === 12) hours = 0;
    }
  }
  return new Date(year, m, day, hours, minutes);
}
