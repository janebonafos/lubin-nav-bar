import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Briefcase,
  GraduationCap,
  UserCircle2,
  Sparkles,
  Stethoscope,
  HeartHandshake,
  Brain,
  Users,
  Flower2,
  Leaf,
  Moon,
  Sun,
  Heart,
  Wind,
} from "lucide-react";
import Navbar from "@/components/Navbar";

export const Route = createFileRoute("/provider-onboarding")({
  head: () => ({
    meta: [
      { title: "Provider onboarding — Lubin" },
      {
        name: "description",
        content:
          "Set up your Lubin provider profile in a few quick steps — share your specialty, credentials, and availability.",
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

const SPECIALTIES: { id: Specialty; label: string; icon: typeof Brain }[] = [
  { id: "therapist", label: "Therapist", icon: HeartHandshake },
  { id: "psychologist", label: "Psychologist", icon: Brain },
  { id: "counselor", label: "Counselor", icon: Users },
  { id: "psychiatrist", label: "Psychiatrist", icon: Stethoscope },
  { id: "coach", label: "Wellness coach", icon: Sparkles },
  { id: "other", label: "Other", icon: UserCircle2 },
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

const FOCUS_AREAS: { id: FocusArea; label: string; icon: typeof Brain }[] = [
  { id: "anxiety", label: "Anxiety & Panic", icon: Wind },
  { id: "depression", label: "Depression & Mood", icon: Moon },
  { id: "trauma", label: "Trauma & PTSD", icon: HeartHandshake },
  { id: "relationships", label: "Relationships", icon: Heart },
  { id: "stress", label: "Stress & Burnout", icon: Leaf },
  { id: "selfesteem", label: "Self-esteem", icon: Sun },
  { id: "grief", label: "Grief & Loss", icon: Flower2 },
  { id: "mindfulness", label: "Mindfulness", icon: Brain },
  { id: "sleep", label: "Sleep & Rest", icon: Users },
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

  const canNext =
    step === 0
      ? fullName.trim().length > 1
      : step === 1
      ? specialty !== null && focus !== null && credentials.trim().length > 0
      : (sessionTypes.video || sessionTypes.inPerson) && rate.trim().length > 0;

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else navigate({ to: "/profile" });
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#F4EFFB]"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <div className="pointer-events-none fixed -top-[10%] -left-[10%] -z-0 h-[40vw] w-[40vw] rounded-full bg-[#A89BD0]/10 blur-[120px]" />
      <div className="pointer-events-none fixed -bottom-[10%] -right-[10%] -z-0 h-[40vw] w-[40vw] rounded-full bg-[#7E6BAF]/10 blur-[120px]" />

      <Navbar />

      <main className="relative z-10 mx-auto flex max-w-3xl flex-col gap-12 px-4 pb-24 pt-24 sm:px-6">
        {/* Top horizontal stepper with connecting line */}
        <ol className="relative mx-auto flex w-full max-w-2xl items-start justify-between">
          {STEPS.map((label, i) => {
            const done = i < step;
            const active = i === step;
            const reached = i <= step;
            const isLast = i === STEPS.length - 1;
            return (
              <li key={label} className="relative flex flex-1 flex-col items-center">
                {!isLast && (
                  <span
                    className={`pointer-events-none absolute left-1/2 top-5 h-px w-full ${
                      i < step ? "bg-[#7E6BAF]" : "bg-[#A89BD0]/30"
                    }`}
                  />
                )}
                <span
                  className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full text-sm transition ${
                    done
                      ? "bg-[#7E6BAF] font-semibold text-white"
                      : active
                      ? "border-2 border-[#7E6BAF] bg-white font-semibold text-[#3D2E6B]"
                      : "border border-[#A89BD0]/40 bg-white font-medium text-[#A89BD0]"
                  }`}
                >
                  {done ? (
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                  ) : active ? (
                    <span className="h-2.5 w-2.5 rounded-full bg-[#7E6BAF]" />
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={`mt-3 text-center text-[13px] ${
                    reached ? "font-semibold text-[#3D2E6B]" : "font-medium text-[#A89BD0]"
                  }`}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>

        {/* Back arrow */}
        <button
          type="button"
          onClick={() => (step === 0 ? navigate({ to: "/" }) : setStep(step - 1))}
          className="group -mt-4 inline-flex w-fit items-center gap-2 text-sm font-medium text-[#3D2E6B] transition hover:text-[#7E6BAF]"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back
        </button>

        <section className="w-full">
          {step === 0 && (
            <div className="space-y-8">
              <PageHeader
                title="Tell us about yourself"
                subtitle="A gentle introduction helps clients feel safe before they ever book a session."
              />
              <TextField
                label="Full name"
                value={fullName}
                onChange={setFullName}
                placeholder="Dr. Jane Doe"
              />
              <TextField
                label="Professional headline"
                value={headline}
                onChange={setHeadline}
                placeholder="Clinical psychologist · Anxiety & burnout"
              />
              <TextAreaField
                label="Short bio"
                value={bio}
                onChange={setBio}
                placeholder="Share a couple of sentences about your approach and the clients you love working with."
              />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-10">
              <PageHeader
                title="Tell Us About Your Practice"
                subtitle="This helps us match you with the clients whose needs align with your care."
              />
              <div>
                <p className="mb-5 text-[15px] font-semibold text-[#3D2E6B]">
                  Select your specialty
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {SPECIALTIES.map((s) => {
                    const Icon = s.icon;
                    const active = specialty === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSpecialty(s.id)}
                        className={`flex flex-col items-center justify-center gap-3 rounded-2xl border p-6 text-center transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-[#A89BD0]/20 ${
                          active
                            ? "border-[#7E6BAF] bg-[#EFE9FB] shadow-md shadow-[#A89BD0]/30"
                            : "border-[#EEE9F8] bg-white/70 hover:border-[#C9BEE5]"
                        }`}
                      >
                        <Icon
                          className={`h-6 w-6 ${
                            active ? "text-[#7E6BAF]" : "text-[#A89BD0]"
                          }`}
                          strokeWidth={1.75}
                        />
                        <span className="text-[13px] font-semibold leading-tight text-[#3D2E6B]">
                          {s.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-5 text-[15px] font-semibold text-[#3D2E6B]">
                  Select your primary focus area
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {FOCUS_AREAS.map((f) => {
                    const Icon = f.icon;
                    const active = focus === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFocus(f.id)}
                        className={`flex flex-col items-center justify-center gap-3 rounded-2xl border p-6 text-center transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-[#A89BD0]/20 ${
                          active
                            ? "border-[#7E6BAF] bg-[#EFE9FB] shadow-md shadow-[#A89BD0]/30"
                            : "border-[#EEE9F8] bg-white/70 hover:border-[#C9BEE5]"
                        }`}
                      >
                        <Icon
                          className={`h-6 w-6 ${
                            active ? "text-[#7E6BAF]" : "text-[#A89BD0]"
                          }`}
                          strokeWidth={1.75}
                        />
                        <span className="text-[13px] font-semibold leading-tight text-[#3D2E6B]">
                          {f.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
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
          )}

          {step === 2 && (
            <div className="space-y-8">
              <PageHeader
                title="Set Your Availability"
                subtitle="Choose how you'd like to meet clients and the rate that supports your practice."
              />
              <div>
                <p className="mb-5 text-[15px] font-semibold text-[#3D2E6B]">
                  Session types
                </p>
                <div className="grid gap-2.5 sm:grid-cols-2">
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
              </div>
              <TextField
                label="Standard session rate (USD)"
                value={rate}
                onChange={setRate}
                placeholder="e.g. 120"
                type="number"
              />
              <p className="rounded-2xl border border-[#EEE9F8] bg-gradient-to-br from-[#F3F0FF]/70 to-white/40 p-4 text-[13px] leading-relaxed text-[#5A4E8A]">
                You can refine your schedule, intake questions, and pricing later from your provider dashboard — nothing here is set in stone.
              </p>
            </div>
          )}

          <div className="mt-12 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => (step === 0 ? navigate({ to: "/" }) : setStep(step - 1))}
              className="rounded-2xl border border-[#A89BD0]/40 bg-white px-10 py-3 text-sm font-semibold text-[#3D2E6B] transition hover:border-[#7E6BAF] hover:bg-[#F4EFFB]"
            >
              {step === 0 ? "Cancel" : "Back"}
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={!canNext}
              className="group inline-flex items-center gap-2 rounded-2xl bg-[#7E6BAF] px-10 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_-8px_rgba(126,107,175,0.55)] transition hover:-translate-y-0.5 hover:bg-[#3D2E6B] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {step === STEPS.length - 1 ? "Finish setup" : "Continue"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-bold tracking-tight text-[#3D2E6B] md:text-4xl">
        {title}
      </h1>
      <p className="max-w-xl text-[15px] leading-relaxed text-[#7E6BAF]">
        {subtitle}
      </p>
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="ml-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#A89BD0]">
        {label}
      </label>
      <div className="relative mt-2.5">
        {icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A89BD0]">
            {icon}
          </span>
        )}
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-2xl border border-[#A89BD0]/20 bg-white/50 px-6 py-4 text-[15px] text-[#3D2E6B] placeholder:text-[#A89BD0]/50 outline-none transition focus:border-[#7E6BAF] focus:bg-white focus:ring-2 focus:ring-[#7E6BAF]/20 ${
            icon ? "pl-11" : ""
          }`}
        />
      </div>
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="ml-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#A89BD0]">
        {label}
      </label>
      <textarea
        rows={4}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2.5 w-full resize-none rounded-2xl border border-[#A89BD0]/20 bg-white/50 px-6 py-4 text-[15px] leading-relaxed text-[#3D2E6B] placeholder:text-[#A89BD0]/50 outline-none transition focus:border-[#7E6BAF] focus:bg-white focus:ring-2 focus:ring-[#7E6BAF]/20"
      />
    </div>
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
      className={`flex items-center justify-between rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${
        active
          ? "border-[#7E6BAF] bg-[#F3F0FF] shadow-md shadow-[#A89BD0]/30"
          : "border-[#EEE9F8] bg-white/60 hover:border-[#C9BEE5]"
      }`}
    >
      <span className="text-[13px] font-semibold text-[#3D2E6B]">{label}</span>
      <span
        className={`flex h-5 w-9 items-center rounded-full p-0.5 transition ${
          active ? "bg-[#7E6BAF]" : "bg-[#E6DFF4]"
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