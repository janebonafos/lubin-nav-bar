import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  Lock,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
  Share2,
  Sparkles,
  X,
} from "lucide-react";
import {
  ASSESSMENTS_BY_SLUG,
  PHQ9_SELF_HARM_INDEX,
} from "@/lib/patterns/assessments";
import {
  clearInProgress,
  getAttemptsFor,
  getLatestAttempt,
  hasSeenIntro,
  loadInProgress,
  markIntroSeen,
  saveAttempt,
  saveInProgress,
} from "@/lib/patterns/storage";
import {
  daysUntilAvailable,
  formatDaysRemaining,
  isLocked,
} from "@/lib/patterns/scoring";
import type { Assessment, Attempt } from "@/lib/patterns/types";
import CrisisOverlay from "@/components/patterns/CrisisOverlay";
import BreathingPause from "@/components/patterns/BreathingPause";

const ABOUT_COPY: Record<string, string> = {
  "phq-9":
    "This check is based on the PHQ-9 — one of the most widely used mood screening tools in the world, developed by Drs. Kroenke and Spitzer. It helps you notice patterns in how your mood and energy have been lately. It's used by doctors and therapists globally as a starting point for understanding low mood.",
  "who-5":
    "This check is based on the WHO-5 Wellbeing Index — developed by the World Health Organization. It's one of the simplest and most trusted tools for understanding your general sense of wellbeing. It's used internationally across healthcare settings.",
  "pss-10":
    "This check is based on the PSS-10 — a widely used stress measurement tool developed by researchers at Carnegie Mellon University. It helps you understand how much stress you've been carrying over the past month. It's used by health professionals worldwide to help people notice stress patterns.",
  "gad-7":
    "This check is based on the GAD-7 — a widely used anxiety screening tool developed and validated in 2006. It helps you understand how anxiety and worry have been showing up in your life recently. It's used by health professionals worldwide to help people recognise anxiety patterns.",
  "pcl-5":
    "This check is based on the PCL-5 — developed by the US National Center for PTSD. It helps you notice how past or recent difficult experiences may be affecting you. This check covers some sensitive topics — please go at your own pace and skip anything that feels too much right now.",
  "oci-r":
    "This check is based on the OCI-R — a widely used tool to help people notice patterns around intrusive or unwanted thoughts and behaviours. It covers some personal topics — go at your own pace.",
  "pdss-sr":
    "This check is based on the PDSS-SR — a self-report tool used to help people understand patterns around panic and intense anxiety episodes.",
  spin:
    "This check is based on the SPIN — developed to help people understand patterns around social situations and comfort. It's widely used to help people notice social anxiety patterns.",
  "sleep-rest":
    "This is a custom sleep check created by Lubin.AI based on widely recognised sleep quality indicators. It helps you reflect on how your sleep and rest have been affecting you lately.",
  "asrs-6":
    "This check is based on the ASRS v1.1 — developed by the World Health Organization to help adults notice patterns around focus, attention, and restlessness. It's not a diagnosis tool — it simply helps surface patterns that might be worth exploring further.",
  scoff:
    "This check is based on the SCOFF — a brief screening tool developed to help people reflect on their relationship with food and their body. It covers some sensitive topics — please be gentle with yourself as you go through it.",
  audit:
    "This check is based on the AUDIT — developed by the World Health Organization to help people reflect on their relationship with alcohol over the past year. It's used by health professionals globally.",
  mdq:
    "This check is based on the MDQ — a screening tool used to help people notice significant patterns in energy, mood, and behaviour. It covers a range of experiences — answer as honestly as you can.",
};

export const Route = createFileRoute("/self-discovery_/$slug")({
  head: ({ params }) => {
    const a = ASSESSMENTS_BY_SLUG[params.slug];
    const title = a ? `${a.name} — Lubin` : "Check-in — Lubin";
    const description = a
      ? a.blurb
      : "A gentle, clinically grounded check-in from Lubin.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  validateSearch: (search: Record<string, unknown>) => ({
    attempt:
      typeof search.attempt === "string" && search.attempt.length > 0
        ? search.attempt
        : undefined,
  }),
  component: PatternRunPage,
  notFoundComponent: () => <NotFound />,
  pendingComponent: () => <PatternLoading />,
  pendingMs: 0,
  pendingMinMs: 300,
});

