import { useEffect, useState } from "react";
import { X, Mail, ArrowRight, HeartPulse, Briefcase, ArrowLeft } from "lucide-react";

export type AuthMode = "signup" | "signin";
export type UserRole = "client" | "provider";

interface AuthModalProps {
  open: boolean;
  mode?: AuthMode;
  onClose: () => void;
  brandName?: string;
  termsHref?: string;
  privacyHref?: string;
  onContinueWithGoogle?: (role?: UserRole) => void;
  onContinueWithLinkedIn?: (role?: UserRole) => void;
  onContinueWithFacebook?: (role?: UserRole) => void;
  onContinueWithEmail?: (role?: UserRole) => void;
  onSwitchMode?: (mode: AuthMode) => void;
  onSelectRole?: (role: UserRole) => void;
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.06-1.1-.16-1.6H12z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect width="24" height="24" rx="4" fill="#0A66C2" />
      <path fill="#fff" d="M7.1 9.4h2.6V17H7.1V9.4zM8.4 6.2a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM11.4 9.4H14v1h.03c.36-.68 1.24-1.4 2.56-1.4 2.74 0 3.24 1.8 3.24 4.14V17h-2.6v-3.4c0-.81-.02-1.86-1.13-1.86-1.13 0-1.3.88-1.3 1.8V17h-2.6V9.4z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#1877F2" />
      <path fill="#fff" d="M13.4 21.9v-7.7h2.6l.4-3h-3v-1.9c0-.87.24-1.46 1.5-1.46h1.6V5.13c-.28-.04-1.23-.12-2.34-.12-2.32 0-3.9 1.4-3.9 4v2.23H7.6v3h2.66v7.7h3.14z" />
    </svg>
  );
}

