import { useState, type ChangeEvent, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Camera,
  Pencil,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Heart,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Check,
  X,
  HeartPulse,
  Compass,
  MessageCircle,
  TrendingUp,
  MessageSquare,
  Plus,
  CalendarCheck,
  ClipboardList,
  Clock,
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

const FOCUS_AREAS = [
  "Anxiety",
  "Depression",
  "Stress",
  "Relationships",
  "Self-esteem",
  "Sleep",
  "Grief",
  "Work & burnout",
];

const SESSION_PREFS = ["Online", "In-person", "Either"] as const;

type Profile = {
  firstName: string;
  lastName: string;
  pronouns: string;
  email: string;
  phone: string;
  location: string;
  birthday: string;
  bio: string;
  focusAreas: string[];
  sessionPref: (typeof SESSION_PREFS)[number];
  avatar: string | null;
};

const DEFAULT_PROFILE: Profile = {
  firstName: "",
  lastName: "",
  pronouns: "",
  email: "",
  phone: "",
  location: "",
  birthday: "",
  bio: "",
  focusAreas: [],
  sessionPref: "Either",
  avatar: null,
};

function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [editing, setEditing] = useState<boolean>(true);
  const [savedFlash, setSavedFlash] = useState<boolean>(false);

  const displayName =
    [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() ||
    "Your name";

  const initials =
    (profile.firstName.charAt(0) + profile.lastName.charAt(0)).toUpperCase() ||
    "Y";

  const update = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setProfile((p) => ({ ...p, [key]: value }));

  const toggleFocus = (area: string) =>
    setProfile((p) => ({
      ...p,
      focusAreas: p.focusAreas.includes(area)
        ? p.focusAreas.filter((a) => a !== area)
        : [...p.focusAreas, area],
    }));

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

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#F4EFFB]"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {/* Ambient background glows */}
      <div className="pointer-events-none fixed -top-[10%] -right-[10%] -z-0 h-[500px] w-[500px] rounded-full bg-[#7E6BAF]/10 blur-[120px]" />
      <div className="pointer-events-none fixed -bottom-[10%] -left-[10%] -z-0 h-[500px] w-[500px] rounded-full bg-[#A89BD0]/15 blur-[120px]" />

      <Navbar />

      <main className="relative z-10 mx-auto max-w-6xl space-y-6 px-4 pb-24 pt-28 sm:px-6 lg:px-8">
        {savedFlash && (
          <div className="fixed left-1/2 top-24 z-50 -translate-x-1/2 animate-fade-in rounded-full border border-[#7E6BAF]/20 bg-white px-5 py-2.5 text-sm font-medium text-[#3D2E6B] shadow-[0_10px_30px_-10px_rgba(126,107,175,0.45)]">
            <Check className="mr-2 inline h-4 w-4 text-[#7E6BAF]" />
            Profile saved
          </div>
        )}

        {/* Header card */}
        <section className="relative overflow-hidden rounded-[2.5rem] border border-white/40 bg-white/70 p-8 shadow-xl shadow-[#3D2E6B]/5 backdrop-blur-xl">
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="relative">
              <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr from-[#7E6BAF] to-[#A89BD0] text-4xl font-semibold text-white shadow-inner">
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
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#F4EFFB] bg-white text-[#7E6BAF] shadow-lg transition hover:scale-110"
                aria-label="Upload photo"
              >
                <Camera className="h-5 w-5" />
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatar}
              />
            </div>

            <div className="flex-1 text-center sm:text-left">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7E6BAF]">
                Client profile
              </p>
              <h1 className="mt-1 text-4xl font-bold leading-tight text-[#3D2E6B]">
                {displayName}
              </h1>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                <span className="text-sm text-[#7E6BAF]">
                  {profile.pronouns ? `${profile.pronouns} · ` : ""}
                  {profile.location || "Add your location"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#7E6BAF]/10 px-3 py-1 text-xs font-medium text-[#7E6BAF]">
                  <ShieldCheck className="h-3 w-3" />
                  Private — only you can see this
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              {editing ? (
                <>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="inline-flex items-center gap-2 rounded-full border border-[#E6DFF4] bg-white/60 px-6 py-2.5 text-sm font-semibold text-[#7E6BAF] transition hover:bg-white"
                  >
                    <X className="h-4 w-4" /> Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="inline-flex items-center gap-2 rounded-full bg-[#7E6BAF] px-8 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#A89BD0]/40 transition hover:-translate-y-0.5 hover:bg-[#3D2E6B] hover:shadow-[#7E6BAF]/50"
                  >
                    <Check className="h-4 w-4" /> Save profile
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-[#7E6BAF] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#A89BD0]/40 transition hover:-translate-y-0.5 hover:bg-[#3D2E6B]"
                >
                  <Pencil className="h-4 w-4" /> Edit profile
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Row 1: About (span 2) + Next Steps sidebar */}
        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card title="About you" icon={<Sparkles className="h-5 w-5" />}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="First name"
                  value={profile.firstName}
                  editing={editing}
                  placeholder="Jane"
                  onChange={(v) => update("firstName", v)}
                />
                <Field
                  label="Last name"
                  value={profile.lastName}
                  editing={editing}
                  placeholder="Doe"
                  onChange={(v) => update("lastName", v)}
                />
                <Field
                  label="Pronouns"
                  value={profile.pronouns}
                  editing={editing}
                  placeholder="she/her"
                  onChange={(v) => update("pronouns", v)}
                />
                <Field
                  label="Birthday"
                  value={profile.birthday}
                  editing={editing}
                  type="date"
                  icon={<Calendar className="h-4 w-4" />}
                  onChange={(v) => update("birthday", v)}
                />
              </div>

              <div className="mt-6">
                <label className="ml-1 text-[10px] font-bold uppercase tracking-wider text-[#7E6BAF]">
                  A little about you
                </label>
                {editing ? (
                  <textarea
                    value={profile.bio}
                    onChange={(e) => update("bio", e.target.value)}
                    rows={4}
                    placeholder="What brings you to Lubin? Share as much or as little as you'd like."
                    className="mt-1.5 w-full resize-none rounded-2xl border border-[#EEE9F8] bg-white/50 px-5 py-4 text-[14px] text-[#3D2E6B] placeholder:text-[#A89BD0]/60 outline-none transition focus:border-[#7E6BAF] focus:ring-4 focus:ring-[#7E6BAF]/10"
                  />
                ) : (
                  <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-[#3D2E6B]">
                    {profile.bio || (
                      <span className="text-[#A89BD0]">No bio yet.</span>
                    )}
                  </p>
                )}
              </div>
            </Card>
          </div>

          {/* Your space sidebar */}
          <Card title="Your space" icon={<ArrowRight className="h-5 w-5" />}>
            <div className="flex flex-col gap-3">
              <NextStep
                to="/my-health-passport"
                title="Health passport"
                desc="Your wellness record in one secure place."
                icon={<HeartPulse className="h-5 w-5" />}
              />
              <NextStep
                to="/self-discovery"
                title="Self discovery"
                desc="Explore guided exercises and prompts."
                icon={<Compass className="h-5 w-5" />}
              />
              <NextStep
                to="/chat"
                title="Chat"
                desc="Talk things through, anytime you need."
                icon={<MessageCircle className="h-5 w-5" />}
              />
            </div>
          </Card>
        </div>

        {/* Row 2: Contact + Support */}
        <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2">
          <Card title="Contact" icon={<Mail className="h-5 w-5" />}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="Email"
                  value={profile.email}
                  editing={editing}
                  type="email"
                  placeholder="you@example.com"
                  icon={<Mail className="h-4 w-4" />}
                  onChange={(v) => update("email", v)}
                />
                <Field
                  label="Phone"
                  value={profile.phone}
                  editing={editing}
                  type="tel"
                  placeholder="+63 900 000 0000"
                  icon={<Phone className="h-4 w-4" />}
                  onChange={(v) => update("phone", v)}
                />
                <div className="sm:col-span-2">
                  <Field
                    label="Location"
                    value={profile.location}
                    editing={editing}
                    placeholder="Manila, Philippines"
                    icon={<MapPin className="h-4 w-4" />}
                    onChange={(v) => update("location", v)}
                  />
                </div>
              </div>
            </Card>

          <Card
            title="Support focus areas"
            icon={<Heart className="h-5 w-5" />}
          >
              <div className="flex flex-wrap gap-2">
                {FOCUS_AREAS.map((area) => {
                  const active = profile.focusAreas.includes(area);
                  return (
                    <button
                      key={area}
                      type="button"
                      disabled={!editing && !active}
                      onClick={() => editing && toggleFocus(area)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        active
                          ? "bg-[#7E6BAF] text-white shadow-md shadow-[#7E6BAF]/30"
                          : "bg-[#7E6BAF]/10 text-[#7E6BAF] hover:bg-[#7E6BAF]/20"
                      } ${!editing && !active ? "opacity-40" : ""}`}
                    >
                      {area}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6">
                <label className="ml-1 text-[10px] font-bold uppercase tracking-wider text-[#7E6BAF]">
                  Session preference
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SESSION_PREFS.map((pref) => {
                    const active = profile.sessionPref === pref;
                    return (
                      <button
                        key={pref}
                        type="button"
                        disabled={!editing}
                        onClick={() => update("sessionPref", pref)}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                          active
                            ? "bg-[#7E6BAF] text-white shadow-md shadow-[#7E6BAF]/30"
                            : "bg-[#7E6BAF]/10 text-[#7E6BAF] hover:bg-[#7E6BAF]/20"
                        } ${!editing ? "cursor-default" : ""}`}
                      >
                        {pref}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>
        </div>

        {/* Row 3: CTA */}
        <div className="group relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#7E6BAF] to-[#3D2E6B] p-8 text-white shadow-2xl shadow-[#3D2E6B]/20 sm:p-10">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl transition-transform duration-700 group-hover:scale-150" />
          <div className="relative z-10 flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold leading-tight sm:text-3xl">
                Your journey, your pace
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/85 sm:text-[15px]">
                Filling out your profile helps us recommend the best tools and
                support for your unique mental wellness path.
              </p>
            </div>
            <Link
              to="/find-provider"
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-white px-7 py-3 text-sm font-bold text-[#3D2E6B] no-underline shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-[#F4EFFB]"
            >
              Explore providers <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex h-full flex-col rounded-[2.5rem] border border-white/40 bg-white/70 p-8 shadow-lg shadow-[#3D2E6B]/5 backdrop-blur-xl">
      <div className="mb-6 flex items-center gap-2 text-[#7E6BAF]">
        <span className="text-[#7E6BAF]">{icon}</span>
        <h2 className="text-lg font-bold text-[#3D2E6B]">{title}</h2>
      </div>
      <div className="flex-1">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  editing,
  placeholder,
  type = "text",
  icon,
  onChange,
}: {
  label: string;
  value: string;
  editing: boolean;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="ml-1 text-[10px] font-bold uppercase tracking-wider text-[#7E6BAF]">
        {label}
      </label>
      {editing ? (
        <div className="relative mt-1.5">
          {icon && (
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#A89BD0]">
              {icon}
            </span>
          )}
          <input
            type={type}
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full rounded-2xl border border-[#EEE9F8] bg-white/50 py-3.5 text-[14px] text-[#3D2E6B] placeholder:text-[#A89BD0]/60 outline-none transition focus:border-[#7E6BAF] focus:ring-4 focus:ring-[#7E6BAF]/10 ${
              icon ? "pl-11 pr-5" : "px-5"
            }`}
          />
        </div>
      ) : (
        <p className="mt-1.5 flex items-center gap-2 text-[14px] text-[#3D2E6B]">
          {icon && <span className="text-[#A89BD0]">{icon}</span>}
          {value || <span className="text-[#A89BD0]">Not set</span>}
        </p>
      )}
    </div>
  );
}

function NextStep({
  to,
  title,
  desc,
  icon,
}: {
  to: string;
  title: string;
  desc: string;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="group flex items-start justify-between gap-3 rounded-2xl border border-[#EEE9F8] bg-white p-5 no-underline transition hover:border-[#7E6BAF]/30 hover:shadow-md"
    >
      {icon && (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7E6BAF]/10 text-[#7E6BAF] transition group-hover:bg-[#7E6BAF] group-hover:text-white">
          {icon}
        </span>
      )}
      <span className="flex-1 space-y-1">
        <span className="block text-[14px] font-bold text-[#3D2E6B] transition-colors group-hover:text-[#7E6BAF]">
          {title}
        </span>
        <span className="block text-[13px] leading-relaxed text-[#A89BD0]">
          {desc}
        </span>
      </span>
      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[#A89BD0] transition-all group-hover:translate-x-1 group-hover:text-[#7E6BAF]" />
    </Link>
  );
}