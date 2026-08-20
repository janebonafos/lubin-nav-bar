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
import type { Assessment, Attempt } from "@/lib/patterns/types";
import CrisisOverlay from "@/components/patterns/CrisisOverlay";
import BreathingPause from "@/components/patterns/BreathingPause";
import AuthModal from "@/components/AuthModal";
import { getAssessmentStatus, type AssessmentStatus } from "@/lib/patterns/scoring";
import { useResultInsight } from "@/lib/patterns/useResultInsight";
import ResultInsights, { BookingCard, TalkThroughCard } from "@/components/discovery/ResultInsights";
import ShareResultModal from "@/components/discovery/ShareResultModal";

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
  validateSearch: (
    search: Record<string, unknown>,
  ): { attempt?: string; from?: "patterns" } => {
    const out: { attempt?: string; from?: "patterns" } = {};
    if (typeof search.attempt === "string" && search.attempt.length > 0) {
      out.attempt = search.attempt;
    }
    if (search.from === "patterns") out.from = "patterns";
    return out;
  },
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
          to="/self-discovery"
          className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white no-underline shadow-[0_8px_20px_-6px_rgba(126,107,175,0.55)] transition hover:-translate-y-0.5 hover:bg-brand-purple-dark"
        >
          Back to Self Discovery
        </Link>
      </div>
    </div>
  );
}

