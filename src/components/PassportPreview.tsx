import { useEffect, useState } from "react";
import { Sparkles, TrendingUp, Lock, FileText } from "lucide-react";

const TABS = ["Overview", "My Progress", "Share Snapshot"];

const INSIGHTS = [
  "Sleep keeps coming up in our chats",
  "Work stress has been a recurring theme",
  "Your mood is slowly lifting this month",
];

const THEMES = [
  { label: "Sleep", count: 6 },
  { label: "Stress", count: 5 },
  { label: "Work", count: 4 },
  { label: "Family", count: 3 },
];

const MOOD_POINTS = [
  { x: 2, y: 62 }, { x: 14, y: 58 }, { x: 26, y: 54 }, { x: 38, y: 56 },
  { x: 50, y: 48 }, { x: 62, y: 46 }, { x: 74, y: 40 }, { x: 86, y: 38 }, { x: 98, y: 34 },
];

export default function PassportPreview() {
  const [activeTab, setActiveTab] = useState(0);
  const [shownInsight, setShownInsight] = useState(0);
  const [pathLen, setPathLen] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const cycle = () => {
      if (cancelled) return;
      setShownInsight(0);
      setPathLen(0);
      INSIGHTS.forEach((_, i) => {
        timers.push(setTimeout(() => !cancelled && setShownInsight(i + 1), 400 + i * 600));
      });
      timers.push(setTimeout(() => !cancelled && setPathLen(1), 600));
      timers.push(setTimeout(() => !cancelled && setActiveTab((t) => (t + 1) % TABS.length), 3500));
      timers.push(setTimeout(cycle, 5500));
    };
    cycle();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, []);

  const pointsStr = MOOD_POINTS.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-white p-6 shadow-lg ring-1 ring-brand-purple/10">
      {/* Header label */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-brand-purple/70">
            Your Health Passport
          </p>
          <p className="mt-0.5 text-[15px] font-semibold text-brand-purple-dark">
            Everything you share, gently remembered.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-purple/10 px-2.5 py-1 text-[10.5px] font-medium text-brand-purple">
          <Lock className="h-2.5 w-2.5" />
          Private to you
        </span>
      </div>

      {/* Animated tabs */}
      <div className="mt-4 flex items-center gap-5 border-b border-brand-purple/10">
        {TABS.map((t, i) => (
          <div key={t} className="relative pb-2">
            <span
              className={`text-[12px] transition-colors duration-300 ${
                i === activeTab
                  ? "font-semibold text-brand-purple"
                  : "text-brand-purple-dark/50"
              }`}
            >
              {t}
            </span>
            {i === activeTab && (
              <span className="absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-brand-purple animate-[fade-in_0.3s_ease-out]" />
            )}
          </div>
        ))}
      </div>

      {/* Three compact insight blocks side-by-side */}
      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        {/* What we're noticing */}
        <div className="rounded-xl bg-brand-purple/[0.05] p-4">
          <div className="flex items-center gap-1.5 text-brand-purple">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2.2} />
            <p className="text-[11px] font-semibold uppercase tracking-wide">
              What we're noticing
            </p>
          </div>
          <div className="mt-2.5 flex flex-col gap-1.5 min-h-[88px]">
            {INSIGHTS.map((line, i) => {
              const shown = i < shownInsight;
              return (
                <p
                  key={i}
                  className="text-[12px] leading-snug text-brand-purple-dark/80 transition-all duration-500"
                  style={{
                    opacity: shown ? 1 : 0,
                    transform: shown ? "translateY(0)" : "translateY(4px)",
                  }}
                >
                  • {line}
                </p>
              );
            })}
          </div>
        </div>

        {/* Mood trend */}
        <div className="rounded-xl bg-brand-purple/[0.05] p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-purple">
              Mood trend
            </p>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100/70 px-1.5 py-0.5 text-[9.5px] font-medium text-emerald-700">
              <TrendingUp className="h-2.5 w-2.5" />
              Improving
            </span>
          </div>
          <svg viewBox="0 0 100 70" className="mt-2 h-[88px] w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="moodFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#7E6BAF" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#7E6BAF" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={`M ${MOOD_POINTS[0].x},70 L ${pointsStr.split(" ").join(" L ")} L 100,70 Z`}
              fill="url(#moodFill)"
              style={{ opacity: pathLen, transition: "opacity 1s ease 0.6s" }}
            />
            <polyline
              points={pointsStr}
              fill="none"
              stroke="#7E6BAF"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 300,
                strokeDashoffset: 300 - pathLen * 300,
                transition: "stroke-dashoffset 1.6s ease-out",
              }}
            />
          </svg>
        </div>

        {/* Top themes */}
        <div className="rounded-xl bg-brand-purple/[0.05] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-purple">
            On your mind
          </p>
          <div className="mt-2.5 flex flex-col gap-2 min-h-[88px] justify-center">
            {THEMES.map((th, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-12 shrink-0 text-[11px] font-medium text-brand-purple-dark/80">
                  {th.label}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand-purple/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-purple-accent to-brand-purple transition-all duration-[1200ms] ease-out"
                    style={{
                      width: pathLen ? `${th.count * 15}%` : "0%",
                      transitionDelay: `${i * 100}ms`,
                    }}
                  />
                </div>
                <span className="w-6 text-right text-[10px] text-brand-purple-dark/50">
                  {th.count}×
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Share teaser */}
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-brand-purple/25 px-4 py-2.5">
        <FileText className="h-3.5 w-3.5 text-brand-purple" strokeWidth={2.2} />
        <p className="text-[11.5px] text-brand-purple-dark/70">
          Share a snapshot with your therapist or someone you trust — only when{" "}
          <span className="font-semibold text-brand-purple-dark">you</span> choose to.
        </p>
      </div>
    </div>
  );
}
