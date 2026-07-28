import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { ArrowLeft, CalendarClock, ChevronDown } from "lucide-react";
import {
  ApptNotesBlock,
  type ApptLite,
} from "@/components/profile/ProviderSections";
import { publishAppointmentEvent } from "@/lib/appointments-bus";
import { AiProviderBrief } from "@/components/appointment/AiProviderBrief";
import { AiSessionSummary } from "@/components/appointment/AiSessionSummary";
import { AiPrescription } from "@/components/appointment/AiPrescription";
import { isVerifiedPrescriber } from "@/lib/prescription/store";

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
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  // Visual state: done > active (open) > todo. `reference` is a neutral read-only tone.
  const state: "done" | "active" | "todo" | "reference" = reference
    ? "reference"
    : done
      ? "done"
      : open
        ? "active"
        : "todo";

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
    <section
      id={id}
      className={`overflow-hidden rounded-[20px] border transition-all ${shell}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
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
            {state === "done" ? "✓" : number}
          </span>
        )}
        <span className="min-w-0 flex-1">
          {eyebrow && (
            <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#A89BD0]">
              {eyebrow}
            </span>
          )}
          <span className="mt-0.5 block text-[15px] font-semibold text-[#2C2B4B]">
            {title}
          </span>
          {description && (
            <span className="mt-1 block text-[13px] leading-snug text-[#7E6BAF]">
              {description}
            </span>
          )}
          {hint && (
            <span className="mt-1.5 block text-[12px] italic text-[#A89BD0]">
              {hint}
            </span>
          )}
        </span>
        <span className="mt-0.5 hidden shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] sm:inline-flex"
          style={{
            backgroundColor:
              state === "done"
                ? "#E7DAF8"
                : state === "active"
                  ? "#3D2E6B"
                  : state === "reference"
                    ? "#F1EAFB"
                    : "#F5F0FB",
            color:
              state === "done"
                ? "#3D2E6B"
                : state === "active"
                  ? "#FFFFFF"
                  : "#7E6BAF",
          }}
        >
          {state === "done"
            ? "Done"
            : state === "active"
              ? "In progress"
              : state === "reference"
                ? "Reference"
                : "To do"}
        </span>
        <ChevronDown
          className={`mt-1 h-5 w-5 shrink-0 text-[#A89BD0] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className={`border-t px-4 py-5 md:px-6 ${state === "done" ? "border-[#E4D5F5] bg-white" : "border-[#F1EAFB] bg-[#FBF9FF]"}`}>
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
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [providerDisplayName, setProviderDisplayName] = useState<string | undefined>(undefined);

  useEffect(() => {
    setCanPrescribe(isVerifiedPrescriber());
    try {
      const raw = window.localStorage.getItem("lubin.providerProfile.v1");
      if (raw) {
        const parsed = JSON.parse(raw) as { name?: string; displayName?: string };
        setProviderDisplayName(parsed.displayName || parsed.name || undefined);
      }
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    if (!id) {
      setMissing(true);
      return;
    }
    try {
      // Prefer the fresh URL payload so seed changes (like new attachments)
      // don't get shadowed by a stale localStorage cache.
      if (d) {
        const decoded = decodeURIComponent(escape(atob(d)));
        const parsed = JSON.parse(decoded) as StoredAppt;
        setAppt(parsed);
        try {
          window.localStorage.setItem(
            `lubin:appt-details:${id}`,
            JSON.stringify(parsed),
          );
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
    () =>
      [appt?.month, appt?.date, appt?.time ? "·" : "", appt?.time]
        .filter(Boolean)
        .join(" "),
    [appt?.month, appt?.date, appt?.time],
  );

  const isCompleted = appt?.status === "completed";
  const isCancelled = appt?.status === "cancelled";
  const hasNotes = !!(appt?.notes && appt.notes.trim().length > 0);
  const hasDocs = !!(
    (appt?.notes && appt.notes.trim().length > 0) ||
    appt?.aiSummary
  );
  const isPublished = !!appt?.publishedFollowUp;

  // Parse appointment start time. Month/date/time come as strings like
  // "Jun", "19", "2:00 PM". If parsing fails we fall back to "not past".
  const apptStart = useMemo(() => parseApptStart(appt), [appt]);
  const isPastStart = !!apptStart && apptStart.getTime() <= Date.now();
  const showPostSession = isCompleted || (isPastStart && !isCancelled);
  const canMarkComplete = !isCompleted && !isCancelled && isPastStart;

  const markCompleted = () => {
    if (!appt) return;
    onChange({ status: "completed" });
  };

  if (missing) {
    return (
      <div className="min-h-screen bg-[#FBF9FF]">
        <div className="mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center">
          <CalendarClock className="h-8 w-8 text-[#A89BD0]" />
          <h1 className="mt-4 text-xl font-bold text-[#3D2E6B]">
            Session not found
          </h1>
          <p className="mt-2 text-sm text-[#7E6BAF]">
            This session may have been cleared from this browser. Open it again
            from your bookings list.
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
    : isCompleted
      ? "Completed"
      : isPastStart
        ? "In progress"
        : "Confirmed";
  const documentationLabel = isCancelled
    ? "Not applicable"
    : hasDocs
      ? "In progress"
      : "Not started";
  const followupLabel = isCancelled
    ? "Not applicable"
    : isPublished
      ? "Published"
      : "Not published";

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#F5EFFB] via-[#FBF9FF] to-[#FBF9FF] px-4 py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        {/* Back link */}
        <Link
          to="/profile"
          search={{ tab: "appointments" }}
          className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#7E6BAF] hover:text-[#3D2E6B]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Appointments
        </Link>

        {/* Hero — session at a glance */}
        <section className="relative overflow-hidden rounded-[24px] border border-[#EAE2F6] bg-white p-6 shadow-[0_10px_40px_-24px_rgba(61,46,107,0.35)] md:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#EFE8FB] blur-3xl" />
          <div className="relative flex flex-col gap-6">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A89BD0]">
                  Session workspace
                </p>
                <h1 className="mt-1 truncate text-2xl font-semibold leading-tight text-[#2C2B4B] sm:text-[26px]">
                  Session with {appt.client ?? "your client"}
                </h1>
                <p className="mt-1 text-[13px] text-[#7E6BAF]">
                  Reference · #{appt.id.toString().toUpperCase()}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:items-end">
                <StatusPill label="Session" value={sessionStatusLabel} tone={isCompleted ? "done" : isCancelled ? "muted" : "active"} />
                <StatusPill label="Documentation" value={documentationLabel} tone={hasDocs ? "active" : "muted"} />
                <StatusPill label="Client follow-up" value={followupLabel} tone={isPublished ? "done" : "muted"} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <FactTile label="Client" value={appt.client ?? "—"} />
              <FactTile
                label="When"
                value={[appt.month, appt.date].filter(Boolean).join(" ") || "—"}
                sub={appt.time}
              />
              <FactTile
                label="Format"
                value={
                  [appt.duration, appt.type].filter(Boolean).join(" · ") || "—"
                }
                sub={[appt.sessionFormat, appt.mode]
                  .filter(Boolean)
                  .join(" · ")}
              />
              <FactTile
                label="Payment"
                value={appt.amount ?? "—"}
                sub={appt.paymentStatus}
              />
            </div>
          </div>
        </section>

        {/* Workflow guidance */}
        {!isCancelled && (
          <div className="rounded-2xl border border-[#EAE2F6] bg-white/70 px-5 py-4 text-[13px] leading-relaxed text-[#5A4A8A]">
            Complete your clinical notes and prepare an optional follow-up for {clientLabel}.
            Only information you explicitly publish in the final step is shared with
            your client. Private clinician notes are never shared.
          </div>
        )}

        {/* Before the session */}
        <SectionCard
          id="before-session"
          number={1}
          eyebrow="Before the session"
          title="Shared Health Passport & AI Provider Brief"
          description="Review what your client chose to share, then optionally generate an AI Provider Brief."
          defaultOpen={!isCompleted}
          hint="Reference only. Nothing here is shared back to your client."
          reference
        >
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
        </SectionCard>

        {/* During the session — one AI draft + clinical documentation + private notes */}
        <SectionCard
          id="session-notes"
          number={2}
          eyebrow="During the session"
          title="AI recording draft, clinical documentation & private notes"
          description="Optionally generate an AI draft from the recording, capture your clinical documentation and plan, and keep private notes."
          defaultOpen={showPostSession && !hasDocs}
          done={hasDocs}
          hint={
            hasDocs
              ? undefined
              : "Optional. Nothing in this section is shared with your client."
          }
        >
          <div className="space-y-5">
            <AiSessionSummary
              appointmentId={appt.id}
              clientName={appt.client}
              aiSummary={appt.aiSummary}
              recordingConsent={appt.recordingConsent}
              onChange={(patch) => onChange(patch as Partial<ApptLite>)}
            />
            <ApptNotesBlock
              appt={appt}
              onChange={onChange}
              variant="private"
              clientName={appt.client}
              providerName={providerDisplayName}
            />
          </div>
        </SectionCard>

        {/* After the session */}
        {showPostSession && (
          <SectionCard
            id="care-plan"
            number={3}
            eyebrow="After the session"
            title={`Client recap & publish to ${clientLabel}'s Health Passport`}
            description="Write the client-facing recap, action items, resources, and any attachments — then preview and publish."
            defaultOpen={!isPublished}
            done={isPublished}
            hint="Nothing is shared until you press Publish."
          >
            <ApptNotesBlock
              appt={appt}
              onChange={onChange}
              variant="followup"
              clientName={appt.client}
              providerName={providerDisplayName}
            />
          </SectionCard>
        )}

        {/* Prescriptions — only for prescribers */}
        {canPrescribe && showPostSession && (
          <SectionCard
            id="prescriptions"
            number={4}
            eyebrow="Prescriber tools"
            title="Medication plan"
            description="AI-drafted prescription with per-medication clinician approval. Nothing is sent until you finalise."
            hint="Optional — only fill this in if you're prescribing today."
          >
            <AiPrescription
              appointmentId={appt.id}
              clientName={appt.client}
              providerName={providerDisplayName}
              appointmentLabel={appointmentLabel}
            />
          </SectionCard>
        )}

        {/* Mark as completed */}
        {canMarkComplete && (
          <section className="rounded-[20px] border border-[#EAE2F6] bg-white p-5 md:p-6">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EFE8FB] text-[13px] font-semibold text-[#3D2E6B]">
                5
              </span>
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#A89BD0]">
                  Final step
                </p>
                <h2 className="mt-1 text-[15px] font-semibold text-[#2C2B4B]">
                  Confirm this appointment is complete
                </h2>
              </div>
            </div>
            <p className="mt-3 text-[13px] leading-snug text-[#7E6BAF]">
              When this appointment has finished, check the box below and click
              the button. Any notes or summaries you published above will be sent
              to your client. Leaving sections blank is fine — it just means you
              did not add anything extra this time.
            </p>
            <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-[12px] border border-[#EAE2F6] bg-[#FBF9FF] px-4 py-3 text-[13px] leading-snug text-[#3D2E6B]">
              <input
                type="checkbox"
                checked={confirmComplete}
                onChange={(e) => setConfirmComplete(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[#D6CCEC] text-[#7E6BAF] focus:ring-[#7E6BAF]"
              />
              <span>
                I confirm this appointment took place and the information above
                is accurate. If I left sections blank, I did not add extra
                information, and this appointment can still be marked as done.
              </span>
            </label>
            <button
              type="button"
              disabled={!confirmComplete}
              onClick={markCompleted}
              className="mt-4 w-full rounded-[12px] bg-[#3D2E6B] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2C2B4B] disabled:cursor-not-allowed disabled:bg-[#C9BEE4]"
            >
              Yes, mark appointment as completed
            </button>
          </section>
        )}

        {isCompleted && (
          <div className="rounded-2xl border border-[#EAE2F6] bg-white/70 px-5 py-4 text-[13px] text-[#5A4A8A]">
            <span className="font-semibold text-[#3D2E6B]">Completed · </span>
            {isPublished
              ? `Your recap has been published to ${clientLabel}'s Health Passport${appt.publishedFollowUp?.by ? ` by ${appt.publishedFollowUp.by}` : ""} on ${new Date(appt.publishedFollowUp!.at).toLocaleString()}.`
              : `This appointment has been marked as done. Nothing has been published to ${clientLabel}'s Health Passport yet — publish from Step 3 when you're ready.`}
          </div>
        )}

        <div className="pt-2 text-center">
          <button
            onClick={() => window.close()}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7E6BAF] hover:text-[#3D2E6B]"
          >
            Close this tab
          </button>
        </div>
      </div>
    </div>
  );
}

function FactTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl bg-[#FBF9FF]/60 px-3.5 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">
        {label}
      </p>
      <p className="mt-1 truncate text-[13px] font-semibold text-[#2C2B4B]">
        {value}
      </p>
      {sub && (
        <p className="truncate text-[11px] text-[#7E6BAF]">{sub}</p>
      )}
    </div>
  );
}

function StatusPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "done" | "active" | "muted";
}) {
  const shell =
    tone === "done"
      ? "bg-[#3D2E6B] text-white"
      : tone === "active"
        ? "bg-[#EFE8FB] text-[#3D2E6B]"
        : "border border-[#EAE2F6] bg-white text-[#7E6BAF]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${shell}`}
    >
      <span className="opacity-70">{label}</span>
      <span className="opacity-30">·</span>
      <span>{value}</span>
    </span>
  );
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
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