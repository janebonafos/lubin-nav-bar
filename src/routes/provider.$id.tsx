import { useState } from "react";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Globe,
  Github,
  Heart,
  MessageCircle,
  MapPin,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  User,
  Users,
  CalendarDays,
  Languages,
  Video,
  X,
  Info,
  Instagram,
  Facebook,
  Youtube,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import {
  getProviderById,
  getServicesForProvider,
  dayLabels,
  compactDays,
  type Provider,
  type Service,
  type SocialLink,
} from "@/lib/providers";



export const Route = createFileRoute("/provider/$id")({
  loader: ({ params }) => {
    const provider = getProviderById(params.id);
    if (!provider) throw notFound();
    return { provider };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.provider;
    const title = p ? `${p.name} — Lubin` : "Provider — Lubin";
    const desc = p
      ? `${p.title} · ${p.location}. ${p.bio}`
      : "View provider profile on Lubin.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
      ],
    };
  },
  component: ProviderProfilePage,
  notFoundComponent: () => (
    <div className="min-h-screen bg-[#F9F8FF]">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-32 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Provider not found</h1>
        <p className="mt-2 text-slate-500">
          This profile may have been removed or is not yet on Lubin.
        </p>
        <Link
          to="/find-provider"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-purple px-5 py-2.5 text-[13px] font-semibold text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to search
        </Link>
      </main>
    </div>
  ),
  errorComponent: ({ reset }) => (
    <div className="min-h-screen bg-[#F9F8FF]">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-32 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Something went wrong</h1>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-xl bg-brand-purple px-5 py-2.5 text-[13px] font-semibold text-white"
        >
          Try again
        </button>
      </main>
    </div>
  ),
});

