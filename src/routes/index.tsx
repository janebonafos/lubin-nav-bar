import { createFileRoute } from "@tanstack/react-router";
import { Leaf, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import ChatPreview from "@/components/ChatPreview";

export const Route = createFileRoute("/")({
  component: Index,
});

const ASSESSMENTS = [
  { label: "Mood Check", href: "/assessments/PHQ-9" },
  { label: "Anxiety Check", href: "/assessments/GAD-7" },
  { label: "Wellbeing Check", href: "/assessments/WHO-5" },
];

function Index() {
  return (
    <div
      className="min-h-screen bg-background pt-16"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <Navbar />
      <main className="mx-auto flex w-full max-w-[900px] flex-col items-center px-5 md:px-8 pt-[60px] pb-[80px]">
        {/* Badge */}
        <span className="inline-flex items-center rounded-full bg-brand-purple/10 px-4 py-1.5 text-[13px] font-medium text-brand-purple">
          Your private mental health companion
        </span>

        {/* Heading */}
        <h1 className="mt-6 text-center text-3xl md:text-5xl font-bold tracking-tight text-brand-purple-dark">
          Where would you like to start?
        </h1>
        <p className="mt-4 text-center text-base md:text-lg text-brand-purple-dark/60">
          Everything here is private and saved only to you.
        </p>

        {/* Animated chat preview — hero visual */}
        <div className="mt-6 w-full max-w-[600px]">
          <ChatPreview />
        </div>

        {/* Health Passport + Quick checks */}
        <div className="mt-6 grid w-full grid-cols-1 gap-5 md:grid-cols-2">
          {/* Health Passport card */}
          <a
            href="/passport"
            className="group flex flex-col rounded-xl border border-brand-purple/25 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-purple hover:shadow-xl hover:shadow-brand-purple/15"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-purple/10 text-brand-purple">
              <Leaf className="h-5 w-5" strokeWidth={2} />
            </div>
            <h2 className="mt-5 text-xl font-bold text-brand-purple-dark">My Health Passport</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-brand-purple-dark/60">
              View your mood trends, assessment results, and everything you've tracked — all in one private space.
            </p>
            <span className="mt-6 inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-purple px-4 py-2 text-[13px] font-semibold text-white transition-colors group-hover:bg-brand-purple-dark">
              Open Passport
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </a>

          {/* Quick checks */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-brand-purple/15 bg-white/50 p-7">
            <p className="text-[13px] font-medium uppercase tracking-wider text-brand-purple-dark/50">
              Or take a quick check
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
              {ASSESSMENTS.map((a) => (
                <a
                  key={a.href}
                  href={a.href}
                  className="inline-flex items-center rounded-full border border-brand-purple/30 bg-white px-5 py-2 text-[13px] font-medium text-brand-purple transition-all duration-200 hover:border-brand-purple hover:bg-brand-purple hover:text-white"
                >
                  {a.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Sign in note */}
        <p className="mt-6 text-center text-[13px] text-brand-purple-dark/50">
          Already have an account?{" "}
          <a
            href="/sign-in"
            className="font-medium text-brand-purple hover:text-brand-purple-dark hover:underline"
          >
            Sign in
          </a>
        </p>
      </main>
    </div>
  );
}
