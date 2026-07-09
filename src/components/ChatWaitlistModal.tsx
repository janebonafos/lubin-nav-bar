import { useEffect, useState } from "react";
import { X, Check, Bell, Sparkles } from "lucide-react";

const WAITLIST_KEY = "lubin.chat.waitlist.v1";
export const OPEN_EVENT = "lubin:chat:waitlist:open";

export const openChatWaitlist = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OPEN_EVENT));
  }
};

export default function ChatWaitlistModal() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const onOpen = () => {
      try {
        const raw = localStorage.getItem(WAITLIST_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.email) setJoined(true);
        }
      } catch { /* ignore */ }
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return;
    try {
      localStorage.setItem(
        WAITLIST_KEY,
        JSON.stringify({ email: value, joinedAt: Date.now() }),
      );
    } catch { /* ignore */ }
    setJoined(true);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-brand-navy/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={() => setOpen(false)}
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-brand-purple/20 bg-gradient-to-br from-white via-[#F7F4FF] to-[#EEE9FB] p-7 shadow-2xl"
      >
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-brand-purple-dark/50 transition-colors hover:bg-brand-purple/10 hover:text-brand-purple-dark"
        >
          <X className="h-4 w-4" />
        </button>

        {joined ? (
          <div className="flex flex-col items-center gap-3 pt-3 text-center">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand-purple/12 text-brand-purple">
              <Check className="h-5 w-5" strokeWidth={2.4} />
            </span>
            <h2 className="text-lg font-bold text-brand-purple-dark">You're on the list.</h2>
            <p className="text-[13.5px] text-brand-purple-dark/65">
              We'll whisper the moment Lubin is ready to listen — no spam, promise.
            </p>
          </div>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-purple/25 bg-white/70 px-3 py-1 text-[11.5px] font-semibold uppercase tracking-wider text-brand-purple">
              <Sparkles className="h-3 w-3" strokeWidth={2.4} />
              Coming Soon
            </span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-brand-purple-dark">
              A companion worth waiting for.
            </h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-brand-purple-dark/65">
              Lubin is learning to listen — a private space to talk, reflect, and feel heard.
              Drop your email and we'll let you in first.
            </p>
            <form onSubmit={submit} className="mt-5 flex flex-col gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoFocus
                className="w-full rounded-xl border border-brand-purple/20 bg-white px-3.5 py-2.5 text-[14px] text-brand-purple-dark placeholder:text-brand-purple/40 focus:border-brand-purple/50 focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-brand-purple to-brand-purple-dark px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(126,107,175,0.7)] transition-all hover:-translate-y-0.5"
              >
                <Bell className="h-3.5 w-3.5" />
                Get early access
              </button>
            </form>
            <p className="mt-3 text-center text-[11.5px] text-brand-purple-dark/50">
              Join <span className="font-semibold text-brand-purple-dark/70">1,247</span> others waiting to be heard.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
