import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { ArrowLeft, CalendarClock, Check, ChevronDown } from "lucide-react";
import { ApptNotesBlock, type ApptLite } from "@/components/profile/ProviderSections";
import { publishAppointmentEvent } from "@/lib/appointments-bus";
import { AiProviderBrief } from "@/components/appointment/AiProviderBrief";
import { AiPrescription } from "@/components/appointment/AiPrescription";
import { getAnyProviderGrant, subscribeProviderShares } from "@/lib/share/providerShareStore";
import { isVerifiedPrescriber, serviceSupportsPrescription } from "@/lib/prescription/store";
import { loadPrescription, subscribePrescription } from "@/lib/prescription/store";

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
};

type Outcome = NonNullable<ApptLite["outcome"]>;

const OUTCOMES: {
  value: Outcome;
  label: string;
  consequence: string;
}[] = [
  {
    value: "completed",
    label: "Completed",
    consequence:
      "The appointment is closed as delivered. Anything you share in Step 3 becomes visible in your client's Health Passport, and the payment for this session enters payout review — funds are released after our standard verification.",
  },
  {
    value: "client_no_show",
    label: "Client no-show",
    consequence:
      "Recorded as a no-show by the client. Nothing is shared with your client. The session fee is held for review against your no-show policy before any payout or refund is decided.",
  },
  {
    value: "provider_no_show",
    label: "Provider no-show",
    consequence:
      "Recorded as a no-show on your side. Nothing is shared with your client, no payout is issued for this session, and your client is offered a refund or a free rebooking.",
  },
  {
    value: "cancelled",
    label: "Cancelled",
    consequence:
      "The appointment is closed as cancelled. Nothing is shared with your client and the payment is returned or refunded according to the cancellation window.",
  },
  {
    value: "rescheduled",
    label: "Rescheduled",
    consequence:
      "This slot is closed and the session carries over to the new date. No payout or refund is triggered — the payment stays attached to the rescheduled appointment.",
  },
];

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
  optional = false,
  checkBadge = false,
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
  optional?: boolean;
  checkBadge?: boolean;
  openOverride?: boolean;
  onToggle?: () => void;
  children: ReactNode;
}) {
  const [localOpen, setLocalOpen] = useState(defaultOpen);
  const controlled = openOverride !== undefined;
  const open = controlled ? openOverride : localOpen;
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

  const badge =
    state === "done"
      ? "bg-[#6E4FD3] text-white"
      : state === "active"
        ? "bg-[#3D2E6B] text-white"
        : "bg-[#EFE8FB] text-[#3D2E6B]";

  return (
    <section id={id} className={`overflow-hidden rounded-[20px] border transition-all ${shell}`}>
      <button
        type="button"
        onClick={() => (controlled ? onToggle?.() : setLocalOpen((v) => !v))}
        className="flex w-full items-start gap-4 px-5 py-4 text-left transition-colors"
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
        </span>
        {!(state === "reference" && !pillLabel) && (
          <span className="mt-0.5 hidden shrink-0 items-center gap-1.5 sm:flex">
            {optional && (
              <span className="rounded-full border border-[#E5DCF5] bg-white px-2 py-0.5 text-[11px] font-medium text-[#A89BD0]">
                Optional
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
        )}
        <ChevronDown
          className={`mt-1 h-5 w-5 shrink-0 text-[#A89BD0] transition-transform ${open ? "rotate-180" : ""}`}
        />
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
  const [followUpPublishConfirmed, setFollowUpPublishConfirmed] = useState(false);
  const [privateNotesSaved, setPrivateNotesSaved] = useState(false);
  const [followUpSaved, setFollowUpSaved] = useState(false);
  const [sharedRefOpen, setSharedRefOpen] = useState(false);
  const [rxTick, setRxTick] = useState(0);
  useEffect(() => subscribePrescription(() => setRxTick((t) => t + 1)), []);

  useEffect(() => {
    setCanPrescribe(isVerifiedPrescriber());
    try {
      const raw = window.localStorage.getItem("lubin.providerProfile.v1");
      if (raw) {
        const parsed = JSON.parse(raw) as { name?: string; displayName?: string };
        setProviderDisplayName(parsed.displayName || parsed.name || undefined);
      }
    } catch {
      /* noop */
    }
  }, []);

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

  const docStatus = hasNotes ? "Draft saved" : "Not started";

  const rxStatus = useMemo(() => {
    if (!appt?.id) return "Not started";
    const rx = loadPrescription(appt.id);
    if (rx.finalisedAt) return "Signed and issued";
    if (rx.skippedAt && rx.medications.length === 0) return "Skipped";
    if (rx.medications.length > 0 && rx.medications.every((m) => m.approved)) return "Verified";
    if (rx.medications.length > 0 || rx.generatedAt) return "Draft prepared";
    return "Not started";
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
  const showPostSession = isCompleted || (isPastStart && !isCancelled);

  const recordedOutcome = appt?.outcome;
  const rxAllowed =
    canPrescribe && serviceSupportsPrescription(appt?.type, appt?.prescriptionEligible);
  const rxServiceOnly = serviceSupportsPrescription(appt?.type, appt?.prescriptionEligible);

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
        ? (OUTCOMES.find((o) => o.value === recordedOutcome)?.label ?? "Completed")
        : "Completed"
      : showPostSession
        ? "Session ended · Follow-up in progress"
        : "Confirmed";

  const tasks: { key: string; label: string; status: string; optional?: boolean }[] = [
    {
      key: "session-notes",
      label: "Private clinical documentation",
      status: docStatus,
      optional: true,
    },
    {
      key: "care-plan",
      label: `Summary for ${clientLabel}`,
      status: followUpStatus,
      optional: true,
    },
    ...(rxAllowed
      ? [{ key: "prescriptions", label: "Prescription", status: rxStatus, optional: true }]
      : []),
  ];

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

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* Main working area */}
          <div className="flex min-w-0 flex-col gap-4">
            {/* Client-shared reference material — outside the numbered tasks */}
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
                done={privateNotesSaved && hasNotes}
                checkBadge={privateNotesSaved && hasNotes}
                pillLabel={docStatus}
                optional
              >
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
                done={isPublished}
                checkBadge={isPublished}
                pillLabel={followUpStatus}
                optional
              >
                <ApptNotesBlock
                  appt={appt}
                  onChange={onChange}
                  variant="followup"
                  clientName={appt.client}
                  providerName={providerDisplayName}
                  sessionDateLabel={[appt.month, appt.date].filter(Boolean).join(" ") || undefined}
                  onPublishConfirmed={setFollowUpPublishConfirmed}
                  onFollowUpSaved={(saved) => {
                    setFollowUpSaved(saved);
                    if (saved) setOpenStep(null);
                  }}
                  onFollowUpShared={() => setOpenStep(null)}
                />
              </SectionCard>
            )}

            {/* Task 3 — prescription (verified prescribers only) */}
            {rxAllowed && showPostSession && (
              <SectionCard
                id="prescriptions"
                eyebrow="Verified prescribers only"
                title="Prescription"
                description="Add medication only if clinically indicated for this session. Not included in the client summary."
                openOverride={openStep === "prescriptions"}
                onToggle={() => toggleStep("prescriptions")}
                pillLabel={rxStatus}
                optional
              >
                <AiPrescription
                  appointmentId={appt.id}
                  clientName={appt.client}
                  providerName={providerDisplayName}
                  appointmentLabel={appointmentLabel}
                  jurisdiction="PH"
                  onAddClinicalInfo={() => setOpenStep("session-notes")}
                />
              </SectionCard>
            )}

            {!rxAllowed && rxServiceOnly && showPostSession && (
              <div className="rounded-2xl border border-[#EAE2F6] bg-white/70 px-5 py-4 text-[13px] leading-snug text-[#5A4A8A]">
                This service supports medication review, but prescribing tools stay hidden until
                your prescribing authority is verified for your client&rsquo;s jurisdiction.
              </div>
            )}
          </div>

          {/* Right rail — task progress and session details */}
          <aside className="flex flex-col gap-4">
            <div className="rounded-[20px] border border-[#EAE2F6] bg-white p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#A89BD0]">
                Task progress
              </p>
              <ul className="mt-3 space-y-2.5">
                {tasks.map((t, i) => {
                  const complete = ["Shared", "Signed and issued", "Skipped"].includes(t.status);
                  return (
                    <li key={t.key}>
                      <button
                        type="button"
                        onClick={() => setOpenStep(t.key)}
                        className="flex w-full items-start gap-2.5 rounded-[12px] px-1.5 py-1.5 text-left transition hover:bg-[#FBF9FF]"
                      >
                        <span
                          className={`mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full text-[11px] font-semibold ${
                            complete ? "bg-[#6E4FD3] text-white" : "bg-[#EFE8FB] text-[#3D2E6B]"
                          }`}
                        >
                          {complete ? <Check className="h-3.5 w-3.5" /> : i + 1}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[13px] font-semibold text-[#2C2B4B]">
                            {t.label}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-[#7E6BAF]">
                            {t.status}
                            {t.optional ? " · Optional" : ""}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>
        </div>
      </div>
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
