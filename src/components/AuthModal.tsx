import { useEffect, useState } from "react";
import { X, ArrowRight, ArrowLeft, Check, Loader2 } from "lucide-react";

export type AuthMode = "signup" | "signin";
export type UserRole = "client" | "provider";

export type ProxySignup = {
  relationship: string;
  personName: string;
};

interface AuthModalProps {
  open: boolean;
  mode?: AuthMode;
  onClose: () => void;
  brandName?: string;
  termsHref?: string;
  privacyHref?: string;
  onContinueWithGoogle?: (role?: UserRole, proxy?: ProxySignup | null) => void;
  onContinueWithLinkedIn?: (role?: UserRole, proxy?: ProxySignup | null) => void;
  onContinueWithFacebook?: (role?: UserRole, proxy?: ProxySignup | null) => void;
  onContinueWithEmail?: (role?: UserRole, proxy?: ProxySignup | null) => void;
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
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<"google" | "linkedin" | "facebook" | null>(null);
  const [onBehalf, setOnBehalf] = useState(false);
  const [relationship, setRelationship] = useState("");
  const [personName, setPersonName] = useState("");

  useEffect(() => setMode(initialMode), [initialMode, open]);

  useEffect(() => {
    if (!open) {
      setSelectedRole(null);
      setLoadingProvider(null);
      setOnBehalf(false);
      setRelationship("");
      setPersonName("");
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
    if (role !== "client") {
      setOnBehalf(false);
      setRelationship("");
      setPersonName("");
    }
    onSelectRole?.(role);
  };

  const switchMode = () => {
    const next: AuthMode = isSignup ? "signin" : "signup";
    setMode(next);
    setSelectedRole(null);
    onSwitchMode?.(next);
  };

  const title = isSignup ? "Join" : "Welcome";
  const titleAccent = isSignup ? brandName : "back";
  const subtitle = isSignup
    ? "Tell us how you want to use Lubin so we can tailor the experience for you."
    : "Tell us who's signing in so we can take you to the right place.";
  const footerPrompt = isSignup ? "Already have an account?" : "Need to create an account?";
  const footerCta = isSignup ? "Sign in instead" : "Create an account";

  const showProxyOption = isSignup && selectedRole === "client";
  const proxyIncomplete = showProxyOption && onBehalf && (!relationship || personName.trim().length < 2);
  const proxyPayload: ProxySignup | null =
    showProxyOption && onBehalf && !proxyIncomplete
      ? { relationship, personName: personName.trim() }
      : null;
  const canShowAuthMethods = selectedRole !== null;
  const blocked = loadingProvider !== null || proxyIncomplete;

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

        <h2
          id="auth-modal-title"
          className="text-[22px] font-bold leading-tight text-[#1F1B2E]"
        >
          {title} <span className="text-[#7E6BAF]">{titleAccent}</span>
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-[#5A4E8A]">
          {subtitle}
        </p>

        <div className="mt-6 flex flex-col gap-3">
            {([
              {
                role: "client" as UserRole,
                title: isSignup ? "I need support" : "I'm a client",
                desc: isSignup
                  ? "Find providers, track your wellness, and access mental health resources"
                  : "Continue to your wellness space and providers",
              },
              {
                role: "provider" as UserRole,
                title: "I'm a provider",
                desc: isSignup
                  ? "Offer sessions, manage clients, and grow your practice"
                  : "Continue to your provider dashboard and clients",
              },
            ]).map((opt) => {
              const active = selectedRole === opt.role;
              return (
                <button
                  key={opt.role}
                  type="button"
                  onClick={() => handleSelectRole(opt.role)}
                  aria-pressed={active}
                  className={`group flex items-center gap-4 rounded-2xl border p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-10px_rgba(126,107,175,0.45)] ${
                    active
                      ? "border-[#7E6BAF] bg-white shadow-[0_8px_24px_-10px_rgba(126,107,175,0.45)] ring-2 ring-[#7E6BAF]/30"
                      : "border-[#E6DFF4] bg-white hover:border-[#C9BEE5]"
                  }`}
                >
                  <div>
                    <span className="block text-[15px] font-semibold text-[#1F1B2E]">
                      {opt.title}
                    </span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-[#5A4E8A]">
                      {opt.desc}
                    </span>
                  </div>
                  {active ? (
                    <span className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#7E6BAF] text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  ) : (
                    <ArrowRight className="ml-auto h-5 w-5 shrink-0 text-[#C9BEE5] transition-all group-hover:translate-x-0.5 group-hover:text-[#7E6BAF]" />
                  )}
                </button>
              );
            })}
          </div>

        {showProxyOption && (
          <div className="mt-4 rounded-2xl border border-[#E6DFF4] bg-white p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={onBehalf}
                onChange={(e) => setOnBehalf(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#7E6BAF]"
              />
              <span>
                <span className="block text-[14px] font-semibold text-[#1F1B2E]">
                  I'm signing up on behalf of someone else
                </span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-[#5A4E8A]">
                  For a parent, child, partner or someone you care for. You'll manage the account and can invite them later.
                </span>
              </span>
            </label>

            {onBehalf && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7E6BAF]">
                    Your relationship
                  </span>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full rounded-xl border border-[#E6DFF4] bg-white px-3 py-2.5 text-[14px] text-[#1F1B2E] outline-none focus:border-[#7E6BAF]"
                  >
                    <option value="">Select…</option>
                    <option value="parent">Parent or guardian</option>
                    <option value="child">Adult child</option>
                    <option value="partner">Partner or spouse</option>
                    <option value="sibling">Sibling</option>
                    <option value="caregiver">Caregiver or support worker</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7E6BAF]">
                    Their first name
                  </span>
                  <input
                    type="text"
                    value={personName}
                    maxLength={60}
                    onChange={(e) => setPersonName(e.target.value)}
                    placeholder="e.g. Anna"
                    className="w-full rounded-xl border border-[#E6DFF4] bg-white px-3 py-2.5 text-[14px] text-[#1F1B2E] outline-none placeholder:text-[#C9BEE5] focus:border-[#7E6BAF]"
                  />
                </label>
                {proxyIncomplete && (
                  <p className="sm:col-span-2 text-[12px] text-[#7E6BAF]">
                    Add your relationship and their first name to continue.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {canShowAuthMethods && (
        <>
        <button
          type="button"
          onClick={() => {
            setSelectedRole(null);
            setLoadingProvider(null);
          }}
          className="mt-5 flex items-center gap-1 text-xs font-semibold text-[#7E6BAF] transition hover:text-[#3D2E6B]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to role selection
        </button>
        {isSignup && (
          <p className="mt-3 text-center text-[12px] text-[#7E6BAF]">
            By continuing with Google, LinkedIn or Facebook, you agree to {brandName}'s{" "}
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
        <div className="mt-4 flex flex-col gap-2.5">
          <button
            type="button"
            disabled={blocked}
            onClick={() => {
              if (!selectedRole || proxyIncomplete) return;
              setLoadingProvider("google");
              onContinueWithGoogle?.(selectedRole, proxyPayload);
            }}
            className={`group flex items-center justify-center gap-3 rounded-full border border-[#E6DFF4] bg-white px-5 py-3 text-[14px] font-medium text-[#1F1B2E] transition-all ${
              !blocked
                ? "hover:-translate-y-0.5 hover:border-[#C9BEE5] hover:shadow-[0_8px_20px_-10px_rgba(126,107,175,0.5)]"
                : "opacity-60 cursor-not-allowed"
            }`}
          >
            {loadingProvider === "google" ? (
              <Loader2 className="h-5 w-5 animate-spin text-[#7E6BAF]" />
            ) : (
              <GoogleIcon className="h-5 w-5" />
            )}
            {loadingProvider === "google" ? "Continuing with Google…" : "Continue with Google"}
          </button>
          <button
            type="button"
            disabled={blocked}
            onClick={() => {
              if (!selectedRole || proxyIncomplete) return;
              setLoadingProvider("linkedin");
              onContinueWithLinkedIn?.(selectedRole, proxyPayload);
            }}
            className={`group flex items-center justify-center gap-3 rounded-full border border-[#E6DFF4] bg-white px-5 py-3 text-[14px] font-medium text-[#1F1B2E] transition-all ${
              !blocked
                ? "hover:-translate-y-0.5 hover:border-[#C9BEE5] hover:shadow-[0_8px_20px_-10px_rgba(126,107,175,0.5)]"
                : "opacity-60 cursor-not-allowed"
            }`}
          >
            {loadingProvider === "linkedin" ? (
              <Loader2 className="h-5 w-5 animate-spin text-[#7E6BAF]" />
            ) : (
              <LinkedInIcon className="h-5 w-5" />
            )}
            {loadingProvider === "linkedin" ? "Continuing with LinkedIn…" : "Continue with LinkedIn"}
          </button>
          <button
            type="button"
            disabled={blocked}
            onClick={() => {
              if (!selectedRole || proxyIncomplete) return;
              setLoadingProvider("facebook");
              onContinueWithFacebook?.(selectedRole, proxyPayload);
            }}
            className={`group flex items-center justify-center gap-3 rounded-full border border-[#E6DFF4] bg-white px-5 py-3 text-[14px] font-medium text-[#1F1B2E] transition-all ${
              !blocked
                ? "hover:-translate-y-0.5 hover:border-[#C9BEE5] hover:shadow-[0_8px_20px_-10px_rgba(126,107,175,0.5)]"
                : "opacity-60 cursor-not-allowed"
            }`}
          >
            {loadingProvider === "facebook" ? (
              <Loader2 className="h-5 w-5 animate-spin text-[#7E6BAF]" />
            ) : (
              <FacebookIcon className="h-5 w-5" />
            )}
            {loadingProvider === "facebook" ? "Continuing with Facebook…" : "Continue with Facebook"}
          </button>
        </div>

        </>
        )}

        <p className="mt-4 text-center text-[13px] text-[#5A4E8A]">
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