function PatternLoading() {
  const isViewingResult =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("attempt");
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#F5F3FF] via-[#EFEAFE] to-[#F5F3FF]"
      role="status"
      aria-label={isViewingResult ? "Loading your result" : "Loading check-in"}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-2 border-brand-purple/15" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-brand-purple" />
        </div>
        <p className="text-[13px] font-medium text-brand-purple-dark/60">
          {isViewingResult ? "Loading your result…" : "Getting your check-in ready…"}
        </p>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-lavender/60 px-4 text-center">
      <div>
        <h1 className="text-2xl font-semibold text-brand-purple-dark">
          We couldn't find that check-in.
        </h1>
        <Link
          to="/patterns"
          className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white no-underline shadow-[0_8px_20px_-6px_rgba(126,107,175,0.55)] transition hover:-translate-y-0.5 hover:bg-brand-purple-dark"
        >
          Back to Patterns
        </Link>
      </div>
    </div>
  );
}

type Phase =
  | "intro"
  | "locked"
  | "preparing"
  | "questions"
  | "breathing"
  | "result";

function PatternRunPage() {
  const { slug } = Route.useParams();
  const assessment = ASSESSMENTS_BY_SLUG[slug];

  if (!assessment) {
    return <NotFound />;
  }

  return <Runner assessment={assessment} />;
}

