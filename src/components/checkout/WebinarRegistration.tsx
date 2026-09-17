import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Globe2,
  Lock,
  Mail,
  ShieldCheck,
  Ticket,
  Users,
  Video,
} from "lucide-react";
import type { Webinar } from "@/lib/webinars";

/**
 * Prototype-only webinar registration inside the existing checkout page.
 * Registration is REQUIRED before a seat is confirmed — nothing is sent for real.
 */

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

const ATTENDEE_TYPES = [
  "Student",
  "Youth leader",
  "Parent or guardian",
  "Educator",
  "Health worker",
  "Other",
] as const;

const STEP_LABELS = ["Your account", "Registration details", "Confirm seat"] as const;

export default function WebinarRegistration({ webinar }: { webinar: Webinar }) {
  const [step, setStep] = useState(1);
  const [account, setAccount] = useState<{ name: string; email: string } | null>(null);
  const [socialProvider, setSocialProvider] = useState<"google" | "facebook" | "linkedin" | null>(
    null,
  );
  const [socialInput, setSocialInput] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");

  const [mobile, setMobile] = useState("");
  const [attendeeType, setAttendeeType] = useState<string>("");
  const [organisation, setOrganisation] = useState("");
  const [question, setQuestion] = useState("");
  const [sameEmail, setSameEmail] = useState(false);
  const [consent, setConsent] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [ref, setRef] = useState("");

  // Reuse an already-connected Lubin account so returning attendees skip typing.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedEmail = window.localStorage.getItem("lubin.userEmail");
      const savedName = window.localStorage.getItem("lubin.userName") ?? "";
      if (savedEmail) {
        setAccount({ name: savedName || savedEmail.split("@")[0], email: savedEmail });
      }
    } catch {
      /* ignore */
    }
  }, []);

  const symbol = webinar.currency === "PHP" ? "₱" : "$";
  const isFree = webinar.price === 0;

  const saveAccount = (name: string, email: string) => {
    setAccount({ name, email });
    setSocialProvider(null);
    setSocialInput("");
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("lubin.userEmail", email);
        window.localStorage.setItem("lubin.userName", name);
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

  const connectSocial = () => {
    const email = socialInput.trim().toLowerCase();
    if (!/.+@.+\..+/.test(email)) return;
    const derived = email
      .split("@")[0]
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    saveAccount(derived, email);
  };

  const detailsComplete = useMemo(
    () => mobile.trim().length >= 7 && attendeeType !== "" && sameEmail,
    [mobile, attendeeType, sameEmail],
  );

  const submit = () => {
    if (!account || !detailsComplete || !consent) return;
    setProcessing(true);
    // Prototype only: no seat is really reserved and no email is really sent.
    setTimeout(() => {
      setProcessing(false);
      setRef("WBN-" + Math.random().toString(36).slice(2, 7).toUpperCase());
      setRegistered(true);
    }, 900);
  };

  if (registered && account) {
    return (
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        <section className="rounded-3xl border border-[#E9E6FA] bg-white p-6 shadow-sm sm:p-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Registration confirmed
          </span>
          <h1 className="mt-3 text-[26px] font-semibold tracking-tight text-slate-900">
            You're in, {account.name.split(" ")[0]}
          </h1>
          <p className="mt-1.5 text-[13.5px] text-slate-500">
            Reference {ref}. We've emailed your confirmation and joining link to{" "}
            <span className="font-semibold text-slate-700">{account.email}</span>.
          </p>

          <div className="mt-5 rounded-2xl border border-[#E9E6FA] bg-[#FAF8FD] p-4">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-brand-purple">
              Joining link
            </p>
            <a
              href={webinar.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 block break-all text-[13.5px] font-semibold text-brand-purple underline underline-offset-2"
            >
              {webinar.meetingLink}
            </a>
            <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600">
              Join using <span className="font-semibold">{account.email}</span> — the same email you
              registered with. Other accounts may be asked to wait for approval.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <a
              href={webinar.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-purple px-4 py-2.5 text-[13px] font-semibold text-white transition hover:-translate-y-0.5"
            >
              <Video className="h-4 w-4" /> Join webinar
            </a>
            <Link
              to="/email-preview"
              search={{ template: "webinar-confirmation" }}
              className="inline-flex items-center gap-2 rounded-xl border border-[#E9E6FA] bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-700 transition hover:border-[#C9BEE5]"
            >
              <Mail className="h-4 w-4" /> View confirmation email
            </Link>
          </div>
        </section>
        <WebinarSummary webinar={webinar} symbol={symbol} />
      </div>
    );
  }

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
      <section className="rounded-3xl border border-[#E9E6FA] bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-2 text-brand-purple">
          <Ticket className="h-4 w-4" />
          <span className="text-[12px] font-semibold uppercase tracking-wider">
            Registration required
          </span>
        </div>
        <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-slate-900">
          Register to join this webinar
        </h1>
        <p className="mt-1.5 text-[13.5px] text-slate-500">
          Seats are named. You'll get the joining link by email and can only enter with the email you
          register here.
        </p>

        {/* Steps */}
        <ol className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          {STEP_LABELS.map((label, i) => {
            const n = i + 1;
            const done = n < step;
            const current = n === step;
            return (
              <li key={label} className="flex flex-1 items-center gap-2">
                <span
                  className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-[11.5px] font-bold ${
                    done
                      ? "bg-emerald-100 text-emerald-700"
                      : current
                        ? "bg-brand-purple text-white"
                        : "bg-[#F0EEF6] text-slate-400"
                  }`}
                >
                  {done ? "✓" : n}
                </span>
                <span
                  className={`text-[12.5px] font-semibold ${
                    current ? "text-slate-900" : "text-slate-400"
                  }`}
                >
                  {label}
                </span>
                {n < STEP_LABELS.length && (
                  <span className="hidden h-px flex-1 bg-[#E9E6FA] sm:block" />
                )}
              </li>
            );
          })}
        </ol>

        {/* Step 1 — account */}
        {step === 1 && (
          <div className="mt-6">
            {account ? (
              <div className="flex items-center gap-3 rounded-2xl border border-[#E9E6FA] bg-[#FAF8FD] p-3.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[13px] font-bold text-brand-purple shadow-sm">
                  {account.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-semibold text-slate-900">
                    {account.name}
                  </p>
                  <p className="truncate text-[12.5px] text-slate-500">{account.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAccount(null)}
                  className="ml-auto shrink-0 text-[12.5px] font-semibold text-brand-purple hover:underline"
                >
                  Use another email
                </button>
              </div>
            ) : (
              <>
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
                      onClick={() => setSocialProvider(id)}
                      className="flex items-center justify-center gap-2 rounded-xl border border-[#E9E6FA] bg-white px-3 py-2.5 text-[12.5px] font-semibold text-slate-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#C9BEE5] hover:shadow-md"
                    >
                      <Icon className="h-4.5 w-4.5" /> {label}
                    </button>
                  ))}
                </div>

                {socialProvider && (
                  <div className="mt-2.5 rounded-2xl border border-[#E9E6FA] bg-[#FAF8FD] p-3.5">
                    <p className="text-[12.5px] font-semibold text-slate-700">
                      Which account should we register?
                    </p>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <input
                        type="email"
                        value={socialInput}
                        onChange={(e) => setSocialInput(e.target.value)}
                        placeholder="you@example.com"
                        className="flex-1 rounded-xl border border-[#E9E6FA] bg-white px-3.5 py-2.5 text-[14px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-purple focus:ring-4 focus:ring-brand-purple/10"
                      />
                      <button
                        type="button"
                        onClick={connectSocial}
                        disabled={!/.+@.+\..+/.test(socialInput)}
                        className="rounded-xl bg-brand-purple px-4 py-2.5 text-[13.5px] font-semibold text-white transition-all enabled:hover:-translate-y-0.5 disabled:opacity-50"
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                )}

                <div className="my-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-[#E9E6FA]" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    or register with email
                  </span>
                  <div className="h-px flex-1 bg-[#E9E6FA]" />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[12px] font-semibold text-slate-700">Full name</label>
                    <input
                      type="text"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      placeholder="Juan dela Cruz"
                      className="mt-1.5 block w-full rounded-xl border border-[#E9E6FA] bg-white px-3.5 py-2.5 text-[14px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-purple focus:ring-4 focus:ring-brand-purple/10"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-slate-700">Email</label>
                    <input
                      type="email"
                      value={manualEmail}
                      onChange={(e) => setManualEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="mt-1.5 block w-full rounded-xl border border-[#E9E6FA] bg-white px-3.5 py-2.5 text-[14px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-purple focus:ring-4 focus:ring-brand-purple/10"
                    />
                    <p className="mt-1.5 text-[12px] text-slate-500">
                      Use an email you can open during the webinar — the joining link is sent here.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => saveAccount(manualName.trim(), manualEmail.trim().toLowerCase())}
                    disabled={
                      manualName.trim().length < 2 || !/.+@.+\..+/.test(manualEmail.trim())
                    }
                    className="w-full rounded-xl border border-brand-purple px-4 py-2.5 text-[13px] font-semibold text-brand-purple transition hover:bg-brand-purple hover:text-white disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-brand-purple"
                  >
                    Create my registration
                  </button>
                </div>
              </>
            )}

            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!account}
              className="mt-6 w-full rounded-xl bg-gradient-to-br from-brand-purple to-brand-purple-dark px-5 py-3.5 text-[14px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(124,113,176,0.7)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              Continue to registration details
            </button>
          </div>
        )}

        {/* Step 2 — registration details */}
        {step === 2 && (
          <div className="mt-6 space-y-4">
            <div>
              <label className="text-[12px] font-semibold text-slate-700">Mobile number</label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="+63 917 000 0000"
                className="mt-1.5 block w-full rounded-xl border border-[#E9E6FA] bg-white px-3.5 py-2.5 text-[14px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-purple focus:ring-4 focus:ring-brand-purple/10"
              />
              <p className="mt-1.5 text-[12px] text-slate-500">
                Used only for a reminder before the session starts.
              </p>
            </div>

            <div>
              <label className="text-[12px] font-semibold text-slate-700">
                I'm joining as
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {ATTENDEE_TYPES.map((t) => {
                  const active = attendeeType === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAttendeeType(t)}
                      className={`rounded-[12px] border px-3 py-1.5 text-[12.5px] font-semibold transition ${
                        active
                          ? "border-brand-purple bg-brand-purple text-white"
                          : "border-[#E9E6FA] bg-white text-slate-600 hover:border-[#C9BEE5]"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-[12px] font-semibold text-slate-700">
                School or organisation{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                type="text"
                value={organisation}
                onChange={(e) => setOrganisation(e.target.value)}
                placeholder="Area One Youth Federation"
                className="mt-1.5 block w-full rounded-xl border border-[#E9E6FA] bg-white px-3.5 py-2.5 text-[14px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-purple focus:ring-4 focus:ring-brand-purple/10"
              />
            </div>

            <div>
              <label className="text-[12px] font-semibold text-slate-700">
                A question for the speaker{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={3}
                placeholder="What should adults watch out for in teens?"
                className="mt-1.5 block w-full resize-none rounded-xl border border-[#E9E6FA] bg-white px-3.5 py-2.5 text-[14px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-purple focus:ring-4 focus:ring-brand-purple/10"
              />
            </div>

            <label
              className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-4 transition ${
                sameEmail ? "border-[#D3C8EE] bg-[#F7F4FC]" : "border-[#E9E6FA] bg-white"
              }`}
            >
              <input
                type="checkbox"
                checked={sameEmail}
                onChange={(e) => setSameEmail(e.target.checked)}
                className="mt-0.5 h-4 w-4 flex-none rounded border-slate-300 accent-brand-purple"
              />
              <span className="text-[12.5px] leading-relaxed text-slate-700">
                I'll join the webinar using{" "}
                <span className="font-semibold">{account?.email}</span> so the host can admit me
                quickly.
              </span>
            </label>

            <div className="flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-xl border border-[#E9E6FA] bg-white px-4 py-3 text-[13px] font-semibold text-slate-600 transition hover:border-[#C9BEE5]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={!detailsComplete}
                className="flex-1 rounded-xl bg-gradient-to-br from-brand-purple to-brand-purple-dark px-5 py-3.5 text-[14px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(124,113,176,0.7)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                Review my registration
              </button>
            </div>
            {!detailsComplete && (
              <p className="text-[12px] text-slate-500">
                Mobile number, who you're joining as, and the email confirmation are required.
              </p>
            )}
          </div>
        )}

        {/* Step 3 — confirm */}
        {step === 3 && account && (
          <div className="mt-6">
            <dl className="divide-y divide-[#F0EEF6] rounded-2xl border border-[#E9E6FA] bg-[#FBFAFF] px-4">
              {[
                ["Name", account.name],
                ["Email for joining", account.email],
                ["Mobile", mobile],
                ["Joining as", attendeeType],
                ["School or organisation", organisation || "—"],
                ["Question for the speaker", question || "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-4 py-3">
                  <dt className="text-[12.5px] font-medium text-slate-500">{k}</dt>
                  <dd className="max-w-[60%] text-right text-[13px] font-semibold text-slate-800">
                    {v}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-dashed border-[#E9E6FA] bg-[#FBFAFF] p-4">
              <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-brand-purple" />
              <p className="text-[12.5px] leading-relaxed text-slate-600">
                {isFree ? (
                  <>
                    This webinar is <span className="font-semibold">free</span>, but a seat is only
                    held once registration is confirmed. Your joining link is emailed right after.
                  </>
                ) : (
                  <>
                    You'll pay {symbol}
                    {webinar.price.toLocaleString()} to reserve your seat, then receive your joining
                    link by email.
                  </>
                )}
              </p>
            </div>

            <label
              className={`mt-4 flex cursor-pointer items-start gap-2.5 rounded-xl border p-4 transition ${
                consent ? "border-[#D3C8EE] bg-[#F7F4FC]" : "border-[#E9E6FA] bg-white"
              }`}
            >
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 flex-none rounded border-slate-300 accent-brand-purple"
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
                . My details are used only to confirm this webinar and send the joining link.
              </span>
            </label>

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-xl border border-[#E9E6FA] bg-white px-4 py-3 text-[13px] font-semibold text-slate-600 transition hover:border-[#C9BEE5]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!consent || processing}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-purple to-brand-purple-dark px-5 py-3.5 text-[14px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(124,113,176,0.7)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {isFree ? <CheckCircle2 className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                {processing
                  ? "Confirming your seat…"
                  : isFree
                    ? "Confirm my registration"
                    : `Pay ${symbol}${webinar.price.toLocaleString()} and register`}
              </button>
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center gap-2 border-t border-[#F0EEF6] pt-4">
          <Lock className="h-3.5 w-3.5 flex-none text-slate-400" />
          <span className="text-[11.5px] text-slate-400">
            Preview only — no seat is reserved and no email is sent.
          </span>
        </div>
      </section>

      <WebinarSummary webinar={webinar} symbol={symbol} />
    </div>
  );
}

function WebinarSummary({ webinar, symbol }: { webinar: Webinar; symbol: string }) {
  const isFree = webinar.price === 0;
  return (
    <aside className="h-fit rounded-3xl border border-[#E9E6FA] bg-white p-6 shadow-sm">
      <h2 className="text-[12px] font-semibold uppercase tracking-wider text-[#A799E2]">
        Webinar summary
      </h2>
      <p className="mt-3 text-[15.5px] font-semibold leading-snug text-slate-900">
        {webinar.title}
      </p>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-500">{webinar.tagline}</p>

      <ul className="mt-5 space-y-2.5 text-[13px] text-slate-600">
        <li className="flex items-start gap-2">
          <CalendarDays className="mt-0.5 h-3.5 w-3.5 flex-none text-brand-purple" />
          {webinar.dateTime}
        </li>
        <li className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-brand-purple" />
          {webinar.duration}
        </li>
        <li className="flex items-center gap-2">
          <Globe2 className="h-3.5 w-3.5 text-brand-purple" />
          {webinar.timezone}
        </li>
        <li className="flex items-start gap-2">
          <Video className="mt-0.5 h-3.5 w-3.5 flex-none text-brand-purple" />
          <span>
            <span className="font-semibold text-slate-700">{webinar.platform}.</span> Link emailed
            after you register.
          </span>
        </li>
        <li className="flex items-start gap-2">
          <Users className="mt-0.5 h-3.5 w-3.5 flex-none text-brand-purple" />
          <span>
            {webinar.speakerName} · {webinar.speakerCred}
            <br />
            <span className="text-slate-500">Hosted by {webinar.hostOrg}</span>
          </span>
        </li>
      </ul>

      <div className="my-5 border-t border-dashed border-[#E9E6FA]" />

      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-semibold text-slate-900">Seat</span>
        <span className="text-[20px] font-bold text-slate-900">
          {isFree ? "Free" : `${symbol}${webinar.price.toLocaleString()}`}
        </span>
      </div>
      <p className="mt-1 text-[12px] text-slate-500">
        {webinar.seatsLeft} seats left · registration required
      </p>
    </aside>
  );
}
