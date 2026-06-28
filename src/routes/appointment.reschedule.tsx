import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ArrowLeft, ArrowRight, CalendarCheck2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAvailabilityStore, formatTime12, type WeekAvail } from "@/lib/availability-store";
import { publishAppointmentEvent } from "@/lib/appointments-bus";

const searchSchema = z.object({
  id: z.string().optional(),
  client: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  duration: z.string().optional(),
  type: z.string().optional(),
  mode: z.string().optional(),
  timezone: z.string().optional(),
  role: z.enum(["provider", "client"]).optional(),
});

export const Route = createFileRoute("/appointment/reschedule")({
  validateSearch: (input: Record<string, unknown>) => searchSchema.parse(input),
  component: ReschedulePage,
  head: () => ({
    meta: [
      { title: "Reschedule appointment — Lubin" },
      { name: "description", content: "Pick a new time for your session." },
    ],
  }),
});

const DOW_KEYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function slotsForDay(week: WeekAvail, date: Date): string[] {
  const key = DOW_KEYS[date.getDay()];
  const day = week[key];
  if (!day?.enabled) return [];
  const out: string[] = [];
  for (const iv of day.intervals) {
    const [sh, sm] = iv.start.split(":").map(Number);
    const [eh, em] = iv.end.split(":").map(Number);
    let cur = sh * 60 + (sm || 0);
    const end = eh * 60 + (em || 0);
    while (cur + 60 <= end) {
      const h = Math.floor(cur / 60);
      const m = cur % 60;
      out.push(formatTime12(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`));
      cur += 60;
    }
  }
  return out;
}

function ReschedulePage() {
  const s = Route.useSearch();
  const isClient = s.role === "client";
  const counterLabel = isClient ? "Provider" : "Client";
  const counterLabelLower = isClient ? "provider" : "client";
  const counterName = s.client ?? (isClient ? "your provider" : "your client");
  const week = useAvailabilityStore((st) => st.week);
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 450);
    return () => clearTimeout(t);
  }, []);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [viewMonth, setViewMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const days = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const last = new Date(year, month + 1, 0).getDate();
    const out: { iso: string; dom: string; dow: string }[] = [];
    for (let i = 1; i <= last; i++) {
      const d = new Date(year, month, i);
      if (d < today) continue;
      const key = DOW_KEYS[d.getDay()];
      if (!week[key]?.enabled || week[key].intervals.length === 0) continue;
      out.push({
        iso: `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`,
        dom: String(i),
        dow: d.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase(),
      });
    }
    return out;
  }, [viewMonth, today, week]);

  const [date, setDate] = useState("");
  const availableTimes = useMemo(() => {
    if (!date) return [];
    return slotsForDay(week, new Date(date + "T00:00:00"));
  }, [date, week]);
  const monthLabel = viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const atCurrentMonth =
    viewMonth.getFullYear() === today.getFullYear() && viewMonth.getMonth() === today.getMonth();
  const [time, setTime] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);

  // Release lock if user closes tab without confirming
  useEffect(() => {
    if (!s.id) return;
    const onUnload = () => {
      if (!done) publishAppointmentEvent({ type: "unlock", id: s.id! });
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [s.id, done]);

  if (!ready) {
    return <RescheduleSkeleton />;
  }

  if (done) {
    const chosenLabel = date
      ? new Date(date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
      : "";
    const previousWhen = [s.date, s.time].filter(Boolean).join(" · ");
    return (
      <div
        className="flex min-h-screen items-center justify-center p-6"
        style={{ fontFamily: "Inter, sans-serif", backgroundColor: "#F0EAFB" }}
      >
        <div className="flex w-full max-w-[460px] flex-col items-center">
          <div
            className="relative flex w-full flex-col items-center overflow-hidden rounded-[32px] bg-white p-10"
            style={{ boxShadow: "0 24px 48px -12px rgba(61,46,107,0.08)" }}
          >
            <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-full bg-[#F0EAFB]">
              <CalendarCheck2 className="h-6 w-6 text-[#3D2E6B]" strokeWidth={1.4} />
            </div>

            <span className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#7E6BAF]">
              Appointment rescheduled
            </span>

            <h1 className="mb-4 text-center text-[32px] font-bold tracking-tight leading-[1.1] text-[#3D2E6B]">
              The session has been rescheduled.
            </h1>

            <p className="mb-10 px-6 text-center text-sm leading-relaxed text-[#7E6BAF]">
              {isClient ? (
                <>
                  <span className="font-semibold text-[#3D2E6B]">{counterName}</span> has
                  been notified and will confirm the new time.
                </>
              ) : (
                <>
                  <span className="font-semibold text-[#3D2E6B]">{counterName}</span> has
                  been notified of the new time.
                </>
              )}
            </p>

            <div className="mb-10 flex w-full items-center gap-4">
              <div className="flex-1 border-t border-dashed border-[#E5DEF2]" />
              <div className="h-1.5 w-1.5 rounded-full bg-[#E5DEF2]" />
              <div className="flex-1 border-t border-dashed border-[#E5DEF2]" />
            </div>

            <div className="mb-10 w-full space-y-5">
              {s.type && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#7E6BAF]">Session</span>
                  <span className="text-sm font-medium text-[#3D2E6B]">{s.type}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#7E6BAF]">{counterLabel}</span>
                <span className="text-sm font-medium text-[#3D2E6B]">{s.client ?? "—"}</span>
              </div>
              {previousWhen && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#7E6BAF]">Previous</span>
                  <span className="text-sm font-medium text-[#3D2E6B] line-through opacity-60">{previousWhen}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#7E6BAF]">New time</span>
                <span className="text-sm font-semibold text-[#3D2E6B]">
                  {chosenLabel} · {time}
                </span>
              </div>
              {s.timezone && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#7E6BAF]">Timezone</span>
                  <span className="text-sm font-medium text-[#3D2E6B]">{s.timezone}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#7E6BAF]">Status</span>
                <span className="flex items-center gap-1.5 rounded-full bg-[#F0EAFB] px-3 py-1 text-[11px] font-bold uppercase text-[#7E6BAF]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#7E6BAF]" />
                  Rescheduled
                </span>
              </div>
            </div>

            <div className="mb-10 w-full rounded-2xl border border-[#E5DEF2] bg-[#F0EAFB]/40 p-6 text-sm leading-normal text-[#7E6BAF]">
              Your calendar has been updated with the new time.
            </div>

            <button
              onClick={() => window.close()}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#3D2E6B] py-4 text-sm font-semibold text-white transition-all hover:bg-[#2D2250]"
            >
              Close this tab
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <footer className="mt-10 flex items-center gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#7E6BAF]">Lubin</span>
            <span className="h-1 w-1 rounded-full bg-[#7E6BAF]/40" />
            <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#7E6BAF]">Care coordination</span>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F8FF] py-12" style={{ fontFamily: "Inter, sans-serif" }}>
      <main className="mx-auto max-w-3xl px-6">
        <button
          onClick={() => window.close()}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#7E6BAF] hover:text-[#3D2E6B]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Close
        </button>

        <div className="mt-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#A89BD0]">Reschedule</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#3D2E6B]">
            Pick a new time
          </h1>
          <p className="mt-2 text-sm text-[#7E6BAF]">
            Choose a replacement slot. We'll notify {s.client ?? "your client"} for confirmation.
          </p>
        </div>

        <section className="mt-6 rounded-[12px] border border-[#EAE7F5] bg-white p-6 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">Current appointment</p>
          <div className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <DetailRow label="Client" value={s.client ?? "—"} />
            <DetailRow label="Session" value={s.type ?? "—"} />
            <DetailRow label="When" value={`${s.date ?? ""} · ${s.time ?? ""}`} />
            <DetailRow label="Duration" value={s.duration ?? "—"} />
            <DetailRow label="Mode" value={s.mode ?? "—"} />
            <DetailRow label="Timezone" value={s.timezone ?? "—"} />
          </div>
        </section>

        <section className="mt-6 rounded-[12px] border border-[#EAE7F5] bg-white p-6 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">Select a date</p>

          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
              disabled={atCurrentMonth}
              aria-label="Previous month"
              className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#EAE7F5] bg-white text-[#3D2E6B] hover:bg-[#FBF9FF] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="min-w-[140px] text-center text-sm font-semibold text-[#3D2E6B]">{monthLabel}</p>
            <button
              type="button"
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
              aria-label="Next month"
              className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#EAE7F5] bg-white text-[#3D2E6B] hover:bg-[#FBF9FF]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {days.length === 0 ? (
            <div className="mt-4 rounded-[10px] border border-dashed border-[#EAE7F5] bg-[#FBF9FF] px-4 py-6 text-center">
              <p className="text-sm font-medium text-[#3D2E6B]">No availability this month</p>
              <p className="mt-1 text-xs text-[#A89BD0]">Try the next month.</p>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {days.map((d) => {
                const selected = date === d.iso;
                return (
                  <button
                    key={d.iso}
                    onClick={() => {
                      setDate(d.iso);
                      setTime(null);
                    }}
                    className={`relative flex h-16 w-16 flex-col items-center justify-center rounded-[10px] border text-sm transition ${
                      selected
                        ? "border-[#5B4796] bg-[#5B4796] text-white"
                        : "border-[#EAE7F5] bg-white text-[#3D2E6B] hover:bg-[#FBF9FF]"
                    }`}
                  >
                    <span className={`text-[9px] font-bold uppercase ${selected ? "text-white/80" : "text-[#A89BD0]"}`}>
                      {d.dow}
                    </span>
                    <span className="text-lg font-bold leading-tight">{d.dom}</span>
                  </button>
                );
              })}
            </div>
          )}

          <p className="mt-6 text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">Select a time</p>
          {!date ? (
            <p className="mt-3 text-sm text-[#A89BD0]">Pick a date to see available times.</p>
          ) : availableTimes.length === 0 ? (
            <p className="mt-3 text-sm text-[#A89BD0]">No time slots available for this date.</p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {availableTimes.map((t) => (
                <button
                  key={t}
                  onClick={() => setTime(t)}
                  className={`rounded-[10px] border px-3 py-2 text-sm font-medium transition ${
                    time === t
                      ? "border-[#5B4796] bg-[#5B4796] text-white"
                      : "border-[#EAE7F5] bg-white text-[#3D2E6B] hover:bg-[#FBF9FF]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          <p className="mt-6 text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">Message to client (optional)</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Add a short note explaining the change…"
            className="mt-3 block w-full resize-none rounded-[10px] border border-[#EAE7F5] bg-white px-3.5 py-2.5 text-sm text-[#3D2E6B] outline-none focus:border-[#A89BD0]"
          />

          <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
            <button
              onClick={() => window.close()}
              className="rounded-[10px] border border-[#EAE7F5] bg-white px-5 py-2.5 text-sm font-medium text-[#3D2E6B] hover:bg-[#FBF9FF]"
            >
              Cancel
            </button>
            <button
              disabled={!date || !time}
              onClick={() => {
                if (submitting) return;
                setSubmitting(true);
                const label = date
                  ? new Date(date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
                  : "";
                setTimeout(() => {
                  toast.success("Reschedule request sent", {
                    description: `${s.client ?? "Your client"} will be notified about ${label} at ${time}.`,
                  });
                  if (s.id) publishAppointmentEvent({ type: "rescheduled", id: s.id, date: label, time: time ?? undefined });
                  setDone(true);
                }, 700);
              }}
              className="inline-flex items-center gap-2 rounded-[10px] bg-[#3D2E6B] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#2C2B4B] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Sending…" : "Confirm reschedule"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-l-2 border-[#EAE7F5] pl-3">
      <span className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">{label}</span>
      <span className="text-sm font-medium text-[#3D2E6B]">{value}</span>
    </div>
  );
}

function Shimmer({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[8px] bg-[#EAE7F5] ${className}`} />;
}

function RescheduleSkeleton() {
  return (
    <div className="min-h-screen bg-[#F9F8FF] py-12" style={{ fontFamily: "Inter, sans-serif" }}>
      <main className="mx-auto max-w-3xl px-6">
        <Shimmer className="h-4 w-16" />
        <div className="mt-4 space-y-3">
          <Shimmer className="h-3 w-24" />
          <Shimmer className="h-8 w-64" />
          <Shimmer className="h-4 w-80" />
        </div>
        <section className="mt-6 rounded-[12px] border border-[#EAE7F5] bg-white p-6 shadow-sm">
          <Shimmer className="h-3 w-32" />
          <div className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2 border-l-2 border-[#EAE7F5] pl-3">
                <Shimmer className="h-3 w-16" />
                <Shimmer className="h-4 w-28" />
              </div>
            ))}
          </div>
        </section>
        <section className="mt-6 rounded-[12px] border border-[#EAE7F5] bg-white p-6 shadow-sm">
          <Shimmer className="h-3 w-24" />
          <div className="mt-4 flex items-center justify-center gap-3">
            <Shimmer className="h-8 w-8" />
            <Shimmer className="h-5 w-32" />
            <Shimmer className="h-8 w-8" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Shimmer key={i} className="h-16 w-16" />
            ))}
          </div>
          <Shimmer className="mt-6 h-3 w-24" />
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Shimmer key={i} className="h-9" />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}