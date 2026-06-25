import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Sparkles, Linkedin, Loader2, RefreshCw, Check, ChevronUp, Calendar as CalendarIcon, Clock, Plus, X, Globe, Mail, Facebook, UserPlus } from "lucide-react";
import Navbar from "@/components/Navbar";

export const Route = createFileRoute("/provider-onboarding")({
  head: () => ({
    meta: [
      { title: "Provider onboarding — Lubin" },
      {
        name: "description",
        content:
          "Set up your Lubin provider profile in a few quick steps — share your specialty, focus areas, and availability.",
      },
      { property: "og:title", content: "Provider onboarding — Lubin" },
      {
        property: "og:description",
        content: "Welcome to Lubin. Tell us about your practice so clients can find you.",
      },
    ],
  }),
  component: ProviderOnboardingPage,
});

type Specialty =
  | "therapist"
  | "psychologist"
  | "coach"
  | "psychiatrist"
  | "counselor"
  | "other";

const SPECIALTIES: { id: Specialty; label: string }[] = [
  { id: "therapist", label: "Therapist" },
  { id: "psychologist", label: "Psychologist" },
  { id: "counselor", label: "Counselor" },
  { id: "psychiatrist", label: "Psychiatrist" },
  { id: "coach", label: "Wellness coach" },
  { id: "other", label: "Other" },
];

const STEPS = ["Registration", "Profile Customization", "Calendar & Sessions", "Review"] as const;

type FocusArea =
  | "anxiety"
  | "depression"
  | "trauma"
  | "relationships"
  | "stress"
  | "selfesteem"
  | "grief"
  | "mindfulness"
  | "sleep";

const FOCUS_AREAS: { id: FocusArea; label: string }[] = [
  { id: "anxiety", label: "Anxiety & Panic" },
  { id: "depression", label: "Depression & Mood" },
  { id: "trauma", label: "Trauma & PTSD" },
  { id: "relationships", label: "Relationships" },
  { id: "stress", label: "Stress & Burnout" },
  { id: "selfesteem", label: "Self-esteem" },
  { id: "grief", label: "Grief & Loss" },
  { id: "mindfulness", label: "Mindfulness" },
  { id: "sleep", label: "Sleep & Rest" },
];

const YEARS_BANDS: { id: string; label: string }[] = [
  { id: "0-2", label: "Just starting (0–2 yrs)" },
  { id: "3-5", label: "3–5 yrs" },
  { id: "6-10", label: "6–10 yrs" },
  { id: "11-20", label: "11–20 yrs" },
  { id: "20+", label: "20+ yrs" },
];

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.06-1.1-.16-1.6H12z" />
    </svg>
  );
}

