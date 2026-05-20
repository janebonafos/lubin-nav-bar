import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sun, Minus, CloudRain, RefreshCw } from "lucide-react";
import type { MoodKey } from "@/components/CheckInFlow";

type Intervention = {
  name: string;
  duration: number;
  blurb: string;
  steps: string[];
};

const LIBRARY: Record<MoodKey, Intervention[]> = {
  calm: [
    {
      name: "Savor the moment",
      duration: 1,
      blurb: "Sit with what's already feeling good — let it land more fully.",
      steps: [
        "Notice three things in your surroundings that feel good right now.",
        "Spend a moment with each one — really notice it.",
        "Set the feeling in your memory. You can come back to this.",
      ],
    },
    {
      name: "Gratitude pause",
      duration: 1,
      blurb: "Bring to mind three small things going well today.",
      steps: [
        "They don't have to be big — a warm drink, a kind message, a small win.",
        "Hold each one for a few breaths.",
        "Notice the steadiness that comes with paying attention to them.",
      ],
    },
  ],
  okay: [
    {
      name: "Quick body scan",
      duration: 1,
      blurb: "A short pause to feel where you are right now.",
      steps: [
        "Sit comfortably. Let your shoulders drop.",
        "Notice your feet on the floor.",
        "Notice your breath without changing it.",
        "Notice your hands resting where they are.",
        "Stay here for as long as feels right.",
      ],
    },
    {
      name: "Tiny intention",
      duration: 1,
      blurb: "Set one quiet quality for the rest of your day.",
      steps: [
        "Think of one quality you'd like to bring to the rest of your day.",
        "Not a goal — just a quality. Calm. Curiosity. Patience.",
        "Hold it lightly. You can return to it whenever you remember.",
      ],
    },
  ],
  drained: [
    {
      name: "Permission to rest",
      duration: 1,
      blurb: "A small reminder that rest doesn't have to be earned.",
      steps: [
        "Pause for a moment. Notice you're tired.",
        "Rest doesn't have to be earned.",
        "Let yourself imagine what real rest would feel like right now.",
        "If you can give it to yourself, even for ten minutes, do.",
      ],
    },
    {
      name: "Set something down",
      duration: 1,
      blurb: "Pick one thing you're carrying — and put it down for now.",
      steps: [
        "Bring to mind everything you're holding right now.",
        "Pick one thing — even small — that doesn't need to be carried today.",
        "Mentally set it down.",
        "Notice the difference, even slightly.",
      ],
    },
  ],
  stressed: [
    {
      name: "4-7-8 breath",
      duration: 2,
      blurb: "A breath pattern that gently activates the body's calming response.",
      steps: [
        "Find a comfortable position.",
        "Inhale through your nose for 4 counts.",
        "Hold for 7 counts.",
        "Exhale slowly through your mouth for 8 counts.",
        "Repeat two more times.",
      ],
    },
    {
      name: "Brain dump",
      duration: 2,
      blurb: "Empty out what's spinning in your head onto a page.",
      steps: [
        "Take a minute to write down everything spinning in your head.",
        "Don't organize it. Just empty it out.",
        "When you stop, read it once.",
        "Pick one thing that's actually for today. Let the rest wait.",
      ],
    },
  ],
  anxious: [
    {
      name: "5-4-3-2-1 grounding",
      duration: 2,
      blurb: "A classic sensory grounding exercise to bring you back to the present.",
      steps: [
        "Name 5 things you can see.",
        "Name 4 things you can hear.",
        "Name 3 things you can touch.",
        "Name 2 things you can smell.",
        "Name 1 thing you can taste.",
      ],
    },
    {
      name: "Box breath",
      duration: 1,
      blurb: "A steady breath pattern to slow racing thoughts.",
      steps: [
        "Inhale slowly for 4 counts.",
        "Hold for 4 counts.",
        "Exhale slowly for 4 counts.",
        "Hold for 4 counts.",
        "Repeat as long as it helps.",
      ],
    },
  ],
  low: [
    {
      name: "One small kindness",
      duration: 1,
      blurb: "Choose one small thing you could give yourself right now.",
      steps: [
        "Bring to mind one small kindness you could give yourself right now.",
        "A warm drink. A few minutes of music. Resting your eyes.",
        "Choose just one.",
        "Give it to yourself.",
      ],
    },
    {
      name: "Reach out",
      duration: 1,
      blurb: "A small bridge to someone you trust — no need to explain.",
      steps: [
        "Think of one person you trust.",
        "You don't need to explain anything heavy.",
        "Send a simple message — \u201cthinking of you,\u201d or anything that feels natural.",
        "Letting someone in counts, even when it's small.",
      ],
    },
  ],
};

const FEEDBACK_OPTIONS = [
  {
    key: "better",
    label: "A little better",
    Icon: Sun,
    classes:
      "bg-emerald-50/80 text-emerald-700 ring-emerald-200/70 hover:bg-emerald-100",
    activeClasses:
      "bg-emerald-100 text-emerald-800 ring-emerald-300 shadow-[0_6px_18px_-10px_rgba(16,185,129,0.5)]",
  },
  {
    key: "same",
    label: "About the same",
    Icon: Minus,
    classes:
      "bg-slate-50/80 text-slate-700 ring-slate-200/70 hover:bg-slate-100",
    activeClasses:
      "bg-slate-100 text-slate-800 ring-slate-300 shadow-[0_6px_18px_-10px_rgba(100,116,139,0.45)]",
  },
  {
    key: "heavier",
    label: "Heavier than before",
    Icon: CloudRain,
    classes:
      "bg-orange-50/80 text-orange-700 ring-orange-200/70 hover:bg-orange-100",
    activeClasses:
      "bg-orange-100 text-orange-800 ring-orange-300 shadow-[0_6px_18px_-10px_rgba(249,115,22,0.45)]",
  },
] as const;

