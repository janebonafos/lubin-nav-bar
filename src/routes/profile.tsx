import { useState, type ChangeEvent, useEffect } from "react";
import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  Pencil,
  Check,
  ArrowRight,
  HeartPulse,
  Compass,
  MessageCircle,
  TrendingUp,
  CalendarCheck,
  ClipboardList,
  Link2,
  Unlink,
  Trash2,
  User,
  Plus,
  Share2,
  AlertCircle,
  CalendarDays,
  CalendarClock,
  Wallet,
  ShieldCheck,
  Briefcase,
  LogOut,
  Pill,
  Users,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useNavigate } from "@tanstack/react-router";
import lubinMark from "@/assets/lubin-mark.png.asset.json";
import { ASSESSMENTS, ASSESSMENT_IDS } from "@/lib/patterns/assessments";
import { loadAttempts, loadInProgress } from "@/lib/patterns/storage";
import type { Attempt } from "@/lib/patterns/types";
import CheckInFlow, { type CheckInPayload } from "@/components/CheckInFlow";
import EmbeddedChat from "@/components/EmbeddedChat";
import { Overview, Progress } from "@/routes/my-health-passport";
import HealthDetailsCard from "@/components/passport/HealthDetailsCard";
import ShareTabView from "@/components/share/ShareTabView";
import ProviderProfileSection from "@/components/profile/ProviderProfileSection";
import ProviderPrescriptionsSection from "@/components/profile/ProviderPrescriptionsSection";
import ProviderClientsSection from "@/components/profile/ProviderClientsSection";
import SessionPrepSection from "@/components/profile/SessionPrepSection";
import ClientPrescriptionsSection from "@/components/profile/ClientPrescriptionsSection";
import ClientAppointmentsSection, {
  CLIENT_UPCOMING_COUNT,
  getClientUpcomingAppointments,
  type ClientUpcomingAppointment,
} from "@/components/profile/ClientAppointmentsSection";
import {
  CalendarAvailabilitySection,
  AppointmentsSection,
  UPCOMING_APPOINTMENTS_COUNT,
  PaymentsPayoutsSection,
  VerificationSection,
} from "@/components/profile/ProviderSections";

const profileSearchSchema = z.object({
  tab: z
    .enum([
      "profile",
      "appointments",
      "prescriptions",
      "clients",
      "passport",
      "discovery",
      "share",
      "chat",
    ])
    .optional(),
});

export const Route = createFileRoute("/profile")({
  validateSearch: (input: Record<string, unknown>) => {
    const result = profileSearchSchema.safeParse(input);
    return result.success ? result.data : {};
  },
  head: () => ({
    meta: [
      { title: "My profile — Lubin" },
      {
        name: "description",
        content:
          "Manage your Lubin profile: personal info, wellness preferences, and the providers you've connected with.",
      },
      { property: "og:title", content: "My profile — Lubin" },
      {
        property: "og:description",
        content:
          "Your personal Lubin space — update your info and tailor your mental health journey.",
      },
    ],
  }),
  component: ProfilePage,
});

type Profile = {
  fullName: string;
  email: string;
  mobile: string;
  avatar: string | null;
};

const DEFAULT_PROFILE: Profile = {
  fullName: "Maria Santos",
  email: "maria.santos@gmail.com",
  mobile: "",
  avatar: null,
};

type Section =
  | "profile"
  | "provider"
  | "services"
  | "calendar"
  | "appointments"
  | "prescriptions"
  | "clients"
  | "prep"
  | "payments"
  | "verification"
  | "passport"
  | "discovery"
  | "chat"
  | "share";
type Role = "client" | "provider";

type ChatThreadMeta = { id: string; title: string; updatedAt: number };
const CHAT_THREADS_KEY = "lubin.chat.threads.v1";
const CHAT_ACTIVE_KEY = "lubin.chat.activeId.v1";

