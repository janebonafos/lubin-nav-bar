import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Clock,
  Lock,
  Sparkles,
  PlayCircle,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import {
  ASSESSMENTS,
  ASSESSMENT_IDS,
  GROUP_LABELS,
} from "@/lib/patterns/assessments";
import {
  COOLDOWN_DAYS,
  computeTrend,
  daysUntilAvailable,
  formatDaysRemaining,
  isLocked,
} from "@/lib/patterns/scoring";
import {
  getAttemptsFor,
  getLatestAttempt,
  listAllInProgress,
  loadInProgress,
} from "@/lib/patterns/storage";
import type { Assessment, PatternGroup, TrendDirection } from "@/lib/patterns/types";

export const Route = createFileRoute("/patterns")({
  head: () => ({
    meta: [
      { title: "Patterns — Lubin" },
      {
        name: "description",
        content:
          "Gentle, clinically grounded check-ins for mood, anxiety, sleep, focus and more — at your own pace.",
      },
      { property: "og:title", content: "Patterns — Lubin" },
      {
        property: "og:description",
        content:
          "13 warm, clinically faithful check-ins to help you understand the patterns behind how you feel.",
      },
    ],
  }),
  component: PatternsPage,
});

const GROUP_ORDER: PatternGroup[] = ["core", "emotional", "patterns", "lifestyle"];

