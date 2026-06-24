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

const STEPS = ["About you", "Practice", "Availability"] as const;

function ProviderOnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [specialty, setSpecialty] = useState<Specialty | null>(null);
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
      ? specialty !== null && credentials.trim().length > 0
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
      <div className="pointer-events-none fixed -top-[15%] -left-[10%] -z-0 h-[520px] w-[520px] rounded-full bg-[#A89BD0]/25 blur-[140px]" />
      <div className="pointer-events-none fixed -bottom-[15%] -right-[10%] -z-0 h-[560px] w-[560px] rounded-full bg-[#7E6BAF]/20 blur-[140px]" />
      <div className="pointer-events-none fixed top-1/3 left-1/2 -z-0 h-[320px] w-[320px] -translate-x-1/2 rounded-full bg-[#E8DFFB]/40 blur-[120px]" />

      <Navbar />

      <main className="relative z-10 mx-auto max-w-2xl px-4 pb-24 pt-28 sm:px-6">
        <header className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#A89BD0]/30 bg-white/60 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#7E6BAF] shadow-sm backdrop-blur">
            <Sparkles className="h-3 w-3" /> Provider onboarding
          </span>
          <h1
            className="mt-5 text-5xl tracking-tight text-[#3D2E6B] sm:text-6xl"
            style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400 }}
          >
            Welcome to{" "}
            <span className="italic text-[#7E6BAF]">Lubin</span>
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-[#7E6BAF]/80">
            A few quiet steps to set up your provider profile so the right clients can find you.
          </p>
        </header>

        {/* Stepper */}
        <ol className="relative mx-auto mt-10 flex max-w-md items-start justify-between">
          <span className="pointer-events-none absolute left-5 right-5 top-[18px] -z-0 h-px bg-gradient-to-r from-transparent via-[#A89BD0]/40 to-transparent" />
          {STEPS.map((label, i) => {
            const reached = i <= step;
            const done = i < step;
            const active = i === step;
            return (
              <li key={label} className="relative flex flex-col items-center gap-2.5">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold ring-4 ring-[#F4EFFB] transition ${
                      active
                        ? "bg-[#3D2E6B] text-white shadow-lg shadow-[#3D2E6B]/25"
                        : done
                        ? "bg-[#7E6BAF] text-white shadow-md shadow-[#A89BD0]/40"
                        : "border border-[#A89BD0]/40 bg-white text-[#A89BD0]"
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" /> : i + 1}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-[0.18em] ${
                      reached ? "text-[#3D2E6B]" : "text-[#A89BD0]/70"
                    }`}
                  >
                    {label}
                  </span>
              </li>
            );
          })}
        </ol>

        <section className="mt-10 rounded-[2.5rem] border border-white/50 bg-white/70 p-8 shadow-[0_32px_64px_-24px_rgba(61,46,107,0.18)] backdrop-blur-2xl sm:p-12">
          {step === 0 && (
            <div className="space-y-7">
              <StepHeader icon={UserCircle2} title="Tell us about yourself" />
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
            <div className="space-y-7">
              <StepHeader icon={Briefcase} title="Your practice" />
              <div>
                <p className="mb-3 ml-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#A89BD0]">
                  Primary specialty
                </p>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {SPECIALTIES.map((s) => {
                    const Icon = s.icon;
                    const active = specialty === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSpecialty(s.id)}
                        className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-[#A89BD0]/20 ${
                          active
                            ? "border-[#7E6BAF] bg-gradient-to-br from-[#F3F0FF] to-white shadow-md shadow-[#A89BD0]/30"
                            : "border-[#EEE9F8] bg-white/70 hover:border-[#C9BEE5]"
                        }`}
                      >
                        <Icon
                          className={`h-5 w-5 ${
                            active ? "text-[#7E6BAF]" : "text-[#A89BD0]"
                          }`}
                        />
                        <span className="text-[13px] font-semibold text-[#3D2E6B]">
                          {s.label}
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
            <div className="space-y-7">
              <StepHeader icon={Sparkles} title="Availability & rate" />
              <div>
                <p className="mb-3 ml-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#A89BD0]">
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

          <div className="mt-10 flex items-center justify-between gap-3 border-t border-[#EEE9F8] pt-6">
            <button
              type="button"
              onClick={() => (step === 0 ? navigate({ to: "/" }) : setStep(step - 1))}
              className="group inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-[#A89BD0] transition hover:text-[#3D2E6B]"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              {step === 0 ? "Cancel" : "Back"}
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={!canNext}
              className="group inline-flex items-center gap-2 rounded-2xl bg-[#7E6BAF] px-8 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_-8px_rgba(126,107,175,0.55)] transition hover:-translate-y-0.5 hover:bg-[#3D2E6B] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {step === STEPS.length - 1 ? "Finish setup" : "Continue"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </section>

        <p className="mt-8 text-center text-[12px] italic text-[#A89BD0]">
          You can update these details anytime from your dashboard.
        </p>
      </main>
    </div>
  );
}

function StepHeader({
  icon: Icon,
  title,
}: {
  icon: typeof Brain;
  title: string;
}) {
  return (
    <div className="flex items-center gap-4 border-b border-[#F4EFFB] pb-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4EFFB] text-[#7E6BAF] shadow-inner">
        <Icon className="h-6 w-6" strokeWidth={1.5} />
      </div>
      <h2
        className="text-2xl tracking-tight text-[#3D2E6B]"
        style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400 }}
      >
        {title}
      </h2>
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
          className={`w-full rounded-2xl border border-[#A89BD0]/20 bg-white/80 px-5 py-3.5 text-[15px] text-[#3D2E6B] placeholder:text-[#A89BD0]/50 outline-none transition focus:border-[#7E6BAF] focus:bg-white focus:ring-4 focus:ring-[#7E6BAF]/10 ${
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
        className="mt-2.5 w-full resize-none rounded-2xl border border-[#A89BD0]/20 bg-white/80 px-5 py-3.5 text-[15px] leading-relaxed text-[#3D2E6B] placeholder:text-[#A89BD0]/50 outline-none transition focus:border-[#7E6BAF] focus:bg-white focus:ring-4 focus:ring-[#7E6BAF]/10"
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