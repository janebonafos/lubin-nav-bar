import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, MapPin, Star, BadgeCheck, Globe, Send, Sparkles, X, ExternalLink, Navigation, Hash, Building2, User, CalendarDays, Clock } from "lucide-react";
import Navbar from "@/components/Navbar";
import { PROVIDERS, type Provider } from "@/lib/providers";

export const Route = createFileRoute("/find-provider")({
  head: () => ({
    meta: [
      { title: "Find a service provider — Lubin" },
      {
        name: "description",
        content:
          "Search verified psychologists, counsellors, and therapists across the Philippines. Filter by specialty, location, and price.",
      },
      { property: "og:title", content: "Find a service provider — Lubin" },
      {
        property: "og:description",
        content:
          "Search verified mental health professionals — filter by specialty, location, and price.",
      },
    ],
  }),
  component: FindProviderPage,
});

const PRACTICE_AREAS = ["Psychologist", "Counselling", "Therapist"] as const;

const PRICE_RANGES = [
  { label: "Up to PHP 1,480", min: 0, max: 1480 },
  { label: "PHP 1,542–3,083", min: 1542, max: 3083 },
  { label: "PHP 3,145–6,104", min: 3145, max: 6104 },
  { label: "PHP 6,166+", min: 6166, max: Infinity },
];

type ExternalProvider = {
  id: string;
  name: string;
  title: string;
  snippet: string;
  location: string;
  source: string; // e.g. "psychologytoday.com"
  url: string;
  initials: string;
};

const EXTERNAL_PROVIDERS: ExternalProvider[] = [
  {
    id: "e1",
    name: "Dr. Rosa Mendoza",
    title: "Clinical Psychologist",
    snippet:
      "Private practice focused on anxiety, depression, and women's mental health. Accepts in-person and online consults.",
    location: "Alabang, Muntinlupa",
    source: "psychologytoday.com",
    url: "https://www.psychologytoday.com/",
    initials: "RM",
  },
  {
    id: "e2",
    name: "Karlo Villanueva, RPsy",
    title: "Counselling Psychologist",
    snippet:
      "Helping adults navigate burnout, identity, and relationship concerns through integrative therapy.",
    location: "Iloilo City",
    source: "linkedin.com",
    url: "https://www.linkedin.com/",
    initials: "KV",
  },
  {
    id: "e3",
    name: "Hope & Healing Center",
    title: "Group practice · Therapists & Counsellors",
    snippet:
      "Multi-disciplinary clinic offering psychotherapy, child & family counselling, and psychiatric services.",
    location: "Baguio City",
    source: "google.com",
    url: "https://www.google.com/",
    initials: "HH",
  },
];

