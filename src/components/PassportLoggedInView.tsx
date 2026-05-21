import { useMemo, useState } from "react";
import { Sparkles, CheckCircle2, ChevronLeft, ChevronRight, Copy, Send, FileText, TrendingUp, ClipboardList } from "lucide-react";

/**
 * Mock "logged-in" view of the Health Passport for developer reference.
 * Uses the sample user Maya (28, 6 weeks on Lubin) with fully populated data.
 * Visual language matches the existing passport page (brand-purple/lavender,
 * rounded-2xl cards, soft shadows). All values are static — no localStorage,
 * no real state. Purely a presentational mock.
 */

type MoodKey = "calm" | "okay" | "stressed" | "drained";
const MOOD_LABEL: Record<MoodKey, string> = {
  calm: "Calm",
  okay: "Okay",
  stressed: "Stressed",
  drained: "Drained",
};
const MOOD_EMOJI: Record<MoodKey, string> = {
  calm: "🌿",
  okay: "😊",
  stressed: "😣",
  drained: "😴",
};
const MOOD_COLOR: Record<MoodKey, string> = {
  calm: "#86C5A8",
  okay: "#A89BD0",
  stressed: "#E8A87C",
  drained: "#B8B8C8",
};

// 14 days of mood dots in May 2026
const MOOD_DAYS: Array<{ day: number; mood: MoodKey }> = [
  { day: 1, mood: "okay" },
  { day: 2, mood: "calm" },
  { day: 4, mood: "stressed" },
  { day: 5, mood: "okay" },
  { day: 7, mood: "drained" },
  { day: 8, mood: "okay" },
  { day: 10, mood: "calm" },
  { day: 11, mood: "okay" },
  { day: 13, mood: "stressed" },
  { day: 15, mood: "calm" },
  { day: 16, mood: "okay" },
  { day: 18, mood: "okay" },
  { day: 20, mood: "calm" },
  { day: 21, mood: "okay" },
];

const MOOD_MIX: Array<{ mood: MoodKey; pct: number }> = [
  { mood: "okay", pct: 40 },
  { mood: "calm", pct: 30 },
  { mood: "stressed", pct: 20 },
  { mood: "drained", pct: 10 },
];

const RECENT_CHECKINS: Array<{
  mood: MoodKey;
  note: string;
  date: string;
  time: string;
}> = [
  {
    mood: "okay",
    note: "Slept 7 hours. Big meeting went better than I feared.",
    date: "Thu, May 21",
    time: "8:42 AM",
  },
  {
    mood: "stressed",
    note: "Work deadline crept up. Skipped lunch.",
    date: "Wed, May 20",
    time: "6:15 PM",
  },
  {
    mood: "calm",
    note: "Long walk before dinner. Talked to mom.",
    date: "Tue, May 19",
    time: "9:08 PM",
  },
  {
    mood: "okay",
    note: "Tired but okay. Made it through standup.",
    date: "Mon, May 18",
    time: "10:22 AM",
  },
  {
    mood: "drained",
    note: "Didn't sleep well. Coffee not helping.",
    date: "Sun, May 17",
    time: "7:30 AM",
  },
];

const COMPLETED_ASSESSMENTS = [
  { name: "Mood Check", clinical: "PHQ-9", score: "12/27", date: "May 14" },
  { name: "Anxiety Check", clinical: "GAD-7", score: "9/21", date: "May 10" },
  { name: "Stress Check", clinical: "PSS-10", score: "18/40", date: "May 5" },
  { name: "Wellbeing Check", clinical: "WHO-5", score: "14/25", date: "Apr 28" },
];

const LUBIN_NOTICED = [
  "Your mood tends to dip on Sundays and lift by Tuesday",
  "Sleep comes up almost every time stress does",
  "You've been more reflective in the evenings this month",
];

const WHAT_WERE_NOTICING = [
  "Sleep has come up 4 times this week",
  "You've mentioned work stress on Monday and Wednesday",
  "Your mood has been steadily improving this month",
];

// 18 reflection days in May
const REFLECTION_DAYS = new Set([
  1, 2, 3, 5, 6, 7, 8, 10, 11, 13, 14, 15, 16, 18, 19, 20, 21, 22,
]);

const SHARE_INSIGHTS = [
  "Mood has been gradually improving over the last 6 weeks, with more 'okay' and 'calm' days than 'stressed' ones.",
  "Sleep is the most common theme across check-ins — better sleep tends to precede calmer days.",
  "Stress peaks midweek and tends to ease by the weekend, suggesting work-related triggers.",
];

