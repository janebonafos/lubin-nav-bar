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
    iconClass: "text-emerald-500",
  },
  {
    key: "same",
    label: "About the same",
    Icon: Minus,
    iconClass: "text-brand-purple/60",
  },
  {
    key: "heavier",
    label: "Heavier than before",
    Icon: CloudRain,
    iconClass: "text-amber-500",
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
          className="fixed inset-0 z-50 overflow-y-auto bg-brand-lavender"
          role="dialog"
          aria-modal="true"
          aria-label="Something that might help"
        >
          {/* Atmospheric background */}
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(168,155,208,0.45),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(255,255,255,0.9),transparent_70%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none fixed -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-white/40 blur-3xl"
          />

          {/* Sticky close */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="fixed top-6 right-6 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-brand-purple-dark/70 ring-1 ring-brand-purple/10 backdrop-blur-md transition hover:bg-white hover:text-brand-purple-dark"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>

          <div className="relative mx-auto w-full max-w-[520px] px-6 pb-24 pt-20 sm:pt-24">
            <motion.div
              key={`${mood}-${idx}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {/* Header */}
              <div className="text-center">
                <div className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-brand-purple/70">
                  <span className="h-1 w-1 rounded-full bg-brand-purple/60" />
                  A gentle practice
                  <span className="h-1 w-1 rounded-full bg-brand-purple/60" />
                </div>
                <h2 className="mt-6 text-[2.5rem] font-light leading-[1.1] tracking-tight text-brand-purple-dark">
                  {intervention.name}
                </h2>
                <div className="mx-auto mt-5 h-px w-12 bg-brand-purple/25" />
                <p className="mt-5 text-xs uppercase tracking-[0.18em] text-brand-purple-dark/45">
                  About {intervention.duration} minute
                  {intervention.duration === 1 ? "" : "s"}
                </p>
                <p className="mx-auto mt-7 max-w-[400px] text-[17px] leading-[1.7] text-brand-purple-dark/75">
                  {intervention.blurb}
                </p>
                {list.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setIdx((i) => (i + 1) % list.length)}
                    className="mt-6 inline-flex items-center gap-1.5 text-xs font-medium text-brand-purple-dark/50 transition hover:text-brand-purple-dark"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Try a different one
                  </button>
                )}
              </div>

              {/* Steps — timeline */}
              <ol className="relative mt-14 space-y-7 pl-12">
                <span
                  aria-hidden
                  className="absolute left-[14px] top-2 bottom-2 w-px bg-gradient-to-b from-brand-purple/30 via-brand-purple/15 to-transparent"
                />
                {intervention.steps.map((step, i) => (
                  <motion.li
                    key={`${mood}-${idx}-${i}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.4,
                      ease: "easeOut",
                      delay: 0.2 + i * 0.08,
                    }}
                    className="relative"
                  >
                    <span className="absolute -left-12 top-0 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-brand-purple-dark ring-1 ring-brand-purple/20 shadow-[0_2px_6px_-2px_rgba(91,71,160,0.2)]">
                      {i + 1}
                    </span>
                    <p className="text-[16px] leading-[1.7] text-brand-purple-dark/85">
                      {step}
                    </p>
                  </motion.li>
                ))}
              </ol>

              {/* Divider */}
              <div className="mx-auto mt-16 h-px w-12 bg-brand-purple/20" />

              {/* Gentle feedback (optional, inline) */}
              <div className="mt-10">
                <AnimatePresence mode="wait">
                  {!rated ? (
                    <motion.div
                      key="ask"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <p className="text-center text-xs uppercase tracking-[0.2em] text-brand-purple-dark/50">
                        How does that feel?
                      </p>
                      <div className="mt-5 flex flex-wrap justify-center gap-2">
                        {FEEDBACK_OPTIONS.map(({ key, label, Icon, iconClass }) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setRated(key)}
                            className="group inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2.5 text-sm font-medium text-brand-purple-dark/80 ring-1 ring-brand-purple/15 backdrop-blur-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-white hover:text-brand-purple-dark hover:ring-brand-purple/30"
                          >
                            <Icon className={`h-4 w-4 ${iconClass}`} strokeWidth={2} />
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
                      className="text-center text-[15px] italic leading-relaxed text-brand-purple-dark/75"
                    >
                      Thank you for taking that moment with yourself.
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Closing actions */}
              <div className="mt-12 flex flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex w-full max-w-[280px] items-center justify-center rounded-full bg-brand-purple-dark px-6 py-4 text-sm font-medium tracking-wide text-white shadow-[0_10px_28px_-12px_rgba(61,46,107,0.55)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-brand-purple hover:shadow-[0_14px_32px_-12px_rgba(91,71,160,0.55)]"
                >
                  Close this
                </button>
                <Link
                  to="/chat"
                  onClick={onClose}
                  className="group inline-flex items-center gap-1.5 text-sm text-brand-purple-dark/60 no-underline transition hover:text-brand-purple-dark"
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