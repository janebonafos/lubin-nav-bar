import { useEffect, useState } from "react";

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
    <div className="flex flex-col w-full rounded-2xl bg-white shadow-lg overflow-hidden p-6">
      {/* Messages */}
      <div className="flex flex-col gap-2.5 min-h-[340px]">
        {SCRIPT.slice(0, visible).map((m, i) => (
          <div
            key={i}
            className={`flex ${m.from === "user" ? "justify-end" : "justify-start"} animate-[fade-in_0.4s_ease-out]`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[13.5px] leading-relaxed ${
                m.from === "user"
                  ? "bg-[#4A6FA5] text-white rounded-br-sm"
                  : "bg-[#EAE6F4] text-[#2C2B4B] rounded-bl-sm"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start animate-[fade-in_0.2s_ease-out]">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-[#EAE6F4] px-3.5 py-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-pulse [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-pulse [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-pulse [animation-delay:300ms]" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}