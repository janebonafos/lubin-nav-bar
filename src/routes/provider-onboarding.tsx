import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, GraduationCap, Sparkles, Linkedin, Loader2, X, RefreshCw, Check } from "lucide-react";
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

function ProviderOnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [specialty, setSpecialty] = useState<Specialty | null>(null);
  const [focus, setFocus] = useState<FocusArea | null>(null);
  const [yearsExp, setYearsExp] = useState("");
  const [credentials, setCredentials] = useState("");
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
          focus: focus ?? undefined,
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
      ? focus !== null && credentials.trim().length > 0
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

                <TextField
                  label="Professional headline"
                  value={headline}
                  onChange={setHeadline}
                  placeholder="Clinical psychologist · Anxiety & burnout"
                  inputAction={
                    <AiAssistButton
                      onClick={() => setEnhanceOpen("headline")}
                      title="Enhance with AI"
                    />
                  }
                />

                <TextAreaField
                  label="Short bio"
                  value={bio}
                  onChange={setBio}
                  placeholder="Share a couple of sentences about your approach..."
                  inputAction={
                    <AiAssistButton
                      onClick={() => setEnhanceOpen("bio")}
                      title="Enhance with AI"
                    />
                  }
                />
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
                <Field label="Primary focus area">
                  <PillGrid
                    options={FOCUS_AREAS}
                    value={focus}
                    onChange={(v) => setFocus(v as FocusArea)}
                  />
                </Field>

                <div className="grid gap-6 sm:grid-cols-2">
                  <TextField
                    label="Years of experience"
                    value={yearsExp}
                    onChange={setYearsExp}
                    placeholder="e.g. 6"
                    type="number"
                  />
                  <TextField
                    label="License / credentials"
                    value={credentials}
                    onChange={setCredentials}
                    placeholder="LMFT #12345"
                    icon={<GraduationCap className="h-4 w-4" />}
                  />
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
      {enhanceOpen && (
        <EnhanceModal
          field={enhanceOpen}
          current={enhanceOpen === "headline" ? headline : bio}
          onClose={() => setEnhanceOpen(null)}
          onApply={(text) => {
            if (enhanceOpen === "headline") setHeadline(text);
            else setBio(text);
            setEnhanceOpen(null);
          }}
          generate={(tone, instruction) =>
            requestEnhancement({ field: enhanceOpen, tone, instruction })
          }
        />
      )}
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
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#7E6BAF]">
        {label}
      </label>
      {children}
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
          className={`w-full resize-none rounded-xl border border-[#E3DBF5]/70 bg-white/60 px-5 py-4 text-[15px] leading-relaxed text-[#3D2E6B] placeholder:text-[#A89BD0] outline-none transition-all focus:border-[#7E6BAF] focus:ring-2 focus:ring-[#7E6BAF]/20 ${
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
}: {
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="group inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#CFC3EA] to-[#B5A4D8] text-white shadow-sm ring-1 ring-white/70 transition-all hover:from-[#9A88C7] hover:to-[#7E6BAF] hover:shadow-md active:scale-95"
    >
      <Sparkles
        className="h-4 w-4 transition-transform group-hover:rotate-12"
        fill="currentColor"
        strokeWidth={1.5}
      />
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