import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowLeft,
  BadgeCheck,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe2,
  Heart,
  MessageCircle,
  MapPin,
  Sparkles,
  Star,
  User,
  Video,
  X,
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
            <Link
              to="/find-provider"
              className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:text-brand-purple"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to providers
            </Link>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[auto_1fr_auto] lg:items-start">
              {/* Avatar */}
              <div className="relative flex-none">
                <div
                  aria-hidden
                  className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-brand-purple/30 via-brand-purple-accent/20 to-transparent blur-xl"
                />
                <div className="relative flex h-32 w-32 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-brand-purple to-brand-purple-dark text-[38px] font-bold text-white shadow-[0_24px_50px_-14px_rgba(124,113,176,0.6)] ring-4 ring-white sm:h-40 sm:w-40 sm:text-[44px]">
                  {provider.initials}
                </div>
                {provider.verified && (
                  <span className="absolute -bottom-1.5 -right-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-[#E9E6FA]">
                    <BadgeCheck className="h-5 w-5 text-brand-purple-accent" />
                  </span>
                )}
              </div>

              {/* Identity */}
              <div className="min-w-0 flex-1">
                <h1 className="font-serif-display text-[32px] font-semibold leading-[1.05] tracking-tight text-slate-900 sm:text-[44px]">
                  {provider.name}
                </h1>
                <p className="mt-2 text-[15px] font-medium text-brand-purple">{provider.title}</p>

                {provider.expertise && (
                  <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-[13px] font-semibold text-brand-purple ring-1 ring-inset ring-brand-purple/15 backdrop-blur">
                    <Sparkles className="h-3.5 w-3.5" />
                    {provider.expertise}
                  </p>
                )}

                <p className="font-serif-display mt-5 max-w-2xl text-[18px] italic leading-relaxed text-slate-600">
                  &ldquo;{provider.bio}&rdquo;
                </p>

                {/* Tags */}
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {provider.tags.map((t: string) => (
                    <span
                      key={t}
                      className="rounded-full bg-white px-3 py-1 text-[12px] font-medium text-slate-700 ring-1 ring-inset ring-[#E9E6FA] shadow-sm"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Stat card */}
              <aside className="w-full overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-[0_30px_60px_-30px_rgba(124,113,176,0.4)] backdrop-blur lg:w-80">
                {/* Rating header */}
                <div className="flex items-center justify-between gap-3 bg-gradient-to-br from-[#F6F3FF] to-[#EFEAFE] px-5 py-4">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-serif-display text-[28px] font-bold leading-none tracking-tight text-slate-900">
                      {provider.rating}
                    </span>
                    <span className="text-[12px] font-medium text-slate-500">/ 5</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex gap-0.5">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <Star
                          key={i}
                          className="h-3.5 w-3.5 fill-brand-purple-accent text-brand-purple-accent"
                        />
                      ))}
                    </div>
                    <span className="mt-1 text-[11px] font-medium text-slate-500">
                      {provider.reviews} reviews
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-3 px-5 py-5 text-[13px]">
                  {[
                    { Icon: MapPin, text: provider.location },
                    { Icon: User, text: provider.practice },
                    { Icon: Globe2, text: "English · Filipino" },
                    { Icon: Heart, text: "Accepting new clients" },
                  ].map(({ Icon, text }) => (
                    <div key={text} className="flex items-center gap-3 text-slate-700">
                      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-[#F3F0FF] text-brand-purple">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="font-medium">{text}</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="space-y-2 border-t border-[#EFEBFA] bg-white/60 px-5 py-4">
                  <a
                    href="#services"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-purple to-brand-purple-dark px-4 py-3 text-[13px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(124,113,176,0.7)] transition-all hover:-translate-y-0.5 active:scale-95"
                  >
                    <Calendar className="h-4 w-4" />
                    Book a session
                  </a>
                  <button
                    type="button"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E9E6FA] bg-white px-4 py-3 text-[13px] font-semibold text-slate-700 transition-colors hover:border-brand-purple/30 hover:text-brand-purple"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Message
                  </button>
                </div>
              </aside>
            </div>
          </div>
        </section>

        {/* Services */}
        <section id="services" className="mx-auto mt-14 w-full max-w-6xl px-4 scroll-mt-24">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F3F0FF] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-purple">
                <Sparkles className="h-3 w-3" />
                Sessions
              </span>
              <h2 className="font-serif-display mt-3 text-[28px] font-semibold tracking-tight text-slate-900 sm:text-[36px]">
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
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-[#F3F0FF] to-white text-brand-purple ring-1 ring-inset ring-brand-purple/15">
          <Sparkles className="h-4 w-4" />
        </span>
        <h3 className="font-serif-display pt-1 text-[20px] font-semibold leading-snug text-slate-900">
          {service.title}
        </h3>
      </div>

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

      {/* Meta pills */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F0FF] px-2.5 py-1 text-[11.5px] font-semibold text-brand-purple ring-1 ring-inset ring-brand-purple/10">
          <User className="h-3 w-3" />
          {service.sessionType}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11.5px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200/70">
          <Clock className="h-3 w-3 text-[#A799E2]" />
          {service.duration}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11.5px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200/70">
          <Video className="h-3 w-3 text-[#A799E2]" />
          Online · In-person
        </span>
      </div>

      {/* Price + CTA */}
      <div className="mt-auto grid grid-cols-[1fr_auto] items-center gap-3 border-t border-dashed border-[#E9E6FA] pt-5 mt-5">
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
  const [confirmed, setConfirmed] = useState(false);

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

  if (confirmed) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F3F0FF]">
            <CheckCircle2 className="h-7 w-7 text-brand-purple" />
          </div>
          <h3 className="mt-4 text-[18px] font-bold text-slate-900">Session booked</h3>
          <p className="mt-2 text-[13.5px] leading-relaxed text-slate-500">
            <span className="font-semibold text-slate-700">{service.title}</span> with{" "}
            <span className="font-semibold text-slate-700">{provider.name}</span> on{" "}
            <span className="font-semibold text-slate-700">
              {selectedDate?.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>{" "}
            at <span className="font-semibold text-slate-700">{selectedTime}</span> is
            confirmed.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full rounded-xl bg-gradient-to-br from-brand-purple to-brand-purple-dark px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_18px_-8px_rgba(124,113,176,0.6)] transition-all hover:-translate-y-0.5 active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

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
                    className={`aspect-square rounded-lg text-[13px] font-medium transition-colors ${
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
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#A799E2]">
                Available times
              </h4>
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
            onClick={() => setConfirmed(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-brand-purple to-brand-purple-dark px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_18px_-8px_rgba(124,113,176,0.6)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-8px_rgba(124,113,176,0.85)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Confirm booking
          </button>
        </div>
      </div>
    </div>
  );
}