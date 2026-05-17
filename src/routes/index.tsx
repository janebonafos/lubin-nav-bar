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

function ThoughtBubble({
  side,
  variant,
  text,
  delay,
  style,
  rotate,
}: {
  side: "left" | "right";
  variant: "user" | "ai";
  text: string;
  delay: string;
  style: React.CSSProperties;
  rotate: number;
}) {
  const isUser = variant === "user";
  const radius = isUser ? "20px 20px 20px 4px" : "20px 20px 4px 20px";
  const aiGradient = "linear-gradient(135deg, #7E6BAF 0%, #3D2E6B 100%)";
  const typingBg = isUser ? "bg-white ring-1 ring-brand-purple/10" : "";
  const typingStyle: React.CSSProperties = !isUser ? { background: aiGradient } : {};
  const dotColor = isUser ? "#7E6BAF" : "rgba(255,255,255,0.95)";
  return (
    <div
      className="pointer-events-none absolute hidden xl:block z-10 animate-bubble-float"
      style={{ ...style, animationDelay: delay, transform: `rotate(${rotate}deg)` }}
    >
      <div className={`relative flex ${side === "left" ? "justify-end" : "justify-start"}`}>
        {/* Typing bubble (phase 1) */}
        <div
          className={`phase-typing absolute ${side === "left" ? "right-0" : "left-0"} top-0 inline-flex items-center gap-1 px-3 py-2 shadow-[0_8px_22px_-10px_rgba(124,58,237,0.3)] ${typingBg}`}
          style={{ ...typingStyle, borderRadius: radius, animationDelay: delay }}
        >
          {[0, 150, 300].map((d) => (
            <span
              key={d}
              className="block h-1.5 w-1.5 rounded-full"
              style={{
                background: dotColor,
                animation: "dot-bounce 1.2s ease-in-out infinite",
                animationDelay: `${d}ms`,
              }}
            />
          ))}
        </div>
        {/* Message bubble (phase 2) */}
        <div
          className={`phase-message px-4 py-2.5 shadow-[0_10px_28px_-10px_rgba(124,58,237,0.35)] ${isUser ? "bg-white ring-1 ring-brand-purple/10" : "text-white"}`}
          style={{
            ...(isUser ? {} : { background: aiGradient }),
            borderRadius: radius,
            fontFamily: "Inter, sans-serif",
            animationDelay: delay,
            maxWidth: 280,
            whiteSpace: "normal",
          }}
        >
          <p
            className="text-[13px] leading-snug whitespace-normal break-words"
            style={isUser ? { color: "#3D2E6B" } : undefined}
          >
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}

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

        {/* Animated Health Passport preview with organically-placed floating bubbles */}
        <div className="animate-rise-in relative mt-12 w-full max-w-[860px] [animation-delay:480ms]">
          <ThoughtBubble
            side="left"
            variant="user"
            text="I keep forgetting what I shared last time."
            delay="0s"
            rotate={-3}
            style={{ top: 24, right: "calc(100% - 60px)" }}
          />
          <ThoughtBubble
            side="left"
            variant="user"
            text="Am I actually feeling better?"
            delay="1.5s"
            rotate={2}
            style={{ top: "55%", right: "calc(100% - 40px)" }}
          />
          <ThoughtBubble
            side="right"
            variant="ai"
            text="Your Passport remembers, so you don't have to."
            delay="0.75s"
            rotate={2}
            style={{ top: "30%", left: "calc(100% - 50px)" }}
          />
          <ThoughtBubble
            side="right"
            variant="ai"
            text="Share only what you choose."
            delay="2.25s"
            rotate={-3}
            style={{ bottom: 32, left: "calc(100% - 70px)" }}
          />

          <PassportPreview />
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