function ProviderOnboardingPage() {
  // (GoogleGlyph defined below module-scope)
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [specialty, setSpecialty] = useState<Specialty | null>(null);
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>([]);
  const [yearsBand, setYearsBand] = useState<string | null>(null);
  const [sessionTypes, setSessionTypes] = useState<{ video: boolean; inPerson: boolean }>({
    video: true,
    inPerson: false,
  });
  const [rate, setRate] = useState("");
  const [sessionLength, setSessionLength] = useState<number>(50);
  const [calendarChoice, setCalendarChoice] = useState<"connected" | "later" | null>(null);
  const [sessionName, setSessionName] = useState("");
  const [addedServices, setAddedServices] = useState<string[]>([]);
  const [customServices, setCustomServices] = useState<
    { id: string; title: string; duration: string; price: string }[]
  >([]);
  const [showAddCustom, setShowAddCustom] = useState(false);

  // --- Currency (locale-aware) -------------------------------------------------
  // Detected from the browser's region; defaults to USD. In dev, a small
  // floating widget lets us preview PH vs US without changing region.
  const detectedRegion = useMemo(() => {
    if (typeof navigator === "undefined") return "US";
    try {
      const loc = new Intl.Locale(navigator.language) as Intl.Locale & { region?: string };
      return loc.region || "US";
    } catch {
      return "US";
    }
  }, []);
  const [regionOverride, setRegionOverride] = useState<string | null>(null);
  const region = regionOverride ?? detectedRegion;
  const currency = region === "PH" ? { code: "PHP", symbol: "₱" } : { code: "USD", symbol: "$" };

  const defaultSessionName = (() => {
    const map: Record<Specialty, string> = {
      therapist: "1:1 Therapy Session",
      psychologist: "Clinical Psychology Session",
      counselor: "Counseling Session",
      psychiatrist: "Psychiatry Consultation",
      coach: "Coaching Session",
      other: "1:1 Session",
    };
    return specialty ? map[specialty] : "1:1 Session";
  })();

  useEffect(() => {
    if (step === 2 && !sessionName && specialty) {
      setSessionName(defaultSessionName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, specialty]);

  const rateNum = Number(rate) || 0;
  const fmtPrice = (n: number) =>
    n > 0 ? `${currency.symbol}${Math.round(n).toLocaleString()} ${currency.code}` : "Set in dashboard";
  const suggestedServices = [
    {
      id: "intro",
      title: "Free intro call",
      duration: "15 min",
      price: "Free",
      desc: "A short, no-pressure call so new clients can see if you're the right fit.",
    },
    {
      id: "deep",
      title: "Deep-dive session",
      duration: "90 min",
      price: fmtPrice(rateNum * 1.6),
      desc: "Extended time for first sessions or harder topics that need room to breathe.",
    },
    {
      id: "checkin",
      title: "Quick check-in",
      duration: "30 min",
      price: fmtPrice(rateNum * 0.6),
      desc: "A lighter touchpoint between full sessions — good for momentum.",
    },
  ];

  // Simulated LinkedIn import — in production this comes from the OAuth callback.
  const [linkedInImported, setLinkedInImported] = useState(false);
  const [enhanceOpen, setEnhanceOpen] = useState<null | "headline" | "bio">(null);

  // Which auth provider the user signed up with. In production this is derived
  // from the OAuth callback / session. The dev chip below lets us preview each
  // variant of the sync banner + prefill behavior.
  type SignupSource = "linkedin" | "google" | "facebook" | "email";
  const [signupSource, setSignupSource] = useState<SignupSource>("linkedin");

  useEffect(() => {
    // Simulate OAuth prefill on signup source change. Different providers
    // expose different fields, so we mirror that here for the dev preview.
    setFullName("");
    setHeadline("");
    setBio("");
    setLinkedInImported(false);
    const t = setTimeout(() => {
      if (signupSource === "linkedin") {
        setFullName("Dr. Jane Doe");
        setSpecialty((v) => v ?? "psychologist");
        setHeadline(
          "Clinical psychologist · Helping adults navigate anxiety and burnout",
        );
        setBio(
          "I'm a licensed clinical psychologist with over 8 years of experience supporting adults through anxiety, stress, and life transitions. My approach blends evidence-based therapy with warmth and curiosity.",
        );
      } else if (signupSource === "google" || signupSource === "facebook") {
        // Social providers only give us a name (and avatar/email we don't show here).
        setFullName("Jane Doe");
      }
      // email: nothing prefilled — user fills everything in by hand.
      setLinkedInImported(true);
    }, 400);
    return () => clearTimeout(t);
  }, [signupSource]);

  const requestEnhancement = async (opts: {
    field: "headline" | "bio";
    tone?: string;
    instruction?: string;
  }) => {
    const res = await fetch("/api/enhance-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        field: opts.field,
        current: opts.field === "headline" ? headline : bio,
        tone: opts.tone,
        instruction: opts.instruction,
        context: {
          fullName,
          specialty: specialty ?? undefined,
          focus: focusAreas[0],
        },
      }),
    });
    const data = (await res.json()) as { text?: string; error?: string };
    if (!res.ok || !data.text) {
      throw new Error(data.error || "Couldn't enhance right now. Try again in a moment.");
    }
    return data.text;
  };

  const canNext =
    step === 0
      ? fullName.trim().length > 1 && specialty !== null
      : step === 1
      ? focusAreas.length > 0 && yearsBand !== null
      : step === 2
      ? sessionTypes.video &&
        sessionName.trim().length > 0 &&
        rate.trim().length > 0 &&
        calendarChoice !== null
      : true;

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else navigate({ to: "/profile" });
  };

  const handleSkipExtras = () => navigate({ to: "/profile" });

  const handleBack = () => {
    if (step === 0) navigate({ to: "/" });
    else setStep(step - 1);
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#F0EAFB]"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <div className="pointer-events-none fixed -top-[10%] -right-[10%] -z-0 h-[600px] w-[600px] rounded-full bg-[#7E6BAF]/20 blur-[120px]" />
      <div className="pointer-events-none fixed -bottom-[10%] -left-[10%] -z-0 h-[600px] w-[600px] rounded-full bg-[#A89BD0]/30 blur-[120px]" />
      <Navbar />

      <main className="relative z-10 mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pb-20 pt-32 sm:px-6">
        <div className="rounded-3xl border border-[#E3DBF5]/60 bg-[#FBF9FF]/90 p-8 shadow-xl shadow-[#3D2E6B]/10 backdrop-blur-xl md:p-14">
          {/* Progress */}
          <div className="mb-12 flex items-center justify-between px-1">
            <div className="flex space-x-2">
              {STEPS.map((label, i) => (
                <div
                  key={label}
                  className={`h-1.5 w-12 rounded-full transition-all ${
                    i <= step ? "bg-[#7E6BAF]" : "bg-[#A89BD0]/30"
                  }`}
                />
              ))}
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#A89BD0]">
              Step {step + 1} of {STEPS.length}
            </span>
          </div>

          {step === 0 && (
            <>
              <PageHeader
                title="Tell us about yourself"
                subtitle="A gentle introduction helps clients feel safe and understood."
              />
              {linkedInImported && (() => {
                const banner = {
                  linkedin: {
                    Icon: Linkedin,
                    title: "Synced from your LinkedIn profile",
                    subtitle: "Use AI to enhance your headline or bio anytime.",
                    filled: true,
                    brand: false,
                  },
                  google: {
                    Icon: GoogleGlyph,
                    title: "Signed up with Google",
                    subtitle: "We pulled in your name — add a headline and bio, or let AI draft them for you.",
                    filled: false,
                    brand: false,
                  },
                  facebook: {
                    Icon: Facebook,
                    title: "Signed up with Facebook",
                    subtitle: "We pulled in your name — add a headline and bio, or let AI draft them for you.",
                    filled: false,
                    brand: false,
                  },
                  email: {
                    Icon: Mail,
                    title: "Signed up with email",
                    subtitle: "Add a headline and bio to finish your profile — or let AI draft them for you.",
                    filled: false,
                    brand: false,
                  },
                }[signupSource];
                const { Icon } = banner;
                return (
                  <div className="mb-8 flex items-center gap-3 rounded-xl border border-[#E3DBF5]/70 bg-white/80 px-4 py-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#7E6BAF] text-white">
                      <Icon
                        className="h-4 w-4"
                        {...(banner.filled ? { fill: "currentColor", strokeWidth: 0 } : {})}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#3D2E6B]">{banner.title}</p>
                      <p className="text-[12px] text-[#A89BD0]">{banner.subtitle}</p>
                    </div>
                  </div>
                );
              })()}
              <div className="space-y-8">
                <TextField
                  label="Full name"
                  value={fullName}
                  onChange={setFullName}
                  placeholder="Dr. Jane Doe"
                />

                <Field label="Your profession">
                  <PillGrid
                    options={SPECIALTIES}
                    value={specialty}
                    onChange={(v) => setSpecialty(v as Specialty)}
                  />
                </Field>

                <div className="space-y-2.5">
                  <TextField
                    label="Professional headline"
                    value={headline}
                    onChange={setHeadline}
                    placeholder="Clinical psychologist · Anxiety & burnout"
                    inputAction={
                      <AiAssistButton
                        onClick={() =>
                          setEnhanceOpen(enhanceOpen === "headline" ? null : "headline")
                        }
                        active={enhanceOpen === "headline"}
                        title="Enhance with AI"
                      />
                    }
                  />
                  {enhanceOpen === "headline" && (
                    <InlineEnhancePanel
                      field="headline"
                      current={headline}
                      onClose={() => setEnhanceOpen(null)}
                      onApply={(text) => {
                        setHeadline(text);
                        setEnhanceOpen(null);
                      }}
                      generate={(tone, instruction) =>
                        requestEnhancement({ field: "headline", tone, instruction })
                      }
                    />
                  )}
                </div>

                <div className="space-y-2.5">
                  <TextAreaField
                    label="Short bio"
                    value={bio}
                    onChange={setBio}
                    placeholder="Share a couple of sentences about your approach..."
                    inputAction={
                      <AiAssistButton
                        onClick={() =>
                          setEnhanceOpen(enhanceOpen === "bio" ? null : "bio")
                        }
                        active={enhanceOpen === "bio"}
                        title="Enhance with AI"
                      />
                    }
                  />
                  {enhanceOpen === "bio" && (
                    <InlineEnhancePanel
                      field="bio"
                      current={bio}
                      onClose={() => setEnhanceOpen(null)}
                      onApply={(text) => {
                        setBio(text);
                        setEnhanceOpen(null);
                      }}
                      generate={(tone, instruction) =>
                        requestEnhancement({ field: "bio", tone, instruction })
                      }
                    />
                  )}
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <PageHeader
                title="Tell us about your practice"
                subtitle="This helps us match you with clients whose needs align with your care."
              />
              <div className="space-y-8">
                <Field
                  label="Focus areas"
                  hint="Select all that apply — we use this to match you with the right clients."
                >
                  <PillGridMulti
                    options={FOCUS_AREAS}
                    value={focusAreas}
                    onChange={setFocusAreas}
                  />
                </Field>

                <Field
                  label="Years of experience"
                  hint="A rough range is enough — clients see this as context, not a credential."
                >
                  <div className="flex flex-wrap gap-2">
                    {YEARS_BANDS.map((b) => {
                      const active = yearsBand === b.id;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setYearsBand(active ? null : b.id)}
                          className={`rounded-full border px-4 py-2 text-[13px] font-medium transition-all ${
                            active
                              ? "border-[#7E6BAF] bg-[#7E6BAF] text-white shadow-sm shadow-[#7E6BAF]/25"
                              : "border-[#E3DBF5] bg-white text-[#7E6BAF] hover:border-[#A89BD0]"
                          }`}
                        >
                          {b.label}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <div className="flex items-start gap-3 rounded-2xl border border-[#E3DBF5]/70 bg-white/60 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F4EEFB]">
                    <ShieldCheck className="h-4 w-4 text-[#7E6BAF]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-[#3D2E6B]">
                      Add a verified badge later (optional)
                    </p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-[#7E6BAF]">
                      Whether you're a licensed clinician, coach, or peer practitioner —
                      you can join Lubin today. If you'd like a verified badge on your
                      profile, you can submit credentials anytime from your dashboard.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <PageHeader
                title="Connect your calendar & set up a session"
                subtitle="Your calendar is your availability — connect it and Lubin reads your free time automatically. No separate working-hours setup needed."
              />
              <div className="space-y-8">
                {/* Calendar connection */}
                <div className="rounded-2xl border border-[#E3DBF5] bg-white/70 p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F0EAFB]">
                      <CalendarIcon className="h-5 w-5 text-[#7E6BAF]" strokeWidth={2} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-[15px] font-semibold text-[#2D1B4E]">
                        Google Calendar
                      </h3>
                      <p className="mt-1 text-[13px] leading-relaxed text-[#7E6BAF]">
                        Lubin reads your busy times only — never event details — so
                        clients can see your real openings and book without back-and-forth.
                        You stay in control of every confirmation.
                      </p>

                      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => setCalendarChoice("connected")}
                          className={`group flex items-center justify-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                            calendarChoice === "connected"
                              ? "border-[#7E6BAF] bg-[#7E6BAF] text-white shadow-md shadow-[#7E6BAF]/25"
                              : "border-[#E3DBF5] bg-white text-[#2D1B4E] hover:border-[#A89BD0]"
                          }`}
                        >
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm">
                            <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden>
                              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
                              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                              <path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.4l-6.5-5.3C29.5 34.7 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
                              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.5 5.3C41.9 35.5 44 30.1 44 24c0-1.3-.1-2.4-.4-3.5z"/>
                            </svg>
                          </span>
                          {calendarChoice === "connected" ? "Connected" : "Connect Google Calendar"}
                          {calendarChoice === "connected" && <Check className="ml-1 h-4 w-4" strokeWidth={2.5} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setCalendarChoice("later")}
                          className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                            calendarChoice === "later"
                              ? "border-[#7E6BAF] bg-[#F0EAFB] text-[#2D1B4E]"
                              : "border-[#E3DBF5] bg-white text-[#7E6BAF] hover:border-[#A89BD0]"
                          }`}
                        >
                          I'll set this up later
                        </button>
                      </div>

                      {calendarChoice === "later" && (
                        <p className="mt-3 rounded-lg bg-[#FFF7E6] px-3 py-2 text-[12px] leading-relaxed text-[#8A6D1F]">
                          Heads up — your profile won't go live until you connect a
                          calendar. We'll save your progress and you can finish this
                          from your dashboard anytime.
                        </p>
                      )}

                      <div className="mt-4 border-t border-[#EFE8FA] pt-3">
                        <p className="text-[12px] font-medium text-[#7E6BAF]">
                          More calendars coming soon
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {["Outlook", "Apple Calendar", "iCal feed"].map((label) => (
                            <span
                              key={label}
                              className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[#D9CDF0] bg-white/60 px-2.5 py-1 text-[11px] font-medium text-[#7E6BAF]"
                            >
                              {label}
                              <span className="rounded-full bg-[#F0EAFB] px-1.5 py-[1px] text-[10px] uppercase tracking-wide text-[#5E4A8C]">
                                Soon
                              </span>
                            </span>
                          ))}
                        </div>
                        <p className="mt-2 text-[11px] leading-relaxed text-[#A89BD0]">
                          Google Calendar first — Outlook, Apple, and iCal support are
                          on the way. We'll email you the moment your preferred calendar
                          is ready to connect.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Session offering */}
                <div>
                  <h3 className="text-[15px] font-semibold text-[#2D1B4E]">
                    What a session with you looks like
                  </h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-[#7E6BAF]">
                    Set up your main bookable session — this is what clients see when
                    they book. You can add intro calls and longer formats on the next step.
                  </p>
                </div>

                <TextField
                  label="Session name"
                  value={sessionName}
                  onChange={setSessionName}
                  placeholder={defaultSessionName}
                  inputAction={
                    <button
                      type="button"
                      onClick={() => setSessionName(defaultSessionName)}
                      title="Use AI suggestion"
                      aria-label="Use AI suggestion"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#CFC3EA] to-[#B5A4D8] text-white shadow-sm ring-1 ring-white/70 transition hover:from-[#9A88C7] hover:to-[#7E6BAF] active:scale-95"
                    >
                      <Sparkles className="h-4 w-4" fill="currentColor" strokeWidth={1.5} />
                    </button>
                  }
                />

                <Field label="How you meet">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Toggle
                      label="Video sessions"
                      active={sessionTypes.video}
                      onClick={() =>
                        setSessionTypes((s) => ({ ...s, video: !s.video }))
                      }
                    />
                    <div className="flex items-center justify-between rounded-xl border border-dashed border-[#E3DBF5] bg-white/40 p-4 text-left opacity-70">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#7E6BAF]">In-person sessions</p>
                        <p className="mt-0.5 text-[11px] text-[#A89BD0]">Coming soon</p>
                      </div>
                      <span className="rounded-full bg-[#F0EAFB] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#7E6BAF]">
                        Soon
                      </span>
                    </div>
                  </div>
                </Field>

                <Field label="Session length">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[30, 50, 60, 90].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setSessionLength(mins)}
                        className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                          sessionLength === mins
                            ? "border-[#7E6BAF] bg-[#7E6BAF] text-white"
                            : "border-[#E3DBF5] bg-white text-[#2D1B4E] hover:border-[#A89BD0]"
                        }`}
                      >
                        <Clock className="h-3.5 w-3.5 opacity-70" strokeWidth={2} />
                        {mins} min
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Standard session rate">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] font-medium text-[#A89BD0]">
                      {currency.symbol}
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={rate}
                      placeholder={currency.code === "PHP" ? "3500" : "120"}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/[^\d.]/g, "");
                        setRate(cleaned);
                      }}
                      className="w-full rounded-xl border border-[#E3DBF5]/70 bg-white/60 px-5 py-4 pl-8 pr-16 text-[15px] text-[#3D2E6B] placeholder:text-[#A89BD0] outline-none transition-all focus:border-[#7E6BAF] focus:ring-2 focus:ring-[#7E6BAF]/20"
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-semibold uppercase tracking-wider text-[#A89BD0]">
                      {currency.code}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-[#A89BD0]">
                    Shown in {currency.code} based on your region ({region}). You can change
                    currency anytime from your dashboard.
                  </p>
                </Field>

                <p className="rounded-xl border border-[#E3DBF5]/70 bg-white/60 p-4 text-[13px] leading-relaxed text-[#7E6BAF]">
                  You can refine your schedule, intake questions, and pricing later
                  from your provider dashboard — nothing here is set in stone.
                </p>

                {/* Add more sessions inline on this step too */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7E6BAF]">
                      Additional sessions {customServices.length > 0 && `(${customServices.length})`}
                    </p>
                    <p className="text-[11px] text-[#A89BD0]">Optional</p>
                  </div>

                  {customServices.length > 0 && (
                    <div className="space-y-2">
                      {customServices.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-start gap-3 rounded-2xl border border-[#7E6BAF] bg-[#F4EEFB] p-4"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <p className="text-[14px] font-semibold text-[#2D1B4E]">{s.title}</p>
                              <p className="text-[12px] font-medium text-[#7E6BAF]">
                                {s.duration} min · {currency.symbol}
                                {s.price} {currency.code}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setCustomServices((prev) => prev.filter((x) => x.id !== s.id))
                            }
                            className="rounded-full p-1 text-[#7E6BAF] hover:bg-white"
                            aria-label="Remove"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {showAddCustom ? (
                    <AddCustomService
                      currency={currency}
                      onCancel={() => setShowAddCustom(false)}
                      onAdd={(svc) => {
                        setCustomServices((prev) => [
                          ...prev,
                          { ...svc, id: `c_${Date.now()}` },
                        ]);
                        setShowAddCustom(false);
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAddCustom(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#A89BD0] bg-white/40 px-4 py-3.5 text-[13px] font-medium text-[#7E6BAF] transition hover:border-[#7E6BAF] hover:bg-white/70"
                    >
                      <Plus className="h-4 w-4" /> Add another session
                    </button>
                  )}
                  <p className="text-[11px] text-[#A89BD0]">
                    On the next step we'll also suggest a few common add-ons (intro
                    calls, deep dives) you can accept with one tap.
                  </p>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <PageHeader
                title="A few extras we suggested for you"
                subtitle="Based on your bio and focus areas, here are session types other practitioners like you offer. Add what feels right — skip what doesn't."
              />
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#E3DBF5]/70 bg-white/70 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7E6BAF]">
                    Your main session
                  </p>
                  <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-[15px] font-semibold text-[#2D1B4E]">
                      {sessionName || defaultSessionName}
                    </p>
                    <p className="text-[13px] text-[#7E6BAF]">
                      {sessionLength} min · {fmtPrice(rateNum)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Sparkles className="h-3.5 w-3.5 text-[#7E6BAF]" fill="currentColor" strokeWidth={1.5} />
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7E6BAF]">
                    AI-suggested add-ons
                  </p>
                </div>

                <div className="grid gap-3">
                  {suggestedServices.map((s) => {
                    const on = addedServices.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() =>
                          setAddedServices((prev) =>
                            prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id],
                          )
                        }
                        className={`flex items-start gap-4 rounded-2xl border p-4 text-left transition-all ${
                          on
                            ? "border-[#7E6BAF] bg-[#F4EEFB] shadow-sm"
                            : "border-[#E3DBF5] bg-white hover:border-[#A89BD0]"
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                            on ? "border-[#7E6BAF] bg-[#7E6BAF] text-white" : "border-[#D6CCEB] bg-white"
                          }`}
                        >
                          {on && <Check className="h-3 w-3" strokeWidth={3} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p className="text-[14px] font-semibold text-[#2D1B4E]">{s.title}</p>
                            <p className="text-[12px] font-medium text-[#7E6BAF]">
                              {s.duration} · {s.price}
                            </p>
                          </div>
                          <p className="mt-1 text-[12.5px] leading-relaxed text-[#7E6BAF]">
                            {s.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom services added inline */}
                {customServices.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7E6BAF]">
                      Your custom sessions
                    </p>
                    {customServices.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-start gap-3 rounded-2xl border border-[#7E6BAF] bg-[#F4EEFB] p-4"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p className="text-[14px] font-semibold text-[#2D1B4E]">{s.title}</p>
                            <p className="text-[12px] font-medium text-[#7E6BAF]">
                              {s.duration} min · {currency.symbol}
                              {s.price} {currency.code}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setCustomServices((prev) => prev.filter((x) => x.id !== s.id))
                          }
                          className="rounded-full p-1 text-[#7E6BAF] hover:bg-white"
                          aria-label="Remove"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add another session inline */}
                {showAddCustom ? (
                  <AddCustomService
                    currency={currency}
                    onCancel={() => setShowAddCustom(false)}
                    onAdd={(svc) => {
                      setCustomServices((prev) => [
                        ...prev,
                        { ...svc, id: `c_${Date.now()}` },
                      ]);
                      setShowAddCustom(false);
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddCustom(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#A89BD0] bg-white/40 px-4 py-3.5 text-[13px] font-medium text-[#7E6BAF] transition hover:border-[#7E6BAF] hover:bg-white/70"
                  >
                    <Plus className="h-4 w-4" /> Add another session
                  </button>
                )}

                <p className="rounded-xl border border-[#E3DBF5]/70 bg-white/60 p-4 text-[13px] leading-relaxed text-[#7E6BAF]">
                  Don't worry about getting it perfect — you can add, rename, or remove
                  session types anytime from your provider dashboard.
                </p>
              </div>
            </>
          )}

          <div className="mt-12 flex items-center justify-between border-t border-[#E3DBF5]/60 pt-8">
            <button
              type="button"
              onClick={handleBack}
              className="px-6 py-2 text-sm font-medium text-[#A89BD0] transition-colors hover:text-[#7E6BAF]"
            >
              {step === 0 ? "Cancel" : "Back"}
            </button>
            <div className="flex items-center gap-2">
              {step >= 2 && (
                <button
                  type="button"
                  onClick={handleSkipExtras}
                  className="rounded-xl px-5 py-3.5 text-sm font-medium text-[#7E6BAF] transition hover:bg-white/60"
                >
                  Skip for now
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                disabled={!canNext}
                className="group inline-flex items-center rounded-xl bg-[#7E6BAF] px-10 py-3.5 text-sm font-medium text-white shadow-lg shadow-[#7E6BAF]/25 transition-all hover:bg-[#9A88C7] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#7E6BAF]"
              >
                {step === STEPS.length - 1 ? "Finish setup" : "Continue"}
                <ArrowRight
                  className="ml-3 h-4 w-4 opacity-70 transition-transform group-hover:translate-x-0.5"
                  strokeWidth={2.5}
                />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Dev-only region/currency previewer — not shipped to production users.
          Lets developers see PHP vs USD UI without changing browser region. */}
      {import.meta.env.DEV && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
        <div className="flex items-center gap-2 rounded-full border border-[#E3DBF5] bg-white/95 px-3 py-2 text-[11px] font-medium text-[#7E6BAF] shadow-lg backdrop-blur">
          <span className="uppercase tracking-wider">Dev · signup</span>
          {(["linkedin", "google", "facebook", "email"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSignupSource(s)}
              className={`rounded-full px-2.5 py-0.5 capitalize transition ${
                signupSource === s ? "bg-[#7E6BAF] text-white" : "hover:bg-[#F0EAFB]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-full border border-[#E3DBF5] bg-white/95 px-3 py-2 text-[11px] font-medium text-[#7E6BAF] shadow-lg backdrop-blur">
          <Globe className="h-3.5 w-3.5" />
          <span className="uppercase tracking-wider">Dev · region</span>
          {(["US", "PH"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRegionOverride(r)}
              className={`rounded-full px-2.5 py-0.5 transition ${
                region === r ? "bg-[#7E6BAF] text-white" : "hover:bg-[#F0EAFB]"
              }`}
            >
              {r}
            </button>
          ))}
          {regionOverride && (
            <button
              type="button"
              onClick={() => setRegionOverride(null)}
              className="ml-1 rounded-full px-2 py-0.5 text-[10px] text-[#A89BD0] hover:text-[#7E6BAF]"
              title="Use detected region"
            >
              auto
            </button>
          )}
        </div>
        </div>
      )}
    </div>
  );
}

function AddCustomService({
  currency,
  onAdd,
  onCancel,
}: {
  currency: { code: string; symbol: string };
  onAdd: (svc: { title: string; duration: string; price: string }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("60");
  const [price, setPrice] = useState("");
  const valid = title.trim().length > 0 && Number(duration) > 0;
  return (
    <div className="space-y-3 rounded-2xl border border-[#7E6BAF]/40 bg-white p-4">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Session name (e.g. Couples session)"
        className="w-full rounded-xl border border-[#E3DBF5] bg-white px-4 py-3 text-[14px] text-[#3D2E6B] placeholder:text-[#A89BD0] outline-none focus:border-[#7E6BAF] focus:ring-2 focus:ring-[#7E6BAF]/20"
      />
      <div className="grid grid-cols-2 gap-3">
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            value={duration}
            onChange={(e) => setDuration(e.target.value.replace(/\D/g, ""))}
            placeholder="60"
            className="w-full rounded-xl border border-[#E3DBF5] bg-white px-4 py-3 pr-12 text-[14px] text-[#3D2E6B] outline-none focus:border-[#7E6BAF] focus:ring-2 focus:ring-[#7E6BAF]/20"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold uppercase text-[#A89BD0]">
            min
          </span>
        </div>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-[#A89BD0]">
            {currency.symbol}
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder="Price"
            className="w-full rounded-xl border border-[#E3DBF5] bg-white px-4 py-3 pl-7 pr-14 text-[14px] text-[#3D2E6B] outline-none focus:border-[#7E6BAF] focus:ring-2 focus:ring-[#7E6BAF]/20"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold uppercase text-[#A89BD0]">
            {currency.code}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-2 text-[13px] font-medium text-[#A89BD0] hover:text-[#7E6BAF]"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!valid}
          onClick={() => onAdd({ title: title.trim(), duration, price })}
          className="rounded-lg bg-[#7E6BAF] px-4 py-2 text-[13px] font-medium text-white shadow-sm transition hover:bg-[#9A88C7] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add session
        </button>
      </div>
    </div>
  );
}

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-10">
      <h1 className="mb-3 text-3xl font-semibold tracking-tight text-[#3D2E6B]">
        {title}
      </h1>
      <p className="text-base leading-relaxed text-[#7E6BAF]">{subtitle}</p>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#7E6BAF]">
          {label}
        </label>
        {hint && <p className="text-[12px] text-[#A89BD0]">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function PillGridMulti<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T[];
  onChange: (v: T[]) => void;
}) {
  const toggle = (id: T) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {options.map((o) => {
        const active = value.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => toggle(o.id)}
            className={`group flex items-center space-x-3 rounded-xl border p-3.5 text-left transition-all ${
              active
                ? "border-[#7E6BAF] bg-[#7E6BAF] text-white"
                : "border-[#E3DBF5]/60 bg-[#FBF9FF]/90 hover:border-[#A89BD0]"
            }`}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition-colors ${
                active
                  ? "border-white bg-white text-[#7E6BAF]"
                  : "border-[#D6CCEB] bg-white group-hover:border-[#A89BD0]"
              }`}
            >
              {active && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            <span
              className={`truncate text-sm font-medium ${
                active ? "text-white" : "text-[#3D2E6B]"
              }`}
            >
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function PillGrid<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`group flex items-center space-x-3 rounded-xl border p-3.5 text-left transition-all ${
              active
                ? "border-[#7E6BAF] bg-[#7E6BAF] text-white"
                : "border-[#E3DBF5]/60 bg-[#FBF9FF]/90 hover:border-[#A89BD0]"
            }`}
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-full transition-colors ${
                active
                  ? "bg-white"
                  : "bg-[#E3DBF5] group-hover:bg-[#A89BD0]"
              }`}
            />
            <span
              className={`truncate text-sm font-medium ${
                active ? "text-white" : "text-[#3D2E6B]"
              }`}
            >
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
  action,
  inputAction,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  inputAction?: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#7E6BAF]">
          {label}
        </label>
        {action}
      </div>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#A89BD0]">
            {icon}
          </span>
        )}
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-xl border border-[#E3DBF5]/70 bg-white/60 px-5 py-4 text-[15px] text-[#3D2E6B] placeholder:text-[#A89BD0] outline-none transition-all focus:border-[#7E6BAF] focus:ring-2 focus:ring-[#7E6BAF]/20 ${
            icon ? "pl-11" : ""
          } ${inputAction ? "pr-14" : ""}`}
        />
        {inputAction && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {inputAction}
          </span>
        )}
      </div>
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  action,
  inputAction,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  action?: React.ReactNode;
  inputAction?: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#7E6BAF]">
          {label}
        </label>
        {action}
      </div>
      <div className="relative">
        <textarea
          rows={3}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          ref={(el) => {
            if (el) {
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
            }
          }}
          className={`w-full resize-none overflow-hidden rounded-xl border border-[#E3DBF5]/70 bg-white/60 px-5 py-4 text-[15px] leading-relaxed text-[#3D2E6B] placeholder:text-[#A89BD0] outline-none transition-all focus:border-[#7E6BAF] focus:ring-2 focus:ring-[#7E6BAF]/20 ${
            inputAction ? "pr-14" : ""
          }`}
        />
        {inputAction && (
          <span className="absolute right-3 top-3">{inputAction}</span>
        )}
      </div>
    </div>
  );
}

function AiAssistButton({
  onClick,
  title,
  active,
}: {
  onClick: () => void;
  title: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`group inline-flex h-8 w-8 items-center justify-center rounded-full text-white shadow-sm ring-1 ring-white/70 transition-all hover:shadow-md active:scale-95 ${
        active
          ? "bg-gradient-to-br from-[#7E6BAF] to-[#5E4B8E]"
          : "bg-gradient-to-br from-[#CFC3EA] to-[#B5A4D8] hover:from-[#9A88C7] hover:to-[#7E6BAF]"
      }`}
    >
      {active ? (
        <ChevronUp className="h-4 w-4" strokeWidth={2.5} />
      ) : (
        <Sparkles className="h-4 w-4 transition-transform group-hover:rotate-12" fill="currentColor" strokeWidth={1.5} />
      )}
    </button>
  );
}

function Toggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
        active
          ? "border-[#7E6BAF] bg-[#7E6BAF] text-white"
          : "border-[#E3DBF5]/60 bg-[#FBF9FF]/90 hover:border-[#A89BD0]"
      }`}
    >
      <span className="text-sm font-medium">{label}</span>
      <span
        className={`flex h-5 w-9 items-center rounded-full p-0.5 transition ${
          active ? "bg-white/30" : "bg-[#E3DBF5]"
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${
            active ? "translate-x-4" : ""
          }`}
        />
      </span>
    </button>
  );
}

const TONE_PRESETS = [
  { id: "warmer", label: "Warmer", hint: "Softer, more personal" },
  { id: "concise", label: "More concise", hint: "Tighter and clearer" },
  { id: "professional", label: "More professional", hint: "Polished and credible" },
  { id: "specific", label: "More specific", hint: "Sharper details" },
  { id: "inviting", label: "More inviting", hint: "Welcoming first impression" },
];

function InlineEnhancePanel({
  field,
  current,
  onClose,
  onApply,
  generate,
}: {
  field: "headline" | "bio";
  current: string;
  onClose: () => void;
  onApply: (text: string) => void;
  generate: (tone?: string, instruction?: string) => Promise<string>;
}) {
  const [tone, setTone] = useState<string | null>("warmer");
  const [instruction, setInstruction] = useState("");
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const preset = TONE_PRESETS.find((t) => t.id === tone);
      const text = await generate(preset?.label.toLowerCase(), instruction);
      setSuggestion(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't enhance right now.");
    } finally {
      setLoading(false);
    }
  };

  const label = field === "headline" ? "headline" : "short bio";

  return (
    <div className="overflow-hidden rounded-2xl border border-[#7E6BAF]/25 bg-gradient-to-br from-white via-white to-[#F4EEFB] shadow-[0_4px_24px_-12px_rgba(126,107,175,0.25)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[#E3DBF5]/60 bg-white/60 px-5 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#7E6BAF] to-[#5E4B8E] shadow-sm shadow-[#7E6BAF]/30">
          <Sparkles className="h-3.5 w-3.5 text-white" fill="currentColor" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-tight text-[#3D2E6B]">
            Rewrite your {label} with AI
          </p>
          <p className="text-[11px] leading-tight text-[#A89BD0]">
            Pick a direction and we'll draft a suggestion
          </p>
        </div>
      </div>

      <div className="space-y-5 px-5 py-5">
        {/* Tone */}
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#7E6BAF]">
              Choose a tone
            </p>
            <span className="text-[10px] text-[#A89BD0]">Step 1 of 2</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {TONE_PRESETS.map((t) => {
              const active = tone === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTone(active ? null : t.id)}
                  title={t.hint}
                  className={`rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-all ${
                    active
                      ? "border-[#7E6BAF] bg-[#7E6BAF] text-white shadow-sm shadow-[#7E6BAF]/30"
                      : "border-[#E3DBF5] bg-white text-[#7E6BAF] hover:border-[#A89BD0] hover:bg-[#F8F4FC]"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Hint */}
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#7E6BAF]">
              Add a hint
            </p>
            <span className="text-[10px] text-[#A89BD0]">Optional · Step 2 of 2</span>
          </div>
          <textarea
            rows={2}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="e.g. mention I work with new parents, or keep it to one sentence"
            className="w-full resize-none rounded-xl border border-[#E3DBF5] bg-white px-3.5 py-2.5 text-[13px] text-[#3D2E6B] placeholder:text-[#A89BD0] outline-none transition focus:border-[#7E6BAF] focus:ring-2 focus:ring-[#7E6BAF]/15"
          />
        </div>

        {suggestion && (
          <div className="rounded-xl border border-[#7E6BAF]/25 bg-gradient-to-br from-white to-[#F8F4FC] p-3.5">
            <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#7E6BAF]">
              <Sparkles className="h-3 w-3" fill="currentColor" strokeWidth={1.5} />
              AI suggestion
            </p>
            <p className="text-[13px] leading-relaxed text-[#3D2E6B]">{suggestion}</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/80 px-3.5 py-2.5 text-[12px] text-rose-700">
            {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 border-t border-[#E3DBF5]/60 bg-white/60 px-5 py-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-[#7E6BAF] transition hover:bg-[#F4EEFB]"
        >
          Cancel
        </button>
        <div className="flex items-center gap-2">
          {suggestion ? (
            <>
              <button
                type="button"
                onClick={run}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3DBF5] bg-white px-3 py-1.5 text-[12px] font-medium text-[#7E6BAF] transition hover:border-[#7E6BAF] disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Try again
              </button>
              <button
                type="button"
                onClick={() => onApply(suggestion)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-[#7E6BAF] to-[#5E4B8E] px-3.5 py-1.5 text-[12px] font-medium text-white shadow-sm shadow-[#7E6BAF]/30 transition hover:from-[#9A88C7] hover:to-[#7E6BAF]"
              >
                <Check className="h-3.5 w-3.5" />
                Use this
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={run}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-[#7E6BAF] to-[#5E4B8E] px-3.5 py-1.5 text-[12px] font-medium text-white shadow-sm shadow-[#7E6BAF]/30 transition hover:from-[#9A88C7] hover:to-[#7E6BAF] disabled:cursor-wait disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" fill="currentColor" strokeWidth={1.5} />
                  Generate suggestion
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}