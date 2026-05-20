import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sun, Minus, CloudRain } from "lucide-react";
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

type Stage = "intro" | "steps" | "done";

const FEEDBACK_OPTIONS = [
  {
    key: "better",
    label: "A little better",
    Icon: Sun,
    classes: "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100",
  },
  {
    key: "same",
    label: "About the same",
    Icon: Minus,
    classes: "bg-slate-50 text-slate-700 ring-slate-200 hover:bg-slate-100",
  },
  {
    key: "heavier",
    label: "Heavier than before",
    Icon: CloudRain,
    classes: "bg-orange-50 text-orange-700 ring-orange-200 hover:bg-orange-100",
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
  const [stage, setStage] = useState<Stage>("intro");
  const [rated, setRated] = useState<string | null>(null);

  // Reset when opened or mood changes
  useEffect(() => {
    if (open) {
      setIdx(0);
      setStage("intro");
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
          className="fixed inset-0 z-50 overflow-y-auto bg-brand-lavender/95 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Something that might help"
        >
          {/* Sticky close */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="sticky top-4 z-10 ml-auto mr-4 mt-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-brand-purple-dark shadow-sm ring-1 ring-brand-purple/15 backdrop-blur-sm transition hover:bg-white hover:-translate-y-0.5"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="mx-auto w-full max-w-[560px] px-6 pb-16 pt-2">
            <AnimatePresence mode="wait">
              {stage === "intro" && (
                <motion.div
                  key="intro"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="flex flex-col items-center text-center"
                >
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-purple-dark/45">
                    Something that might help
                  </p>
                  <h2 className="mt-4 text-3xl font-medium tracking-tight text-brand-purple-dark">
                    {intervention.name}
                  </h2>
                  <p className="mt-2 text-sm text-brand-purple-dark/55">
                    Takes about {intervention.duration} minute
                    {intervention.duration === 1 ? "" : "s"}
                  </p>
                  <p className="mt-6 max-w-[440px] text-base leading-relaxed text-brand-purple-dark/80">
                    {intervention.blurb}
                  </p>
                  <button
                    type="button"
                    onClick={() => setStage("steps")}
                    className="group mt-10 inline-flex w-full max-w-[280px] items-center justify-center gap-1.5 rounded-full bg-brand-purple-dark px-6 py-3.5 text-sm font-semibold text-white shadow-[0_6px_18px_-8px_rgba(91,71,160,0.55)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-brand-purple"
                  >
                    Begin
                    <span
                      aria-hidden
                      className="transition-transform duration-200 group-hover:translate-x-0.5"
                    >
                      →
                    </span>
                  </button>
                  {list.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setIdx((i) => (i + 1) % list.length)}
                      className="mt-5 text-sm text-brand-purple-dark/55 underline-offset-4 transition hover:text-brand-purple-dark hover:underline"
                    >
                      Try a different one
                    </button>
                  )}
                </motion.div>
              )}

              {stage === "steps" && (
                <motion.div
                  key="steps"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  <p className="text-center text-sm font-semibold text-brand-purple-dark/70">
                    {intervention.name}
                  </p>
                  <ol className="mt-8 space-y-6">
                    {intervention.steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-4">
                        <span className="mt-0.5 inline-flex h-7 w-7 flex-none items-center justify-center rounded-full bg-brand-purple/15 text-sm font-semibold text-brand-purple-dark">
                          {i + 1}
                        </span>
                        <p className="text-base leading-relaxed text-brand-purple-dark">
                          {step}
                        </p>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-12 flex flex-col items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setStage("done")}
                      className="inline-flex w-full items-center justify-center rounded-full bg-brand-purple-dark px-6 py-3.5 text-sm font-semibold text-white shadow-[0_6px_18px_-8px_rgba(91,71,160,0.55)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-brand-purple"
                    >
                      Done
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="text-sm text-brand-purple-dark/55 underline-offset-4 transition hover:text-brand-purple-dark hover:underline"
                    >
                      Close
                    </button>
                  </div>
                </motion.div>
              )}

              {stage === "done" && (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="flex flex-col items-center text-center"
                >
                  {!rated ? (
                    <>
                      <p className="text-sm font-medium text-brand-purple-dark/55">
                        How does that feel?
                      </p>
                      <div className="mt-8 flex w-full flex-col gap-3">
                        {FEEDBACK_OPTIONS.map(({ key, label, Icon, classes }) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setRated(key)}
                            className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium ring-1 transition-all duration-200 ease-out hover:-translate-y-0.5 ${classes}`}
                          >
                            <Icon className="h-4 w-4" />
                            {label}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-base leading-relaxed text-brand-purple-dark">
                        Thanks for taking that moment with yourself.
                      </p>
                      <div className="mt-10 flex w-full flex-col gap-3">
                        <button
                          type="button"
                          onClick={onClose}
                          className="inline-flex w-full items-center justify-center rounded-full bg-brand-purple-dark px-6 py-3.5 text-sm font-semibold text-white shadow-[0_6px_18px_-8px_rgba(91,71,160,0.55)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-brand-purple"
                        >
                          Done
                        </button>
                        <Link
                          to="/chat"
                          onClick={onClose}
                          className="group inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-brand-purple-dark no-underline ring-1 ring-brand-purple/15 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:ring-brand-purple/30"
                        >
                          Talk to Lubin
                          <span
                            aria-hidden
                            className="transition-transform duration-200 group-hover:translate-x-0.5"
                          >
                            →
                          </span>
                        </Link>
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}