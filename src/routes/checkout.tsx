import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Globe2,
  Lock,
  MapPin,
  Pencil,
  ShieldCheck,
  User as UserIcon,
  Video,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { getProviderById, getServicesForProvider, currencySymbol, paymentGatewayName } from "@/lib/providers";
import ShareConsentModal from "@/components/share/ShareConsentModal";
import { buildSummary, mockSummary } from "@/lib/share/summary";
import {
  bookingKeyFor,
  getPendingShare,
  setPendingShare,
  clearPendingShare,
  type PendingShare,
} from "@/lib/share/pendingShare";
import { useEffect } from "react";

const searchSchema = z.object({
  providerId: z.string(),
  serviceId: z.string(),
  date: z.string(), // YYYY-MM-DD
  time: z.string(),
  format: z.enum(["online", "in-person"]),
});

export const Route = createFileRoute("/checkout")({
  validateSearch: (input: Record<string, unknown>) => searchSchema.parse(input),
  component: CheckoutPage,
  head: () => ({
    meta: [
      { title: "Checkout — Lubin" },
      { name: "description", content: "Securely pay for your booked session." },
    ],
  }),
  errorComponent: ({ reset }) => (
    <div className="min-h-screen bg-[#F9F8FF]">
      <Navbar />
      <main className="mx-auto max-w-xl px-4 pb-16 pt-32 text-center">
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
  notFoundComponent: () => (
    <div className="min-h-screen bg-[#F9F8FF]">
      <Navbar />
      <main className="mx-auto max-w-xl px-4 pb-16 pt-32 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Booking not found</h1>
        <Link
          to="/find-provider"
          className="mt-6 inline-flex rounded-xl bg-brand-purple px-5 py-2.5 text-[13px] font-semibold text-white"
        >
          Back to providers
        </Link>
      </main>
    </div>
  ),
});

function CheckoutPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  const provider = getProviderById(search.providerId);
  const service = useMemo(() => {
    if (!provider) return undefined;
    return getServicesForProvider(provider).find((s) => s.id === search.serviceId);
  }, [provider, search.serviceId]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [simulateFail, setSimulateFail] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ code: string; percent: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [pending, setPending] = useState<PendingShare | null>(null);
  const [consent, setConsent] = useState(false);
  const [localCheckins, setLocalCheckins] = useState<
    { id: string; mood: number; note: string; date: string }[]
  >([]);

  const bookingKey = useMemo(
    () => bookingKeyFor(search.providerId, search.date, search.time),
    [search.providerId, search.date, search.time],
  );

  useEffect(() => {
    setPending(getPendingShare(bookingKey));
  }, [bookingKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("lubinai_checkins");
      if (raw) setLocalCheckins(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  // Build a summary snapshot for the modal (uses local check-ins if available,
  // otherwise falls back to the mock so the user can preview categories).
  const shareSummary = useMemo(() => {
    const real = buildSummary("30d", { checkins: localCheckins });
    return real.hasAnyData ? real : mockSummary();
  }, [localCheckins]);

  if (!provider || !service) {
    return (
      <div className="min-h-screen bg-[#F9F8FF]">
        <Navbar />
        <main className="mx-auto max-w-xl px-4 pb-16 pt-32 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Booking not found</h1>
          <p className="mt-2 text-slate-500">
            We couldn't load this session. It may have been removed.
          </p>
          <Link
            to="/find-provider"
            className="mt-6 inline-flex rounded-xl bg-brand-purple px-5 py-2.5 text-[13px] font-semibold text-white"
          >
            Back to providers
          </Link>
        </main>
      </div>
    );
  }

  const dateObj = new Date(search.date + "T00:00:00");
  const dateLabel = dateObj.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const shortDateLabel = dateObj.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const appointmentLabel = `${shortDateLabel} · ${search.time}`;
  const appointmentDate = dateObj.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const symbol = currencySymbol(provider.currency);
  const gatewayName = paymentGatewayName(provider.paymentGateway);
  const discount = promo ? Math.round(service.price * (promo.percent / 100)) : 0;
  const total = Math.max(0, service.price - discount);
  const isFree = total === 0;

  // In production this map lives on the server. `expiresAt` is an ISO date;
  // a code is expired if today is past that date.
  const PROMO_CODES: Record<string, { percent: number; expiresAt?: string }> = {
    LUBIN10: { percent: 10 },
    WELCOME20: { percent: 20 },
    FREESESSION: { percent: 100 },
  };

  const applyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    const entry = PROMO_CODES[code];
    if (!entry) {
      setPromo(null);
      setPromoError("That promo code isn't valid.");
      return;
    }
    if (entry.expiresAt && new Date(entry.expiresAt) < new Date(new Date().toDateString())) {
      setPromo(null);
      setPromoError("This promo code has expired.");
      return;
    }
    setPromo({ code, percent: entry.percent });
    setPromoError(null);
  };

  const canPay = name.trim().length > 1 && /.+@.+\..+/.test(email) && consent;

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPay) return;
    setProcessing(true);
    // TODO: replace with real Stripe Checkout session redirect once Stripe is enabled.
    setTimeout(() => {
      setProcessing(false);
      if (simulateFail && !isFree) {
        const ref =
          "LBN-" + Math.random().toString(36).slice(2, 8).toUpperCase();
        navigate({
          to: "/payment-failed",
          search: {
            providerId: search.providerId,
            serviceId: search.serviceId,
            date: search.date,
            time: search.time,
            format: search.format,
            email,
            name,
            ref,
            code: "payment_declined",
          },
        });
      } else {
        const ref =
          "LBN-" + Math.random().toString(36).slice(2, 8).toUpperCase();
        navigate({
          to: "/payment-success",
          search: {
            providerId: search.providerId,
            serviceId: search.serviceId,
            date: search.date,
            time: search.time,
            format: search.format,
            email,
            name,
            ref,
            promo: promo?.code,
            discountPct: promo?.percent,
            bookingKey,
          },
        });
      }
    }, 900);
  };

  return (
    <div className="min-h-screen bg-[#F9F8FF]" style={{ fontFamily: "Inter, sans-serif" }}>
      <Navbar />
      <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-24 sm:pt-28">
        <Link
          to="/provider/$id"
          params={{ id: provider.id }}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:text-brand-purple"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to provider
        </Link>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
          {/* Payment form */}
          <form
            onSubmit={handlePay}
            className="rounded-3xl border border-[#E9E6FA] bg-white p-6 shadow-sm sm:p-8"
          >
            <div className="flex items-center gap-2 text-brand-purple">
              <Lock className="h-4 w-4" />
              <span className="text-[12px] font-semibold uppercase tracking-wider">
                Secure checkout
              </span>
            </div>
            <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-slate-900">
              Complete your booking
            </h1>
            <p className="mt-1.5 text-[13.5px] text-slate-500">
              We'll send your session details and receipt to the email below.
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-[12px] font-semibold text-slate-700">Full name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Juan dela Cruz"
                  className="mt-1.5 block w-full rounded-xl border border-[#E9E6FA] bg-white px-3.5 py-2.5 text-[14px] text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand-purple focus:ring-4 focus:ring-brand-purple/10"
                />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-slate-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="mt-1.5 block w-full rounded-xl border border-[#E9E6FA] bg-white px-3.5 py-2.5 text-[14px] text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand-purple focus:ring-4 focus:ring-brand-purple/10"
                />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-slate-700">
                  Anything your provider should know? <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Share a quick context for your session…"
                  className="mt-1.5 block w-full resize-none rounded-xl border border-[#E9E6FA] bg-white px-3.5 py-2.5 text-[14px] text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand-purple focus:ring-4 focus:ring-brand-purple/10"
                />
              </div>
            </div>

            {/* Health Passport sharing — compact option inside the checkout form */}
            <div
              className={`group relative mt-4 overflow-hidden rounded-2xl border p-5 transition ${
                pending && pending.includedKeys.length > 0
                  ? "border-[#C9BBEA] bg-gradient-to-br from-[#F7F3FE] via-white to-[#F3EEFB] shadow-[0_10px_28px_-18px_rgba(74,62,127,0.35)]"
                  : "border-[#E5DEF5] bg-gradient-to-br from-[#FAF7FE] to-white"
              }`}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#7E6BAF]/10 blur-3xl"
              />
              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[14px] font-semibold text-[#2D245A]">
                      Share from your Health Passport
                    </h3>
                    <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-purple ring-1 ring-[#E1DAF1]">
                      Optional
                    </span>
                  </div>
                  {pending && pending.includedKeys.length > 0 ? (
                    <>
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#EFE8FB] px-2.5 py-0.5 text-[11.5px] font-semibold text-brand-purple">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Sharing added
                      </div>
                      <p className="mt-2 text-[12.5px] leading-relaxed text-[#5A4A8A]">
                        <span className="font-semibold text-[#3D2E6B]">
                          {pending.includedKeys.length} item
                          {pending.includedKeys.length === 1 ? "" : "s"}
                        </span>{" "}
                        will be shared with{" "}
                        <span className="font-semibold text-[#3D2E6B]">
                          {provider.name.split(",")[0]}
                        </span>{" "}
                        after your booking is confirmed.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#5A4A8A]">
                        Choose what {provider.name.split(",")[0]} can see for this
                        appointment — a short brief helps them prepare.
                      </p>
                      <p className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] font-medium text-brand-purple">
                        <Lock className="h-3 w-3" />
                        Nothing is shared unless you confirm
                      </p>
                    </>
                  )}
                </div>
                <div className="flex flex-none items-center gap-2 sm:flex-col sm:items-end">
                  {pending && pending.includedKeys.length > 0 ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setShareModalOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#D3C8EE] bg-white px-4 py-2 text-[12px] font-semibold text-[#3D2E6B] shadow-sm transition hover:-translate-y-0.5 hover:border-brand-purple/50 hover:bg-[#FBFAFE]"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Review or change
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          clearPendingShare(bookingKey);
                          setPending(null);
                        }}
                        className="text-[11.5px] font-medium text-slate-400 underline underline-offset-2 transition hover:text-slate-600"
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShareModalOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-brand-purple px-4 py-2 text-[12px] font-semibold text-white shadow-[0_10px_22px_-10px_rgba(126,107,175,0.6)] transition hover:-translate-y-0.5 hover:bg-brand-purple-dark"
                    >
                      Choose what to share
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-dashed border-[#E9E6FA] bg-[#FBFAFF] p-4">
              <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-brand-purple" />
              <p className="text-[12.5px] leading-relaxed text-slate-600">
                {isFree ? (
                  <>
                    Your promo covers <span className="font-semibold">100% of this session</span>.
                    No payment needed — we'll confirm your appointment instantly and email your
                    session details.
                  </>
                ) : (
                  <>
                    You'll be redirected to <span className="font-semibold">{gatewayName}</span> to
                    complete payment. Your card details never touch our servers.
                  </>
                )}
              </p>
            </div>

            {/* Consent — required before payment / confirmation */}
            <label
              htmlFor="checkout-consent"
              className={`mt-4 flex cursor-pointer items-start gap-2.5 rounded-xl border p-4 transition ${
                consent
                  ? "border-[#D3C8EE] bg-[#F7F4FC]"
                  : "border-[#E9E6FA] bg-white hover:border-[#D3C8EE]"
              }`}
            >
              <input
                id="checkout-consent"
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 flex-none rounded border-slate-300 text-brand-purple focus:ring-brand-purple"
              />
              <span className="text-[12.5px] leading-relaxed text-slate-700">
                I agree to Lubin's{" "}
                <Link to="/terms" className="font-semibold text-brand-purple underline underline-offset-2">
                  Terms
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="font-semibold text-brand-purple underline underline-offset-2">
                  Privacy Policy
                </Link>
                . I understand my personal information will only be used to confirm and deliver this
                appointment.
              </span>
            </label>

            <button
              type="submit"
              disabled={!canPay || processing}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-purple to-brand-purple-dark px-5 py-3.5 text-[14px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(124,113,176,0.7)] transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {isFree ? <CheckCircle2 className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
              {isFree
                ? processing
                  ? "Confirming your appointment…"
                  : "Confirm appointment"
                : processing
                ? `Redirecting to ${gatewayName}…`
                : `Pay ${symbol}${total.toLocaleString()} with ${gatewayName}`}
            </button>
            {!isFree && (
              <label className="mt-3 flex items-center gap-2 text-[11.5px] text-slate-400">
                <input
                  type="checkbox"
                  checked={simulateFail}
                  onChange={(e) => setSimulateFail(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-brand-purple focus:ring-brand-purple"
                />
                Simulate a payment failure (preview only)
              </label>
            )}
          </form>

          {/* Order summary */}
          <aside className="h-fit rounded-3xl border border-[#E9E6FA] bg-white p-6 shadow-sm">
            <h2 className="text-[12px] font-semibold uppercase tracking-wider text-[#A799E2]">
              Order summary
            </h2>

            <div className="mt-4 flex items-start gap-3">
              <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-brand-purple to-brand-purple-dark text-[14px] font-bold text-white">
                {provider.initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-slate-900">
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
                      Secure link emailed after payment.
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-slate-700">
                        In-person · {provider.location}.
                      </span>{" "}
                      Exact address shared after confirmation.
                    </>
                  )}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <UserIcon className="h-3.5 w-3.5 text-brand-purple" />
                {service.format === "Both" ? "Individual or Group" : service.format}
              </li>
            </ul>

            <div className="my-5 border-t border-dashed border-[#E9E6FA]" />

            <dl className="space-y-2 text-[13px]">
              <div className="flex justify-between text-slate-600">
                <dt>Session</dt>
                <dd>{symbol}{service.price.toLocaleString()}</dd>
              </div>
              {promo && (
                <div className="flex justify-between text-emerald-600">
                  <dt>Promo ({promo.code}) −{promo.percent}%</dt>
                  <dd>−{symbol}{discount.toLocaleString()}</dd>
                </div>
              )}
              <div className="pt-1">
                {promo ? (
                  <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-[12px]">
                    <span className="font-semibold text-emerald-700">
                      {promo.code} applied
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPromo(null);
                        setPromoInput("");
                      }}
                      className="text-emerald-700 underline hover:no-underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <label className="text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">
                      Promo code
                    </label>
                    <div className="mt-1.5 flex gap-2">
                      <input
                        type="text"
                        value={promoInput}
                        onChange={(e) => {
                          setPromoInput(e.target.value);
                          if (promoError) setPromoError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            applyPromo();
                          }
                        }}
                        placeholder="Enter code"
                        className="block w-full rounded-lg border border-[#E9E6FA] bg-white px-3 py-2 text-[13px] uppercase text-slate-900 outline-none placeholder:text-slate-400 placeholder:normal-case focus:border-brand-purple focus:ring-4 focus:ring-brand-purple/10"
                      />
                      <button
                        type="button"
                        onClick={applyPromo}
                        disabled={!promoInput.trim()}
                        className="rounded-lg border border-brand-purple px-3 py-2 text-[12.5px] font-semibold text-brand-purple transition-colors hover:bg-brand-purple hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-brand-purple"
                      >
                        Apply
                      </button>
                    </div>
                    {promoError && (
                      <p className="mt-1.5 text-[11.5px] text-rose-500">{promoError}</p>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-baseline justify-between pt-2 text-slate-900">
                <dt className="text-[13px] font-semibold">Total</dt>
                <dd className="text-[20px] font-bold">{symbol}{total.toLocaleString()}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </main>

      {shareModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShareModalOpen(false)}
        >
          <div
            className="w-full max-w-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <ShareConsentModal
              open={shareModalOpen}
              summary={shareSummary}
              providerContext={{
                providerName: provider.name,
                providerRole: `${provider.title.split(",")[0].trim()}${provider.verified ? " · Verified provider" : ""}`,
                appointmentLabel,
                appointmentDate,
              }}
              initialIncluded={pending?.includedKeys}
              onConfirm={(r) => {
                setPendingShare({
                  bookingKey,
                  providerId: provider.id,
                  providerName: provider.name,
                  appointmentLabel,
                  includedKeys: r.includedKeys,
                  attemptIds: r.attemptIds,
                  createdAt: Date.now(),
                });
                setPending({
                  bookingKey,
                  providerId: provider.id,
                  providerName: provider.name,
                  appointmentLabel,
                  includedKeys: r.includedKeys,
                  attemptIds: r.attemptIds,
                  createdAt: Date.now(),
                });
                setShareModalOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}