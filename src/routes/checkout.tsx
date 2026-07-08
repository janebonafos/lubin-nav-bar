import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
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
  XCircle,
  RefreshCw,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { getProviderById, getServicesForProvider } from "@/lib/providers";

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

  const provider = getProviderById(search.providerId);
  const service = useMemo(() => {
    if (!provider) return undefined;
    return getServicesForProvider(provider).find((s) => s.id === search.serviceId);
  }, [provider, search.serviceId]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [failure, setFailure] = useState<null | {
    code: string;
    title: string;
    message: string;
    hint: string;
  }>(null);
  const [simulateFail, setSimulateFail] = useState(false);
  const [attempts, setAttempts] = useState(0);

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

  const fee = Math.round(service.price * 0.05);
  const total = service.price + fee;

  const canPay = name.trim().length > 1 && /.+@.+\..+/.test(email);

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPay) return;
    setProcessing(true);
    setFailure(null);
    // TODO: replace with real Stripe Checkout session redirect once Stripe is enabled.
    setTimeout(() => {
      setProcessing(false);
      setAttempts((n) => n + 1);
      if (simulateFail) {
        const scenarios = [
          {
            code: "card_declined",
            title: "Your card was declined",
            message:
              "Your bank didn't authorize this ₱" +
              total.toLocaleString() +
              " charge. No money was taken from your account.",
            hint: "Try a different card, or contact your bank to approve the payment.",
          },
          {
            code: "insufficient_funds",
            title: "Insufficient funds",
            message:
              "Your card doesn't have enough available balance to complete this booking.",
            hint: "Use another payment method or top up and try again.",
          },
          {
            code: "network_error",
            title: "We couldn't reach the payment network",
            message:
              "The connection to Stripe timed out before your payment could be confirmed.",
            hint: "Check your internet connection and retry — you won't be charged twice.",
          },
        ];
        setFailure(scenarios[attempts % scenarios.length]);
      } else {
        setSuccess(true);
      }
    }, 900);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#F9F8FF]" style={{ fontFamily: "Inter, sans-serif" }}>
        <Navbar />
        <main className="mx-auto max-w-xl px-4 pb-20 pt-28 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F3F0FF]">
            <CheckCircle2 className="h-8 w-8 text-brand-purple" />
          </div>
          <h1 className="mt-5 text-[28px] font-semibold text-slate-900">
            You're all booked
          </h1>
          <p className="mt-2 text-[14px] text-slate-500">
            A confirmation has been sent to{" "}
            <span className="font-semibold text-slate-700">{email || "your email"}</span>.
          </p>
          <div className="mt-6 rounded-2xl border border-[#E9E6FA] bg-white p-5 text-left shadow-sm">
            <p className="text-[13px] font-semibold text-slate-900">{service.title}</p>
            <p className="mt-1 text-[12.5px] text-slate-500">
              with {provider.name} · {dateLabel} at {search.time} PHT (GMT+8)
            </p>
          </div>
          <Link
            to="/find-provider"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-brand-purple to-brand-purple-dark px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_18px_-8px_rgba(124,113,176,0.6)]"
          >
            Browse more providers
          </Link>
        </main>
      </div>
    );
  }

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
            {failure && (
              <div
                role="alert"
                aria-live="assertive"
                className="mb-6 overflow-hidden rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-white shadow-[0_10px_28px_-18px_rgba(220,38,38,0.35)] animate-rise-in"
              >
                <div className="flex items-start gap-3 p-5">
                  <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-red-100 ring-4 ring-red-50">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[14px] font-semibold text-red-900">
                        {failure.title}
                      </p>
                      <span className="rounded-full bg-red-100 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-red-700">
                        {failure.code}
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-red-800/90">
                      {failure.message}
                    </p>
                    <div className="mt-2 flex items-start gap-1.5 text-[12.5px] text-red-700/80">
                      <HelpCircle className="mt-0.5 h-3.5 w-3.5 flex-none" />
                      <span>{failure.hint}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="submit"
                        disabled={processing}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${processing ? "animate-spin" : ""}`} />
                        {processing ? "Retrying…" : "Retry payment"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFailure(null)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3.5 py-2 text-[12.5px] font-semibold text-red-700 transition-colors hover:bg-red-50"
                      >
                        Use a different card
                      </button>
                      <Link
                        to="/provider/$id"
                        params={{ id: provider.id }}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12.5px] font-semibold text-red-700 hover:underline"
                      >
                        Cancel booking
                      </Link>
                    </div>
                    <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-white/60 p-2.5 text-[11.5px] leading-relaxed text-red-900/70">
                      <AlertTriangle className="mt-0.5 h-3 w-3 flex-none" />
                      <span>
                        Your session slot on{" "}
                        <span className="font-semibold">
                          {dateLabel} at {search.time}
                        </span>{" "}
                        is held for 10 minutes while you retry.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
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

            <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-dashed border-[#E9E6FA] bg-[#FBFAFF] p-4">
              <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-brand-purple" />
              <p className="text-[12.5px] leading-relaxed text-slate-600">
                You'll be redirected to <span className="font-semibold">Stripe</span> to
                complete payment. Your card details never touch our servers.
              </p>
            </div>

            <button
              type="submit"
              disabled={!canPay || processing}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-purple to-brand-purple-dark px-5 py-3.5 text-[14px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(124,113,176,0.7)] transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              <CreditCard className="h-4 w-4" />
              {processing ? "Redirecting to Stripe…" : `Pay ₱${total.toLocaleString()} with Stripe`}
            </button>
            <label className="mt-3 flex items-center gap-2 text-[11.5px] text-slate-400">
              <input
                type="checkbox"
                checked={simulateFail}
                onChange={(e) => setSimulateFail(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-brand-purple focus:ring-brand-purple"
              />
              Simulate a payment failure (preview only)
            </label>
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
                <dd>₱{service.price.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between text-slate-600">
                <dt>Platform fee</dt>
                <dd>₱{fee.toLocaleString()}</dd>
              </div>
              <div className="flex items-baseline justify-between pt-2 text-slate-900">
                <dt className="text-[13px] font-semibold">Total</dt>
                <dd className="text-[20px] font-bold">₱{total.toLocaleString()}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </main>
    </div>
  );
}