export default function AuthModal({
  open,
  mode: initialMode = "signup",
  onClose,
  brandName = "Lubin",
  termsHref = "/terms",
  privacyHref = "/privacy",
  onContinueWithGoogle,
  onContinueWithLinkedIn,
  onContinueWithFacebook,
  onContinueWithEmail,
  onSwitchMode,
  onSelectRole,
}: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [signupStep, setSignupStep] = useState<"role-select" | "signup-form">("role-select");
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  useEffect(() => setMode(initialMode), [initialMode, open]);

  useEffect(() => {
    if (!open) {
      setSignupStep("role-select");
      setSelectedRole(null);
      return;
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const isSignup = mode === "signup";

  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role);
    setSignupStep("signup-form");
    onSelectRole?.(role);
  };

  const goBackToRoleSelect = () => {
    setSignupStep("role-select");
    setSelectedRole(null);
  };

  const switchMode = () => {
    const next: AuthMode = isSignup ? "signin" : "signup";
    setMode(next);
    setSignupStep("role-select");
    setSelectedRole(null);
    onSwitchMode?.(next);
  };

  // Role Selection Step (signup only)
  if (isSignup && signupStep === "role-select") {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
        style={{ fontFamily: "Inter, sans-serif" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute inset-0 bg-[#3D2E6B]/55 backdrop-blur-sm"
        />
        <div className="relative w-full max-w-[480px] overflow-hidden rounded-[28px] bg-gradient-to-br from-white via-[#F8F4FE] to-[#EFE6FB] p-7 shadow-[0_40px_100px_-20px_rgba(61,46,107,0.55)] ring-1 ring-white/60 animate-scale-in sm:p-9">
          {/* Decorative glows */}
          <div className="pointer-events-none absolute -top-24 -right-20 h-56 w-56 rounded-full bg-gradient-to-br from-[#B79CFF]/40 to-[#7E6BAF]/0 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-16 h-56 w-56 rounded-full bg-gradient-to-tr from-[#F4C7E1]/50 to-transparent blur-3xl" />

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 rounded-full bg-white/70 p-1.5 text-[#7E6BAF] backdrop-blur transition hover:bg-white hover:text-[#3D2E6B] hover:rotate-90 duration-300"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7E6BAF] ring-1 ring-[#E6DFF4] backdrop-blur">
              <Sparkles className="h-3 w-3" />
              Welcome
            </span>
            <h2
              id="auth-modal-title"
              className="mt-3 text-[28px] font-bold leading-tight tracking-tight text-[#1F1B2E]"
            >
              Join{" "}
              <span className="bg-gradient-to-r from-[#7E6BAF] via-[#A48BD9] to-[#7E6BAF] bg-clip-text text-transparent">
                Lubin
              </span>
            </h2>
            <p className="mt-2.5 text-[14px] leading-relaxed text-[#5A4E8A]">
              Tell us how you want to use Lubin so we can tailor the experience for you.
            </p>
          </div>

          <div className="relative mt-7 flex flex-col gap-3.5">
            <button
              type="button"
              onClick={() => handleSelectRole("client")}
              className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-[#E6DFF4] bg-white/90 p-5 text-left backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-transparent hover:bg-white hover:shadow-[0_18px_40px_-12px_rgba(126,107,175,0.55)]"
            >
              <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#F4EFFB] via-transparent to-[#FDF2F8] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F4EFFB] to-[#E6DFF4] text-[#7E6BAF] shadow-inner ring-1 ring-white/80 transition-all duration-300 group-hover:from-[#7E6BAF] group-hover:to-[#A48BD9] group-hover:text-white group-hover:shadow-[0_8px_20px_-6px_rgba(126,107,175,0.6)]">
                <HeartPulse className="h-6 w-6" />
              </div>
              <div>
                <span className="block text-[16px] font-semibold text-[#1F1B2E]">
                  I need support
                </span>
                <span className="mt-1 block text-[13px] leading-snug text-[#5A4E8A]">
                  Find providers, track your wellness, and access mental health resources
                </span>
              </div>
              <ArrowRight className="ml-auto h-5 w-5 shrink-0 text-[#C9BEE5] transition-all duration-300 group-hover:translate-x-1 group-hover:text-[#7E6BAF]" />
            </button>

            <button
              type="button"
              onClick={() => handleSelectRole("provider")}
              className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-[#E6DFF4] bg-white/90 p-5 text-left backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-transparent hover:bg-white hover:shadow-[0_18px_40px_-12px_rgba(126,107,175,0.55)]"
            >
              <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#EFE9FB] via-transparent to-[#EAF4FB] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F4EFFB] to-[#E6DFF4] text-[#7E6BAF] shadow-inner ring-1 ring-white/80 transition-all duration-300 group-hover:from-[#7E6BAF] group-hover:to-[#A48BD9] group-hover:text-white group-hover:shadow-[0_8px_20px_-6px_rgba(126,107,175,0.6)]">
                <Briefcase className="h-6 w-6" />
              </div>
              <div>
                <span className="block text-[16px] font-semibold text-[#1F1B2E]">
                  I'm a provider
                </span>
                <span className="mt-1 block text-[13px] leading-snug text-[#5A4E8A]">
                  Offer sessions, manage clients, and grow your practice
                </span>
              </div>
              <ArrowRight className="ml-auto h-5 w-5 shrink-0 text-[#C9BEE5] transition-all duration-300 group-hover:translate-x-1 group-hover:text-[#7E6BAF]" />
            </button>
          </div>

          <div className="relative mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#E6DFF4] to-transparent" />
            <span className="text-[11px] uppercase tracking-[0.14em] text-[#9A8DC0]">or</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#E6DFF4] to-transparent" />
          </div>

          <p className="relative mt-4 text-center text-[13px] text-[#5A4E8A]">
            Already have an account?{" "}
            <button
              type="button"
              onClick={switchMode}
              className="font-semibold text-[#7E6BAF] underline-offset-2 hover:underline hover:text-[#3D2E6B]"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    );
  }

  const title = isSignup ? "Create your" : "Welcome";
  const titleAccent = isSignup ? "free account" : "back";
  const subtitle = isSignup
    ? "Pick the option you prefer. It takes less than a minute, and your results will be saved right away."
    : "Choose how you'd like to sign in. Your data is right where you left it.";
  const emailLabel = isSignup ? "Sign up with email" : "Sign in with email";
  const footerPrompt = isSignup ? "Already have an account?" : "New here?";
  const footerCta = isSignup ? "Sign in" : "Create an account";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
      style={{ fontFamily: "Inter, sans-serif" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-[#3D2E6B]/55 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-[460px] rounded-3xl bg-gradient-to-b from-[#F4EFFB] to-white p-7 shadow-[0_30px_80px_-20px_rgba(61,46,107,0.45)] animate-scale-in sm:p-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full p-1.5 text-[#7E6BAF] transition hover:bg-[#7E6BAF]/10 hover:text-[#3D2E6B]"
        >
          <X className="h-5 w-5" />
        </button>

        {isSignup && (
          <button
            type="button"
            onClick={goBackToRoleSelect}
            aria-label="Back"
            className="absolute left-4 top-4 rounded-full p-1.5 text-[#7E6BAF] transition hover:bg-[#7E6BAF]/10 hover:text-[#3D2E6B]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}

        <h2
          id="auth-modal-title"
          className="text-[22px] font-bold leading-tight text-[#1F1B2E]"
        >
          {title} <span className="text-[#7E6BAF]">{titleAccent}</span>
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-[#5A4E8A]">
          {subtitle}
        </p>

        {isSignup && selectedRole && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#F4EFFB] px-3 py-1.5 text-[12px] font-medium text-[#7E6BAF]">
            {selectedRole === "client" ? (
              <>
                <HeartPulse className="h-3.5 w-3.5" />
                I need support
              </>
            ) : (
              <>
                <Briefcase className="h-3.5 w-3.5" />
                I'm a provider
              </>
            )}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => onContinueWithGoogle?.(selectedRole ?? undefined)}
            className="group flex items-center justify-center gap-3 rounded-full border border-[#E6DFF4] bg-white px-5 py-3 text-[14px] font-medium text-[#1F1B2E] transition-all hover:-translate-y-0.5 hover:border-[#C9BEE5] hover:shadow-[0_8px_20px_-10px_rgba(126,107,175,0.5)]"
          >
            <GoogleIcon className="h-5 w-5" />
            Continue with Google
          </button>
          <button
            type="button"
            onClick={() => onContinueWithLinkedIn?.(selectedRole ?? undefined)}
            className="group flex items-center justify-center gap-3 rounded-full border border-[#E6DFF4] bg-white px-5 py-3 text-[14px] font-medium text-[#1F1B2E] transition-all hover:-translate-y-0.5 hover:border-[#C9BEE5] hover:shadow-[0_8px_20px_-10px_rgba(126,107,175,0.5)]"
          >
            <LinkedInIcon className="h-5 w-5" />
            Continue with LinkedIn
          </button>
          <button
            type="button"
            onClick={() => onContinueWithFacebook?.(selectedRole ?? undefined)}
            className="group flex items-center justify-center gap-3 rounded-full border border-[#E6DFF4] bg-white px-5 py-3 text-[14px] font-medium text-[#1F1B2E] transition-all hover:-translate-y-0.5 hover:border-[#C9BEE5] hover:shadow-[0_8px_20px_-10px_rgba(126,107,175,0.5)]"
          >
            <FacebookIcon className="h-5 w-5" />
            Continue with Facebook
          </button>
        </div>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#E6DFF4]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7E6BAF]">
            or
          </span>
          <div className="h-px flex-1 bg-[#E6DFF4]" />
        </div>

        <button
          type="button"
          onClick={() => onContinueWithEmail?.(selectedRole ?? undefined)}
          className="group flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#A89BD0] to-[#7E6BAF] px-5 py-3 text-[14px] font-semibold text-white shadow-[0_10px_24px_-8px_rgba(126,107,175,0.55)] transition-all hover:-translate-y-0.5 hover:from-[#7E6BAF] hover:to-[#5A4E8A] hover:shadow-[0_14px_30px_-8px_rgba(61,46,107,0.55)]"
        >
          <Mail className="h-4 w-4" />
          {emailLabel}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>

        {isSignup && (
          <p className="mt-4 text-center text-[12px] text-[#7E6BAF]">
            By continuing, you agree to {brandName}'s{" "}
            <a href={termsHref} className="font-medium text-[#5A4E8A] underline underline-offset-2 hover:text-[#3D2E6B]">
              Terms
            </a>{" "}
            and{" "}
            <a href={privacyHref} className="font-medium text-[#5A4E8A] underline underline-offset-2 hover:text-[#3D2E6B]">
              Privacy Policy
            </a>
            .
          </p>
        )}

        <p className="mt-3 text-center text-[13px] text-[#5A4E8A]">
          {footerPrompt}{" "}
          <button
            type="button"
            onClick={switchMode}
            className="font-semibold text-[#7E6BAF] underline-offset-2 hover:underline hover:text-[#3D2E6B]"
          >
            {footerCta}
          </button>
        </p>
      </div>
    </div>
  );
}
