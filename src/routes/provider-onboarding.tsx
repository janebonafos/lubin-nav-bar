import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, ArrowLeft, GraduationCap } from "lucide-react";
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

      <main className="relative z-10 mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-20 pt-16 sm:px-6">
        <button
          type="button"
          onClick={handleBack}
          className="group inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back
        </button>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:p-12">
          {/* Progress */}
          <div className="mb-12 flex items-center justify-between px-1">
            <div className="flex space-x-2">
              {STEPS.map((label, i) => (
                <div
                  key={label}
                  className={`h-1.5 w-12 rounded-full transition-all ${
                    i <= step ? "bg-slate-900" : "bg-slate-900/10"
                  }`}
                />
              ))}
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              Step {step + 1} of {STEPS.length}
            </span>
          </div>

          {step === 0 && (
            <>
              <PageHeader
                title="Tell us about yourself"
                subtitle="A gentle introduction helps clients feel safe and understood."
              />
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
                />

                <TextAreaField
                  label="Short bio"
                  value={bio}
                  onChange={setBio}
                  placeholder="Share a couple of sentences about your approach..."
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

                <p className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-[13px] leading-relaxed text-slate-500">
                  You can refine your schedule, intake questions, and pricing later
                  from your provider dashboard — nothing here is set in stone.
                </p>
              </div>
            </>
          )}

          <div className="mt-12 flex items-center justify-between border-t border-slate-100 pt-8">
            <button
              type="button"
              onClick={handleBack}
              className="px-6 py-2 text-sm font-medium text-slate-400 transition-colors hover:text-slate-600"
            >
              {step === 0 ? "Cancel" : "Back"}
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={!canNext}
              className="group inline-flex items-center rounded-xl bg-slate-900 px-10 py-3.5 text-sm font-medium text-white shadow-lg shadow-slate-900/10 transition-all hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-slate-900"
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
      <h1 className="mb-3 text-3xl font-semibold tracking-tight text-slate-900">
        {title}
      </h1>
      <p className="text-base leading-relaxed text-slate-500">{subtitle}</p>
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
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
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
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-full transition-colors ${
                active
                  ? "bg-white"
                  : "bg-slate-200 group-hover:bg-slate-300"
              }`}
            />
            <span
              className={`truncate text-sm font-medium ${
                active ? "text-white" : "text-slate-600"
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </span>
        )}
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-[15px] text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-slate-900 focus:ring-1 focus:ring-slate-900 ${
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
    <div className="space-y-2.5">
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </label>
      <textarea
        rows={3}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-[15px] leading-relaxed text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
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
      className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <span className="text-sm font-medium">{label}</span>
      <span
        className={`flex h-5 w-9 items-center rounded-full p-0.5 transition ${
          active ? "bg-white/30" : "bg-slate-200"
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