function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [editing, setEditing] = useState<boolean>(false);
  const [savedFlash, setSavedFlash] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<Section>("profile");
  const [connectionWarning, setConnectionWarning] = useState<string | null>(null);
  const [role, setRole] = useState<Role>("client");
  const [isHydrating, setIsHydrating] = useState<boolean>(true);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [isRoleSwitching, setIsRoleSwitching] = useState<boolean>(false);
  const navigate = useNavigate();
  const search = Route.useSearch();
  // Allow deep-linking to a specific sidebar section (e.g. from payment-success).
  useEffect(() => {
    if (search.tab) {
      setActiveSection(search.tab);
    }
  }, [search.tab]);

  // Initial hydration loader — gives time for localStorage reads & lazy widgets.
  useEffect(() => {
    const t = setTimeout(() => setIsHydrating(false), 350);
    return () => clearTimeout(t);
  }, []);

  // Show a short loader when switching sections / roles so the user gets
  // immediate feedback instead of clicking again thinking nothing happened.
  useEffect(() => {
    setIsTransitioning(true);
    const t = setTimeout(() => setIsTransitioning(false), 280);
    return () => clearTimeout(t);
  }, [activeSection]);

  // Dedicated branded loader when switching Personal ↔ Professional.
  useEffect(() => {
    if (isHydrating) return;
    setIsRoleSwitching(true);
    const t = setTimeout(() => setIsRoleSwitching(false), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored =
        window.localStorage.getItem("lubin.userRole") ??
        window.localStorage.getItem("lubin.role");
      if (stored === "provider" || stored === "client") setRole(stored);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("lubin.role", role);
      window.localStorage.setItem("lubin.userRole", role);
      window.dispatchEvent(new Event("lubin:auth-change"));
    } catch { /* ignore */ }
    // When switching to provider mode, if a client-only tab is active, jump to profile.
    const providerSections: Section[] = [
      "provider",
      "calendar",
      "appointments",
      "prescriptions",
      "payments",
      "verification",
      "chat",
    ];
    if (role === "provider" && !providerSections.includes(activeSection)) {
      setActiveSection("provider");
    }
    if (
      role === "client" &&
      ["provider", "services", "calendar", "payments", "verification"].includes(activeSection)
    ) {
      setActiveSection("profile");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    [],
  );

  type ConnStatus = "connected" | "not_connected" | "error";
  const [connections, setConnections] = useState<{
    google: ConnStatus;
    facebook: ConnStatus;
    linkedin: ConnStatus;
  }>({
    google: "connected",
    facebook: "not_connected",
    linkedin: "not_connected",
  });

  const toggleConnection = (provider: keyof typeof connections) => {
    setConnections((prev) => {
      const next = { ...prev };
      if (next[provider] === "connected") {
        const connectedCount = Object.values(next).filter(
          (s) => s === "connected"
        ).length;
        if (connectedCount <= 1) {
          setConnectionWarning(
            "Add another sign-in method before disconnecting this one."
          );
          return prev;
        }
        next[provider] = "not_connected";
      } else if (next[provider] === "not_connected") {
        next[provider] = "connected";
        setConnectionWarning(null);
      } else {
        next[provider] = "not_connected";
        setConnectionWarning(null);
      }
      return next;
    });
  };

  const setConnectionError = (provider: keyof typeof connections) => {
    setConnections((prev) => ({ ...prev, [provider]: "error" }));
  };

  const [checkInActive, setCheckInActive] = useState(false);

  // Chat thread list (mirrors EmbeddedChat localStorage)
  const [chatThreads, setChatThreads] = useState<ChatThreadMeta[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>("");

  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem(CHAT_THREADS_KEY);
        const list: ChatThreadMeta[] = raw ? JSON.parse(raw) : [];
        const sorted = [...list].sort((a, b) => b.updatedAt - a.updatedAt);
        setChatThreads(sorted);
        setActiveChatId(localStorage.getItem(CHAT_ACTIVE_KEY) ?? "");
      } catch { /* ignore */ }
    };
    read();
    const handler = () => read();
    window.addEventListener("lubin:chat:update", handler);
    return () => window.removeEventListener("lubin:chat:update", handler);
  }, []);

  const selectChat = (id: string) => {
    setActiveSection("chat");
    window.dispatchEvent(new CustomEvent("lubin:chat:select", { detail: id }));
  };
  const newChat = () => {
    setActiveSection("chat");
    window.dispatchEvent(new CustomEvent("lubin:chat:new"));
  };
  const deleteChat = (id: string) => {
    window.dispatchEvent(new CustomEvent("lubin:chat:delete", { detail: id }));
  };

  const displayName = profile.fullName.trim() || "Your profile";
  const initials = profile.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
  const hasInitials = initials.length > 0;

  // Mini widget data
  const [passportData, setPassportData] = useState<{
    checkins: { id: string; mood: number; note: string; date: string }[];
    streak: number;
    assessments: { id: string; name: string; date: string; score?: number }[];
  }>({ checkins: [], streak: 0, assessments: [] });
  const [discoveryData, setDiscoveryData] = useState<{
    completed: number;
    inProgress: { name: string; slug: string; answered: number; total: number }[];
    attempts: Attempt[];
  }>({ completed: 0, inProgress: [], attempts: [] });
  const [upcomingAppointments, setUpcomingAppointments] = useState<
    ClientUpcomingAppointment[]
  >([]);
  useEffect(() => {
    setUpcomingAppointments(getClientUpcomingAppointments());
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const rawCheckins = window.localStorage.getItem("lubinai_checkins");
      const checkins = rawCheckins ? JSON.parse(rawCheckins) : [];
      const days = new Set(
        checkins.map((c: { date: string }) => new Date(c.date).toDateString()),
      );
      let streak = 0;
      const cur = new Date();
      while (days.has(cur.toDateString())) {
        streak += 1;
        cur.setDate(cur.getDate() - 1);
      }
      const rawAssessments = window.localStorage.getItem("lubinai_assessments");
      const assessments = rawAssessments ? JSON.parse(rawAssessments) : [];
      setPassportData({ checkins, streak, assessments });
    } catch { /* ignore */ }
    try {
      const attempts: Attempt[] = loadAttempts();
      const inProgress = ASSESSMENT_IDS
        .map((id) => ({ id, ip: loadInProgress(id) }))
        .filter((x) => x.ip && x.ip.answeredCount > 0)
        .map((x) => {
          const a = ASSESSMENTS.find((aa) => aa.id === x.id);
          return {
            name: a?.name ?? "Check-in",
            slug: a?.slug ?? x.id,
            answered: x.ip!.answeredCount,
            total: x.ip!.total,
          };
        });
      setDiscoveryData({ completed: attempts.length, inProgress, attempts });
    } catch { /* ignore */ }
  }, []);

  const refreshPassport = () => {
    if (typeof window === "undefined") return;
    try {
      const rawCheckins = window.localStorage.getItem("lubinai_checkins");
      const checkins = rawCheckins ? JSON.parse(rawCheckins) : [];
      const days = new Set(
        checkins.map((c: { date: string }) => new Date(c.date).toDateString()),
      );
      let streak = 0;
      const cur = new Date();
      while (days.has(cur.toDateString())) {
        streak += 1;
        cur.setDate(cur.getDate() - 1);
      }
      setPassportData((prev) => ({ ...prev, checkins, streak }));
    } catch { /* ignore */ }
  };

  const handleSaveCheckIn = (data: CheckInPayload) => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("lubinai_checkins");
      const list = raw ? JSON.parse(raw) : [];
      const entry = {
        id: typeof crypto !== "undefined" ? crypto.randomUUID() : String(Date.now()),
        mood: data.intensityIdx + 1,
        note: data.note,
        date: new Date().toISOString(),
        moodKey: data.mood,
        intensityIdx: data.intensityIdx,
        intensityEmoji: data.intensityEmoji,
        intensityLabel: data.intensityLabel,
        topics: data.topics,
      };
      window.localStorage.setItem(
        "lubinai_checkins",
        JSON.stringify([entry, ...list]),
      );
    } catch { /* ignore */ }
    setCheckInActive(false);
    refreshPassport();
  };

  const update = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setProfile((p) => ({ ...p, [key]: value }));

  // Sync profile name & avatar to localStorage so the nav avatar menu can show them.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("lubin.userName", profile.fullName);
      if (profile.avatar) {
        window.localStorage.setItem("lubin.userAvatar", profile.avatar);
      } else {
        window.localStorage.removeItem("lubin.userAvatar");
      }
      window.dispatchEvent(new Event("lubin:auth-change"));
    } catch { /* ignore */ }
  }, [profile.fullName, profile.avatar]);

  const handleAvatar = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update("avatar", String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => update("avatar", null);

  const handleSave = () => {
    setEditing(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  };

  const handleSignOut = () => {
    try {
      window.localStorage.removeItem("lubin.signedIn");
      window.localStorage.removeItem("lubin.userRole");
      window.localStorage.removeItem("lubin.userName");
      window.localStorage.removeItem("lubin.userAvatar");
      window.dispatchEvent(new Event("lubin:auth-change"));
    } catch { /* ignore */ }
    navigate({ to: "/" });
  };

  const NAV: { key: Section; label: string; icon: React.ReactNode }[] =
    role === "provider"
      ? [
          { key: "provider", label: "Provider Profile", icon: <ClipboardList className="h-5 w-5" /> },
          { key: "services", label: "Services & Offerings", icon: <Briefcase className="h-5 w-5" /> },
          { key: "calendar", label: "Calendar & Availability", icon: <CalendarDays className="h-5 w-5" /> },
          { key: "appointments", label: "Appointments", icon: <CalendarClock className="h-5 w-5" /> },
          {
            key: "prescriptions" as Section,
            label: "Prescriptions & Medications",
            icon: <Pill className="h-5 w-5" />,
          },
          { key: "clients" as Section, label: "Clients", icon: <Users className="h-5 w-5" /> },
          {
            key: "prep" as Section,
            label: "Client Intake Forms",
            icon: <ClipboardList className="h-5 w-5" />,
          },
          { key: "payments", label: "Payments & Payouts", icon: <Wallet className="h-5 w-5" /> },
          { key: "verification", label: "Verification", icon: <ShieldCheck className="h-5 w-5" /> },
          { key: "chat", label: "Chat", icon: <MessageCircle className="h-5 w-5" /> },
        ]
      : [
          { key: "profile", label: "Profile Overview", icon: <User className="h-5 w-5" /> },
          { key: "appointments", label: "Appointments", icon: <CalendarClock className="h-5 w-5" /> },
          { key: "prescriptions", label: "My Prescriptions", icon: <Pill className="h-5 w-5" /> },
          { key: "passport", label: "Health Passport", icon: <HeartPulse className="h-5 w-5" /> },
          { key: "discovery", label: "Self Discovery", icon: <Compass className="h-5 w-5" /> },
          { key: "share", label: "Share", icon: <Share2 className="h-5 w-5" /> },
          { key: "chat", label: "Chat", icon: <MessageCircle className="h-5 w-5" /> },
        ];

  const sectionMeta: Record<Section, { title: string; subtitle: string }> = {
    profile: {
      title: "Profile Overview",
      subtitle: "Manage your personal information and preferences",
    },
    provider: {
      title: "Provider Profile",
      subtitle: "How clients discover and book sessions with you",
    },
    services: {
      title: "Services & Offerings",
      subtitle: "Define the sessions, formats, and pricing clients can book",
    },
    calendar: {
      title: "Calendar & Availability",
      subtitle: "Connect your calendar and set the hours clients can book",
    },
    appointments: {
      title: "Appointments",
      subtitle:
        role === "provider"
          ? "Upcoming sessions, requests, and past bookings"
          : "Your upcoming, completed, and cancelled sessions",
    },
    payments: {
      title: "Payments & Payouts",
      subtitle: "Track earnings and manage where your payouts land",
    },
    prescriptions: {
      title: role === "provider" ? "Prescriptions & Medications" : "My Prescriptions",
      subtitle:
        role === "provider"
          ? "Patients you have issued prescriptions to"
          : "View or download the prescriptions issued to you",
    },
    clients: {
      title: "Clients",
      subtitle: "Client records, shared health passports, and prescription history",
    },
    prep: {
      title: "Client Intake Forms",
      subtitle: "Choose the intake details clients are asked for before a session",
    },
    verification: {
      title: "Verification",
      subtitle: "Verify your credentials to unlock a verified badge",
    },
    passport: {
      title: "Health Passport",
      subtitle: "Your daily check-ins and emotional trends",
    },
    discovery: {
      title: "Self Discovery",
      subtitle: "Track your assessments and progress",
    },
    share: {
      title: "Share My Summary",
      subtitle: "Create a summary you can share when you're ready",
    },
    chat: {
      title: "Chat",
      subtitle: "Pick up where you left off with Lubin",
    },
  };

  const meta = sectionMeta[activeSection];

  return (
    <div
      className="relative min-h-screen bg-[#F0EAFB]"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <div className="pointer-events-none fixed -top-[10%] -right-[10%] -z-0 h-[600px] w-[600px] rounded-full bg-[#7E6BAF]/20 blur-[120px]" />
      <div className="pointer-events-none fixed -bottom-[10%] -left-[10%] -z-0 h-[600px] w-[600px] rounded-full bg-[#A89BD0]/30 blur-[120px]" />

      <Navbar />

      <main className="relative z-10 mx-auto max-w-[1600px] px-4 pb-24 pt-28 sm:px-6 lg:px-8">
        {savedFlash && (
          <div className="fixed left-1/2 top-24 z-50 -translate-x-1/2 animate-fade-in rounded-full border border-[#7E6BAF]/30 bg-white px-5 py-2.5 text-sm font-medium text-[#3D2E6B] shadow-[0_10px_30px_-10px_rgba(126,107,175,0.45)]">
            <Check className="mr-2 inline h-4 w-4 text-[#7E6BAF]" />
            Profile saved
          </div>
        )}
        {connectionWarning && (
          <div className="fixed left-1/2 top-24 z-50 w-[90%] max-w-md -translate-x-1/2 animate-fade-in rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-medium text-amber-800 shadow-[0_10px_30px_-10px_rgba(180,140,50,0.35)]">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div>
                <p>{connectionWarning}</p>
                <button
                  onClick={() => setConnectionWarning(null)}
                  className="mt-1 text-xs font-semibold text-amber-700 underline hover:text-amber-900"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-4">
          {/* Sidebar — desktop only; mobile uses the compact tab strip below */}
          <aside className="hidden lg:col-span-1 lg:block">
            <section className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-2xl border border-[#DCD4F0]/50 bg-[#F8F5FF]/80 p-6 shadow-lg shadow-[#3D2E6B]/5 backdrop-blur-xl [scrollbar-width:thin]">
              {/* avatar + name */}
              <div className="flex items-center gap-3 pb-5">
                <div className="relative">
                  <div
                    className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl text-lg font-semibold text-white shadow-inner transition-colors ${
                      role === "provider"
                        ? "bg-gradient-to-br from-[#7E6BAF] to-[#3D2E6B]"
                        : "bg-gradient-to-br from-[#DDD6FE] to-[#A89BD0]"
                    }`}
                  >
                    {profile.avatar ? (
                      <img
                        src={profile.avatar}
                        alt={displayName}
                        className="h-full w-full object-cover"
                      />
                    ) : hasInitials ? (
                      <span>{initials}</span>
                    ) : (
                      <img
                        src={lubinMark.url}
                        alt="Lubin"
                        className="h-7 w-7 object-contain opacity-90"
                      />
                    )}
                  </div>
                  {role === "provider" && (
                    <span
                      aria-hidden
                      className="absolute -bottom-1 -right-1 rounded-full border-2 border-[#F8F5FF] bg-[#3D2E6B] px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-white shadow-sm"
                    >
                      Pro
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#3D2E6B]">
                    {displayName}
                  </p>
                  <p className="text-[11px] font-medium text-[#7E6BAF]">
                    {role === "provider"
                      ? "Professional account"
                      : "Personal account"}
                  </p>
                </div>
              </div>

              {/* Role switch (dev/preview — toggles client vs provider experience) */}
              <div className="mb-3 flex items-center gap-1 rounded-full border border-[#E3DBF5] bg-white/70 p-1">
                {(["client", "provider"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex-1 rounded-full px-3 py-1.5 text-[11.5px] font-semibold capitalize transition ${
                      role === r
                        ? "bg-[#7E6BAF] text-white shadow-sm"
                        : "text-[#7E6BAF] hover:bg-[#7E6BAF]/10"
                    }`}
                  >
                    {r === "client" ? "Personal" : "Professional"}
                  </button>
                ))}
              </div>

              <div className="border-t border-[#EEE9F8]" />

              <nav className="mt-4 space-y-1">
                {NAV.map(({ key, label }) => {
                  const active = activeSection === key;
                  const badgeCount =
                    key === "appointments"
                      ? role === "provider"
                        ? UPCOMING_APPOINTMENTS_COUNT
                        : CLIENT_UPCOMING_COUNT
                      : 0;
                  return (
                    <div key={key}>
                      <button
                        onClick={() => setActiveSection(key)}
                        className={`flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                          active
                            ? "bg-[#7E6BAF]/15 text-[#7E6BAF]"
                            : "text-[#3D2E6B]/80 hover:bg-[#7E6BAF]/10 hover:text-[#3D2E6B]"
                        }`}
                      >
                        <span className="flex-1">{label}</span>
                        {badgeCount > 0 && (
                          <span
                            className={`ml-2 inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none ${
                              active
                                ? "bg-[#5B4796] text-white"
                                : "bg-[#7E6BAF]/20 text-[#5B4796]"
                            }`}
                          >
                            {badgeCount}
                          </span>
                        )}
                      </button>
                      {key === "chat" && activeSection === "chat" && (
                        <div className="mt-2 space-y-1">
                          <button
                            onClick={newChat}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#7E6BAF] transition hover:bg-[#7E6BAF]/10 hover:text-[#3D2E6B]"
                          >
                            <Plus className="h-4 w-4" /> New conversation
                          </button>
                          <div className="max-h-72 space-y-0.5 overflow-y-auto pr-1 pt-1">
                            {chatThreads.length === 0 ? (
                              <p className="px-3 py-2 text-sm text-[#A89BD0]/80">
                                No conversations yet.
                              </p>
                            ) : (
                              chatThreads.map((t) => {
                                const isActive = t.id === activeChatId;
                                return (
                                  <div
                                    key={t.id}
                                    className={`group flex items-center gap-1 rounded-xl pr-1 transition ${
                                      isActive
                                        ? "bg-[#7E6BAF]/10"
                                        : "hover:bg-[#7E6BAF]/5"
                                    }`}
                                  >
                                    <button
                                      onClick={() => selectChat(t.id)}
                                      className={`flex-1 truncate rounded-xl px-3 py-2 text-left text-sm transition ${
                                        isActive
                                          ? "font-medium text-[#3D2E6B]"
                                          : "text-[#3D2E6B]/75"
                                      }`}
                                      title={t.title}
                                    >
                                      {t.title || "New conversation"}
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteChat(t.id);
                                      }}
                                      className="shrink-0 rounded-lg p-1.5 text-[#A89BD0] opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                                      title="Delete conversation"
                                      aria-label="Delete conversation"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>

              <div className="mt-6 border-t border-[#EEE9F8] pt-4">
                <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-[#A89BD0]">
                  Legal
                </p>
                <div className="mt-1 space-y-0.5">
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-xl px-3 py-2 text-sm font-medium text-[#3D2E6B]/75 transition hover:bg-[#7E6BAF]/10 hover:text-[#3D2E6B]"
                  >
                    Terms &amp; Conditions
                  </a>
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-xl px-3 py-2 text-sm font-medium text-[#3D2E6B]/75 transition hover:bg-[#7E6BAF]/10 hover:text-[#3D2E6B]"
                  >
                    Privacy Policy
                  </a>
                </div>
              </div>

              <div className="mt-5 border-t border-[#EEE9F8] pt-4">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#3D2E6B]/80 transition hover:bg-[#7E6BAF]/10 hover:text-[#7E6BAF]"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </section>
          </aside>

          {/* Main */}
          <div className="relative space-y-6 lg:col-span-3">
            {/* Mobile account + section switcher */}
            <section className="rounded-2xl border border-[#DCD4F0]/50 bg-[#F8F5FF]/85 p-4 shadow-lg shadow-[#3D2E6B]/5 backdrop-blur-xl lg:hidden">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl text-sm font-semibold text-white ${
                      role === "provider"
                        ? "bg-gradient-to-br from-[#7E6BAF] to-[#3D2E6B]"
                        : "bg-gradient-to-br from-[#DDD6FE] to-[#A89BD0]"
                    }`}
                  >
                    {profile.avatar ? (
                      <img src={profile.avatar} alt={displayName} className="h-full w-full object-cover" />
                    ) : hasInitials ? (
                      <span>{initials}</span>
                    ) : (
                      <img src={lubinMark.url} alt="" className="h-5 w-5 object-contain opacity-90" />
                    )}
                  </div>
                  <p className="truncate text-[13.5px] font-bold text-[#3D2E6B]">{displayName}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1 rounded-full border border-[#E3DBF5] bg-white/80 p-1">
                  {(["client", "provider"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                        role === r ? "bg-[#7E6BAF] text-white shadow-sm" : "text-[#7E6BAF]"
                      }`}
                    >
                      {r === "client" ? "Personal" : "Pro"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="-mx-4 mt-3 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex w-max items-center gap-2 pb-1">
                  {NAV.map(({ key, label }) => {
                    const active = activeSection === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setActiveSection(key)}
                        className={`whitespace-nowrap rounded-full px-3.5 py-2 text-[12.5px] font-semibold transition ${
                          active
                            ? "bg-[#7E6BAF] text-white shadow-sm"
                            : "border border-[#E3DBF5] bg-white text-[#3D2E6B]/80"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Role switch — branded loader */}
            <AnimatePresence>
              {isRoleSwitching && (
                <motion.div
                  key="role-switching"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 z-[60] flex items-center justify-center bg-gradient-to-br from-[#F0EAFB]/95 via-[#EAE7F5]/95 to-[#DCD4F0]/95 backdrop-blur-md"
                  aria-live="polite"
                  aria-busy="true"
                >
                  <div className="flex flex-col items-center gap-6">
                    <div className="relative h-24 w-24">
                      {/* Outer rotating ring */}
                      <span
                        className="absolute inset-0 rounded-full border-[3px] border-transparent"
                        style={{
                          borderTopColor: "#7E6BAF",
                          borderRightColor: "#A89BD0",
                          animation: "spin 1.1s linear infinite",
                        }}
                      />
                      {/* Inner counter-rotating ring */}
                      <span
                        className="absolute inset-2 rounded-full border-[2px] border-transparent"
                        style={{
                          borderBottomColor: "#3D2E6B",
                          borderLeftColor: "#7E6BAF",
                          animation: "spin 1.6s linear infinite reverse",
                        }}
                      />
                      {/* Lubin mark */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.img
                          src={lubinMark.url}
                          alt=""
                          className="h-9 w-9 object-contain"
                          animate={{ scale: [1, 1.08, 1] }}
                          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                        />
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7E6BAF]">
                        Switching account
                      </p>
                      <p className="mt-2 font-serif-display text-2xl font-semibold text-[#3D2E6B]">
                        {role === "provider" ? "Professional" : "Personal"} space
                      </p>
                      <div className="mt-4 flex items-center justify-center gap-1.5">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="h-1.5 w-1.5 rounded-full bg-[#7E6BAF]"
                            style={{
                              animation: "dot-bounce 1s ease-in-out infinite",
                              animationDelay: `${i * 0.15}s`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {(isHydrating || isTransitioning) && (
              <div
                aria-live="polite"
                aria-busy="true"
                className="absolute inset-0 z-30 space-y-6 rounded-2xl bg-[#F0EAFB]/80 p-1 backdrop-blur-[2px] animate-fade-in"
              >
                {/* Header skeleton */}
                <div className="space-y-3 px-1 pt-1">
                  <div className="h-7 w-40 animate-pulse rounded-full bg-[#DCD4F0]/70" />
                  <div className="h-3 w-72 animate-pulse rounded-full bg-[#DCD4F0]/60" />
                </div>
                {/* Card skeleton 1 */}
                <div className="rounded-2xl border border-[#DCD4F0]/60 bg-white/70 p-6">
                  <div className="h-4 w-32 animate-pulse rounded-full bg-[#DCD4F0]/70" />
                  <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <div className="h-2.5 w-16 animate-pulse rounded-full bg-[#DCD4F0]/60" />
                      <div className="h-9 w-full animate-pulse rounded-xl bg-[#DCD4F0]/50" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-2.5 w-16 animate-pulse rounded-full bg-[#DCD4F0]/60" />
                      <div className="h-9 w-full animate-pulse rounded-xl bg-[#DCD4F0]/50" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-2.5 w-16 animate-pulse rounded-full bg-[#DCD4F0]/60" />
                      <div className="h-9 w-full animate-pulse rounded-xl bg-[#DCD4F0]/50" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-2.5 w-16 animate-pulse rounded-full bg-[#DCD4F0]/60" />
                      <div className="h-9 w-full animate-pulse rounded-xl bg-[#DCD4F0]/50" />
                    </div>
                  </div>
                </div>
                {/* Card skeleton 2 */}
                <div className="rounded-2xl border border-[#DCD4F0]/60 bg-white/70 p-6">
                  <div className="h-4 w-40 animate-pulse rounded-full bg-[#DCD4F0]/70" />
                  <div className="mt-5 space-y-3">
                    <div className="h-12 w-full animate-pulse rounded-xl bg-[#DCD4F0]/50" />
                    <div className="h-12 w-full animate-pulse rounded-xl bg-[#DCD4F0]/50" />
                    <div className="h-12 w-2/3 animate-pulse rounded-xl bg-[#DCD4F0]/50" />
                  </div>
                </div>
              </div>
            )}
            {/* Page header */}
            {activeSection !== "chat" && activeSection !== "share" && (
              <header className="px-1">
                <h1 className="text-2xl font-bold text-[#3D2E6B] sm:text-3xl">
                  {meta.title}
                </h1>
                <p className="mt-1.5 text-sm text-[#7E6BAF]">{meta.subtitle}</p>
              </header>
            )}

            {activeSection === "profile" && (
              <>
                {/* Basic Information */}
                <Card
                  title="Basic Information"
                  action={
                    editing ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditing(false)}
                          className="rounded-full px-3 py-1.5 text-xs font-semibold text-[#7E6BAF] transition hover:bg-[#7E6BAF]/10"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSave}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#7E6BAF] px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-[#A89BD0]/40 transition hover:bg-[#3D2E6B]"
                        >
                          <Check className="h-3.5 w-3.5" /> Save
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditing(true)}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#7E6BAF] transition hover:text-[#3D2E6B]"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                    )
                  }
                >
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <label htmlFor="avatar-upload" className="group relative cursor-pointer">
                        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-[#DDD6FE] to-[#A89BD0] text-3xl font-bold text-white shadow-inner">
                          {profile.avatar ? (
                            <img
                              src={profile.avatar}
                              alt={displayName}
                              className="h-full w-full object-cover"
                            />
                        ) : hasInitials ? (
                            <span>{initials}</span>
                        ) : (
                          <img
                            src={lubinMark.url}
                            alt="Lubin"
                            className="h-12 w-12 object-contain opacity-90"
                          />
                        )}
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-[#3D2E6B]/30 opacity-0 transition-opacity group-hover:opacity-100">
                          <Camera className="h-6 w-6 text-white" />
                        </div>
                      </label>
                      {profile.avatar && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-red-500 shadow-md ring-1 ring-red-100 transition hover:bg-red-50 hover:text-red-600"
                          title="Remove photo"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#7E6BAF]">Profile Photo</p>
                    </div>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatar}
                    />
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
                    <Field
                      label="Full Name"
                      value={profile.fullName}
                      editing={editing}
                      placeholder="Add your full name"
                      onChange={(v) => update("fullName", v)}
                    />
                    <Field
                      label="Email"
                      value={profile.email}
                      editing={editing}
                      type="email"
                      placeholder="Add your email"
                      verified={Boolean(profile.email)}
                      locked
                      lockedHint="Synced from your connected sign-in account. To change it, connect a different account below."
                      onChange={(v) => update("email", v)}
                    />
                    <Field
                      label="Mobile"
                      value={profile.mobile}
                      editing={editing}
                      type="tel"
                      placeholder="Add your mobile number"
                      onChange={(v) => update("mobile", v)}
                    />
                  </div>
                </Card>

                {/* Daily mood check-in status */}
                {role === "client" && <DailyMoodCard
                  loggedToday={passportData.checkins.some(
                    (c) => new Date(c.date).toDateString() === new Date().toDateString(),
                  )}
                  streak={passportData.streak}
                  active={checkInActive}
                  onOpen={() => setCheckInActive(true)}
                  onClose={() => setCheckInActive(false)}
                  onSave={handleSaveCheckIn}
                />}

                {/* Connected accounts */}
                <Card title="Connected Accounts">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {([
                      {
                        key: "google" as const,
                        name: "Google",
                        color: "#EA4335",
                        bg: "bg-[#EA4335]/10",
                        text: "text-[#EA4335]",
                        icon: (
                          <span className="text-lg font-bold">G</span>
                        ),
                      },
                      {
                        key: "facebook" as const,
                        name: "Facebook",
                        color: "#1877F2",
                        bg: "bg-[#1877F2]/10",
                        text: "text-[#1877F2]",
                        icon: (
                          <span className="text-lg font-bold">f</span>
                        ),
                      },
                      {
                        key: "linkedin" as const,
                        name: "LinkedIn",
                        color: "#0A66C2",
                        bg: "bg-[#0A66C2]/10",
                        text: "text-[#0A66C2]",
                        icon: (
                          <span className="text-lg font-bold">in</span>
                        ),
                      },
                    ]).map((provider) => {
                      const status = connections[provider.key];
                      const isConnected = status === "connected";
                      const isError = status === "error";
                      return (
                        <div
                          key={provider.key}
                          className={`flex items-center justify-between rounded-2xl border p-5 transition ${
                            isError
                              ? "border-red-200 bg-red-50/50"
                              : "border-[#F1EFFF] bg-white/50"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <span
                              className={`flex h-12 w-12 items-center justify-center rounded-full ${provider.bg} ${provider.text}`}
                            >
                              {provider.icon}
                            </span>
                            <div>
                              <p className="font-medium text-[#3D2E6B]">
                                {provider.name}
                              </p>
                              <p
                                className={`text-xs font-medium ${
                                  isConnected
                                    ? "text-emerald-600"
                                    : isError
                                    ? "text-red-500"
                                    : "text-[#A89BD0]"
                                }`}
                              >
                                {isConnected
                                  ? "Connected"
                                  : isError
                                  ? "Connection error"
                                  : "Not connected"}
                              </p>
                            </div>
                          </div>
                          {isConnected ? (
                            <button
                              onClick={() => toggleConnection(provider.key)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-[#A89BD0] hover:text-[#DC2626]"
                            >
                              <Unlink className="h-3.5 w-3.5" /> Disconnect
                            </button>
                          ) : isError ? (
                            <button
                              onClick={() => toggleConnection(provider.key)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600"
                            >
                              <AlertCircle className="h-3.5 w-3.5" /> Retry
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleConnection(provider.key)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-[#7E6BAF] hover:text-[#3D2E6B]"
                            >
                              <Link2 className="h-3.5 w-3.5" /> Connect
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </>
            )}

            {activeSection === "passport" && role === "client" && (
              <>
                <HealthDetailsCard />
                <div className="mt-8">
                  <Overview
                    today={todayLabel}
                    checkins={passportData.checkins as never}
                    onLogMood={() => setCheckInActive(true)}
                    checkInActive={checkInActive}
                    onCloseCheckIn={() => setCheckInActive(false)}
                    isGuest={false}
                  />
                </div>
              </>
            )}

            {activeSection === "provider" && role === "provider" && (
              <ProviderProfileSection
                fullName={profile.fullName}
                avatarUrl={profile.avatar}
                onAvatarChange={(dataUrl) => update("avatar", dataUrl)}
                view="profile"
                onNavigate={(s) => setActiveSection(s as Section)}
              />
            )}

    {activeSection === "services" && role === "provider" && (
      <ProviderProfileSection
        fullName={profile.fullName}
        avatarUrl={profile.avatar}
        onAvatarChange={(dataUrl) => update("avatar", dataUrl)}
        view="services"
        onNavigate={(s) => setActiveSection(s as Section)}
      />
    )}

    {activeSection === "calendar" && role === "provider" && (
      <CalendarAvailabilitySection />
    )}

    {activeSection === "appointments" && role === "provider" && (
      <AppointmentsSection />
    )}

    {activeSection === "appointments" && role === "client" && (
      <ClientAppointmentsSection />
    )}

    {activeSection === "prescriptions" && role === "provider" && (
      <ProviderPrescriptionsSection />
    )}

    {activeSection === "prescriptions" && role === "client" && (
      <ClientPrescriptionsSection />
    )}

    {activeSection === "clients" && role === "provider" && (
      <ProviderClientsSection />
    )}

    {activeSection === "prep" && role === "provider" && (
      <SessionPrepSection />
    )}

    {activeSection === "payments" && role === "provider" && (
      <PaymentsPayoutsSection />
    )}

    {activeSection === "verification" && role === "provider" && (
      <VerificationSection />
    )}

            {activeSection === "discovery" && (
              <Progress
                checkins={passportData.checkins as never}
                assessments={passportData.assessments as never}
                streak={passportData.streak}
              />
            )}

            {activeSection === "share" && (
              <ShareTabView
                checkins={passportData.checkins as never}
                isGuest={false}
                onRequestSignup={() => {}}
                onStartCheckin={() => setCheckInActive(true)}
                sharerName={profile.fullName.trim() || "You"}
                upcomingAppointments={upcomingAppointments}
              />
            )}

            {activeSection === "chat" && (
              <div className="overflow-hidden rounded-3xl shadow-xl shadow-[#3D2E6B]/10">
                <EmbeddedChat />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Card({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#E3DBF5]/60 bg-[#FBF9FF]/90 p-6 shadow-md shadow-[#3D2E6B]/5 backdrop-blur-xl sm:p-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[#3D2E6B]">
          {icon && <span className="text-[#7E6BAF]">{icon}</span>}
          <h2 className="text-lg font-bold">{title}</h2>
        </div>
        {action}
      </div>
      <div>{children}</div>
    </section>
  );
}

function DailyMoodCard({
  loggedToday,
  streak,
  active,
  onOpen,
  onClose,
  onSave,
}: {
  loggedToday: boolean;
  streak: number;
  active: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSave: (data: CheckInPayload) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-lavender via-brand-purple-accent/40 to-brand-lavender p-6 shadow-md shadow-[#3D2E6B]/5 sm:p-8">
      <div aria-hidden className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-white/40 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-brand-purple/15 blur-3xl" />
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 ring-1 ring-brand-purple/15 backdrop-blur-sm">
            <span
              className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"
            />
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-purple-dark/80">
              Daily check-in
            </p>
          </div>
          <p className="mt-3 text-xl font-bold text-brand-purple-dark">
            {loggedToday
              ? "You've checked in today"
              : "How are you feeling today?"}
          </p>
          <p className="mt-1 text-sm text-brand-purple-dark/65">
            {loggedToday
              ? `Nice work — ${streak}-day streak and counting.`
              : "Takes 15 seconds. Builds your passport over time."}
          </p>
        </div>
        <button
          onClick={active ? onClose : onOpen}
          className="group inline-flex items-center justify-center gap-1.5 rounded-full bg-white px-6 py-3 text-sm font-bold text-brand-purple-dark shadow-[0_6px_18px_-8px_rgba(91,71,160,0.35)] ring-1 ring-brand-purple/10 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-brand-purple hover:text-white hover:ring-brand-purple hover:shadow-[0_12px_26px_-8px_rgba(91,71,160,0.5)]"
        >
          {active ? "Close" : loggedToday ? "Check in again" : "Check in"}{" "}
          <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
        </button>
      </div>
    </section>
      <AnimatePresence initial={false}>
        {active && (
          <motion.div
            key="profile-checkin-flow"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="rounded-2xl border border-[#E3DBF5]/60 bg-[#FBF9FF]/90 p-6 shadow-md shadow-[#3D2E6B]/5 backdrop-blur-xl sm:p-8">
              <CheckInFlow onClose={onClose} onSave={onSave} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({
  label,
  value,
  editing,
  placeholder,
  type = "text",
  verified,
  locked,
  lockedHint,
  onChange,
}: {
  label: string;
  value: string;
  editing: boolean;
  placeholder?: string;
  type?: string;
  verified?: boolean;
  locked?: boolean;
  lockedHint?: string;
  onChange: (v: string) => void;
}) {
  const isEmpty = !value.trim();
  const isLocked = Boolean(locked);
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-wider text-[#A89BD0]">
        {label}
      </label>
      <div className="relative mt-1.5">
        {editing && !isLocked ? (
          <input
            type={type}
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full rounded-xl border border-[#EEE9F8] bg-white px-4 py-2.5 text-[14px] text-[#3D2E6B] placeholder:text-[#A89BD0]/60 outline-none transition focus:border-[#7E6BAF] focus:ring-4 focus:ring-[#7E6BAF]/10 ${
              verified ? "pr-10" : ""
            }`}
          />
        ) : isEmpty ? (
          <div className="w-full px-1 py-2.5 text-[14px] text-[#A89BD0]/70 italic">
            Not set
          </div>
        ) : (
          <div
            className={`w-full px-1 py-2.5 text-[14px] font-medium text-[#3D2E6B] ${
              verified || isLocked ? "pr-10" : ""
            }`}
          >
            {value}
          </div>
        )}
        {(!editing || isLocked) && !isEmpty && verified && (
          <span
            className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-[#E3F4EA] text-[#5BAF7E]"
            title="Verified"
          >
            <Check className="h-3 w-3" />
          </span>
        )}
      </div>
      {isLocked && lockedHint && (
        <p className="mt-1.5 text-[11.5px] leading-snug text-[#A89BD0]">
          {lockedHint}
        </p>
      )}
    </div>
  );
}
