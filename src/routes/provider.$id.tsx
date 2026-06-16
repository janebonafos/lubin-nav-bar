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
  type Provider,
  type Service,
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
      className="min-h-screen bg-[#F9F8FF]"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <Navbar />

      <main className="pb-20 pt-24 sm:pt-28">
        {/* Hero */}
        <section className="relative overflow-hidden">
          {/* Decorative background */}
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#EFEAFF_0%,_#F9F8FF_45%,_#FFFFFF_100%)]"
          />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,_rgba(124,113,176,0.08)_1px,_transparent_1px),linear-gradient(to_bottom,_rgba(124,113,176,0.08)_1px,_transparent_1px)] [background-size:42px_42px] [mask-image:radial-gradient(ellipse_at_center,_black_30%,_transparent_75%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-purple/10 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-32 left-10 h-72 w-72 rounded-full bg-brand-purple-accent/15 blur-3xl"
          />

          <div className="relative mx-auto w-full max-w-6xl px-4 py-10 sm:py-16">
            <div className="flex flex-col-reverse gap-12 lg:flex-row lg:items-start">
              {/* LEFT: Action Card with Avatar */}
              <aside className="w-full lg:w-80 lg:flex-shrink-0">
                <div className="rounded-[2.5rem] border border-slate-100 bg-white p-6 shadow-[0_20px_50px_-12px_rgba(115,113,252,0.12)] sm:p-8 lg:sticky lg:top-28">
                  {/* Avatar */}
                  <div className="mb-8 flex flex-col items-center">
                    <div className="relative">
                      <div className="relative flex h-36 w-36 items-center justify-center rounded-[2rem] bg-gradient-to-br from-brand-purple to-brand-purple-dark text-[40px] font-bold text-white shadow-xl ring-8 ring-white sm:h-40 sm:w-40 sm:text-[44px]">
                        {provider.initials}
                      </div>
                      {provider.verified && (
                        <span className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-lg ring-4 ring-white">
                          <BadgeCheck className="h-5 w-5 text-brand-purple-accent" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Availability — ONE LINE */}
                  {provider.nextAvailable && (
                    <div className="mb-6 flex items-center gap-2 rounded-2xl border border-[#EAE7F5] bg-[#F3F0FF] px-4 py-3">
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-purple-accent opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-purple" />
                      </span>
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-[#6B5B9A]">
                        Next Available
                      </span>
                      <span className="truncate text-[13px] font-semibold text-[#3D2E6B]">
                        {provider.nextAvailable}
                      </span>
                    </div>
                  )}

                  <p className="mb-6 text-center text-[13px] text-slate-500">
                    Book a session or send a quick message to get started.
                  </p>

                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setBookingService(services[0] ?? null)}
                      disabled={services.length === 0}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand-purple to-brand-purple-dark px-4 py-4 text-[13px] font-semibold text-white shadow-lg shadow-indigo-100 transition-all hover:-translate-y-0.5 active:scale-95"
                    >
                      <Calendar className="h-4 w-4" />
                      Book a session
                    </button>
                    <button
                      type="button"
                      disabled
                      className="group relative flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-[13px] font-semibold text-slate-400 transition-colors hover:border-slate-300"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Message
                      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded-lg bg-slate-800 px-2.5 py-1 text-[10px] font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                        Coming soon
                      </span>
                    </button>
                  </div>

                  <div className="mt-6 flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-3 w-3 text-slate-400" />
                      <span className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
                        Verified Secure Connection
                      </span>
                    </div>
                  </div>
                </div>
              </aside>

              {/* RIGHT: Identity Content */}
              <div className="min-w-0 flex-1">
                <Link
                  to="/find-provider"
                  className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:text-brand-purple"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to providers
                </Link>

                {/* Name area */}
                <div className="mt-2 space-y-3">
                  <div className="flex items-center gap-3">
                    {provider.verified && (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-purple">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        Verified Provider
                      </span>
                    )}
                    <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                      Sample
                    </span>
                  </div>

                  <h1 className="font-serif-display text-[42px] font-semibold leading-[1.1] tracking-tight text-[#1A1625] sm:text-[56px]">
                    {provider.name}
                  </h1>

                  <div className="flex flex-wrap items-center gap-4">
                    <p className="text-[18px] font-normal italic text-[#7E6BAF] sm:text-[20px]">
                      {provider.title}
                    </p>
                    <span className="hidden h-4 w-px bg-[#D4CFE8] sm:block" />
                    <div className="flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5 fill-[#C4A35A] text-[#C4A35A]" />
                      <span className="text-[13px] font-semibold text-[#1A1625]">
                        {provider.rating}
                      </span>
                      <span className="text-[12px] text-[#9489B2]">
                        ({provider.reviews} reviews)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Metadata grid */}
                <div className="mt-10 grid grid-cols-2 gap-8 border-y border-slate-100 py-10">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Location
                    </p>
                    <p className="text-sm font-semibold text-slate-700">
                      {provider.location}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Languages
                    </p>
                    <p className="text-sm font-semibold text-slate-700">
                      {provider.languages.join(", ")}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Experience
                    </p>
                    <p className="text-sm font-semibold text-slate-700">
                      {provider.experience}+ Years
                    </p>
                  </div>
                  {provider.licenseNumber && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Licensure
                      </p>
                      <p className="text-sm font-semibold text-slate-700">
                        {provider.licenseNumber}
                      </p>
                    </div>
                  )}
                </div>

                {/* Bio with inline expertise */}
                <div className="mt-10 space-y-6">
                  {provider.expertise && (
                    <p className="max-w-2xl text-xl leading-relaxed font-light text-slate-800">
                      <span className="font-medium text-[#3D2E6B] border-b-2 border-[#E9E4F5]">
                        {provider.expertise}.
                      </span>{" "}
                      {provider.bio}
                    </p>
                  )}
                  {!provider.expertise && (
                    <p className="max-w-2xl text-xl leading-relaxed font-light text-slate-800">
                      {provider.bio}
                    </p>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2.5">
                    {provider.tags.map((t: string) => (
                      <span
                        key={t}
                        className="cursor-default rounded-full border border-slate-200 bg-white px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 transition-colors hover:border-brand-purple/30 hover:text-brand-purple"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Services */}
        <section id="services" className="mx-auto mt-14 w-full max-w-6xl px-4 scroll-mt-24">
          {/* Therapy modalities & practice — editorial panel */}
          <div className="mb-14 overflow-hidden rounded-2xl border border-[#ECE7F7] bg-gradient-to-br from-white via-white to-[#FAF8FF] shadow-[0_1px_0_rgba(126,107,175,0.04),0_24px_60px_-40px_rgba(50,28,120,0.18)]">
            <div className="grid grid-cols-1 md:grid-cols-5">
              {/* Modalities — accent column */}
              <div className="relative md:col-span-2 border-b border-[#ECE7F7] md:border-b-0 md:border-r p-7 sm:p-8">
                <div className="absolute left-0 top-7 sm:top-8 h-7 w-[3px] rounded-r bg-[#7E6BAF]" />
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#7E6BAF]">
                  Therapy modalities
                </p>
                <p className="mt-1 font-serif-display text-[13px] italic text-slate-400">
                  Approaches used in session
                </p>
                {provider.modalities && provider.modalities.length ? (
                  <ul className="mt-5 space-y-3">
                    {provider.modalities.map((m: string) => (
                      <li
                        key={m}
                        className="flex items-start gap-3 text-[14.5px] leading-snug text-slate-800"
                      >
                        <span className="mt-[7px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#7E6BAF]" />
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-5 text-[14px] text-slate-500">Not listed</p>
                )}
              </div>

              {/* Practice details */}
              <div className="md:col-span-3 p-7 sm:p-8">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#7E6BAF]">
                  Practice
                </p>
                <p className="mt-1 font-serif-display text-[13px] italic text-slate-400">
                  At a glance
                </p>
                <dl className="mt-5 divide-y divide-[#EFEAF7]">
                  <div className="flex items-baseline justify-between gap-4 py-3">
                    <dt className="text-[12px] uppercase tracking-wider text-slate-400">Experience</dt>
                    <dd className="font-serif-display text-[18px] text-slate-900">
                      {provider.experience}<span className="text-slate-400">+</span>{" "}
                      <span className="text-[13px] font-sans uppercase tracking-wider text-slate-500">yrs</span>
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 py-3">
                    <dt className="text-[12px] uppercase tracking-wider text-slate-400">Languages</dt>
                    <dd className="text-right text-[14.5px] font-medium text-slate-900">
                      {provider.languages.join(" · ")}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 py-3">
                    <dt className="text-[12px] uppercase tracking-wider text-slate-400">Session formats</dt>
                    <dd className="text-right text-[14.5px] font-medium text-slate-900">
                      {provider.sessionModes.join(" · ")}
                    </dd>
                  </div>
                  {provider.licenseBoard && (
                    <div className="flex items-baseline justify-between gap-4 py-3">
                      <dt className="text-[12px] uppercase tracking-wider text-slate-400">Board</dt>
                      <dd className="text-right text-[14.5px] font-medium text-slate-900">
                        {provider.licenseBoard}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>

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
            Book now
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
                <span className="font-semibold text-slate-700">In-person · {provider.location}.</span>{" "}
                Exact clinic address is shared after your booking is confirmed.
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