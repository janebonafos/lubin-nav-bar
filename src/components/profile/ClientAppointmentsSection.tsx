import { useEffect, useRef, useState } from "react";
import {
  CalendarClock,
  Video,
  Loader2,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  publishAppointmentEvent,
  subscribeAppointmentEvents,
} from "@/lib/appointments-bus";
import {
  getProviderGrant,
  getAnyProviderGrant,
  revokeProviderGrant,
  revokeForAppointmentCancelled,
  markGrantPendingReconfirm,
  reconfirmGrant,
  subscribeProviderShares,
  type ProviderShareGrant,
} from "@/lib/share/providerShareStore";
import AppointmentMessageThread from "@/components/messages/AppointmentMessageThread";
import IntakeRequestCard from "@/components/intake/IntakeRequestCard";
import { buildIntakeProgress, subscribeIntake } from "@/lib/intake/store";

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
  publishedFollowUp?: { at: number; by?: string };
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
    id: "cc2",
    provider: "Dr. Reyes Mendoza",
    specialty: "Psychiatrist",
    day: "THU",
    date: "27",
    month: "AUG",
    time: "5:00 PM",
    timezone: "PHT (GMT+8)",
    duration: "30 min",
    type: "Psychiatry consultation (post-assessment review)",
    sessionFormat: "Individual",
    mode: "Video",
    status: "completed",
    amount: "₱3,200",
    paymentStatus: "Paid",
    followUp:
      "We went through your assessment results together and agreed on a plan to start treatment, with a review in two weeks.",
  },
  {
    id: "cc3",
    provider: "Dr. Reyes Mendoza",
    specialty: "Psychiatrist",
    day: "FRI",
    date: "29",
    month: "AUG",
    time: "10:00 AM",
    timezone: "PHT (GMT+8)",
    duration: "30 min",
    type: "Psychiatry consultation (post-assessment review)",
    sessionFormat: "Individual",
    mode: "Video",
    status: "completed",
    amount: "₱3,200",
    paymentStatus: "Paid",
    followUp:
      "We reviewed your assessment results and discussed a medication plan. A prescription may be issued after this review if clinically appropriate.",
  },
  {
    id: "cc4",
    provider: "Dr. Reyes Mendoza",
    specialty: "Psychiatrist",
    day: "SAT",
    date: "30",
    month: "AUG",
    time: "2:00 PM",
    timezone: "PHT (GMT+8)",
    duration: "30 min",
    type: "Psychiatry consultation (post-assessment review)",
    sessionFormat: "Individual",
    mode: "Video",
    status: "completed",
    amount: "₱3,200",
    paymentStatus: "Paid",
    followUp:
      "We went through your assessment results together. A prescription may be started if clinically appropriate, with a follow-up review in two weeks.",
  },
  {
    id: "cc5",
    provider: "Dr. Maria Santos",
    specialty: "Psychiatrist",
    day: "SUN",
    date: "29",
    month: "AUG",
    time: "11:00 AM",
    timezone: "PHT (GMT+8)",
    duration: "30 min",
    type: "Psychiatry follow-up (medication review)",
    sessionFormat: "Individual",
    mode: "Video",
    status: "completed",
    amount: "₱3,200",
    paymentStatus: "Paid",
    followUp:
      "We agreed to start a daily medication and review how you're doing in four weeks. Your prescription is saved in My prescriptions.",
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
  const [grants, setGrants] = useState<Record<string, ProviderShareGrant | null>>({});
  const [anyGrants, setAnyGrants] = useState<Record<string, ProviderShareGrant | null>>({});

  useEffect(() => {
    const refresh = () => {
      const next: Record<string, ProviderShareGrant | null> = {};
      const nextAny: Record<string, ProviderShareGrant | null> = {};
      for (const a of seed) next[a.id] = getProviderGrant(a.id);
      for (const a of seed) nextAny[a.id] = getAnyProviderGrant(a.id);
      setGrants(next);
      setAnyGrants(nextAny);
    };
    refresh();
    return subscribeProviderShares(refresh);
  }, []);

  // Which appointments still need something from the client (session prep).
  const [intakeOpen, setIntakeOpen] = useState<Record<string, number>>({});
  useEffect(() => {
    const refresh = () => {
      const next: Record<string, number> = {};
      for (const a of seed) {
        if (a.status === "cancelled") continue;
        const p = buildIntakeProgress(a.id, a.provider);
        if (p.total > 0 && !p.complete) next[a.id] = p.total - p.answered - p.skipped;
      }
      setIntakeOpen(next);
    };
    refresh();
    return subscribeIntake(refresh);
  }, []);

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
        revokeForAppointmentCancelled(evt.id);
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
        markGrantPendingReconfirm(evt.id);
        setAll((list) =>
          list.map((a) => (a.id === evt.id ? { ...a, time: evt.time ?? a.time } : a)),
        );
        setLocks((m) => {
          const { [evt.id]: _omit, ...rest } = m;
          return rest;
        });
        if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
        refreshTimer.current = window.setTimeout(() => setRefreshing(false), 700);
      } else if (evt.type === "appt-updated") {
        setRefreshing(true);
        setAll((list) =>
          list.map((a) =>
            a.id === evt.id ? ({ ...a, ...(evt.patch as Partial<Appt>) }) : a,
          ),
        );
        if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
        refreshTimer.current = window.setTimeout(() => setRefreshing(false), 600);
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

  // A finished session only reads as "Completed" once the provider has marked
  // it completed and shared the recap; before that it stays "Confirmed".
  const statusLabel = (a: Appt) =>
    a.status === "completed" && !a.publishedFollowUp ? "confirmed" : a.status;
  const statusTone = (a: Appt) =>
    a.status === "completed" && !a.publishedFollowUp
      ? statusStyle.upcoming
      : statusStyle[a.status];

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
              const openIntake = intakeOpen[a.id] ?? 0;
              const needsAction =
                openIntake > 0 &&
                (a.status === "upcoming" || (a.status === "completed" && !a.publishedFollowUp));
              return (
                <li
                  key={a.id}
                  className={`${
                    isExpanded ? "bg-[#FBF9FF]" : "hover:bg-[#FBF9FF]"
                  } ${!isLast ? "border-b border-[#F0EAFB]" : ""} ${
                    needsAction ? "border-l-4 border-l-[#5B4796] bg-[#FBF9FF]" : ""
                  } transition-colors`}
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
                        <div className="flex flex-wrap items-center gap-2">
                          <p
                            className={`truncate font-semibold text-[#3D2E6B] ${
                              a.status !== "upcoming" ? "opacity-70" : ""
                            }`}
                          >
                            {a.provider}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusTone(a)}`}
                          >
                            {statusLabel(a)}
                          </span>
                          {needsAction && (
                            <span
                              title={`${openIntake} session prep question${openIntake === 1 ? "" : "s"} still to answer`}
                              className="inline-flex items-center gap-1 rounded-full bg-[#F0EAFB] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#5B4796]"
                            >
                              Action needed
                            </span>
                          )}
                          {grants[a.id] && (
                            <span
                              title={`${grants[a.id]!.includedKeys.length} item${grants[a.id]!.includedKeys.length === 1 ? "" : "s"} shared with ${a.provider}`}
                              className="inline-flex items-center gap-1 rounded-full bg-[#EEF6F1] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#2D8E69]"
                            >
                              <ShieldCheck className="h-3 w-3" /> Passport shared
                            </span>
                          )}
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

                      {(a.status === "upcoming" ||
                        (a.status === "completed" && !a.publishedFollowUp)) && (
                        <div className="mb-6">
                          <IntakeRequestCard
                            appointmentId={a.id}
                            providerName={a.provider}
                            sessionLabel={`${a.month} ${a.date} · ${a.time}`}
                            phase={a.status === "upcoming" ? "before" : "live"}
                          />
                        </div>
                      )}


                      <SharingRow
                        appointmentId={a.id}
                        providerName={a.provider}
                        status={a.status}
                        grant={grants[a.id] ?? null}
                        anyGrant={anyGrants[a.id] ?? null}
                        onReconfirm={() => {
                          reconfirmGrant(a.id);
                        }}
                        onRevoke={() => {
                          revokeProviderGrant(a.id);
                        }}
                      />

                      {a.status === "upcoming" && (
                        <div className="mb-6">
                          <AppointmentMessageThread
                            appointmentId={a.id}
                            role="client"
                            selfName="You"
                            otherName={a.provider}
                          />
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

function fmtDate(ts?: number) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function SharingRow({
  appointmentId,
  providerName,
  status,
  grant,
  anyGrant,
  onReconfirm,
  onRevoke,
}: {
  appointmentId: string;
  providerName: string;
  status: "upcoming" | "completed" | "cancelled";
  grant: ProviderShareGrant | null;
  anyGrant: ProviderShareGrant | null;
  onReconfirm: () => void;
  onRevoke: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const shared = !!grant;
  const cancelled = status === "cancelled";
  const completed = status === "completed";

  // Cancelled: show ended note only when there was ever a grant.
  if (cancelled) {
    if (!anyGrant) return null;
    return (
      <div className="mb-6 border-t border-[#F0EAFB] pt-5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">
          Health Passport
        </p>
        <p className="mt-2 text-sm text-[#6B6684]">
          Health Passport access ended when this appointment was cancelled.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6 border-t border-[#F0EAFB] pt-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">
            Health Passport
          </p>

          {!shared && !completed && (
            <p className="mt-2 text-sm text-[#6B6684]">
              Nothing from your Health Passport is shared for this appointment.
            </p>
          )}

          {!shared && completed && anyGrant && anyGrant.revoked && (
            <p className="mt-2 text-sm text-[#6B6684]">
              Health Passport access ended{" "}
              <span className="font-semibold text-[#3D2E6B]">
                {fmtDate(anyGrant.revokedAt ?? anyGrant.expiresAt)}
              </span>
              .
            </p>
          )}

          {!shared && completed && anyGrant && !anyGrant.revoked && (
            <p className="mt-2 text-sm text-[#6B6684]">
              Health Passport access ended{" "}
              <span className="font-semibold text-[#3D2E6B]">
                {fmtDate(anyGrant.expiresAt)}
              </span>
              .
            </p>
          )}

          {!shared && completed && !anyGrant && (
            <p className="mt-2 text-sm text-[#6B6684]">
              Nothing from your Health Passport was shared for this appointment.
            </p>
          )}

          {shared && grant && (
            <>
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[#2D8E69]">
                <ShieldCheck className="h-4 w-4" />
                {completed
                  ? `Shared with ${providerName} · Access ends ${fmtDate(grant.expiresAt)}`
                  : `Shared with ${providerName}`}
              </p>
              {!completed && (
                <p className="mt-1 text-xs text-[#6B6684]">
                  {grant.includedKeys.length} item
                  {grant.includedKeys.length === 1 ? "" : "s"} · Access until{" "}
                  <span className="font-semibold text-[#3D2E6B]">
                    {fmtDate(grant.expiresAt)}
                  </span>
                </p>
              )}
              {grant.pendingReconfirm && (
                <div className="mt-3 rounded-[10px] border border-[#F0E2C6] bg-[#FDF8EE] p-3">
                  <p className="text-xs font-semibold text-[#8A6A1E]">
                    Please reconfirm sharing for the new appointment date.
                  </p>
                  <p className="mt-1 text-xs text-[#8A6A1E]/80">
                    Your selections were kept. Confirm to update the access period.
                  </p>
                  <button
                    onClick={onReconfirm}
                    className="mt-2 inline-flex items-center rounded-[6px] bg-[#8A6A1E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#6E5416]"
                  >
                    Reconfirm sharing
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex flex-none flex-wrap items-center gap-2">
          {!shared && !completed && (
            <Link
              to="/my-health-passport"
              search={{ tab: "share", share: appointmentId }}
              className="inline-flex items-center rounded-[8px] border border-[#E1DAF1] bg-white px-3.5 py-2 text-sm font-medium text-[#3D2E6B] transition hover:bg-[#FBFAFE]"
            >
              Choose what to share
            </Link>
          )}
          {shared && (
            <>
              <button
                onClick={() => setShowDetails((s) => !s)}
                className="inline-flex items-center rounded-[8px] border border-[#E1DAF1] bg-white px-3.5 py-2 text-sm font-medium text-[#3D2E6B] transition hover:bg-[#FBFAFE]"
              >
                {showDetails ? "Hide details" : "View or change"}
              </button>
              <button
                onClick={onRevoke}
                className="inline-flex items-center rounded-[8px] border border-[#EAD9D9] bg-white px-3.5 py-2 text-sm font-medium text-[#B0453A] transition hover:bg-[#FBF4F4]"
              >
                Revoke
              </button>
            </>
          )}
          {!shared && completed && anyGrant && !anyGrant.revoked && (
            <button
              onClick={() => setShowDetails((s) => !s)}
              className="inline-flex items-center rounded-[8px] border border-[#E1DAF1] bg-white px-3.5 py-2 text-sm font-medium text-[#3D2E6B] transition hover:bg-[#FBFAFE]"
            >
              {showDetails ? "Hide details" : "View what was shared"}
            </button>
          )}
          {!shared && completed && anyGrant && anyGrant.revoked && (
            <button
              onClick={() => setShowDetails((s) => !s)}
              className="inline-flex items-center rounded-[8px] border border-[#E1DAF1] bg-white px-3.5 py-2 text-sm font-medium text-[#3D2E6B] transition hover:bg-[#FBFAFE]"
            >
              {showDetails ? "Hide details" : "View what was shared"}
            </button>
          )}
        </div>
      </div>

      {showDetails && (grant || anyGrant) && (
        <ShareDetails
          providerName={providerName}
          grant={(grant ?? anyGrant)!}
          canManage={shared && !completed}
          appointmentId={appointmentId}
        />
      )}
    </div>
  );
}

function ShareDetails({
  providerName,
  grant,
  canManage,
  appointmentId,
}: {
  providerName: string;
  grant: ProviderShareGrant;
  canManage: boolean;
  appointmentId: string;
}) {
  const active = !grant.revoked && grant.expiresAt > Date.now();
  return (
    <div className="mt-4 rounded-[10px] border border-[#EAE7F5] bg-[#FBFAFE] p-4">
      <dl className="grid gap-3 sm:grid-cols-2">
        <DetailRow label="Recipient" value={providerName} />
        <DetailRow label="Appointment" value={grant.appointmentLabel} />
        <DetailRow
          label="Date shared"
          value={fmtDate(grant.updatedAt ?? grant.createdAt)}
        />
        <DetailRow
          label={active ? "Access expires" : "Access ended"}
          value={fmtDate(grant.revokedAt ?? grant.expiresAt)}
        />
        <DetailRow
          label="Date range covered"
          value={grant.dateRangeLabel ?? "All included Health Passport entries"}
        />
        <DetailRow
          label="Snapshot"
          value={`Fixed at share time${grant.previousVersions?.length ? ` · v${(grant.previousVersions.length ?? 0) + 1}` : ""}`}
        />
      </dl>

      <div className="mt-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">
          Exact shared information
        </p>
        {grant.includedKeys.length === 0 ? (
          <p className="mt-1 text-sm text-[#6B6684]">Nothing selected.</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {grant.includedKeys.map((k) => (
              <li
                key={k}
                className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-xs text-[#3D2E6B] ring-1 ring-[#EAE7F5]"
              >
                {k}
              </li>
            ))}
          </ul>
        )}
      </div>

      {canManage && (
        <div className="mt-4">
          <Link
            to="/my-health-passport"
            search={{ tab: "share", share: appointmentId }}
            className="inline-flex items-center rounded-[8px] border border-[#E1DAF1] bg-white px-3.5 py-2 text-sm font-medium text-[#3D2E6B] transition hover:bg-[#FBFAFE]"
          >
            Change what's shared
          </Link>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-[#3D2E6B]">{value}</dd>
    </div>
  );
}
