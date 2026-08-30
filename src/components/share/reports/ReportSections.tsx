import type { SummaryData } from "@/lib/share/summary";
import { ASSESSMENTS } from "@/lib/patterns/assessments";
import { Activity, CalendarCheck2, Lock, Sparkles, TrendingUp } from "lucide-react";

function SectionShell({
  eyebrow,
  icon,
  children,
}: {
  eyebrow: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#ECE7F6] bg-white p-5 shadow-[0_8px_30px_-20px_rgba(126,107,175,0.35)]">
      <div className="flex items-center gap-2">
        {icon ? (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#F4F0FB] text-[#7E6BAF]">
            {icon}
          </span>
        ) : null}
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7E6BAF]">
          {eyebrow}
        </h3>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function MoodPatternsSection({ summary }: { summary: SummaryData }) {
  // Sparkline-style bars from oldest → newest mood (1–5 scale).
  const series = [...summary.checkinsInRange]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((c) => Math.max(1, Math.min(5, Number(c.mood) || 3)));

  return (
    <SectionShell eyebrow="Mood patterns" icon={<Activity className="h-3.5 w-3.5" />}>
      <div className="grid gap-3 md:grid-cols-3">
        <Stat label="Overall mood" value={summary.moodLabel} />
        <Stat label="Stress" value={summary.stressLabel} />
        <Stat label="Direction" value={summary.directionLabel} trend={summary.directionLabel} />
      </div>

      <div className="mt-3 rounded-xl bg-[#FAF8FD] p-3 ring-1 ring-[#ECE7F6]">
        <p className="text-[11px] text-[#5A4A8A]">
          <span className="font-semibold text-[#3D2E6B]">{summary.checkinsInRange.length}</span>{" "}
          check-in{summary.checkinsInRange.length === 1 ? "" : "s"} logged across{" "}
          {summary.rangeLabel.toLowerCase()}.
        </p>
      </div>

      {series.length > 0 && (
        <div className="mt-4 rounded-xl bg-gradient-to-br from-[#FAF8FD] to-white p-4 ring-1 ring-[#ECE7F6]">
          <div className="flex items-end justify-between gap-1.5">
            {series.map((v, i) => {
              const h = 12 + (v / 5) * 56;
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-md bg-gradient-to-t from-[#7E6BAF] to-[#A89BCF]"
                    style={{ height: `${h}px` }}
                    aria-label={`Mood ${v} of 5`}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-[#7E6BAF]/70">
            <span>Earlier</span>
            <span>{series.length} check-ins</span>
            <span>Recent</span>
          </div>
        </div>
      )}
    </SectionShell>
  );
}

function Stat({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend?: string;
}) {
  const trendColor =
    trend === "Improving"
      ? "text-emerald-700 bg-emerald-50 ring-emerald-100"
      : trend === "Heavier"
        ? "text-amber-800 bg-amber-50 ring-amber-100"
        : "text-[#5A4A8A] bg-[#F4F0FB] ring-[#ECE7F6]";
  return (
    <div className="rounded-xl bg-[#FAF8FD] p-3 ring-1 ring-[#ECE7F6]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7E6BAF]">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-[#3D2E6B]">{value}</p>
      {trend && (
        <span
          className={`mt-2 inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-semibold ring-1 ${trendColor}`}
        >
          <TrendingUp className="h-3 w-3" />
          {trend}
        </span>
      )}
    </div>
  );
}

export function KeyTopicsSection({ summary }: { summary: SummaryData }) {
  if (summary.themes.length === 0) return null;
  const max = Math.max(...summary.themes.map((t) => t.count), 1);
  return (
    <SectionShell eyebrow="Key topics" icon={<Sparkles className="h-3.5 w-3.5" />}>
      <ul className="flex flex-wrap gap-2">
        {summary.themes.map((t) => {
          const weight = t.count / max;
          const intensity = 0.35 + weight * 0.55; // 0.35 → 0.9
          return (
            <li
              key={t.label}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-1 text-xs font-medium text-[#3D2E6B] ring-1 ring-[#ECE7F6]"
              style={{
                background: `rgba(126,107,175,${0.06 + weight * 0.12})`,
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: `rgba(126,107,175,${intensity})` }}
              />
              {t.label}
              <span className="text-[10px] font-semibold text-[#7E6BAF]">{t.count}×</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[11px] text-[#5A4A8A]">
        Drawn from short notes the user added during check-ins.
      </p>
    </SectionShell>
  );
}

export function AssessmentsSection({ summary }: { summary: SummaryData }) {
  if (summary.attemptsInRange.length === 0) return null;
  return (
    <SectionShell
      eyebrow="Validated screeners"
      icon={<CalendarCheck2 className="h-3.5 w-3.5" />}
    >
      <ul className="space-y-3">
        {summary.attemptsInRange.map((a) => {
          const meta = ASSESSMENTS.find((x) => x.id === a.assessmentId);
          const max = meta?.maxScore ?? 1;
          const pct = Math.min(100, Math.round((a.score / max) * 100));
          const bandTone =
            pct >= 66
              ? "from-rose-400 to-rose-500"
              : pct >= 33
                ? "from-amber-400 to-amber-500"
                : "from-emerald-400 to-emerald-500";
          return (
            <li
              key={a.id}
              className="rounded-xl bg-[#FAF8FD] p-3 ring-1 ring-[#ECE7F6]"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[#3D2E6B]">
                    {meta?.name ?? a.assessmentName}
                  </p>
                  <p className="text-[11px] text-[#5A4A8A]">
                    {new Date(a.takenAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    {a.summary ? ` · ${a.summary}` : ""}
                  </p>
                </div>
                <p className="text-sm font-bold text-[#3D2E6B]">
                  {a.score}
                  {meta ? <span className="text-[#7E6BAF]/70"> / {meta.maxScore}</span> : null}
                </p>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white ring-1 ring-[#ECE7F6]">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${bandTone}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[11px] text-[#5A4A8A]">
        Self-administered screeners. Bands shown for context — not a diagnostic instrument.
      </p>
    </SectionShell>
  );
}

export function CheckinCountSection({ summary }: { summary: SummaryData }) {
  return (
    <SectionShell eyebrow="Engagement" icon={<CalendarCheck2 className="h-3.5 w-3.5" />}>
      <div className="grid grid-cols-3 gap-3">
        <MiniStat n={summary.checkinsInRange.length} label="Check-ins" />
        <MiniStat n={summary.support.resourcesAccessed} label="Resources opened" />
        <MiniStat n={summary.support.appointmentsBooked} label="Appointments" />
      </div>
      <p className="mt-3 text-[11px] text-[#5A4A8A]">
        Logged across {summary.rangeLabel.toLowerCase()}.
      </p>
    </SectionShell>
  );
}

function MiniStat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-xl bg-[#FAF8FD] p-3 text-center ring-1 ring-[#ECE7F6]">
      <p className="text-2xl font-bold text-[#3D2E6B]">{n}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7E6BAF]">
        {label}
      </p>
    </div>
  );
}

export function NarrativeSection({ summary }: { summary: SummaryData }) {
  return (
    <SectionShell eyebrow="General feeling summary" icon={<Sparkles className="h-3.5 w-3.5" />}>
      <blockquote className="relative rounded-xl bg-gradient-to-br from-[#F4F0FB] to-white p-4 text-[15px] leading-relaxed text-[#3D2E6B] ring-1 ring-[#ECE7F6]">
        <span
          aria-hidden
          className="absolute -top-2 left-3 text-3xl leading-none text-[#7E6BAF]/40"
        >
          “
        </span>
        {summary.insight}
      </blockquote>
    </SectionShell>
  );
}

export function PrivacyFooter() {
  return (
    <footer className="mt-8 rounded-2xl border border-[#ECE7F6] bg-[#FAF8FD] p-4 text-center">
      <div className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1 text-[11px] font-semibold text-[#7E6BAF] ring-1 ring-[#ECE7F6]">
        <Lock className="h-3 w-3" /> User-owned · Voluntarily shared
      </div>
      <p className="mx-auto mt-3 max-w-xl text-[11px] leading-relaxed text-[#5A4A8A]">
        Self-reported. Not a clinical diagnosis. Private chat conversations and
        personal notes are never shared. The recipient sees only the sections the
        user selected.
      </p>
    </footer>
  );
}

export function renderIncluded(summary: SummaryData, includedKeys: string[]) {
  const has = (k: string) => includedKeys.includes(k);
  return (
    <div className="space-y-4">
      {has("mood") && <MoodPatternsSection summary={summary} />}
      {has("assessments") && <AssessmentsSection summary={summary} />}
    </div>
  );
}