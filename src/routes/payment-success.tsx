import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
  Pencil,
  Lock,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { getProviderById, getServicesForProvider, PROVIDERS, currencySymbol } from "@/lib/providers";
import GuestAccountPrompt from "@/components/GuestAccountPrompt";
import IntakeRequestCard from "@/components/intake/IntakeRequestCard";

import {
  bookingKeyFor,
  getPendingShare,
  clearPendingShare,
} from "@/lib/share/pendingShare";
import {
  createProviderGrant,
  getProviderGrant,
  revokeProviderGrant,
  subscribeProviderShares,
  type ProviderShareGrant,
} from "@/lib/share/providerShareStore";
import { buildSummary, mockSummary, INCLUDE_OPTIONS, type RangeKey, type SummaryData } from "@/lib/share/summary";
import ShareConsentModal from "@/components/share/ShareConsentModal";

const searchSchema = z.object({
  providerId: z.string().optional(),
  serviceId: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  format: z.enum(["online", "in-person"]).optional(),
  email: z.string().optional(),
  name: z.string().optional(),
  ref: z.string().optional(),
  promo: z.string().optional(),
  discountPct: z.coerce.number().optional(),
  bookingKey: z.string().optional(),
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
  const navigate = useNavigate();

  const handleViewAppointments = () => {
    const signedIn =
      typeof window !== "undefined" &&
      (window.localStorage.getItem("lubin.signedIn") === "1" ||
        !!window.localStorage.getItem("lubin.userName"));
    if (signedIn) {
      navigate({ to: "/profile", search: { tab: "appointments" } });
      return;
    }
    navigate({ to: "/auth", search: { redirect: "/profile?tab=appointments", mode: "signup" } });
  };


  const provider =
    (search.providerId ? getProviderById(search.providerId) : undefined) ?? PROVIDERS[0];
  const providerServices = getServicesForProvider(provider);
  const service =
    (search.serviceId ? providerServices.find((s) => s.id === search.serviceId) : undefined) ??
    providerServices[0];

  // ---- Appointment-linked Health Passport sharing ----
  const appointmentId = `booking-${search.ref ?? "session"}`;
  const [grant, setGrant] = useState<ProviderShareGrant | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareRange, setShareRange] = useState<RangeKey>("30d");
  const shareSummary = useMemo<SummaryData>(() => {
    const real = buildSummary(shareRange, { checkins: [] });
    return real.hasAnyData ? real : mockSummary();
  }, [shareRange]);

  useEffect(() => {
    // Activate any pending pre-payment selection now that the booking is confirmed.
    const effectiveKey =
      search.bookingKey ??
      (search.providerId && search.date && search.time
        ? bookingKeyFor(search.providerId, search.date, search.time)
        : null);
    if (effectiveKey) {
      const pending = getPendingShare(effectiveKey);
      if (pending && pending.includedKeys.length > 0 && !getProviderGrant(appointmentId)) {
        const filteredSummary = pending.attemptIds
          ? {
              ...shareSummary,
              attemptsInRange: shareSummary.attemptsInRange.filter((a) =>
                pending.attemptIds!.includes(a.id),
              ),
            }
          : shareSummary;
        createProviderGrant({
          appointmentId,
          providerId: pending.providerId,
          providerName: pending.providerName,
          appointmentLabel: pending.appointmentLabel,
          includedKeys: pending.includedKeys,
          healthFieldIds: pending.healthFieldIds,
          snapshot: filteredSummary,
        });
      }
      // Selection has now been either activated or the user chose not to share
      // anything — clear it either way so it doesn't linger.
      if (pending) clearPendingShare(effectiveKey);
    }
    const refresh = () => setGrant(getProviderGrant(appointmentId));
    refresh();
    return subscribeProviderShares(refresh);
  }, [appointmentId, search.bookingKey, search.providerId, search.date, search.time, shareSummary]);

  const effectiveDate =
    search.date ?? new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const effectiveTime = search.time ?? "10:30 AM";
  const dateLabel = effectiveDate
    ? new Date(effectiveDate + "T00:00:00").toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const symbol = provider ? currencySymbol(provider.currency) : "₱";
  const discountPct = search.discountPct ?? 0;
  const discount = service ? Math.round(service.price * (discountPct / 100)) : 0;
  const total = service ? Math.max(0, service.price - discount) : 0;

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

  const startMins = parseTime(effectiveTime);
  const durationMins = service ? parseDuration(service.duration) : 60;
  const endLabel = startMins != null ? toLabel(startMins + durationMins) : "";
  const timeRangeLabel = startMins != null ? `${toLabel(startMins)} - ${endLabel}` : effectiveTime;

  // Google Calendar link. Session is in PHT (UTC+8); convert to UTC.
  const buildGoogleCalUrl = (): string | null => {
    if (!effectiveDate || startMins == null || !provider || !service) return null;
    const [y, mo, d] = effectiveDate.split("-").map((n: string) => parseInt(n, 10));
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

  const providerShortName = provider ? provider.name.split(",")[0] : "your provider";
  const appointmentShortLabel = `${new Date(effectiveDate + "T00:00:00").toLocaleDateString(
    undefined,
    { weekday: "short", month: "short", day: "numeric" },
  )} · ${effectiveTime}`;
  const grantExpiresLabel = grant
    ? new Date(grant.expiresAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;
  const grantCreatedLabel = grant
    ? new Date(grant.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;

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
                <dd>{symbol}{service.price.toLocaleString()}</dd>
              </div>
              {search.promo && discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <dt>Promo ({search.promo}) −{discountPct}%</dt>
                  <dd>−{symbol}{discount.toLocaleString()}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between pt-2 text-slate-900">
                <dt className="text-[13px] font-semibold">{total === 0 ? "Total" : "Paid"}</dt>
                <dd className="text-[20px] font-bold">
                  {symbol}{total.toLocaleString()}
                </dd>
              </div>
            </dl>

            {/* Session prep — surfaced first so it's seen right away */}
            {provider && (
              <div className="mt-5">
                <IntakeRequestCard
                  appointmentId={appointmentId}
                  providerName={providerShortName}
                  sessionLabel={service?.title}
                />
              </div>
            )}

            {/* Health Passport sharing — placed below session prep */}
            {grant ? (
              <section className="mt-5 overflow-hidden rounded-2xl border border-[#7E6BAF]/20 bg-white shadow-sm">
                <div className="p-4">
                  {/* Header row */}
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="text-base font-bold tracking-tight text-[#2D264B]">
                      Shared Access
                    </h2>
                    <span className="inline-flex items-center gap-1 rounded-md border border-[#7E6BAF]/20 bg-[#F8F7FB] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#7E6BAF]">
                      Expires {grantExpiresLabel}
                    </span>
                  </div>

                  {/* Shared items list */}
                  <div className="space-y-1.5">
                    {INCLUDE_OPTIONS.filter((o) => grant.includedKeys.includes(o.key)).map((o) => (
                      <div
                        key={o.key}
                        className="group flex items-start gap-2.5 rounded-xl border border-[#F8F7FB] bg-[#F8F7FB]/50 p-2.5 transition-all hover:border-[#7E6BAF]/30 hover:bg-white hover:shadow-sm"
                      >
                        <div className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-[#7E6BAF] ring-2 ring-[#7E6BAF]/10" />
                        <div>
                          <p className="text-[13px] font-semibold text-[#2D264B]">{o.label}</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-[#7E6BAF]">
                            {o.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="mt-3 flex flex-col gap-1.5">
                    <Link
                      to="/my-health-passport"
                      search={{ tab: "share", share: appointmentId }}
                      className="inline-flex w-full items-center justify-center rounded-xl bg-[#4A3E7F] px-4 py-2.5 text-[13px] font-semibold text-white shadow-md shadow-[#4A3E7F]/10 transition hover:bg-[#2D264B] active:scale-[0.98]"
                    >
                      Manage Permissions
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          typeof window !== "undefined" &&
                          !window.confirm(
                            `Revoke ${providerShortName}'s access to your Health Passport?`,
                          )
                        )
                          return;
                        revokeProviderGrant(appointmentId);
                      }}
                      className="inline-flex w-full items-center justify-center rounded-xl border border-[#7E6BAF]/30 bg-white px-4 py-2.5 text-[13px] font-semibold text-[#4A3E7F] transition hover:bg-[#F8F7FB] active:scale-[0.98]"
                    >
                      Revoke All Access
                    </button>
                  </div>

                  {/* Footer note */}
                  <div className="mt-2.5 rounded-lg border border-dashed border-[#7E6BAF]/30 bg-[#F8F7FB] p-2">
                    <p className="text-center text-[10px] leading-normal text-[#7E6BAF]">
                      Helps your provider prepare for your session. You can adjust these settings
                      at any time.
                    </p>
                  </div>
                </div>
              </section>
            ) : (
              <section className="mt-6 rounded-2xl border border-[#D3C8EE] bg-[#F7F4FC] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7E6BAF]">
                  Health Passport
                </p>
                <h3 className="mt-1.5 text-[15px] font-semibold text-slate-900">
                  Share your Health Passport with {providerShortName}?
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[#5A4A8A]">
                  You can choose whether to share anything with {providerShortName} for this
                  appointment.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShareOpen(true)}
                    className="inline-flex items-center gap-2 rounded-[12px] bg-[#7C69BA] px-4 py-2 text-[12.5px] font-semibold text-white shadow-[0_10px_20px_-10px_rgba(124,105,186,0.55)] transition hover:-translate-y-0.5 hover:bg-[#6857A3]"
                  >
                    Choose what to share
                  </button>
                  <span className="inline-flex items-center gap-1.5 text-[11.5px] text-[#6B6684]">
                    <Lock className="h-3 w-3" /> Optional — you can also do this later.
                  </span>
                </div>
                <p className="mt-2 text-[11.5px] text-[#6B6684]">
                  Nothing will be shared unless you review and confirm it.
                </p>
              </section>
            )}

            <div className="mt-5">
              <GuestAccountPrompt
                email={search.email}
                scopeKey={`booking:${provider?.id ?? "unknown"}:${effectiveDate}:${effectiveTime}`}
                contextLabel="save this booking"
                variant="compact"
              />
            </div>

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
                  {!grant && (
                    <span className="ml-1 text-[12px] text-[#6B6684]">
                      Want to help {providerShortName} prepare? You can choose parts of
                      your Health Passport to share before your session.
                    </span>
                  )}
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
              <button
                type="button"
                onClick={handleViewAppointments}
                className="inline-flex w-full items-center justify-center gap-2 text-[12.5px] font-medium text-slate-500 hover:text-brand-purple"
              >
                View my appointments <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </main>

      {shareOpen && provider && (

        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShareOpen(false)}
        >
          <div
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <ShareConsentModal
              open={shareOpen}
              summary={shareSummary}
              onRangeChange={setShareRange}
              providerContext={{
                providerName: provider.name,
                providerRole: `${provider.title.split(",")[0].trim()}${provider.verified ? " · Verified provider" : ""}`,
                appointmentLabel: appointmentShortLabel,
                appointmentDate: dateLabel,
              }}
              onConfirm={(r) => {
                if (r.includedKeys.length > 0) {
                  const filteredSnap = r.attemptIds
                    ? {
                        ...shareSummary,
                        attemptsInRange: shareSummary.attemptsInRange.filter(
                          (a) => r.attemptIds!.includes(a.id),
                        ),
                      }
                    : shareSummary;
                  createProviderGrant({
                    appointmentId,
                    providerId: provider.id,
                    providerName: provider.name,
                    appointmentLabel: appointmentShortLabel,
                    includedKeys: r.includedKeys,
                    healthFieldIds: r.healthFieldIds,
                    snapshot: filteredSnap,
                  });
                }
                setShareOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
