import { useEffect, useState } from "react";
import { UserPlus, ShieldCheck, CalendarClock, X } from "lucide-react";
import AuthModal, { type AuthMode } from "@/components/AuthModal";

interface GuestAccountPromptProps {
  /** Optional prefill for the sign-up email field (e.g. booking email). */
  email?: string;
  /** Storage key suffix so dismissal is scoped to a context (e.g. booking id). */
  scopeKey?: string;
  /** Short line describing what account unlocks in this context. */
  contextLabel?: string;
  /**
   * Visual weight. "card" (default) is the prominent marketing card.
   * "compact" is a single, subtle row for secondary placement.
   */
  variant?: "card" | "compact";
}

/**
 * Shown only to guests (no `lubin.userName` in localStorage) on pages where
 * a booking or session action has just happened. Dismissible per session.
 */
export default function GuestAccountPrompt({
  email,
  scopeKey = "default",
  contextLabel = "manage this booking",
  variant = "card",
}: GuestAccountPromptProps) {
  const [isGuest, setIsGuest] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signup");

  const dismissKey = `lubin.guestPrompt.dismissed:${scopeKey}`;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const name = window.localStorage.getItem("lubin.userName");
    setIsGuest(!name);
    setDismissed(window.sessionStorage.getItem(dismissKey) === "1");
  }, [dismissKey]);

  if (!isGuest || dismissed) return null;

  const handleDismiss = () => {
    try {
      window.sessionStorage.setItem(dismissKey, "1");
    } catch {
      /* noop */
    }
    setDismissed(true);
  };

  const openSignup = () => {
    setAuthMode("signup");
    setAuthOpen(true);
  };

  const openSignin = () => {
    setAuthMode("signin");
    setAuthOpen(true);
  };

  if (variant === "compact") {
    return (
      <>
        <div className="rounded-xl border border-[#E9E6FA] bg-white p-3.5 shadow-[0_2px_12px_-6px_rgba(124,113,176,0.18)]">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-[#F3EFFB] text-brand-purple-dark">
              <UserPlus className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] font-medium text-slate-900">
                  Save this booking to your account
                </p>
                <button
                  type="button"
                  onClick={openSignup}
                  className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-br from-brand-purple to-brand-purple-dark px-3 py-1.5 text-[11.5px] font-semibold text-white shadow-[0_4px_12px_-4px_rgba(124,113,176,0.5)] transition-all hover:-translate-y-0.5"
                >
                  Create account
                </button>
              </div>
              <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">
                Reschedule, message your provider, and keep receipts in one place. Already have one?{" "}
                <button
                  type="button"
                  onClick={openSignin}
                  className="font-semibold text-brand-purple-dark underline-offset-2 hover:underline"
                >
                  Log in
                </button>
                {email && (
                  <span className="text-slate-400">
                    {" "}· We'll use <span className="font-medium text-slate-500">{email}</span> to link it.
                  </span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss"
              className="-mr-1 -mt-1 rounded-full p-1 text-slate-400 transition hover:bg-[#F3EFFB] hover:text-brand-purple-dark"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <AuthModal
          open={authOpen}
          mode={authMode}
          onClose={() => setAuthOpen(false)}
          onSwitchMode={(m) => setAuthMode(m)}
        />
      </>
    );
  }

  return (
    <>
      <div className="mx-6 mt-2 mb-4 sm:mx-10">
        <div className="relative overflow-hidden rounded-2xl border border-[#E9E6FA] bg-gradient-to-br from-white to-[#FBFAFF] p-5 shadow-[0_10px_30px_-18px_rgba(124,113,176,0.35)]">
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="absolute right-3 top-3 rounded-full p-1 text-slate-400 hover:bg-[#F3EFFB] hover:text-brand-purple-dark"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-brand-purple to-brand-purple-dark text-white">
              <UserPlus className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10.5px] font-medium uppercase tracking-[0.24em] text-brand-purple-dark/80">
                You're not signed in yet
              </p>
              <h3 className="mt-1 text-[15px] font-semibold text-slate-900">
                Create an account to {contextLabel}
              </h3>
              <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500">
                Your booking is confirmed. Save it to your profile so you can
                reschedule, message your provider, and keep everything in one place.
              </p>

              <ul className="mt-3 space-y-1.5 text-[12px] text-slate-600">
                <li className="flex items-center gap-2">
                  <CalendarClock className="h-3 w-3 text-brand-purple" />
                  Reschedule or cancel from your profile
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-3 w-3 text-brand-purple" />
                  Secure receipts and session history
                </li>
              </ul>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={openSignup}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-brand-purple to-brand-purple-dark px-4 py-2 text-[12.5px] font-semibold text-white shadow-[0_8px_20px_-10px_rgba(124,113,176,0.7)] transition-all hover:-translate-y-0.5"
                >
                  Create free account
                </button>
                <button
                  type="button"
                  onClick={openSignin}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#E9E6FA] bg-white px-4 py-2 text-[12.5px] font-semibold text-brand-purple-dark transition-all hover:-translate-y-0.5 hover:bg-[#FBFAFF]"
                >
                  I already have one
                </button>
              </div>
              {email && (
                <p className="mt-2 text-[11px] text-slate-400">
                  We'll use <span className="font-medium text-slate-500">{email}</span> to link your booking.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <AuthModal
        open={authOpen}
        mode={authMode}
        onClose={() => setAuthOpen(false)}
        onSwitchMode={(m) => setAuthMode(m)}
      />
    </>
  );
}