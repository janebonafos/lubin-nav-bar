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
  const [cardsShown, setCardsShown] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const cycle = () => {
      if (cancelled) return;
      setShownInsight(0);
      setPathLen(0);
      setCardsShown(0);
      // Reveal cards one by one so it doesn't feel like everything lands at once
      [1, 2, 3].forEach((n, i) => {
        timers.push(setTimeout(() => !cancelled && setCardsShown(n), 300 + i * 550));
      });
      INSIGHTS.forEach((_, i) => {
        timers.push(setTimeout(() => !cancelled && setShownInsight(i + 1), 700 + i * 700));
      });
      timers.push(setTimeout(() => !cancelled && setPathLen(1), 1100));
      timers.push(setTimeout(() => !cancelled && setActiveTab((t) => (t + 1) % TABS.length), 5200));
      timers.push(setTimeout(cycle, 7800));
    };
    cycle();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, []);

  const pointsStr = MOOD_POINTS.map((p) => `${p.x},${p.y}`).join(" ");

  const cardReveal = (idx: number) => ({
    opacity: cardsShown > idx ? 1 : 0,
    transform: cardsShown > idx ? "translateY(0)" : "translateY(14px)",
    transition: "opacity 0.6s ease-out, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
  });

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-3xl bg-white p-8 md:p-10 shadow-[0_30px_80px_-30px_rgba(126,107,175,0.35)] ring-1 ring-brand-purple/10">
      {/* Header label */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-brand-purple/70">
            Your Health Passport
          </p>
          <p className="mt-1.5 text-[20px] md:text-[22px] font-semibold leading-snug text-brand-purple-dark">
            Everything you share, gently remembered.
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-purple/10 px-3 py-1.5 text-[12px] font-medium text-brand-purple">
          <Lock className="h-3 w-3" />
          Private to you
        </span>
      </div>

      {/* Animated tabs */}
      <div className="mt-6 flex items-center gap-7 border-b border-brand-purple/10">
        {TABS.map((t, i) => (
          <div key={t} className="relative pb-3">
            <span
              className={`text-[13.5px] transition-colors duration-300 ${
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

      {/* Insight blocks — staggered reveal */}
      <div className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-3">
        {/* What we're noticing */}
        <div className="rounded-2xl bg-brand-purple/[0.05] p-5" style={cardReveal(0)}>
          <div className="flex items-center gap-2 text-brand-purple">
            <Sparkles className="h-4 w-4" strokeWidth={2.2} />
            <p className="text-[12px] font-semibold uppercase tracking-wider">
              What we're noticing
            </p>
          </div>
          <div className="mt-4 flex flex-col gap-2.5 min-h-[140px]">
            {INSIGHTS.map((line, i) => {
              const shown = i < shownInsight;
              return (
                <p
                  key={i}
                  className="text-[13.5px] leading-relaxed text-brand-purple-dark/80 transition-all duration-500"
                  style={{
                    opacity: shown ? 1 : 0,
                    transform: shown ? "translateY(0)" : "translateY(6px)",
                  }}
                >
                  • {line}
                </p>
              );
            })}
          </div>
        </div>

        {/* Mood trend */}
        <div className="rounded-2xl bg-brand-purple/[0.05] p-5" style={cardReveal(1)}>
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-brand-purple">
              Mood trend
            </p>
            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100/70 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
              <TrendingUp className="h-3 w-3" />
              Improving
            </span>
          </div>
          <svg viewBox="0 0 100 70" className="mt-4 h-[140px] w-full" preserveAspectRatio="none">
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
              strokeWidth="2"
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
        <div className="rounded-2xl bg-brand-purple/[0.05] p-5" style={cardReveal(2)}>
          <p className="text-[12px] font-semibold uppercase tracking-wider text-brand-purple">
            On your mind
          </p>
          <div className="mt-4 flex flex-col gap-3 min-h-[140px] justify-center">
            {THEMES.map((th, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-14 shrink-0 text-[12.5px] font-medium text-brand-purple-dark/80">
                  {th.label}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-purple/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-purple-accent to-brand-purple transition-all duration-[1200ms] ease-out"
                    style={{
                      width: pathLen ? `${th.count * 15}%` : "0%",
                      transitionDelay: `${i * 100}ms`,
                    }}
                  />
                </div>
                <span className="w-7 text-right text-[11.5px] text-brand-purple-dark/50">
                  {th.count}×
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Share teaser */}
      <div
        className="mt-6 flex items-center gap-3 rounded-2xl border border-dashed border-brand-purple/25 px-5 py-4"
        style={cardReveal(2)}
      >
        <FileText className="h-4 w-4 shrink-0 text-brand-purple" strokeWidth={2.2} />
        <p className="text-[13px] leading-relaxed text-brand-purple-dark/70">
          Share a snapshot with your therapist or someone you trust — only when{" "}
          <span className="font-semibold text-brand-purple-dark">you</span> choose to.
        </p>
      </div>
    </div>
  );
}
