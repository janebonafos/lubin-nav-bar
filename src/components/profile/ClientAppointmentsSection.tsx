import { useEffect, useRef, useState } from "react";
import { CalendarClock, Video, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import {
  publishAppointmentEvent,
  subscribeAppointmentEvents,
} from "@/lib/appointments-bus";

type Appt = {
  id: string;
  provider: string;
  specialty: string;
  day: string;
  date: string;
  month: string;
  time: string;
  timezone: string;
  duration: string;
  type: string;
  sessionFormat: "Individual" | "Group";
  mode: string;
  status: "upcoming" | "completed" | "cancelled";
  amount: string;
  paymentStatus: "Paid" | "Pending" | "Refunded" | "Failed";
  promoCode?: string;
  providerNotes?: string;
  followUp?: string;
};

const seed: Appt[] = [
  {
    id: "cu1",
    provider: "Dr. Camille Lazaro",
    specialty: "Clinical Psychologist",
    day: "TODAY",
    date: "28",
    month: "JUN",
    time: "3:00 PM",
    timezone: "PHT (GMT+8)",
    duration: "50 min",
    type: "Therapy",
    sessionFormat: "Individual",
    mode: "Video",
    status: "upcoming",
    amount: "₱2,500",
    paymentStatus: "Paid",
  },
  {
    id: "cu2",
    provider: "Coach Liam Park",
    specialty: "Wellness Coach",
    day: "MON",
    date: "01",
    month: "JUL",
    time: "10:00 AM",
    timezone: "PHT (GMT+8)",
    duration: "30 min",
    type: "Coaching",
    sessionFormat: "Individual",
    mode: "Video",
    status: "upcoming",
    amount: "₱1,200",
    paymentStatus: "Paid",
    promoCode: "WELCOME10",
  },
  {
    id: "cc1",
    provider: "Dr. Camille Lazaro",
    specialty: "Clinical Psychologist",
    day: "WED",
    date: "19",
    month: "JUN",
    time: "3:00 PM",
    timezone: "PHT (GMT+8)",
    duration: "50 min",
    type: "Therapy",
    sessionFormat: "Individual",
    mode: "Video",
    status: "completed",
    amount: "₱2,500",
    paymentStatus: "Paid",
    followUp:
      "We explored after-hours boundaries and practiced a kinder decline script. Continue the daily wins journal and the breathing exercise before bed.",
  },
  {
    id: "cx1",
    provider: "Dr. Reyes Mendoza",
    specialty: "Psychiatrist",
    day: "MON",
    date: "10",
    month: "JUN",
    time: "11:00 AM",
    timezone: "PHT (GMT+8)",
    duration: "30 min",
    type: "Consultation",
    sessionFormat: "Individual",
    mode: "Video",
    status: "cancelled",
    amount: "₱1,500",
    paymentStatus: "Refunded",
  },
];

export const CLIENT_UPCOMING_COUNT = seed.filter((a) => a.status === "upcoming").length;

export type ClientUpcomingAppointment = {
  id: string;
  providerName: string;
  providerRole: string;
  providerInitials: string;
  dateLabel: string;
  timeLabel: string;
  fullLabel: string;
  ts?: number;
};

function initialsFor(name: string): string {
  return name
    .replace(/^(Dr\.|Coach|Ms\.|Mr\.)\s+/i, "")
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function getClientUpcomingAppointments(): ClientUpcomingAppointment[] {
  return seed
    .filter((a) => a.status === "upcoming")
    .map((a) => {
      const dateLabel = `${a.day.charAt(0) + a.day.slice(1).toLowerCase()}, ${a.month.charAt(0) + a.month.slice(1).toLowerCase()} ${a.date}`;
      return {
        id: a.id,
        providerName: a.provider,
        providerRole: a.specialty,
        providerInitials: initialsFor(a.provider),
        dateLabel,
        timeLabel: a.time,
        fullLabel: `${dateLabel} · ${a.time}`,
      };
    });
}

export default function ClientAppointmentsSection() {
  const [tab, setTab] = useState<"all" | "upcoming" | "completed" | "cancelled">("all");
  const [all, setAll] = useState<Appt[]>(seed);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [locks, setLocks] = useState<Record<string, "cancel" | "reschedule">>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const refreshTimer = useRef<number | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 400);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const unsub = subscribeAppointmentEvents((evt) => {
      if (evt.type === "lock") {
        setLocks((m) => ({ ...m, [evt.id]: evt.action }));
      } else if (evt.type === "unlock") {
        setLocks((m) => {
          const { [evt.id]: _omit, ...rest } = m;
          return rest;
        });
      } else if (evt.type === "cancelled") {
        setRefreshing(true);
        setAll((list) =>
          list.map((a) => (a.id === evt.id ? { ...a, status: "cancelled" as const } : a)),
        );
        setLocks((m) => {
          const { [evt.id]: _omit, ...rest } = m;
          return rest;
        });
        if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
        refreshTimer.current = window.setTimeout(() => setRefreshing(false), 700);
      } else if (evt.type === "rescheduled") {
        setRefreshing(true);
        setAll((list) =>
          list.map((a) => (a.id === evt.id ? { ...a, time: evt.time ?? a.time } : a)),
        );
        setLocks((m) => {
          const { [evt.id]: _omit, ...rest } = m;
          return rest;
        });
        if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
        refreshTimer.current = window.setTimeout(() => setRefreshing(false), 700);
      }
    });
    return () => {
      unsub();
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
    };
  }, []);

  const counts = {
    all: all.length,
    upcoming: all.filter((a) => a.status === "upcoming").length,
    completed: all.filter((a) => a.status === "completed").length,
    cancelled: all.filter((a) => a.status === "cancelled").length,
  };
  const list = tab === "all" ? all : all.filter((a) => a.status === tab);

  const statusStyle = {
    upcoming: "bg-[#E0D9F7] text-[#3D2E6B]",
    completed: "bg-[#E6F8F1] text-[#2D8E69]",
    cancelled: "bg-rose-100 text-rose-700",
  } as const;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-2xl bg-white/70" />
        <div className="h-64 animate-pulse rounded-2xl bg-white/70" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Upcoming" value={String(counts.upcoming)} hint="Next 30 days" />
        <Stat label="Completed" value={String(counts.completed)} hint="Last 30 days" />
        <Stat label="Cancelled" value={String(counts.cancelled)} hint="Last 30 days" />
      </div>

      <section className="overflow-hidden rounded-[12px] border border-[#EAE7F5] bg-white shadow-sm">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-[#3D2E6B]">My appointments</h2>
            {refreshing && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F0EAFB] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#7E6BAF]">
                <Loader2 className="h-3 w-3 animate-spin" /> Updating
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[#7E6BAF]">
            Sessions you've booked with Lubin providers.
          </p>
          <div className="mt-6 inline-flex gap-2 rounded-[10px] bg-[#F0EAFB] p-1">
            {(["all", "upcoming", "completed", "cancelled"] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  setExpanded(null);
                }}
                className={`inline-flex items-center gap-2 rounded-[8px] px-4 py-1.5 text-sm font-medium capitalize transition ${
                  tab === t
                    ? "bg-[#5B4796] text-white"
                    : "text-[#3D2E6B] hover:bg-[#A89BD0]/20"
                }`}
              >
                {t}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                    tab === t ? "bg-white/25 text-white" : "bg-white/70 text-[#3D2E6B]/60"
                  }`}
                >
                  {counts[t]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {list.length === 0 ? (
          <div className="border-t border-[#F0EAFB] p-12 text-center">
            <CalendarClock className="mx-auto h-7 w-7 text-[#A89BD0]" />
            <p className="mt-3 text-sm font-semibold text-[#3D2E6B]">Nothing here yet</p>
            <p className="mt-1 text-xs text-[#7E6BAF]">
              When you book a session it will show up here.
            </p>
          </div>
        ) : (
          <ul className="border-t border-[#F0EAFB]">
            {list.map((a, idx) => {
              const isExpanded = expanded === a.id;
              const isLast = idx === list.length - 1;
              const lock = locks[a.id];
              const isLocked = Boolean(lock);
              const reschedHref = `/appointment/reschedule?role=client&id=${encodeURIComponent(a.id)}&client=${encodeURIComponent(a.provider)}&date=${encodeURIComponent(`${a.month} ${a.date}`)}&time=${encodeURIComponent(a.time)}&duration=${encodeURIComponent(a.duration)}&type=${encodeURIComponent(a.type)}&mode=${encodeURIComponent(a.mode)}&timezone=${encodeURIComponent(a.timezone)}`;
              const cancelHref = `/appointment/cancel?role=client&id=${encodeURIComponent(a.id)}&client=${encodeURIComponent(a.provider)}&date=${encodeURIComponent(`${a.month} ${a.date}`)}&time=${encodeURIComponent(a.time)}&duration=${encodeURIComponent(a.duration)}&type=${encodeURIComponent(a.type)}&amount=${encodeURIComponent(a.amount)}&paymentStatus=${encodeURIComponent(a.paymentStatus)}`;
              const open = (href: string, action: "reschedule" | "cancel") => {
                if (isLocked) return;
                publishAppointmentEvent({ type: "lock", id: a.id, action });
                window.open(href, "_blank", "noopener,noreferrer");
              };
              return (
                <li
                  key={a.id}
                  className={`${
                    isExpanded ? "bg-[#FBF9FF]" : "hover:bg-[#FBF9FF]"
                  } ${!isLast ? "border-b border-[#F0EAFB]" : ""} transition-colors`}
                >
                  <div className="flex flex-wrap items-center gap-6 p-6 sm:flex-nowrap">
                    <div
                      className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-[10px] border bg-white ${
                        isExpanded ? "border-[#A89BD0]" : "border-[#EAE7F5]"
                      } ${a.status !== "upcoming" ? "opacity-60" : ""}`}
                    >
                      <span className="text-[10px] font-bold uppercase text-[#A89BD0]">
                        {a.month}
                      </span>
                      <span className="text-xl font-bold leading-tight text-[#3D2E6B]">
                        {a.date}
                      </span>
                      <span className="text-[9px] font-bold uppercase text-[#A89BD0]">
                        {a.day}
                      </span>
                    </div>

                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className={`truncate font-semibold text-[#3D2E6B] ${
                              a.status !== "upcoming" ? "opacity-70" : ""
                            }`}
                          >
                            {a.provider}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusStyle[a.status]}`}
                          >
                            {a.status}
                          </span>
                        </div>
                        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-[#7E6BAF]">
                          <span>{a.specialty}</span>
                          <span className="text-[#C9BEE4]">·</span>
                          <span>
                            {a.type} · {a.duration}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div
                      className={`hidden flex-col items-end text-right sm:flex ${
                        a.status !== "upcoming" ? "opacity-60" : ""
                      }`}
                    >
                      <p className="font-semibold text-[#3D2E6B]">{a.time}</p>
                      <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-[#7E6BAF]">
                        <Video className="h-3 w-3 text-[#A89BD0]" /> {a.mode}
                      </span>
                    </div>

                    <div className="ml-auto flex shrink-0 items-center gap-2 sm:ml-4">
                      <button
                        onClick={() => setExpanded(isExpanded ? null : a.id)}
                        className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#EAE7F5] px-4 py-2 text-sm font-medium text-[#3D2E6B] transition hover:bg-white"
                      >
                        {isExpanded ? (
                          <>
                            Hide <ChevronUp className="h-3.5 w-3.5" />
                          </>
                        ) : (
                          <>
                            Details <ChevronDown className="h-3.5 w-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-6 pb-8 pt-2">
                      <div className="mb-6 grid gap-6 sm:grid-cols-3">
                        <Detail label="Provider" value={a.provider} />
                        <Detail
                          label="When"
                          value={`${a.month} ${a.date} · ${a.time} · ${a.timezone}`}
                        />
                        <Detail label="Duration" value={a.duration} />
                        <Detail label="Session type" value={a.type} />
                        <Detail label="Session format" value={a.sessionFormat} />
                        <Detail label="Mode" value={a.mode} />
                        <Detail label="Amount" value={a.amount} />
                        <Detail
                          label="Payment status"
                          value={
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                                a.paymentStatus === "Paid"
                                  ? "bg-[#E6F8F1] text-[#2D8E69]"
                                  : a.paymentStatus === "Pending"
                                  ? "bg-amber-100 text-amber-700"
                                  : a.paymentStatus === "Refunded"
                                  ? "bg-[#E0D9F7] text-[#3D2E6B]"
                                  : "bg-rose-100 text-rose-700"
                              }`}
                            >
                              {a.paymentStatus}
                            </span>
                          }
                        />
                        <Detail label="Promo code" value={a.promoCode ?? "—"} />
                      </div>

                      {a.status === "completed" && a.followUp && (
                        <div className="mb-6 rounded-[12px] border border-[#EAE7F5] bg-white p-5 shadow-[0_8px_24px_-12px_rgba(61,46,107,0.08)]">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">
                            Follow-up from your provider
                          </p>
                          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#3D2E6B]">
                            {a.followUp}
                          </p>
                        </div>
                      )}

                      {a.status === "upcoming" && (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-3">
                            <button
                              disabled={isLocked}
                              className="rounded-[8px] bg-[#3D2E6B] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2C2B4B] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Join session
                            </button>
                            <button
                              onClick={() => open(reschedHref, "reschedule")}
                              disabled={isLocked}
                              className="inline-flex items-center gap-2 rounded-[8px] border border-[#EAE7F5] bg-white px-6 py-2.5 text-sm font-medium text-[#3D2E6B] transition-colors hover:bg-[#FBF9FF] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {lock === "reschedule" && (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              )}
                              Reschedule
                            </button>
                            <button
                              onClick={() => open(cancelHref, "cancel")}
                              disabled={isLocked}
                              className="inline-flex items-center gap-2 rounded-[8px] border border-red-100 bg-white px-6 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {lock === "cancel" && (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              )}
                              Cancel
                            </button>
                          </div>
                          {isLocked && (
                            <p className="inline-flex items-center gap-1.5 rounded-full bg-[#F0EAFB] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#7E6BAF]">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              {lock === "cancel"
                                ? "Cancellation in progress"
                                : "Reschedule in progress"}{" "}
                              · finish in the other tab
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-[12px] border border-[#EAE7F5] bg-white p-5 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">
        {label}
      </p>
      <p className="mt-1 text-3xl font-bold text-[#3D2E6B]">{value}</p>
      <p className="mt-1 text-xs text-[#7E6BAF]">{hint}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-[#3D2E6B]">{value}</p>
    </div>
  );
}