function ProviderProfilePage() {
  const { provider } = Route.useLoaderData();
  const services = getServicesForProvider(provider);
  const [bookingService, setBookingService] = useState<Service | null>(null);

  return (
    <div
      className="min-h-screen bg-[#F8F9FD]"
      style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}
    >
      <Navbar />

      <main className="pb-20 pt-24 sm:pt-28">
        {/* Hero — Indigo Trust Card */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="absolute inset-0 bg-[#F8F9FD]" />

          <div className="relative mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
            <Link
              to="/find-provider"
              className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:text-brand-purple"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to providers
            </Link>

            <div className="overflow-hidden rounded-[32px] border border-[#EAE7F5]/60 bg-white shadow-[0_32px_64px_-12px_rgba(102,94,175,0.10)]">
              <div className="flex flex-col md:flex-row">
                {/* LEFT: Identity & Booking */}
                <div className="flex flex-col items-center border-b border-[#EAE7F5]/60 bg-gradient-to-b from-[#F4F0FF]/60 to-white/20 p-10 md:w-[340px] md:border-b-0 md:border-r">
                  <div className="relative mb-8">
                    <div className="flex h-32 w-32 items-center justify-center rounded-[2.5rem] bg-gradient-to-br from-brand-purple to-brand-purple-dark text-[40px] font-extrabold text-white shadow-xl shadow-[#A89BD0]/50 ring-4 ring-white">
                      {provider.initials}
                    </div>
                    {provider.rating != null && (
                      <div className="absolute -bottom-2 -right-2 rounded-2xl bg-white p-2 shadow-lg">
                        <div className="flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1">
                          <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                          <span className="text-xs font-bold text-amber-700">{provider.rating}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mb-10 text-center">
                    <h1 className="mb-1 text-2xl font-bold text-[#2C2B4B]">{provider.name}</h1>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-brand-purple">
                      {provider.title}
                    </p>
                    {provider.rating != null && provider.reviews != null ? (
                      <p className="text-sm font-medium text-slate-400">
                        ({provider.reviews} verified reviews)
                      </p>
                    ) : (
                      <p className="text-sm font-medium text-slate-400">No reviews yet</p>
                    )}
                  </div>

                  <div className="w-full space-y-4">
                    {provider.nextAvailable && (
                      <div className="flex items-center gap-3 rounded-2xl border border-[#EAE7F5] bg-[#F4F0FF]/50 p-4">
                        <div className="relative">
                          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                          <div className="absolute inset-0 h-2.5 w-2.5 animate-ping rounded-full bg-emerald-500 opacity-75" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Next Available
                          </span>
                          <span className="text-sm font-semibold text-[#2C2B4B]">
                            {provider.nextAvailable}
                          </span>
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setBookingService(services[0] ?? null)}
                      disabled={services.length === 0}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-purple py-4 font-bold text-white shadow-lg shadow-[#A89BD0]/30 transition-all hover:-translate-y-0.5 hover:bg-brand-purple-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Calendar className="h-5 w-5" />
                      Book Session
                    </button>
                  </div>
                </div>

                {/* RIGHT: Content */}
                <div className="flex flex-1 flex-col p-10">
                  {provider.verified && (
                    <div className="mb-8 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#EAE7F5] bg-[#F4F0FF] px-3 py-1.5">
                        <BadgeCheck className="h-3.5 w-3.5 text-brand-purple" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-brand-purple">
                          Verified Provider
                        </span>
                      </span>
                    </div>
                  )}

                  <div className="mb-8">
                    <h2 className="mb-4 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
                      About
                    </h2>
                    <p className="leading-relaxed text-slate-600">
                      {provider.expertise && (
                        <span className="font-bold text-slate-900">{provider.expertise}. </span>
                      )}
                      {provider.bio}
                    </p>
                  </div>

                  <div className="mb-8">
                    <h2 className="mb-4 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
                      Provider Details
                    </h2>
                    <div className="grid grid-cols-1 gap-y-5 gap-x-8 sm:grid-cols-2">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-[#F4F0FF] p-2 text-brand-purple">
                          <Award className="h-4 w-4" strokeWidth={2} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase text-slate-400">Experience</p>
                          <p className="text-sm font-semibold text-slate-800">{provider.experience}+ years</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-[#F4F0FF] p-2 text-brand-purple">
                          <CalendarDays className="h-4 w-4" strokeWidth={2} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase text-slate-400">Availability</p>
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {compactDays(provider.availableDays.map((d: string) => dayLabels[d]))} · {provider.availableHours}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-[#F4F0FF] p-2 text-brand-purple">
                          <Languages className="h-4 w-4" strokeWidth={2} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase text-slate-400">Languages</p>
                          <p className="truncate text-sm font-semibold text-slate-800">{provider.languages.join(", ")}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-[#F4F0FF] p-2 text-brand-purple">
                          <Video className="h-4 w-4" strokeWidth={2} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase text-slate-400">Session type</p>
                          <p className="text-sm font-semibold text-slate-800">{provider.sessionModes.join(" & ")}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-8">
                    <h2 className="mb-4 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
                      Specialties
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {provider.tags.map((t: string) => (
                        <span
                          key={t}
                          className="rounded-xl border border-[#EAE7F5] bg-white px-4 py-2 text-sm font-semibold text-brand-purple shadow-sm transition-colors hover:border-brand-purple/30 hover:bg-[#F4F0FF]/40"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {provider.socialLinks && provider.socialLinks.length > 0 && (
                    <div className="mb-8">
                      <h2 className="mb-4 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
                        Connect
                      </h2>
                      <div className="flex flex-wrap gap-3">
                        {provider.socialLinks.map((link: SocialLink) => {
                          const label = link.label.toLowerCase();
                          const isWebsite = label === "website";
                          const isLinkedIn = label.includes("linkedin");
                          const isInstagram = label.includes("instagram");
                          const isFacebook = label.includes("facebook");
                          const isTwitter = label.includes("twitter") || label.includes("x");
                          const isYouTube = label.includes("youtube");
                          const isTikTok = label.includes("tiktok");
                          const isGitHub = label.includes("github");

                          const brandStyle = isLinkedIn
                            ? "bg-[#E8F4FF] text-[#0A66C2] border-[#0A66C2]/20 hover:bg-[#0A66C2] hover:text-white"
                            : isInstagram
                            ? "bg-[#FFF0F5] text-[#E1306C] border-[#E1306C]/20 hover:bg-gradient-to-br hover:from-[#833AB4] hover:via-[#E1306C] hover:to-[#FCAF45] hover:text-white"
                            : isFacebook
                            ? "bg-[#E8F2FF] text-[#1877F2] border-[#1877F2]/20 hover:bg-[#1877F2] hover:text-white"
                            : isTwitter
                            ? "bg-slate-100 text-slate-900 border-slate-200 hover:bg-slate-900 hover:text-white"
                            : isYouTube
                            ? "bg-[#FFF0F0] text-[#FF0000] border-[#FF0000]/20 hover:bg-[#FF0000] hover:text-white"
                            : isTikTok
                            ? "bg-[#F0F8FF] text-[#000000] border-slate-200 hover:bg-slate-900 hover:text-white"
                            : isGitHub
                            ? "bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-800 hover:text-white"
                            : "bg-[#F4F0FF] text-brand-purple border-[#EAE7F5] hover:bg-brand-purple hover:text-white";

                          return (
                            <a
                              key={link.label}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={link.label}
                              className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-md ${brandStyle}`}
                            >
                              {isWebsite ? (
                                <Globe className="h-5 w-5" strokeWidth={2} />
                              ) : isLinkedIn ? (
                                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                </svg>
                              ) : isInstagram ? (
                                <Instagram className="h-5 w-5" strokeWidth={2} />
                              ) : isFacebook ? (
                                <Facebook className="h-5 w-5" strokeWidth={2} />
                              ) : isTwitter ? (
                                <X className="h-4 w-4" strokeWidth={2} />
                              ) : isYouTube ? (
                                <Youtube className="h-5 w-5" strokeWidth={2} />
                              ) : isTikTok ? (
                                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.57-1.52-3.99-4.61-3.33-7.58.52-2.29 2.36-4.24 4.63-4.85.81-.21 1.66-.22 2.48-.06.01 1.64-.02 3.29.03 4.93-.16.03-.32-.03-.47-.08-.75-.28-1.29-1.04-1.29-1.86 0-.23.05-.46.14-.67.41-.96 1.54-1.39 2.49-1.01.72.29 1.22.99 1.23 1.77.02 1.32.01 2.64.01 3.96 0 .31-.02.62-.08.92-.32 1.52-1.83 2.56-3.35 2.28-1.21-.23-2.19-1.24-2.35-2.47-.02-.14-.03-.27-.03-.41.01-1.63.01-3.26.01-4.89-.04-.24.07-.48.29-.61.38-.23.81-.36 1.24-.45.62-.13 1.26-.14 1.89-.08.02-1.62-.01-3.24.02-4.86.04-1.18.33-2.35.87-3.4.86-1.63 2.4-2.95 4.2-3.48 1.22-.37 2.53-.4 3.78-.14z" />
                                </svg>
                              ) : isGitHub ? (
                                <Github className="h-5 w-5" strokeWidth={2} />
                              ) : (
                                <ExternalLink className="h-5 w-5" strokeWidth={2} />
                              )}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="mt-auto flex flex-wrap items-center justify-end gap-4 border-t border-slate-100 pt-6">
                    <div className="inline-flex items-center gap-3">
                      <ShieldCheck className="h-5 w-5 text-slate-400" strokeWidth={2} />
                      <div className="flex flex-col">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                          Secure & Confidential
                        </span>
                        <span className="text-[10px] font-medium text-slate-400">
                          Verified by <span className="font-bold text-slate-600">Lubin</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Services */}
        <section id="services" className="mx-auto mt-14 w-full max-w-6xl px-4 scroll-mt-24">

          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-[28px] font-bold tracking-tight text-slate-900 sm:text-[36px]">
                Services offered
              </h2>
              <p className="mt-1.5 text-[14.5px] text-slate-500">
                Choose a session that fits what you're working on right now.
              </p>
            </div>
            <span className="hidden rounded-full bg-[#F3F0FF] px-3 py-1 text-[12px] font-semibold text-brand-purple sm:inline-flex">
              {services.length} {services.length === 1 ? "service" : "services"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <ServiceCard key={s.id} service={s} onBook={() => setBookingService(s)} />
            ))}
          </div>
        </section>
      </main>

      {bookingService && (
        <BookingModal
          provider={provider}
          service={bookingService}
          onClose={() => setBookingService(null)}
        />
      )}
    </div>
  );
}

function ServiceCard({ service, onBook }: { service: Service; onBook: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const shouldClamp = service.description.length > 140;
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#E9E6FA] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-purple/30 hover:shadow-[0_22px_48px_-20px_rgba(124,113,176,0.4)]">
      {/* Gradient header band */}
      <div className="relative h-2 bg-gradient-to-r from-brand-purple via-brand-purple-accent to-brand-purple" />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-purple/5 blur-2xl transition-opacity duration-300 group-hover:bg-brand-purple/15"
      />

      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-[20px] font-bold leading-snug text-slate-900">
          {service.title}
        </h3>

        <div className="flex flex-1 flex-col">
          <p
            className={`mt-4 text-[13.5px] leading-relaxed text-slate-600 ${
              expanded ? "" : "line-clamp-3"
            }`}
          >
            {service.description}
          </p>
          {shouldClamp && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 self-start text-[12.5px] font-semibold text-brand-purple hover:text-brand-purple-dark"
            >
              {expanded ? "Show less" : "See more"}
            </button>
          )}
        </div>

        {/* Meta pills */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          <span
            className={
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ring-1 ring-inset " +
              (service.format === "Group"
                ? "bg-brand-purple/8 text-brand-purple-dark ring-brand-purple/15"
                : service.format === "Both"
                ? "bg-brand-purple/8 text-brand-purple-dark ring-brand-purple/15"
                : "bg-[#F3F0FF] text-brand-purple ring-brand-purple/10")
            }
          >
            {service.format === "Group" ? (
              <Users className="h-3 w-3" />
            ) : service.format === "Both" ? (
              <Users className="h-3 w-3" />
            ) : (
              <User className="h-3 w-3" />
            )}
            {service.format === "Both" ? "Individual or Group" : service.format}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11.5px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200/70">
            <Clock className="h-3 w-3 text-[#A799E2]" />
            {service.duration}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11.5px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200/70">
            <Video className="h-3 w-3 text-[#A799E2]" />
            Online · In-person
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11.5px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200/70">
            <CalendarDays className="h-3 w-3 text-[#A799E2]" />
            {service.schedule}
          </span>
        </div>

        {/* Price + CTA */}
        <div className="mt-5 grid grid-cols-[1fr_auto] items-center gap-3 border-t border-dashed border-[#E9E6FA] pt-5">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Starting at
            </span>
            <p className="whitespace-nowrap text-[20px] font-bold leading-none text-slate-900">
              ₱{service.price.toLocaleString()}
              <span className="ml-1 text-[12px] font-normal text-slate-400">/session</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onBook}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-purple to-brand-purple-dark px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_18px_-8px_rgba(124,113,176,0.6)] transition-all hover:-translate-y-1 hover:shadow-[0_16px_32px_-8px_rgba(124,113,176,0.85)] hover:ring-2 hover:ring-white/40 active:scale-95"
          >
            <Calendar className="h-3.5 w-3.5" />
            Book
          </button>
        </div>
      </div>
    </article>
  );
}

function BookingModal({
  provider,
  service,
  onClose,
}: {
  provider: Provider;
  service: Service;
  onClose: () => void;
}) {
  const today = new Date();
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [format, setFormat] = useState<"online" | "in-person">("online");
  const navigate = useNavigate();

  const viewMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const monthLabel = viewMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const firstWeekday = viewMonth.getDay();
  const cells: (Date | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1),
    ),
  ];
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const times = ["9:00 AM", "10:30 AM", "1:00 PM", "2:30 PM", "4:00 PM", "5:30 PM"];
  const canConfirm = selectedDate && selectedTime;

  const goToCheckout = () => {
    if (!canConfirm || !selectedDate) return;
    navigate({
      to: "/checkout",
      search: {
        providerId: provider.id,
        serviceId: service.id,
        date: selectedDate.toISOString().slice(0, 10),
        time: selectedTime!,
        format,
      },
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[#E9E6FA] px-6 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-[18px] font-bold text-slate-900">{service.title}</h3>
            <p className="mt-0.5 truncate text-[13px] text-slate-500">
              with <span className="font-semibold text-slate-700">{provider.name}</span> ·{" "}
              {service.duration}
            </p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-500">
              {service.description}
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

        <div className="max-h-[60vh] space-y-5 overflow-y-auto px-6 py-5">
          {(service.format === "Group" || service.format === "Both") &&
            service.minParticipants != null && (
              <div className="rounded-xl border border-brand-purple/15 bg-brand-purple/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-brand-purple-dark" />
                    <h4 className="text-[13px] font-semibold text-brand-navy">
                      Group session
                    </h4>
                  </div>
                  <span className="text-[11.5px] font-semibold text-brand-purple-dark">
                    {service.currentParticipants ?? 0} of{" "}
                    {service.minParticipants} joined
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-brand-purple/10">
                  <div
                    className="h-full rounded-full bg-brand-purple transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        ((service.currentParticipants ?? 0) /
                          service.minParticipants) *
                          100,
                      )}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-brand-purple-dark/90">
                  Needs at least{" "}
                  <span className="font-semibold">
                    {service.minParticipants} participants
                  </span>{" "}
                  to push through
                  {service.maxParticipants
                    ? ` (max ${service.maxParticipants})`
                    : ""}
                  . You'll only be charged once the session is confirmed.
                </p>
              </div>
            )}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#A799E2]">
              Session format
            </h4>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["online", "in-person"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={`rounded-xl border px-3 py-2.5 text-[13px] font-semibold capitalize transition-all ${
                    format === f
                      ? "border-brand-purple bg-[#F3F0FF] text-brand-purple"
                      : "border-[#E9E6FA] bg-white text-slate-600 hover:border-brand-purple/30"
                  }`}
                >
                  {f === "online" ? "Online (video)" : "In-person"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#A799E2]">
                Pick a date
              </h4>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMonthOffset((v) => Math.max(0, v - 1))}
                  disabled={monthOffset === 0}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-[110px] text-center text-[13px] font-semibold text-slate-700">
                  {monthLabel}
                </span>
                <button
                  type="button"
                  onClick={() => setMonthOffset((v) => v + 1)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div key={i} className="py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {cells.map((d, i) => {
                if (!d) return <div key={i} />;
                const isPast = d < todayMid;
                const isSelected =
                  selectedDate && d.toDateString() === selectedDate.toDateString();
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={isPast}
                    onClick={() => {
                      setSelectedDate(d);
                      setSelectedTime(null);
                    }}
                    className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-medium transition-colors ${
                      isSelected
                        ? "bg-brand-purple text-white shadow-[0_6px_14px_-6px_rgba(124,113,176,0.7)]"
                        : isPast
                          ? "text-slate-300"
                          : "text-slate-700 hover:bg-[#F3F0FF]"
                    }`}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedDate && (
            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#A799E2]">
                  Available times
                </h4>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F0FF] px-2 py-0.5 text-[10.5px] font-semibold text-brand-purple ring-1 ring-inset ring-brand-purple/10">
                  <Globe className="h-3 w-3" /> PHT · GMT+8
                </span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {times.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTime(t)}
                    className={`rounded-lg border px-2 py-2 text-[12.5px] font-semibold transition-all ${
                      selectedTime === t
                        ? "border-brand-purple bg-brand-purple text-white"
                        : "border-[#E9E6FA] bg-white text-slate-600 hover:border-brand-purple/40"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11.5px] text-slate-500">
                Times shown in Philippine Time (PHT, GMT+8).
              </p>
            </div>
          )}

          {/* Format-specific details */}
          {format === "online" ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-[#E9E6FA] bg-[#FBFAFF] p-3.5">
              <Video className="mt-0.5 h-4 w-4 flex-none text-brand-purple" />
              <p className="text-[12.5px] leading-relaxed text-slate-600">
                <span className="font-semibold text-slate-700">Online session.</span> A secure
                video link will be emailed after payment and again 30 minutes before your session.
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 rounded-xl border border-[#E9E6FA] bg-[#FBFAFF] p-3.5">
              <MapPin className="mt-0.5 h-4 w-4 flex-none text-brand-purple" />
              <p className="text-[12.5px] leading-relaxed text-slate-600">
                <span className="font-semibold text-slate-700">In-person · {provider.location} area.</span>{" "}
                For your provider's privacy, the exact clinic address is shared by email once your booking is confirmed.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[#E9E6FA] bg-[#FBFAFF] px-6 py-4">
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Total
            </span>
            <p className="text-[17px] font-bold leading-none text-slate-900">
              ₱{service.price.toLocaleString()}
            </p>
          </div>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={goToCheckout}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-brand-purple to-brand-purple-dark px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_18px_-8px_rgba(124,113,176,0.6)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-8px_rgba(124,113,176,0.85)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            Continue to payment
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}