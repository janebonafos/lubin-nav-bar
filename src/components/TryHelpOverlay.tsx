import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Sun,
  Minus,
  CloudRain,
  Wind,
  Sparkles,
  Heart,
  Leaf,
  Moon,
  Hand,
  Feather,
  MessageCircle,
  Eye,
  Clock,
  Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MoodKey } from "@/components/CheckInFlow";

type Intervention = {
  id: string;
  name: string;
  duration: number;
  blurb: string;
  steps: string[];
  Icon: LucideIcon;
};

const LIBRARY: Record<MoodKey, Intervention[]> = {
  calm: [
    {
      id: "savor",
      name: "Savor the moment",
      duration: 1,
      blurb: "Sit with what's already feeling good — let it land more fully.",
      Icon: Sparkles,
      steps: [
        "Notice three things around you that feel good right now.",
        "Spend a moment with each one.",
        "Set the feeling in your memory.",
      ],
    },
    {
      id: "gratitude",
      name: "Gratitude pause",
      duration: 1,
      blurb: "Three small things going well today.",
      Icon: Heart,
      steps: [
        "Bring to mind three small things — a warm drink, a kind message, a small win.",
        "Hold each one for a few breaths.",
        "Notice the steadiness that comes from paying attention.",
      ],
    },
  ],
  okay: [
    {
      id: "body-scan",
      name: "Quick body scan",
      duration: 1,
      blurb: "A short pause to feel where you are right now.",
      Icon: Leaf,
      steps: [
        "Sit comfortably. Let your shoulders drop.",
        "Notice your feet on the floor.",
        "Notice your breath without changing it.",
        "Stay here as long as feels right.",
      ],
    },
    {
      id: "tiny-intention",
      name: "Tiny intention",
      duration: 1,
      blurb: "One quiet quality for the rest of your day.",
      Icon: Feather,
      steps: [
        "Think of one quality for the rest of your day.",
        "Not a goal — just a quality. Calm. Curiosity. Patience.",
        "Hold it lightly. Return to it when you remember.",
      ],
    },
  ],
  drained: [
    {
      id: "rest",
      name: "Permission to rest",
      duration: 1,
      blurb: "A small reminder that rest doesn't have to be earned.",
      Icon: Moon,
      steps: [
        "Pause. Notice you're tired.",
        "Rest doesn't have to be earned.",
        "Imagine what real rest would feel like right now.",
        "If you can give it to yourself, even ten minutes, do.",
      ],
    },
    {
      id: "set-down",
      name: "Set something down",
      duration: 1,
      blurb: "Pick one thing you're carrying — put it down for now.",
      Icon: Hand,
      steps: [
        "Bring to mind everything you're holding.",
        "Pick one thing that doesn't need to be carried today.",
        "Mentally set it down.",
        "Notice the difference, even slightly.",
      ],
    },
  ],
  stressed: [
    {
      id: "4-7-8",
      name: "4-7-8 breath",
      duration: 2,
      blurb: "A breath pattern that gently calms the body.",
      Icon: Wind,
      steps: [
        "Find a comfortable position.",
        "Inhale through your nose for 4.",
        "Hold for 7.",
        "Exhale through your mouth for 8.",
        "Repeat two more times.",
      ],
    },
    {
      id: "brain-dump",
      name: "Brain dump",
      duration: 2,
      blurb: "Empty out what's spinning in your head onto a page.",
      Icon: Feather,
      steps: [
        "Write down everything spinning in your head.",
        "Don't organize it. Just empty it out.",
        "Read it once.",
        "Pick one thing for today. Let the rest wait.",
      ],
    },
  ],
  anxious: [
    {
      id: "5-4-3-2-1",
      name: "5-4-3-2-1 grounding",
      duration: 2,
      blurb: "A sensory grounding to bring you back to the present.",
      Icon: Eye,
      steps: [
        "Name 5 things you can see.",
        "Name 4 things you can hear.",
        "Name 3 things you can touch.",
        "Name 2 things you can smell.",
        "Name 1 thing you can taste.",
      ],
    },
    {
      id: "box-breath",
      name: "Box breath",
      duration: 1,
      blurb: "A steady breath pattern to slow racing thoughts.",
      Icon: Wind,
      steps: [
        "Inhale slowly for 4.",
        "Hold for 4.",
        "Exhale slowly for 4.",
        "Hold for 4.",
        "Repeat as long as it helps.",
      ],
    },
  ],
  low: [
    {
      id: "kindness",
      name: "One small kindness",
      duration: 1,
      blurb: "One small thing you could give yourself right now.",
      Icon: Heart,
      steps: [
        "Bring to mind one small kindness for yourself.",
        "A warm drink. A few minutes of music. Resting your eyes.",
        "Choose just one.",
        "Give it to yourself.",
      ],
    },
    {
      id: "reach-out",
      name: "Reach out",
      duration: 1,
      blurb: "A small bridge to someone you trust.",
      Icon: MessageCircle,
      steps: [
        "Think of one person you trust.",
        "You don't need to explain anything heavy.",
        "Send something simple — \u201cthinking of you.\u201d",
        "Letting someone in counts, even when it's small.",
      ],
    },
  ],
};

