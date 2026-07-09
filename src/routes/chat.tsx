import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Sparkles, HeartHandshake, Sun, Check, Bell, Clock } from "lucide-react";
import lubinLogo from "@/assets/lubin-logo.svg";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Lubin Chat — Coming Soon" },
      {
        name: "description",
        content:
          "Lubin, your private mental health companion, is almost ready. Join the waitlist to be the first to chat.",
      },
      { property: "og:title", content: "Lubin Chat — Coming Soon" },
      {
        property: "og:description",
        content: "A gentle, private space to talk through how you're feeling. Coming soon.",
      },
    ],
  }),
  component: ChatComingSoon,
});

const WAITLIST_KEY = "lubin.chat.waitlist.v1";

const PROMISES = [
  { title: "Always private", body: "Your words stay yours. End-to-end encrypted, never sold." },
  { title: "Gently intelligent", body: "Reflects, listens, and helps you name what you're feeling." },
  { title: "Available at 3am", body: "For the nights when the mind won't quiet down." },
];

const WHISPERS = [
  "I've been carrying something heavy all week…",
  "I don't know why I feel this way.",
  "Can we just talk for a minute?",
  "Today was actually a good day.",
];

function ChatComingSoon() {
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);
  const [count, setCount] = useState(1247);
  const [whisperIndex, setWhisperIndex] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WAITLIST_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.email) setJoined(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setWhisperIndex((i) => (i + 1) % WHISPERS.length);
    }, 3200);
    return () => clearInterval(id);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return;
    try {
      localStorage.setItem(
        WAITLIST_KEY,
        JSON.stringify({ email: value, joinedAt: Date.now() }),
      );
    } catch {
      /* ignore */
    }
    setJoined(true);
    setCount((c) => c + 1);
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#F7F4FF] via-[#EEE9FB] to-[#F4EEFB]"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-32 h-[520px] w-[520px] rounded-full bg-gradient-to-br from-brand-purple/30 to-brand-purple-accent/10 blur-[120px] animate-blob" />
        <div className="absolute top-1/3 -right-48 h-[560px] w-[560px] rounded-full bg-gradient-to-br from-[#C4B5FD]/35 to-[#9990C9]/15 blur-[120px] animate-blob [animation-delay:-6s]" />
        <div className="absolute -bottom-40 left-1/4 h-[420px] w-[420px] rounded-full bg-gradient-to-br from-[#E9D8FD]/45 to-transparent blur-[120px] animate-blob [animation-delay:-12s]" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 pt-6 md:px-8">
        <Link
          to="/"
          className="group inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-brand-purple-dark transition-colors hover:bg-brand-purple/8"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-purple/10 text-brand-purple transition-all group-hover:bg-brand-purple/15 group-hover:-translate-x-0.5">
            <ArrowLeft className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <img src={lubinLogo} alt="Lubin" className="h-[20px] w-auto" />
        </Link>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-purple/25 bg-white/70 px-3 py-1 text-[11.5px] font-semibold uppercase tracking-wider text-brand-purple backdrop-blur-md">
          <Clock className="h-3 w-3" /> Coming Soon
        </span>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center px-5 pb-24 pt-14 text-center md:px-8">
        {/* Preview bubble */}
        <div
          aria-hidden
          className="relative mb-8 h-14 w-full max-w-sm"
        >
          {WHISPERS.map((w, i) => (
            <div
              key={w}
              className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ${
                i === whisperIndex
                  ? "translate-y-0 opacity-100"
                  : "translate-y-2 opacity-0"
              }`}
            >
              <div className="inline-flex max-w-full items-center gap-2 rounded-2xl rounded-bl-md bg-white/90 px-4 py-2.5 text-[13.5px] italic text-brand-purple-dark shadow-[0_10px_28px_-14px_rgba(126,107,175,0.4)] ring-1 ring-brand-purple/10">
                <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-purple/60" />
                {w}
              </div>
            </div>
          ))}
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-purple/25 bg-white/70 px-4 py-1.5 text-[12.5px] font-medium text-brand-purple shadow-sm backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2.2} />
          Lubin is learning to listen
        </span>

        <h1 className="mt-5 text-4xl font-bold tracking-tight text-brand-purple-dark md:text-6xl">
          A companion worth{" "}
          <span className="bg-gradient-to-r from-brand-purple to-brand-purple-dark bg-clip-text text-transparent">
            waiting for.
          </span>
        </h1>
        <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-brand-purple-dark/65 md:text-base">
          We're putting the finishing touches on Lubin — a private space to
          talk, reflect, and feel heard. No judgement. No noise. Just you and a
          gentle voice on the other side.
        </p>

        {/* Waitlist */}
        <div className="mt-10 w-full max-w-md">
          {joined ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-brand-purple/20 bg-white/80 px-5 py-6 backdrop-blur-md">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-purple/12 text-brand-purple">
                <Check className="h-5 w-5" strokeWidth={2.4} />
              </span>
              <p className="text-[15px] font-semibold text-brand-purple-dark">
                You're on the list.
              </p>
              <p className="text-[13px] text-brand-purple-dark/60">
                We'll whisper the moment Lubin is ready — no spam, promise.
              </p>
            </div>
          ) : (
            <form
              onSubmit={submit}
              className="flex flex-col gap-2.5 rounded-2xl border border-brand-purple/20 bg-white/85 p-2.5 shadow-[0_12px_40px_-18px_rgba(124,58,237,0.35)] backdrop-blur-md sm:flex-row"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full flex-1 rounded-xl bg-transparent px-3 py-2.5 text-[14px] text-brand-purple-dark placeholder:text-brand-purple/40 focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-gradient-to-br from-brand-purple to-brand-purple-dark px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(126,107,175,0.7)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(61,46,107,0.6)]"
              >
                <Bell className="h-3.5 w-3.5" />
                Get early access
              </button>
            </form>
          )}
          <p className="mt-3 text-[12px] text-brand-purple-dark/50">
            <span className="font-semibold text-brand-purple-dark/70">
              {count.toLocaleString()}
            </span>{" "}
            people already waiting to be heard.
          </p>
        </div>

        {/* Promises */}
        <div className="mt-14 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
          {PROMISES.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-brand-purple/15 bg-white/70 p-4 text-left backdrop-blur-md"
            >
              <p className="text-[13px] font-semibold text-brand-purple-dark">
                {p.title}
              </p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-brand-purple-dark/60">
                {p.body}
              </p>
            </div>
          ))}
        </div>

        {/* Meanwhile */}
        <div className="mt-14 w-full max-w-2xl">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-brand-purple-dark/45">
            While you wait
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              to="/my-health-passport"
              className="group flex items-center gap-3 rounded-2xl border border-brand-purple/20 bg-white/80 px-4 py-3.5 text-left backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-brand-purple/45 hover:shadow-[0_12px_28px_-14px_rgba(126,107,175,0.4)]"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-purple/10 text-brand-purple">
                <HeartHandshake className="h-4.5 w-4.5" />
              </span>
              <span>
                <p className="text-[13.5px] font-semibold text-brand-purple-dark">
                  Open your Health Passport
                </p>
                <p className="text-[12px] text-brand-purple-dark/60">
                  Track moods, notes, and check-ins.
                </p>
              </span>
            </Link>
            <Link
              to="/check-in"
              className="group flex items-center gap-3 rounded-2xl border border-brand-purple/20 bg-white/80 px-4 py-3.5 text-left backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-brand-purple/45 hover:shadow-[0_12px_28px_-14px_rgba(126,107,175,0.4)]"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-purple/10 text-brand-purple">
                <Sun className="h-4.5 w-4.5" />
              </span>
              <span>
                <p className="text-[13.5px] font-semibold text-brand-purple-dark">
                  Do a quick check-in
                </p>
                <p className="text-[12px] text-brand-purple-dark/60">
                  Two minutes. See how you're really doing.
                </p>
              </span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
