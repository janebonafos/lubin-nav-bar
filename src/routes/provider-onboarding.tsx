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
      <div className="pointer-events-none fixed -top-[10%] -right-[10%] -z-0 h-[500px] w-[500px] rounded-full bg-[#7E6BAF]/10 blur-[120px]" />
      <div className="pointer-events-none fixed -bottom-[10%] -left-[10%] -z-0 h-[500px] w-[500px] rounded-full bg-[#A89BD0]/15 blur-[120px]" />

      <Navbar />

      <main className="relative z-10 mx-auto max-w-3xl px-4 pb-24 pt-28 sm:px-6">
        <header className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E6DFF4] bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7E6BAF] backdrop-blur">
            <Sparkles className="h-3 w-3" /> Provider onboarding
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#3D2E6B] sm:text-4xl">
            Welcome to <span className="text-[#7E6BAF]">Lubin</span>
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-sm text-[#7E6BAF]">
            A few quick steps to set up your provider profile so clients can find you.
          </p>
        </header>

        {/* Stepper */}
        <ol className="mx-auto mt-8 flex max-w-md items-center justify-between">
          {STEPS.map((label, i) => {
            const reached = i <= step;
            const done = i < step;
            return (
              <li key={label} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition ${
                      reached
                        ? "bg-[#7E6BAF] text-white shadow-md shadow-[#A89BD0]/40"
                        : "bg-white text-[#A89BD0] ring-1 ring-[#E6DFF4]"
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" /> : i + 1}
                  </span>
                  <span
                    className={`mt-2 text-[11px] font-semibold uppercase tracking-wider ${
                      reached ? "text-[#3D2E6B]" : "text-[#A89BD0]"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <span
                    className={`mx-2 h-px flex-1 ${
                      i < step ? "bg-[#7E6BAF]" : "bg-[#E6DFF4]"
                    }`}
                  />
                )}
              </li>
            );
          })}
        </ol>

        <section className="mt-8 rounded-[2rem] border border-white/40 bg-white/80 p-6 shadow-md shadow-[#3D2E6B]/5 backdrop-blur-xl sm:p-8">
          {step === 0 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-[#3D2E6B]">
                <UserCircle2 className="h-5 w-5 text-[#7E6BAF]" />
                <h2 className="text-lg font-bold">Tell us about yourself</h2>
              </div>
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
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-[#3D2E6B]">
                <Briefcase className="h-5 w-5 text-[#7E6BAF]" />
                <h2 className="text-lg font-bold">Your practice</h2>
              </div>
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#A89BD0]">
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
                        className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${
                          active
                            ? "border-[#7E6BAF] bg-[#F3F0FF] shadow-md shadow-[#A89BD0]/30"
                            : "border-[#EEE9F8] bg-white/60 hover:border-[#C9BEE5]"
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
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-[#3D2E6B]">
                <Sparkles className="h-5 w-5 text-[#7E6BAF]" />
                <h2 className="text-lg font-bold">Availability & rate</h2>
              </div>
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#A89BD0]">
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
              <p className="rounded-2xl border border-[#EEE9F8] bg-[#F3F0FF]/60 p-4 text-[13px] leading-relaxed text-[#5A4E8A]">
                You can refine your schedule, intake questions, and pricing later from your provider dashboard.
              </p>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => (step === 0 ? navigate({ to: "/" }) : setStep(step - 1))}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-[#7E6BAF] transition hover:bg-[#7E6BAF]/10"
            >
              <ArrowLeft className="h-4 w-4" />
              {step === 0 ? "Cancel" : "Back"}
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={!canNext}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#A89BD0] to-[#7E6BAF] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(126,107,175,0.55)] transition hover:-translate-y-0.5 hover:from-[#7E6BAF] hover:to-[#5A4E8A] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {step === STEPS.length - 1 ? "Finish setup" : "Continue"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </main>
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
      <label className="text-[11px] font-semibold uppercase tracking-wider text-[#A89BD0]">
        {label}
      </label>
      <div className="relative mt-1.5">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A89BD0]">
            {icon}
          </span>
        )}
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-xl border border-[#EEE9F8] bg-white/70 px-4 py-2.5 text-[14px] text-[#3D2E6B] placeholder:text-[#A89BD0]/60 outline-none transition focus:border-[#7E6BAF] focus:ring-4 focus:ring-[#7E6BAF]/10 ${
            icon ? "pl-9" : ""
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
      <label className="text-[11px] font-semibold uppercase tracking-wider text-[#A89BD0]">
        {label}
      </label>
      <textarea
        rows={4}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full resize-none rounded-xl border border-[#EEE9F8] bg-white/70 px-4 py-2.5 text-[14px] text-[#3D2E6B] placeholder:text-[#A89BD0]/60 outline-none transition focus:border-[#7E6BAF] focus:ring-4 focus:ring-[#7E6BAF]/10"
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