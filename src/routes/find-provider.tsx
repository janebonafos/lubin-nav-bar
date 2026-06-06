import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, MapPin, Star, CheckCircle2, Calendar } from "lucide-react";
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
      className="min-h-screen bg-gradient-to-b from-[#F5F3FF] via-[#EFEAFE] to-[#F5F3FF]"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <Navbar />

      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-28 sm:pt-32">
        {/* Heading */}
        <header className="mb-6 max-w-3xl">
          <h1 className="text-[28px] sm:text-[36px] font-bold leading-tight tracking-tight text-brand-purple-dark">
            Find a service provider
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-brand-purple-dark/70">
            Browse verified psychologists, counsellors, and therapists. Filter by
            what matters most to you.
          </p>
        </header>

        {/* Search bar */}
        <section
          aria-label="Search"
          className="rounded-2xl border border-white/60 bg-white/70 p-3 shadow-[0_10px_30px_-18px_rgba(126,107,175,0.25)] backdrop-blur-xl sm:p-4"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-purple/70" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, specialty, or keyword"
                className="w-full rounded-xl border border-brand-purple/15 bg-white px-11 py-3 text-[14px] text-brand-purple-dark placeholder:text-brand-purple-dark/40 focus:border-brand-purple/40 focus:outline-none focus:ring-2 focus:ring-brand-purple/20"
              />
            </div>
            <div className="relative md:w-[280px]">
              <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-purple/70" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter location"
                className="w-full rounded-xl border border-brand-purple/15 bg-white px-11 py-3 text-[14px] text-brand-purple-dark placeholder:text-brand-purple-dark/40 focus:border-brand-purple/40 focus:outline-none focus:ring-2 focus:ring-brand-purple/20"
              />
            </div>
            <button
              type="button"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-xl bg-gradient-to-r from-brand-purple to-brand-purple-dark px-6 py-3 text-[14px] font-semibold text-white shadow-[0_8px_20px_-6px_rgba(126,107,175,0.55)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(61,46,107,0.55)] active:scale-95"
            >
              Search
            </button>
          </div>
        </section>

        {/* Body */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
          {/* Filters */}
          <aside className="h-fit rounded-2xl border border-white/60 bg-white/80 p-5 shadow-[0_10px_30px_-18px_rgba(126,107,175,0.2)] backdrop-blur-xl lg:sticky lg:top-28">
            <h2 className="text-[18px] font-bold text-brand-purple-dark">
              Quick Filters
            </h2>

            <div className="mt-5">
              <h3 className="text-[13px] font-semibold uppercase tracking-wider text-brand-purple-accent">
                Practice Areas
              </h3>
              <ul className="mt-3 space-y-2">
                {PRACTICE_AREAS.map((p) => (
                  <li key={p}>
                    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 text-[14px] text-brand-purple-dark/85 transition-colors hover:text-brand-purple-dark">
                      <input
                        type="checkbox"
                        checked={practices.includes(p)}
                        onChange={() => setPractices((arr) => toggle(arr, p))}
                        className="h-4 w-4 cursor-pointer rounded border-brand-purple/30 accent-brand-purple"
                      />
                      {p}
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6">
              <h3 className="text-[13px] font-semibold uppercase tracking-wider text-brand-purple-accent">
                Price Range
              </h3>
              <ul className="mt-3 space-y-2">
                {PRICE_RANGES.map((r, i) => (
                  <li key={r.label}>
                    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 text-[14px] text-brand-purple-dark/85 transition-colors hover:text-brand-purple-dark">
                      <input
                        type="checkbox"
                        checked={priceIdx.includes(i)}
                        onChange={() => setPriceIdx((arr) => toggle(arr, i))}
                        className="h-4 w-4 cursor-pointer rounded border-brand-purple/30 accent-brand-purple"
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
              <p className="text-[13.5px] text-brand-purple-dark/70">
                Showing{" "}
                <span className="font-semibold text-brand-purple-dark">
                  {filtered.length}
                </span>{" "}
                provider{filtered.length === 1 ? "" : "s"}
              </p>
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-white/60 bg-white/80 p-10 text-center shadow-[0_10px_30px_-18px_rgba(126,107,175,0.2)]">
                <p className="text-[15px] font-medium text-brand-purple-dark">
                  No providers match your filters.
                </p>
                <p className="mt-1 text-[13.5px] text-brand-purple-dark/65">
                  Try clearing some filters or adjusting your search.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
    <article className="group flex h-full flex-col rounded-2xl border border-white/60 bg-white/90 p-5 shadow-[0_10px_30px_-18px_rgba(126,107,175,0.25)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-purple/20 hover:shadow-[0_18px_40px_-18px_rgba(126,107,175,0.35)]">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-gradient-to-br from-brand-purple to-brand-purple-dark text-[16px] font-semibold text-white ring-2 ring-brand-purple/15">
          {provider.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="flex items-center gap-1.5 text-[16px] font-semibold leading-tight text-brand-purple-dark">
                <span className="truncate">{provider.name}</span>
                {provider.verified && (
                  <CheckCircle2
                    className="h-4 w-4 flex-none text-brand-purple"
                    aria-label="Verified"
                  />
                )}
              </h3>
              <p className="mt-0.5 text-[13px] text-brand-purple-dark/70">
                {provider.title}
              </p>
            </div>
            <div className="flex flex-none flex-col items-end">
              <div className="flex items-center gap-1 text-[13px] font-semibold text-brand-purple-dark">
                <Star className="h-3.5 w-3.5 fill-brand-purple text-brand-purple" />
                {provider.rating}
              </div>
              <span className="text-[11px] text-brand-purple-dark/55">
                {provider.reviews} reviews
              </span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-brand-lavender px-2.5 py-1 text-[11.5px] font-medium text-brand-purple-dark">
              {provider.practice}
            </span>
            {provider.tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-brand-purple/15 bg-white px-2.5 py-1 text-[11.5px] text-brand-purple-dark/75"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-4 text-[13.5px] leading-relaxed text-brand-purple-dark/75">
        {provider.bio}
      </p>

      <div className="mt-4 flex items-center gap-1.5 text-[13px] text-brand-purple-dark/70">
        <MapPin className="h-3.5 w-3.5 text-brand-purple/80" />
        {provider.location}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-brand-purple/10 pt-4">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-brand-purple-dark/55">
            Per session
          </p>
          <p className="text-[15px] font-semibold text-brand-purple-dark">
            PHP {provider.price.toLocaleString()}
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-purple to-brand-purple-dark px-4 py-2 text-[13px] font-semibold text-white shadow-[0_6px_16px_-6px_rgba(126,107,175,0.55)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_22px_-8px_rgba(61,46,107,0.55)] active:scale-95"
        >
          <Calendar className="h-3.5 w-3.5" />
          Book session
        </button>
      </div>
    </article>
  );
}