function PatternsPage() {
  // Bump on focus / visibility so locked timers and completion state refresh.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const onFocus = () => setTick((t) => t + 1);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  const inProgressAll =
    typeof window === "undefined" ? [] : listAllInProgress(ASSESSMENT_IDS);

  // Count how many check-ins are available to take right now (not in cooldown).
  const availableNow =
    typeof window === "undefined"
      ? ASSESSMENTS.length
      : ASSESSMENTS.filter((a) => !isLocked(getLatestAttempt(a.id))).length;

  const scrollToGroup = (group: PatternGroup) => {
    const el = document.getElementById(`group-${group}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-brand-lavender/60">
      <Navbar />

      <main className="px-4 pt-32 pb-20">
        <div className="mx-auto w-full max-w-[920px]">
          {/* Header */}
          <motion.header
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-center"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-purple">
              <Sparkles className="h-3 w-3" strokeWidth={2.2} />
              Patterns
            </span>
            <h1 className="mt-5 text-[34px] font-semibold leading-tight text-brand-purple-dark md:text-[44px]">
              Understand the patterns behind how you feel.
            </h1>
            <p className="mx-auto mt-4 max-w-[560px] text-[15.5px] leading-[1.65] text-brand-purple-dark/70">
              Thirteen short check-ins drawn from trusted clinical tools — written in
              everyday language. Take what feels useful, skip what doesn't.
            </p>
            <p className="mt-3 text-[12.5px] text-brand-purple-dark/55">
              Each check is available again every {COOLDOWN_DAYS} days so your
              picture stays meaningful, not anxious.
            </p>
          </motion.header>

          {/* Availability signpost — make it obvious any assessment can be taken */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1, ease: "easeOut" }}
            className="mx-auto mt-8 flex w-full max-w-[680px] flex-col items-stretch gap-3 rounded-2xl border border-brand-purple/15 bg-white/80 p-4 shadow-[0_10px_30px_-22px_rgba(126,107,175,0.45)] sm:flex-row sm:items-center sm:justify-between sm:gap-5"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand-purple/10 text-brand-purple">
                <PlayCircle className="h-4.5 w-4.5" strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-brand-purple-dark">
                  {availableNow} of {ASSESSMENTS.length} check-ins ready to take
                </p>
                <p className="mt-0.5 text-[12.5px] text-brand-purple-dark/65">
                  Pick any one below — there's no required order.
                </p>
              </div>
            </div>
            <a
              href="#group-core"
              onClick={(e) => {
                e.preventDefault();
                scrollToGroup("core");
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-purple px-4 py-2 text-[13px] font-semibold text-white no-underline shadow-[0_8px_20px_-10px_rgba(126,107,175,0.7)] transition hover:-translate-y-0.5 hover:bg-brand-purple-dark"
            >
              Browse check-ins
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
            </a>
          </motion.div>

          {/* Quick jump-to group chips */}
          <nav
            aria-label="Jump to a section"
            className="mt-5 flex flex-wrap items-center justify-center gap-2"
          >
            {GROUP_ORDER.map((g) => (
              <a
                key={g}
                href={`#group-${g}`}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToGroup(g);
                }}
                className="rounded-full border border-brand-purple/20 bg-white/70 px-3.5 py-1.5 text-[12.5px] font-medium text-brand-purple-dark no-underline transition hover:border-brand-purple/40 hover:bg-white"
              >
                {GROUP_LABELS[g].title}
                <span className="ml-1.5 text-brand-purple-dark/50">
                  {ASSESSMENTS.filter((a) => a.group === g).length}
                </span>
              </a>
            ))}
          </nav>

          {/* In-progress strip */}
          {inProgressAll.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-purple-accent">
                Continue where you left off
              </h2>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                {inProgressAll.map((ip) => {
                  const a = ASSESSMENTS.find((x) => x.id === ip.assessmentId);
                  if (!a) return null;
                  const answered = ip.answers.filter((v) => v !== null).length;
                  const pct = Math.round((answered / a.questions.length) * 100);
                  return (
                    <Link
                      key={a.id}
                      to="/patterns/$slug"
                      params={{ slug: a.slug }}
                      className="group flex items-center justify-between gap-4 rounded-2xl border border-brand-purple/15 bg-white px-5 py-4 no-underline shadow-[0_10px_30px_-20px_rgba(126,107,175,0.4)] transition hover:-translate-y-0.5 hover:border-brand-purple/35"
                    >
                      <div className="min-w-0">
                        <p className="text-[14.5px] font-semibold text-brand-purple-dark">
                          {a.name}
                        </p>
                        <p className="mt-0.5 text-[12.5px] text-brand-purple-dark/60">
                          {answered} of {a.questions.length} answered · {pct}%
                        </p>
                        <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-brand-lavender">
                          <div
                            className="h-full rounded-full bg-brand-purple"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <ArrowRight
                        className="h-4 w-4 flex-none text-brand-purple transition-transform group-hover:translate-x-0.5"
                        strokeWidth={2}
                      />
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Groups */}
          {GROUP_ORDER.map((group) => {
            const items = ASSESSMENTS.filter((a) => a.group === group);
            const label = GROUP_LABELS[group];
            return (
              <section
                key={group}
                id={`group-${group}`}
                className="mt-12 scroll-mt-28"
                data-tick={tick}
              >
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-[20px] font-semibold text-brand-purple-dark">
                      {label.title}
                    </h2>
                    <p className="mt-1 text-[14px] text-brand-purple-dark/65">
                      {label.subtitle}
                    </p>
                  </div>
                  <span className="hidden text-[12px] font-medium text-brand-purple-dark/55 md:inline">
                    {items.length} available
                  </span>
                </div>

                <ul className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {items.map((a) => (
                    <li key={a.id}>
                      <AssessmentCard assessment={a} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}

function AssessmentCard({ assessment }: { assessment: Assessment }) {
  const latest =
    typeof window === "undefined" ? null : getLatestAttempt(assessment.id);
  const locked = isLocked(latest);
  const daysLeft = daysUntilAvailable(latest);
  const hasInProgress =
    typeof window !== "undefined" && !!loadInProgress(assessment.id);
  const allAttempts =
    typeof window === "undefined" ? [] : getAttemptsFor(assessment.id);
  const trend = computeTrend(assessment, allAttempts);

  return (
    <div
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-white p-5 transition ${
        locked
          ? "border-brand-purple/10 opacity-90"
          : "border-brand-purple/15 hover:-translate-y-0.5 hover:border-brand-purple/35 hover:shadow-[0_18px_40px_-24px_rgba(126,107,175,0.5)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[16px] font-semibold leading-snug text-brand-purple-dark">
            {assessment.name}
          </p>
          <p className="mt-0.5 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-brand-purple/60">
            {assessment.clinicalName}
          </p>
        </div>
        {trend && <TrendBadge direction={trend} />}
      </div>

      <p className="mt-3 text-[13.5px] leading-[1.55] text-brand-purple-dark/70">
        {assessment.blurb}
      </p>

      <div className="mt-4 flex items-center gap-3 text-[12px] text-brand-purple-dark/55">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" strokeWidth={2} />
          {assessment.estMinutes} min
        </span>
        <span>·</span>
        <span>{assessment.questions.length} questions</span>
      </div>

      {latest && (
        <p className="mt-4 rounded-xl bg-brand-lavender/60 px-3 py-2 text-[12.5px] italic leading-snug text-brand-purple-dark/75">
          Last time: {latest.summary}
        </p>
      )}

      <div className="mt-5 flex items-center justify-between gap-3 pt-1">
        {locked ? (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-brand-purple-dark/55">
            <Lock className="h-3.5 w-3.5" strokeWidth={2} />
            {formatDaysRemaining(daysLeft)}
          </span>
        ) : (
          <span className="text-[12.5px] text-brand-purple-dark/55">
            {hasInProgress ? "Saved progress available" : "Ready when you are"}
          </span>
        )}

        <Link
          to="/patterns/$slug"
          params={{ slug: assessment.slug }}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold no-underline transition ${
            locked
              ? "bg-brand-lavender text-brand-purple-dark/60"
              : "bg-brand-purple text-white shadow-[0_8px_20px_-10px_rgba(126,107,175,0.7)] hover:-translate-y-0.5 hover:bg-brand-purple-dark"
          }`}
        >
          {locked ? "View" : hasInProgress ? "Continue" : "Start"}
          {!locked && <PlayCircle className="h-3.5 w-3.5" strokeWidth={2.2} />}
        </Link>
      </div>
    </div>
  );
}

function TrendBadge({ direction }: { direction: NonNullable<TrendDirection> }) {
  const config =
    direction === "up"
      ? { Icon: TrendingUp, label: "Easing", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" }
      : direction === "down"
      ? { Icon: TrendingDown, label: "Heavier", className: "bg-amber-50 text-amber-700 ring-amber-200" }
      : { Icon: Minus, label: "Steady", className: "bg-brand-lavender text-brand-purple ring-brand-purple/15" };
  const { Icon, label, className } = config;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] ring-1 ${className}`}
    >
      <Icon className="h-3 w-3" strokeWidth={2.2} />
      {label}
    </span>
  );
}