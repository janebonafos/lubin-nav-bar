import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, MapPin, Star, BadgeCheck, Calendar, Globe, Send, Sparkles, X, ExternalLink, Navigation, Hash, Building2 } from "lucide-react";
import Navbar from "@/components/Navbar";

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

type Provider = {
  id: string;
  name: string;
  title: string;
  practice: "Psychologist" | "Counselling" | "Therapist";
  tags: string[];
  bio: string;
  location: string;
  rating: number;
  reviews: number;
  price: number;
  initials: string;
  verified?: boolean;
};

const PROVIDERS: Provider[] = [
  {
    id: "1",
    name: "Dr. Maria Santos",
    title: "Clinical Psychologist, PhD",
    practice: "Psychologist",
    tags: ["Anxiety", "Depression", "CBT", "Trauma"],
    bio: "Compassionate, evidence-based care for adults navigating anxiety, grief, and life transitions. Sessions in English & Filipino.",
    location: "Makati City, Metro Manila",
    rating: 4.9,
    reviews: 128,
    price: 2500,
    initials: "MS",
    verified: true,
  },
  {
    id: "2",
    name: "Joshua Reyes, RPsy",
    title: "Licensed Counsellor",
    practice: "Counselling",
    tags: ["Couples", "Relationships", "LGBTQ+", "Stress"],
    bio: "Warm, non-judgmental space for couples and individuals working through relationships and self-identity.",
    location: "Quezon City, Metro Manila",
    rating: 4.8,
    reviews: 92,
    price: 1800,
    initials: "JR",
    verified: true,
  },
  {
    id: "3",
    name: "Anna Lim, MA",
    title: "Psychotherapist",
    practice: "Therapist",
    tags: ["Burnout", "Mindfulness", "ACT", "Young adults"],
    bio: "Helping young professionals build resilience and reconnect with what matters through mindfulness-based therapy.",
    location: "BGC, Taguig",
    rating: 4.9,
    reviews: 74,
    price: 3200,
    initials: "AL",
  },
  {
    id: "4",
    name: "Dr. Paolo Cruz",
    title: "Clinical Psychologist",
    practice: "Psychologist",
    tags: ["OCD", "Anxiety", "Teens", "Family"],
    bio: "Specialized in OCD and anxiety disorders for teens and adults. Tele-sessions available nationwide.",
    location: "Cebu City",
    rating: 4.7,
    reviews: 58,
    price: 2800,
    initials: "PC",
    verified: true,
  },
  {
    id: "5",
    name: "Bea Gonzales, RGC",
    title: "Guidance Counsellor",
    practice: "Counselling",
    tags: ["Students", "Career", "Anxiety"],
    bio: "Supportive counselling for students and early-career professionals navigating overwhelm and direction.",
    location: "Pasig City",
    rating: 4.6,
    reviews: 41,
    price: 1400,
    initials: "BG",
  },
  {
    id: "6",
    name: "Miguel Tan, LPT",
    title: "Somatic Therapist",
    practice: "Therapist",
    tags: ["Trauma", "Somatic", "PTSD", "Grief"],
    bio: "Body-centered therapy for trauma recovery and emotional regulation. In-person and online sessions.",
    location: "Davao City",
    rating: 4.9,
    reviews: 63,
    price: 6500,
    initials: "MT",
    verified: true,
  },
];

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
              <div className="rounded-2xl border border-[#E9E6FA] bg-white p-10 text-center shadow-sm">
                <p className="text-[15px] font-medium text-slate-700">
                  No providers match your filters.
                </p>
                <p className="mt-1 text-[13.5px] text-slate-500">
                  Try clearing some filters or adjusting your search.
                </p>
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
              <div className="mt-10">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-brand-purple" />
                      <h2 className="text-[16px] font-bold text-slate-800">
                        More providers from the web
                      </h2>
                    </div>
                    <p className="mt-1 text-[13px] text-slate-500">
                      Not on Lubin yet — invite them to join so you can book a session.
                    </p>
                  </div>
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-[#F3F0FF] px-2.5 py-1 text-[11px] font-semibold text-brand-purple">
                    <Sparkles className="h-3 w-3" />
                    Web results
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
  const MAX_TAGS = 2;
  const visibleTags = provider.tags.slice(0, MAX_TAGS);
  const extraTags = provider.tags.length - visibleTags.length;
  return (
    <article className="group flex h-full flex-col rounded-2xl border border-[#E9E6FA] bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-purple/30 hover:shadow-[0_18px_40px_-18px_rgba(124,113,176,0.25)]">
      {/* Identity */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-brand-purple text-[13px] font-bold text-white">
          {provider.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <h3 className="truncate text-[15px] font-semibold leading-tight text-slate-900">
              {provider.name}
            </h3>
            {provider.verified && (
              <BadgeCheck
                aria-label="Certified"
                className="h-4 w-4 flex-none text-brand-purple-accent"
              />
            )}
          </div>
          <p className="mt-0.5 truncate text-[12.5px] text-slate-500">
            {provider.title}
          </p>
        </div>
      </div>

      {/* Bio */}
      <p className="mt-4 line-clamp-2 text-[13.5px] leading-relaxed text-slate-600">
        {provider.bio}
      </p>

      {/* Meta + tags — single subtle row */}
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[12px] text-slate-400">
        <span className="inline-flex items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-brand-purple-accent text-brand-purple-accent" />
          <span className="font-semibold text-slate-700">{provider.rating}</span>
          <span>({provider.reviews})</span>
        </span>
        <span aria-hidden className="h-1 w-1 rounded-full bg-slate-200" />
        <span className="inline-flex min-w-0 items-center gap-1 truncate">
          <MapPin className="h-3.5 w-3.5" />
          <span className="truncate">{provider.location}</span>
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded-md bg-[#F3F0FF] px-2 py-0.5 text-[11px] font-semibold text-brand-purple">
          {provider.practice}
        </span>
        {visibleTags.map((t) => (
          <span
            key={t}
            className="rounded-md px-2 py-0.5 text-[11px] text-slate-500"
          >
            {t}
          </span>
        ))}
        {extraTags > 0 && (
          <span className="px-1 py-0.5 text-[11px] text-slate-400">
            +{extraTags}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        <p className="whitespace-nowrap text-[14px] font-semibold leading-none text-slate-900">
          PHP {provider.price.toLocaleString()}
          <span className="ml-1 text-[11.5px] font-normal text-slate-400">
            /session
          </span>
        </p>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-purple px-4 py-2 text-[12.5px] font-semibold text-white transition-all hover:bg-brand-purple-dark active:scale-95"
        >
          <Calendar className="h-3.5 w-3.5" />
          Book
        </button>
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
    <article className="group relative flex h-full flex-col rounded-2xl border border-dashed border-[#D9D2F2] bg-white/70 p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-purple/40 hover:shadow-[0_18px_40px_-18px_rgba(124,113,176,0.25)]">
      <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-[#F3F0FF] px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-brand-purple">
        <Globe className="h-2.5 w-2.5" />
        Not on Lubin
      </div>

      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl border border-[#E9E6FA] bg-[#F3F0FF] text-[15px] font-bold text-brand-purple">
          {provider.initials}
        </div>
        <div className="min-w-0 flex-1 pr-20">
          <h3 className="truncate text-[16px] font-bold leading-tight text-slate-900">
            {provider.name}
          </h3>
          <p className="mt-0.5 truncate text-[13px] text-slate-500">
            {provider.title}
          </p>
          <div className="mt-1.5 flex items-center gap-3 text-[12px] text-slate-500">
            <span className="inline-flex min-w-0 items-center gap-1 truncate">
              <MapPin className="h-3 w-3 flex-none text-[#A799E2]" />
              <span className="truncate">{provider.location}</span>
            </span>
          </div>
        </div>
      </div>

      <p className="mt-4 line-clamp-2 text-[13.5px] leading-relaxed text-slate-600">
        {provider.snippet}
      </p>

      <div className="mt-3 flex items-center gap-2 text-[12px] text-slate-500">
        <span>Source:</span>
        <a
          href={provider.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-brand-purple hover:text-brand-purple-dark hover:underline"
        >
          {provider.source}
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-dashed border-[#E9E6FA] pt-4">
        <p className="text-[12px] text-slate-500">
          Help them join Lubin
        </p>
        <button
          type="button"
          onClick={onInvite}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-brand-purple bg-white px-4 py-2.5 text-[13px] font-semibold text-brand-purple transition-all hover:bg-brand-purple hover:text-white active:scale-95"
        >
          <Send className="h-3.5 w-3.5" />
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