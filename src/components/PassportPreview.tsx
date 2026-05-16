import { useEffect, useState } from "react";
import { Sparkles, Moon, Briefcase, BatteryLow, TrendingUp } from "lucide-react";

const INSIGHTS = [
  { icon: Moon, text: "Sleep has come up often" },
  { icon: Briefcase, text: "Work stress is a recurring theme" },
  { icon: BatteryLow, text: "Energy has been lower than usual" },
];

// simple mood points (x%, y%) — y inverted (lower y = higher mood)
const MOOD_POINTS = [
  { x: 5, y: 70 },
  { x: 18, y: 60 },
  { x: 32, y: 55 },
  { x: 45, y: 48 },
  { x: 58, y: 52 },
  { x: 72, y: 42 },
  { x: 86, y: 38 },
  { x: 96, y: 40 },
];

export default function PassportPreview() {
  const [visibleInsights, setVisibleInsights] = useState(0);
  const [pathLen, setPathLen] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const cycle = () => {
      if (cancelled) return;
      setVisibleInsights(0);
      setPathLen(0);
      // reveal insights one by one
      INSIGHTS.forEach((_, i) => {
        timers.push(
          setTimeout(() => !cancelled && setVisibleInsights(i + 1), 500 + i * 600),
        );
      });
      // draw line
      timers.push(setTimeout(() => !cancelled && setPathLen(1), 800));
      // loop
      timers.push(setTimeout(cycle, 6500));
    };
    cycle();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, []);

  // build polyline points string
  const pointsStr = MOOD_POINTS.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="flex w-full flex-col gap-3 rounded-2xl border border-brand-purple/15 bg-white p-4 shadow-2xl shadow-brand-purple/20">
      {/* Greeting header */}
      <div className="rounded-xl bg-gradient-to-br from-brand-purple/80 to-brand-purple px-4 py-3 text-white">
        <p className="text-[13px] font-semibold leading-tight">
          Good morning, Maria <span className="ml-0.5">👋</span>
        </p>
        <p className="mt-0.5 text-[10.5px] text-white/80">Friday, April 17, 2026</p>
      </div>

      {/* Insights card */}
      <div className="rounded-xl border border-brand-purple/10 bg-white p-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-purple/10 text-brand-purple">
            <Sparkles className="h-3 w-3" strokeWidth={2.2} />
          </span>
          <p className="text-[12px] font-semibold text-brand-purple-dark">
            Here's what we're noticing
          </p>
        </div>
        <div className="mt-2.5 flex flex-col gap-1.5">
          {INSIGHTS.map((it, i) => {
            const Icon = it.icon;
            const shown = i < visibleInsights;
            return (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg bg-brand-purple/5 px-2.5 py-1.5 transition-all duration-500"
                style={{
                  opacity: shown ? 1 : 0,
                  transform: shown ? "translateY(0)" : "translateY(6px)",
                }}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-brand-purple">
                  <Icon className="h-2.5 w-2.5" strokeWidth={2.2} />
                </span>
                <span className="text-[10.5px] font-medium text-brand-purple-dark/80">
                  {it.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mood chart card */}
      <div className="rounded-xl border border-brand-purple/10 bg-white p-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-brand-purple-dark">Mood This Month</p>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/70 px-2 py-0.5 text-[9.5px] font-medium text-emerald-700">
            <TrendingUp className="h-2.5 w-2.5" />
            Up from 2.8
          </span>
        </div>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-2xl font-bold text-brand-purple-dark">3.4</span>
          <span className="text-[10px] text-brand-purple-dark/40">/ 5</span>
        </div>
        <svg viewBox="0 0 100 80" className="mt-1 h-16 w-full">
          {/* gridlines */}
          {[20, 45, 70].map((y) => (
            <line
              key={y}
              x1="0"
              x2="100"
              y1={y}
              y2={y}
              stroke="#E9E3F7"
              strokeWidth="0.4"
              strokeDasharray="1.5 1.5"
            />
          ))}
          {/* animated line */}
          <polyline
            points={pointsStr}
            fill="none"
            stroke="#7E6BAF"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: 300,
              strokeDashoffset: 300 - pathLen * 300,
              transition: "stroke-dashoffset 1.6s ease-out",
            }}
          />
          {/* points */}
          {MOOD_POINTS.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="1.2"
              fill="#7E6BAF"
              style={{
                opacity: pathLen,
                transition: `opacity 0.4s ease ${0.4 + i * 0.1}s`,
              }}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
