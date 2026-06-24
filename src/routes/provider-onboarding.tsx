import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Sparkles, Linkedin, Loader2, RefreshCw, Check, ChevronUp } from "lucide-react";
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

const STEPS = ["Registration", "Profile Customization", "Calendar Integration"] as const;

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

function ProviderOnboardingPage() {
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

  // Simulated LinkedIn import — in production this comes from the OAuth callback.
  const [linkedInImported, setLinkedInImported] = useState(false);
  const [enhanceOpen, setEnhanceOpen] = useState<null | "headline" | "bio">(null);

  useEffect(() => {
    // Simulate LinkedIn prefill on first mount
    const t = setTimeout(() => {
      setFullName((v) => v || "Dr. Jane Doe");
      setSpecialty((v) => v ?? "psychologist");
      setHeadline(
        (v) => v || "Clinical psychologist · Helping adults navigate anxiety and burnout",
      );
      setBio(
        (v) =>
          v ||
          "I'm a licensed clinical psychologist with over 8 years of experience supporting adults through anxiety, stress, and life transitions. My approach blends evidence-based therapy with warmth and curiosity.",
      );
      setLinkedInImported(true);
    }, 400);
    return () => clearTimeout(t);
  }, []);

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
      : (sessionTypes.video || sessionTypes.inPerson) && rate.trim().length > 0;

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else navigate({ to: "/profile" });
  };

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
              {linkedInImported && (
                <div className="mb-8 flex items-center gap-3 rounded-xl border border-[#E3DBF5]/70 bg-white/80 px-4 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#7E6BAF] text-white">
                    <Linkedin className="h-4 w-4" fill="currentColor" strokeWidth={0} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#3D2E6B]">
                      Synced from your LinkedIn profile
                    </p>
                    <p className="text-[12px] text-[#A89BD0]">
                      Use AI to enhance your headline or bio anytime.
                    </p>
                  </div>
                </div>
              )}
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
                      License verification comes later
                    </p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-[#7E6BAF]">
                      We'll email you a secure link from your dashboard when you're ready —
                      no need to share your license number on a public form today.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <PageHeader
                title="Set your availability"
                subtitle="Choose how you'd like to meet clients and the rate that supports your practice."
              />
              <div className="space-y-8">
                <Field label="Session types">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Toggle
                      label="Video sessions"
                      active={sessionTypes.video}
                      onClick={() =>
                        setSessionTypes((s) => ({ ...s, video: !s.video }))
                      }
                    />
                    <Toggle
                      label="In-person sessions"
                      active={sessionTypes.inPerson}
                      onClick={() =>
                        setSessionTypes((s) => ({ ...s, inPerson: !s.inPerson }))
                      }
                    />
                  </div>
                </Field>

                <TextField
                  label="Standard session rate (USD)"
                  value={rate}
                  onChange={setRate}
                  placeholder="e.g. 120"
                  type="number"
                />

                <p className="rounded-xl border border-[#E3DBF5]/70 bg-white/60 p-4 text-[13px] leading-relaxed text-[#7E6BAF]">
                  You can refine your schedule, intake questions, and pricing later
                  from your provider dashboard — nothing here is set in stone.
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
      </main>
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