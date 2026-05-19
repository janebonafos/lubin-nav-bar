import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import AuthModal, { type AuthMode } from "@/components/AuthModal";
import CheckInFlow, { type CheckInPayload } from "@/components/CheckInFlow";
import {
  CalendarCheck,
  ClipboardList,
  TrendingUp,
  Lock,
  X,
  MessageCircle,
  Sparkles,
  Pencil,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export const Route = createFileRoute("/my-health-passport")({
  component: PassportPage,
  head: () => ({
    meta: [
      { title: "Health Passport — Lubin" },
      {
        name: "description",
        content:
          "Your Health Passport — gently remembers your mood, check-ins and progress over time.",
      },
    ],
  }),
});

// ---------- localStorage helpers ----------
type CheckIn = { id: string; mood: number; note: string; date: string };
type Assessment = { id: string; name: string; score: number; date: string };

const CHECKINS_KEY = "lubinai_checkins";
const ASSESSMENTS_KEY = "lubinai_assessments";
const GUEST_KEY = "lubinai_guest_mode";
const INTRO_SEEN_KEY = "lubinai_passport_intro_seen";
const INTRO_DISMISSED_KEY = "lubinai_passport_intro_dismissed";

function readLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeLS<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

const MOODS = [
  { v: 1, emoji: "😞", label: "Low" },
  { v: 2, emoji: "😕", label: "Meh" },
  { v: 3, emoji: "😐", label: "Okay" },
  { v: 4, emoji: "🙂", label: "Good" },
  { v: 5, emoji: "😄", label: "Great" },
];

// ---------- Page ----------
function PassportPage() {
  const [tab, setTab] = useState<"overview" | "progress" | "share">("overview");
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkInActive, setCheckInActive] = useState(false);
  const [savePrompt, setSavePrompt] = useState<null | { kind: "checkin"; payload: CheckIn } | { kind: "assessment"; payload: Assessment }>(null);
  // Avoid SSR/client mismatch: start undecided, decide after mount.
  const [showIntro, setShowIntro] = useState<boolean | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const openAuth = (mode: AuthMode = "signup") => setAuthMode(mode);

  // hydrate from localStorage
  useEffect(() => {
    setCheckins(readLS<CheckIn[]>(CHECKINS_KEY, []));
    setAssessments(readLS<Assessment[]>(ASSESSMENTS_KEY, []));
    if (readLS<boolean | null>(GUEST_KEY, null) === null) writeLS(GUEST_KEY, true);
    try {
      setShowIntro(window.localStorage.getItem(INTRO_SEEN_KEY) !== "true");
    } catch {
      setShowIntro(false);
    }
  }, []);

  const today = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    [],
  );

  // streak: consecutive days ending today
  const streak = useMemo(() => {
    if (!checkins.length) return 0;
    const days = new Set(
      checkins.map((c) => new Date(c.date).toDateString()),
    );
    let count = 0;
    const cur = new Date();
    while (days.has(cur.toDateString())) {
      count += 1;
      cur.setDate(cur.getDate() - 1);
    }
    return count;
  }, [checkins]);

  function persistCheckin(c: CheckIn) {
    const next = [c, ...checkins].slice(0, 50);
    setCheckins(next);
    writeLS(CHECKINS_KEY, next);
  }

  if (showIntro === null) {
    return <div className="min-h-screen bg-brand-lavender" />;
  }

  if (showIntro) {
    return (
      <IntroScreen
        onOpen={() => {
          if (typeof window !== "undefined") {
            window.localStorage.setItem(INTRO_SEEN_KEY, "true");
          }
          setShowIntro(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-brand-lavender" style={{ fontFamily: "Inter, sans-serif" }}>
      <Navbar />
      <main className="mx-auto w-full max-w-[900px] px-5 md:px-10 pt-32 pb-20">
        {/* Guest nudge banner */}
        <GuestBanner />

        {/* Header */}
        <header className="mt-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-purple">
              Your Health Passport
            </p>
            <h1 className="mt-2 text-3xl md:text-4xl font-bold text-brand-purple-dark">
              Everything you share, gently remembered.
            </h1>
          </div>
        </header>

        {/* Tabs */}
        <div className="mt-8 flex gap-6 border-b border-brand-purple/15">
          {([
            ["overview", "Overview"],
            ["progress", "My Progress"],
            ["share", "Share Snapshot"],
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

        {/* Tab content */}
        <div className="mt-8">
          {tab === "overview" && (
            <Overview
              today={today}
              checkins={checkins}
              onLogMood={() => setCheckInActive(true)}
              checkInActive={checkInActive}
              onCloseCheckIn={() => setCheckInActive(false)}
            />
          )}
          {tab === "progress" && (
            <Progress checkins={checkins} assessments={assessments} streak={streak} />
          )}
          {tab === "share" && <ShareSnapshot onCreateAccount={() => openAuth("signup")} />}
        </div>

        {/* Mobile registration CTA */}
        <div className="mt-6 flex sm:hidden">
          <button
            type="button"
            onClick={() => openAuth("signup")}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#C9BEE5] to-[#A89BD0] px-5 py-3 text-sm font-semibold text-[#3D2E6B] shadow-[0_8px_20px_-6px_rgba(168,155,208,0.55)]"
          >
            Create your free account <span aria-hidden>→</span>
          </button>
        </div>
      </main>

      {checkInOpen && (
        <CheckInModal
          onClose={() => setCheckInOpen(false)}
          onSubmit={(c) => {
            setCheckInOpen(false);
            setSavePrompt({ kind: "checkin", payload: c });
          }}
        />
      )}

      {savePrompt && (
        <SaveProgressModal
          onCreateAccount={() => {
            // persist anyway so guest doesn't lose work, then navigate
            if (savePrompt.kind === "checkin") persistCheckin(savePrompt.payload);
            setSavePrompt(null);
            openAuth("signup");
          }}
          onSaveLocal={() => {
            if (savePrompt.kind === "checkin") persistCheckin(savePrompt.payload);
            setSavePrompt(null);
          }}
          onDismiss={() => setSavePrompt(null)}
        />
      )}

      <AuthModal
        open={authMode !== null}
        mode={authMode ?? "signup"}
        onClose={() => setAuthMode(null)}
      />
    </div>
  );
}

// ---------- Guest banner ----------
function GuestBanner() {
  const [dismissed, setDismissed] = useState(() =>
    typeof window !== "undefined"
      ? window.localStorage.getItem(INTRO_DISMISSED_KEY) === "true"
      : false
  );
  const [fading, setFading] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    setFading(true);
    setTimeout(() => {
      setDismissed(true);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(INTRO_DISMISSED_KEY, "true");
      }
    }, 300);
  };

  return (
    <div
      className={`relative mb-6 rounded-[16px] border-l-4 border-l-[#7E6BAF] bg-white transition-all duration-300 ${
        fading ? "opacity-0 -translate-y-2" : "opacity-100 translate-y-0"
      }`}
      style={{
        boxShadow: "0 2px 12px rgba(126, 107, 175, 0.08)",
        padding: "28px 32px",
      }}
    >
      <button
        onClick={handleDismiss}
        className="absolute top-5 right-5 text-[#9CA3AF] transition hover:text-[#6B7280]"
        aria-label="Dismiss"
      >
        <X size={18} />
      </button>

      <span
        className="text-[11px] font-semibold uppercase"
        style={{ color: "#7E6BAF", letterSpacing: "0.08em" }}
      >
        FROM LUBIN
      </span>

      <h2
        className="mt-2 text-[20px] font-bold"
        style={{ color: "#2C2B4B", fontFamily: "Inter, sans-serif", marginBottom: 12 }}
      >
        Your Health Passport is your mental wellness story
      </h2>

      <p
        className="text-[15px]"
        style={{
          color: "#5A4E8A",
          lineHeight: 1.7,
          maxWidth: 720,
          fontFamily: "Inter, sans-serif",
        }}
      >
        Most people go through their mental health journey without ever seeing the full picture — what triggers their stress, when their mood tends to dip, what actually helps. Your Health Passport changes that. Every check-in, every assessment, every conversation with Lubin quietly builds a private record that's yours alone. Over time, you'll start to notice patterns you never saw before — and that awareness is where real change begins.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { emoji: "\uD83D\uDD12", text: "Private to you only" },
          { emoji: "\uD83D\uDCC8", text: "Builds over time" },
          { emoji: "\uD83D\uDC9C", text: "Shared only when you choose" },
        ].map(({ emoji, text }) => (
          <span
            key={text}
            className="inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-[13px] font-medium"
            style={{ background: "#EDE9FE", color: "#7E6BAF" }}
          >
            <span aria-hidden>{emoji}</span>
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}

function IntroScreen({ onOpen }: { onOpen: () => void }) {
  const steps = [
    {
      Icon: CalendarCheck,
      title: "Check in daily",
      body:
        "Tell Lubin how you're feeling in just 15 seconds. Every check-in adds to your story.",
      accent: "#C9BEE5",
    },
    {
      Icon: ClipboardList,
      title: "Take gentle assessments",
      body:
        "Quick, science-backed checks help you understand what's going on beneath the surface.",
      accent: "#C9BEE5",
    },
    {
      Icon: TrendingUp,
      title: "See your patterns emerge",
      body:
        "Over time, your passport reveals the rhythms of your mood — and what truly helps.",
      accent: "#C9BEE5",
    },
  ];

  const [step, setStep] = useState(0);
  const isLast = step === steps.length - 1;
  const current = steps[step];
  const ActiveIcon = current.Icon;

  return (
    <div
      className="min-h-screen overflow-hidden bg-brand-lavender"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <Navbar />
      <main className="relative mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-[680px] flex-col items-center justify-center px-5 pb-16 pt-24 text-center">
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -top-10 -left-10 h-64 w-64 rounded-full blur-3xl"
          style={{ background: "rgba(201,190,229,0.45)" }}
          animate={{ y: [0, 20, 0], x: [0, 10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute bottom-10 -right-16 h-72 w-72 rounded-full blur-3xl"
          style={{ background: "rgba(126,107,175,0.35)" }}
          animate={{ y: [0, -25, 0], x: [0, -10, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.span
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative inline-flex items-center rounded-full px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.12em]"
          style={{ background: "#EDE6FA", color: "#5A4E8A" }}
        >
          Welcome to your Health Passport
        </motion.span>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative mt-8 w-full"
          >
            <motion.div
              initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="mx-auto flex h-[88px] w-[88px] items-center justify-center rounded-full shadow-[0_12px_30px_-10px_rgba(126,107,175,0.35)]"
            style={{ background: `linear-gradient(135deg, #A89BD0, #7E6BAF)` }}
            >
              <ActiveIcon size={40} color="#fff" strokeWidth={1.75} />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.25 }}
              className="mt-6 text-[28px] md:text-[34px] font-bold leading-tight"
            style={{ color: "#3D2E6B" }}
            >
              {current.title}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.25 }}
              className="mx-auto mt-4 max-w-[460px] text-[15px] md:text-base"
            style={{ color: "#5A4E8A", lineHeight: 1.65 }}
            >
              {current.body}
            </motion.p>
          </motion.div>
        </AnimatePresence>

        <div className="relative mt-10 flex items-center gap-2">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              aria-label={`Go to step ${i + 1}`}
              className="h-2 rounded-full transition-all"
              style={{
                width: i === step ? 28 : 8,
                background: i === step ? "#7E6BAF" : "rgba(126,107,175,0.35)",
              }}
            />
          ))}
        </div>

        <div
          className="relative mt-6 flex items-center justify-center gap-2 text-[13px]"
          style={{ color: "#5A4E8A" }}
        >
          <Lock size={14} aria-hidden />
          <span>Private to you. Nothing is shared unless you choose to.</span>
        </div>

        <div className="relative mt-6 flex items-center justify-center gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="rounded-lg border-[1.5px] border-[#7E6BAF] bg-transparent px-6 py-3 text-sm font-semibold text-[#5A4E8A] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#7E6BAF] hover:text-white hover:shadow-[0_6px_18px_-6px_rgba(126,107,175,0.5)]"
            >
              Back
            </button>
          )}
          <motion.button
            key={isLast ? "got-it" : "next"}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25 }}
            onClick={() =>
              isLast ? onOpen() : setStep((s) => Math.min(steps.length - 1, s + 1))
            }
            whileHover={{ y: -2, scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="rounded-lg bg-gradient-to-r from-[#7E6BAF] to-[#5A4E8A] px-8 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(90,78,138,0.55)] transition-all duration-200 hover:shadow-[0_14px_30px_-8px_rgba(61,46,107,0.6)] hover:from-[#5A4E8A] hover:to-[#3D2E6B]"
          >
            {isLast ? "Got it!" : "Next"} <span aria-hidden>→</span>
          </motion.button>
        </div>

        <button
          onClick={onOpen}
          className="relative mt-5 text-[12px] font-medium text-[#7E6BAF] transition hover:text-[#3D2E6B] hover:underline underline-offset-4"
        >
          Skip intro
        </button>
      </main>
    </div>
  );
}

// ---------- Overview ----------
function Overview({
  today,
  checkins: _checkins,
  onLogMood,
  checkInActive,
  onCloseCheckIn,
}: {
  today: string;
  checkins: CheckIn[];
  onLogMood: () => void;
  checkInActive: boolean;
  onCloseCheckIn: () => void;
}) {
  type LiveCheckIn = CheckInPayload & { id: string; savedAt: number };
  const [liveEntries, setLiveEntries] = useState<LiveCheckIn[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [latestSavedId, setLatestSavedId] = useState<string | null>(null);
  const [pulseId, setPulseId] = useState<string | null>(null);

  const editingEntry = editingId
    ? liveEntries.find((e) => e.id === editingId) ?? null
    : null;

  const initialForFlow: Partial<CheckInPayload> | undefined = editingEntry
    ? {
        mood: editingEntry.mood,
        intensityIdx: editingEntry.intensityIdx,
        topics: editingEntry.topics,
        note: editingEntry.note,
      }
    : undefined;

  const handleSave = (data: CheckInPayload) => {
    const id = editingId ?? (typeof crypto !== "undefined" ? crypto.randomUUID() : String(Date.now()));
    if (editingId) {
      setLiveEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...data, savedAt: Date.now() } : e)),
      );
    } else {
      setLiveEntries((prev) => [{ id, savedAt: Date.now(), ...data }, ...prev]);
    }
    setLatestSavedId(id);
    setPulseId(id);
    setEditingId(null);
    onCloseCheckIn();
    window.setTimeout(() => setPulseId((c) => (c === id ? null : c)), 1600);
    window.setTimeout(() => setLatestSavedId((c) => (c === id ? null : c)), 30000);
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    onLogMood();
  };

  const handleCloseFlow = () => {
    setEditingId(null);
    onCloseCheckIn();
  };

  return (
    <div className="grid gap-5">
      {/* Greeting */}
      <Card>
        <h2 className="text-3xl font-bold text-brand-purple-dark">
          How are you today?
        </h2>
        <p className="mt-2 text-sm text-brand-purple-dark/70">
          Hi there 👋 — {today}
        </p>
        <Link
          to="/chat"
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-purple no-underline transition hover:text-brand-purple-dark"
        >
          Talk to Lubin <span aria-hidden>→</span>
        </Link>
      </Card>

      {/* Insights — anticipation-framed */}
      <Card>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-purple">
          What we're noticing
        </p>
        <p className="mt-4 italic text-sm leading-relaxed text-brand-purple-dark/45">
          After a few check-ins you might see something like:
          {" "}“Sleep keeps coming up in your conversations,” or
          {" "}“Your mood has been steady this week.”
        </p>
      </Card>

      {/* Mood check-in CTA */}
      <Card className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-lg font-semibold text-brand-purple-dark">
            How are you feeling today?
          </p>
          <p className="mt-1 text-sm text-brand-purple-dark/60">
            Takes 15 seconds. Builds your passport over time.
          </p>
        </div>
        <button
          onClick={onLogMood}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(126,107,175,0.55)] transition hover:-translate-y-0.5 hover:bg-brand-purple-dark hover:shadow-[0_12px_24px_-8px_rgba(61,46,107,0.55)]"
        >
          Check in <span aria-hidden>→</span>
        </button>
      </Card>

      <AnimatePresence initial={false}>
        {checkInActive && (
          <motion.div
            key="checkin-flow"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
          >
            <Card>
              <CheckInFlow
                key={editingId ?? "new"}
                onClose={handleCloseFlow}
                onSave={handleSave}
                initial={initialForFlow}
              />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent check-ins */}
      <Card>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-purple">
          Recent check-ins
        </p>
        {liveEntries.length > 0 ? (
          <div className="mt-4 space-y-3">
            <AnimatePresence initial={false}>
              {liveEntries.map((entry) => (
                <LiveEntry
                  key={entry.id}
                  entry={entry}
                  pulsing={pulseId === entry.id}
                  showActions={latestSavedId === entry.id}
                  onEdit={() => handleEdit(entry.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <>
            <div className="mt-4 space-y-2 opacity-40" aria-hidden>
              {[
                { emoji: "🙂", label: "Good", note: "Slept well, productive morning.", date: "Mon, May 12" },
                { emoji: "😐", label: "Okay", note: "A bit foggy after lunch.", date: "Sun, May 11" },
                { emoji: "😄", label: "Great", note: "Long walk cleared my head.", date: "Sat, May 10" },
              ].map((c, i) => (
                <div key={i} className="flex items-center gap-4 rounded-xl bg-brand-lavender/40 px-3 py-2">
                  <span className="text-2xl">{c.emoji}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-brand-purple-dark">{c.label}</p>
                    <p className="text-xs text-brand-purple-dark/60">{c.note}</p>
                  </div>
                  <p className="text-xs text-brand-purple-dark/50">{c.date}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-brand-purple-dark/55">
              Your first check-in will appear here. Lubin remembers the rest.
            </p>
          </>
        )}
      </Card>

      {/* Soft anchor CTA */}
      <Link
        to="/chat"
        className="block rounded-2xl bg-gradient-to-r from-brand-purple/10 to-brand-purple-accent/15 px-6 py-5 text-center no-underline ring-1 ring-brand-purple/15 transition hover:from-brand-purple/15 hover:to-brand-purple-accent/25"
      >
        <p className="text-sm font-medium text-brand-purple-dark">
          Want to talk it through instead?{" "}
          <span className="font-semibold text-brand-purple">Talk to Lubin →</span>
        </p>
      </Link>
    </div>
  );
}

function LiveEntry({
  entry,
  pulsing,
  showActions,
  onEdit,
}: {
  entry: {
    id: string;
    intensityEmoji: string;
    intensityLabel: string;
    topics: string[];
    note: string;
    savedAt: number;
  };
  pulsing: boolean;
  showActions: boolean;
  onEdit: () => void;
}) {
  const time = new Date(entry.savedAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  const topicsLine = entry.topics.length === 0 ? null : entry.topics.join(" · ");

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={
        pulsing
          ? { opacity: 1, y: 0, backgroundColor: ["#ECE7F6", "#ffffff"] }
          : { opacity: 1, y: 0, backgroundColor: "#ffffff" }
      }
      transition={{ duration: pulsing ? 1.5 : 0.25, ease: "easeOut" }}
      className="rounded-xl px-4 py-3 ring-1 ring-brand-purple/10"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none" aria-hidden>
          {entry.intensityEmoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold text-brand-purple-dark">
              {entry.intensityLabel}
            </p>
            <p className="whitespace-nowrap text-xs text-brand-purple-dark/50">
              {time}, today
            </p>
          </div>
          {topicsLine && (
            <p className="mt-1 text-xs text-brand-purple-dark/70">{topicsLine}</p>
          )}
          {entry.note && (
            <p className="mt-1 text-xs italic text-brand-purple-dark/65">
              &ldquo;{entry.note}&rdquo;
            </p>
          )}
        </div>
      </div>
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 pl-9 text-xs"
          >
            <Link
              to="/chat"
              className="inline-flex items-center gap-1 font-medium text-brand-purple no-underline transition hover:text-brand-purple-dark"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Talk this through with Lubin →
            </Link>
            <Link
              to="/resources"
              className="inline-flex items-center gap-1 font-medium text-brand-purple no-underline transition hover:text-brand-purple-dark"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Try something that might help →
            </Link>
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1 font-medium text-brand-purple transition hover:text-brand-purple-dark"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------- Progress ----------
function Progress({
  checkins: _checkins,
  assessments: _assessments,
  streak: _streak,
}: {
  checkins: CheckIn[];
  assessments: Assessment[];
  streak: number;
}) {
  const moodSample = [
    { d: "Mon", m: 3 },
    { d: "Tue", m: 3.4 },
    { d: "Wed", m: 2.8 },
    { d: "Thu", m: 3.2 },
    { d: "Fri", m: 3.8 },
    { d: "Sat", m: 3.4 },
    { d: "Sun", m: 4 },
  ];

  return (
    <div className="grid gap-5">
      {/* 1. Lubin noticed */}
      <Card>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-purple">
          Lubin noticed
        </p>
        <p className="mt-1 text-sm text-brand-purple-dark/60">
          From your recent conversations.
        </p>
        <p className="mt-4 italic text-sm leading-relaxed text-brand-purple-dark/45">
          Once you've chatted with Lubin a few times, gentle patterns will land here —
          things like “You've mentioned sleep three times this week,” or
          “Mornings have come up a lot.”
        </p>
        <Link
          to="/chat"
          className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-brand-purple no-underline transition hover:text-brand-purple-dark"
        >
          Talk to Lubin <span aria-hidden>→</span>
        </Link>
      </Card>

      {/* 2. Mood */}
      <Card>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-purple">
          How your mood has been
        </p>
        <div className="mt-4 h-40 w-full opacity-40" aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={moodSample} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="d"
                tick={{ fontSize: 11, fill: "#5A4E8A" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide domain={[1, 5]} />
              <Tooltip cursor={false} contentStyle={{ display: "none" }} />
              <Line
                type="monotone"
                dataKey="m"
                stroke="#7E6BAF"
                strokeWidth={2}
                dot={{ r: 3, fill: "#7E6BAF" }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-3 text-sm text-brand-purple-dark/60">
          Even a week of check-ins shows a shape. Yours will appear here.
        </p>
      </Card>

      {/* 3. Self Discovery */}
      <Card>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-purple">
          What you've explored
        </p>
        <div
          className="mt-4 flex items-center justify-between rounded-xl bg-brand-lavender/60 px-4 py-3 opacity-40 ring-1 ring-brand-purple/10"
          aria-hidden
        >
          <div>
            <p className="text-sm font-medium text-brand-purple-dark">
              Mood Check <span className="text-brand-purple-dark/60">(PHQ-9)</span>
            </p>
            <p className="text-xs text-brand-purple-dark/55">May 14, 2026</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-brand-purple-dark">Mild</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
        </div>
        <p className="mt-3 text-sm text-brand-purple-dark/60">
          Each check you complete will live here, ordered by date.
        </p>
      </Card>

      {/* 4. Streak */}
      <Card>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-purple">
          Check-in streak
        </p>
        <div className="mt-4 grid grid-cols-7 gap-1.5 opacity-40" aria-hidden>
          {[false, true, false, false, true, false, false].map((filled, i) => (
            <div
              key={i}
              className={`aspect-square rounded-md ${
                filled ? "bg-brand-purple" : "bg-brand-purple/15"
              }`}
            />
          ))}
        </div>
        <p className="mt-3 text-sm text-brand-purple-dark/60">
          Showing up matters more than streaking. One check-in a week is plenty.
        </p>
      </Card>
    </div>
  );
}

// ---------- Share ----------
function ShareSnapshot({ onCreateAccount }: { onCreateAccount: () => void }) {
  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-brand-purple-dark">
          Share your story, on your terms.
        </h2>
        <p className="mt-3 text-sm text-brand-purple-dark/70 leading-relaxed max-w-2xl">
          You choose what's included. You decide who sees it. Nothing leaves your
          passport unless you send it.
        </p>
      </div>

      {/* Snapshot preview mock */}
      <Card className="relative overflow-hidden">
        <div className="opacity-50" aria-hidden>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-purple">
            Lubin Health Passport · Snapshot for [Therapist]
          </p>

          <div className="mt-5 space-y-2">
            {[
              { name: "Mood Check", date: "2026-04-12", tier: "Mild" },
              { name: "Anxiety Check", date: "2026-04-19", tier: "Moderate" },
            ].map((r) => (
              <div
                key={r.name}
                className="flex items-center justify-between rounded-xl bg-brand-lavender/60 px-4 py-3 ring-1 ring-brand-purple/10"
              >
                <p className="text-sm font-medium text-brand-purple-dark">
                  {r.name}
                </p>
                <p className="text-xs text-brand-purple-dark/60">{r.date}</p>
                <p className="text-sm font-medium text-brand-purple">{r.tier}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-dashed border-brand-purple/25 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-purple">
              Plain-language summary
            </p>
            <p className="mt-2 text-sm leading-relaxed text-brand-purple-dark/80">
              Over the last month, mood has been mostly steady with a few lower
              days mid-week. Anxiety around work has come up more than once,
              and sleep has been a recurring theme.
            </p>
          </div>
        </div>
        <p className="mt-5 text-center text-xs text-brand-purple-dark/55">
          Designed to be readable by both you and a clinical professional.
        </p>
      </Card>

      {/* Account ask */}
      <Card className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <p className="text-sm text-brand-purple-dark/80 leading-relaxed">
          Sharing requires a free account. Stays private — only you control it.
        </p>
        <button
          onClick={onCreateAccount}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(126,107,175,0.55)] transition hover:-translate-y-0.5 hover:bg-brand-purple-dark hover:shadow-[0_12px_24px_-8px_rgba(61,46,107,0.55)]"
        >
          Create account <span aria-hidden>→</span>
        </button>
      </Card>
    </div>
  );
}

// ---------- Check-in modal ----------
function CheckInModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (c: CheckIn) => void;
}) {
  const [mood, setMood] = useState<number | null>(null);
  const [note, setNote] = useState("");

  return (
    <ModalShell onClose={onClose} label="Mood check-in">
      <h2 className="text-xl font-semibold text-brand-purple-dark">
        How are you feeling right now?
      </h2>
      <p className="mt-1 text-sm text-brand-purple-dark/60">
        Pick the one that feels closest.
      </p>

      <div className="mt-5 grid grid-cols-5 gap-2">
        {MOODS.map((m) => (
          <button
            key={m.v}
            onClick={() => setMood(m.v)}
            className={`flex flex-col items-center gap-1 rounded-2xl py-3 transition ${
              mood === m.v
                ? "bg-brand-purple/15 ring-2 ring-brand-purple"
                : "bg-brand-lavender/60 ring-1 ring-brand-purple/10 hover:bg-brand-lavender"
            }`}
          >
            <span className="text-2xl" aria-hidden>
              {m.emoji}
            </span>
            <span className="text-[11px] font-medium text-brand-purple-dark/75">
              {m.label}
            </span>
          </button>
        ))}
      </div>

      <label className="mt-5 block">
        <span className="text-xs font-medium text-brand-purple-dark/70">
          Anything on your mind? (optional)
        </span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="mt-1.5 w-full resize-none rounded-xl border border-brand-purple/15 bg-white p-3 text-sm text-brand-purple-dark placeholder:text-brand-purple-dark/40 focus:outline-none focus:ring-2 focus:ring-brand-purple/30"
          placeholder="A sentence is plenty."
        />
      </label>

      <div className="mt-6 flex items-center justify-between gap-4">
        <a
          href="/register"
          className="text-xs text-brand-purple-dark/55 hover:text-brand-purple"
        >
          Create a free account to save your results permanently →
        </a>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm text-brand-purple-dark/60 hover:text-brand-purple-dark"
          >
            Cancel
          </button>
          <button
            disabled={mood === null}
            onClick={() =>
              mood !== null &&
              onSubmit({
                id: crypto.randomUUID(),
                mood,
                note: note.trim(),
                date: new Date().toISOString(),
              })
            }
            className="rounded-full bg-gradient-to-r from-brand-purple to-brand-purple-dark px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(61,46,107,0.45)] transition hover:bg-brand-purple-dark disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// ---------- Save progress modal ----------
function SaveProgressModal({
  onCreateAccount,
  onSaveLocal,
  onDismiss,
}: {
  onCreateAccount: () => void;
  onSaveLocal: () => void;
  onDismiss: () => void;
}) {
  return (
    <ModalShell onClose={onDismiss} label="Save your progress">
      <h2 className="text-xl font-semibold text-brand-purple-dark">
        Save your progress
      </h2>
      <p className="mt-2 text-sm text-brand-purple-dark/70 leading-relaxed">
        Create a free account to save this result to your Health Passport. It only
        takes a moment.
      </p>
      <div className="mt-6 flex flex-col gap-2">
        <a
          href="/register"
          onClick={onCreateAccount}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-brand-purple to-brand-purple-dark px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(61,46,107,0.45)] transition hover:bg-brand-purple-dark"
        >
          Create account <span aria-hidden>→</span>
        </a>
        <button
          onClick={onSaveLocal}
          className="rounded-full px-5 py-2.5 text-sm font-medium text-brand-purple-dark/70 hover:text-brand-purple-dark"
        >
          Save without account
        </button>
        <button
          onClick={onDismiss}
          className="rounded-full px-5 py-2.5 text-xs text-brand-purple-dark/50 hover:text-brand-purple-dark/70"
        >
          Maybe later
        </button>
      </div>
    </ModalShell>
  );
}

// ---------- Shared bits ----------
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

function ModalShell({
  children,
  onClose,
  label,
}: {
  children: React.ReactNode;
  onClose: () => void;
  label: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      role="dialog"
      aria-label={label}
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-brand-purple-dark/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 md:p-7 shadow-2xl">
        {children}
      </div>
    </div>
  );
}