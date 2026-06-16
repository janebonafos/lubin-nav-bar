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
        {/* Hero — Indigo Trust Card */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#EFEAFF_0%,_#F9F8FF_55%,_#FFFFFF_100%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-purple/10 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-32 left-10 h-72 w-72 rounded-full bg-brand-purple-accent/15 blur-3xl"
          />

          <div className="relative mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
            <Link
              to="/find-provider"
              className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:text-brand-purple"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to providers
            </Link>

            <div className="overflow-hidden rounded-3xl border border-indigo-50 bg-white shadow-[0_24px_60px_-20px_rgba(115,113,252,0.18)]">
              <div className="flex flex-col md:flex-row">
                {/* LEFT: Identity column */}
                <div className="border-b border-indigo-100/60 bg-[#F5F2FE]/60 p-10 md:w-2/5 md:border-b-0 md:border-r">
                  <div className="relative mx-auto mb-8 h-56 w-56">
                    <div className="flex h-full w-full items-center justify-center rounded-[2.5rem] bg-gradient-to-br from-brand-purple to-brand-purple-dark text-[52px] font-bold text-white shadow-xl ring-8 ring-white">
                      {provider.initials}
                    </div>
                  </div>

                  <div className="space-y-3 text-center">
                    <h1 className="font-serif-display text-[28px] font-semibold leading-tight tracking-tight text-slate-900">
                      {provider.name}
                    </h1>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-brand-purple">
                      {provider.title}
                    </p>
                    <div className="flex items-center justify-center gap-1.5 pt-1">
                      <Star className="h-4 w-4 fill-[#C4A35A] text-[#C4A35A]" />
                      <span className="text-[14px] font-bold text-slate-900">
                        {provider.rating}
                      </span>
                      <span className="text-[13px] font-normal text-slate-500">
                        ({provider.reviews} reviews)
                      </span>
                    </div>
                  </div>

                  <div className="mt-10 space-y-4">
                    <div className="rounded-2xl border border-indigo-100 bg-white/80 p-5">
                      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                        Experience
                      </p>
                      <p className="text-[14.5px] font-semibold text-slate-800">
                        {provider.experience}+ Years Clinical Practice
                      </p>
                    </div>
                    <div className="rounded-2xl border border-indigo-100 bg-white/80 p-5">
                      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                        Location
                      </p>
                      <p className="text-[14.5px] font-semibold text-slate-800">
                        {provider.location}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-indigo-100 bg-white/80 p-5">
                      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                        Languages
                      </p>
                      <p className="text-[14.5px] font-semibold text-slate-800">
                        {provider.languages.join(", ")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* RIGHT: Details + Booking */}
                <div className="flex-1 space-y-10 p-10 md:p-14">
                  <div className="flex flex-wrap items-center gap-2">
                    {provider.verified && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-purple">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        Verified Provider
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                      <Shield className="h-3 w-3" />
                      Licensed & Insured
                    </span>
                  </div>

                  <section>
                    <h3 className="mb-4 text-[16px] font-bold text-slate-900">About</h3>
                    <p className="text-[15px] leading-relaxed text-slate-600">
                      {provider.expertise && (
                        <span className="font-medium text-[#3D2E6B] border-b-2 border-[#E9E4F5]">
                          {provider.expertise}.{" "}
                        </span>
                      )}
                      {provider.bio}
                    </p>
                  </section>

                  <section>
                    <h3 className="mb-4 text-[16px] font-bold text-slate-900">Specialties</h3>
                    <div className="flex flex-wrap gap-2.5">
                      {provider.tags.map((t: string) => (
                        <span
                          key={t}
                          className="rounded-full border border-indigo-100 bg-indigo-50 px-5 py-2 text-[13px] font-medium text-brand-purple-dark"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </section>

                  {/* Brand booking CTA block */}
                  <div className="flex flex-col items-stretch gap-5 rounded-3xl bg-gradient-to-br from-brand-purple-dark to-brand-purple p-7 text-white sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="mb-1 text-[11px] font-medium uppercase tracking-widest text-brand-lavender/70">
                        Starting at
                      </p>
                      <p className="text-[22px] font-bold leading-none">
                        {services[0] ? (
                          <>
                            ₱{services[0].price.toLocaleString()}{" "}
                            <span className="text-[13px] font-normal text-brand-lavender/70">
                              / {services[0].duration}
                            </span>
                          </>
                        ) : (
                          <span className="text-[15px] font-normal text-brand-lavender/80">
                            Sessions available
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-col items-stretch gap-3 sm:items-end">
                      {provider.nextAvailable && (
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2 w-2 shrink-0">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                          </span>
                          <span className="whitespace-nowrap text-[12.5px] text-brand-lavender/80">
                            Next available:{" "}
                            <span className="font-semibold text-white">
                              {provider.nextAvailable}
                            </span>
                          </span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setBookingService(services[0] ?? null)}
                        disabled={services.length === 0}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-[13.5px] font-bold text-brand-purple-dark shadow-lg shadow-brand-purple-dark/30 transition-all hover:-translate-y-0.5 hover:bg-brand-lavender active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Calendar className="h-4 w-4" />
                        Book Session
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 border-t border-indigo-50 pt-6">
                    <div className="flex h-9 items-center gap-1.5 rounded-full bg-indigo-50 px-3.5 text-[12px] font-semibold text-brand-purple">
                      <Shield className="h-3.5 w-3.5" />
                      Secure & confidential
                    </div>
                    <p className="text-[13px] text-slate-500">
                      Verified by{" "}
                      <span className="font-semibold text-slate-700">Lubin</span> · Background-checked & credentialed
                    </p>
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