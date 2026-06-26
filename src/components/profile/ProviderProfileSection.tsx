import { useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  Check,
  ChevronUp,
  ChevronDown,
  Clock,
  Plus,
  X,
  Pencil,
  Calendar as CalendarIcon,
  Globe,
  ShieldCheck,
  Trash2,
  Languages as LanguagesIcon,
} from "lucide-react";
import { useAvailabilityStore, formatTime12, DAY_KEYS } from "@/lib/availability-store";

/* --------------------------------- Types --------------------------------- */

export type ProviderProfile = {
  profession: string;
  headline: string;
  bio: string;
  focusAreas: string[];
  yearsBand: string;
  languages: string[];
  calendarConnected: boolean;
  calendarEmail: string;
  availabilityDays: string[];
  availabilityStart: string;
  availabilityEnd: string;
  primarySession: {
    name: string;
    lengthMin: number;
    video: boolean;
    rate: number;
  };
  extraSessions: {
    id: string;
    name: string;
    lengthMin: number;
    rate: number;
  }[];
  region: "US" | "PH";
  verified: boolean;
};

export const DEFAULT_PROVIDER_PROFILE: ProviderProfile = {
  profession: "Psychologist",
  headline:
    "Clinical psychologist · Helping adults navigate anxiety and burnout",
  bio: "I'm a licensed clinical psychologist with over 8 years of experience supporting adults through anxiety, stress, and life transitions. My approach blends evidence-based therapy with warmth and curiosity.",
  focusAreas: ["Anxiety & Panic", "Stress & Burnout", "Self-esteem"],
  yearsBand: "6–10 yrs",
  languages: ["English", "Filipino"],
  calendarConnected: true,
  calendarEmail: "jane.doe@gmail.com",
  availabilityDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  availabilityStart: "09:00",
  availabilityEnd: "17:00",
  primarySession: {
    name: "Clinical Psychology Session",
    lengthMin: 50,
    video: true,
    rate: 120,
  },
  extraSessions: [],
  region: "US",
  verified: false,
};

const PROFESSIONS = [
  "Therapist",
  "Psychologist",
  "Counselor",
  "Psychiatrist",
  "Wellness coach",
  "Other",
];

const FOCUS_OPTIONS = [
  "Anxiety & Panic",
  "Depression & Mood",
  "Trauma & PTSD",
  "Relationships",
  "Stress & Burnout",
  "Self-esteem",
  "Grief & Loss",
  "Mindfulness",
  "Sleep & Rest",
];

const YEARS_BANDS = [
  "Just starting (0–2 yrs)",
  "3–5 yrs",
  "6–10 yrs",
  "11–20 yrs",
  "20+ yrs",
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const TIME_SLOTS: string[] = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

function formatTimeLabel(value: string): string {
  const [hStr, mStr] = value.split(":");
  const h = Number(hStr);
  const m = mStr ?? "00";
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour12).padStart(2, "0")}:${m} ${period}`;
}

/* ----------------------------- Small primitives -------------------------- */

function SectionCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="group rounded-[2rem] border border-[#7E6BAF]/10 bg-white p-7 shadow-sm shadow-[#3D2E6B]/[0.03] transition-shadow hover:shadow-xl hover:shadow-[#7E6BAF]/10 sm:p-10">
      <div className="mb-8 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#2A2550]">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-[13.5px] text-[#7E6BAF]">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-all ${
        active
          ? "border-[#7E6BAF] bg-[#7E6BAF] text-white shadow-sm shadow-[#7E6BAF]/30"
          : "border-[#E3DBF5] bg-white text-[#7E6BAF] hover:border-[#A89BD0] hover:bg-[#F8F4FC]"
      }`}
    >
      {children}
    </button>
  );
}

function ReadOnlyChips({ items }: { items: string[] }) {
  if (items.length === 0)
    return <p className="text-[13px] italic text-[#A89BD0]">None set yet</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => (
        <span
          key={it}
          className="rounded-full border border-[#E3DBF5] bg-white px-3 py-1.5 text-[12.5px] font-medium text-[#5E4A8C]"
        >
          {it}
        </span>
      ))}
    </div>
  );
}

