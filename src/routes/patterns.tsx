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
  ShieldCheck,
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
  loadAttempts,
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

const GROUP_ORNAMENT: Record<PatternGroup, string> = {
  core: "01",
  emotional: "02",
  patterns: "03",
  lifestyle: "04",
};

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

  // Build a per-assessment history (number of attempts + in-progress flag).
  const history =
    typeof window === "undefined"
      ? []
      : (() => {
          const all = loadAttempts();
          const counts = new Map<string, number>();
          for (const a of all) {
            counts.set(a.assessmentId, (counts.get(a.assessmentId) ?? 0) + 1);
          }
          const inProgressIds = new Set(
            listAllInProgress(ASSESSMENT_IDS).map((ip) => ip.assessmentId),
          );
          const ids = new Set<string>([...counts.keys(), ...inProgressIds]);
          return Array.from(ids)
            .map((id) => {
              const a = ASSESSMENTS.find((x) => x.id === id);
              if (!a) return null;
              const attempts = counts.get(id) ?? 0;
              const inProgress = inProgressIds.has(id);
              return { assessment: a, attempts, inProgress };
            })
            .filter((x): x is { assessment: Assessment; attempts: number; inProgress: boolean } => !!x)
            .sort((a, b) => b.attempts - a.attempts);
        })();

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
    <div
      className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#F5F3FF] via-[#EFEAFE] to-[#F5F3FF]"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {/* Decorative floating gradient blobs — matches the rest of Lubin */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-32 h-[440px] w-[440px] rounded-full bg-gradient-to-br from-brand-purple/30 to-brand-purple-accent/15 blur-3xl animate-blob" />
        <div className="absolute top-1/3 -right-40 h-[460px] w-[460px] rounded-full bg-gradient-to-br from-[#C4B5FD]/30 to-[#9990C9]/15 blur-3xl animate-blob [animation-delay:-6s]" />
        <div className="absolute bottom-0 left-1/4 h-[380px] w-[380px] rounded-full bg-gradient-to-br from-[#EAE6F4]/55 to-brand-purple/15 blur-3xl animate-blob [animation-delay:-12s]" />
      </div>

      <Navbar />

      <main className="relative px-4 pt-32 pb-24">
        <div className="mx-auto w-full max-w-[920px]">
          {/* Header */}
          <motion.header
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-center"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-purple/20 bg-white/70 px-4 py-1.5 text-[12px] font-medium text-brand-purple shadow-sm backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2.2} />
              Patterns
            </span>
            <h1 className="mt-6 text-[36px] font-bold leading-[1.05] tracking-tight text-shimmer md:text-[52px]">
              Understand the patterns behind how you feel.
            </h1>
            <p className="mx-auto mt-5 max-w-[560px] text-[15.5px] leading-[1.7] text-brand-purple-dark/65">
              Thirteen short check-ins drawn from trusted clinical tools — written in
              everyday language. Take what feels useful, skip what doesn't.
            </p>
            <p className="mt-3 text-[12.5px] text-brand-purple-dark/50">
              Each check is available again every {COOLDOWN_DAYS} days so your
              picture stays meaningful, not anxious.
            </p>
          </motion.header>

          {/* Availability signpost — make it obvious any assessment can be taken */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1, ease: "easeOut" }}
            className="mx-auto mt-10 flex w-full max-w-[680px] flex-col items-stretch gap-3 rounded-2xl border border-white/60 bg-white/75 p-4 shadow-[0_18px_50px_-28px_rgba(126,107,175,0.45)] backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:gap-5"
          >
            <div className="flex items-center gap-3">
              <span className="relative flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gradient-to-br from-brand-purple to-brand-purple-dark text-white shadow-[0_8px_20px_-8px_rgba(126,107,175,0.7)]">
                <PlayCircle className="h-4.5 w-4.5" strokeWidth={2} />
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white" />
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
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-br from-brand-purple to-brand-purple-dark px-5 py-2 text-[13px] font-semibold text-white no-underline shadow-[0_10px_24px_-10px_rgba(126,107,175,0.75)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-10px_rgba(126,107,175,0.85)]"
            >
              Browse check-ins
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
            </a>
          </motion.div>

          {/* Quick jump-to group chips */}
          <nav
            aria-label="Jump to a section"
            className="mt-6 flex flex-wrap items-center justify-center gap-2"
          >
            {GROUP_ORDER.map((g) => (
              <a
                key={g}
                href={`#group-${g}`}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToGroup(g);
                }}
                className="rounded-full border border-white/70 bg-white/60 px-4 py-1.5 text-[12.5px] font-medium text-brand-purple-dark no-underline shadow-sm backdrop-blur-md transition hover:-translate-y-0.5 hover:border-brand-purple/30 hover:bg-white"
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
            <section className="mt-12">
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
                      className="group flex items-center justify-between gap-4 rounded-2xl border border-white/70 bg-white/85 px-5 py-4 no-underline shadow-[0_14px_38px_-24px_rgba(126,107,175,0.45)] backdrop-blur-md transition hover:-translate-y-0.5 hover:border-brand-purple/30 hover:bg-white"
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
                            className="h-full rounded-full bg-gradient-to-r from-brand-purple to-brand-purple-accent"
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

          {/* Your check-in history */}
          {history.length > 0 && (
            <section className="mt-12" data-tick={tick}>
              <h2 className="text-[20px] font-semibold tracking-tight text-brand-purple-dark">
                Your check-in history
              </h2>
              <p className="mt-1 text-[13.5px] text-brand-purple-dark/60">
                Checks you've started or completed, saved privately to your passport.
              </p>
              <ul className="mt-5 space-y-3">
                {history.map(({ assessment: a, attempts, inProgress }) => (
                  <li key={a.id}>
                    <Link
                      to="/patterns/$slug"
                      params={{ slug: a.slug }}
                      className="group flex items-center justify-between gap-4 rounded-2xl border border-white/70 bg-white/85 px-5 py-4 no-underline shadow-[0_10px_30px_-22px_rgba(126,107,175,0.35)] backdrop-blur-md transition hover:-translate-y-0.5 hover:border-brand-purple/25 hover:bg-white hover:shadow-[0_18px_40px_-22px_rgba(126,107,175,0.5)]"
                    >
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold text-brand-purple-dark">
                          {a.name}
                        </p>
                        <p className="mt-0.5 text-[12.5px] text-brand-purple-dark/55">
                          {attempts === 0
                            ? "Just started"
                            : `${attempts} ${attempts === 1 ? "attempt" : "attempts"}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-full px-3 py-1 text-[11.5px] font-semibold ${
                            inProgress
                              ? "bg-brand-lavender text-brand-purple"
                              : "bg-brand-purple/10 text-brand-purple-dark"
                          }`}
                        >
                          {inProgress ? "In Progress" : "Completed"}
                        </span>
                        <ArrowRight
                          className="h-4 w-4 text-brand-purple/60 transition-transform group-hover:translate-x-0.5"
                          strokeWidth={2}
                        />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
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
                className="relative mt-20 scroll-mt-28"
                data-tick={tick}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute -left-2 -top-10 select-none text-[88px] font-bold leading-none text-brand-purple/[0.06] md:-left-12"
                >
                  {GROUP_ORNAMENT[group]}
                </span>
                <div className="relative flex items-end justify-between gap-4 border-b border-brand-purple/15 pb-4">
                  <div>
                    <h2 className="text-[22px] font-semibold tracking-tight text-brand-purple-dark">
                      {label.title}
                    </h2>
                    <p className="mt-1 text-[14px] text-brand-purple-dark/60">
                      {label.subtitle}
                    </p>
                  </div>
                  <span className="hidden whitespace-nowrap pb-1 text-[10.5px] font-bold uppercase tracking-[0.2em] text-brand-purple/60 md:inline">
                    {items.length} Available
                  </span>
                </div>

                <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {items.map((a) => (
                    <li key={a.id}>
                      <AssessmentCard assessment={a} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          {/* About these check-ins — closing reassurance */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            aria-labelledby="about-tools-heading"
            className="mx-auto mt-24 max-w-[640px] text-center"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-purple/15 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-purple shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.2} />
              Trusted by clinicians
            </span>
            <h2
              id="about-tools-heading"
              className="mt-5 text-[22px] font-semibold tracking-tight text-brand-purple-dark md:text-[24px]"
            >
              About these check-ins
            </h2>
            <p className="mx-auto mt-4 text-[14.5px] leading-[1.75] text-brand-purple-dark/70">
              Each check uses an internationally recognised screening tool —
              like the{" "}
              <span className="font-semibold text-brand-purple-dark">PHQ-9</span>{" "}
              for mood or{" "}
              <span className="font-semibold text-brand-purple-dark">GAD-7</span>{" "}
              for anxiety. These are the same tools used by mental health
              professionals worldwide. The clinical name is shown so you can
              look them up if you're curious — but they've been adapted into
              everyday language so they're easy to answer. They help you
              understand patterns, not diagnose conditions.
            </p>
            <div className="mx-auto mt-7 h-px w-16 bg-brand-purple/20" />
            <p className="mx-auto mt-5 max-w-[520px] text-[12.5px] italic leading-[1.7] text-brand-purple-dark/55">
              Based on internationally recognised screening tools developed by
              organisations like the World Health Organization. Adapted for
              everyday use, not intended as clinical diagnoses.
            </p>
          </motion.section>
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
      className={`group flex h-full flex-col rounded-2xl border bg-white p-6 transition-all duration-300 ${
        locked
          ? "border-[#EFEAFE] opacity-90"
          : "border-[#EFEAFE] shadow-sm hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-purple/10"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[17px] font-semibold leading-snug text-brand-purple-dark transition-colors group-hover:text-brand-purple">
          {assessment.name}
        </h3>
        <div className="flex flex-none items-center gap-2">
          {trend && <TrendBadge direction={trend} />}
          <span className="rounded-md bg-[#F5F3FF] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-purple">
            {assessment.clinicalName}
          </span>
        </div>
      </div>

      <p className="mt-3 flex-grow text-[13.5px] leading-[1.6] text-brand-purple-dark/70">
        {assessment.blurb}
      </p>

      {latest && (
        <p className="mt-4 rounded-xl border border-brand-purple/10 bg-brand-lavender/50 px-3 py-2 text-[12.5px] italic leading-snug text-brand-purple-dark/75">
          Last time: {latest.summary}
        </p>
      )}

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-[#F5F3FF] pt-5">
        <div className="flex items-center gap-3 text-[11.5px] font-medium text-brand-purple">
          {locked ? (
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" strokeWidth={2} />
              {formatDaysRemaining(daysLeft)}
            </span>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" strokeWidth={2} />
                {assessment.estMinutes} min
              </span>
              <span className="h-1 w-1 rounded-full bg-brand-purple/30" />
              <span>{assessment.questions.length} questions</span>
            </>
          )}
        </div>

        <Link
          to="/patterns/$slug"
          params={{ slug: assessment.slug }}
          className={`inline-flex items-center gap-1.5 rounded-lg px-5 py-2 text-[13px] font-semibold no-underline transition-all ${
            locked
              ? "bg-brand-lavender text-brand-purple-dark/60"
              : "bg-brand-purple-dark text-white hover:bg-brand-purple active:scale-95"
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