import { useEffect, useState } from "react";

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
      className="fixed inset-0 z-[100] flex items-end justify-center bg-brand-navy/30 p-4 backdrop-blur-sm sm:items-center"
      onClick={() => setOpen(false)}
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
      >
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute right-4 top-4 text-sm text-brand-purple-dark/40 transition-colors hover:text-brand-purple-dark"
        >
          ×
        </button>

        {joined ? (
          <div className="pt-2 text-center">
            <h2 className="text-lg font-semibold text-brand-purple-dark">You're on the list.</h2>
            <p className="mt-2 text-sm text-brand-purple-dark/60">
              We'll email you when chat is ready.
            </p>
          </div>
        ) : (
          <div className="pt-2">
            <h2 className="text-lg font-semibold text-brand-purple-dark">Chat is coming soon.</h2>
            <p className="mt-1 text-sm text-brand-purple-dark/60">
              Get notified when it's ready.
            </p>
            <form onSubmit={submit} className="mt-5 flex flex-col gap-2.5">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoFocus
                className="w-full rounded-xl border border-brand-purple/15 bg-white px-4 py-2.5 text-sm text-brand-purple-dark placeholder:text-brand-purple/35 focus:border-brand-purple/40 focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-brand-purple px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-purple-dark"
              >
                Notify me
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