function FindProviderPage() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [practices, setPractices] = useState<string[]>([]);
  const [priceIdx, setPriceIdx] = useState<number[]>([]);
  const [invitee, setInvitee] = useState<ExternalProvider | null>(null);

  // Smart location input: detect ZIP (PH: 4 digits, US-style: 5 digits) vs city name
  const locTrimmed = location.trim();
  const isZip = /^\d{4,5}$/.test(locTrimmed);
  const isCity = locTrimmed.length >= 2 && !isZip;
  const locKind: "zip" | "city" | null = isZip ? "zip" : isCity ? "city" : null;

  const POPULAR_CITIES = ["Makati", "Quezon City", "BGC", "Cebu", "Davao"];

  const handleUseMyLocation = () => {
    // Placeholder — wire to geolocation API later. For now nudge with a city.
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => setLocation("Near me"),
        () => setLocation("Metro Manila"),
      );
    } else {
      setLocation("Metro Manila");
    }
  };

  const toggle = <T,>(arr: T[], v: T) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const loc = location.trim().toLowerCase();
    return PROVIDERS.filter((p) => {
      if (q) {
        const hay = `${p.name} ${p.title} ${p.practice} ${p.tags.join(" ")} ${p.bio}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (loc && !p.location.toLowerCase().includes(loc)) return false;
      if (practices.length && !practices.includes(p.practice)) return false;
      if (priceIdx.length) {
        const inRange = priceIdx.some((i) => {
          const r = PRICE_RANGES[i];
          return p.price >= r.min && p.price <= r.max;
        });
        if (!inRange) return false;
      }
      return true;
    });
  }, [query, location, practices, priceIdx]);

  const externalResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    const loc = location.trim().toLowerCase();
    return EXTERNAL_PROVIDERS.filter((p) => {
      if (q) {
        const hay = `${p.name} ${p.title} ${p.snippet}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (loc && !p.location.toLowerCase().includes(loc)) return false;
      return true;
    });
  }, [query, location]);

  return (
    <div
      className="min-h-screen bg-[#F9F8FF]"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <Navbar />

      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-28 sm:pt-32">
        {/* Heading */}
        <header className="mb-6 max-w-3xl">
          <h1 className="text-[28px] sm:text-[36px] font-bold leading-tight tracking-tight text-slate-900">
            Find a service provider
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-500">
            Browse verified psychologists, counsellors, and therapists. Filter by
            what matters most to you.
          </p>
        </header>

        {/* Search bar */}
        <section
          aria-label="Search"
          className="rounded-2xl border border-[#E9E6FA] bg-white p-3 shadow-[0_10px_30px_-18px_rgba(124,113,176,0.18)]"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A799E2]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, specialty, or keyword"
                className="w-full rounded-xl border border-transparent bg-[#F3F0FF]/60 px-11 py-3 text-[14px] text-slate-700 placeholder:text-slate-400 transition-all focus:border-brand-purple/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/15"
              />
            </div>
            <div className="relative md:w-[300px]">
              <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A799E2]" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                inputMode="text"
                aria-label="Location — city or ZIP"
                placeholder="City or ZIP code"
                className="w-full rounded-xl border border-transparent bg-[#F3F0FF]/60 px-11 py-3 pr-24 text-[14px] text-slate-700 placeholder:text-slate-400 transition-all focus:border-brand-purple/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/15"
              />
              {/* Smart kind badge */}
              {locKind && (
                <span
                  className="pointer-events-none absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10.5px] font-semibold text-brand-purple ring-1 ring-[#E9E6FA]"
                  aria-label={locKind === "zip" ? "Detected ZIP code" : "Detected city"}
                >
                  {locKind === "zip" ? (
                    <Hash className="h-3 w-3" />
                  ) : (
                    <Building2 className="h-3 w-3" />
                  )}
                  {locKind === "zip" ? "ZIP" : "City"}
                </span>
              )}
            </div>
            <button
              type="button"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-xl bg-brand-purple px-8 py-3 text-[14px] font-semibold text-white shadow-sm transition-all hover:bg-brand-purple-dark active:scale-95"
            >
              Search
            </button>
          </div>
        </section>

        {/* Body */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
          {/* Filters */}
          <aside className="h-fit rounded-2xl border border-[#E9E6FA] bg-white p-6 shadow-sm lg:sticky lg:top-28">
            <h2 className="text-[18px] font-bold text-slate-800">
              Quick Filters
            </h2>

            <div className="mt-5">
              <h3 className="text-[12px] font-bold uppercase tracking-wider text-[#A799E2]">
                Practice Areas
              </h3>
              <ul className="mt-3 space-y-2.5">
                {PRACTICE_AREAS.map((p) => (
                  <li key={p}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg px-1 py-1 text-[14px] text-slate-600 transition-colors hover:text-brand-purple">
                      <input
                        type="checkbox"
                        checked={practices.includes(p)}
                        onChange={() => setPractices((arr) => toggle(arr, p))}
                        className="h-[18px] w-[18px] cursor-pointer rounded border-[#DCD7F5] accent-brand-purple"
                      />
                      {p}
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6">
              <h3 className="text-[12px] font-bold uppercase tracking-wider text-[#A799E2]">
                Price Range
              </h3>
              <ul className="mt-3 space-y-2.5">
                {PRICE_RANGES.map((r, i) => (
                  <li key={r.label}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg px-1 py-1 text-[14px] text-slate-600 transition-colors hover:text-brand-purple">
                      <input
                        type="checkbox"
                        checked={priceIdx.includes(i)}
                        onChange={() => setPriceIdx((arr) => toggle(arr, i))}
                        className="h-[18px] w-[18px] cursor-pointer rounded border-[#DCD7F5] accent-brand-purple"
                      />
                      {r.label}
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            {(practices.length > 0 || priceIdx.length > 0) && (
              <button
                type="button"
                onClick={() => {
                  setPractices([]);
                  setPriceIdx([]);
                }}
                className="mt-6 text-[13px] font-semibold text-brand-purple no-underline hover:text-brand-purple-dark"
              >
                Clear all filters
              </button>
            )}
          </aside>

          {/* Results */}
          <section aria-label="Results">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[13.5px] text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-800">
                  {filtered.length}
                </span>{" "}
                provider{filtered.length === 1 ? "" : "s"}
              </p>
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center rounded-2xl border border-[#E9E6FA] bg-white p-10 text-center shadow-sm">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-purple/8 text-brand-purple">
                  <Search className="h-6 w-6" strokeWidth={2} />
                </div>
                <p className="mt-4 text-[15px] font-semibold text-slate-800">
                  No providers match your search
                </p>
                <p className="mt-1 max-w-[320px] text-[13.5px] leading-relaxed text-slate-500">
                  Try adjusting your filters, clearing your search, or broadening your location.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setLocation("");
                    setPractices([]);
                    setPriceIdx([]);
                  }}
                  className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-brand-purple px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-brand-purple-dark"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {filtered.map((p) => (
                  <ProviderCard key={p.id} provider={p} />
                ))}
              </div>
            )}

            {/* External (web) results — providers not yet on Lubin */}
            {externalResults.length > 0 && (
              <div className="mt-12 border-t border-dashed border-slate-200 pt-8">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-slate-400" />
                      <h2 className="text-[15px] font-semibold text-slate-600">
                        From around the web
                      </h2>
                    </div>
                    <p className="mt-1 text-[13px] text-slate-500">
                      These providers are <span className="font-semibold text-slate-700">not on Lubin</span> and cannot be booked here. They are unverified listings shown for reference only.
                    </p>
                  </div>
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 ring-1 ring-inset ring-slate-200">
                    <Globe className="h-3 w-3" />
                    External
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {externalResults.map((p) => (
                    <ExternalProviderCard
                      key={p.id}
                      provider={p}
                      onInvite={() => setInvitee(p)}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {invitee && (
        <InviteModal
          provider={invitee}
          onClose={() => setInvitee(null)}
        />
      )}
    </div>
  );
}

function ProviderCard({ provider }: { provider: Provider }) {
  // placeholder to keep file shape; component defined below
  return <ProviderCardInner provider={provider} />;
}

const DAY_MAP: Record<string, string> = {
  M: "Mon", T: "Tue", W: "Wed", Th: "Thu", F: "Fri", S: "Sat", Su: "Sun",
};
const DAY_ORDER = ["M", "T", "W", "Th", "F", "S", "Su"] as const;
type DayCode = (typeof DAY_ORDER)[number];

function formatDays(days: readonly DayCode[]): string {
  if (!days.length) return "By appointment";
  const sorted = days.slice().sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  const groups: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    const curr = sorted[i];
    if (curr && DAY_ORDER.indexOf(curr) === DAY_ORDER.indexOf(prev) + 1) {
      prev = curr;
    } else {
      if (start === prev) {
        groups.push(DAY_MAP[start]);
      } else {
        groups.push(`${DAY_MAP[start]}–${DAY_MAP[prev]}`);
      }
      start = prev = curr;
    }
  }
  return groups.join(", ");
}

function AvailabilityStrip({
  days,
  modes,
  hours,
}: {
  days: readonly DayCode[];
  modes: ("Online" | "In-person")[];
  hours: string;
}) {
  return (
    <div className="mt-4 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          <CalendarDays className="h-3 w-3" />
          Schedule
        </span>
        <span className="text-[13px] font-medium text-slate-700">
          {formatDays(days)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          <Clock className="h-3 w-3" />
          Hours
        </span>
        <span className="text-[13px] font-medium text-slate-700">{hours}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {modes.map((m) => (
          <span
            key={m}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#F6F3FF] px-2.5 py-1 text-[11px] font-medium text-brand-purple ring-1 ring-inset ring-[#E9E6FA]"
          >
            <span
              aria-hidden
              className={
                "h-1.5 w-1.5 rounded-full " +
                (m === "Online" ? "bg-brand-purple" : "bg-brand-purple/40")
              }
            />
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}

function ProviderCardInner({ provider }: { provider: Provider }) {
  const MAX_TAGS = 3;
  const visibleTags = provider.tags.slice(0, MAX_TAGS);
  const extraTags = provider.tags.length - visibleTags.length;
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#E9E6FA] bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-purple/30 hover:shadow-[0_22px_48px_-20px_rgba(124,113,176,0.4)]">
      {/* Decorative top accent */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-purple via-brand-purple-accent to-brand-purple opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />

      {/* Header: avatar + identity */}
      <div className="flex items-start gap-4">
        <div className="relative flex-none">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-purple to-brand-purple-dark text-[16px] font-bold text-white shadow-[0_8px_20px_-8px_rgba(124,113,176,0.6)]">
            {provider.initials}
          </div>
          {provider.verified && (
            <span
              aria-label="Certified"
              className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-[#E9E6FA]"
            >
              <BadgeCheck className="h-3.5 w-3.5 text-brand-purple-accent" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="truncate text-[16px] font-bold leading-tight text-slate-900">
            {provider.name}
          </h3>
          <p className="mt-1 truncate text-[13px] text-slate-500">
            {provider.title}
          </p>
        </div>
      </div>

      {/* Meta row: location + rating */}
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px]">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-slate-500">
          <MapPin className="h-3.5 w-3.5 flex-none text-[#A799E2]" />
          <span className="truncate">{provider.location}</span>
        </span>
        <span aria-hidden className="h-1 w-1 rounded-full bg-slate-300" />
        <span className="inline-flex items-center gap-1">
          <Star className="h-3.5 w-3.5 flex-none fill-brand-purple-accent text-brand-purple-accent" />
          <span className="font-semibold text-slate-800">{provider.rating}</span>
          <span className="text-slate-400">({provider.reviews})</span>
        </span>
      </div>

      {/* Bio */}
      <p className="mt-4 line-clamp-2 text-[13.5px] leading-relaxed text-slate-600">
        {provider.bio}
      </p>

      {/* Tags — capped to reduce clutter */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-[#F3F0FF] px-2.5 py-1 text-[11.5px] font-semibold text-brand-purple ring-1 ring-inset ring-brand-purple/10">
          {provider.practice}
        </span>
        {visibleTags.map((t) => (
          <span
            key={t}
            className="rounded-full bg-slate-50 px-2.5 py-1 text-[11.5px] text-slate-600 ring-1 ring-inset ring-slate-200/70"
          >
            {t}
          </span>
        ))}
        {extraTags > 0 && (
          <span className="self-center px-1 text-[11.5px] font-medium text-slate-400">
            +{extraTags}
          </span>
        )}
      </div>

      {/* Availability glimpse */}
      <AvailabilityStrip
        days={provider.availableDays}
        modes={provider.sessionModes}
        hours={provider.availableHours}
      />

      <div className="mt-auto grid grid-cols-[1fr_auto] items-center gap-3 pt-5">
        <div className="flex h-full flex-col justify-center gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Starting at
          </span>
          <p className="whitespace-nowrap text-[17px] font-bold leading-none text-slate-900">
            ₱{provider.price.toLocaleString()}
            <span className="ml-1 text-[12px] font-normal text-slate-400">
              /session
            </span>
          </p>
        </div>
        <Link
          to="/provider/$id"
          params={{ id: provider.id }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-purple to-brand-purple-dark px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_18px_-8px_rgba(124,113,176,0.6)] transition-all hover:-translate-y-1 hover:shadow-[0_16px_32px_-8px_rgba(124,113,176,0.85)] hover:ring-2 hover:ring-white/40 active:scale-95"
        >
          <User className="h-3.5 w-3.5" />
          View profile
        </Link>
      </div>
    </article>
  );
}

function ExternalProviderCard({
  provider,
  onInvite,
}: {
  provider: ExternalProvider;
  onInvite: () => void;
}) {
  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-6 transition-all duration-300 hover:border-slate-400 hover:bg-slate-50">
      <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 ring-1 ring-inset ring-slate-200">
        Not bookable
      </div>
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl border border-slate-200 bg-white text-[15px] font-bold text-slate-500">
          {provider.initials}
        </div>
        <div className="min-w-0 flex-1 pr-20">
          <h3 className="truncate text-[15px] font-semibold leading-tight text-slate-700">
            {provider.name}
          </h3>
          <p className="mt-0.5 truncate text-[13px] text-slate-500">
            {provider.title}
          </p>
          <div className="mt-1.5 flex items-center gap-3 text-[12px] text-slate-500">
            <span className="inline-flex min-w-0 items-center gap-1 truncate">
              <MapPin className="h-3 w-3 flex-none text-slate-400" />
              <span className="truncate">{provider.location}</span>
            </span>
          </div>
        </div>
      </div>

      <p className="mt-4 line-clamp-2 text-[13px] leading-relaxed text-slate-600">
        {provider.snippet}
      </p>

      <div className="mt-3 flex items-center gap-2 text-[12px] text-slate-500">
        <span>Source:</span>
        <a
          href={provider.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-slate-900 hover:underline"
        >
          {provider.source}
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="mt-auto flex items-center justify-end pt-4">
        <button
          type="button"
          onClick={onInvite}
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-500 underline-offset-2 transition hover:text-brand-purple hover:underline"
        >
          <Send className="h-3 w-3" />
          Invite to Lubin
        </button>
      </div>
    </article>
  );
}

function InviteModal({
  provider,
  onClose,
}: {
  provider: ExternalProvider;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(
    `Hi ${provider.name.split(" ")[0]}, we'd love to invite you to join Lubin — a platform helping Filipinos find verified mental health providers.`,
  );
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-[18px] font-bold text-slate-900">
              {sent ? "Invitation sent" : "Invite to Lubin"}
            </h3>
            <p className="mt-1 text-[13px] text-slate-500">
              {sent
                ? `We'll let you know when ${provider.name} joins.`
                : `Send ${provider.name} an invitation to claim their profile on Lubin.`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {sent ? (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-brand-purple px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-purple-dark"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="text-[12px] font-semibold uppercase tracking-wider text-[#A799E2]">
                Provider email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="provider@example.com"
                className="mt-2 w-full rounded-xl border border-[#E9E6FA] bg-white px-4 py-3 text-[14px] text-slate-700 placeholder:text-slate-400 focus:border-brand-purple/40 focus:outline-none focus:ring-2 focus:ring-brand-purple/15"
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold uppercase tracking-wider text-[#A799E2]">
                Personal note
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="mt-2 w-full resize-none rounded-xl border border-[#E9E6FA] bg-white px-4 py-3 text-[14px] text-slate-700 placeholder:text-slate-400 focus:border-brand-purple/40 focus:outline-none focus:ring-2 focus:ring-brand-purple/15"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-purple px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-purple-dark active:scale-95"
              >
                <Send className="h-3.5 w-3.5" />
                Send invitation
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