function EditButton({
  editing,
  onToggle,
  onSave,
}: {
  editing: boolean;
  onToggle: () => void;
  onSave?: () => void;
}) {
  return editing ? (
    <button
      type="button"
      onClick={onSave ?? onToggle}
      className="inline-flex items-center gap-1.5 rounded-full bg-[#7E6BAF] px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-[#A89BD0]/40 transition hover:bg-[#3D2E6B]"
    >
      <Check className="h-3.5 w-3.5" /> Save
    </button>
  ) : (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#F0EAFB] px-4 py-2 text-[13px] font-semibold text-[#7E6BAF] transition-all hover:bg-[#7E6BAF] hover:text-white"
    >
      <Pencil className="h-3.5 w-3.5" /> Edit
    </button>
  );
}

function TimeSelect({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <span className="block text-[12px] font-medium text-[#5E4A8C]">{label}</span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className={`mt-1 flex w-full items-center justify-between rounded-xl border-2 bg-white px-4 py-2.5 text-sm font-medium text-[#2D1B4E] transition-all ${
          open
            ? "border-[#7E6BAF] shadow-sm ring-4 ring-[#7E6BAF]/10"
            : "border-[#E3DBF5] hover:border-[#A89BD0]"
        }`}
      >
        <span className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#7E6BAF]" />
          {formatTimeLabel(value)}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-[#7E6BAF] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-[#F0EAFB] bg-white py-1.5 shadow-[0_20px_40px_-12px_rgba(126,107,175,0.35)]">
          <div className="max-h-56 overflow-y-auto px-1.5">
            {TIME_SLOTS.map((slot) => {
              const active = slot === value;
              return (
                <button
                  key={slot}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(slot);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] transition-colors ${
                    active
                      ? "bg-[#F0EAFB] font-semibold text-[#3D2E6B]"
                      : "text-[#5E4A8C] hover:bg-[#F7F2FC] hover:text-[#3D2E6B]"
                  }`}
                >
                  <span>{formatTimeLabel(slot)}</span>
                  {active && <Check className="h-3.5 w-3.5 text-[#7E6BAF]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------------- AI Enhance Panel ---------------------------- */

const TONE_PRESETS = [
  { id: "warmer", label: "Warmer" },
  { id: "concise", label: "More concise" },
  { id: "professional", label: "More professional" },
  { id: "specific", label: "More specific" },
  { id: "inviting", label: "More inviting" },
];

function InlineEnhancePanel({
  field,
  current,
  context,
  onClose,
  onApply,
}: {
  field: "headline" | "bio";
  current: string;
  context: { fullName?: string; specialty?: string; focus?: string };
  onClose: () => void;
  onApply: (text: string) => void;
}) {
  const [tone, setTone] = useState<string | null>("warmer");
  const [instruction, setInstruction] = useState("");
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const preset = TONE_PRESETS.find((t) => t.id === tone);
      const res = await fetch("/api/enhance-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field,
          current,
          tone: preset?.label.toLowerCase(),
          instruction,
          context,
        }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok || !data.text) {
        throw new Error(data.error || "Couldn't enhance right now.");
      }
      setSuggestion(data.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const label = field === "headline" ? "headline" : "short bio";

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-[#7E6BAF]/25 bg-gradient-to-br from-white via-white to-[#F4EEFB] shadow-[0_4px_24px_-12px_rgba(126,107,175,0.25)]">
      <div className="flex items-center gap-3 border-b border-[#E3DBF5]/60 bg-white/60 px-5 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#7E6BAF] to-[#5E4B8E]">
          <Sparkles className="h-3.5 w-3.5 text-white" fill="currentColor" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[#3D2E6B]">Rewrite your {label} with AI</p>
          <p className="text-[11px] text-[#A89BD0]">Pick a tone and we'll draft a suggestion</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-[#A89BD0] hover:bg-[#F4EEFB] hover:text-[#7E6BAF]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4 px-5 py-5">
        <div className="flex flex-wrap gap-2">
          {TONE_PRESETS.map((t) => (
            <Pill key={t.id} active={tone === t.id} onClick={() => setTone(tone === t.id ? null : t.id)}>
              {t.label}
            </Pill>
          ))}
        </div>

        <textarea
          rows={2}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Optional hint — e.g. mention I work with new parents"
          className="w-full resize-none rounded-xl border border-[#E3DBF5] bg-white px-3.5 py-2.5 text-[13px] text-[#3D2E6B] placeholder:text-[#A89BD0] outline-none transition focus:border-[#7E6BAF] focus:ring-2 focus:ring-[#7E6BAF]/15"
        />

        {suggestion && (
          <div className="rounded-xl border border-[#7E6BAF]/25 bg-white/80 p-3.5">
            <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#7E6BAF]">
              <Sparkles className="h-3 w-3" fill="currentColor" strokeWidth={1.5} />
              AI suggestion
            </p>
            <p className="text-[13px] leading-relaxed text-[#3D2E6B]">{suggestion}</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/80 px-3.5 py-2.5 text-[12px] text-rose-700">
            {error}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-[#E3DBF5]/60 bg-white/60 px-5 py-3">
        {suggestion ? (
          <>
            <button
              type="button"
              onClick={run}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3DBF5] bg-white px-3 py-1.5 text-[12px] font-medium text-[#7E6BAF] transition hover:border-[#7E6BAF] disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Try again
            </button>
            <button
              type="button"
              onClick={() => {
                onApply(suggestion);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-[#7E6BAF] to-[#5E4B8E] px-3.5 py-1.5 text-[12px] font-medium text-white transition"
            >
              <Check className="h-3.5 w-3.5" /> Use this
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={run}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-[#7E6BAF] to-[#5E4B8E] px-3.5 py-1.5 text-[12px] font-medium text-white transition disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" fill="currentColor" strokeWidth={1.5} /> Generate
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function AIButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Enhance with AI"
      aria-label="Enhance with AI"
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-white shadow-sm ring-1 ring-white/70 transition-all hover:shadow-md active:scale-95 ${
        active
          ? "bg-gradient-to-br from-[#7E6BAF] to-[#5E4B8E]"
          : "bg-gradient-to-br from-[#CFC3EA] to-[#B5A4D8] hover:from-[#9A88C7] hover:to-[#7E6BAF]"
      }`}
    >
      {active ? <ChevronUp className="h-4 w-4" /> : <Sparkles className="h-4 w-4" fill="currentColor" strokeWidth={1.5} />}
    </button>
  );
}

/* ============================== Main Component ========================== */

const STORAGE_KEY = "lubin.providerProfile.v1";

export default function ProviderProfileSection({
  fullName,
  avatarUrl,
  onAvatarChange,
}: {
  fullName: string;
  avatarUrl?: string | null;
  onAvatarChange?: (dataUrl: string) => void;
}) {
  const [data, setData] = useState<ProviderProfile>(DEFAULT_PROVIDER_PROFILE);
  const [editing, setEditing] = useState<{
    about: boolean;
    sessions: boolean;
    availability: boolean;
  }>({ about: false, sessions: false, availability: false });
  const [enhanceOpen, setEnhanceOpen] = useState<null | "headline" | "bio">(null);

  // Load + persist
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setData({ ...DEFAULT_PROVIDER_PROFILE, ...JSON.parse(raw) });
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { /* ignore */ }
  }, [data]);

  const update = <K extends keyof ProviderProfile>(k: K, v: ProviderProfile[K]) =>
    setData((p) => ({ ...p, [k]: v }));

  const currency = data.region === "PH" ? { code: "PHP", symbol: "₱" } : { code: "USD", symbol: "$" };
  const fmtPrice = (n: number) =>
    n > 0 ? `${currency.symbol}${Math.round(n).toLocaleString()} ${currency.code}` : "Not set";

  const toggleArray = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  /* ---------------------------- Languages input -------------------------- */
  const [langDraft, setLangDraft] = useState("");
  const addLanguage = () => {
    const v = langDraft.trim();
    if (!v) return;
    if (!data.languages.includes(v))
      update("languages", [...data.languages, v]);
    setLangDraft("");
  };

  /* --------------------------- Extra session form ------------------------ */
  const [showAddSession, setShowAddSession] = useState(false);
  const [newSession, setNewSession] = useState({ name: "", lengthMin: 50, rate: "" });
  const saveNewSession = () => {
    if (!newSession.name.trim() || !newSession.rate) return;
    update("extraSessions", [
      ...data.extraSessions,
      {
        id: String(Date.now()),
        name: newSession.name.trim(),
        lengthMin: newSession.lengthMin,
        rate: Number(newSession.rate) || 0,
      },
    ]);
    setNewSession({ name: "", lengthMin: 50, rate: "" });
    setShowAddSession(false);
  };

  return (
    <div className="space-y-6">
      {/* ---------------------- Provider summary header ---------------------- */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#7E6BAF] via-[#7E6BAF] to-[#5D4E8A] p-8 text-white shadow-2xl shadow-[#7E6BAF]/25 sm:p-12">
        <div aria-hidden className="pointer-events-none absolute -top-20 -right-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-[#2A2550]/20 blur-3xl" />
        <div className="relative z-10 space-y-6">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3 py-1 backdrop-blur-sm">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-[0.15em]">Provider Profile</span>
          </div>

          <div className="flex items-center gap-5 sm:gap-6">
            <div className="relative shrink-0">
              <label
                htmlFor={onAvatarChange ? "provider-avatar-upload" : undefined}
                className={`group relative block h-20 w-20 overflow-hidden rounded-[22px] border border-white/30 bg-gradient-to-br from-[#D9CEF0] to-[#9A8BC4] shadow-xl shadow-[#2A2550]/30 backdrop-blur-sm sm:h-28 sm:w-28 sm:rounded-[28px] ${onAvatarChange ? "cursor-pointer" : ""}`}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={fullName || "Provider"} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                    {(fullName || "?")
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((w) => w.charAt(0).toUpperCase())
                      .join("") || "?"}
                  </div>
                )}
                {onAvatarChange && (
                  <>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[#2A2550]/55 text-white opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 sm:h-6 sm:w-6">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      <span className="text-[10px] font-semibold uppercase tracking-wider sm:text-[11px]">
                        {avatarUrl ? "Change" : "Upload"}
                      </span>
                    </div>
                    <input
                      id="provider-avatar-upload"
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => onAvatarChange(String(reader.result));
                        reader.readAsDataURL(file);
                        e.target.value = "";
                      }}
                    />
                  </>
                )}
              </label>
            </div>
            <div className="min-w-0">
              <h2 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
                {fullName || "Your provider profile"}
              </h2>
              <p className="mt-2 text-lg font-medium text-purple-100 sm:text-xl">{data.profession}</p>
            </div>
          </div>

          <p className="line-clamp-3 max-w-2xl text-[15px] font-medium leading-relaxed text-purple-100/90 sm:text-base">
            {data.bio}
          </p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 text-sm font-medium text-purple-100">
            <span className="inline-flex items-center gap-2">
              <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${data.calendarConnected ? "bg-emerald-300" : "bg-white/50"}`} />
              {data.calendarConnected ? "Calendar connected" : "Calendar not connected"}
            </span>
            <span aria-hidden className="h-3 w-px bg-white/25" />
            <span>{data.yearsBand} experience</span>
            {!data.verified && (
              <>
                <span aria-hidden className="h-3 w-px bg-white/25" />
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-200/90" />
                  Verification pending
                </span>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ---------------------------- About me ---------------------------- */}
      <SectionCard
        title="About me"
        subtitle="Your headline, bio, and the focus areas clients see first."
        action={
          <EditButton
            editing={editing.about}
            onToggle={() => setEditing((p) => ({ ...p, about: !p.about }))}
          />
        }
      >
        <div className="space-y-5">
          {/* Profession */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A89BD0]">
              Profession
            </p>
            {editing.about ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {PROFESSIONS.map((p) => (
                  <Pill key={p} active={data.profession === p} onClick={() => update("profession", p)}>
                    {p}
                  </Pill>
                ))}
              </div>
            ) : (
              <p className="mt-1.5 text-[14px] font-medium text-[#3D2E6B]">{data.profession}</p>
            )}
          </div>

          {/* Headline */}
          <div>
            <div className="flex items-baseline justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A89BD0]">
                Professional headline
              </p>
            </div>
            {editing.about ? (
              <div className="relative mt-1.5">
                <input
                  value={data.headline}
                  onChange={(e) => update("headline", e.target.value)}
                  className="w-full rounded-xl border border-[#EEE9F8] bg-white px-4 py-2.5 pr-14 text-[14px] text-[#3D2E6B] outline-none transition focus:border-[#7E6BAF] focus:ring-4 focus:ring-[#7E6BAF]/10"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2">
                  <AIButton
                    active={enhanceOpen === "headline"}
                    onClick={() => setEnhanceOpen(enhanceOpen === "headline" ? null : "headline")}
                  />
                </span>
              </div>
            ) : (
              <p className="mt-1.5 text-[14px] font-medium text-[#3D2E6B]">{data.headline}</p>
            )}
            {editing.about && enhanceOpen === "headline" && (
              <InlineEnhancePanel
                field="headline"
                current={data.headline}
                context={{ fullName, specialty: data.profession, focus: data.focusAreas[0] }}
                onClose={() => setEnhanceOpen(null)}
                onApply={(text) => update("headline", text)}
              />
            )}
          </div>

          {/* Bio */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A89BD0]">
              Short bio
            </p>
            {editing.about ? (
              <div className="relative mt-1.5">
                <textarea
                  rows={4}
                  value={data.bio}
                  onChange={(e) => update("bio", e.target.value)}
                  className="w-full resize-none rounded-xl border border-[#EEE9F8] bg-white px-4 py-3 pr-14 text-[14px] leading-relaxed text-[#3D2E6B] outline-none transition focus:border-[#7E6BAF] focus:ring-4 focus:ring-[#7E6BAF]/10"
                />
                <span className="absolute right-2 top-2">
                  <AIButton
                    active={enhanceOpen === "bio"}
                    onClick={() => setEnhanceOpen(enhanceOpen === "bio" ? null : "bio")}
                  />
                </span>
              </div>
            ) : (
              <p className="mt-1.5 text-[14px] leading-relaxed text-[#3D2E6B]">{data.bio}</p>
            )}
            {editing.about && enhanceOpen === "bio" && (
              <InlineEnhancePanel
                field="bio"
                current={data.bio}
                context={{ fullName, specialty: data.profession, focus: data.focusAreas[0] }}
                onClose={() => setEnhanceOpen(null)}
                onApply={(text) => update("bio", text)}
              />
            )}
          </div>

          {/* Focus */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A89BD0]">
              Focus areas
            </p>
            {editing.about ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {FOCUS_OPTIONS.map((f) => (
                  <Pill
                    key={f}
                    active={data.focusAreas.includes(f)}
                    onClick={() => update("focusAreas", toggleArray(data.focusAreas, f))}
                  >
                    {f}
                  </Pill>
                ))}
              </div>
            ) : (
              <div className="mt-2">
                <ReadOnlyChips items={data.focusAreas} />
              </div>
            )}
          </div>

          {/* Years */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A89BD0]">
              Years of experience
            </p>
            {editing.about ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {YEARS_BANDS.map((y) => (
                  <Pill key={y} active={data.yearsBand === y} onClick={() => update("yearsBand", y)}>
                    {y}
                  </Pill>
                ))}
              </div>
            ) : (
              <p className="mt-1.5 text-[14px] font-medium text-[#3D2E6B]">{data.yearsBand}</p>
            )}
          </div>

          {/* Languages */}
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#A89BD0]">
              <LanguagesIcon className="h-3 w-3" /> Languages
            </p>
            {editing.about ? (
              <div className="mt-2 space-y-2">
                <div className="flex flex-wrap gap-2">
                  {data.languages.map((l) => (
                    <span
                      key={l}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#E3DBF5] bg-white px-3 py-1.5 text-[12.5px] font-medium text-[#5E4A8C]"
                    >
                      {l}
                      <button
                        type="button"
                        onClick={() => update("languages", data.languages.filter((x) => x !== l))}
                        className="text-[#A89BD0] hover:text-rose-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={langDraft}
                    onChange={(e) => setLangDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLanguage())}
                    placeholder="Add a language and press Enter"
                    className="flex-1 rounded-xl border border-[#EEE9F8] bg-white px-4 py-2 text-[13px] text-[#3D2E6B] outline-none focus:border-[#7E6BAF] focus:ring-2 focus:ring-[#7E6BAF]/10"
                  />
                  <button
                    type="button"
                    onClick={addLanguage}
                    className="rounded-xl bg-[#7E6BAF]/10 px-4 text-[13px] font-semibold text-[#7E6BAF] hover:bg-[#7E6BAF]/20"
                  >
                    Add
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-2">
                <ReadOnlyChips items={data.languages} />
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* ---------------------------- Calendar & Availability --------------- */}
      <SectionCard
        title="Calendar & availability"
        subtitle="Clients book directly into these times."
        action={
          <EditButton
            editing={editing.availability}
            onToggle={() => setEditing((p) => ({ ...p, availability: !p.availability }))}
          />
        }
      >
        {/* Calendar connection */}
        <div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold text-[#3D2E6B]">Calendar Connections</p>
              <p className="text-[12px] text-[#7E6BAF]">Sync bookings directly to your calendar.</p>
            </div>
            {data.calendarConnected ? (
              <span className="shrink-0 rounded-[10px] border border-green-100 bg-green-50 px-3 py-1 text-[11px] font-medium text-green-600">
                Sync Active
              </span>
            ) : (
              <span className="shrink-0 rounded-[10px] border border-[#EAE7F5] bg-[#F0EAFB]/40 px-3 py-1 text-[11px] font-medium text-[#7E6BAF]">
                Not connected
              </span>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {/* Google */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E3DBF5]/60 bg-[#F0EAFB]/30 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-[#EAE7F5]">
                  <svg viewBox="0 0 48 48" className="h-6 w-6" aria-hidden="true">
                    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
                    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
                    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35 26.8 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.6 5.1C9.5 39.7 16.2 44 24 44z"/>
                    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.2-.1-2.3-.4-3.5z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#3D2E6B]">Google Calendar</p>
                  <p className="text-[12.5px] text-[#7E6BAF]">
                    {data.calendarConnected ? `Connected · ${data.calendarEmail}` : "Not connected"}
                  </p>
                </div>
              </div>
              {data.calendarConnected ? (
                <button
                  type="button"
                  onClick={() => update("calendarConnected", false)}
                  className="text-[12.5px] font-semibold text-[#A89BD0] hover:text-rose-500"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => update("calendarConnected", true)}
                  className="rounded-full bg-[#7E6BAF] px-4 py-1.5 text-[12.5px] font-semibold text-white hover:bg-[#3D2E6B]"
                >
                  Connect
                </button>
              )}
            </div>
            {/* Coming soon */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-[#D8CFEC] bg-transparent px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl ring-1 ring-[#E3DBF5]/80">
                  <CalendarIcon className="h-5 w-5 text-[#A89BD0]" />
                </div>
                <p className="text-[14px] font-medium text-[#7E6BAF]">Outlook & iCloud</p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">
                Coming Soon
              </span>
            </div>
          </div>
          {!data.calendarConnected && (
            <p className="mt-3 rounded-xl border border-amber-200/70 bg-amber-50/70 px-3 py-2 text-[12px] text-amber-800">
              Your profile won't go live until you connect a calendar.
            </p>
          )}
        </div>

        {/* Weekly availability */}
        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A89BD0]">
            Weekly availability
          </p>

          {editing.availability ? (
            <>
              <div className="mt-2 flex flex-wrap gap-2">
                {DAYS.map((d) => {
                  const active = data.availabilityDays.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => update("availabilityDays", toggleArray(data.availabilityDays, d))}
                      className={`h-10 min-w-[64px] rounded-full px-4 text-[13px] font-semibold transition ${
                        active
                          ? "bg-[#7E6BAF] text-white shadow-sm shadow-[#7E6BAF]/30"
                          : "border border-[#E3DBF5] bg-white text-[#5E4A8C] hover:border-[#A89BD0]"
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-md">
                <TimeSelect
                  label="Start"
                  value={data.availabilityStart}
                  onChange={(v) => update("availabilityStart", v)}
                />
                <TimeSelect
                  label="End"
                  value={data.availabilityEnd}
                  onChange={(v) => update("availabilityEnd", v)}
                />
              </div>
            </>
          ) : (
            <div className="mt-2 space-y-2">
              <ReadOnlyChips items={data.availabilityDays} />
              <p className="text-[13.5px] font-medium text-[#3D2E6B]">
                {formatTimeLabel(data.availabilityStart)} – {formatTimeLabel(data.availabilityEnd)}
              </p>
            </div>
          )}
        </div>
      </SectionCard>

      {/* ---------------------------- Sessions & Rates -------------------- */}
      <SectionCard
        title="Sessions & rates"
        subtitle={`Prices shown in ${currency.code}.`}
        action={
          <EditButton
            editing={editing.sessions}
            onToggle={() => setEditing((p) => ({ ...p, sessions: !p.sessions }))}
          />
        }
      >
        {/* Primary session */}
        <div>
          <div className="mb-5 flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7E6BAF]/60">
              Primary session
            </span>
            <div className="h-px flex-1 bg-[#EEE6F7]" />
          </div>
          {editing.sessions ? (
            <div className="space-y-7 rounded-2xl border border-[#EEE6F7] bg-white/80 p-6 shadow-[0_8px_30px_rgb(126,107,175,0.05)]">
              <div>
                <p className="ml-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#7E6BAF]">
                  Session name
                </p>
                <input
                  value={data.primarySession.name}
                  onChange={(e) =>
                    update("primarySession", { ...data.primarySession, name: e.target.value })
                  }
                  className="mt-2 w-full rounded-2xl border border-[#EEE6F7] bg-[#F0EAFB]/30 px-5 py-3.5 text-[14.5px] text-[#3D2E6B] outline-none transition-all focus:border-[#7E6BAF] focus:ring-4 focus:ring-[#7E6BAF]/10"
                />
              </div>
              <div>
                <p className="ml-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#7E6BAF]">
                  Length
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[30, 50, 60, 90].map((m) => (
                    <Pill
                      key={m}
                      active={data.primarySession.lengthMin === m}
                      onClick={() =>
                        update("primarySession", { ...data.primarySession, lengthMin: m })
                      }
                    >
                      {m} min
                    </Pill>
                  ))}
                </div>
              </div>
              <div>
                <p className="ml-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#7E6BAF]">
                  Rate
                </p>
                <div className="relative mt-2 max-w-xs">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-[#7E6BAF]">
                    {currency.symbol}
                  </span>
                  <input
                    inputMode="numeric"
                    value={String(data.primarySession.rate || "")}
                    onChange={(e) =>
                      update("primarySession", {
                        ...data.primarySession,
                        rate: Number(e.target.value.replace(/\D/g, "")) || 0,
                      })
                    }
                    className="w-full rounded-2xl border border-[#EEE6F7] bg-[#F0EAFB]/30 py-4 pl-10 pr-16 text-[16px] font-semibold text-[#3D2E6B] outline-none transition-all focus:border-[#7E6BAF] focus:ring-4 focus:ring-[#7E6BAF]/10"
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[11px] font-bold uppercase tracking-widest text-[#7E6BAF]/50">
                    {currency.code}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3 rounded-2xl border border-[#EEE6F7] bg-white/80 p-6">
              <div>
                <p className="text-[16px] font-semibold text-[#3D2E6B]">{data.primarySession.name}</p>
                <p className="mt-1 text-[12.5px] text-[#7E6BAF]">
                  {data.primarySession.lengthMin} min · Video session
                </p>
              </div>
              <p className="text-[18px] font-bold tracking-tight text-[#3D2E6B]">{fmtPrice(data.primarySession.rate)}</p>
            </div>
          )}
        </div>

        {/* Additional sessions */}
        <div className="mt-8 border-t border-[#EEE6F7] pt-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7E6BAF]/60">
              Additional sessions
            </span>
            <div className="h-px flex-1 bg-[#EEE6F7]" />
          </div>
          <div className="space-y-3">
            {data.extraSessions.length === 0 && !showAddSession && (
              <p className="text-[12.5px] italic text-[#A89BD0]">No additional sessions yet.</p>
            )}
            {data.extraSessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-2xl border border-[#EEE6F7] bg-white/80 px-5 py-4"
              >
                <div>
                  <p className="text-[14px] font-semibold text-[#3D2E6B]">{s.name}</p>
                  <p className="mt-0.5 text-[12px] text-[#7E6BAF]">{s.lengthMin} min</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-[15px] font-bold tracking-tight text-[#3D2E6B]">{fmtPrice(s.rate)}</p>
                  {editing.sessions && (
                    <button
                      type="button"
                      onClick={() =>
                        update(
                          "extraSessions",
                          data.extraSessions.filter((x) => x.id !== s.id),
                        )
                      }
                      className="text-[#A89BD0] hover:text-rose-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {editing.sessions && !showAddSession && (
              <button
                type="button"
                onClick={() => setShowAddSession(true)}
                className="group flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#EEE6F7] py-4 text-[13px] font-semibold text-[#7E6BAF] transition-all hover:border-[#7E6BAF]/40 hover:bg-[#F0EAFB]/30"
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#F0EAFB] transition-all group-hover:bg-[#7E6BAF] group-hover:text-white">
                  <Plus className="h-4 w-4" />
                </span>
                Add another session
              </button>
            )}

            {editing.sessions && showAddSession && (
              <div className="space-y-4 rounded-2xl border border-[#EEE6F7] bg-white/80 p-5">
                <input
                  value={newSession.name}
                  onChange={(e) => setNewSession((s) => ({ ...s, name: e.target.value }))}
                  placeholder="Session name (e.g. Quick check-in)"
                  className="w-full rounded-2xl border border-[#EEE6F7] bg-[#F0EAFB]/30 px-5 py-3.5 text-[14px] text-[#3D2E6B] outline-none focus:border-[#7E6BAF] focus:ring-4 focus:ring-[#7E6BAF]/10"
                />
                <div className="flex flex-wrap gap-2">
                  {[30, 50, 60, 90].map((m) => (
                    <Pill
                      key={m}
                      active={newSession.lengthMin === m}
                      onClick={() => setNewSession((s) => ({ ...s, lengthMin: m }))}
                    >
                      {m} min
                    </Pill>
                  ))}
                </div>
                <div className="relative max-w-xs">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-[#7E6BAF]">
                    {currency.symbol}
                  </span>
                  <input
                    inputMode="numeric"
                    value={newSession.rate}
                    onChange={(e) =>
                      setNewSession((s) => ({ ...s, rate: e.target.value.replace(/\D/g, "") }))
                    }
                    placeholder="Rate"
                    className="w-full rounded-2xl border border-[#EEE6F7] bg-[#F0EAFB]/30 py-3.5 pl-10 pr-16 text-[15px] font-semibold text-[#3D2E6B] outline-none focus:border-[#7E6BAF] focus:ring-4 focus:ring-[#7E6BAF]/10"
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[11px] font-bold uppercase tracking-widest text-[#7E6BAF]/50">
                    {currency.code}
                  </span>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddSession(false);
                      setNewSession({ name: "", lengthMin: 50, rate: "" });
                    }}
                    className="rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-[#7E6BAF] hover:bg-[#7E6BAF]/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveNewSession}
                    className="rounded-full bg-[#7E6BAF] px-4 py-1.5 text-[12.5px] font-semibold text-white hover:bg-[#3D2E6B]"
                  >
                    Add session
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Region dev toggle */}
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-dashed border-[#A89BD0]/40 bg-white/40 px-3 py-2 text-[11px] text-[#7E6BAF]">
          <Globe className="h-3.5 w-3.5" /> Dev · Region
          <div className="ml-auto flex gap-1.5">
            {(["US", "PH"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => update("region", r)}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
                  data.region === r
                    ? "bg-[#7E6BAF] text-white"
                    : "bg-white text-[#7E6BAF] hover:bg-[#7E6BAF]/10"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* ---------------------------- Verification ------------------------- */}
      <section className="relative flex flex-col items-start justify-between gap-6 overflow-hidden rounded-[2rem] bg-[#2A2550] p-8 text-white shadow-xl shadow-[#2A2550]/20 sm:flex-row sm:items-center sm:p-10">
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
            <ShieldCheck className="h-8 w-8 text-emerald-400" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xl font-bold tracking-tight">
              {data.verified ? "You're verified" : "Get a verified badge"}
            </h4>
            <p className="max-w-md text-sm leading-relaxed text-white/60">
              {data.verified
                ? "Your credentials have been reviewed by the Lubin team."
                : "Licensed clinicians, coaches, and peer practitioners can submit credentials for priority listing and client trust."}
            </p>
          </div>
        </div>
        {!data.verified && (
          <button
            type="button"
            className="w-full shrink-0 rounded-2xl bg-[#7E6BAF] px-8 py-4 text-sm font-bold text-white shadow-lg shadow-[#7E6BAF]/30 transition hover:bg-[#8d7bc2] sm:w-auto"
          >
            Submit credentials
          </button>
        )}
      </section>
    </div>
  );
}