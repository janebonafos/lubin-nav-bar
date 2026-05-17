import { useEffect, useRef, useState } from "react";

type Msg = { from: "ai" | "user"; text: string };

const SCRIPT: Msg[] = [
  { from: "ai", text: "Hi — what's been on your mind lately?" },
  { from: "user", text: "I've been feeling really stressed about work lately" },
  { from: "ai", text: "That makes sense. Work stress can quietly build up. How long has it been feeling this way?" },
  { from: "user", text: "A few weeks. I can't seem to switch off" },
  { from: "ai", text: "When your mind stays on even after work ends, it's often a sign something needs attention. You don't have to figure it out alone." },
];

const GAP_MS = 1500;
const TYPING_MS = 800;
const LOOP_PAUSE_MS = 3000;

export default function ChatPreview() {
  const [visible, setVisible] = useState<number>(1); // first message shown immediately
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [visible, typing]);

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const schedule = (fn: () => void, ms: number) => {
      const t = setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
      timers.push(t);
    };

    const runFrom = (index: number) => {
      if (cancelled) return;
      if (index >= SCRIPT.length) {
        // pause then restart
        schedule(() => {
          setVisible(0);
          setTyping(false);
          schedule(() => {
            setVisible(1);
            runFrom(1);
          }, 200);
        }, LOOP_PAUSE_MS);
        return;
      }
      // wait gap, then show typing, then reveal next message
      schedule(() => {
        setTyping(true);
        schedule(() => {
          setTyping(false);
          setVisible(index + 1);
          runFrom(index + 1);
        }, TYPING_MS);
      }, GAP_MS);
    };

    runFrom(1);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="relative flex flex-col w-full rounded-2xl bg-white/95 shadow-[0_20px_60px_-20px_rgba(124,58,237,0.35)] ring-1 ring-brand-purple/10 overflow-hidden backdrop-blur-sm">
      {/* Subtle header */}
      <div className="flex items-center gap-2 border-b border-brand-purple/10 bg-gradient-to-r from-white to-[#F5F3FF] px-5 py-3">
        <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
        <span className="text-[12px] font-medium tracking-wide text-brand-purple-dark/70">
          Lubin · listening
        </span>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex flex-col gap-2.5 min-h-[340px] max-h-[380px] overflow-hidden scroll-smooth p-6"
      >
        {SCRIPT.slice(0, visible).map((m, i) => (
          <div
            key={i}
            className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
            style={{ animation: "msg-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) both" }}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[13.5px] leading-relaxed shadow-sm transition-transform ${
                m.from === "user"
                  ? "bg-gradient-to-br from-[#5C82BD] to-[#3F5F94] text-white rounded-br-sm"
                  : "bg-gradient-to-br from-[#F0ECFB] to-[#E4DEF3] text-[#2C2B4B] rounded-bl-sm"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {typing && (
          (() => {
            const isUser = SCRIPT[visible]?.from === "user";
            return (
              <div
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                style={{ animation: "msg-in 0.35s ease-out both" }}
              >
                <div
                  className={`flex items-center gap-1 rounded-2xl px-3.5 py-2.5 shadow-sm ${
                    isUser
                      ? "rounded-br-sm bg-gradient-to-br from-[#5C82BD] to-[#3F5F94]"
                      : "rounded-bl-sm bg-gradient-to-br from-[#F0ECFB] to-[#E4DEF3]"
                  }`}
                >
                  {[0, 150, 300].map((d) => (
                    <span
                      key={d}
                      className={`h-1.5 w-1.5 rounded-full ${isUser ? "bg-white/80" : "bg-brand-purple/70"}`}
                      style={{ animation: "dot-bounce 1.2s ease-in-out infinite", animationDelay: `${d}ms` }}
                    />
                  ))}
                </div>
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}