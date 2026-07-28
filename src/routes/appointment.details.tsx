import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { ArrowLeft, CalendarClock, ChevronDown } from "lucide-react";
import {
  ApptNotesBlock,
  type ApptLite,
} from "@/components/profile/ProviderSections";
import { publishAppointmentEvent } from "@/lib/appointments-bus";
import { ProviderVisitWorkspace } from "@/components/appointment/ProviderVisitWorkspace";
import { AiProviderBrief } from "@/components/appointment/AiProviderBrief";
import { AiPrescription } from "@/components/appointment/AiPrescription";
import { getProviderProfession, isPrescriber } from "@/lib/prescription/store";

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
  children,
}: {
  id?: string;
  number?: number;
  eyebrow?: string;
  title: string;
  description?: string;
  defaultOpen?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section
      id={id}
      className="overflow-hidden rounded-[20px] border border-[#EAE2F6] bg-white"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-4 px-5 py-4 text-left transition-colors"
      >
        {number != null && (
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EFE8FB] text-[13px] font-semibold text-[#3D2E6B]">
            {number}
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
        <ChevronDown
          className={`mt-1 h-5 w-5 shrink-0 text-[#A89BD0] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="border-t border-[#F1EAFB] bg-[#FBF9FF] px-4 py-5 md:px-6">
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

  useEffect(() => {
    setCanPrescribe(isPrescriber(getProviderProfession()));
  }, []);

  useEffect(() => {
    if (!id) {
      setMissing(true);
      return;
    }
    try {
      const raw = window.localStorage.getItem(`lubin:appt-details:${id}`);
      if (raw) {
        setAppt(JSON.parse(raw) as StoredAppt);
        return;
      }
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

  const statusStyle: Record<ApptLite["status"], string> = {
    upcoming: "bg-[#EFE8FB] text-[#3D2E6B]",
    completed: "bg-[#3D2E6B] text-white",
    cancelled: "border border-[#EAE2F6] text-[#7E6BAF]",
  };

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
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${statusStyle[appt.status]}`}
                >
                  {appt.status === "completed"
                    ? "Session completed"
                    : appt.status === "upcoming"
                      ? "Appointment confirmed"
                      : "Cancelled"}
                </span>
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
            <span className="font-semibold text-[#3D2E6B]">A note · </span>
            Anything you write here will be published to your client's Health
            Passport once you mark this appointment as completed, so please
            double-check the details. Each section is optional — if you have
            nothing to add, you can leave it blank or write "None". The
            appointment is only tagged as done after you mark it as completed.
          </div>
        )}

        {/* Before the session */}
        <SectionCard
          id="before-session"
          number={1}
          eyebrow="Before the session"
          title="Client context & AI brief"
          description="A quick, AI-summarised view of what your client shared from their Health Passport."
          defaultOpen={!isCompleted}
          hint="Optional — use this to prepare before you meet."
        >
          <AiProviderBrief
            appointmentId={appt.id}
            providerName={appt.client}
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

        {/* During the session */}
        <SectionCard
          id="session-notes"
          number={2}
          eyebrow="During the session"
          title="Notes, follow-up & private observations"
          description="Capture what came up in the room, share resources, and keep private clinical notes."
          defaultOpen={isCompleted && !hasNotes}
          hint={
            hasNotes
              ? undefined
              : "Optional — leave blank or write \"None\" if there's nothing to add."
          }
        >
          <ApptNotesBlock appt={appt} onChange={onChange} />
        </SectionCard>

        {/* After the session */}
        {showPostSession && (
          <SectionCard
            id="care-plan"
            number={3}
            eyebrow="After the session"
            title="Care plan & patient-facing summary"
            description="Walk through each step, then publish a warm summary into your client's Health Passport."
            defaultOpen={false}
            hint="Optional — anything you publish here goes to the client's Health Passport."
          >
            <ProviderVisitWorkspace
              appointmentId={appt.id}
              providerName={appt.client}
              appointmentLabel={appointmentLabel}
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
              providerName={undefined}
              appointmentLabel={appointmentLabel}
            />
          </SectionCard>
        )}

        {/* Mark as completed */}
        {canMarkComplete && (
          <section className="rounded-[20px] border border-[#EAE2F6] bg-white p-5 md:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#A89BD0]">
              Close out
            </p>
            <h2 className="mt-1 text-[15px] font-semibold text-[#2C2B4B]">
              Mark this appointment as completed
            </h2>
            <p className="mt-1 text-[13px] leading-snug text-[#7E6BAF]">
              Anything you added in the sections above will be shared with your
              client. If you left sections blank, that just means you didn't
              add extra information — the appointment can still be marked as
              completed without any issues.
            </p>
            <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-[12px] border border-[#EAE2F6] bg-[#FBF9FF] px-4 py-3 text-[13px] leading-snug text-[#3D2E6B]">
              <input
                type="checkbox"
                checked={confirmComplete}
                onChange={(e) => setConfirmComplete(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[#D6CCEC] text-[#7E6BAF] focus:ring-[#7E6BAF]"
              />
              <span>
                I confirm the details above are accurate and this appointment
                took place without any issues.
              </span>
            </label>
            <button
              type="button"
              disabled={!confirmComplete}
              onClick={markCompleted}
              className="mt-4 w-full rounded-[12px] bg-[#3D2E6B] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2C2B4B] disabled:cursor-not-allowed disabled:bg-[#C9BEE4]"
            >
              Mark appointment as completed
            </button>
          </section>
        )}

        {isCompleted && (
          <div className="rounded-2xl border border-[#EAE2F6] bg-white/70 px-5 py-4 text-[13px] text-[#5A4A8A]">
            <span className="font-semibold text-[#3D2E6B]">Completed · </span>
            This appointment has been marked as done and any published summary
            is now visible to your client in their Health Passport.
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