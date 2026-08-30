import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import AuthModal, { type AuthMode } from "@/components/AuthModal";
import ShareTabView from "@/components/share/ShareTabView";
import CheckInFlow, {
  type CheckInPayload,
  type MoodKey,
  MOOD_TOPICS,
  UNIVERSAL_TOPICS,
  MOOD_LABELS,
  MOOD_ACCENTS,
} from "@/components/CheckInFlow";
import TryHelpOverlay from "@/components/TryHelpOverlay";
import { openChatWaitlist } from "@/components/ChatWaitlistModal";
import {
  CalendarCheck,
  ClipboardList,
  TrendingUp,
  Lock,
  X,
  MessageCircle,
  Sparkles,
  Pencil,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  Clock,
  ArrowRight,
  PlayCircle,
  Sun,
  Zap,
  Compass,
  Leaf,
} from "lucide-react";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  INPROGRESS_EVENT,
  clearInProgress,
  loadAttempts,
  readAllInProgress,
} from "@/lib/patterns/storage";
import { ASSESSMENTS, ASSESSMENT_IDS } from "@/lib/patterns/assessments";
import {
  statusTier,
  getAssessmentStatus,
} from "@/lib/patterns/scoring";
import type { Attempt as PatternAttempt, InProgress } from "@/lib/patterns/types";
import {
  getClientUpcomingAppointments,
  type ClientUpcomingAppointment,
} from "@/components/profile/ClientAppointmentsSection";
import IntakeRequestCard from "@/components/intake/IntakeRequestCard";
import HealthDetailsCard from "@/components/passport/HealthDetailsCard";
import CaregiverAccessCard from "@/components/passport/CaregiverAccessCard";
import { loadProxySignup, proxyFirstName } from "@/lib/proxySignup";
import {
  getProviderGrant,
  subscribeProviderShares,
} from "@/lib/share/providerShareStore";
import { z } from "zod";

