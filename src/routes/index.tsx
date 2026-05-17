import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle, Leaf, ArrowRight, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import ChatPreview from "@/components/ChatPreview";
import PassportPreview from "@/components/PassportPreview";

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
      className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#F5F3FF] via-[#EFEAFE] to-[#F5F3FF] pt-16"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {/* Decorative floating gradient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-gradient-to-br from-brand-purple/35 to-brand-purple-accent/20 blur-3xl animate-blob" />
        <div className="absolute top-1/3 -right-40 h-[480px] w-[480px] rounded-full bg-gradient-to-br from-[#C4B5FD]/40 to-[#9990C9]/25 blur-3xl animate-blob [animation-delay:-6s]" />
        <div className="absolute bottom-0 left-1/4 h-[380px] w-[380px] rounded-full bg-gradient-to-br from-[#EAE6F4]/60 to-brand-purple/20 blur-3xl animate-blob [animation-delay:-12s]" />
      </div>

      <Navbar />
      <main className="relative mx-auto flex w-full max-w-[900px] flex-col items-center px-5 md:px-8 pt-[60px] pb-[80px]">
        {/* Badge */}
        <span className="animate-rise-in inline-flex items-center gap-1.5 rounded-full border border-brand-purple/20 bg-white/70 px-4 py-1.5 text-[13px] font-medium text-brand-purple shadow-sm backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2.2} />
          Your private mental health companion
        </span>

        {/* Heading */}
        <h1 className="animate-rise-in mt-6 text-center text-4xl md:text-6xl font-bold tracking-tight text-shimmer [animation-delay:80ms]">
          Where would you like to start?
        </h1>
        <p className="animate-rise-in mt-4 text-center text-base md:text-lg text-brand-purple-dark/60 [animation-delay:160ms]">
          Everything here is private and saved only to you.
        </p>

        {/* Two cards side by side */}
        <div className="animate-rise-in mt-10 grid w-full max-w-[700px] grid-cols-1 gap-5 md:grid-cols-2 [animation-delay:240ms]">
          {/* Card 1 — Chat with Lubin */}
          <a
            href="/chat"
            className="group relative flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-brand-purple/80 via-brand-purple to-brand-purple-dark p-7 shadow-lg shadow-brand-purple/20 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-brand-purple/40"
          >
            <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-white/15 blur-2xl transition-opacity duration-500 group-hover:opacity-80" />
            <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white ring-1 ring-white/30">
              <MessageCircle className="h-5 w-5" strokeWidth={2} />
            </div>
            <h2 className="relative mt-5 text-xl font-bold text-white">Chat with Lubin</h2>
            <p className="relative mt-2 text-[14px] leading-relaxed text-white/85">
              Talk through how you're feeling. Lubin listens, reflects, and helps you understand what's going on.
            </p>
            <span className="relative mt-6 inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-brand-purple-dark shadow-sm transition-all group-hover:bg-white/95 group-hover:shadow-md">
              Start chatting
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </a>

          {/* Card 2 — Health Passport */}
          <a
            href="/passport"
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-brand-purple/20 bg-white/80 p-7 shadow-lg shadow-brand-purple/10 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-purple/50 hover:shadow-2xl hover:shadow-brand-purple/20"
          >
            <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-brand-purple/15 blur-2xl transition-opacity duration-500 group-hover:bg-brand-purple/25" />
            <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-brand-purple/10 text-brand-purple ring-1 ring-brand-purple/15">
              <Leaf className="h-5 w-5" strokeWidth={2} />
            </div>
            <h2 className="relative mt-5 text-xl font-bold text-brand-purple-dark">My Health Passport</h2>
            <p className="relative mt-2 text-[14px] leading-relaxed text-brand-purple-dark/60">
              View your mood trends, assessment results, and everything you've tracked — all in one private space.
            </p>
            <span className="relative mt-6 inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-purple px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition-all group-hover:bg-brand-purple-dark group-hover:shadow-md">
              Open Passport
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </a>
        </div>

        {/* Quick check section — surfaced upfront */}
        <div className="animate-rise-in mt-10 flex w-full flex-col items-center [animation-delay:320ms]">
          <p className="text-[13px] font-medium uppercase tracking-wider text-brand-purple-dark/50">
            Or take a quick check
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            {ASSESSMENTS.map((a) => (
              <a
                key={a.href}
                href={a.href}
                className="inline-flex items-center rounded-full border border-brand-purple/30 bg-white/80 px-5 py-2 text-[13px] font-medium text-brand-purple shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-purple hover:bg-brand-purple hover:text-white hover:shadow-md hover:shadow-brand-purple/25"
              >
                {a.label}
              </a>
            ))}
          </div>
        </div>

        {/* Animated chat preview */}
        <div className="animate-rise-in mt-10 w-full max-w-[860px] [animation-delay:360ms]">
          <div className="animate-float-slow">
            <ChatPreview />
          </div>
        </div>

        {/* Animated Health Passport preview with floating chat bubbles */}
        <div
          className="animate-rise-in relative mt-12 w-full max-w-[860px] [animation-delay:480ms]"
          style={{
            minHeight: 500,
            background: "linear-gradient(to bottom, #EAE7F5, #F0EEF8)",
            borderRadius: 28,
            padding: "48px 24px",
          }}
        >
          {/* Bubble 1 — top left (user) */}
          <div
            className="pointer-events-none absolute hidden lg:flex items-center gap-2 z-10 animate-bubble-float"
            style={{ top: 40, right: "calc(100% - 90px)", animationDelay: "0s" }}
          >
            <div
              className="bg-white px-4 py-2.5 shadow-[0_8px_24px_-8px_rgba(124,58,237,0.25)]"
              style={{ borderRadius: "18px 18px 18px 4px", fontFamily: "Inter, sans-serif" }}
            >
              <p className="text-[14px] leading-snug whitespace-nowrap" style={{ color: "#2C2B4B" }}>
                Sleep's been rough this week
              </p>
            </div>
            {/* connector dots toward card */}
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="block h-1 w-1 rounded-full" style={{ background: "#C4B5FD", opacity: 0.6 }} />
              ))}
            </div>
          </div>

          {/* Bubble 2 — bottom left (user) */}
          <div
            className="pointer-events-none absolute hidden lg:flex items-center gap-2 z-10 animate-bubble-float"
            style={{ bottom: 60, right: "calc(100% - 90px)", animationDelay: "0.75s" }}
          >
            <div
              className="bg-white px-4 py-2.5 shadow-[0_8px_24px_-8px_rgba(124,58,237,0.25)]"
              style={{ borderRadius: "18px 18px 18px 4px", fontFamily: "Inter, sans-serif" }}
            >
              <p className="text-[14px] leading-snug whitespace-nowrap" style={{ color: "#2C2B4B" }}>
                I can't seem to switch off lately
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="block h-1 w-1 rounded-full" style={{ background: "#C4B5FD", opacity: 0.6 }} />
              ))}
            </div>
          </div>

          {/* Bubble 3 — top right (AI) */}
          <div
            className="pointer-events-none absolute hidden lg:flex items-center gap-2 z-10 animate-bubble-float"
            style={{ top: 40, left: "calc(100% - 90px)", animationDelay: "1.5s" }}
          >
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="block h-1 w-1 rounded-full" style={{ background: "#C4B5FD", opacity: 0.6 }} />
              ))}
            </div>
            <div
              className="px-4 py-2.5 text-white shadow-[0_8px_24px_-8px_rgba(124,58,237,0.4)]"
              style={{ background: "#7C3AED", borderRadius: "18px 18px 4px 18px", fontFamily: "Inter, sans-serif" }}
            >
              <p className="text-[14px] leading-snug whitespace-nowrap">
                I'll hold onto this — gently 💜
              </p>
            </div>
          </div>

          {/* Bubble 4 — bottom right (AI) */}
          <div
            className="pointer-events-none absolute hidden lg:flex items-center gap-2 z-10 animate-bubble-float"
            style={{ bottom: 60, left: "calc(100% - 90px)", animationDelay: "2.25s" }}
          >
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="block h-1 w-1 rounded-full" style={{ background: "#C4B5FD", opacity: 0.6 }} />
              ))}
            </div>
            <div
              className="px-4 py-2.5 text-white shadow-[0_8px_24px_-8px_rgba(124,58,237,0.4)]"
              style={{ background: "#7C3AED", borderRadius: "18px 18px 4px 18px", fontFamily: "Inter, sans-serif" }}
            >
              <p className="text-[14px] leading-snug whitespace-nowrap">
                Your mood has been slowly lifting
              </p>
            </div>
          </div>

          {/* Passport card — content unchanged, wrapper styling per spec */}
          <div
            className="mx-auto w-full max-w-[860px]"
            style={{
              borderRadius: 20,
              boxShadow: "0 8px 40px rgba(124, 58, 237, 0.12)",
            }}
          >
            <PassportPreview />
          </div>
        </div>

        {/* Sign in note */}
        <p className="mt-12 text-center text-[13px] text-brand-purple-dark/50">
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
