import { useEffect, useState } from "react";
import { X, ArrowRight, ArrowLeft, Check, Loader2 } from "lucide-react";
import {
  PROXY_RELATIONSHIPS,
  loadProxySignup,
  proxyRelationshipSentence,
  relationshipLabel,
  saveProxySignup,
  type ProxySignup,
} from "@/lib/proxySignup";

export type AuthMode = "signup" | "signin";
export type UserRole = "client" | "provider";

export type { ProxySignup };

type Provider = "google" | "linkedin" | "facebook";

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

const PROVIDER_LABEL: Record<Provider, string> = {
  google: "Google",
  linkedin: "LinkedIn",
  facebook: "Facebook",
};

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
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null);
  /**
   * "choose" = role + sign-in methods.
   * "proxy" = post-authentication question, new clients only.
   * "welcome" = post-authentication confirmation for returning accounts.
   */
  const [step, setStep] = useState<"choose" | "proxy" | "welcome">("choose");
  const [authedProvider, setAuthedProvider] = useState<Provider | null>(null);
  const [onBehalf, setOnBehalf] = useState<boolean | null>(null);
  const [relationship, setRelationship] = useState("");
  const [relationshipOther, setRelationshipOther] = useState("");
  const [personName, setPersonName] = useState("");

  useEffect(() => setMode(initialMode), [initialMode, open]);

  useEffect(() => {
    if (!open) {
      setSelectedRole(null);
      setLoadingProvider(null);
      setStep("choose");
      setAuthedProvider(null);
      setOnBehalf(null);
      setRelationship("");
      setRelationshipOther("");
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
    onSelectRole?.(role);
  };

  const switchMode = () => {
    const next: AuthMode = isSignup ? "signin" : "signup";
    setMode(next);
    setSelectedRole(null);
    setStep("choose");
    setAuthedProvider(null);
    onSwitchMode?.(next);
  };

  const needsOtherText = relationship === "other" && relationshipOther.trim().length < 2;
  const proxyIncomplete =
    onBehalf === null || (onBehalf && (!relationship || needsOtherText || personName.trim().length < 2));
  const proxyPayload: ProxySignup | null =
    onBehalf && !proxyIncomplete
      ? {
          relationship,
          relationshipLabel: relationshipLabel(relationship),
          ...(relationship === "other" ? { relationshipOther: relationshipOther.trim() } : {}),
          personName: personName.trim(),
        }
      : null;

  const finish = (provider: Provider, proxy: ProxySignup | null) => {
    if (isSignup && selectedRole === "client") saveProxySignup(proxy);
    const cb =
      provider === "google"
        ? onContinueWithGoogle
        : provider === "linkedin"
          ? onContinueWithLinkedIn
          : onContinueWithFacebook;
    cb?.(selectedRole ?? undefined, proxy);
  };

  /**
   * Authentication happens on this click. Only after it succeeds do we ask a
   * new client who the account is for — the answer is captured once, at
   * registration, and never re-asked on sign-in.
   */
  const handleProvider = (provider: Provider) => {
    if (!selectedRole || loadingProvider) return;
    setLoadingProvider(provider);
    window.setTimeout(() => {
      setLoadingProvider(null);
      setAuthedProvider(provider);
      if (isSignup && selectedRole === "client") {
        setStep("proxy");
        return;
      }
      setSavedProxy(selectedRole === "client" ? loadProxySignup() : null);
      setStep("welcome");
    }, 650);
  };

  const providerLabel = PROVIDER_LABEL[authedProvider ?? "google"];
  const title =
    step === "proxy" ? "One last thing" : step === "welcome" ? "You're signed in" : isSignup ? "Join" : "Welcome";
  const titleAccent = step === "proxy" || step === "welcome" ? "" : isSignup ? brandName : "back";
  const subtitle =
    step === "proxy"
      ? `You're signed in with ${providerLabel}. Tell us who this account is for so we can set up the right passport.`
      : step === "welcome"
        ? `We recognised your ${providerLabel} account, so there's nothing new to set up.`
        : isSignup
          ? "Tell us how you want to use Lubin so we can tailor the experience for you."
          : "Tell us who's signing in so we can take you to the right place.";
  const footerPrompt = isSignup ? "Already have an account?" : "Need to create an account?";
  const footerCta = isSignup ? "Sign in instead" : "Create an account";

  const canShowAuthMethods = selectedRole !== null;

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
      <div className="relative w-full max-w-[560px] rounded-3xl bg-gradient-to-b from-[#F4EFFB] to-white p-7 shadow-[0_30px_80px_-20px_rgba(61,46,107,0.45)] animate-scale-in sm:p-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full p-1.5 text-[#7E6BAF] transition hover:bg-[#7E6BAF]/10 hover:text-[#3D2E6B]"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 id="auth-modal-title" className="text-[22px] font-bold leading-tight text-[#1F1B2E]">
          {title} {titleAccent && <span className="text-[#7E6BAF]">{titleAccent}</span>}
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-[#5A4E8A]">{subtitle}</p>

        {step === "choose" && (
          <>
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
                    className={`group flex items-center gap-3 rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-10px_rgba(126,107,175,0.45)] sm:gap-4 sm:p-5 ${
                      active
                        ? "border-[#7E6BAF] bg-[#7E6BAF] text-white shadow-sm"
                        : "border-[#E9E4F1] bg-white hover:border-[#7E6BAF]/40 hover:bg-[#F5F3F9]"
                    }`}
                  >
                    <div className="min-w-0">
                      <span className={`block text-[15px] font-semibold ${active ? "text-white" : "text-[#1F1B2E]"}`}>
                        {opt.title}
                      </span>
                      <span className={`mt-0.5 block text-[13px] leading-snug ${active ? "text-white/80" : "text-[#5A4E8A]"}`}>
                        {opt.desc}
                      </span>
                    </div>
                    {active ? (
                      <span className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[#7E6BAF]">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    ) : (
                      <ArrowRight className="ml-auto h-5 w-5 shrink-0 text-[#C9BEE5] transition-all group-hover:translate-x-0.5 group-hover:text-[#7E6BAF]" />
                    )}
                  </button>
                );
              })}
            </div>

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
                  {([
                    { key: "google" as Provider, Icon: GoogleIcon },
                    { key: "linkedin" as Provider, Icon: LinkedInIcon },
                    { key: "facebook" as Provider, Icon: FacebookIcon },
                  ]).map(({ key, Icon }) => {
                    const busy = loadingProvider === key;
                    const blocked = loadingProvider !== null;
                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={blocked}
                        onClick={() => handleProvider(key)}
                        className={`group flex items-center justify-center gap-3 rounded-full border border-[#E6DFF4] bg-white px-5 py-3 text-[14px] font-medium text-[#1F1B2E] transition-all ${
                          !blocked
                            ? "hover:-translate-y-0.5 hover:border-[#C9BEE5] hover:shadow-[0_8px_20px_-10px_rgba(126,107,175,0.5)]"
                            : "opacity-60 cursor-not-allowed"
                        }`}
                      >
                        {busy ? (
                          <Loader2 className="h-5 w-5 animate-spin text-[#7E6BAF]" />
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                        {busy
                          ? `Continuing with ${PROVIDER_LABEL[key]}…`
                          : `Continue with ${PROVIDER_LABEL[key]}`}
                      </button>
                    );
                  })}
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
          </>
        )}

        {step === "proxy" && (
          <div className="mt-6">
            <div className="rounded-2xl border border-[#E6DFF4] bg-white p-3.5">
              <span className="mb-2 block text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#7E6BAF]">
                Who is this account for?
              </span>
              <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
                {([
                  { value: false, title: "It's for me", desc: "I'm the one seeking support" },
                  { value: true, title: "For someone else", desc: "I'm a parent, partner or caregiver" },
                ]).map((opt) => {
                  const active = onBehalf === opt.value;
                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => setOnBehalf(opt.value)}
                      aria-pressed={active}
                      className={`rounded-xl border px-3 py-2.5 text-left transition ${
                        active
                          ? "border-[#7E6BAF] bg-[#7E6BAF] text-white shadow-sm"
                          : "border-[#E9E4F1] bg-white hover:border-[#7E6BAF]/40 hover:bg-[#F5F3F9]"
                      }`}
                    >
                      <span className={`block text-[13px] font-semibold ${active ? "text-white" : "text-[#1F1B2E]"}`}>
                        {opt.title}
                      </span>
                      <span className={`mt-0.5 block text-[11.5px] leading-snug ${active ? "text-white/80" : "text-[#5A4E8A]"}`}>
                        {opt.desc}
                      </span>
                    </button>
                  );
                })}
              </div>

              {onBehalf === true && (
                <div className="mt-3 space-y-3">
                  <div className="rounded-2xl border border-[#7E6BAF]/10 bg-[#FAF9FC] p-4">
                    <span className="mb-3 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#7E6BAF]">
                      Your relationship to them
                    </span>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {PROXY_RELATIONSHIPS.map((opt) => {
                        const active = relationship === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setRelationship(opt.value)}
                            aria-pressed={active}
                            className={`flex items-center px-4 py-3.5 text-left text-[13.5px] font-medium leading-snug transition-all ${
                              active
                                ? "rounded-xl border border-[#7E6BAF] bg-[#7E6BAF] text-white shadow-sm"
                                : "rounded-xl border border-[#E9E4F1] bg-white text-[#7E6BAF] hover:border-[#7E6BAF]/40 hover:bg-[#F5F3F9]"
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {relationship === "other" && (
                    <label className="block">
                      <span className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#7E6BAF]">
                        How are you related?
                      </span>
                      <input
                        type="text"
                        value={relationshipOther}
                        maxLength={60}
                        onChange={(e) => setRelationshipOther(e.target.value)}
                        placeholder="e.g. Family friend"
                        className="w-full rounded-lg border border-[#E6DFF4] bg-white px-3 py-2 text-[13.5px] text-[#1F1B2E] outline-none placeholder:text-[#C9BEE5] focus:border-[#7E6BAF]"
                      />
                    </label>
                  )}

                  <label className="block">
                    <span className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#7E6BAF]">
                      Their first name
                    </span>
                    <input
                      type="text"
                      value={personName}
                      maxLength={60}
                      onChange={(e) => setPersonName(e.target.value)}
                      placeholder="e.g. Anna"
                      className="w-full rounded-lg border border-[#E6DFF4] bg-white px-3 py-2 text-[13.5px] text-[#1F1B2E] outline-none placeholder:text-[#C9BEE5] focus:border-[#7E6BAF]"
                    />
                  </label>

                  {proxyIncomplete ? (
                    <p className="text-[11.5px] text-[#7E6BAF]">
                      Pick your relationship and add their first name to continue.
                    </p>
                  ) : (
                    <p className="text-[11.5px] text-[#5A4E8A]">
                      {proxyRelationshipSentence(proxyPayload)}
                    </p>
                  )}
                </div>
              )}
            </div>

            <p className="mt-3 text-[11.5px] leading-snug text-[#5A4E8A]">
              This is asked once, now. You can change it later in your profile settings — signing in
              again won't ask you to choose.
            </p>

            <button
              type="button"
              disabled={proxyIncomplete}
              onClick={() => finish(authedProvider ?? "google", proxyPayload)}
              className={`mt-4 flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-[14px] font-semibold text-white transition-all ${
                proxyIncomplete
                  ? "cursor-not-allowed bg-[#C9BEE5]"
                  : "bg-[#7E6BAF] hover:-translate-y-0.5 hover:bg-[#6C5A9E]"
              }`}
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