export const Route = createFileRoute("/my-health-passport")({
  component: PassportPage,
  validateSearch: z
    .object({
      tab: z.enum(["overview", "progress", "share", "details"]).optional(),
      share: z.string().optional(),
      auth: z.enum(["signup", "signin"]).optional(),
      from: z.string().optional(),
    })
    .partial(),
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
  const search = Route.useSearch();
  const [tab, setTab] = useState<"overview" | "progress" | "share" | "details">(
    search.tab ?? "overview",
  );
  const [autoOpenAppointmentId, setAutoOpenAppointmentId] = useState<
    string | null
  >(search.share ?? null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<
    ClientUpcomingAppointment[]
  >([]);
  useEffect(() => {
    setUpcomingAppointments(getClientUpcomingAppointments());
  }, []);
  useEffect(() => {
    if (search.tab) setTab(search.tab);
    if (search.share) {
      setTab("share");
      setAutoOpenAppointmentId(search.share);
    }
  }, [search.tab, search.share]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkInActive, setCheckInActive] = useState(false);
  const [savePrompt, setSavePrompt] = useState<null | { kind: "checkin"; payload: CheckIn } | { kind: "assessment"; payload: Assessment }>(null);
  const [registerNudge, setRegisterNudge] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const proxySignup = useMemo(() => loadProxySignup(), []);
  const detailsName = useMemo(
    () => proxyFirstName(proxySignup),
    [proxySignup],
  );
  const proxyRelationship = proxySignup
    ? (proxySignup.relationship === "other" && proxySignup.relationshipOther
        ? proxySignup.relationshipOther
        : proxySignup.relationshipLabel ?? proxySignup.relationship
      ).toLowerCase()
    : null;

  const openAuth = (mode: AuthMode = "signup") => setAuthMode(mode);
  const [hasInProgress, setHasInProgress] = useState(false);
  const [pendingShareCount, setPendingShareCount] = useState(0);

  useEffect(() => {
    const refresh = () => {
      const count = upcomingAppointments.reduce(
        (n, a) => (getProviderGrant(a.id) ? n : n + 1),
        0,
      );
      setPendingShareCount(count);
    };
    refresh();
    return subscribeProviderShares(refresh);
  }, [upcomingAppointments]);

  useEffect(() => {
    const refresh = () =>
      setHasInProgress(
        readAllInProgress(ASSESSMENT_IDS).some((ip) => ip.answeredCount > 0),
      );
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key.startsWith("lubinai_inprogress_")) refresh();
    };
    window.addEventListener(INPROGRESS_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(INPROGRESS_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // hydrate from localStorage
  useEffect(() => {
    setCheckins(readLS<CheckIn[]>(CHECKINS_KEY, []));
    setAssessments(readLS<Assessment[]>(ASSESSMENTS_KEY, []));
    if (readLS<boolean | null>(GUEST_KEY, null) === null) writeLS(GUEST_KEY, true);
  }, []);

  // Deep-link: ?auth=signup opens the auth modal (used from other routes
  // like the assessment results screen to nudge guests to register).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const auth = params.get("auth");
    if (auth === "signup" || auth === "signin") {
      setAuthMode(auth as AuthMode);
      // Coming from another screen (e.g. assessment results): skip the
      // onboarding intro and return the user to where they came from.
      const from = params.get("from");
      if (from && from.startsWith("/")) setReturnTo(from);
      params.delete("auth");
      params.delete("from");
      const next = params.toString();
      window.history.replaceState(
        {},
        "",
        window.location.pathname + (next ? `?${next}` : "") + window.location.hash,
      );
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-brand-lavender via-brand-lavender to-[#EFEBFA]" style={{ fontFamily: "Inter, sans-serif" }}>
      <div aria-hidden className="pointer-events-none absolute -top-32 -right-40 h-[480px] w-[480px] rounded-full bg-brand-purple/15 blur-[120px]" />
      <div aria-hidden className="pointer-events-none absolute top-1/3 -left-40 h-[420px] w-[420px] rounded-full bg-brand-purple-accent/20 blur-[120px]" />
      <Navbar />
      <main className="relative mx-auto w-full max-w-[1200px] px-5 md:px-10 pt-32 pb-20">
        {/* Guest nudge banner */}
        <GuestBanner />

        {/* Header */}
        <header className="mt-6 flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg bg-white/60 px-3 py-1.5 ring-1 ring-brand-purple/15 backdrop-blur-sm">
              <Sparkles className="h-3 w-3 text-brand-purple" />
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-brand-purple">
                Your Health Passport
              </p>
            </div>
            <h1 className="mt-4 text-3xl md:text-[2.75rem] md:leading-[1.1] font-bold tracking-tight text-brand-purple-dark">
              Everything you share,<br className="hidden md:inline" /> <span className="bg-gradient-to-r from-brand-purple to-brand-purple-dark bg-clip-text text-transparent">gently remembered.</span>
            </h1>
          </div>
        </header>

        {/* Tabs */}
        <div className="mt-8 flex gap-6 border-b border-brand-purple/15">
          {([
            ["details", detailsName ? `${detailsName}'s card` : "Health card"],
            ["overview", "Today"],
            ["progress", "Patterns"],
            ["share", "Share"],
          ] as const).map(([key, label]) => {
            const active = tab === key;
            const showDot = key === "progress" && hasInProgress;
            const showBadge = key === "share" && pendingShareCount > 0;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`relative -mb-px pb-3 text-sm font-medium transition-colors inline-flex items-center gap-1.5 ${
                  active
                    ? "text-brand-purple-dark"
                    : "text-brand-purple-dark/50 hover:text-brand-purple-dark/80"
                }`}
              >
                {label}
                {showDot && (
                  <span
                    aria-label="In-progress check-in"
                    className="inline-block h-1.5 w-1.5 rounded-full bg-brand-purple shadow-[0_0_0_3px_rgba(126,107,175,0.18)]"
                  />
                )}
                {showBadge && (
                  <span
                    aria-label={`${pendingShareCount} pending share${pendingShareCount === 1 ? "" : "s"}`}
                    className="ml-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-brand-purple px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-[0_0_0_3px_rgba(126,107,175,0.15)]"
                  >
                    {pendingShareCount}
                  </span>
                )}
                {active && (
                  <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-brand-purple" />
                )}
              </button>
            );
          })}
        </div>

        {/* Gentle session prep nudges — same request as the appointment card */}
        {tab !== "share" && tab !== "details" && upcomingAppointments.length > 0 && (
          <div className="mt-8 space-y-4">
            {upcomingAppointments.map((appt) => (
              <IntakeRequestCard
                key={appt.id}
                appointmentId={appt.id}
                providerName={appt.providerName}
                sessionLabel={appt.fullLabel}
              />
            ))}
          </div>
        )}

        {/* Tab content */}
        <div className="mt-8">
          {tab === "overview" && (
            <Overview
              today={today}
              checkins={checkins}
              onLogMood={() => setCheckInActive(true)}
              checkInActive={checkInActive}
              onCloseCheckIn={() => setCheckInActive(false)}
              isGuest={readLS<boolean | null>(GUEST_KEY, true) !== false}
              onAfterSave={() => setRegisterNudge(true)}
            />
          )}
          {tab === "progress" && (
            <Progress checkins={checkins} assessments={assessments} streak={streak} />
          )}
          {tab === "share" && (
            <ShareTabView
              checkins={checkins}
              isGuest={readLS<boolean | null>(GUEST_KEY, true) !== false}
              onRequestSignup={() => openAuth("signup")}
              onStartCheckin={() => setTab("overview")}
              upcomingAppointments={upcomingAppointments}
              autoOpenAppointmentId={autoOpenAppointmentId}
              onAutoOpenHandled={() => setAutoOpenAppointmentId(null)}
            />
          )}
          {tab === "details" && (
            <div className="mx-auto max-w-5xl">
              {/* Who this passport belongs to — set at registration */}
              <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl border border-brand-purple/15 bg-brand-purple/[0.06] px-4 py-3">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-purple">
                  {detailsName ? "Managing for someone" : "This is your passport"}
                </span>
                <p className="text-sm text-brand-purple-dark/70">
                  {detailsName
                    ? `You registered as ${detailsName}'s ${proxyRelationship ?? "carer"}, so everything here is kept in ${detailsName}'s name and answers providers' questions on their behalf.`
                    : "You registered as the person receiving care, so these details belong to you and help providers understand your health."}
                </p>
              </div>

              <HealthDetailsCard showHeader={false} />
              <div className="mt-8">
                <CaregiverAccessCard ownerLabel={detailsName ?? "you"} />
              </div>

            </div>
          )}

        </div>

        {/* Mobile registration CTA — hidden on Share tab which has its own in-card CTA */}
        <div className={`mt-6 sm:hidden ${tab === "share" ? "hidden" : "flex"}`}>
          <button
            type="button"
            onClick={() => openAuth("signup")}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#C9BEE5] to-[#A89BD0] px-5 py-3 text-sm font-semibold text-[#3D2E6B] shadow-[0_8px_20px_-6px_rgba(168,155,208,0.55)]"
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
        onContinueWithGoogle={() => {
          // Preview-only mock: flip guest mode off so the share preview
          // reflects a signed-in user without a real auth backend.
          try {
            writeLS(GUEST_KEY, false);
          } catch {}
          setAuthMode(null);
          if (typeof window !== "undefined") {
            if (returnTo) window.location.href = returnTo;
            else window.location.reload();
          }
        }}
      />

      {registerNudge && (
        <SaveProgressModal
          onCreateAccount={() => {
            setRegisterNudge(false);
            openAuth("signup");
          }}
          onSaveLocal={() => setRegisterNudge(false)}
          onDismiss={() => setRegisterNudge(false)}
        />
      )}
    </div>
  );
}

// ---------- Logged-out content (original page body, factored out) ----------
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
      className={`relative mb-6 rounded-[16px] border-l-4 border-l-[#7E6BAF] bg-white p-5 sm:p-7 transition-all duration-300 ${
        fading ? "opacity-0 -translate-y-2" : "opacity-100 translate-y-0"
      }`}
      style={{
        boxShadow: "0 2px 12px rgba(126, 107, 175, 0.08)",
      }}
    >
      <button
        onClick={handleDismiss}
        className="absolute top-3.5 right-3.5 text-[#9CA3AF] transition hover:text-[#6B7280]"
        aria-label="Dismiss"
      >
        <X size={18} />
      </button>

      <span
        className="text-[10px] sm:text-[11px] font-semibold uppercase"
        style={{ color: "#7E6BAF", letterSpacing: "0.08em" }}
      >
        FROM LUBIN
      </span>

      <h2
        className="mt-2 text-[17px] sm:text-[20px] font-bold leading-snug"
        style={{ color: "#2C2B4B", fontFamily: "Inter, sans-serif", marginBottom: 12 }}
      >
        Your Health Passport is your mental wellness story
      </h2>

      <p
        className="text-[14px] sm:text-[15px] leading-relaxed sm:leading-[1.7]"
        style={{
          color: "#5A4E8A",
          fontFamily: "Inter, sans-serif",
        }}
      >
        Most people go through their mental health journey without ever seeing the full picture — what triggers their stress, when their mood tends to dip, what actually helps. Your Health Passport changes that. Every check-in, every assessment, every conversation with Lubin quietly builds a private record that's yours alone. Over time, you'll start to notice patterns you never saw before — and that awareness is where real change begins.
      </p>

      <div className="mt-3 sm:mt-4 flex flex-wrap gap-2">
        {[
          "Private to you only",
          "Builds over time",
          "Shared only when you choose",
        ].map((text) => (
          <span
            key={text}
            className="inline-flex items-center rounded-lg px-3 py-1 sm:px-3.5 sm:py-1.5 text-[12px] sm:text-[13px] font-medium"
            style={{ background: "#EDE9FE", color: "#7E6BAF" }}
          >
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------- Overview ----------
export function Overview({
  today,
  checkins: _checkins,
  onLogMood,
  checkInActive,
  onCloseCheckIn,
  isGuest,
  onAfterSave,
}: {
  today: string;
  checkins: CheckIn[];
  onLogMood: () => void;
  checkInActive: boolean;
  onCloseCheckIn: () => void;
  isGuest?: boolean;
  onAfterSave?: () => void;
}) {
  type LiveCheckIn = CheckInPayload & { id: string; savedAt: number };
  const [liveEntries, setLiveEntries] = useState<LiveCheckIn[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [latestSavedId, setLatestSavedId] = useState<string | null>(null);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const [helpMood, setHelpMood] = useState<MoodKey | null>(null);

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
    const toastId = Date.now();
    setToast({
      id: toastId,
      message: editingId ? "Check-in updated" : "Check-in saved",
    });
    window.setTimeout(
      () => setToast((c) => (c && c.id === toastId ? null : c)),
      2800,
    );
    window.setTimeout(() => setPulseId((c) => (c === id ? null : c)), 1600);
    window.setTimeout(() => setLatestSavedId((c) => (c === id ? null : c)), 30000);
    if (isGuest && onAfterSave) {
      window.setTimeout(() => onAfterSave(), 400);
    }
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
    <div className="flex flex-col gap-5">
      {/* Top row: greeting + insights side by side on lg */}
      <div className="grid gap-5 lg:grid-cols-2 lg:items-stretch">
        <Card className="relative h-full overflow-hidden bg-gradient-to-br from-white via-white to-brand-lavender/40">
          <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-brand-purple/15 blur-3xl" />
          <div className="relative">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-brand-purple">
              Today
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-brand-purple-dark">
              How are you today?
            </h2>
            <p className="mt-3 text-sm text-brand-purple-dark/65">
              Hi there <span className="inline-block animate-pulse">👋</span> — {today}
            </p>
          </div>
        </Card>
        <Card className="relative h-full overflow-hidden bg-gradient-to-br from-white via-white to-brand-purple/[0.04]">
          <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-brand-purple-accent/25 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-brand-purple">
                What we're noticing
              </p>
            </div>
            <p className="mt-4 italic text-sm leading-relaxed text-brand-purple-dark/55">
              After a few check-ins you might see something like:
              {" "}"Sleep keeps coming up in your conversations," or
              {" "}"Your mood has been steady this week."
            </p>
          </div>
        </Card>
      </div>

      {/* Mood check-in CTA — full width */}
      <Card className="relative overflow-hidden bg-gradient-to-r from-brand-lavender via-brand-purple-accent/40 to-brand-lavender">
        <div aria-hidden className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-white/40 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-brand-purple/15 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg bg-white/70 px-3 py-1 ring-1 ring-brand-purple/15 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-purple-dark/80">
                Daily check-in
              </p>
            </div>
            <p className="mt-3 text-xl font-bold text-brand-purple-dark">
              How are you feeling today?
            </p>
            <p className="mt-1 text-sm text-brand-purple-dark/65">
              Takes 15 seconds. Builds your passport over time.
            </p>
          </div>
          <button
            onClick={() => (checkInActive ? onCloseCheckIn() : onLogMood())}
            className={`group inline-flex items-center justify-center gap-1.5 self-start rounded-lg px-6 py-3 text-sm font-bold ring-1 transition-all duration-200 ease-out ${
              checkInActive
                ? "bg-white text-brand-purple-dark shadow-[0_6px_18px_-8px_rgba(91,71,160,0.35)] ring-brand-purple/10 hover:bg-brand-lavender"
                : "bg-white text-brand-purple-dark shadow-[0_6px_18px_-8px_rgba(91,71,160,0.35)] ring-brand-purple/10 hover:-translate-y-0.5 md:hover:bg-brand-purple md:hover:text-white md:hover:ring-brand-purple md:hover:shadow-[0_12px_26px_-8px_rgba(91,71,160,0.5)]"
            }`}
          >
            {checkInActive ? (
              <>Close <span aria-hidden>×</span></>
            ) : (
              <>Check in <span aria-hidden className="transition-transform duration-200 md:group-hover:translate-x-0.5">→</span></>
            )}
          </button>
        </div>
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

      {/* Mood this month — full width */}
      <MoodThisMonth entries={liveEntries} onLogToday={onLogMood} />

      {/* Recent check-ins — full width */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-white via-white to-brand-lavender/30">
        <div aria-hidden className="pointer-events-none absolute -top-20 -right-20 h-48 w-48 rounded-full bg-brand-purple-accent/20 blur-3xl" />
        <div className="relative">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-brand-purple">
            Recent check-ins
          </p>
        </div>
        {liveEntries.length > 0 ? (
          <div className="mt-4 space-y-3">
            <AnimatePresence initial={false}>
              {liveEntries.map((entry) => (
                <LiveEntry
                  key={entry.id}
                  entry={entry}
                  pulsing={pulseId === entry.id}
                  showActions={latestSavedId === entry.id}
                  expanded={expandedId === entry.id}
                  onToggle={() =>
                    setExpandedId((c) => (c === entry.id ? null : entry.id))
                  }
                  onEdit={() => handleEdit(entry.id)}
                  onTryHelp={() => setHelpMood(entry.mood)}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-brand-purple/20 bg-brand-lavender/30 px-4 py-6 text-center">
            <p className="text-sm text-brand-purple-dark/70">
              No check-ins yet. Your first check-in will appear here — Lubin remembers the rest.
            </p>
          </div>
        )}
        </div>
      </Card>

      {/* Soft anchor CTA */}
      <button
        type="button"
        onClick={openChatWaitlist}
        className="group relative block w-full overflow-hidden rounded-3xl bg-gradient-to-br from-brand-purple/15 via-brand-lavender/40 to-brand-purple-accent/20 px-6 py-6 text-center no-underline ring-1 ring-brand-purple/15 transition hover:ring-brand-purple/30"
      >
        <div aria-hidden className="pointer-events-none absolute -top-12 left-1/4 h-32 w-32 rounded-full bg-brand-purple/15 blur-2xl transition group-hover:bg-brand-purple/25" />
        <div className="relative inline-flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-brand-purple/15">
            <MessageCircle className="h-4 w-4 text-brand-purple" />
          </span>
          <p className="text-sm font-medium text-brand-purple-dark">
            Want to talk it through instead?{" "}
            <span className="font-bold text-brand-purple transition group-hover:text-brand-purple-dark">Talk to Lubin →</span>
          </p>
        </div>
      </button>
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            role="status"
            aria-live="polite"
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-lg bg-brand-purple-dark px-4 py-2.5 text-sm font-medium text-white shadow-[0_18px_40px_-12px_rgba(61,46,107,0.55)]"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-300" strokeWidth={2.4} />
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
      <TryHelpOverlay
        open={helpMood !== null}
        mood={helpMood}
        onClose={() => setHelpMood(null)}
      />
    </div>
  );
}

type LiveCheckInLite = CheckInPayload & { id: string; savedAt: number };

function MoodThisMonth({
  entries,
  className = "",
  onLogToday,
}: {
  entries: LiveCheckInLite[];
  className?: string;
  onLogToday?: () => void;
}) {
  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const viewDate = new Date(view.year, view.month, 1);
  const monthName = viewDate.toLocaleString(undefined, { month: "long" });
  const yearLabel = ` ${view.year}`;
  const isCurrentMonth =
    view.year === today.getFullYear() && view.month === today.getMonth();
  const inMonth = entries.filter((e) => {
    const d = new Date(e.savedAt);
    return d.getMonth() === view.month && d.getFullYear() === view.year;
  });
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

  const total = inMonth.length;
  const moodOrder: MoodKey[] = ["calm", "okay", "drained", "stressed", "anxious", "low"];
  const counts: Record<MoodKey, number> = {
    calm: 0, okay: 0, drained: 0, stressed: 0, anxious: 0, low: 0,
  };
  inMonth.forEach((e) => { counts[e.mood]++; });

  const topMood =
    total > 0
      ? moodOrder.reduce((a, b) => (counts[b] > counts[a] ? b : a), moodOrder[0])
      : null;

  const avgIntensity =
    total > 0
      ? (inMonth.reduce((s, e) => s + (e.intensityIdx + 1), 0) / total).toFixed(1)
      : "—";

  const topicTally = new Map<string, number>();
  inMonth.forEach((e) =>
    e.topics.forEach((t) => topicTally.set(t, (topicTally.get(t) ?? 0) + 1)),
  );
  const topTopics = [...topicTally.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t);

  return (
    <Card className={`${className ?? ""} relative overflow-hidden bg-gradient-to-br from-white via-white to-brand-lavender/25`}>
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-brand-purple/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-brand-lavender/40 blur-3xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-brand-purple-dark">
            Mood this month
          </p>
          <p className="mt-1 text-[13px] font-medium text-brand-purple/80">
            Built automatically from your daily check-ins this month.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-brand-lavender/50 p-1.5 ring-1 ring-brand-purple/10">
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

      <div className="relative">
      {total === 0 ? (
        <p className="mt-4 text-sm text-brand-purple-dark/55">
          {isCurrentMonth
            ? "No check-ins yet this month. Your first one will start building this view."
            : `No check-ins logged for ${monthName}${yearLabel}.`}
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Metric
            label="Check-ins"
            value={String(total)}
            hint={`Number of mood check-ins you've logged in ${monthName}${yearLabel}. One per day counts once.`}
          />
          <Metric
            label="Most felt"
            value={topMood ? MOOD_LABELS[topMood] : "—"}
            hint="The mood you selected most often this month across your check-ins."
          />
          <Metric
            label="Avg intensity"
            value={avgIntensity}
            suffix="of 5"
            hint="Average intensity of your check-ins this month, on a 1 (very low) to 5 (very high) scale."
          />
        </div>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:gap-12 lg:items-stretch">
        <div className="lg:col-span-8">
          <MoodCalendar
            inMonth={inMonth}
            year={view.year}
            month={view.month}
            today={today}
            onLogToday={onLogToday}
          />
        </div>
        <div className="lg:col-span-4 flex">
          <MoodMix counts={counts} total={total} />
        </div>
      </div>

      {topTopics.length > 0 && (
        <div className="mt-6">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-brand-purple-dark/55">
              On your mind
            </p>
            <p className="text-[11px] text-brand-purple-dark/45">
              Topics you tagged most often
            </p>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {topTopics.map((t) => (
              <span
                key={t}
                className="rounded-lg bg-brand-purple/10 px-2.5 py-1 text-xs font-medium text-brand-purple-dark"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
      </div>
    </Card>
  );
}

function MoodCalendar({
  inMonth,
  year,
  month,
  today,
  onLogToday,
}: {
  inMonth: LiveCheckInLite[];
  year: number;
  month: number;
  today: Date;
  onLogToday?: () => void;
}) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay(); // 0 = Sun
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() === month;
  const isPastMonth =
    year < today.getFullYear() ||
    (year === today.getFullYear() && month < today.getMonth());
  const todayDate = today.getDate();

  // Latest check-in per day-of-month
  const byDay = new Map<number, LiveCheckInLite>();
  inMonth.forEach((e) => {
    const d = new Date(e.savedAt).getDate();
    const existing = byDay.get(d);
    if (!existing || e.savedAt > existing.savedAt) byDay.set(d, e);
  });

  const cells: Array<{ day: number | null; entry?: LiveCheckInLite }> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({ day: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, entry: byDay.get(d) });

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-brand-purple-dark/45">
          Mood calendar
        </p>
        <p className="text-[11px] font-medium text-brand-purple-dark/45">
          One emoji per day — log daily to fill the month
        </p>
      </div>

      <div className="mt-6 grid w-full grid-cols-7 gap-y-5 gap-x-2">
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
          const isToday = isCurrentMonth && c.day === todayDate;
          const isPastDay =
            isPastMonth || (isCurrentMonth && c.day < todayDate);
          const entry = c.entry;
          const isClickable = isToday && !entry && !!onLogToday;
          const dateLabel = new Date(year, month, c.day).toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
          });
          return (
            <div key={`d-${c.day}`} className="group relative flex items-center justify-center">
              <button
                type="button"
                disabled={!isClickable}
                onClick={isClickable ? onLogToday : undefined}
                aria-label={
                  isClickable
                    ? `Check in for ${dateLabel}`
                    : dateLabel
                }
                className={`relative flex aspect-square w-full max-w-[48px] items-center justify-center rounded-full text-[13px] transition-all duration-200 ${
                  entry
                    ? "bg-gradient-to-br from-brand-lavender to-brand-purple/25 text-brand-purple-dark font-semibold shadow-[0_4px_12px_-2px_rgba(123,104,199,0.25)] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_-2px_rgba(123,104,199,0.35)] cursor-default"
                    : isToday
                      ? "bg-gradient-to-br from-white to-brand-lavender/60 text-brand-purple-dark font-bold ring-2 ring-brand-purple shadow-[0_0_0_5px_rgba(123,104,199,0.12),0_8px_24px_-4px_rgba(123,104,199,0.45)] hover:shadow-[0_0_0_6px_rgba(123,104,199,0.18),0_10px_28px_-4px_rgba(123,104,199,0.55)] hover:-translate-y-0.5 cursor-pointer"
                      : isPastDay
                        ? "bg-brand-lavender/45 text-brand-purple-dark/40 cursor-not-allowed"
                        : "text-brand-purple-dark/30 border border-dashed border-brand-purple/25 cursor-not-allowed"
                }`}
              >
                {entry ? (
                  <span className="text-lg leading-none" aria-hidden>
                    {entry.intensityEmoji}
                  </span>
                ) : (
                  <span>{c.day}</span>
                )}
              </button>
              {entry && (
                <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-brand-purple-dark px-2.5 py-1.5 text-[11px] font-medium text-white shadow-lg group-hover:block">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
                    {dateLabel}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5">
                    <span aria-hidden>{entry.intensityEmoji}</span>
                    {MOOD_LABELS[entry.mood]} — {entry.intensityLabel}
                  </p>
                  <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-brand-purple-dark" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  suffix,
  hint,
  muted = false,
}: {
  label: string;
  value: string;
  suffix?: string;
  hint?: string;
  muted?: boolean;
}) {
  return (
    <div
      className={`group relative rounded-xl px-3 py-3 ring-1 transition ${
        muted
          ? "bg-brand-purple/[0.04] ring-brand-purple/10 opacity-60"
          : "bg-brand-lavender/50 ring-brand-purple/10"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className={`text-[10px] font-semibold uppercase tracking-wider ${
            muted ? "text-brand-purple-dark/40" : "text-brand-purple-dark/55"
          }`}
        >
          {label}
        </p>
        {hint && !muted && (
          <TooltipProvider delayDuration={150}>
            <UITooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`About ${label}`}
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full text-brand-purple-dark/35 transition hover:text-brand-purple"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-xs leading-snug">
                {hint}
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        )}
      </div>
      <p
        className={`mt-1 flex items-baseline gap-1 text-lg font-semibold tabular-nums ${
          muted ? "text-brand-purple-dark/40" : "text-brand-purple-dark"
        }`}
      >
        <span>{value}</span>
        {suffix && (
          <span
            className={`text-xs font-medium ${
              muted ? "text-brand-purple-dark/30" : "text-brand-purple-dark/45"
            }`}
          >
            {suffix}
          </span>
        )}
      </p>
    </div>
  );
}

function MoodMix({
  counts,
  total,
}: {
  counts: Record<MoodKey, number>;
  total: number;
}) {
  const order: MoodKey[] = ["calm", "okay", "drained", "stressed", "anxious", "low"];
  const sorted = [...order].sort((a, b) => counts[b] - counts[a]);
  const topMood = total > 0 ? sorted[0] : null;
  return (
    <div className="relative flex w-full flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-brand-lavender/60 via-brand-lavender/30 to-white/40 p-6 ring-1 ring-brand-purple/10 shadow-[0_8px_24px_-12px_rgba(123,104,199,0.25)] backdrop-blur-sm">
      <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-brand-purple/15 blur-2xl" />
      <div className="relative flex flex-1 flex-col">
      <p className="text-[12px] font-bold tracking-tight text-brand-purple-dark">
        Mood Mix
      </p>
      <p className="mt-1 text-[11px] font-medium text-brand-purple/70">
        How your check-ins broke down
      </p>
      <ul className="mt-5 space-y-4">
        {sorted.map((m) => {
          const c = counts[m];
          const pct = total > 0 ? Math.round((c / total) * 100) : 0;
          const muted = c === 0;
          return (
            <li key={m} className={muted ? "opacity-50" : undefined}>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: MOOD_ACCENTS[m] }}
                  />
                  <span className="truncate text-xs font-semibold text-brand-purple-dark">
                    {MOOD_LABELS[m]}
                  </span>
                </div>
                <span className="text-[11px] font-bold tabular-nums text-brand-purple-dark/50">
                  {pct}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-purple/10">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: MOOD_ACCENTS[m],
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto pt-6">
        {total === 0 ? (
          <div className="border-t border-brand-purple/10 pt-5">
            <p className="text-[12px] leading-relaxed text-brand-purple-dark/65">
              No check-ins yet this month. Your first one will start building this view.
            </p>
          </div>
        ) : (
          topMood && (
            <div className="rounded-2xl bg-white/60 p-4 ring-1 ring-brand-purple/10 backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-purple-dark/45">
                This month
              </p>
              <div className="mt-1.5 flex items-baseline justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: MOOD_ACCENTS[topMood] }}
                  />
                  <p className="truncate text-sm font-bold text-brand-purple-dark">
                    Mostly {MOOD_LABELS[topMood].toLowerCase()}
                  </p>
                </div>
                <p className="shrink-0 text-[11px] font-semibold tabular-nums text-brand-purple-dark/55">
                  {total} {total === 1 ? "check-in" : "check-ins"}
                </p>
              </div>
            </div>
          )
        )}
      </div>
      </div>
    </div>
  );
}

function LiveEntry({
  entry,
  pulsing,
  showActions,
  expanded,
  onToggle,
  onEdit,
  onTryHelp,
}: {
  entry: {
    id: string;
    mood: MoodKey;
    intensityIdx: number;
    intensityEmoji: string;
    intensityLabel: string;
    topics: string[];
    note: string;
    savedAt: number;
  };
  pulsing: boolean;
  showActions: boolean;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onTryHelp: () => void;
}) {
  const time = new Date(entry.savedAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  // Order topics: mood-specific first (in canonical order), then universal (in canonical order)
  const moodTopics = MOOD_TOPICS[entry.mood].filter((t) => entry.topics.includes(t));
  const universalTopics = UNIVERSAL_TOPICS.filter((t) => entry.topics.includes(t));
  const orderedTopics = [...moodTopics, ...universalTopics];
  const collapsedTopics = orderedTopics.slice(0, 3);
  const remainingCount = Math.max(0, orderedTopics.length - 3);
  const accent = "#EDE9F4";
  const fullLabel = `${MOOD_LABELS[entry.mood]} — ${entry.intensityLabel}`;

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
      className="relative overflow-hidden rounded-xl ring-1 ring-brand-purple/10"
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: accent }}
      />
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="block w-full px-4 py-3 pl-5 text-left"
      >
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none" aria-hidden>
          {entry.intensityEmoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold text-brand-purple-dark">
              {expanded ? fullLabel : entry.intensityLabel}
            </p>
            <p className="whitespace-nowrap text-xs text-brand-purple-dark/50">
              {time}, today
            </p>
          </div>
          {!expanded && orderedTopics.length > 0 && (
            <p className="mt-1 text-xs text-brand-purple-dark/70">
              {collapsedTopics.join(" · ")}
              {remainingCount > 0 && (
                <span className="ml-1.5 inline-flex items-center rounded-full bg-brand-purple/10 px-1.5 py-0.5 text-[10px] font-medium text-brand-purple-dark/70">
                  +{remainingCount} more
                </span>
              )}
            </p>
          )}
          {!expanded && entry.note && (
            <p className="mt-1 text-xs italic text-brand-purple-dark/65">
              &ldquo;{entry.note}&rdquo;
            </p>
          )}
        </div>
      </div>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
          >
            <div
              className="cursor-pointer px-4 pb-4 pl-14"
              onClick={onToggle}
              role="button"
              tabIndex={-1}
            >
              {orderedTopics.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {orderedTopics.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-brand-purple/10 px-2.5 py-1 text-xs text-brand-purple-dark/80"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {entry.note && (
                <p className="mt-3 text-xs italic text-brand-purple-dark/70">
                  &ldquo;{entry.note}&rdquo;
                </p>
              )}
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand-purple transition hover:text-brand-purple-dark"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit →
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 pb-3 pl-14 text-xs"
          >
            <button
              type="button"
              onClick={openChatWaitlist}
              className="inline-flex items-center gap-1 font-semibold text-brand-purple-dark no-underline transition hover:text-brand-purple"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Talk this through with Lubin →
            </button>
            <button
              type="button"
              onClick={onTryHelp}
              className="inline-flex items-center gap-1 font-semibold text-brand-purple-dark transition hover:text-brand-purple"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Try something that might help →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------- Progress ----------
export function Progress({
  checkins: _checkins,
  assessments: _assessments,
  streak: _streak,
}: {
  checkins: CheckIn[];
  assessments: Assessment[];
  streak: number;
}) {
  const [patternAttempts, setPatternAttempts] = useState<PatternAttempt[]>([]);
  const [exploredExpanded, setExploredExpanded] = useState<boolean>(false);
  const [inProgressList, setInProgressList] = useState<InProgress[]>([]);
  const [startOverTarget, setStartOverTarget] = useState<InProgress | null>(null);

  useEffect(() => {
    const refresh = () => {
      setPatternAttempts(loadAttempts().sort((a, b) => b.takenAt - a.takenAt));
      setInProgressList(
        readAllInProgress(ASSESSMENT_IDS).filter((ip) => ip.answeredCount > 0),
      );
    };
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key.startsWith("lubinai_inprogress_")) refresh();
    };
    window.addEventListener(INPROGRESS_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(INPROGRESS_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const assessmentBySlug = useMemo(() => {
    const map: Record<string, (typeof ASSESSMENTS)[number]> = {};
    for (const a of ASSESSMENTS) map[a.id] = a;
    return map;
  }, []);

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
      {inProgressList.length > 0 && (
        <ContinueWhereYouLeftOff
          items={inProgressList}
          onStartOver={(ip) => setStartOverTarget(ip)}
        />
      )}

      {/* 0. Understand yourself better */}
      <UnderstandYourselfSection patternAttempts={patternAttempts} />

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
        <button
          type="button"
          onClick={openChatWaitlist}
          className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-brand-purple no-underline transition hover:text-brand-purple-dark"
        >
          Talk to Lubin <span aria-hidden>→</span>
        </button>
      </Card>

      {/* 2. Mood — hidden for now */}

      {/* 3. Self Discovery */}
      <Card>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-purple">
          What you've explored
        </p>
        {patternAttempts.length === 0 ? (
          <>
            <div
              className="mt-4 flex items-center justify-between rounded-xl bg-brand-lavender/60 px-4 py-3 opacity-40 ring-1 ring-brand-purple/10"
              aria-hidden
            >
              <div>
                <p className="text-sm font-medium text-brand-purple-dark">
                  Mood &amp; wellbeing check
                </p>
                <p className="text-xs text-brand-purple-dark/55">Example</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-brand-purple-dark">Mild</span>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
            <p className="mt-3 text-sm text-brand-purple-dark/60">
              Each check you complete will live here, ordered by date.
            </p>
            <Link
              to="/self-discovery"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-purple no-underline transition hover:text-brand-purple-dark"
            >
              Take a check-in <span aria-hidden>→</span>
            </Link>
          </>
        ) : (
          <>
            <div className="mt-3 space-y-1.5">
              {(exploredExpanded ? patternAttempts : patternAttempts.slice(0, 5)).map((a) => {
                const meta = assessmentBySlug[a.assessmentId];
                const slug = meta?.slug ?? a.assessmentId;
                const status = meta
                  ? getAssessmentStatus(
                      a.assessmentId,
                      a.score,
                      meta.maxScore,
                      meta.lowerIsBetter,
                    )
                  : null;
                return (
                  <Link
                    key={a.id}
                    to="/self-discovery/$slug"
                    params={{ slug }}
                    search={{ attempt: a.id, from: "patterns" as const }}
                    className="flex items-center justify-between gap-3 rounded-lg bg-brand-lavender/50 px-3 py-2 ring-1 ring-brand-purple/10 no-underline transition hover:bg-brand-lavender/80"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-brand-purple-dark">
                        {a.assessmentName}
                        {meta?.clinicalName ? (
                          <span className="ml-1 text-[12px] text-brand-purple-dark/55">
                            ({meta.clinicalName})
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-brand-purple-dark/55">
                        {status ? (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1 ${status.tone}`}
                          >
                            {status.label}
                          </span>
                        ) : null}
                        <span>
                          {new Date(a.takenAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </p>
                    </div>
                    <div className="flex flex-none items-center gap-2">
                      <p className="text-[13px] font-semibold tabular-nums text-brand-purple-dark">
                        {a.score}
                        {meta ? (
                          <span className="text-[11px] font-normal text-brand-purple-dark/55">
                            /{meta.maxScore}
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
            {patternAttempts.length > 5 && (
              <button
                type="button"
                onClick={() => setExploredExpanded((v) => !v)}
                className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-brand-purple transition hover:text-brand-purple-dark"
              >
                {exploredExpanded
                  ? "Show less"
                  : `See more (${patternAttempts.length - 5})`}{" "}
                <span aria-hidden>{exploredExpanded ? "↑" : "↓"}</span>
              </button>
            )}
          </>
        )}
      </Card>

      {/* 4. Reflection rhythm */}
      <Card>
        <ReflectionRhythm attempts={patternAttempts} />
      </Card>

      <StartOverConfirm
        target={startOverTarget}
        onCancel={() => setStartOverTarget(null)}
        onConfirm={() => {
          if (startOverTarget) {
            clearInProgress(startOverTarget.assessmentId);
          }
          setStartOverTarget(null);
        }}
      />
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
              { name: "Mood & wellbeing check", date: "2026-04-12", tier: "Mild" },
              { name: "Anxiety check-in", date: "2026-04-19", tier: "Moderate" },
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

/* =============================================================
   Understand yourself better — grouped assessments catalogue
   ============================================================= */

type GroupKey = "core" | "emotional" | "patterns" | "lifestyle";

const GROUP_ICON: Record<
  GroupKey,
  { Icon: typeof Sun; short: string; tint: string; ring: string; iconColor: string }
> = {
  core: {
    Icon: Sun,
    short: "Mood & energy",
    tint: "bg-brand-purple/8",
    ring: "ring-brand-purple/25",
    iconColor: "text-brand-purple",
  },
  emotional: {
    Icon: Zap,
    short: "Stress & anxiety",
    tint: "bg-brand-purple/8",
    ring: "ring-brand-purple/25",
    iconColor: "text-brand-purple",
  },
  patterns: {
    Icon: Compass,
    short: "Focus & patterns",
    tint: "bg-brand-purple/8",
    ring: "ring-brand-purple/25",
    iconColor: "text-brand-purple",
  },
  lifestyle: {
    Icon: Leaf,
    short: "Lifestyle & body",
    tint: "bg-brand-purple/8",
    ring: "ring-brand-purple/25",
    iconColor: "text-brand-purple",
  },
};

function UnderstandYourselfSection({
  patternAttempts,
}: {
  patternAttempts: PatternAttempt[];
}) {
  const completedIds = new Set(patternAttempts.map((a) => a.assessmentId));
  const completedCount = ASSESSMENTS.filter((a) => completedIds.has(a.id)).length;
  const total = ASSESSMENTS.length;
  const groupOrder: GroupKey[] = ["core", "emotional", "patterns", "lifestyle"];
  void completedCount;

  return (
    <section className="group/section relative overflow-hidden rounded-3xl p-[1.5px] shadow-[0_24px_60px_-32px_rgba(126,107,175,0.55)] transition-shadow hover:shadow-[0_30px_70px_-30px_rgba(126,107,175,0.7)]">
      {/* Gradient border shell */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-brand-purple/35 via-white/40 to-[#C4B5FD]/40" />

      <div className="relative overflow-hidden rounded-[calc(1.5rem-1.5px)] bg-gradient-to-br from-white via-brand-lavender/30 to-white p-6 sm:p-7">
        {/* Decorative animated blobs */}
        <div className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full bg-gradient-to-br from-brand-purple/25 to-brand-purple-accent/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-16 h-56 w-56 rounded-full bg-gradient-to-br from-[#C4B5FD]/30 to-transparent blur-3xl" />
        {/* Subtle grid texture */}
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

          {/* CTA */}
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

/* =============================================================
   Continue where you left off (in-progress assessments)
   ============================================================= */

function ContinueWhereYouLeftOff({
  items,
  onStartOver,
}: {
  items: InProgress[];
  onStartOver: (ip: InProgress) => void;
}) {
  const assessmentById = useMemo(() => {
    const map: Record<string, (typeof ASSESSMENTS)[number]> = {};
    for (const a of ASSESSMENTS) map[a.id] = a;
    return map;
  }, []);
  const most = items[0];
  const rest = items.slice(1);

  const renderRow = (ip: InProgress, primary: boolean) => {
    const meta = assessmentById[ip.assessmentId];
    const slug = meta?.slug ?? ip.assessmentId;
    const total = ip.total || meta?.questions.length || 1;
    const answered = Math.min(ip.answeredCount, total);
    const pct = Math.round((answered / total) * 100);
    const name = ip.assessmentName || meta?.name || "Check-in";
    return (
      <div
        key={ip.assessmentId}
        className={`flex flex-col gap-3 rounded-2xl border border-brand-purple/15 bg-white/85 px-4 py-3.5 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between ${
          primary ? "shadow-[0_14px_36px_-22px_rgba(126,107,175,0.45)]" : ""
        }`}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-brand-purple-dark">
            {name}
          </p>
          <p className="mt-0.5 text-[12px] text-brand-purple-dark/60">
            Question {Math.min(answered + 1, total)} of {total}
          </p>
          <div className="mt-2 h-1.5 w-full max-w-[260px] overflow-hidden rounded-full bg-brand-lavender">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-purple to-brand-purple-accent transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div className="flex flex-none items-center gap-2">
          <button
            type="button"
            onClick={() => onStartOver(ip)}
            className="rounded-full border border-brand-purple/25 bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-brand-purple-dark/75 transition hover:border-brand-purple/50 hover:text-brand-purple-dark"
          >
            Start over
          </button>
          <Link
            to="/self-discovery/$slug"
            params={{ slug }}
            search={{ from: "patterns" as const }}
            className="inline-flex items-center gap-1 rounded-full bg-brand-purple px-3.5 py-1.5 text-[12.5px] font-semibold text-white no-underline shadow-sm transition hover:bg-brand-purple-dark"
          >
            Continue
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
          </Link>
        </div>
      </div>
    );
  };

  return (
    <section className="rounded-3xl border border-brand-purple/15 bg-gradient-to-br from-white via-brand-lavender/30 to-white p-5 sm:p-6 shadow-[0_18px_44px_-26px_rgba(126,107,175,0.45)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-purple">
          Continue where you left off
        </p>
        <span className="text-[11px] font-medium text-brand-purple-dark/55">
          {items.length} in progress
        </span>
      </div>
      <div className="mt-4 grid gap-2.5">
        {renderRow(most, true)}
        {rest.map((ip) => renderRow(ip, false))}
      </div>
    </section>
  );
}

/* =============================================================
   Start over confirmation dialog
   ============================================================= */

function StartOverConfirm({
  target,
  onCancel,
  onConfirm,
}: {
  target: InProgress | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!target) return null;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[18px] font-semibold text-brand-purple-dark">
          Start this check over?
        </h3>
        <p className="mt-2 text-[13.5px] leading-relaxed text-brand-purple-dark/70">
          This will discard your unfinished attempt and start from Question 1. Your previous completed results will always be saved, this only removes what you haven't finished.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-brand-purple/20 bg-white px-4 py-2 text-[13px] font-medium text-brand-purple-dark/80 transition hover:border-brand-purple/40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-brand-purple px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-brand-purple/90"
          >
            Yes, start over
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Reflection rhythm calendar (Patterns tab) ----------
function ReflectionRhythm({ attempts }: { attempts: PatternAttempt[] }) {
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

  // Count attempts per day-of-month for the viewed month
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