import { useState, type ChangeEvent, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Camera,
  Pencil,
  Check,
  ArrowRight,
  HeartPulse,
  Compass,
  MessageCircle,
  TrendingUp,
  MessageSquare,
  Plus,
  CalendarCheck,
  ClipboardList,
  Link2,
  Unlink,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { ASSESSMENTS, ASSESSMENT_IDS } from "@/lib/patterns/assessments";
import { loadAttempts, loadInProgress } from "@/lib/patterns/storage";
import type { Attempt } from "@/lib/patterns/types";

export const Route = createFileRoute("/profile")({
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
  fullName: "",
  email: "",
  mobile: "",
  avatar: null,
};

type Section = "profile" | "passport" | "discovery" | "chat";

function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [editing, setEditing] = useState<boolean>(false);
  const [savedFlash, setSavedFlash] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<Section>("profile");

  const [googleConnected] = useState(true);
  const [facebookConnected] = useState(false);

  const displayName = profile.fullName.trim() || "Your name";
  const initials =
    profile.fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join("") || "Y";

  // Mini widget data
  const [passportData, setPassportData] = useState<{
    checkins: { id: string; mood: number; note: string; date: string }[];
    streak: number;
  }>({ checkins: [], streak: 0 });
  const [discoveryData, setDiscoveryData] = useState<{
    completed: number;
    inProgress: { name: string; slug: string; answered: number; total: number }[];
  }>({ completed: 0, inProgress: [] });
  const [chatData, setChatData] = useState<{
    threads: { id: string; title: string; updatedAt: number }[];
  }>({ threads: [] });

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
      setPassportData({ checkins: checkins.slice(0, 5), streak });
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
      setDiscoveryData({ completed: attempts.length, inProgress });
    } catch { /* ignore */ }
    try {
      const rawThreads = window.localStorage.getItem("lubin.chat.threads.v1");
      const threads = rawThreads
        ? JSON.parse(rawThreads).map((t: { id: string; title: string; updatedAt: number }) => ({
            id: t.id,
            title: t.title,
            updatedAt: t.updatedAt,
          }))
        : [];
      setChatData({
        threads: threads
          .sort((a: { updatedAt: number }, b: { updatedAt: number }) => b.updatedAt - a.updatedAt)
          .slice(0, 4),
      });
    } catch { /* ignore */ }
  }, []);

  const update = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setProfile((p) => ({ ...p, [key]: value }));

  const handleAvatar = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update("avatar", String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    setEditing(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  };

  const NAV: { key: Section; label: string }[] = [
    { key: "profile", label: "Profile Overview" },
    { key: "passport", label: "Health Passport" },
    { key: "discovery", label: "Self Discovery" },
    { key: "chat", label: "Chat" },
  ];

  const sectionMeta: Record<Section, { title: string; subtitle: string }> = {
    profile: {
      title: "Profile Overview",
      subtitle: "Manage your personal information and preferences",
    },
    passport: {
      title: "Health Passport",
      subtitle: "Your daily check-ins and emotional trends",
    },
    discovery: {
      title: "Self Discovery",
      subtitle: "Track your assessments and progress",
    },
    chat: {
      title: "Chat",
      subtitle: "Pick up where you left off with Lubin",
    },
  };

  const meta = sectionMeta[activeSection];

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#F0EAFB]"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <div className="pointer-events-none fixed -top-[10%] -right-[10%] -z-0 h-[600px] w-[600px] rounded-full bg-[#7E6BAF]/20 blur-[120px]" />
      <div className="pointer-events-none fixed -bottom-[10%] -left-[10%] -z-0 h-[600px] w-[600px] rounded-full bg-[#A89BD0]/30 blur-[120px]" />

      <Navbar />

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-28 sm:px-6 lg:px-8">
        {savedFlash && (
          <div className="fixed left-1/2 top-24 z-50 -translate-x-1/2 animate-fade-in rounded-full border border-[#7E6BAF]/30 bg-white px-5 py-2.5 text-sm font-medium text-[#3D2E6B] shadow-[0_10px_30px_-10px_rgba(126,107,175,0.45)]">
            <Check className="mr-2 inline h-4 w-4 text-[#7E6BAF]" />
            Profile saved
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-4">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <section className="sticky top-28 rounded-[2rem] border border-[#DCD4F0]/50 bg-[#F8F5FF]/80 p-6 shadow-lg shadow-[#3D2E6B]/5 backdrop-blur-xl">
              {/* avatar + name */}
              <div className="flex items-center gap-3 pb-5">
                <div className="relative">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#DDD6FE] to-[#A89BD0] text-lg font-semibold text-white shadow-inner">
                    {profile.avatar ? (
                      <img
                        src={profile.avatar}
                        alt={displayName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#3D2E6B]">
                    {displayName}
                  </p>
                  <p className="text-[11px] font-medium text-[#7E6BAF]">
                    Lubin Member
                  </p>
                </div>
              </div>

              <div className="border-t border-[#EEE9F8]" />

              <nav className="mt-4 space-y-1">
                {NAV.map(({ key, label }) => {
                  const active = activeSection === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveSection(key)}
                      className={`flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                        active
                          ? "bg-[#7E6BAF]/15 text-[#7E6BAF]"
                          : "text-[#3D2E6B]/80 hover:bg-[#7E6BAF]/10 hover:text-[#3D2E6B]"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </nav>
            </section>
          </aside>

          {/* Main */}
          <div className="space-y-6 lg:col-span-3">
            {/* Page header */}
            <header className="px-1">
              <h1 className="text-2xl font-bold text-[#3D2E6B] sm:text-3xl">
                {meta.title}
              </h1>
              <p className="mt-1.5 text-sm text-[#7E6BAF]">{meta.subtitle}</p>
            </header>

            {activeSection === "profile" && (
              <>
                {/* Daily mood check-in status */}
                <DailyMoodCard
                  loggedToday={passportData.checkins.some(
                    (c) => new Date(c.date).toDateString() === new Date().toDateString(),
                  )}
                  streak={passportData.streak}
                />

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
                    <label htmlFor="avatar-upload" className="group relative cursor-pointer">
                      <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-[#DDD6FE] to-[#A89BD0] text-3xl font-bold text-white shadow-inner">
                        {profile.avatar ? (
                          <img
                            src={profile.avatar}
                            alt={displayName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span>{initials}</span>
                        )}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-[#3D2E6B]/30 opacity-0 transition-opacity group-hover:opacity-100">
                        <Camera className="h-6 w-6 text-white" />
                      </div>
                    </label>
                    <div>
                      <p className="text-sm font-medium text-[#7E6BAF]">Profile Photo</p>
                      <label
                        htmlFor="avatar-upload"
                        className="mt-1 inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-[#7E6BAF] transition hover:text-[#3D2E6B]"
                      >
                        Change Photo
                      </label>
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
                      placeholder="Jane Doe"
                      onChange={(v) => update("fullName", v)}
                    />
                    <Field
                      label="Email"
                      value={profile.email}
                      editing={editing}
                      type="email"
                      placeholder="you@example.com"
                      verified={Boolean(profile.email)}
                      onChange={(v) => update("email", v)}
                    />
                    <Field
                      label="Mobile"
                      value={profile.mobile}
                      editing={editing}
                      type="tel"
                      placeholder="000-000-0000"
                      onChange={(v) => update("mobile", v)}
                    />
                  </div>
                </Card>

                {/* Connected accounts */}
                <Card title="Connected Accounts">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex items-center justify-between rounded-2xl border border-[#F1EFFF] bg-white/50 p-5">
                      <div className="flex items-center gap-4">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EA4335]/10 text-sm font-bold text-[#EA4335]">
                          G
                        </span>
                        <div>
                          <p className="font-medium text-[#3D2E6B]">Google</p>
                          <p className={`text-xs font-medium ${googleConnected ? "text-emerald-600" : "text-[#A89BD0]"}`}>
                            {googleConnected ? "Connected" : "Not connected"}
                          </p>
                        </div>
                      </div>
                      {googleConnected ? (
                        <button className="inline-flex items-center gap-1 text-xs font-semibold text-[#A89BD0] hover:text-[#DC2626]">
                          <Unlink className="h-3.5 w-3.5" /> Disconnect
                        </button>
                      ) : (
                        <button className="text-xs font-semibold text-[#7E6BAF] hover:text-[#3D2E6B]">
                          Connect
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-[#F1EFFF] bg-white/50 p-5">
                      <div className="flex items-center gap-4">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1877F2]/10 text-sm font-bold text-[#1877F2]">
                          f
                        </span>
                        <div>
                          <p className="font-medium text-[#3D2E6B]">Facebook</p>
                          <p className={`text-xs font-medium ${facebookConnected ? "text-emerald-600" : "text-[#A89BD0]"}`}>
                            {facebookConnected ? "Connected" : "Not connected"}
                          </p>
                        </div>
                      </div>
                      {facebookConnected ? (
                        <button className="inline-flex items-center gap-1 text-xs font-semibold text-[#A89BD0] hover:text-[#DC2626]">
                          <Unlink className="h-3.5 w-3.5" /> Disconnect
                        </button>
                      ) : (
                        <button className="inline-flex items-center gap-1 text-xs font-semibold text-[#7E6BAF] hover:text-[#3D2E6B]">
                          <Link2 className="h-3.5 w-3.5" /> Connect
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              </>
            )}

            {activeSection === "passport" && (
              <Card title="Daily check-ins" icon={<HeartPulse className="h-5 w-5" />}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#7E6BAF]">
                      Current streak
                    </p>
                    <p className="mt-1 text-2xl font-bold text-[#3D2E6B]">
                      {passportData.streak}{" "}
                      <span className="text-base font-medium text-[#A89BD0]">
                        day{passportData.streak === 1 ? "" : "s"}
                      </span>
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7E6BAF]/10 text-[#7E6BAF]">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>

                {passportData.checkins.length > 0 && (
                  <div className="mt-5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#7E6BAF]">
                      Recent check-ins
                    </p>
                    <div className="mt-2 flex gap-3">
                      {passportData.checkins.map((c) => {
                        const moodMap: Record<number, string> = {
                          1: "😞", 2: "😕", 3: "😐", 4: "🙂", 5: "😄",
                        };
                        return (
                          <div key={c.id} className="flex flex-col items-center gap-1">
                            <span className="text-xl">{moodMap[c.mood] ?? "😐"}</span>
                            <span className="text-[10px] text-[#A89BD0]">
                              {new Date(c.date).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                  <Link
                    to="/check-in"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#7E6BAF] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#A89BD0]/30 transition hover:-translate-y-0.5 hover:bg-[#3D2E6B]"
                  >
                    <CalendarCheck className="h-4 w-4" /> Check in today
                  </Link>
                  <Link
                    to="/my-health-passport"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#EEE9F8] bg-white/60 px-4 py-2.5 text-sm font-semibold text-[#7E6BAF] transition hover:bg-white"
                  >
                    View full passport <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </Card>
            )}

            {activeSection === "discovery" && (
              <Card title="Assessments" icon={<Compass className="h-5 w-5" />}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#7E6BAF]">
                      Completed
                    </p>
                    <p className="mt-1 text-2xl font-bold text-[#3D2E6B]">
                      {discoveryData.completed}{" "}
                      <span className="text-base font-medium text-[#A89BD0]">
                        check-in{discoveryData.completed === 1 ? "" : "s"}
                      </span>
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7E6BAF]/10 text-[#7E6BAF]">
                    <ClipboardList className="h-6 w-6" />
                  </div>
                </div>

                {discoveryData.inProgress.length > 0 && (
                  <div className="mt-5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#7E6BAF]">
                      In progress
                    </p>
                    <div className="mt-2 space-y-2">
                      {discoveryData.inProgress.map((ip) => (
                        <Link
                          key={ip.slug}
                          to="/self-discovery/$slug"
                          params={{ slug: ip.slug }}
                          className="group flex items-center justify-between rounded-xl border border-[#EEE9F8] bg-white/50 px-3 py-2.5 no-underline transition hover:border-[#7E6BAF]/30 hover:bg-white"
                        >
                          <span className="truncate text-[13px] font-medium text-[#3D2E6B]">
                            {ip.name}
                          </span>
                          <span className="shrink-0 rounded-full bg-[#7E6BAF]/10 px-2 py-0.5 text-[11px] font-semibold text-[#7E6BAF]">
                            {ip.answered}/{ip.total}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <Link
                    to="/self-discovery"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#7E6BAF] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#A89BD0]/30 transition hover:-translate-y-0.5 hover:bg-[#3D2E6B]"
                  >
                    <Compass className="h-4 w-4" /> Explore check-ins
                  </Link>
                </div>
              </Card>
            )}

            {activeSection === "chat" && (
              <Card title="Conversations" icon={<MessageCircle className="h-5 w-5" />}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#7E6BAF]">
                      Active
                    </p>
                    <p className="mt-1 text-2xl font-bold text-[#3D2E6B]">
                      {chatData.threads.length}{" "}
                      <span className="text-base font-medium text-[#A89BD0]">
                        thread{chatData.threads.length === 1 ? "" : "s"}
                      </span>
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7E6BAF]/10 text-[#7E6BAF]">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                </div>

                {chatData.threads.length > 0 && (
                  <div className="mt-5 space-y-2">
                    {chatData.threads.map((t) => (
                      <Link
                        key={t.id}
                        to="/chat"
                        className="group flex items-center gap-2 rounded-xl border border-[#EEE9F8] bg-white/50 px-3 py-2.5 no-underline transition hover:border-[#7E6BAF]/30 hover:bg-white"
                      >
                        <MessageCircle className="h-4 w-4 shrink-0 text-[#A89BD0] group-hover:text-[#7E6BAF]" />
                        <span className="truncate text-[13px] font-medium text-[#3D2E6B]">
                          {t.title}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}

                <div className="mt-6">
                  <Link
                    to="/chat"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#7E6BAF] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#A89BD0]/30 transition hover:-translate-y-0.5 hover:bg-[#3D2E6B]"
                  >
                    <Plus className="h-4 w-4" /> Open chat
                  </Link>
                </div>
              </Card>
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
    <section className="rounded-[2rem] border border-[#E3DBF5]/60 bg-[#FBF9FF]/90 p-6 shadow-md shadow-[#3D2E6B]/5 backdrop-blur-xl sm:p-8">
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
}: {
  loggedToday: boolean;
  streak: number;
}) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-[#E3DBF5]/60 bg-gradient-to-r from-[#E9E0FB] via-[#D8C9F2]/60 to-[#E9E0FB] p-6 shadow-md shadow-[#3D2E6B]/5 sm:p-8">
      <div aria-hidden className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-white/40 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-[#7E6BAF]/15 blur-3xl" />
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 ring-1 ring-[#7E6BAF]/15 backdrop-blur-sm">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                loggedToday ? "bg-emerald-500" : "bg-amber-400 animate-pulse"
              }`}
            />
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#3D2E6B]/80">
              Daily mood log
            </p>
          </div>
          <p className="mt-3 text-xl font-bold text-[#3D2E6B]">
            {loggedToday
              ? "You've logged your mood today"
              : "You haven't logged your mood yet today"}
          </p>
          <p className="mt-1 text-sm text-[#3D2E6B]/65">
            {loggedToday
              ? `Nice work — ${streak}-day streak and counting.`
              : "Takes 15 seconds. Builds your passport over time."}
          </p>
        </div>
        <Link
          to="/check-in"
          className="group inline-flex items-center justify-center gap-1.5 rounded-full bg-white px-6 py-3 text-sm font-bold text-[#3D2E6B] shadow-[0_6px_18px_-8px_rgba(91,71,160,0.35)] ring-1 ring-[#7E6BAF]/10 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#7E6BAF] hover:text-white hover:ring-[#7E6BAF] hover:shadow-[0_12px_26px_-8px_rgba(91,71,160,0.5)] no-underline"
        >
          {loggedToday ? "View today's log" : "Check in"}{" "}
          <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
        </Link>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  editing,
  placeholder,
  type = "text",
  verified,
  onChange,
}: {
  label: string;
  value: string;
  editing: boolean;
  placeholder?: string;
  type?: string;
  verified?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-wider text-[#A89BD0]">
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          disabled={!editing}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-xl border border-[#EEE9F8] bg-white/70 px-4 py-2.5 text-[14px] text-[#3D2E6B] placeholder:text-[#A89BD0]/60 outline-none transition focus:border-[#7E6BAF] focus:ring-4 focus:ring-[#7E6BAF]/10 disabled:cursor-default disabled:bg-transparent ${
            verified ? "pr-10" : ""
          }`}
        />
        {verified && (
          <span
            className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-[#E3F4EA] text-[#5BAF7E]"
            title="Verified"
          >
            <Check className="h-3 w-3" />
          </span>
        )}
      </div>
    </div>
  );
}
