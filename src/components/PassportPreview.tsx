import { useEffect, useState } from "react";
import { Sparkles, TrendingUp, Flame, Moon, Battery, HeartPulse } from "lucide-react";

const METRICS = [
  { icon: HeartPulse, label: "Mood", value: 68, trend: "+12%", tone: "Lifting gently" },
  { icon: Battery, label: "Energy", value: 54, trend: "+4%", tone: "Slowly recovering" },
  { icon: Moon, label: "Sleep", value: 42, trend: "-6%", tone: "Needs attention" },
];

const THEMES = [
  { label: "Sleep", weight: 90 },
  { label: "Stress", weight: 75 },
  { label: "Work", weight: 60 },
  { label: "Family", weight: 45 },
];

// 30-day mood points
const MOOD_POINTS = [
  { x: 2, y: 62 }, { x: 10, y: 58 }, { x: 18, y: 64 }, { x: 26, y: 52 },
  { x: 34, y: 56 }, { x: 42, y: 48 }, { x: 50, y: 50 }, { x: 58, y: 42 },
  { x: 66, y: 44 }, { x: 74, y: 36 }, { x: 82, y: 40 }, { x: 90, y: 32 }, { x: 98, y: 30 },
];

export default function PassportPreview() {
  const [animate, setAnimate] = useState(0);
  const [pathLen, setPathLen] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const cycle = () => {
      if (cancelled) return;
      setAnimate(0);
      setPathLen(0);
      timers.push(setTimeout(() => !cancelled && setAnimate(1), 200));
      timers.push(setTimeout(() => !cancelled && setPathLen(1), 500));
      timers.push(setTimeout(cycle, 6000));
    };
    cycle();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, []);

  const pointsStr = MOOD_POINTS.map((p) => `${p.x},${p.y}`).join(" ");
  // area fill path
  const areaPath = `M ${MOOD_POINTS[0].x},80 L ${pointsStr.split(" ").join(" L ")} L 100,80 Z`;

  return (
    <div className="flex w-full flex-col rounded-2xl bg-white p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 rounded-xl bg-gradient-to-br from-brand-purple/85 via-brand-purple to-brand-purple-dark px-5 py-4 text-white">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-white/70">
            Your Health Passport
          </p>
          <p className="mt-0.5 text-[17px] font-semibold leading-tight">
            A private snapshot of how you've been
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          <Flame className="h-3 w-3" />
          5-day streak
        </div>
      </div>

      {/* Metrics */}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        {METRICS.map((m, i) => {
          const Icon = m.icon;
          const up = m.trend.startsWith("+");
          return (
            <div
              key={i}
              className="rounded-xl border border-brand-purple/10 bg-white p-3.5"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-purple/10 text-brand-purple">
                  <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
                </span>
                <span
                  className={`text-[10.5px] font-semibold ${
                    up ? "text-emerald-600" : "text-rose-500"
                  }`}
                >
                  {m.trend}
                </span>
              </div>
              <p className="mt-2 text-[12px] font-semibold text-brand-purple-dark">
                {m.label}
              </p>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-brand-purple/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-purple to-brand-purple-accent transition-all duration-[1400ms] ease-out"
                  style={{ width: animate ? `${m.value}%` : "0%" }}
                />
              </div>
              <p className="mt-1.5 text-[10.5px] text-brand-purple-dark/55">{m.tone}</p>
            </div>
          );
        })}
      </div>

      {/* Insight + Trend */}
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-5">
        {/* Insight card */}
        <div className="rounded-xl border border-brand-purple/10 bg-brand-purple/5 p-4 md:col-span-2">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-brand-purple">
              <Sparkles className="h-3 w-3" strokeWidth={2.2} />
            </span>
            <p className="text-[12px] font-semibold text-brand-purple-dark">
              This week's insight
            </p>
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-brand-purple-dark/75">
            Your mood is gently lifting, but evenings still feel heavier. Work stress
            keeps surfacing — a small wind-down ritual could help.
          </p>
        </div>

        {/* Mood trend */}
        <div className="rounded-xl border border-brand-purple/10 bg-white p-4 md:col-span-3">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold text-brand-purple-dark">
              Mood trend · last 30 days
            </p>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/70 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
              <TrendingUp className="h-2.5 w-2.5" />
              Trending up
            </span>
          </div>
          <svg viewBox="0 0 100 80" className="mt-2 h-20 w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="moodArea" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#7E6BAF" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#7E6BAF" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[20, 45, 70].map((y) => (
              <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="#EFEAFE" strokeWidth="0.5" strokeDasharray="1.5 1.5" />
            ))}
            <path
              d={areaPath}
              fill="url(#moodArea)"
              style={{ opacity: pathLen, transition: "opacity 1s ease 0.8s" }}
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
                transition: "stroke-dashoffset 1.8s ease-out",
              }}
            />
            {MOOD_POINTS.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r="1.4"
                fill="#7E6BAF"
                style={{
                  opacity: pathLen,
                  transition: `opacity 0.35s ease ${0.4 + i * 0.06}s`,
                }}
              />
            ))}
          </svg>
          <div className="mt-1 flex justify-between text-[9.5px] text-brand-purple-dark/40">
            <span>Mar 18</span>
            <span>Apr 1</span>
            <span>Apr 17</span>
          </div>
        </div>
      </div>

      {/* Themes */}
      <div className="mt-3 rounded-xl border border-brand-purple/10 bg-white p-4">
        <p className="text-[12px] font-semibold text-brand-purple-dark">
          What's been coming up most
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          {THEMES.map((t, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-14 shrink-0 text-[11px] font-medium text-brand-purple-dark/80">
                {t.label}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand-purple/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-purple-accent to-brand-purple transition-all duration-[1400ms] ease-out"
                  style={{
                    width: animate ? `${t.weight}%` : "0%",
                    transitionDelay: `${i * 120}ms`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
