import { useEffect, useState } from "react";
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
  Users,
  Video,
} from "lucide-react";
import type { Webinar } from "@/lib/webinars";

/**
 * Prototype-only webinar registration inside the existing checkout page.
 * Attendance is confirmed after Google authentication — nothing is sent for real.
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

const DEMO_EMAIL = "anna@example.com";
const DEMO_NAME = "Anna Reyes";

export default function WebinarRegistration({ webinar }: { webinar: Webinar }) {
  const [account, setAccount] = useState<{ name: string; email: string } | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [consent, setConsent] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [ref, setRef] = useState("");

  // Reuse an already-connected Lubin account so returning attendees skip signing in.
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

  const connectGoogle = () => {
    setConnecting(true);
    // Prototype only: simulates a successful Google authentication.
    setTimeout(() => {
      let name = DEMO_NAME;
      let email = DEMO_EMAIL;
      try {
        if (typeof window !== "undefined") {
          email = window.localStorage.getItem("lubin.userEmail") ?? DEMO_EMAIL;
          name = window.localStorage.getItem("lubin.userName") ?? DEMO_NAME;
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
      setAccount({ name, email });
      setConnecting(false);
    }, 700);
  };

  const submit = () => {
    if (!account || !consent) return;
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
            <CheckCircle2 className="h-4 w-4" /> Attendance confirmed
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
              Join using <span className="font-semibold">{account.email}</span> — the same account you
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
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">
          Confirm your attendance
        </h1>
        <p className="mt-1.5 text-[13.5px] text-slate-500">
          Sign in with Google, then confirm. Your joining link is sent to that same account.
        </p>

        {account ? (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-[#E9E6FA] bg-[#FAF8FD] p-3.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[13px] font-bold text-brand-purple shadow-sm">
              {account.name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-semibold text-slate-900">{account.name}</p>
              <p className="truncate text-[12.5px] text-slate-500">{account.email}</p>
            </div>
            <button
              type="button"
              onClick={() => setAccount(null)}
              className="ml-auto shrink-0 text-[12.5px] font-semibold text-brand-purple hover:underline"
            >
              Use another account
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={connectGoogle}
            disabled={connecting}
            className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#E9E6FA] bg-white px-4 py-3.5 text-[14px] font-semibold text-slate-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#C9BEE5] hover:shadow-md disabled:opacity-60"
          >
            <GoogleGlyph className="h-5 w-5" />
            {connecting ? "Connecting…" : "Continue with Google"}
          </button>
        )}

        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-dashed border-[#E9E6FA] bg-[#FBFAFF] p-4">
          <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-brand-purple" />
          <p className="text-[12.5px] leading-relaxed text-slate-600">
            {isFree ? (
              <>
                This webinar is <span className="font-semibold">free</span>, but your seat is only
                held once you confirm. The joining link is emailed right after.
              </>
            ) : (
              <>
                You'll pay {symbol}
                {webinar.price.toLocaleString()} to reserve your seat, then receive your joining link
                by email.
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

        <button
          type="button"
          onClick={submit}
          disabled={!account || !consent || processing}
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-br from-brand-purple to-brand-purple-dark px-5 py-3.5 text-[14px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(124,113,176,0.7)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {processing
            ? "Confirming your seat…"
            : isFree
              ? "Confirm attendance"
              : `Pay ${symbol}${webinar.price.toLocaleString()} and confirm attendance`}
        </button>
        {!account && (
          <p className="mt-2 text-[12px] text-slate-500">
            Sign in with Google first so we know where to send your joining link.
          </p>
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
            after you confirm.
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
        {webinar.seatsLeft} seats left · confirmation required
      </p>
    </aside>
  );
}