function Runner({ assessment }: { assessment: Assessment }) {
  const navigate = useNavigate();
  const { attempt: attemptId } = Route.useSearch();
  const total = assessment.questions.length;

  // Bootstrap from storage (browser-only).
  const [phase, setPhase] = useState<Phase>("intro");
  const [answers, setAnswers] = useState<(number | null)[]>(() =>
    Array(total).fill(null),
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedAttempt, setCompletedAttempt] = useState<Attempt | null>(null);
  const [crisisOpen, setCrisisOpen] = useState(false);
  const breathingShownRef = useRef(false);
  const crisisShownRef = useRef(false);
  const [latestLocked, setLatestLocked] = useState<Attempt | null>(null);
  const startedAtRef = useRef<number>(Date.now());

  // One-time browser bootstrap.
  useEffect(() => {
    if (typeof window === "undefined") return;
    // If a specific past attempt is requested, jump straight to its result.
    if (attemptId) {
      const past = getAttemptsFor(assessment.id).find((a) => a.id === attemptId);
      if (past) {
        setCompletedAttempt(past);
        setPhase("result");
        return;
      }
    }
    const ip = loadInProgress(assessment.id);
    if (ip && ip.answers.length === total) {
      setAnswers(ip.answers);
      setCurrentIndex(Math.min(ip.currentIndex, total - 1));
      startedAtRef.current = ip.startedAt ?? Date.now();
      setPhase("questions");
      return;
    }
    setPhase(hasSeenIntro(assessment.id) ? "questions" : "intro");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessment.id, attemptId]);

  // Persist progress whenever answers change in question phase.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (phase !== "questions") return;
    const answeredCount = answers.filter((v) => v !== null).length;
    const lastIndex = answers.reduce<number>(
      (acc, v, i) => (v !== null ? i : acc),
      -1,
    );
    saveInProgress({
      assessmentId: assessment.id,
      assessmentName: assessment.name,
      total,
      answeredCount,
      lastIndex: Math.max(0, lastIndex),
      answers,
      currentIndex,
      startedAt: startedAtRef.current,
      updatedAt: Date.now(),
    });
  }, [answers, currentIndex, phase, assessment.id, assessment.name, total]);

  function startNow() {
    markIntroSeen(assessment.id);
    setPhase("questions");
  }

  function handleAnswer(value: number) {
    const next = [...answers];
    next[currentIndex] = value;
    setAnswers(next);

    // Crisis gate: PHQ-9 Q9 self-harm item > 0.
    if (
      assessment.id === "phq-9" &&
      currentIndex === PHQ9_SELF_HARM_INDEX &&
      value > 0 &&
      !crisisShownRef.current
    ) {
      crisisShownRef.current = true;
      setCrisisOpen(true);
      return;
    }

    // Soft-settle gate.
    const projected = next.reduce<number>((sum, v) => sum + (v ?? 0), 0);
    const threshold = assessment.softSettleThreshold ?? 0;
    const shouldPause =
      !breathingShownRef.current &&
      threshold > 0 &&
      projected >= assessment.maxScore * threshold &&
      currentIndex < total - 1;

    if (shouldPause) {
      breathingShownRef.current = true;
      // Move index forward first so resuming after pause goes to next question.
      setCurrentIndex(currentIndex + 1);
      setPhase("breathing");
      return;
    }

    advance(next);
  }

  function advance(currentAnswers: (number | null)[]) {
    if (currentIndex < total - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      finishAttempt(currentAnswers);
    }
  }

  function finishAttempt(finalAnswers: (number | null)[]) {
    const normalized = finalAnswers.map((v) => v ?? 0);
    const score = normalized.reduce((s, v) => s + v, 0);
    const attempt: Attempt = {
      id: `${assessment.id}-${Date.now()}`,
      assessmentId: assessment.id,
      assessmentName: assessment.name,
      score,
      summary: assessment.summarize(score),
      takenAt: Date.now(),
      answers: normalized,
    };
    saveAttempt(attempt);
    clearInProgress(assessment.id);
    setCompletedAttempt(attempt);
    setPhase("result");
  }

  function goBack() {
    if (currentIndex === 0) return;
    setCurrentIndex(currentIndex - 1);
  }

  // ============================
  // Render
  // ============================

  return (
    <div className="min-h-screen bg-brand-lavender/60">
      <header className="px-4 pt-6">
        <div className="mx-auto flex w-full max-w-[760px] items-center justify-between">
          <Link
            to="/patterns"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3.5 py-2 text-[13px] font-medium text-brand-purple-dark no-underline shadow-sm transition hover:bg-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
            All check-ins
          </Link>
          <button
            type="button"
            onClick={() => navigate({ to: "/patterns" })}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-brand-purple-dark/60 transition hover:bg-white/60 hover:text-brand-purple-dark"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="px-4 pb-20 pt-6">
        <div className="mx-auto w-full max-w-[760px]">
          {(phase === "intro" || phase === "questions") && (
            <IntroView
              assessment={assessment}
              onStart={startNow}
              started={phase === "questions"}
            />
          )}
          <AnimatePresence mode="wait">
            {phase === "preparing" && (
              <PreparingView key="preparing" />
            )}
            {phase === "locked" && latestLocked && (
              <LockedView
                key="locked"
                assessment={assessment}
                latest={latestLocked}
              />
            )}
            {phase === "questions" && (
              <div key={`q-${currentIndex}`} className="mt-6">
                <QuestionView
                  assessment={assessment}
                  index={currentIndex}
                  total={total}
                  selected={answers[currentIndex]}
                  onAnswer={handleAnswer}
                  onBack={goBack}
                />
              </div>
            )}
            {phase === "breathing" && (
              <BreathingPause
                key="breathing"
                onSkip={() => setPhase("questions")}
                onComplete={() => setPhase("questions")}
              />
            )}
            {phase === "result" && completedAttempt && (
              <ResultView
                key="result"
                assessment={assessment}
                attempt={completedAttempt}
              />
            )}
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {crisisOpen && (
          <CrisisOverlay onDismiss={() => setCrisisOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// Intro
// ============================================================

function IntroView({
  assessment,
  onStart,
  started = false,
}: {
  assessment: Assessment;
  onStart: () => void;
  started?: boolean;
}) {
  const [isStarting, setIsStarting] = useState(false);
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative mt-8 rounded-2xl border border-brand-purple/10 bg-white p-6 shadow-[0_14px_38px_-24px_rgba(126,107,175,0.45)] md:p-7"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <header className="mb-5">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-purple">
          Before you begin
        </span>
        <h1 className="mt-2 text-[28px] font-bold leading-[1.1] tracking-tight text-brand-purple-dark md:text-[32px]">
          {assessment.name}
        </h1>
        <p className="mt-1.5 text-[10.5px] font-bold uppercase tracking-widest text-brand-purple/60">
          Based on the {assessment.clinicalName}
        </p>
      </header>

      <div className="mb-6 space-y-3">
        <p className="text-[15px] leading-relaxed text-brand-purple-dark">
          {assessment.introWhat}
        </p>
        <p className="text-[14px] leading-relaxed text-brand-purple">
          {assessment.introWhy}
        </p>
      </div>

      <dl className="mb-6 flex flex-wrap items-center gap-y-3 border-y border-brand-lavender py-4">
        <InfoStat label="Time" value={`~${assessment.estMinutes} min`} />
        <span aria-hidden className="hidden h-8 w-px bg-brand-lavender sm:block" />
        <InfoStat
          label="Questions"
          value={`${assessment.questions.length} total`}
          indent
        />
        <span aria-hidden className="hidden h-8 w-px bg-brand-lavender sm:block" />
        <InfoStat label="Privacy" value="On-device" indent />
      </dl>

      {ABOUT_COPY[assessment.id] && (
        <section className="mb-6 rounded-xl bg-brand-lavender/40 p-4">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-purple">
            About this check
          </p>
          <p className="text-[13.5px] leading-relaxed text-brand-purple-dark/80">
            {ABOUT_COPY[assessment.id]}
          </p>
        </section>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {!started && (
          <button
            type="button"
            onClick={() => {
              if (isStarting) return;
              setIsStarting(true);
              onStart();
            }}
            disabled={isStarting}
            className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-purple px-8 py-3.5 text-center text-[14.5px] font-semibold text-white shadow-lg shadow-brand-purple/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-purple-dark hover:shadow-[0_12px_24px_-8px_rgba(61,46,107,0.55)] active:translate-y-0 disabled:cursor-wait disabled:opacity-90 disabled:hover:translate-y-0"
          >
            {isStarting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Preparing…
              </>
            ) : (
              <>
                I'm ready
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  strokeWidth={2.2}
                />
              </>
            )}
          </button>
        )}
        <p className="whitespace-nowrap text-[11.5px] leading-relaxed text-brand-purple/70">
          You can pause or leave at any moment — nothing is saved until you finish.
        </p>
      </div>
    </motion.section>
  );
}

// ============================================================
// Preparing (between intro and first question)
// ============================================================

function PreparingView() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="mt-20 flex flex-col items-center gap-4"
      role="status"
      aria-label="Preparing your check-in"
    >
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full border-2 border-brand-purple/15" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-brand-purple" />
      </div>
      <p className="text-[13px] font-medium text-brand-purple-dark/60">
        Getting your first question ready…
      </p>
    </motion.section>
  );
}

function InfoStat({
  label,
  value,
  indent = false,
}: {
  label: string;
  value: string;
  indent?: boolean;
}) {
  return (
    <div
      className={`flex min-w-[100px] flex-1 flex-col ${indent ? "sm:pl-8" : ""}`}
    >
      <dt className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-brand-purple/60">
        {label}
      </dt>
      <dd className="text-[14px] font-medium text-brand-purple-dark">
        {value}
      </dd>
    </div>
  );
}

// ============================================================
// Locked
// ============================================================

function LockedView({
  assessment,
  latest,
}: {
  assessment: Assessment;
  latest: Attempt;
}) {
  const daysLeft = daysUntilAvailable(latest);
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="mt-6 rounded-3xl bg-white p-8 text-center shadow-[0_24px_80px_-40px_rgba(126,107,175,0.45)] ring-1 ring-brand-purple/10 md:p-10"
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-lavender text-brand-purple">
        <Lock className="h-5 w-5" strokeWidth={2} />
      </div>
      <h1 className="mt-5 text-[26px] font-semibold leading-tight text-brand-purple-dark">
        {assessment.name} is resting.
      </h1>
      <p className="mt-3 text-[14.5px] leading-[1.65] text-brand-purple-dark/65">
        Taking the same check too often can make small mood ripples feel like
        big trends. {formatDaysRemaining(daysLeft)}.
      </p>

      <div className="mt-8 rounded-2xl bg-brand-lavender/50 p-5 text-left">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-brand-purple">
          Last time
        </p>
        <p className="mt-2 text-[15px] italic leading-relaxed text-brand-purple-dark/85">
          {latest.summary}
        </p>
        <p className="mt-2 text-[12.5px] text-brand-purple-dark/55">
          Taken {new Date(latest.takenAt).toLocaleDateString()}
        </p>
      </div>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          to="/patterns"
          className="inline-flex items-center gap-1.5 rounded-full border border-brand-purple/25 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-brand-purple-dark no-underline transition hover:border-brand-purple/50"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
          Other check-ins
        </Link>
        <Link
          to="/chat"
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-purple px-5 py-2.5 text-[13.5px] font-semibold text-white no-underline shadow-[0_8px_20px_-10px_rgba(126,107,175,0.7)] transition hover:-translate-y-0.5 hover:bg-brand-purple-dark"
        >
          <MessageCircle className="h-3.5 w-3.5" strokeWidth={2.2} />
          Talk it through
        </Link>
      </div>
    </motion.section>
  );
}

// ============================================================
// Question
// ============================================================

function QuestionView({
  assessment,
  index,
  total,
  selected,
  onAnswer,
  onBack,
}: {
  assessment: Assessment;
  index: number;
  total: number;
  selected: number | null;
  onAnswer: (value: number) => void;
  onBack: () => void;
}) {
  const q = assessment.questions[index];
  const pct = Math.round(((index + (selected !== null ? 1 : 0)) / total) * 100);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="mt-2"
    >
      {/* Progress */}
      <div className="flex items-center gap-4">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/70">
          <motion.div
            className="h-full rounded-full bg-brand-purple"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
        <span className="text-[12px] font-medium tabular-nums text-brand-purple-dark/55">
          {index + 1} / {total}
        </span>
      </div>

      <motion.div
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="mt-8 rounded-2xl border border-brand-purple/10 bg-white p-6 shadow-[0_14px_38px_-24px_rgba(126,107,175,0.45)] md:p-7"
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        {assessment.id === "phq-9" || assessment.id === "gad-7" ? (
          <p className="text-[13px] text-brand-purple-dark/55">
            Over the last 2 weeks, how often have you been bothered by…
          </p>
        ) : null}

        <h2 className="mt-3 text-[22px] font-semibold leading-[1.35] text-brand-purple-dark md:text-[24px]">
          {q.text}
        </h2>

        <ul className="mt-7 space-y-2.5">
          {q.options.map((opt, i) => {
            const isSelected = selected === opt.value;
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => onAnswer(opt.value)}
                  className={`flex w-full items-center justify-between gap-4 rounded-2xl border px-5 py-4 text-left transition ${
                    isSelected
                      ? "border-brand-purple bg-brand-lavender/80 shadow-[0_8px_24px_-16px_rgba(126,107,175,0.55)]"
                      : "border-brand-purple/15 bg-white hover:border-brand-purple hover:bg-brand-lavender/80 hover:shadow-[0_8px_24px_-16px_rgba(126,107,175,0.55)]"
                  }`}
                >
                  <span className="text-[15px] font-medium text-brand-purple-dark">
                    {opt.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-7 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            disabled={index === 0}
            className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-brand-purple-dark/55 transition hover:text-brand-purple-dark disabled:opacity-30 disabled:hover:text-brand-purple-dark/55"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
            Back
          </button>
          <p className="text-[12px] text-brand-purple-dark/45">
            Tap an answer to continue
          </p>
        </div>
      </motion.div>
    </motion.section>
  );
}

// ============================================================
// Result
// ============================================================

function isCrisisResult(assessment: Assessment, attempt: Attempt): boolean {
  const score = attempt.score;
  const answers = attempt.answers;
  switch (assessment.id) {
    case "phq-9":
      return score >= 20 || (answers[PHQ9_SELF_HARM_INDEX] ?? 0) > 0;
    case "who-5":
      // WHO-5 scaled score = raw * 4. Crisis when scaled ≤ 28 (raw ≤ 7).
      return score * 4 <= 28;
    case "mdq":
      return score >= 7;
    case "pss-10":
      return score >= 27;
    case "gad-7":
      return score >= 15;
    case "pcl-5":
      return score >= 33;
    case "oci-r":
      return score >= 21;
    case "pdss-sr":
      return score >= 15;
    case "spin":
      return score >= 41;
    case "sleep-rest":
      // Higher = better, max 24. "Severe" = bottom band (ratio < 0.25).
      return score <= 6;
    case "asrs-6":
      // 4 or more items marked "Sometimes" (value 2) or higher.
      return answers.filter((v) => (v ?? 0) >= 2).length >= 4;
    case "scoff":
      return score >= 2;
    case "audit":
      return score >= 16;
    default:
      return false;
  }
}

function ResultView({
  assessment,
  attempt,
}: {
  assessment: Assessment;
  attempt: Attempt;
}) {
  const [copied, setCopied] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const completedDate = new Date(attempt.takenAt);
  const dateLabel = completedDate.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeLabel = completedDate.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  async function handleShare() {
    const lines = [
      `${assessment.name} (${assessment.clinicalName})`,
      `Completed ${dateLabel} at ${timeLabel}`,
      `Score: ${attempt.score} / ${assessment.maxScore} ${
        assessment.lowerIsBetter ? "(lower = lighter)" : "(higher = better)"
      }`,
      "",
      attempt.summary,
    ].join("\n");
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: `${assessment.name} — my check-in`,
          text: lines,
        });
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(lines);
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      }
    } catch {
      // user dismissed or share unavailable — silent
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mt-6"
    >
      <div className="rounded-3xl bg-gradient-to-br from-white to-brand-lavender/40 p-8 shadow-[0_24px_80px_-40px_rgba(126,107,175,0.45)] ring-1 ring-brand-purple/10 md:p-10">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.18em] text-brand-purple">
          Thanks for checking in
        </p>
        <h1 className="mt-3 text-[28px] font-semibold leading-tight text-brand-purple-dark md:text-[32px]">
          {assessment.name}
        </h1>

        <div className="mt-7 flex items-end gap-4">
          <span className="text-[56px] font-semibold leading-none text-brand-purple-dark tabular-nums">
            {attempt.score}
          </span>
          <span className="pb-2 text-[14px] text-brand-purple-dark/55">
            out of {assessment.maxScore}
            <span className="ml-2 text-[12px]">
              {assessment.lowerIsBetter ? "(lower = lighter)" : "(higher = better)"}
            </span>
          </span>
        </div>

        <p className="mt-6 text-[17px] leading-[1.55] text-brand-purple-dark">
          {attempt.summary}
        </p>

        <p className="mt-5 text-[13px] leading-[1.6] text-brand-purple-dark/55">
          This isn't a diagnosis. It's a snapshot of one moment — and a useful
          thing to bring into a conversation with someone you trust.
        </p>
      </div>

      {/* Additional details — separate card so the original summary stays untouched */}
      <div className="mt-5 rounded-3xl bg-white p-6 shadow-[0_24px_80px_-40px_rgba(126,107,175,0.35)] ring-1 ring-brand-purple/10 md:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-brand-lavender/70 px-3 py-1 text-[11.5px] font-semibold text-brand-purple-dark">
            Completed
          </span>
          <span className="inline-flex items-center rounded-full bg-brand-lavender/70 px-3 py-1 text-[11.5px] font-medium text-brand-purple-dark/75">
            {dateLabel} · {timeLabel}
          </span>
        </div>

        <section className="mt-6">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-brand-purple">
            What this means
          </p>
          <p className="mt-3 text-[14px] leading-[1.65] text-brand-purple-dark/85">
            Your score of{" "}
            <span className="font-semibold text-brand-purple-dark">
              {attempt.score}
            </span>{" "}
            out of {assessment.maxScore} reflects how you answered today — not
            who you are.{" "}
            {assessment.lowerIsBetter
              ? "Lower numbers tend to suggest things are feeling lighter; higher numbers can mean more is sitting with you right now."
              : "Higher numbers tend to point toward more steadiness; lower numbers can suggest this area could use some care."}{" "}
            Patterns matter more than any single check — try this again in a
            couple of weeks to see how things shift.
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-brand-purple/10 bg-white p-5">
          <p className="text-[15px] font-semibold text-brand-purple-dark">
            What you answered
          </p>
          <p className="mt-1 text-[13px] text-brand-purple-dark/60">
            Your responses from the latest attempt
          </p>
          <button
            type="button"
            onClick={() => setShowAnswers((v) => !v)}
            aria-expanded={showAnswers}
            className="mt-3 inline-flex items-center gap-1 text-[13.5px] font-semibold text-brand-purple transition hover:text-brand-purple-dark"
          >
            {showAnswers ? "Hide my answers" : "Show my answers"}
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showAnswers ? "rotate-180" : ""}`}
              strokeWidth={2.2}
            />
          </button>
          {showAnswers && (
            <ol className="mt-4 divide-y divide-brand-purple/10 border-t border-brand-purple/10">
              {assessment.questions.map((q, i) => {
                const ans = attempt.answers[i];
                const opt = q.options.find((o) => o.value === ans);
                const cleanLabel = opt
                  ? opt.label.replace(/^[^\p{L}\p{N}]+/u, "").trim()
                  : "—";
                return (
                  <li
                    key={i}
                    className="flex items-start gap-3 py-3"
                  >
                    <span className="mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand-lavender/60 text-[11.5px] font-semibold text-brand-purple">
                      {i + 1}
                    </span>
                    <p className="flex-1 text-[13.5px] leading-snug text-brand-purple-dark">
                      {q.text}
                    </p>
                    <span className="ml-2 flex-none text-right text-[13px] font-semibold text-brand-purple">
                      {cleanLabel}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

      </div>

      <SupportCard crisis={isCrisisResult(assessment, attempt)} />

      <div className="mt-5 rounded-3xl bg-white p-6 shadow-[0_24px_80px_-40px_rgba(126,107,175,0.35)] ring-1 ring-brand-purple/10 md:p-8">
        <p className="text-[15px] font-semibold text-brand-purple-dark">
          What you can do with this
        </p>
        <ul className="mt-4 space-y-1">
          <li>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") window.location.reload();
              }}
              className="group flex w-full items-center gap-4 rounded-xl p-3 text-left transition hover:bg-brand-lavender/30"
            >
              <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-brand-lavender/70 text-brand-purple">
                <RotateCcw className="h-4 w-4" strokeWidth={2.1} />
              </span>
              <span className="flex-1">
                <span className="block text-[14px] font-semibold text-brand-purple-dark">
                  Take this check again
                </span>
                <span className="mt-0.5 block text-[12.5px] text-brand-purple-dark/60">
                  Creates a brand new attempt, your history stays intact
                </span>
              </span>
              <ArrowRight
                className="h-4 w-4 flex-none text-brand-purple/60 transition group-hover:translate-x-0.5 group-hover:text-brand-purple"
                strokeWidth={2}
              />
            </button>
          </li>
          <li>
            <div
              aria-disabled
              className="flex w-full items-center gap-4 rounded-xl p-3 opacity-60"
            >
              <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-brand-lavender/70 text-brand-purple">
                <MessageCircle className="h-4 w-4" strokeWidth={2.1} />
              </span>
              <span className="flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-semibold text-brand-purple-dark">
                    Talk through your results with AI
                  </span>
                  <span className="inline-flex items-center rounded-full bg-brand-lavender/80 px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-brand-purple">
                    Coming soon
                  </span>
                </span>
                <span className="mt-0.5 block text-[12.5px] text-brand-purple-dark/60">
                  Explore what your {dateLabel} results might mean for you
                </span>
              </span>
            </div>
          </li>
          <li>
            <button
              type="button"
              onClick={handleShare}
              className="group flex w-full items-center gap-4 rounded-xl p-3 text-left transition hover:bg-brand-lavender/30"
            >
              <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-brand-lavender/70 text-brand-purple">
                <Share2 className="h-4 w-4" strokeWidth={2.1} />
              </span>
              <span className="flex-1">
                <span className="block text-[14px] font-semibold text-brand-purple-dark">
                  Share these results with a provider
                </span>
                <span className="mt-0.5 block text-[12.5px] text-brand-purple-dark/60">
                  {copied
                    ? "Copied to clipboard"
                    : `Your provider will see your completed ${assessment.name} results`}
                </span>
              </span>
              <ArrowRight
                className="h-4 w-4 flex-none text-brand-purple/60 transition group-hover:translate-x-0.5 group-hover:text-brand-purple"
                strokeWidth={2}
              />
            </button>
          </li>
        </ul>
      </div>
    </motion.section>
  );
}

function SupportCard({ crisis }: { crisis: boolean }) {
  return (
    <div
      className={`mt-5 rounded-3xl p-6 md:p-8 ${
        crisis
          ? "bg-[#FEF3C7] text-[#7A5A2C] ring-1 ring-[#F5E4A1] shadow-[0_18px_60px_-30px_rgba(214,180,40,0.4)]"
          : "bg-white ring-1 ring-brand-purple/10 shadow-[0_24px_80px_-40px_rgba(126,107,175,0.35)]"
      }`}
    >
      {crisis && (
        <div className="mb-6">
          <p className="text-[16px] font-bold leading-[1.5] text-[#7A5A2C]">
            You don't have to do this alone.
          </p>
          <p className="mt-2 text-[14px] leading-[1.6] text-[#7A5A2C]">
            Your answers suggest you're carrying something really heavy right
            now. Please reach out — kind people are ready to talk with you, any
            time.
          </p>
        </div>
      )}
      <p
        className={`text-[15px] font-bold ${
          crisis ? "text-[#7A5A2C]" : "text-brand-purple-dark"
        }`}
      >
        Need urgent help?
      </p>
      <p
        className={`mt-1 text-[13.5px] leading-[1.6] ${
          crisis ? "text-[#8A6A3C]" : "text-brand-purple-dark/70"
        }`}
      >
        Free, confidential support — any time, any reason.
      </p>

      <div className="mt-4 space-y-4">
        {[
          {
            href: "tel:2919",
            title: "Hopeline PH — 2919",
            desc: "24/7 emotional support and crisis intervention in the Philippines.",
            external: false,
          },
          {
            href: "tel:1553",
            title: "NCMH Crisis Hotline — 1553",
            desc: "National Center for Mental Health — toll-free across the country.",
            external: false,
          },
          {
            href: "https://findahelpline.com",
            title: "findahelpline.com",
            desc: "Find a free, confidential helpline anywhere in the world.",
            external: true,
          },
        ].map((h) => (
          <a
            key={h.title}
            href={h.href}
            {...(h.external ? { target: "_blank", rel: "noreferrer" } : {})}
            className={`group -mx-3 block rounded-2xl px-3 py-2.5 no-underline ring-1 transition-all duration-200 hover:-translate-y-0.5 ${
              crisis
                ? "ring-transparent hover:bg-[#FBE89A] hover:ring-[#F5E4A1]"
                : "ring-transparent hover:bg-brand-lavender/40 hover:ring-brand-purple/20 hover:shadow-[0_10px_30px_-18px_rgba(126,107,175,0.4)]"
            }`}
          >
            <p
              className={`text-[14px] font-bold underline-offset-4 group-hover:underline ${
                crisis ? "text-[#7A5A2C]" : "text-brand-purple-dark"
              }`}
            >
              {h.title}
              <span aria-hidden className="ml-1 inline-block transition-transform duration-200 group-hover:translate-x-0.5">→</span>
            </p>
            <p
              className={`mt-0.5 text-[13.5px] leading-[1.55] ${
                crisis ? "text-[#8A6A3C]" : "text-brand-purple-dark/70"
              }`}
            >
              {h.desc}
            </p>
          </a>
        ))}
      </div>

      <a
        href="https://findahelpline.com"
        target="_blank"
        rel="noreferrer"
        className={`mt-6 inline-flex items-center gap-1.5 text-[13.5px] font-semibold no-underline ${
          crisis ? "text-[#7A5A2C]" : "text-brand-purple"
        }`}
      >
        Find support near you →
      </a>
    </div>
  );
}