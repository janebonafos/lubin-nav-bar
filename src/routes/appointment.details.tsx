import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { ArrowLeft, CalendarClock, ChevronDown } from "lucide-react";
import {
  ApptNotesBlock,
  ApptPayoutStatus,
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
  eyebrow,
  title,
  description,
  defaultOpen = false,
  status,
  children,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  defaultOpen?: boolean;
  status?: { label: string; tone: "done" | "pending" | "info" };
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  // Brand-only tones. "done" = filled deep purple; "pending" = light lavender
  // fill with brand purple text; "info" = subtle outline.
  const toneClass =
    status?.tone === "done"
      ? "bg-[#3D2E6B] text-white"
      : status?.tone === "pending"
        ? "bg-[#EFE8FB] text-[#3D2E6B]"
        : "border border-[#EAE2F6] text-[#7E6BAF]";

  return (
    <section
      id={id}
      className="overflow-hidden rounded-[20px] border border-[#EAE2F6] bg-white"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-[#FBF8FF]"
      >
        <span className="min-w-0 flex-1">
          {eyebrow && (
            <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#A89BD0]">
              {eyebrow}
            </span>
          )}
          <span className="mt-0.5 flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold text-[#2C2B4B]">{title}</span>
            {status && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${toneClass}`}
              >
                {status.label}
              </span>
            )}
          </span>
          {description && (
            <span className="mt-1 block text-[13px] leading-snug text-[#7E6BAF]">
              {description}
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
  const hasNotes = !!(appt?.notes && appt.notes.trim().length > 0);

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
    upcoming: "bg-[#E0D9F7] text-[#3D2E6B]",
    completed: "bg-[#E6F8F1] text-[#2D8E69]",
    cancelled: "bg-rose-100 text-rose-700",
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#F5EFFB] via-[#FBF9FF] to-[#FBF9FF] px-4 py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        {/* Back link */}
        <Link
          to="/profile"
          className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#7E6BAF] hover:text-[#3D2E6B]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to sessions
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
                    ? "Session complete"
                    : appt.status === "upcoming"
                      ? "Upcoming"
                      : "Cancelled"}
                </span>
                {appt.amount && (
                  <span className="rounded-full bg-[#3D2E6B] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                    {appt.amount} payout
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <FactTile
                icon={<CircleUserRound className="h-4 w-4" />}
                label="Client"
                value={appt.client ?? "—"}
              />
              <FactTile
                icon={<CalendarClock className="h-4 w-4" />}
                label="When"
                value={
                  [appt.month, appt.date].filter(Boolean).join(" ") || "—"
                }
                sub={appt.time}
              />
              <FactTile
                icon={<Clock3 className="h-4 w-4" />}
                label="Format"
                value={
                  [appt.duration, appt.type].filter(Boolean).join(" · ") || "—"
                }
                sub={[appt.sessionFormat, appt.mode]
                  .filter(Boolean)
                  .join(" · ")}
              />
              <FactTile
                icon={<Wallet className="h-4 w-4" />}
                label="Payment"
                value={appt.amount ?? "—"}
                sub={appt.paymentStatus}
              />
            </div>
          </div>
        </section>

        {/* Workflow guidance */}
        {isCompleted && (
          <div className="rounded-2xl border border-[#EAE2F6] bg-white/70 px-5 py-4 text-[13px] text-[#5A4A8A]">
            <span className="font-semibold text-[#3D2E6B]">Next steps · </span>
            Review what your client shared, document the session, and close the
            loop with a care plan. Each section below opens on tap.
          </div>
        )}

        {/* Before the session */}
        <SectionCard
          id="before-session"
          eyebrow="Before the session"
          title="Client context & AI brief"
          description="A quick, AI-summarised view of what your client shared from their Health Passport."
          icon={<Sparkles className="h-5 w-5" />}
          defaultOpen={!isCompleted}
          status={{ label: "AI-assisted", tone: "info" }}
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
          eyebrow="During the session"
          title="Notes, follow-up & private observations"
          description="Capture what came up in the room, share resources, and keep private clinical notes."
          icon={<NotebookPen className="h-5 w-5" />}
          defaultOpen={isCompleted && !hasNotes}
          status={
            hasNotes
              ? { label: "Notes added", tone: "done" }
              : isCompleted
                ? { label: "Needs notes", tone: "pending" }
                : undefined
          }
        >
          <ApptNotesBlock appt={appt} onChange={onChange} />
        </SectionCard>

        {/* After the session */}
        {(isCompleted || appt.status === "upcoming") && (
          <SectionCard
            id="care-plan"
            eyebrow="After the session"
            title="Care plan & patient-facing summary"
            description="Walk through each step, then publish a warm summary into your client's Health Passport."
            icon={<HeartHandshake className="h-5 w-5" />}
            defaultOpen={false}
            status={
              isCompleted
                ? { label: "Ready to close out", tone: "pending" }
                : undefined
            }
          >
            <ProviderVisitWorkspace
              appointmentId={appt.id}
              providerName={appt.client}
              appointmentLabel={appointmentLabel}
            />
          </SectionCard>
        )}

        {/* Prescriptions — only for prescribers */}
        {canPrescribe && isCompleted && (
          <SectionCard
            id="prescriptions"
            eyebrow="Prescriber tools"
            title="Medication plan"
            description="AI-drafted prescription with per-medication clinician approval. Nothing is sent until you finalise."
            icon={<Pill className="h-5 w-5" />}
            status={{ label: "Approval required", tone: "pending" }}
          >
            <AiPrescription
              appointmentId={appt.id}
              clientName={appt.client}
              providerName={undefined}
              appointmentLabel={appointmentLabel}
            />
          </SectionCard>
        )}

        {/* Payout */}
        {isCompleted && (
          <SectionCard
            id="payout"
            eyebrow="Admin"
            title="Payout status"
            description="Track when this session's earnings will be released."
            icon={<Wallet className="h-5 w-5" />}
            status={
              (appt.payoutStatus ?? "pending_review") === "paid"
                ? { label: "Paid", tone: "done" }
                : (appt.payoutStatus ?? "pending_review") === "approved"
                  ? { label: "Approved", tone: "done" }
                  : { label: "In review", tone: "info" }
            }
          >
            <ApptPayoutStatus status={appt.payoutStatus ?? "pending_review"} />
          </SectionCard>
        )}

        <div className="pt-2 text-center">
          <button
            onClick={() => window.close()}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7E6BAF] hover:text-[#3D2E6B]"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Close this tab
          </button>
        </div>
      </div>
    </div>
  );
}

function FactTile({
  icon,
  label,
  value,
  sub,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#F1EAFB] bg-[#FBF9FF] px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-[#7E6BAF]">
        <span className="grid h-6 w-6 place-items-center rounded-lg bg-white text-[#3D2E6B]">
          {icon}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="mt-1.5 truncate text-[13px] font-semibold text-[#2C2B4B]">
        {value}
      </p>
      {sub && (
        <p className="truncate text-[11px] text-[#7E6BAF]">{sub}</p>
      )}
    </div>
  );
}