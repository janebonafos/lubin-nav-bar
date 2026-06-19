import { useState, type ChangeEvent } from "react";
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
  CalendarCheck,
  ArrowRight,
  Check,
  X,
} from "lucide-react";
import Navbar from "@/components/Navbar";

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
      className="min-h-screen bg-gradient-to-b from-[#F4EFFB] via-[#FBF8FF] to-white"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-28 sm:px-6 lg:px-8">
        {savedFlash && (
          <div className="fixed left-1/2 top-24 z-50 -translate-x-1/2 animate-fade-in rounded-full border border-[#7E6BAF]/20 bg-white px-5 py-2.5 text-sm font-medium text-[#3D2E6B] shadow-[0_10px_30px_-10px_rgba(126,107,175,0.45)]">
            <Check className="mr-2 inline h-4 w-4 text-[#7E6BAF]" />
            Profile saved
          </div>
        )}

        {/* Header card */}
        <section className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/70 p-6 shadow-[0_20px_60px_-20px_rgba(126,107,175,0.35)] backdrop-blur-xl sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-br from-[#C9BEE5]/60 to-transparent blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-gradient-to-tr from-[#A89BD0]/40 to-transparent blur-2xl" />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#A89BD0] to-[#7E6BAF] text-2xl font-bold text-white shadow-[0_10px_30px_-8px_rgba(126,107,175,0.55)] sm:h-28 sm:w-28">
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
                className="absolute -bottom-1 -right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[#E6DFF4] bg-white text-[#7E6BAF] shadow-md transition hover:bg-[#F4EFFB] hover:text-[#3D2E6B]"
                aria-label="Upload photo"
              >
                <Camera className="h-4 w-4" />
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatar}
              />
            </div>

            <div className="flex-1">
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#7E6BAF]">
                Client profile
              </p>
              <h1 className="mt-1 text-[26px] font-bold leading-tight text-[#1F1B2E] sm:text-[30px]">
                {displayName}
              </h1>
              <p className="mt-1 text-[14px] text-[#5A4E8A]">
                {profile.pronouns ? `${profile.pronouns} · ` : ""}
                {profile.location || "Add your location"}
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#7E6BAF]/10 px-3 py-1 text-[12px] font-medium text-[#3D2E6B]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Private — only you can see this
              </div>
            </div>

            <div className="flex shrink-0 gap-2">
              {editing ? (
                <>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="inline-flex items-center gap-2 rounded-full border border-[#E6DFF4] bg-white px-4 py-2 text-sm font-medium text-[#5A4E8A] transition hover:border-[#C9BEE5] hover:text-[#3D2E6B]"
                  >
                    <X className="h-4 w-4" /> Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#A89BD0] to-[#7E6BAF] px-5 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(126,107,175,0.55)] transition hover:-translate-y-0.5 hover:from-[#7E6BAF] hover:to-[#5A4E8A]"
                  >
                    <Check className="h-4 w-4" /> Save profile
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-[#7E6BAF]/30 bg-white px-4 py-2 text-sm font-medium text-[#3D2E6B] transition hover:border-[#7E6BAF]/60 hover:text-[#7E6BAF]"
                >
                  <Pencil className="h-4 w-4" /> Edit profile
                </button>
              )}
            </div>
          </div>
        </section>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* About + contact */}
          <section className="lg:col-span-2 flex flex-col gap-6">
            <Card title="About you" icon={<Sparkles className="h-4 w-4" />}>
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

              <div className="mt-4">
                <label className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#7E6BAF]">
                  A little about you
                </label>
                {editing ? (
                  <textarea
                    value={profile.bio}
                    onChange={(e) => update("bio", e.target.value)}
                    rows={4}
                    placeholder="What brings you to Lubin? Share as much or as little as you'd like."
                    className="mt-1.5 w-full rounded-2xl border border-[#E6DFF4] bg-white px-4 py-3 text-[14px] text-[#1F1B2E] placeholder:text-[#9F94C2] outline-none transition focus:border-[#7E6BAF] focus:ring-2 focus:ring-[#7E6BAF]/20"
                  />
                ) : (
                  <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-relaxed text-[#3D2E6B]">
                    {profile.bio || (
                      <span className="text-[#9F94C2]">No bio yet.</span>
                    )}
                  </p>
                )}
              </div>
            </Card>

            <Card title="Contact" icon={<Mail className="h-4 w-4" />}>
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
                <Field
                  label="Location"
                  value={profile.location}
                  editing={editing}
                  placeholder="Manila, Philippines"
                  icon={<MapPin className="h-4 w-4" />}
                  onChange={(v) => update("location", v)}
                />
              </div>
            </Card>

            <Card title="What you'd like support with" icon={<Heart className="h-4 w-4" />}>
              <div className="flex flex-wrap gap-2">
                {FOCUS_AREAS.map((area) => {
                  const active = profile.focusAreas.includes(area);
                  return (
                    <button
                      key={area}
                      type="button"
                      disabled={!editing && !active}
                      onClick={() => editing && toggleFocus(area)}
                      className={`rounded-full border px-4 py-1.5 text-[13px] font-medium transition ${
                        active
                          ? "border-[#7E6BAF] bg-[#7E6BAF] text-white shadow-[0_6px_16px_-8px_rgba(126,107,175,0.55)]"
                          : "border-[#E6DFF4] bg-white text-[#5A4E8A] hover:border-[#C9BEE5] hover:text-[#3D2E6B]"
                      } ${!editing && !active ? "opacity-40" : ""}`}
                    >
                      {area}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6">
                <label className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#7E6BAF]">
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
                        className={`rounded-full border px-4 py-1.5 text-[13px] font-medium transition ${
                          active
                            ? "border-[#7E6BAF] bg-[#7E6BAF]/10 text-[#3D2E6B]"
                            : "border-[#E6DFF4] bg-white text-[#5A4E8A] hover:border-[#C9BEE5]"
                        } ${!editing ? "cursor-default" : ""}`}
                      >
                        {pref}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>
          </section>

          {/* Side: next steps */}
          <aside className="flex flex-col gap-6">
            <Card title="Next steps" icon={<ArrowRight className="h-4 w-4" />}>
              <ul className="flex flex-col gap-3">
                <NextStep
                  to="/find-provider"
                  title="Find a provider"
                  desc="Browse verified therapists and counsellors."
                />
                <NextStep
                  to="/check-in"
                  title="Daily check-in"
                  desc="Log your mood and spot patterns."
                />
                <NextStep
                  to="/self-discovery"
                  title="Self discovery"
                  desc="Explore guided exercises and prompts."
                />
              </ul>
            </Card>

            <div className="rounded-3xl border border-[#7E6BAF]/15 bg-gradient-to-br from-[#7E6BAF] to-[#3D2E6B] p-6 text-white shadow-[0_20px_60px_-20px_rgba(61,46,107,0.55)]">
              <h3 className="text-[16px] font-semibold">
                Your journey, your pace
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-white/85">
                Filling out your profile helps us recommend the right providers
                and resources for you.
              </p>
              <Link
                to="/find-provider"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#3D2E6B] no-underline transition hover:-translate-y-0.5"
              >
                Explore providers <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </aside>
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
    <section className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_12px_40px_-20px_rgba(126,107,175,0.3)] backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-2 text-[#7E6BAF]">
        {icon}
        <h2 className="text-[15px] font-semibold text-[#1F1B2E]">{title}</h2>
      </div>
      {children}
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
      <label className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#7E6BAF]">
        {label}
      </label>
      {editing ? (
        <div className="relative mt-1.5">
          {icon && (
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9F94C2]">
              {icon}
            </span>
          )}
          <input
            type={type}
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full rounded-full border border-[#E6DFF4] bg-white py-2.5 text-[14px] text-[#1F1B2E] placeholder:text-[#9F94C2] outline-none transition focus:border-[#7E6BAF] focus:ring-2 focus:ring-[#7E6BAF]/20 ${
              icon ? "pl-10 pr-4" : "px-4"
            }`}
          />
        </div>
      ) : (
        <p className="mt-1.5 flex items-center gap-2 text-[14px] text-[#3D2E6B]">
          {icon && <span className="text-[#9F94C2]">{icon}</span>}
          {value || <span className="text-[#9F94C2]">Not set</span>}
        </p>
      )}
    </div>
  );
}

function NextStep({
  to,
  title,
  desc,
}: {
  to: string;
  title: string;
  desc: string;
}) {
  return (
    <li>
      <Link
        to={to}
        className="group flex items-center gap-3 rounded-2xl border border-[#E6DFF4] bg-white p-3.5 no-underline transition hover:-translate-y-0.5 hover:border-[#C9BEE5] hover:shadow-[0_10px_24px_-12px_rgba(126,107,175,0.45)]"
      >
        <span className="flex-1">
          <span className="block text-[14px] font-semibold text-[#1F1B2E]">
            {title}
          </span>
          <span className="block text-[12px] leading-snug text-[#5A4E8A]">
            {desc}
          </span>
        </span>
        <ArrowRight className="h-4 w-4 text-[#C9BEE5] transition-transform group-hover:translate-x-0.5 group-hover:text-[#7E6BAF]" />
      </Link>
    </li>
  );
}