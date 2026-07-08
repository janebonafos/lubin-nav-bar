import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import {
  XCircle,
  CalendarDays,
  Clock,
  Globe2,
  MapPin,
  Video,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  LifeBuoy,
  Mail,
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
  code: z.string().optional(),
});

export const Route = createFileRoute("/payment-failed")({
  validateSearch: (input: Record<string, unknown>) => searchSchema.parse(input),
  component: PaymentFailedPage,
  head: () => ({
    meta: [
      { title: "Payment unsuccessful — Lubin" },
      {
        name: "description",
        content: "Your payment couldn't be completed. Your session slot is held while you try again.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function PaymentFailedPage() {
  const search = Route.useSearch();
  const provider = getProviderById(search.providerId);
  const service = provider
    ? getServicesForProvider(provider).find((s) => s.id === search.serviceId)
    : undefined;

  const dateLabel = new Date(search.date + "T00:00:00").toLocaleDateString(
    undefined,
    {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    },
  );

  const ref =
    search.ref || "LBN-" + Math.random().toString(36).slice(2, 8).toUpperCase();

  const fee = service ? Math.round(service.price * 0.05) : 0;
  const total = service ? service.price + fee : 0;

  return (
    <div
      className="min-h-screen bg-[#F9F8FF]"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <Navbar />
      <main className="mx-auto w-full max-w-2xl px-4 pb-20 pt-24 sm:pt-28">
        <div className="overflow-hidden rounded-3xl border border-[#E9E6FA] bg-white shadow-[0_20px_60px_-30px_rgba(124,113,176,0.35)]">
          {/* Header */}
          <div className="relative bg-gradient-to-br from-red-50 via-[#FCE9E9] to-white px-6 py-10 text-center sm:px-10">
            <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-red-300/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-red-400/10 blur-3xl" />
            <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-md ring-8 ring-red-50">
              <XCircle className="h-9 w-9 text-red-600" />
            </div>
            <p className="relative mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-red-700 backdrop-blur">
              <ShieldAlert className="h-3 w-3" /> Payment unsuccessful
            </p>
            <h1 className="relative mt-3 text-[28px] font-semibold tracking-tight text-slate-900 sm:text-[32px]">
              We couldn't complete your payment
            </h1>
            <p className="relative mt-2 text-[14px] text-slate-500">
              Your card was not charged. Your session slot is held for{" "}
              <span className="font-semibold text-slate-700">10 minutes</span>{" "}
              while you retry.
            </p>
            <p className="relative mt-3 text-[11.5px] font-mono uppercase tracking-widest text-slate-400">
              Ref · {ref}
              {search.code ? ` · ${search.code}` : ""}
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
                      <span className="font-semibold text-slate-700">
                        Online (video)
                      </span>
                    ) : (
                      <span className="font-semibold text-slate-700">
                        In-person · {provider.location}
                      </span>
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
                  <dt className="text-[13px] font-semibold">Amount due</dt>
                  <dd className="text-[20px] font-bold">
                    ₱{total.toLocaleString()}
                  </dd>
                </div>
              </dl>

              {/* Why this happened */}
              <div className="mt-6 rounded-2xl border border-red-100 bg-red-50/50 p-4">
                <p className="text-[12px] font-semibold uppercase tracking-wider text-red-700">
                  Common reasons
                </p>
                <ul className="mt-3 space-y-2 text-[13px] text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-red-400" />
                    Your bank declined the charge or flagged it as unusual.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-red-400" />
                    Insufficient funds or a hit daily/online limit.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-red-400" />
                    Card details entered incorrectly, or the card has expired.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-red-400" />
                    A network interruption during authorization.
                  </li>
                </ul>
                <p className="mt-3 text-[11.5px] leading-relaxed text-slate-500">
                  The exact reason is only shared with your bank. If retrying
                  doesn't work, please contact your card issuer.
                </p>
              </div>

              {/* Actions */}
              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  to="/checkout"
                  search={{
                    providerId: search.providerId,
                    serviceId: search.serviceId,
                    date: search.date,
                    time: search.time,
                    format: search.format,
                  }}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-purple to-brand-purple-dark px-5 py-3 text-[13px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(124,113,176,0.7)] transition-all hover:-translate-y-0.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Try payment again
                </Link>
                <Link
                  to="/provider/$id"
                  params={{ id: provider.id }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E9E6FA] bg-white px-4 py-3 text-[13px] font-semibold text-slate-700 hover:bg-[#F9F8FF]"
                >
                  Pick another time <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#FBFAFF] px-4 py-3 text-[12px] text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-brand-purple" />
                  {search.email ? (
                    <>
                      We'll email{" "}
                      <span className="font-semibold text-slate-700">
                        {search.email}
                      </span>{" "}
                      if the charge later clears.
                    </>
                  ) : (
                    <>No charge was made to your card.</>
                  )}
                </span>
                <a
                  href="mailto:support@lubin.ai"
                  className="inline-flex items-center gap-1.5 font-semibold text-brand-purple hover:underline"
                >
                  <LifeBuoy className="h-3.5 w-3.5" /> Contact support
                </a>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}