const FEEDBACK_OPTIONS = [
  { key: "better", label: "A little better", Icon: Sun, iconClass: "text-emerald-500" },
  { key: "same", label: "About the same", Icon: Minus, iconClass: "text-brand-purple/60" },
  { key: "heavier", label: "Heavier", Icon: CloudRain, iconClass: "text-amber-500" },
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

  useEffect(() => {
    if (open) {
      setIdx(0);
      setRated(null);
    }
  }, [open, mood]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

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
            className="fixed top-6 right-6 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-brand-purple-dark/70 ring-1 ring-brand-purple/10 backdrop-blur-md transition hover:bg-white hover:text-brand-purple-dark"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>

          <div className="relative mx-auto w-full max-w-[560px] px-5 pb-24 pt-16 sm:pt-20">
            {/* Picker — visible options for this mood */}
            {list.length > 1 && (
              <div className="mb-10">
                <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-brand-purple-dark/45">
                  Choose what feels right
                </p>
                <div className="flex flex-wrap justify-center gap-2.5">
                  {list.map((item, i) => {
                    const ItemIcon = item.Icon;
                    const active = i === idx;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setIdx(i);
                          setRated(null);
                        }}
                        className={`group inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-200 ease-out ${
                          active
                            ? "bg-brand-purple-dark text-white shadow-[0_8px_22px_-10px_rgba(61,46,107,0.6)]"
                            : "bg-white/70 text-brand-purple-dark/75 ring-1 ring-brand-purple/15 backdrop-blur-sm hover:-translate-y-0.5 hover:bg-white"
                        }`}
                      >
                        <ItemIcon
                          className={`h-4 w-4 ${active ? "text-white" : "text-brand-purple/70"}`}
                          strokeWidth={1.8}
                        />
                        {item.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <motion.div
              key={`${mood}-${idx}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              {/* Header with big icon */}
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-[0_18px_40px_-20px_rgba(91,71,160,0.45)] ring-1 ring-brand-purple/15"
                >
                  <intervention.Icon
                    className="h-9 w-9 text-brand-purple-dark"
                    strokeWidth={1.5}
                  />
                </motion.div>

                <h2 className="mt-7 text-[2.25rem] font-light leading-[1.1] tracking-tight text-brand-purple-dark">
                  {intervention.name}
                </h2>

                <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-brand-purple-dark/55 ring-1 ring-brand-purple/10">
                  <Clock className="h-3 w-3" strokeWidth={2} />
                  About {intervention.duration} min
                </div>

                <p className="mx-auto mt-6 max-w-[380px] text-[16px] leading-[1.6] text-brand-purple-dark/75">
                  {intervention.blurb}
                </p>
              </div>

              {/* Steps as visual cards */}
              <ol className="mt-12 space-y-3">
                {intervention.steps.map((step, i) => (
                  <motion.li
                    key={`${mood}-${idx}-${i}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.35,
                      ease: "easeOut",
                      delay: 0.15 + i * 0.06,
                    }}
                    className="flex items-start gap-4 rounded-2xl bg-white/65 p-4 ring-1 ring-brand-purple/10 backdrop-blur-sm transition-colors hover:bg-white/85"
                  >
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand-purple-dark text-[13px] font-semibold text-white shadow-[0_4px_10px_-4px_rgba(61,46,107,0.5)]">
                      {i + 1}
                    </span>
                    <p className="pt-1 text-[16px] leading-[1.55] text-brand-purple-dark/85">
                      {step}
                    </p>
                  </motion.li>
                ))}
              </ol>

              {/* Feedback */}
              <div className="mt-12">
                <AnimatePresence mode="wait">
                  {!rated ? (
                    <motion.div
                      key="ask"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-purple-dark/50">
                        How does that feel?
                      </p>
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        {FEEDBACK_OPTIONS.map(({ key, label, Icon, iconClass }) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setRated(key)}
                            className="inline-flex items-center gap-2 rounded-full bg-white/75 px-4 py-2.5 text-sm font-medium text-brand-purple-dark/80 ring-1 ring-brand-purple/15 backdrop-blur-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-white"
                          >
                            <Icon className={`h-4 w-4 ${iconClass}`} strokeWidth={2} />
                            {label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="thanks"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center justify-center gap-2 text-[15px] italic text-brand-purple-dark/75"
                    >
                      <Check className="h-4 w-4 text-emerald-500" strokeWidth={2.4} />
                      Thank you for taking that moment.
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Closing actions */}
              <div className="mt-10 flex flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex w-full max-w-[280px] items-center justify-center rounded-full bg-brand-purple-dark px-6 py-4 text-sm font-medium tracking-wide text-white shadow-[0_10px_28px_-12px_rgba(61,46,107,0.55)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-brand-purple"
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