import { useEffect, useState } from "react";
import { Sparkles, Moon, Briefcase, BatteryLow, Waves, Users, TrendingUp, ArrowRight } from "lucide-react";

const TABS = ["Overview", "My Progress", "Share Snapshot"];

const NOTICING = [
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

// gentle wavy mood line
const MOOD_POINTS = [
  { x: 2, y: 60 }, { x: 12, y: 55 }, { x: 22, y: 58 }, { x: 32, y: 50 },
  { x: 42, y: 53 }, { x: 52, y: 46 }, { x: 62, y: 48 }, { x: 72, y: 42 },
  { x: 82, y: 44 }, { x: 92, y: 40 }, { x: 98, y: 42 },
];

export default function PassportPreview() {
  const [visibleNoticing, setVisibleNoticing] = useState(0);
  const [pathLen, setPathLen] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const cycle = () => {
      if (cancelled) return;
      setVisibleNoticing(0);
      setPathLen(0);
      NOTICING.forEach((_, i) => {
        timers.push(setTimeout(() => !cancelled && setVisibleNoticing(i + 1), 400 + i * 500));
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
    <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-[#F5F3FF] p-4 shadow-lg ring-1 ring-brand-purple/10">
      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-brand-purple/10 px-2 pb-2.5">
        {TABS.map((t, i) => (
          <div key={t} className="relative flex items-center gap-1.5">
            <span
              className={`text-[12px] ${
                i === 0
                  ? "font-semibold text-brand-purple"
                  : "text-brand-purple-dark/55"
              }`}
            >
              {t}
            </span>
            {i === 1 && <span className="h-1.5 w-1.5 rounded-full bg-brand-purple" />}
            {i === 0 && (
              <span className="absolute -bottom-2.5 left-0 right-0 h-0.5 rounded-full bg-brand-purple" />
            )}
          </div>
        ))}
      </div>

      {/* Greeting */}
      <div className="mt-4 rounded-2xl bg-gradient-to-br from-brand-purple/80 to-brand-purple px-5 py-4 text-white">
        <p className="text-[15px] font-semibold leading-tight">
          Good morning, Maria <span className="ml-0.5">👋</span>
        </p>
        <p className="mt-0.5 text-[11.5px] text-white/80">Friday, April 17, 2026</p>
      </div>

      {/* Here's what we're noticing */}
      <div className="mt-3 rounded-2xl bg-white p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-purple/10 text-brand-purple">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2.2} />
          </span>
          <p className="text-[13px] font-semibold text-brand-purple-dark">
            Here's what we're noticing
          </p>
        </div>
        <p className="mt-2.5 text-[12px] leading-relaxed text-brand-purple-dark/70">
          You've been feeling more drained and tense, especially around work and
          evenings. There are also small signs things are starting to shift.
        </p>
        <div className="mt-3 flex flex-col gap-1.5">
          {NOTICING.map((it, i) => {
            const Icon = it.icon;
            const shown = i < visibleNoticing;
            return (
              <div
                key={i}
                className="flex items-center gap-2.5 rounded-xl bg-brand-purple/[0.04] px-3 py-2 transition-all duration-500"
                style={{
                  opacity: shown ? 1 : 0,
                  transform: shown ? "translateY(0)" : "translateY(6px)",
                }}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-purple/10 text-brand-purple">
                  <Icon className="h-3 w-3" strokeWidth={2.2} />
                </span>
                <span className="text-[12px] text-brand-purple-dark/80">{it.text}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[10.5px] text-brand-purple-dark/45">
          Based on your recent check-ins
        </p>
      </div>

      {/* Log today's mood */}
      <div className="mt-3 flex items-center justify-between rounded-2xl bg-brand-purple/[0.08] px-4 py-3">
        <div>
          <p className="text-[12.5px] font-semibold text-brand-purple-dark">
            Log today's mood
          </p>
          <p className="mt-0.5 text-[11px] text-brand-purple-dark/55">
            Last check-in was 2 days ago
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-purple px-3 py-1.5 text-[11.5px] font-semibold text-white">
          Start
          <ArrowRight className="h-3 w-3" />
        </span>
      </div>

      {/* Patterns we're seeing */}
      <div className="mt-3 rounded-2xl bg-white p-4">
        <p className="text-[13px] font-semibold text-brand-purple-dark">
          Patterns we're seeing
        </p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-brand-purple-dark/60">
          These are the things that have been coming up most in your recent
          check-ins and conversations.
        </p>
        <div className="mt-3 flex flex-col gap-1.5">
          {PATTERNS.map((p, i) => {
            const Icon = p.icon;
            return (
              <div key={i} className="flex items-center gap-2.5 px-1">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-purple/10 text-brand-purple">
                  <Icon className="h-3 w-3" strokeWidth={2.2} />
                </span>
                <span className="text-[12px] text-brand-purple-dark/80">
                  You've mentioned <span className="font-semibold">{p.label}</span>{" "}
                  often{" "}
                  <span className="text-brand-purple-dark/45">({p.count})</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mood This Month */}
      <div className="mt-3 rounded-2xl bg-white p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[12.5px] font-semibold text-brand-purple-dark">
              Mood This Month
            </p>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-brand-purple-dark">3.4</span>
              <span className="text-[11px] text-brand-purple-dark/40">/ 5</span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/70 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
            <TrendingUp className="h-2.5 w-2.5" />
            Up from 2.8
          </span>
        </div>
        <svg viewBox="0 0 100 80" className="mt-2 h-20 w-full" preserveAspectRatio="none">
          {[20, 45, 70].map((y) => (
            <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="#EFEAFE" strokeWidth="0.4" strokeDasharray="1.5 1.5" />
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
              transition: "stroke-dashoffset 1.8s ease-out",
            }}
          />
        </svg>
        <div className="mt-1 flex justify-between text-[9.5px] text-brand-purple-dark/40">
          <span>Mar 1</span><span>Mar 13</span><span>Mar 25</span><span>Apr 10</span>
        </div>
      </div>
    </div>
  );
}