type Tab = "today" | "patterns" | "share";

export default function PassportLoggedInView() {
  const [tab, setTab] = useState<Tab>("today");

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <header>
        <div className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1.5 ring-1 ring-brand-purple/15 backdrop-blur-sm">
          <Sparkles className="h-3 w-3 text-brand-purple" />
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-brand-purple">
            Your Health Passport
          </p>
        </div>
        <h1 className="mt-4 text-3xl md:text-[2.75rem] md:leading-[1.1] font-bold tracking-tight text-brand-purple-dark">
          Hi Maya <span className="inline-block">👋</span>
          <span className="block text-xl md:text-2xl font-medium text-brand-purple-dark/65 mt-2">
            Thursday, May 21 · 6 weeks with Lubin
          </span>
        </h1>
      </header>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-brand-purple/15">
        {([
          ["today", "Today"],
          ["patterns", "Patterns"],
          ["share", "Share"],
        ] as const).map(([key, label]) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`relative -mb-px pb-3 text-sm font-medium transition-colors ${
                active
                  ? "text-brand-purple-dark"
                  : "text-brand-purple-dark/50 hover:text-brand-purple-dark/80"
              }`}
            >
              {label}
              {active && (
                <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-brand-purple" />
              )}
            </button>
          );
        })}
      </div>

      {tab === "today" && <TodayTab />}
      {tab === "patterns" && <PatternsTab />}
      {tab === "share" && <ShareTab />}
    </div>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl bg-white p-6 shadow-[0_4px_20px_rgba(126,107,175,0.06)] ring-1 ring-brand-purple/8 ${className}`}
    >
      {children}
    </section>
  );
}

function TodayTab() {
  return (
    <div className="flex flex-col gap-5">
      {/* Greeting + What we're noticing */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="relative overflow-hidden bg-gradient-to-br from-white via-white to-brand-lavender/40">
          <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-brand-purple/15 blur-3xl" />
          <div className="relative">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-brand-purple">Today</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-brand-purple-dark">
              Hi Maya 👋
            </h2>
            <p className="mt-3 text-sm text-brand-purple-dark/65">Thursday, May 21</p>
          </div>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-white via-white to-brand-purple/[0.04]">
          <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-brand-purple-accent/25 blur-3xl" />
          <div className="relative">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-brand-purple">
              What we're noticing
            </p>
            <ul className="mt-4 space-y-2.5">
              {WHAT_WERE_NOTICING.map((line) => (
                <li
                  key={line}
                  className="flex gap-2 text-sm leading-relaxed text-brand-purple-dark/80"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-purple" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      {/* Already checked in today */}
      <Card className="relative overflow-hidden bg-gradient-to-r from-brand-lavender via-brand-purple-accent/40 to-brand-lavender">
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 ring-1 ring-brand-purple/15 backdrop-blur-sm">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-purple-dark/80">
                Daily check-in
              </p>
            </div>
            <p className="mt-3 text-xl font-bold text-brand-purple-dark">
              You already checked in today — feeling Okay 😊
            </p>
            <p className="mt-1 text-sm text-brand-purple-dark/65">
              Nice work. Come back tomorrow for another.
            </p>
          </div>
          <button className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white/80 px-5 py-2.5 text-sm font-semibold text-brand-purple-dark ring-1 ring-brand-purple/15 transition hover:bg-white">
            Edit check-in
          </button>
        </div>
      </Card>

      {/* Mood this month */}
      <MoodThisMonth />

      {/* Recent check-ins */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-white via-white to-brand-lavender/30">
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-brand-purple">
          Recent check-ins
        </p>
        <div className="mt-4 space-y-2.5">
          {RECENT_CHECKINS.map((c, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-xl bg-white px-4 py-3 ring-1 ring-brand-purple/10"
            >
              <span className="text-2xl" aria-hidden>
                {MOOD_EMOJI[c.mood]}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-brand-purple-dark">
                  {MOOD_LABEL[c.mood]}
                </p>
                <p className="text-xs text-brand-purple-dark/65 truncate">{c.note}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-brand-purple-dark/70">{c.date}</p>
                <p className="text-[11px] text-brand-purple-dark/45">{c.time}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function MoodThisMonth() {
  const [monthOffset, setMonthOffset] = useState(0);
  void monthOffset;
  const monthName = "May 2026";
  // May 2026: 31 days. May 1, 2026 is a Friday.
  const firstWeekday = 5;
  const daysInMonth = 31;
  const today = 21;

  const byDay = new Map<number, MoodKey>();
  MOOD_DAYS.forEach((d) => byDay.set(d.day, d.mood));

  const cells: Array<{ day: number | null; mood?: MoodKey }> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({ day: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, mood: byDay.get(d) });

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-white via-white to-brand-lavender/25">
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-brand-purple-dark">
            Mood this month
          </p>
          <p className="mt-1 text-[13px] font-medium text-brand-purple/80">
            Built automatically from your daily check-ins.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-brand-lavender/50 p-1.5 ring-1 ring-brand-purple/10">
          <button
            onClick={() => setMonthOffset((v) => v - 1)}
            aria-label="Previous month"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-brand-purple-dark transition hover:bg-white hover:shadow-sm"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="min-w-[88px] text-center text-[13px] font-semibold text-brand-purple-dark">
            {monthName}
          </p>
          <button
            disabled
            aria-label="Next month"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-brand-purple-dark opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:gap-12 lg:items-stretch">
        {/* Calendar */}
        <div className="lg:col-span-8">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-brand-purple-dark/45">
              Mood calendar
            </p>
            <p className="text-[11px] font-medium text-brand-purple-dark/45">
              14 days logged this month
            </p>
          </div>
          <div className="mt-6 grid grid-cols-7 gap-y-5 gap-x-2">
            {dayLabels.map((l, i) => (
              <p
                key={`hdr-${i}`}
                className="pb-1 text-center text-[11px] font-bold uppercase tracking-wider text-brand-purple-dark/45"
              >
                {l}
              </p>
            ))}
            {cells.map((c, i) => {
              if (c.day === null)
                return <div key={`pad-${i}`} className="aspect-square" />;
              const isToday = c.day === today;
              const isPast = c.day < today;
              const mood = c.mood;
              return (
                <div key={`d-${c.day}`} className="flex items-center justify-center">
                  <div
                    className={`relative flex aspect-square w-full max-w-[48px] items-center justify-center rounded-full text-[13px] ${
                      mood
                        ? "font-semibold text-brand-purple-dark shadow-[0_4px_12px_-2px_rgba(123,104,199,0.25)]"
                        : isToday
                          ? "bg-gradient-to-br from-white to-brand-lavender/60 text-brand-purple-dark font-bold ring-2 ring-brand-purple shadow-[0_0_0_5px_rgba(123,104,199,0.12)]"
                          : isPast
                            ? "bg-brand-lavender/45 text-brand-purple-dark/40"
                            : "text-brand-purple-dark/30 border border-dashed border-brand-purple/25"
                    }`}
                    style={
                      mood
                        ? { background: `linear-gradient(135deg, ${MOOD_COLOR[mood]}33, ${MOOD_COLOR[mood]}66)` }
                        : undefined
                    }
                  >
                    {mood ? (
                      <span className="text-lg leading-none" aria-hidden>
                        {MOOD_EMOJI[mood]}
                      </span>
                    ) : (
                      <span>{c.day}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mood mix */}
        <div className="lg:col-span-4">
          <div className="relative flex h-full w-full flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-brand-lavender/60 via-brand-lavender/30 to-white/40 p-6 ring-1 ring-brand-purple/10">
            <p className="text-[12px] font-bold tracking-tight text-brand-purple-dark">
              Mood Mix
            </p>
            <p className="mt-1 text-[11px] font-medium text-brand-purple/70">
              How your check-ins broke down
            </p>
            <ul className="mt-5 space-y-4">
              {MOOD_MIX.map((m) => (
                <li key={m.mood}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: MOOD_COLOR[m.mood] }}
                      />
                      <span className="text-xs font-semibold text-brand-purple-dark">
                        {MOOD_LABEL[m.mood]}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold tabular-nums text-brand-purple-dark/50">
                      {m.pct}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-purple/10">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${m.pct}%`, backgroundColor: MOOD_COLOR[m.mood] }}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-6">
              <div className="rounded-2xl bg-white/60 p-4 ring-1 ring-brand-purple/10">
                <p className="text-[10px] font-bold uppercase tracking-wider text-brand-purple-dark/45">
                  This month
                </p>
                <p className="mt-1.5 text-sm font-bold text-brand-purple-dark">
                  Mostly okay — 14 check-ins
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function PatternsTab() {
  return (
    <div className="flex flex-col gap-5">
      {/* What you've explored */}
      <Card>
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-brand-purple" />
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-brand-purple">
            What you've explored
          </p>
        </div>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {COMPLETED_ASSESSMENTS.map((a) => (
            <div
              key={a.clinical}
              className="flex items-center justify-between rounded-xl bg-brand-lavender/40 px-4 py-3 ring-1 ring-brand-purple/10"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-brand-purple-dark">
                  {a.name}{" "}
                  <span className="text-xs font-medium text-brand-purple-dark/55">
                    ({a.clinical})
                  </span>
                </p>
                <p className="text-xs text-brand-purple-dark/55">{a.date}</p>
              </div>
              <p className="text-sm font-bold tabular-nums text-brand-purple">{a.score}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Lubin noticed */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-white via-white to-brand-purple/[0.04]">
        <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-brand-purple/15 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-purple" />
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-brand-purple">
              Lubin noticed
            </p>
          </div>
          <ul className="mt-4 space-y-3">
            {LUBIN_NOTICED.map((line) => (
              <li
                key={line}
                className="flex gap-3 rounded-xl bg-white/80 px-4 py-3 ring-1 ring-brand-purple/10"
              >
                <TrendingUp className="h-4 w-4 shrink-0 mt-0.5 text-brand-purple" />
                <span className="text-sm leading-relaxed text-brand-purple-dark/85">
                  {line}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      {/* Reflection rhythm */}
      <Card>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-brand-purple">
            Reflection rhythm
          </p>
          <p className="text-[11px] text-brand-purple-dark/55">
            18 days logged in May
          </p>
        </div>
        <div className="mt-5 grid grid-cols-7 gap-2">
          {["S", "M", "T", "W", "T", "F", "S"].map((l, i) => (
            <p
              key={`r-hdr-${i}`}
              className="pb-1 text-center text-[10px] font-bold uppercase tracking-wider text-brand-purple-dark/45"
            >
              {l}
            </p>
          ))}
          {(() => {
            const cells: Array<{ day: number | null; logged: boolean }> = [];
            for (let i = 0; i < 5; i++) cells.push({ day: null, logged: false });
            for (let d = 1; d <= 31; d++)
              cells.push({ day: d, logged: REFLECTION_DAYS.has(d) });
            return cells.map((c, i) => {
              if (c.day === null) return <div key={`rp-${i}`} className="aspect-square" />;
              return (
                <div
                  key={`rd-${c.day}`}
                  className={`flex aspect-square items-center justify-center rounded-lg text-[11px] ${
                    c.logged
                      ? "bg-gradient-to-br from-brand-purple/30 to-brand-purple/50 text-white font-bold shadow-sm"
                      : "bg-brand-lavender/30 text-brand-purple-dark/40"
                  }`}
                >
                  {c.day}
                </div>
              );
            });
          })()}
        </div>
      </Card>
    </div>
  );
}

function ShareTab() {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-5">
      <Card className="relative overflow-hidden bg-gradient-to-br from-white via-white to-brand-lavender/30">
        <div aria-hidden className="pointer-events-none absolute -top-20 -right-20 h-48 w-48 rounded-full bg-brand-purple/15 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-brand-purple" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-purple">
              Ready to share
            </p>
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-brand-purple-dark">
            Maya's Wellness Summary
          </h2>
          <p className="text-sm font-medium text-brand-purple-dark/65">May 2026</p>

          <div className="mt-6 space-y-3">
            {SHARE_INSIGHTS.map((insight, i) => (
              <div
                key={i}
                className="flex gap-3 rounded-xl bg-white/80 px-4 py-4 ring-1 ring-brand-purple/10"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-purple/15 text-[11px] font-bold text-brand-purple">
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed text-brand-purple-dark/85">
                  {insight}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
            <button
              onClick={() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              }}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-brand-purple/20 bg-white px-5 py-3 text-sm font-semibold text-brand-purple-dark transition hover:border-brand-purple/40"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Link copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy link
                </>
              )}
            </button>
            <button className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-brand-purple px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(126,107,175,0.55)] transition hover:bg-brand-purple-dark">
              <Send className="h-4 w-4" />
              Share with provider
            </button>
          </div>

          <p className="mt-4 text-center text-[11px] text-brand-purple-dark/50">
            Only you control who sees this. Link expires in 7 days.
          </p>
        </div>
      </Card>
    </div>
  );
}