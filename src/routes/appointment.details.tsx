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

  return (
    <div className="min-h-screen bg-[#FBF9FF]">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#A89BD0]">
              Appointment details
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[#3D2E6B]">
              {appt.client ?? "Session"}
            </h1>
            <p className="mt-1 text-sm text-[#7E6BAF]">
              {appt.month} {appt.date} · {appt.time}
              {appt.timezone ? ` · ${appt.timezone}` : ""}
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
              statusStyle[appt.status]
            }`}
          >
            {appt.status}
          </span>
        </div>

        <section className="rounded-[14px] border border-[#EAE7F5] bg-white p-6 shadow-sm">
          <div className="grid gap-6 sm:grid-cols-3">
            {appt.client && <DetailItem label="Client" value={appt.client} />}
            <DetailItem
              label="When"
              value={`${appt.month ?? ""} ${appt.date ?? ""} · ${appt.time ?? ""}${
                appt.timezone ? ` · ${appt.timezone}` : ""
              }`}
            />
            {appt.duration && <DetailItem label="Duration" value={appt.duration} />}
            {appt.type && <DetailItem label="Session type" value={appt.type} />}
            {appt.sessionFormat && (
              <DetailItem label="Session format" value={appt.sessionFormat} />
            )}
            {appt.mode && <DetailItem label="Mode" value={appt.mode} />}
            <DetailItem label="Status" value={appt.status} />
            {appt.amount && <DetailItem label="Amount paid" value={appt.amount} />}
            {appt.paymentStatus && (
              <DetailItem
                label="Payment status"
                value={
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                      appt.paymentStatus === "Paid"
                        ? "bg-[#E6F8F1] text-[#2D8E69]"
                        : appt.paymentStatus === "Pending"
                        ? "bg-amber-100 text-amber-700"
                        : appt.paymentStatus === "Refunded"
                        ? "bg-[#E0D9F7] text-[#3D2E6B]"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {appt.paymentStatus}
                  </span>
                }
              />
            )}
            <DetailItem label="Promo code" value={appt.promoCode ?? "—"} />
          </div>
        </section>

        <div className="mt-6">
          <ApptNotesBlock appt={appt} onChange={onChange} />
        </div>

        {appt.status === "completed" && (
          <ApptPayoutStatus status={appt.payoutStatus ?? "pending_review"} />
        )}

        <div className="mt-8 text-center">
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