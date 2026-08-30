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
  ShieldCheck,
  User as UserIcon,
  Video,
  X,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { getProviderById, getServicesForProvider, currencySymbol, paymentGatewayName } from "@/lib/providers";
import ShareConsentModal from "@/components/share/ShareConsentModal";
import { buildSummary, mockSummary, type RangeKey } from "@/lib/share/summary";
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

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.06-1.1-.16-1.6H12z"
      />
    </svg>
  );
}

function FacebookGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#1877F2" />
      <path
        fill="#fff"
        d="M13.4 21.9v-7.7h2.6l.4-3h-3v-1.9c0-.87.24-1.46 1.5-1.46h1.6V5.13c-.28-.04-1.23-.12-2.34-.12-2.32 0-3.9 1.4-3.9 4v2.23H7.6v3h2.66v7.7h3.14z"
      />
    </svg>
  );
}

function LinkedInGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect width="24" height="24" rx="4" fill="#0A66C2" />
      <path
        fill="#fff"
        d="M7.1 9.4h2.6V17H7.1V9.4zM8.4 6.2a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM11.4 9.4H14v1h.03c.36-.68 1.24-1.4 2.56-1.4 2.74 0 3.24 1.8 3.24 4.14V17h-2.6v-3.4c0-.81-.02-1.86-1.13-1.86-1.13 0-1.3.88-1.3 1.8V17h-2.6V9.4z"
      />
    </svg>
  );
}


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
  const [shareRange, setShareRange] = useState<RangeKey>("30d");
  const [pending, setPending] = useState<PendingShare | null>(null);
  const [consent, setConsent] = useState(false);
  const [googleAccount, setGoogleAccount] = useState<{ name: string; email: string } | null>(null);
  const [googlePicker, setGooglePicker] = useState(false);
  const [googleInput, setGoogleInput] = useState("");
  const [socialProvider, setSocialProvider] = useState<"google" | "facebook" | "linkedin">("google");

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

  // Reuse an already-connected account so returning users skip typing.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedEmail = window.localStorage.getItem("lubin.userEmail");
      const savedName = window.localStorage.getItem("lubin.userName") ?? "";
      if (savedEmail) {
        setGoogleAccount({ name: savedName || savedEmail.split("@")[0], email: savedEmail });
        setEmail(savedEmail);
        setName((n) => n || savedName);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const connectGoogle = () => {
    const nextEmail = googleInput.trim().toLowerCase();
    if (!/.+@.+\..+/.test(nextEmail)) return;
    const derived = nextEmail
      .split("@")[0]
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    const displayName = name.trim() || derived;
    setGoogleAccount({ name: displayName, email: nextEmail });
    setEmail(nextEmail);
    setName(displayName);
    setGooglePicker(false);
    setGoogleInput("");
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("lubin.userEmail", nextEmail);
        window.localStorage.setItem("lubin.userName", displayName);
        window.localStorage.setItem("lubin.signedIn", "1");
        if (!window.localStorage.getItem("lubin.userRole")) {
          window.localStorage.setItem("lubin.userRole", "client");
        }
        window.dispatchEvent(new Event("lubin:auth-change"));
      }
    } catch {
      /* ignore */
    }
  };



  // Build a summary snapshot for the modal (uses local check-ins if available,
  // otherwise falls back to the mock so the user can preview categories).
  const shareSummary = useMemo(() => {
    const real = buildSummary(shareRange, { checkins: localCheckins });
    return real.hasAnyData ? real : mockSummary();
  }, [localCheckins, shareRange]);

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

            {/* Google account — skip typing, reuse an existing account */}
            {googleAccount ? (
              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-[#E9E6FA] bg-[#FAF8FD] p-3.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm">
                  <GoogleGlyph className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-semibold text-slate-900">
                    {googleAccount.name}
                  </p>
                  <p className="truncate text-[12.5px] text-slate-500">{googleAccount.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setGoogleAccount(null);
                    setGooglePicker(false);
                    setEmail("");
                  }}
                  className="ml-auto shrink-0 text-[12.5px] font-semibold text-brand-purple hover:underline"
                >
                  Use another email
                </button>
              </div>
            ) : (
              <div className="mt-5">
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {(
                  [
                    { id: "google", label: "Google", Icon: GoogleGlyph },
                    { id: "facebook", label: "Facebook", Icon: FacebookGlyph },
                    { id: "linkedin", label: "LinkedIn", Icon: LinkedInGlyph },
                  ] as const
                ).map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setSocialProvider(id);
                      setGooglePicker(true);
                    }}
                    className="flex items-center justify-center gap-2 rounded-xl border border-[#E9E6FA] bg-white px-3 py-2.5 text-[12.5px] font-semibold text-slate-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#C9BEE5] hover:shadow-md active:translate-y-0"
                  >
                    <Icon className="h-4.5 w-4.5" />
                    {label}
                  </button>
                ))}
                </div>
              {googlePicker && (
                <div className="mt-2.5 rounded-2xl border border-[#E9E6FA] bg-[#FAF8FD] p-3.5">
                  <p className="text-[12.5px] font-semibold text-slate-700">
                    Which{" "}
                    {socialProvider === "google"
                      ? "Google"
                      : socialProvider === "facebook"
                        ? "Facebook"
                        : "LinkedIn"}{" "}
                    account should we use?
                  </p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <input
                      type="email"
                      value={googleInput}
                      onChange={(e) => setGoogleInput(e.target.value)}
                      placeholder={`you@${socialProvider === "google" ? "gmail" : socialProvider === "facebook" ? "facebook" : "linkedin"}.com`}
                      className="flex-1 rounded-xl border border-[#E9E6FA] bg-white px-3.5 py-2.5 text-[14px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-purple focus:ring-4 focus:ring-brand-purple/10"
                    />
                    <button
                      type="button"
                      onClick={connectGoogle}
                      disabled={!/.+@.+\..+/.test(googleInput)}
                      className="rounded-xl bg-brand-purple px-4 py-2.5 text-[13.5px] font-semibold text-white transition-all enabled:hover:-translate-y-0.5 disabled:opacity-50"
                    >
                      Continue
                    </button>
                  </div>
                  <p className="mt-2 text-[12px] text-slate-500">
                    We'll use this to create or sign in to your Lubin account and send your
                    receipt.
                  </p>
                </div>
              )}
                <div className="my-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-[#E9E6FA]" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    or enter details
                  </span>
                  <div className="h-px flex-1 bg-[#E9E6FA]" />
                </div>
              </div>
            )}

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
            <div className="relative mt-4 rounded-2xl border border-[#7E6BAF]/20 bg-[#FAF8FD] p-4 shadow-sm">
              {pending && pending.includedKeys.length > 0 && (
                <button
                  type="button"
                  aria-label="Remove sharing selection"
                  onClick={() => {
                    clearPendingShare(bookingKey);
                    setPending(null);
                  }}
                  className="absolute -top-3 -right-3 flex h-7 w-7 items-center justify-center rounded-full border border-[#7E6BAF]/20 bg-white text-[#7E6BAF] shadow-sm transition-all hover:rotate-90 hover:border-red-200 hover:text-red-500"
                >
                  <X className="h-4 w-4" strokeWidth={2.5} />
                </button>
              )}

              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[15px] font-semibold text-[#4A3E7F]">
                  Share from your Health Passport
                </h3>
                {pending && pending.includedKeys.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShareModalOpen(true)}
                    className="text-[12px] font-semibold text-[#7E6BAF] underline decoration-[#7E6BAF]/30 underline-offset-4 transition-colors hover:text-[#4A3E7F]"
                  >
                    Change
                  </button>
                ) : (
                  <div className="flex flex-none items-center gap-2">
                    <span className="rounded-md bg-[#F0EEF6] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-purple">
                      Optional
                    </span>
                    <button
                      type="button"
                      onClick={() => setShareModalOpen(true)}
                      className="inline-flex items-center gap-1 rounded-xl bg-brand-purple px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-purple-dark"
                    >
                      Choose
                    </button>
                  </div>
                )}
              </div>

              {pending && pending.includedKeys.length > 0 ? (
                <div className="mt-3 flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-[#7E6BAF]/20 bg-[#F4ECFB] px-2.5 py-0.5 text-[11px] font-semibold text-[#4A3E7F]">
                      {pending.includedKeys.length} item
                      {pending.includedKeys.length === 1 ? "" : "s"}
                    </span>
                    <span className="text-[12px] text-[#7E6BAF]">
                      will be shared with
                    </span>
                  </div>
                  <p className="text-[14px] font-semibold text-[#4A3E7F]">
                    {provider.name.split(",")[0]}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-[13px] leading-relaxed text-[#7E6BAF]">
                  Send a one-time{" "}
                  <span className="font-semibold text-[#4A3E7F]">
                    AI Provider Brief
                  </span>{" "}
                  so your provider can prepare for your{" "}
                  {search.format === "online" ? "online session" : "visit"}.
                </p>
              )}

              <p className="mt-3 text-[12px] leading-relaxed text-[#7E6BAF]">
                Any medication, allergy, or health condition details you choose
                to share may be used by your provider to prescribe and treat you
                safely.
              </p>

              <div className="mt-3 flex items-center gap-2 border-t border-[#7E6BAF]/10 pt-3">
                <Lock className="h-3.5 w-3.5 flex-none text-[#7E6BAF]" />
                <span className="text-[11px] font-medium text-[#7E6BAF]">
                  {pending && pending.includedKeys.length > 0
                    ? "Nothing is shared unless you confirm."
                    : "Fixed snapshot. Nothing is shared unless you confirm."}
                </span>
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
                className="mt-0.5 h-4 w-4 flex-none rounded border-slate-300 accent-brand-purple text-brand-purple focus:ring-brand-purple"
              />
              <span className="text-[12.5px] leading-relaxed text-slate-700">
                I agree to Lubin's{" "}
                <Link
                  to="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-brand-purple underline underline-offset-2"
                >
                  Terms
                </Link>{" "}
                and{" "}
                <Link
                  to="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-brand-purple underline underline-offset-2"
                >
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
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <ShareConsentModal
              open={shareModalOpen}
              summary={shareSummary}
              onRangeChange={setShareRange}
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