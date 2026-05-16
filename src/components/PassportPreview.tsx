import { useEffect, useState } from "react";
import { Sparkles, Moon, Briefcase, BatteryLow, TrendingUp, Waves, Users } from "lucide-react";

const INSIGHTS = [
  { icon: Moon, text: "Sleep has come up often" },
  { icon: Briefcase, text: "Work stress is a recurring theme" },
  { icon: BatteryLow, text: "Energy has been lower than usual" },
];

const PATTERNS = [
  { icon: Moon, label: "sleep", count: "6 times" },
  { icon: Waves, label: "stress", count: "5 times" },
  { icon: Briefcase, label: "work", count: "4 times" },
  { icon: Users, label: "family", count: "3 times" },
];

const MOOD_POINTS = [
  { x: 4, y: 70 }, { x: 16, y: 60 }, { x: 28, y: 55 }, { x: 40, y: 48 },
  { x: 52, y: 52 }, { x: 64, y: 42 }, { x: 76, y: 38 }, { x: 88, y: 40 }, { x: 96, y: 36 },
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
      INSIGHTS.forEach((_, i) => {
        timers.push(setTimeout(() => !cancelled && setVisibleInsights(i + 1), 400 + i * 550));
      });
      timers.push(setTimeout(() => !cancelled && setPathLen(1), 700));
      timers.push(setTimeout(cycle, 6500));
    };
    cycle();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, []);

  const pointsStr = MOOD_POINTS.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="flex w-full flex-col rounded-2xl bg-white p-6 shadow-lg">
      {/* Greeting header */}
      <div className="rounded-xl bg-gradient-to-br from-brand-purple/80 to-brand-purple px-5 py-4 text-white">
        <p className="text-[16px] font-semibold leading-tight">
          Good morning, Maria <span className="ml-0.5">👋</span>
        </p>
        <p className="mt-1 text-[12px] text-white/80">Friday, April 17, 2026</p>
      </div>

      {/* Two-column grid */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Insights */}
        <div className="rounded-xl border border-brand-purple/10 bg-white p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-purple/10 text-brand-purple">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2.2} />
            </span>
            <p className="text-[13px] font-semibold text-brand-purple-dark">
              Here's what we're noticing
            </p>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {INSIGHTS.map((it, i) => {
              const Icon = it.icon;
              const shown = i < visibleInsights;
              return (
                <div
                  key={i}
                  className="flex items-center gap-2.5 rounded-lg bg-brand-purple/5 px-3 py-2 transition-all duration-500"
                  style={{
                    opacity: shown ? 1 : 0,
                    transform: shown ? "translateY(0)" : "translateY(6px)",
                  }}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-brand-purple">
                    <Icon className="h-3 w-3" strokeWidth={2.2} />
                  </span>
                  <span className="text-[12px] font-medium text-brand-purple-dark/80">
                    {it.text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mood chart */}
        <div className="rounded-xl border border-brand-purple/10 bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-brand-purple-dark">Mood This Month</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/70 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
              <TrendingUp className="h-2.5 w-2.5" />
              Up from 2.8
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-3xl font-bold text-brand-purple-dark">3.4</span>
            <span className="text-[11px] text-brand-purple-dark/40">/ 5</span>
          </div>
          <svg viewBox="0 0 100 80" className="mt-2 h-24 w-full" preserveAspectRatio="none">
            {[20, 45, 70].map((y) => (
              <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="#E9E3F7" strokeWidth="0.4" strokeDasharray="1.5 1.5" />
            ))}
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
            {MOOD_POINTS.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r="1.2"
                fill="#7E6BAF"
                style={{
                  opacity: pathLen,
                  transition: `opacity 0.4s ease ${0.4 + i * 0.08}s`,
                }}
              />
            ))}
          </svg>
        </div>
      </div>

      {/* Patterns row */}
      <div className="mt-4 rounded-xl border border-brand-purple/10 bg-white p-4">
        <p className="text-[13px] font-semibold text-brand-purple-dark">Patterns we're seeing</p>
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          {PATTERNS.map((p, i) => {
            const Icon = p.icon;
            return (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-brand-purple/5 px-3 py-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-brand-purple">
                  <Icon className="h-3 w-3" strokeWidth={2.2} />
                </span>
                <span className="text-[11.5px] text-brand-purple-dark/80">
                  <span className="font-semibold">{p.label}</span>{" "}
                  <span className="text-brand-purple-dark/50">({p.count})</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