export default function TryHelpOverlay({
  open,
  mood,
  onClose,
}: {
  open: boolean;
  mood: MoodKey | null;
  onClose: () => void;
}) {
  const list = useMemo(() => (mood ? LIBRARY[mood] : []), [mood]);
  const [idx, setIdx] = useState(0);
  const [rated, setRated] = useState<string | null>(null);

  // Reset when opened or mood changes
  useEffect(() => {
    if (open) {
      setIdx(0);
      setRated(null);
    }
  }, [open, mood]);

  // Lock background scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Escape closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const intervention = list[idx];

  return (
    <AnimatePresence>
      {open && intervention && (
        <motion.div
          key="try-help-overlay"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-50 overflow-y-auto bg-gradient-to-b from-brand-lavender via-brand-lavender/90 to-white"
          role="dialog"
          aria-modal="true"
          aria-label="Something that might help"
        >
          {/* Decorative orbs */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-brand-purple/15 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute top-1/3 -left-32 h-80 w-80 rounded-full bg-brand-purple-accent/25 blur-3xl"
          />

          {/* Sticky close */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="fixed top-5 right-5 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-brand-purple-dark ring-1 ring-brand-purple/15 backdrop-blur-sm transition hover:bg-white hover:-translate-y-0.5"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative mx-auto w-full max-w-[560px] px-6 pb-20 pt-16">
            <motion.div
              key={`${mood}-${idx}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {/* Header */}
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-purple/70">
                  Something that might help
                </p>
                <h2 className="mt-4 text-[2rem] font-medium leading-tight tracking-tight text-brand-purple-dark">
                  {intervention.name}
                </h2>
                <p className="mt-3 text-sm text-brand-purple-dark/55">
                  About {intervention.duration} minute
                  {intervention.duration === 1 ? "" : "s"} · read at your own pace
                </p>
                <p className="mx-auto mt-6 max-w-[440px] text-base leading-relaxed text-brand-purple-dark/75">
                  {intervention.blurb}
                </p>
                {list.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setIdx((i) => (i + 1) % list.length)}
                    className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1.5 text-xs font-medium text-brand-purple-dark/65 ring-1 ring-brand-purple/10 backdrop-blur-sm transition hover:bg-white hover:text-brand-purple-dark"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Try a different one
                  </button>
                )}
              </div>

              {/* Steps */}
              <ol className="mt-12 space-y-5">
                {intervention.steps.map((step, i) => (
                  <motion.li
                    key={`${mood}-${idx}-${i}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.35,
                      ease: "easeOut",
                      delay: 0.15 + i * 0.06,
                    }}
                    className="flex items-start gap-4 rounded-2xl bg-white/55 px-5 py-4 ring-1 ring-brand-purple/10 backdrop-blur-sm"
                  >
                    <span className="mt-0.5 inline-flex h-7 w-7 flex-none items-center justify-center rounded-full bg-brand-purple/15 text-sm font-semibold text-brand-purple-dark">
                      {i + 1}
                    </span>
                    <p className="text-[15px] leading-relaxed text-brand-purple-dark">
                      {step}
                    </p>
                  </motion.li>
                ))}
              </ol>

              {/* Gentle feedback (optional, inline) */}
              <div className="mt-12 rounded-3xl bg-white/65 p-6 ring-1 ring-brand-purple/10 backdrop-blur-sm">
                <AnimatePresence mode="wait">
                  {!rated ? (
                    <motion.div
                      key="ask"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <p className="text-center text-sm font-medium text-brand-purple-dark/70">
                        How does that feel? <span className="font-normal text-brand-purple-dark/40">(optional)</span>
                      </p>
                      <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:gap-2">
                        {FEEDBACK_OPTIONS.map(({ key, label, Icon, classes }) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setRated(key)}
                            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium ring-1 transition-all duration-200 ease-out hover:-translate-y-0.5 ${classes}`}
                          >
                            <Icon className="h-4 w-4" />
                            {label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.p
                      key="thanks"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-center text-[15px] leading-relaxed text-brand-purple-dark"
                    >
                      Thanks for taking that moment with yourself. 💜
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Closing actions */}
              <div className="mt-8 flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="group inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-brand-purple-dark px-6 py-3.5 text-sm font-semibold text-white shadow-[0_8px_22px_-10px_rgba(91,71,160,0.6)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-brand-purple"
                >
                  I'm done
                </button>
                <Link
                  to="/chat"
                  onClick={onClose}
                  className="group inline-flex items-center gap-1.5 text-sm font-medium text-brand-purple no-underline transition hover:text-brand-purple-dark"
                >
                  Or talk it through with Lubin
                  <span
                    aria-hidden
                    className="transition-transform duration-200 group-hover:translate-x-0.5"
                  >
                    →
                  </span>
                </Link>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}