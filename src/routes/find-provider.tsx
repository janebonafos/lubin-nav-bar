import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, MapPin, Star, BadgeCheck, Calendar } from "lucide-react";
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

function FindProviderPage() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [practices, setPractices] = useState<string[]>([]);
  const [priceIdx, setPriceIdx] = useState<number[]>([]);

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
            <div className="relative md:w-[280px]">
              <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A799E2]" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter location"
                className="w-full rounded-xl border border-transparent bg-[#F3F0FF]/60 px-11 py-3 text-[14px] text-slate-700 placeholder:text-slate-400 transition-all focus:border-brand-purple/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/15"
              />
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
          </section>
        </div>
      </main>
    </div>
  );
}

function ProviderCard({ provider }: { provider: Provider }) {
  return (
    <article className="group flex h-full flex-col rounded-2xl border border-[#E9E6FA] bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-18px_rgba(124,113,176,0.35)]">
      {/* Top row: avatar + name/verified + price */}
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-brand-purple text-[18px] font-bold text-white shadow-inner">
          {provider.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h3 className="truncate text-[17px] font-bold leading-tight text-slate-800">
                {provider.name}
              </h3>
              {provider.verified && (
                <span
                  title="Certified"
                  aria-label="Certified"
                  className="inline-flex items-center justify-center text-brand-purple-accent"
                >
                  <BadgeCheck className="h-4 w-4" />
                </span>
              )}
            </div>
            <div className="flex flex-none flex-col items-end">
              <p className="whitespace-nowrap text-[15px] font-bold leading-none text-slate-800">
                PHP {provider.price.toLocaleString()}
                <span className="ml-0.5 text-[12px] font-normal text-slate-400">
                  /session
                </span>
              </p>
              <div className="mt-1.5 flex items-center gap-1 text-[12px] text-slate-500">
                <Star className="h-3 w-3 fill-brand-purple-accent text-brand-purple-accent" />
                <span className="font-semibold text-slate-700">
                  {provider.rating}
                </span>
                <span className="text-slate-400">
                  ({provider.reviews})
                </span>
              </div>
            </div>
          </div>
          <p className="mt-1.5 text-[14px] font-medium leading-snug text-brand-purple">
            {provider.title}
          </p>
        </div>
      </div>

      {/* Bio */}
      <p className="mt-4 text-[13.5px] leading-relaxed text-slate-600">
        {provider.bio}
      </p>

      {/* Tags */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        <span className="rounded-lg bg-[#F3F0FF] px-3 py-1 text-[12px] font-semibold text-brand-purple">
          {provider.practice}
        </span>
        {provider.tags.map((t) => (
          <span
            key={t}
            className="rounded-lg bg-slate-100 px-3 py-1 text-[12px] text-slate-600"
          >
            {t}
          </span>
        ))}
      </div>

      {/* Location */}
      <div className="mt-5 mb-4 flex items-center gap-1.5 text-[12.5px] text-slate-400">
        <MapPin className="h-3.5 w-3.5 text-[#A799E2]" />
        {provider.location}
      </div>

      {/* Full-width CTA */}
      <button
        type="button"
        className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-purple px-4 py-3 text-[14px] font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-purple-dark hover:shadow-[0_12px_24px_-8px_rgba(124,113,176,0.5)] active:translate-y-0"
      >
        <Calendar className="h-4 w-4" />
        Book session
      </button>
    </article>
  );
}