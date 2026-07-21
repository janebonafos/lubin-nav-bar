import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { ArrowLeft, CalendarClock } from "lucide-react";
import {
  ApptNotesBlock,
  ApptPayoutStatus,
  DetailItem,
  type ApptLite,
} from "@/components/profile/ProviderSections";
import { publishAppointmentEvent } from "@/lib/appointments-bus";
import { ProviderVisitWorkspace } from "@/components/appointment/ProviderVisitWorkspace";

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
      { title: "Appointment details — Lubin" },
      { name: "description", content: "Full details for a completed session." },
    ],
  }),
});

function DetailsPage() {
  const { id, d } = Route.useSearch();
  const [appt, setAppt] = useState<StoredAppt | null>(null);
  const [missing, setMissing] = useState(false);

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

  if (missing) {
    return (
      <div className="min-h-screen bg-[#FBF9FF]">
        <div className="mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center">
          <CalendarClock className="h-8 w-8 text-[#A89BD0]" />
          <h1 className="mt-4 text-xl font-bold text-[#3D2E6B]">
            Appointment not found
          </h1>
          <p className="mt-2 text-sm text-[#7E6BAF]">
            This session may have been cleared from this browser. Open it again from
            your bookings list.
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

  const paymentChip = appt.paymentStatus
    ? appt.paymentStatus === "Paid"
      ? "bg-[#EFE8FB] text-[#3D2E6B]"
      : appt.paymentStatus === "Pending"
      ? "bg-amber-100 text-amber-700"
      : appt.paymentStatus === "Refunded"
      ? "bg-[#E0D9F7] text-[#3D2E6B]"
      : "bg-rose-100 text-rose-700"
    : "";

  return (
    <div className="min-h-screen w-full bg-[#FBF9FF] px-4 py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-4 px-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#A89BD0]">
              Appointment details
            </p>
            <h1 className="mt-1 text-2xl font-semibold leading-tight text-[#3D2E6B]">
              {appt.client ?? "Session"}
            </h1>
            <p className="mt-1 text-sm text-[#7E6BAF]">
              Reference · #{appt.id.toString().toUpperCase()}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full border border-[#EAE7F5] px-3 py-1 text-[11px] font-medium uppercase tracking-wider ${statusStyle[appt.status]}`}
            >
              {appt.status}
            </span>
            {appt.amount && (
              <span className="rounded-full bg-[#3D2E6B] px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-white shadow-sm">
                {appt.amount} payout
              </span>
            )}
          </div>
        </div>

        {/* Key facts card */}
        <section className="rounded-2xl border border-[#EAE7F5] bg-white p-8 shadow-sm">
          <div className="grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-2">
            {appt.client && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7E6BAF]">
                  Client
                </p>
                <p className="font-medium text-[#3D2E6B]">{appt.client}</p>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7E6BAF]">
                When
              </p>
              <p className="font-medium text-[#3D2E6B]">
                {appt.month} {appt.date} · {appt.time}
              </p>
              {appt.timezone && (
                <p className="text-[11px] text-[#7E6BAF]">{appt.timezone}</p>
              )}
            </div>
            {(appt.duration || appt.type) && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7E6BAF]">
                  Duration & Type
                </p>
                <p className="font-medium text-[#3D2E6B]">
                  {[appt.duration, appt.type].filter(Boolean).join(" · ")}
                </p>
              </div>
            )}
            {(appt.sessionFormat || appt.mode) && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7E6BAF]">
                  Format & Mode
                </p>
                <p className="font-medium text-[#3D2E6B]">
                  {[appt.sessionFormat, appt.mode].filter(Boolean).join(" · ")}
                </p>
              </div>
            )}
            {(appt.amount || appt.paymentStatus) && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7E6BAF]">
                  Payment
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {appt.amount && (
                    <p className="font-medium text-[#3D2E6B]">{appt.amount}</p>
                  )}
                  {appt.paymentStatus && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${paymentChip}`}
                    >
                      {appt.paymentStatus}
                    </span>
                  )}
                  {appt.promoCode && (
                    <span className="rounded bg-[#F7F4FB] px-1.5 py-0.5 text-[11px] text-[#7E6BAF]">
                      Promo · {appt.promoCode}
                    </span>
                  )}
                </div>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7E6BAF]">
                Status
              </p>
              <p className="font-medium capitalize text-[#3D2E6B]">
                {appt.status}
              </p>
            </div>
          </div>
        </section>

        {/* Notes / follow-up / private / AI — each floats as its own card via internal styling */}
        <ApptNotesBlock appt={appt} onChange={onChange} />

        {(appt.status === "completed" || appt.status === "upcoming") && (
          <ProviderVisitWorkspace
            appointmentId={appt.id}
            providerName={appt.client}
            appointmentLabel={[appt.month, appt.date, "·", appt.time]
              .filter(Boolean)
              .join(" ")}
          />
        )}

        {appt.status === "completed" && (
          <ApptPayoutStatus status={appt.payoutStatus ?? "pending_review"} />
        )}

        <div className="pt-2 text-center">
          <button
            onClick={() => window.close()}
            className="text-xs font-semibold text-[#7E6BAF] hover:text-[#3D2E6B]"
          >
            Close this tab
          </button>
        </div>
      </div>
    </div>
  );
}