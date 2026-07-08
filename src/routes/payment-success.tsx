import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import {
  CalendarDays,
  Clock,
  Globe2,
  Video,
  Mail,
  ArrowRight,
  CalendarPlus,
  ArrowLeft,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { getProviderById, getServicesForProvider } from "@/lib/providers";

const searchSchema = z.object({
  providerId: z.string().optional(),
  serviceId: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  format: z.enum(["online", "in-person"]).optional(),
  email: z.string().optional(),
  name: z.string().optional(),
});

export const Route = createFileRoute("/payment-success")({
  validateSearch: (input: Record<string, unknown>) => {
    const result = searchSchema.safeParse(input);
    return result.success ? result.data : {};
  },
  component: PaymentSuccessPage,
  head: () => ({
    meta: [
      { title: "Booking confirmed — Lubin" },
      { name: "description", content: "Your session with your Lubin provider is booked." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function PaymentSuccessPage() {
  const search = Route.useSearch();
  const provider = search.providerId ? getProviderById(search.providerId) : undefined;
  const service = provider && search.serviceId
    ? getServicesForProvider(provider).find((s) => s.id === search.serviceId)
    : undefined;

  const dateLabel = search.date
    ? new Date(search.date + "T00:00:00").toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const fee = service ? Math.round(service.price * 0.05) : 0;
  const total = service ? service.price + fee : 0;

  // Parse "10:30 AM" → minutes since midnight
  const parseTime = (t?: string): number | null => {
    if (!t) return null;
    const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const mer = m[3].toUpperCase();
    if (mer === "PM" && h !== 12) h += 12;
    if (mer === "AM" && h === 12) h = 0;
    return h * 60 + min;
  };
  // Parse "1 hour 30 minutes" / "45 minutes" → minutes
  const parseDuration = (d?: string): number => {
    if (!d) return 60;
    const hMatch = d.match(/(\d+)\s*hour/);
    const mMatch = d.match(/(\d+)\s*minute/);
    return (hMatch ? parseInt(hMatch[1], 10) * 60 : 0) + (mMatch ? parseInt(mMatch[1], 10) : 0) || 60;
  };
  const toLabel = (mins: number): string => {
    const h24 = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    const mer = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h12}:${m.toString().padStart(2, "0")} ${mer}`;
  };

  const startMins = parseTime(search.time);
  const durationMins = service ? parseDuration(service.duration) : 60;
  const endLabel = startMins != null ? toLabel(startMins + durationMins) : "";
  const timeRangeLabel = startMins != null ? `${toLabel(startMins)} - ${endLabel}` : search.time || "";

  // Google Calendar link. Session is in PHT (UTC+8); convert to UTC.
  const buildGoogleCalUrl = (): string | null => {
    if (!search.date || startMins == null || !provider || !service) return null;
    const [y, mo, d] = search.date.split("-").map((n: string) => parseInt(n, 10));
    // PHT time as UTC minus 8 hours
    const startUtc = new Date(Date.UTC(y, mo - 1, d, 0, 0, 0) + (startMins - 8 * 60) * 60000);
    const endUtc = new Date(startUtc.getTime() + durationMins * 60000);
    const fmt = (dt: Date) =>
      dt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `${service.title} with ${provider.name}`,
      dates: `${fmt(startUtc)}/${fmt(endUtc)}`,
      details: `Your Lubin session with ${provider.name}.`,
      location: search.format === "in-person" ? provider.location : "Online (Lubin)",
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };
  const calendarUrl = buildGoogleCalUrl();

  return (
    <div className="min-h-screen bg-[#F9F8FF]" style={{ fontFamily: "Inter, sans-serif" }}>
      <Navbar />
      <main className="mx-auto w-full max-w-2xl px-4 pb-20 pt-24 sm:pt-28">
        {/* Header */}
        <div className="px-6 py-12 text-center sm:px-10">
          <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-white/60 backdrop-blur" />
            <span className="absolute inset-1.5 rounded-full bg-gradient-to-br from-white to-[#EAE7F5] shadow-[0_10px_30px_-12px_rgba(124,113,176,0.45)]" />
            <svg
              viewBox="0 0 48 48"
              fill="none"
              className="relative h-10 w-10 text-brand-purple"
              aria-hidden="true"
            >
              <circle
                cx="24"
                cy="24"
                r="21"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeOpacity="0.35"
              />
              <path
                d="M15 25.2 L21.5 31.2 L33.5 17.4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="mt-5 text-[10.5px] font-medium uppercase tracking-[0.28em] text-brand-purple-dark/80">
            Booking confirmed
          </p>
          <h1 className="mt-3 text-[32px] font-bold leading-tight tracking-tight text-slate-900 sm:text-[38px]">
            Your session is set.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[13.5px] leading-relaxed text-slate-500">
            We've sent a quiet confirmation and everything you'll need to{" "}
            <span className="font-semibold text-slate-900">
              {search.email || "your email"}
            </span>
            .
          </p>
        </div>

        {/* Booking details */}
        {provider && service && (
          <div className="px-6 py-6 sm:px-10">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-brand-purple to-brand-purple-dark text-[14px] font-bold text-white">
                {provider.initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-slate-900">
                  {provider.name}
                </p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-500">
                  {provider.bio}
                </p>
                <p className="mt-1 text-[12px] font-medium text-brand-purple-dark/80">
                  {service.title}
                </p>
              </div>
            </div>

            <ul className="mt-5 space-y-2.5 text-[13px] text-slate-600">
              <li className="flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5 text-brand-purple" />
                {dateLabel}
              </li>
              <li className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-brand-purple" />
                {timeRangeLabel} · {service.duration}
              </li>
              <li className="flex items-center gap-2">
                <Globe2 className="h-3.5 w-3.5 text-brand-purple" />
                Philippine Time (PHT, GMT+8)
              </li>
            </ul>

            <div className="my-5 border-t border-dashed border-[#E9E6FA]" />

            <dl className="space-y-2 text-[13px]">
              <div className="flex justify-between text-slate-600">
                <dt>Session</dt>
                <dd>₱{service.price.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between text-slate-600">
                <dt>Platform fee</dt>
                <dd>₱{fee.toLocaleString()}</dd>
              </div>
              <div className="flex items-baseline justify-between pt-2 text-slate-900">
                <dt className="text-[13px] font-semibold">Paid</dt>
                <dd className="text-[20px] font-bold">
                  ₱{total.toLocaleString()}
                </dd>
              </div>
            </dl>

            {/* Next steps */}
            <div className="mt-6 rounded-2xl border border-[#E9E6FA] bg-[#FBFAFF] p-4">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-[#A799E2]">
                What happens next
              </p>
              <ul className="mt-3 space-y-2.5 text-[13px] text-slate-600">
                <li className="flex items-start gap-2">
                  <Mail className="mt-0.5 h-3.5 w-3.5 flex-none text-brand-purple" />
                  We've emailed your receipt and session details.
                </li>
                <li className="flex items-start gap-2">
                  <CalendarDays className="mt-0.5 h-3.5 w-3.5 flex-none text-brand-purple" />
                  You'll get a reminder 24 hours before your session.
                </li>
                <li className="flex items-start gap-2">
                  <Video className="mt-0.5 h-3.5 w-3.5 flex-none text-brand-purple" />
                  You can reschedule up to 12 hours before start time.
                </li>
              </ul>
            </div>

            {/* Actions */}
            <div className="mt-6 space-y-3">
              {calendarUrl && (
                <a
                  href={calendarUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-purple to-brand-purple-dark px-5 py-3 text-[13px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(124,113,176,0.7)] transition-all hover:-translate-y-0.5"
                >
                  <CalendarPlus className="h-3.5 w-3.5" /> Add to Google Calendar
                </a>
              )}
              <Link
                to="/provider/$id"
                params={{ id: provider.id }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#E9E6FA] bg-white px-5 py-3 text-[13px] font-semibold text-brand-purple-dark transition-all hover:-translate-y-0.5 hover:bg-[#FBFAFF]"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to {provider.name.split(",")[0]}'s profile
              </Link>
              <Link
                to="/profile"
                className="inline-flex w-full items-center justify-center gap-2 text-[12.5px] font-medium text-slate-500 hover:text-brand-purple"
              >
                View my appointments <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
