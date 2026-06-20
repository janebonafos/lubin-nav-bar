import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Sun,
  Zap,
  Compass,
  Leaf,
} from "lucide-react";
import { ASSESSMENTS } from "@/lib/patterns/assessments";
import type { Attempt as PatternAttempt } from "@/lib/patterns/types";

type GroupKey = "core" | "emotional" | "patterns" | "lifestyle";

const GROUP_ICON: Record<
  GroupKey,
  { Icon: typeof Sun; short: string; tint: string; ring: string }
> = {
  core: {
    Icon: Sun,
    short: "Mood & energy",
    tint: "bg-brand-purple/8",
    ring: "ring-brand-purple/25",
  },
  emotional: {
    Icon: Zap,
    short: "Stress & anxiety",
    tint: "bg-brand-purple/8",
    ring: "ring-brand-purple/25",
  },
  patterns: {
    Icon: Compass,
    short: "Focus & patterns",
    tint: "bg-brand-purple/8",
    ring: "ring-brand-purple/25",
  },
  lifestyle: {
    Icon: Leaf,
    short: "Lifestyle & body",
    tint: "bg-brand-purple/8",
    ring: "ring-brand-purple/25",
  },
};

export function UnderstandYourselfSection() {
  const total = ASSESSMENTS.length;
  const groupOrder: GroupKey[] = ["core", "emotional", "patterns", "lifestyle"];

  return (
    <section className="group/section relative overflow-hidden rounded-3xl p-[1.5px] shadow-[0_24px_60px_-32px_rgba(126,107,175,0.55)] transition-shadow hover:shadow-[0_30px_70px_-30px_rgba(126,107,175,0.7)]">
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-brand-purple/35 via-white/40 to-[#C4B5FD]/40" />

      <div className="relative overflow-hidden rounded-[calc(1.5rem-1.5px)] bg-gradient-to-br from-white via-brand-lavender/30 to-white p-6 sm:p-7">
        <div className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full bg-gradient-to-br from-brand-purple/25 to-brand-purple-accent/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-16 h-56 w-56 rounded-full bg-gradient-to-br from-[#C4B5FD]/30 to-transparent blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgb(126 107 175) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-purple/20 bg-white/85 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-brand-purple shadow-sm backdrop-blur-md">
                {total} assessments
              </span>
              <span className="hidden h-px flex-1 bg-gradient-to-r from-brand-purple/25 to-transparent sm:block" />
            </div>

            <h2 className="mt-3 text-[22px] sm:text-[26px] font-bold leading-[1.1] tracking-tight">
              <span className="bg-gradient-to-br from-brand-purple-dark via-brand-purple to-brand-purple-dark bg-clip-text text-transparent">
                Understand yourself better
              </span>
            </h2>
            <p className="mt-2 max-w-[440px] text-[13.5px] leading-relaxed text-brand-purple-dark/65">
              Short, science-backed check-ins across mood, stress, focus and lifestyle —
              saved privately to your Health Passport.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
              {groupOrder.map((g) => {
                const { short, tint, ring } = GROUP_ICON[g];
                return (
                  <span
                    key={g}
                    className={`inline-flex items-center rounded-full ${tint} px-3 py-1 text-[11px] font-medium text-brand-purple ring-1 ${ring} transition hover:-translate-y-0.5`}
                  >
                    {short}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="flex sm:items-center">
            <Link
              to="/self-discovery"
              className="group/cta inline-flex flex-none items-center justify-center gap-1.5 rounded-full border border-brand-purple/30 bg-white/80 px-5 py-2.5 text-[13px] font-medium text-brand-purple no-underline shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-purple hover:bg-brand-purple hover:text-white hover:shadow-md hover:shadow-brand-purple/25"
            >
              Browse all {total}
              <ArrowRight
                className="h-3.5 w-3.5 transition-transform group-hover/cta:translate-x-0.5"
                strokeWidth={2.2}
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ReflectionRhythm({ attempts }: { attempts: PatternAttempt[] }) {
  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const { year, month } = view;
  const viewDate = new Date(year, month, 1);
  const monthName = viewDate.toLocaleString(undefined, { month: "long" });
  const yearLabel = ` ${year}`;
  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth();
  const isPastMonth =
    year < today.getFullYear() ||
    (year === today.getFullYear() && month < today.getMonth());
  const goPrev = () =>
    setView((v) => {
      const d = new Date(v.year, v.month - 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  const goNext = () =>
    setView((v) => {
      const d = new Date(v.year, v.month + 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  const canGoNext = !isCurrentMonth;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const todayDate = today.getDate();

  const byDay = new Map<number, number>();
  for (const a of attempts) {
    const d = new Date(a.takenAt);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }
  }
  const activeDays = byDay.size;

  const cells: Array<{ day: number | null; count: number }> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({ day: null, count: 0 });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ day: d, count: byDay.get(d) ?? 0 });

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-brand-purple-dark/45">
            Reflection rhythm
          </p>
          <p className="mt-1 text-[11px] font-medium text-brand-purple-dark/45">
            {activeDays} {activeDays === 1 ? "day" : "days"} in {monthName}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-brand-lavender/50 p-1.5 ring-1 ring-brand-purple/10">
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous month"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-brand-purple-dark transition hover:bg-white hover:shadow-sm"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="min-w-[88px] text-center text-[13px] font-semibold text-brand-purple-dark">
            {monthName}{yearLabel}
          </p>
          <button
            type="button"
            onClick={goNext}
            disabled={!canGoNext}
            aria-label="Next month"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-brand-purple-dark transition hover:bg-white hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-6 grid w-full grid-cols-7 gap-y-5 gap-x-2">
        {dayLabels.map((l, i) => (
          <p
            key={`rh-hdr-${i}`}
            className="pb-1 text-center text-[11px] font-bold uppercase tracking-wider text-brand-purple-dark/45"
          >
            {l}
          </p>
        ))}
        {cells.map((c, i) => {
          if (c.day === null)
            return <div key={`rh-pad-${i}`} className="aspect-square" />;
          const isToday = isCurrentMonth && c.day === todayDate;
          const isFuture =
            !isPastMonth && (!isCurrentMonth || c.day > todayDate);
          const hasReflection = c.count > 0;
          const dateLabel = new Date(year, month, c.day).toLocaleDateString(
            undefined,
            { weekday: "short", month: "short", day: "numeric" },
          );
          return (
            <div
              key={`rh-d-${c.day}`}
              className="group relative flex items-center justify-center"
            >
              <div
                aria-label={
                  hasReflection
                    ? `${dateLabel} — ${c.count} reflection${c.count > 1 ? "s" : ""}`
                    : dateLabel
                }
                className={`relative flex aspect-square w-full max-w-[48px] items-center justify-center rounded-full text-[13px] transition-all duration-200 ${
                  hasReflection
                    ? "bg-gradient-to-br from-brand-lavender to-brand-purple/25 text-brand-purple-dark font-semibold shadow-[0_4px_12px_-2px_rgba(123,104,199,0.25)]"
                    : isToday
                      ? "bg-gradient-to-br from-white to-brand-lavender/60 text-brand-purple-dark font-bold ring-2 ring-brand-purple shadow-[0_0_0_5px_rgba(123,104,199,0.12),0_8px_24px_-4px_rgba(123,104,199,0.45)]"
                      : isFuture
                        ? "text-brand-purple-dark/30 border border-dashed border-brand-purple/25"
                        : "bg-brand-lavender/45 text-brand-purple-dark/40"
                }`}
              >
                {hasReflection ? (
                  <span
                    aria-hidden
                    className="relative text-base font-bold text-brand-purple-dark drop-shadow-[0_0_4px_rgba(255,255,255,0.9)]"
                    style={{ animation: "pulse 2.6s ease-in-out infinite" }}
                  >
                    ✦
                  </span>
                ) : (
                  <span>{c.day}</span>
                )}
              </div>
              {hasReflection && (
                <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-brand-purple-dark px-2.5 py-1.5 text-[11px] font-medium text-white shadow-lg group-hover:block">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
                    {dateLabel}
                  </p>
                  <p className="mt-0.5">
                    {c.count} reflection{c.count > 1 ? "s" : ""}
                  </p>
                  <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-brand-purple-dark" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-sm text-brand-purple-dark/60">
        A gentle map of the days you paused to reflect. There's no streak to keep — every dot is enough.
      </p>
    </div>
  );
}