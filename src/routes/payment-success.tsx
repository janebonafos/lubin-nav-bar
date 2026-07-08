import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import {
  CalendarDays,
  Clock,
  Globe2,
  MapPin,
  Video,
  Mail,
  Download,
  ArrowRight,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { getProviderById, getServicesForProvider } from "@/lib/providers";

const searchSchema = z.object({
  providerId: z.string(),
  serviceId: z.string(),
  date: z.string(),
  time: z.string(),
  format: z.enum(["online", "in-person"]),
  email: z.string().optional(),
  name: z.string().optional(),
  ref: z.string().optional(),
});

export const Route = createFileRoute("/payment-success")({
  validateSearch: (input: Record<string, unknown>) => searchSchema.parse(input),
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
  const provider = getProviderById(search.providerId);
  const service = provider
    ? getServicesForProvider(provider).find((s) => s.id === search.serviceId)
    : undefined;

  const dateLabel = new Date(search.date + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const ref =
    search.ref ||
    "LBN-" + Math.random().toString(36).slice(2, 8).toUpperCase();

  const fee = service ? Math.round(service.price * 0.05) : 0;
  const total = service ? service.price + fee : 0;

  return (
    <div className="min-h-screen bg-[#F9F8FF]" style={{ fontFamily: "Inter, sans-serif" }}>
      <Navbar />
      <main className="mx-auto w-full max-w-2xl px-4 pb-20 pt-24 sm:pt-28">
        <div className="overflow-hidden rounded-3xl border border-[#E9E6FA] bg-white shadow-[0_20px_60px_-30px_rgba(124,113,176,0.35)]">
          {/* Header */}
          <div className="relative bg-gradient-to-br from-[#F3F0FF] via-[#EAE7F5] to-white px-6 py-12 text-center sm:px-10">
            <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-brand-purple/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-brand-purple-dark/10 blur-3xl" />
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
            <p className="relative mt-5 text-[10.5px] font-medium uppercase tracking-[0.28em] text-brand-purple-dark/80">
              Booking confirmed
            </p>
            <h1
              className="relative mt-3 text-[32px] leading-tight tracking-tight text-slate-900 sm:text-[38px]"
              style={{ fontFamily: '"Playfair Display", "Times New Roman", serif', fontWeight: 600 }}
            >
              Your session is set.
            </h1>
            <p className="relative mx-auto mt-3 max-w-md text-[13.5px] leading-relaxed text-slate-500">
              We've sent a quiet confirmation and everything you'll need to{" "}
              <span className="font-medium text-slate-700">
                {search.email || "your email"}
              </span>
              .
            </p>
            <p className="relative mt-4 text-[10.5px] font-mono uppercase tracking-[0.25em] text-slate-400">
              Reference · {ref}
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
                    {service.title}
                  </p>
                  <p className="mt-0.5 truncate text-[12.5px] text-slate-500">
                    with {provider.name}
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
                  {search.time} · {service.duration}
                </li>
                <li className="flex items-center gap-2">
                  <Globe2 className="h-3.5 w-3.5 text-brand-purple" />
                  Philippine Time (PHT, GMT+8)
                </li>
                <li className="flex items-start gap-2">
                  {search.format === "online" ? (
                    <Video className="mt-0.5 h-3.5 w-3.5 flex-none text-brand-purple" />
                  ) : (
                    <MapPin className="mt-0.5 h-3.5 w-3.5 flex-none text-brand-purple" />
                  )}
                  <span>
                    {search.format === "online" ? (
                      <>
                        <span className="font-semibold text-slate-700">Online (video).</span>{" "}
                        Your secure link is in your confirmation email.
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-slate-700">
                          In-person · {provider.location}.
                        </span>{" "}
                        Exact address shared in your confirmation email.
                      </>
                    )}
                  </span>
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
              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  to="/profile"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-purple to-brand-purple-dark px-5 py-3 text-[13px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(124,113,176,0.7)] transition-all hover:-translate-y-0.5"
                >
                  View my appointments <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E9E6FA] bg-white px-4 py-3 text-[13px] font-semibold text-slate-700 hover:bg-[#F9F8FF]"
                >
                  <Download className="h-3.5 w-3.5" /> Receipt
                </button>
              </div>
              <div className="mt-3 text-center">
                <Link
                  to="/find-provider"
                  className="text-[12.5px] font-medium text-slate-500 hover:text-brand-purple"
                >
                  Browse more providers →
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}