type Phase =
  | "intro"
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
  const { attempt: attemptId, from } = Route.useSearch();
  const backTo = from === "patterns" ? "/my-health-passport" : "/self-discovery";
  const backLabel = from === "patterns" ? "Back to Patterns" : "All check-ins";
  const total = assessment.questions.length;

  // Bootstrap from storage (browser-only).
  const [phase, setPhase] = useState<Phase>("intro");
  const [answers, setAnswers] = useState<(number | null)[]>(() =>
    Array(total).fill(null),
  );
  const [selections, setSelections] = useState<(number | null)[]>(() =>
    Array(total).fill(null),
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedAttempt, setCompletedAttempt] = useState<Attempt | null>(null);
  const [crisisOpen, setCrisisOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const breathingShownRef = useRef(false);
  const crisisShownRef = useRef(false);
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

  function handleAnswer(value: number, optionIndex: number) {
    const next = [...answers];
    next[currentIndex] = value;
    setAnswers(next);
    const nextSel = [...selections];
    nextSel[currentIndex] = optionIndex;
    setSelections(nextSel);

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

    advance(next, nextSel);
  }

  function advance(
    currentAnswers: (number | null)[],
    currentSelections: (number | null)[] = selections,
  ) {
    if (currentIndex < total - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      finishAttempt(currentAnswers, currentSelections);
    }
  }

  function finishAttempt(
    finalAnswers: (number | null)[],
    finalSelections: (number | null)[],
  ) {
    const normalized = finalAnswers.map((v) => v ?? 0);
    const normalizedSel = finalSelections.map((v, i) => {
      if (v !== null) return v;
      // Best-effort backfill: find first option matching the value.
      const q = assessment.questions[i];
      const val = normalized[i];
      const idx = q ? q.options.findIndex((o) => o.value === val) : -1;
      return idx >= 0 ? idx : 0;
    });
    const score = normalized.reduce((s, v) => s + v, 0);
    const attempt: Attempt = {
      id: `${assessment.id}-${Date.now()}`,
      assessmentId: assessment.id,
      assessmentName: assessment.name,
      score,
      summary: assessment.summarize(score),
      takenAt: Date.now(),
      answers: normalized,
      selections: normalizedSel,
    };
    saveAttempt(attempt);
    clearInProgress(assessment.id);
    setCompletedAttempt(attempt);
    setPhase("result");
    // Nudge guests to register so their results are saved properly.
    if (typeof window !== "undefined") {
      const isGuest =
        window.localStorage.getItem("lubinai_guest_mode") !== "false";
      if (isGuest) {
        window.setTimeout(() => setRegisterOpen(true), 600);
      }
    }
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
        <div
          className={`mx-auto flex w-full items-center justify-between ${
            phase === "result" ? "max-w-5xl" : "max-w-[760px]"
          }`}
        >
          <Link
            to={backTo}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3.5 py-2 text-[13px] font-medium text-brand-purple-dark no-underline shadow-sm transition hover:bg-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
            {backLabel}
          </Link>
          <button
            type="button"
            onClick={() => navigate({ to: backTo })}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-brand-purple-dark/60 transition hover:bg-white/60 hover:text-brand-purple-dark"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="px-4 pb-20 pt-6">
        <div
          className={`mx-auto w-full ${
            phase === "result" ? "max-w-5xl" : "max-w-[760px]"
          }`}
        >
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
          <CrisisOverlay
            onDismiss={() => {
              setCrisisOpen(false);
              // Continue the flow: advance to next question, or finish if last.
              advance(answers);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {registerOpen && (
          <RegisterNudge
            onRegister={() => {
              setRegisterOpen(false);
              // Stay on this results page — sign-up happens inline.
              setAuthOpen(true);
            }}
          />
        )}
      </AnimatePresence>

      <AuthModal
        open={authOpen}
        mode="signup"
        onClose={() => setAuthOpen(false)}
        onContinueWithGoogle={() => {
          try {
            window.localStorage.setItem("lubinai_guest_mode", "false");
          } catch {}
          setAuthOpen(false);
        }}
      />
    </div>
  );
}

function RegisterNudge({
  onRegister,
}: {
  onRegister: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end justify-center p-4 md:items-center"
    >
      <div className="absolute inset-0 bg-brand-purple-dark/40 backdrop-blur-sm" />
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 12, opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl md:p-7"
      >
        <div className="inline-flex items-center rounded-full bg-[#F4F0FB] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#7E6BAF]">
          Save securely
        </div>
        <h2 className="mt-3 text-xl font-semibold text-brand-purple-dark">
          Create an account to save your results
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-brand-purple-dark/70">
          Registering lets us properly handle and protect your check-in data so
          you can return to it, track progress, and share it with someone you
          trust — only when you choose.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={onRegister}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-brand-purple to-brand-purple-dark px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(61,46,107,0.45)] transition hover:bg-brand-purple-dark"
          >
            Create free account <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </motion.div>
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
  onAnswer: (value: number, optionIndex: number) => void;
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
                  onClick={() => onAnswer(opt.value, i)}
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
  const selfHarm =
    assessment.id === "phq-9" &&
    (attempt.answers[PHQ9_SELF_HARM_INDEX] ?? 0) > 0;
  return getAssessmentStatus(
    assessment.id,
    attempt.score,
    assessment.maxScore,
    assessment.lowerIsBetter,
    selfHarm,
  ).isCrisis;
}

function ResultView({
  assessment,
  attempt,
}: {
  assessment: Assessment;
  attempt: Attempt;
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const selfHarm =
    assessment.id === "phq-9" &&
    (attempt.answers[PHQ9_SELF_HARM_INDEX] ?? 0) > 0;
  const status = getAssessmentStatus(
    assessment.id,
    attempt.score,
    assessment.maxScore,
    assessment.lowerIsBetter,
    selfHarm,
  );
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

  const shareAnswers = assessment.questions.map((q, i) => {
    const ans = attempt.answers[i];
    const selIdx = attempt.selections?.[i];
    const opt =
      typeof selIdx === "number" && q.options[selIdx]
        ? q.options[selIdx]
        : q.options.find((o) => o.value === ans);
    return {
      question: q.text,
      answer: opt ? opt.label.replace(/^[^\p{L}\p{N}]+/u, "").trim() : "—",
    };
  });

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mt-4"
    >
      {/* Top result summary — editorial, borderless */}
      <div className="relative pb-10">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-lg">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-purple/70">
              Clinical Reference: {assessment.clinicalName}
            </p>
            <h1 className="mt-3 font-serif-display text-4xl font-light leading-[1.05] text-brand-purple-dark md:text-5xl">
              {assessment.name}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center rounded-full border border-brand-purple/15 bg-white px-3 py-1.5 text-[12px] font-semibold text-brand-purple-dark">
                {status.label}
              </span>
              <span className="text-[12px] font-medium tabular-nums text-brand-purple-dark/50">
                {attempt.score} / {assessment.maxScore}
              </span>
            </div>
          </div>
          <div className="text-left md:text-right">
            <span className="font-serif-display text-5xl font-light text-brand-purple-dark md:text-6xl">
              {attempt.score}
            </span>
            <span className="ml-2 text-[13px] font-medium uppercase tracking-widest text-brand-purple-dark/40">
              / {assessment.maxScore}
            </span>
            <p className="mt-1 text-[12px] text-brand-purple-dark/50">
              {dateLabel} · {timeLabel}
            </p>
          </div>
        </div>

        <div className="mt-8 h-px w-full bg-brand-purple/10" />

        {/* Above-the-fold CTAs: AI chat + real provider consult */}
        <div className="mt-6 grid items-stretch gap-3 md:grid-cols-2">
          <TalkThroughCard assessment={assessment} attempt={attempt} status={status} />
          <BookingCard status={status} />
        </div>

        <div className="mt-8 grid gap-10 md:grid-cols-12">
          <div className="md:col-span-7">
            <p className="font-serif-display text-lg font-light italic leading-relaxed text-brand-purple-dark md:text-xl">
              “{attempt.summary}”
            </p>
            <HeroInsightRead
              assessment={assessment}
              score={attempt.score}
              status={status}
            />
          </div>
          <div className="md:col-span-5">
            <p className="text-[14px] leading-[1.7] text-brand-purple-dark/70">
              {status.explanation} This isn't a diagnosis — it's a snapshot of
              this moment, and a useful thing to bring into a conversation with
              someone you trust.
            </p>
          </div>
        </div>

        {/* Answer expander — minimal */}
        <div className="mt-12">
          <button
            type="button"
            onClick={() => setShowAnswers((v) => !v)}
            aria-expanded={showAnswers}
            className="group inline-flex items-center gap-2 text-[13.5px] font-semibold text-brand-purple transition hover:text-brand-purple-dark"
          >
            {showAnswers ? "Hide my answers" : "Show my answers"}
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showAnswers ? "rotate-180" : ""}`}
              strokeWidth={2.2}
            />
          </button>
          {showAnswers && (
            <motion.ol
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 divide-y divide-brand-purple/10 border-t border-brand-purple/10"
            >
              {assessment.questions.map((q, i) => {
                const ans = attempt.answers[i];
                const selIdx = attempt.selections?.[i];
                const opt =
                  typeof selIdx === "number" && q.options[selIdx]
                    ? q.options[selIdx]
                    : q.options.find((o) => o.value === ans);
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
            </motion.ol>
          )}
        </div>
      </div>

      <ResultInsights assessment={assessment} attempt={attempt} />

      <SupportCard
        crisis={isCrisisResult(assessment, attempt)}
        heavy={status.tone.includes("F4ECFB") || status.tone.includes("orange")}
      />

      {/* Bottom utility actions */}
      <div className="mt-16 border-t border-brand-purple/10 pt-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") window.location.reload();
              }}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium text-brand-purple-dark/70 transition hover:bg-brand-lavender/40 hover:text-brand-purple-dark"
            >
              <RotateCcw className="h-4 w-4" strokeWidth={2.1} />
              Take this check again
            </button>
            <span className="hidden h-3 w-px bg-brand-purple/15 sm:block" />
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium text-brand-purple-dark/70 transition hover:bg-brand-lavender/40 hover:text-brand-purple-dark"
            >
              <Share2 className="h-4 w-4" strokeWidth={2.1} />
              Share results
            </button>
          </div>
          <p className="text-[12px] text-brand-purple-dark/45">
            Your results stay private unless you choose to share them.
          </p>
        </div>
      </div>

      <ShareResultModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        draft={{
          assessmentSlug: assessment.slug,
          assessmentName: assessment.name,
          clinicalName: assessment.clinicalName,
          score: attempt.score,
          maxScore: assessment.maxScore,
          lowerIsBetter: assessment.lowerIsBetter,
          statusLabel: status.label,
          explanation: status.explanation,
          summary: attempt.summary,
          takenAt: attempt.takenAt,
          answers: shareAnswers,
        }}
      />
    </motion.section>
  );
}


function SupportCard({ crisis, heavy }: { crisis: boolean; heavy: boolean }) {
  const [open, setOpen] = useState(false);

  if (!crisis) {
    if (!heavy) {
      // Light / mild results: single quiet line.
      return (
        <p className="mt-16 text-center text-[12px] leading-[1.6] text-brand-purple-dark/40">
          If things ever feel like too much,{" "}
          <a
            href="https://findahelpline.com"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-brand-purple/70 underline-offset-2 hover:underline"
          >
            free helplines
          </a>{" "}
          are always there.
        </p>
      );
    }
    // Moderate/heavy but not crisis: minimal collapsible footer.
    return (
      <div className="mt-16 rounded-2xl border border-brand-purple/10 bg-white/60 p-4 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span className="text-[13px] font-medium text-brand-purple-dark/75">
            Need urgent support later? Helplines are always here.
          </span>
          <ChevronDown
            className={`h-4 w-4 flex-none text-brand-purple/60 transition-transform ${open ? "rotate-180" : ""}`}
            strokeWidth={2.2}
          />
        </button>
        {open && (
          <div className="mt-3 space-y-2 border-t border-brand-purple/10 pt-3 text-[12.5px] leading-[1.5] text-brand-purple-dark/75">
            <p>
              <a href="tel:2919" className="font-semibold text-brand-purple no-underline">Hopeline PH — 2919</a>{" "}
              · 24/7 emotional support in the Philippines.
            </p>
            <p>
              <a href="tel:1553" className="font-semibold text-brand-purple no-underline">NCMH Crisis Hotline — 1553</a>{" "}
              · Toll-free across the country.
            </p>
            <p>
              <a href="https://findahelpline.com" target="_blank" rel="noreferrer" className="font-semibold text-brand-purple no-underline">findahelpline.com</a>{" "}
              · Find a free, confidential helpline anywhere in the world.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-16 rounded-3xl border border-amber-200/60 bg-[#FEF9EE] p-6 md:p-8">
      <div className="mb-6">
        <p className="font-serif-display text-xl font-light italic text-[#7A5A2C]">
          You don't have to do this alone.
        </p>
        <p className="mt-2 text-[14px] leading-[1.6] text-[#8A6A3C]">
          Your answers suggest you're carrying something really heavy right now.
          Please reach out — kind people are ready to talk with you, any time.
        </p>
      </div>
      <p className="text-[13px] font-bold text-[#7A5A2C]">Need urgent help?</p>
      <p className="mt-1 text-[13px] leading-[1.6] text-[#8A6A3C]">
        Free, confidential support — any time, any reason.
      </p>

      <div className="mt-4 space-y-3">
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
            className="group -mx-2 block rounded-xl px-2 py-2.5 no-underline transition hover:bg-[#FBE89A]/60"
          >
            <p className="text-[14px] font-bold text-[#7A5A2C]">
              {h.title}
              <span aria-hidden className="ml-1 inline-block transition-transform group-hover:translate-x-0.5">→</span>
            </p>
            <p className="mt-0.5 text-[13px] leading-[1.55] text-[#8A6A3C]">
              {h.desc}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}

function HeroInsightRead({
  assessment,
  score,
  status,
}: {
  assessment: Assessment;
  score: number;
  status: AssessmentStatus;
}) {
  const { insight, loading } = useResultInsight(assessment, score, status);
  return (
    <div className="mt-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-purple/70">
        What this score means
      </p>
      {loading || !insight ? (
        <div className="mt-3 space-y-2.5" aria-busy="true">
          <div className="h-3 w-11/12 animate-pulse rounded-full bg-brand-lavender" />
          <div className="h-3 w-9/12 animate-pulse rounded-full bg-brand-lavender" />
        </div>
      ) : (
        <p className="mt-3 text-[15px] leading-[1.75] text-brand-purple-dark/80">
          {insight.meaning}
        </p>
      )}
    </div>
  );
}
