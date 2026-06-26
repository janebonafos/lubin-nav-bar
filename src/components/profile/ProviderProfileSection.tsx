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
    <section className="rounded-2xl border border-[#E3DBF5]/60 bg-[#FBF9FF]/90 p-6 shadow-md shadow-[#3D2E6B]/5 backdrop-blur-xl sm:p-8">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#3D2E6B]">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-[13px] text-[#7E6BAF]">{subtitle}</p>
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
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#7E6BAF] transition hover:text-[#3D2E6B]"
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
}: {
  fullName: string;
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
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#7E6BAF] via-[#9385C2] to-[#A89BD0] p-6 text-white shadow-lg shadow-[#3D2E6B]/15 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -top-20 -right-10 h-56 w-56 rounded-full bg-white/20 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] backdrop-blur-sm">
            <ShieldCheck className="h-3 w-3" /> Provider Profile
          </div>
          <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
            {fullName || "Your provider profile"}
          </h2>
          <p className="mt-1 text-[14px] font-medium text-white/85">{data.profession}</p>
          <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-white/90">
            {data.headline}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11.5px] font-medium backdrop-blur-sm">
              <CalendarIcon className="h-3 w-3" />
              {data.calendarConnected ? "Calendar connected" : "Calendar not connected"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11.5px] font-medium backdrop-blur-sm">
              <Clock className="h-3 w-3" /> {data.yearsBand}
            </span>
            {!data.verified && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-300/95 px-3 py-1 text-[11.5px] font-semibold text-amber-900">
                <ShieldCheck className="h-3 w-3" /> Verification pending
              </span>
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
        <div className="rounded-2xl border border-[#E3DBF5]/60 bg-white/70 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7E6BAF]/15">
                <CalendarIcon className="h-5 w-5 text-[#7E6BAF]" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#3D2E6B]">Google Calendar</p>
                <p className="text-[12.5px] text-[#7E6BAF]">
                  {data.calendarConnected ? data.calendarEmail : "Not connected"}
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
        <div className="rounded-2xl border border-[#E3DBF5]/60 bg-white/70 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#7E6BAF]">
            Primary session
          </p>
          {editing.sessions ? (
            <div className="mt-3 space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A89BD0]">
                  Session name
                </p>
                <input
                  value={data.primarySession.name}
                  onChange={(e) =>
                    update("primarySession", { ...data.primarySession, name: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-[#EEE9F8] bg-white px-4 py-2.5 text-[14px] text-[#3D2E6B] outline-none focus:border-[#7E6BAF] focus:ring-4 focus:ring-[#7E6BAF]/10"
                />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A89BD0]">
                  Length
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
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
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A89BD0]">
                  Rate
                </p>
                <div className="relative mt-1 max-w-xs">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px] font-semibold text-[#7E6BAF]">
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
                    className="w-full rounded-xl border border-[#EEE9F8] bg-white px-4 py-2.5 pl-8 pr-16 text-[14px] text-[#3D2E6B] outline-none focus:border-[#7E6BAF] focus:ring-4 focus:ring-[#7E6BAF]/10"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-[#A89BD0]">
                    {currency.code}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-[15px] font-semibold text-[#3D2E6B]">{data.primarySession.name}</p>
                <p className="mt-0.5 text-[12.5px] text-[#7E6BAF]">
                  {data.primarySession.lengthMin} min · Video session
                </p>
              </div>
              <p className="text-[15px] font-bold text-[#3D2E6B]">{fmtPrice(data.primarySession.rate)}</p>
            </div>
          )}
        </div>

        {/* Additional sessions */}
        <div className="mt-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#7E6BAF]">
            Additional sessions
          </p>
          <div className="mt-3 space-y-3">
            {data.extraSessions.length === 0 && !showAddSession && (
              <p className="text-[13px] italic text-[#A89BD0]">No additional sessions yet.</p>
            )}
            {data.extraSessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-[#E3DBF5]/70 bg-white/80 px-4 py-3"
              >
                <div>
                  <p className="text-[14px] font-semibold text-[#3D2E6B]">{s.name}</p>
                  <p className="text-[12px] text-[#7E6BAF]">{s.lengthMin} min</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-[14px] font-bold text-[#3D2E6B]">{fmtPrice(s.rate)}</p>
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
                className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[#7E6BAF]/40 px-4 py-2 text-[12.5px] font-semibold text-[#7E6BAF] hover:border-[#7E6BAF] hover:bg-[#7E6BAF]/5"
              >
                <Plus className="h-3.5 w-3.5" /> Add another session
              </button>
            )}

            {editing.sessions && showAddSession && (
              <div className="space-y-3 rounded-2xl border border-[#E3DBF5]/60 bg-white/80 p-4">
                <input
                  value={newSession.name}
                  onChange={(e) => setNewSession((s) => ({ ...s, name: e.target.value }))}
                  placeholder="Session name (e.g. Quick check-in)"
                  className="w-full rounded-xl border border-[#EEE9F8] bg-white px-4 py-2.5 text-[14px] text-[#3D2E6B] outline-none focus:border-[#7E6BAF] focus:ring-4 focus:ring-[#7E6BAF]/10"
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
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px] font-semibold text-[#7E6BAF]">
                    {currency.symbol}
                  </span>
                  <input
                    inputMode="numeric"
                    value={newSession.rate}
                    onChange={(e) =>
                      setNewSession((s) => ({ ...s, rate: e.target.value.replace(/\D/g, "") }))
                    }
                    placeholder="Rate"
                    className="w-full rounded-xl border border-[#EEE9F8] bg-white px-4 py-2.5 pl-8 pr-16 text-[14px] text-[#3D2E6B] outline-none focus:border-[#7E6BAF] focus:ring-4 focus:ring-[#7E6BAF]/10"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-[#A89BD0]">
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
      <SectionCard
        title="Verification"
        subtitle="Optional badge that builds trust with clients."
      >
        <div className="flex items-start gap-3 rounded-2xl border border-[#E3DBF5]/60 bg-white/70 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-[#3D2E6B]">
              {data.verified ? "You're verified" : "Get a verified badge"}
            </p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#7E6BAF]">
              {data.verified
                ? "Your credentials have been reviewed by the Lubin team."
                : "Licensed clinicians, coaches, and peer practitioners can submit credentials by email. We'll review and update your badge — usually within a few days."}
            </p>
          </div>
          {!data.verified && (
            <button
              type="button"
              className="shrink-0 rounded-full bg-[#7E6BAF]/10 px-4 py-1.5 text-[12.5px] font-semibold text-[#7E6BAF] hover:bg-[#7E6BAF]/20"
            >
              Submit credentials
            </button>
          )}
        </div>
      </SectionCard>
    </div>
  );
}