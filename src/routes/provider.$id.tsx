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
  FileText,
  Globe2,
  Heart,
  MessageCircle,
  MapPin,
  Shield,
  Sparkles,
  Star,
  User,
  Users,
  CalendarDays,
  Video,
  X,
  Info,
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
  type Reference,
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

            <div className="overflow-hidden rounded-[2rem] border border-white bg-white shadow-[0_32px_64px_-16px_rgba(93,78,140,0.12)]">
              <div className="flex flex-col md:flex-row">
                {/* LEFT: Identity column */}
                <div className="border-b border-slate-100 bg-[#FAF9FF] p-10 md:w-[360px] md:border-b-0 md:border-r">
                  <div className="relative mx-auto mb-8 h-44 w-44">
                    <div className="absolute inset-0 rounded-[2.25rem] bg-gradient-to-br from-brand-purple-accent/40 to-brand-purple/30 blur-xl" />
                    <div className="relative flex h-full w-full items-center justify-center rounded-[2.25rem] bg-gradient-to-br from-brand-purple to-brand-purple-dark text-[44px] font-bold text-white shadow-2xl ring-[10px] ring-white">
                      {provider.initials}
                    </div>
                  </div>

                  <div className="space-y-2 text-center">
                    <h1 className="font-serif-display text-[26px] font-semibold leading-tight tracking-tight text-[#2C2B4B]">
                      {provider.name}
                    </h1>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-purple">
                      {provider.title}
                    </p>
                    <div className="flex items-center justify-center gap-1.5 pt-1.5">
                      <Star className="h-4 w-4 fill-[#C4A35A] text-[#C4A35A]" />
                      <span className="text-[15px] font-bold text-[#2C2B4B]">
                        {provider.rating}
                      </span>
                      <span className="text-[13px] font-normal text-[#A89BD0]">
                        ({provider.reviews} reviews)
                      </span>
                    </div>
                  </div>

                  <div className="mt-8">
                    <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-[#A89BD0]">
                      Provider Details
                    </p>
                    <div className="space-y-0">
                      <div className="flex items-center gap-3 py-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F3F0FA]">
                          <Award className="h-3.5 w-3.5 text-[#7C6DB1]" strokeWidth={1.5} />
                        </div>
                        <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                          <span className="text-[13px] text-slate-500">Experience</span>
                          <span className="text-[13px] font-semibold text-[#2C2B4B]">{provider.experience}+ years</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 py-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F3F0FA]">
                          <MapPin className="h-3.5 w-3.5 text-[#7C6DB1]" strokeWidth={1.5} />
                        </div>
                        <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                          <span className="text-[13px] text-slate-500">Availability</span>
                          <span className="truncate text-[13px] font-semibold text-[#2C2B4B]">
                            {compactDays(provider.availableDays.map((d: string) => dayLabels[d]))} · {provider.availableHours}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 py-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F3F0FA]">
                          <Globe2 className="h-3.5 w-3.5 text-[#7C6DB1]" strokeWidth={1.5} />
                        </div>
                        <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                          <span className="text-[13px] text-slate-500">Languages</span>
                          <span className="truncate text-[13px] font-semibold text-[#2C2B4B]">{provider.languages.join(", ")}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 py-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F3F0FA]">
                          <Video className="h-3.5 w-3.5 text-[#7C6DB1]" strokeWidth={1.5} />
                        </div>
                        <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                          <span className="text-[13px] text-slate-500">Session format</span>
                          <span className="truncate text-[13px] font-semibold text-[#2C2B4B]">
                            {provider.sessionModes.join(" & ")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Social Links */}
                  {provider.socialLinks && provider.socialLinks.length > 0 && (
                    <div className="mt-8">
                      <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-[#A89BD0]">
                        Connect
                      </p>
                      <div className="space-y-0">
                        {provider.socialLinks.map((link) => (
                          <a
                            key={link.label}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 py-3 transition-colors hover:text-brand-purple"
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F3F0FA]">
                              <ExternalLink className="h-3.5 w-3.5 text-[#7C6DB1]" strokeWidth={1.5} />
                            </div>
                            <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                              <span className="text-[13px] text-slate-500">{link.label}</span>
                              <span className="truncate text-[13px] font-semibold text-[#2C2B4B]">
                                {link.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                              </span>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT: Details + Booking */}
                <div className="flex-1 space-y-8 p-10 md:p-12">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {provider.verified && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E9E1F7] bg-[#F4F0FF] px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-brand-purple">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        Verified Provider
                      </span>
                    )}
                    {provider.licenseNumber && !provider.licenseNumber.toLowerCase().includes("pending") && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D1FAE5] bg-[#ECFDF5] px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                        <Shield className="h-3 w-3" />
                        Licensed & Insured
                      </span>
                    )}
                  </div>

                  <section>
                    <h3 className="mb-3 text-[13px] font-bold uppercase tracking-widest text-slate-400">About</h3>
                    <p className="text-[17px] leading-relaxed text-slate-600">
                      {provider.expertise && (
                        <span className="font-bold text-slate-900">
                          {provider.expertise}.{" "}
                        </span>
                      )}
                      {provider.bio}
                    </p>
                  </section>

                  <section>
                    <h3 className="mb-4 text-[13px] font-bold uppercase tracking-widest text-[#A89BD0]">
                      Specialties
                    </h3>
                    <div className="flex flex-wrap gap-2.5">
                      {provider.tags.map((t: string) => (
                        <span
                          key={t}
                          className="rounded-xl border border-[#EAE7F5] bg-white px-5 py-2.5 text-[13px] font-semibold text-[#3D2E6B] shadow-[0_1px_4px_rgba(0,0,0,0.02)] transition-all hover:-translate-y-0.5 hover:border-brand-purple/30 hover:shadow-[0_4px_12px_rgba(126,107,175,0.1)]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </section>

                  {/* References */}
                  {provider.references && provider.references.length > 0 && (
                    <section>
                      <h3 className="mb-4 flex items-center gap-2 text-[13px] font-bold uppercase tracking-widest text-[#A89BD0]">
                        <FileText className="h-4 w-4" />
                        Publications & References
                      </h3>
                      <div className="space-y-3">
                        {provider.references.map((ref, i) => (
                          <div
                            key={i}
                            className="rounded-2xl border border-[#EAE7F5] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_4px_12px_rgba(126,107,175,0.08)]"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="text-[14px] font-semibold leading-snug text-[#2C2B4B]">
                                  {ref.url ? (
                                    <a
                                      href={ref.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="hover:text-brand-purple hover:underline"
                                    >
                                      {ref.title}
                                    </a>
                                  ) : (
                                    ref.title
                                  )}
                                </p>
                                {ref.description && (
                                  <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500">
                                    {ref.description}
                                  </p>
                                )}
                              </div>
                              {ref.year && (
                                <span className="shrink-0 rounded-full bg-[#F3F0FF] px-2.5 py-1 text-[11px] font-semibold text-brand-purple">
                                  {ref.year}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Brand booking CTA block */}
                  <div className="relative overflow-hidden rounded-3xl bg-[#5D4E8C] p-8 text-white">
                    <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
                    <div className="relative flex flex-col items-stretch gap-6 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-100">
                          Starting at
                        </p>
                        <p className="text-[34px] font-bold leading-none">
                          {services[0] ? (
                            <>
                              ₱{services[0].price.toLocaleString()}{" "}
                              <span className="text-[14px] font-medium text-indigo-200/80">
                                / {services[0].duration}
                              </span>
                            </>
                          ) : (
                            <span className="text-[16px] font-normal text-indigo-200/80">
                              Sessions available
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-col items-stretch gap-3 sm:items-end">
                        {provider.nextAvailable && (
                          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/10 px-3 py-1">
                            <span className="relative flex h-2 w-2 shrink-0">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                            </span>
                            <span className="whitespace-nowrap text-[12px] font-medium text-white/90">
                              Next available:{" "}
                              <span className="font-bold text-white">
                                {provider.nextAvailable}
                              </span>
                            </span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setBookingService(services[0] ?? null)}
                          disabled={services.length === 0}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-10 py-4 text-[15px] font-bold text-[#5D4E8C] shadow-xl transition-all hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Calendar className="h-4 w-4" />
                          Book Session
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Services preview pointer */}
                  <a
                    href="#services"
                    className="group flex items-start justify-between gap-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-5 transition-colors hover:bg-slate-100"
                  >
                    <div className="flex min-w-0 items-start gap-5">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-[13px] font-bold text-slate-400">
                        {String(services.length).padStart(2, "0")}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          Services Offered
                        </p>
                        <div className="mt-1.5 space-y-0.5">
                          {services.slice(0, 1).map((s) => (
                            <p key={s.id} className="text-[14px] font-semibold text-slate-700">
                              {s.title}
                            </p>
                          ))}
                          {services.length > 1 && (
                            <p className="text-[13px] text-slate-400">
                              +{services.length - 1} more
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-300 transition-colors group-hover:text-[#5D4E8C]" />
                  </a>

                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">
                    <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-slate-500">
                      <Shield className="h-4 w-4" />
                      <span className="text-[11px] font-bold uppercase tracking-wider">Secure & Confidential</span>
                    </div>
                    {provider.verified && (
                      <p className="text-[11px] font-medium text-slate-400">
                        Verified by{" "}
                        <span className="font-bold text-[#5D4E8C]">Lubin</span>{" "}
                        · Background-checked & credentialed
                      </p>
                    )}
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
              <h2 className="text-[28px] font-semibold tracking-tight text-slate-900 sm:text-[36px]">
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
        <h3 className="text-[20px] font-semibold leading-snug text-slate-900">
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
                  <Globe2 className="h-3 w-3" /> PHT · GMT+8
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