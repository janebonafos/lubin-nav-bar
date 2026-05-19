import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Leaf,
  Smile,
  Moon,
  Waves,
  Wind,
  CloudDrizzle,
  MessageCircle,
  LifeBuoy,
  BookmarkCheck,
  LucideIcon,
} from "lucide-react";

type MoodKey = "calm" | "okay" | "drained" | "stressed" | "anxious" | "low";

const MOODS: { key: MoodKey; label: string; Icon: LucideIcon }[] = [
  { key: "calm", label: "Calm", Icon: Leaf },
  { key: "okay", label: "Okay", Icon: Smile },
  { key: "drained", label: "Drained", Icon: Moon },
  { key: "stressed", label: "Stressed", Icon: Waves },
  { key: "anxious", label: "Anxious", Icon: Wind },
  { key: "low", label: "Low", Icon: CloudDrizzle },
];

const INTENSITY: Record<MoodKey, { question: string; options: { emoji: string; label: string }[] }> = {
  calm: {
    question: "How calm are you feeling?",
    options: [
      { emoji: "🌿", label: "Quietly calm" },
      { emoji: "😌", label: "Gently calm" },
      { emoji: "🧘", label: "Peacefully calm" },
      { emoji: "☁️", label: "Deeply calm" },
      { emoji: "🕊️", label: "Completely at ease" },
    ],
  },
  okay: {
    question: "How okay are you feeling?",
    options: [
      { emoji: "🙂", label: "Just about okay" },
      { emoji: "😊", label: "Mostly okay" },
      { emoji: "😀", label: "Fairly okay" },
      { emoji: "😄", label: "Solidly okay" },
      { emoji: "🤗", label: "Genuinely okay" },
    ],
  },
  drained: {
    question: "How drained are you feeling?",
    options: [
      { emoji: "😪", label: "A little tired" },
      { emoji: "😴", label: "Noticeably low" },
      { emoji: "🥱", label: "Running on empty" },
      { emoji: "😮‍💨", label: "Very drained" },
      { emoji: "🪫", label: "Completely exhausted" },
    ],
  },
  stressed: {
    question: "How stressed are you feeling?",
    options: [
      { emoji: "😬", label: "Slightly on edge" },
      { emoji: "😖", label: "Noticeably tense" },
      { emoji: "😣", label: "Moderately stressed" },
      { emoji: "😫", label: "Quite overwhelmed" },
      { emoji: "🤯", label: "Extremely stressed" },
    ],
  },
  anxious: {
    question: "How anxious are you feeling?",
    options: [
      { emoji: "😟", label: "A little uneasy" },
      { emoji: "😕", label: "Somewhat anxious" },
      { emoji: "😨", label: "Quite anxious" },
      { emoji: "😰", label: "Very anxious" },
      { emoji: "😱", label: "Intensely anxious" },
    ],
  },
  low: {
    question: "How low are you feeling?",
    options: [
      { emoji: "🙁", label: "Slightly low" },
      { emoji: "😔", label: "Noticeably low" },
      { emoji: "😞", label: "Feeling low" },
      { emoji: "😢", label: "Very low" },
      { emoji: "💔", label: "Deeply low" },
    ],
  },
};

const MOOD_TOPICS: Record<MoodKey, string[]> = {
  calm: ["Rest", "Nature", "Mindfulness", "Gratitude"],
  okay: ["Routine", "Balance", "Connection", "Small wins"],
  drained: ["Burnout", "Sleep loss", "Overwork", "Recovery"],
  stressed: ["Deadlines", "Pressure", "Conflict", "Overwhelm"],
  anxious: ["Worry", "Uncertainty", "Future", "Racing thoughts"],
  low: ["Loneliness", "Grief", "Self-esteem", "Motivation"],
};

const UNIVERSAL_TOPICS = ["Sleep", "Work", "Relationships", "Family", "Health", "Money", "Energy"];

const SUMMARY: Record<MoodKey, string> = {
  calm: "You seem grounded and steady today.",
  okay: "You seem to be holding things in balance today.",
  drained: "You seem a bit mentally drained and under pressure right now.",
  stressed: "There's a lot on your plate — it sounds like today has felt heavy.",
  anxious: "You seem a bit on edge. Your mind has been working hard today.",
  low: "Today has felt a little heavier. That's okay to notice.",
};

export default function CheckInFlow({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [mood, setMood] = useState<MoodKey | null>(null);
  const [intensityIdx, setIntensityIdx] = useState<number | null>(null);
  const [topics, setTopics] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const go = (next: 1 | 2 | 3) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const pickMood = (m: MoodKey) => {
    setMood(m);
    setIntensityIdx(null);
    setTopics([]);
    go(2);
  };

  const toggleTopic = (t: string) =>
    setTopics((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const summarySentence = useMemo(() => {
    const base = mood ? SUMMARY[mood] : "Thanks for taking a moment to notice how today has been.";
    if (topics.length === 1 || topics.length === 2) {
      const tail = topics.map((t) => t.toLowerCase()).join(" and ");
      return base.replace(/\.$/, "") + `, especially around ${tail}.`;
    }
    return base;
  }, [mood, topics]);

  return (
    <div className="relative mx-auto w-full max-w-[640px] py-4">
      <button
        onClick={onClose}
        className="absolute right-0 top-0 inline-flex h-9 w-9 items-center justify-center rounded-full text-brand-purple-dark/60 transition hover:bg-white/60 hover:text-brand-purple-dark"
        aria-label="Close check-in"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="flex items-center justify-center gap-2 pt-2">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={`h-2 w-2 rounded-full transition-colors ${
              n === step ? "bg-brand-purple-dark" : "bg-brand-purple/25"
            }`}
          />
        ))}
      </div>

      <div className="mt-8 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: 16 * direction }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 * direction }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {step === 1 && <Step1 onPick={pickMood} />}
            {step === 2 && mood && (
              <Step2
                mood={mood}
                intensityIdx={intensityIdx}
                setIntensityIdx={setIntensityIdx}
                topics={topics}
                toggleTopic={toggleTopic}
                note={note}
                setNote={setNote}
                onBack={() => go(1)}
                onContinue={() => go(3)}
              />
            )}
            {step === 3 && <Step3 summary={summarySentence} onClose={onClose} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-10 text-center">
        <button
          onClick={onClose}
          className="text-sm text-brand-purple-dark/55 transition hover:text-brand-purple-dark"
        >
          Skip for now →
        </button>
      </div>
    </div>
  );
}

function Step1({ onPick }: { onPick: (m: MoodKey) => void }) {
  return (
    <div>
      <h1 className="text-center text-3xl font-semibold text-brand-purple-dark">
        How are you feeling today?
      </h1>
      <p className="mt-3 text-center text-sm text-brand-purple-dark/60">
        Pick what feels closest. There's no wrong answer.
      </p>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {MOODS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => onPick(key)}
            className="flex items-center gap-3 rounded-2xl border border-brand-purple/10 bg-white px-4 py-3.5 text-left text-sm font-semibold text-brand-purple-dark shadow-[0_2px_6px_-2px_rgba(126,107,175,0.15)] transition hover:border-brand-purple/60 hover:ring-2 hover:ring-brand-purple/30 hover:shadow-md"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-purple/12">
              <Icon className="h-[18px] w-[18px] text-brand-purple" strokeWidth={2} />
            </span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Step2({
  mood,
  intensityIdx,
  setIntensityIdx,
  topics,
  toggleTopic,
  note,
  setNote,
  onBack,
  onContinue,
}: {
  mood: MoodKey;
  intensityIdx: number | null;
  setIntensityIdx: (i: number) => void;
  topics: string[];
  toggleTopic: (t: string) => void;
  note: string;
  setNote: (s: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const { question, options } = INTENSITY[mood];
  const chips = [...MOOD_TOPICS[mood], ...UNIVERSAL_TOPICS];

  return (
    <div className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_-30px_rgba(126,107,175,0.35)] ring-1 ring-brand-purple/10 md:p-8">
      <section>
        <h2 className="text-lg font-semibold text-brand-purple-dark">{question}</h2>
        <div className="mt-5 flex items-start justify-between gap-2">
          {options.map((opt, i) => {
            const selected = intensityIdx === i;
            return (
              <button
                key={i}
                onClick={() => setIntensityIdx(i)}
                className="flex flex-1 flex-col items-center gap-2"
              >
                <span
                  className={`text-3xl transition-transform duration-200 ${
                    selected ? "scale-125" : "scale-100 opacity-50"
                  }`}
                >
                  {opt.emoji}
                </span>
                {selected && (
                  <span className="text-center text-xs font-medium text-brand-purple-dark">
                    {opt.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <div className="my-7 h-px bg-brand-purple/10" />

      <section>
        <h2 className="text-lg font-semibold text-brand-purple-dark">
          What's behind this feeling?
        </h2>
        <p className="mt-1 text-sm text-brand-purple-dark/60">
          Choose anything that feels relevant.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {chips.map((t) => {
            const on = topics.includes(t);
            return (
              <button
                key={t}
                onClick={() => toggleTopic(t)}
                className={`rounded-full px-3.5 py-1.5 text-sm transition ${
                  on
                    ? "bg-brand-purple/15 text-brand-purple-dark"
                    : "border border-brand-purple/15 bg-white text-brand-purple-dark/75 hover:border-brand-purple/30"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </section>

      <div className="my-7 h-px bg-brand-purple/10" />

      <section>
        <h2 className="text-lg font-semibold text-brand-purple-dark">
          Anything else you want to share?
        </h2>
        <textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Feel free to add anything else that's on your mind…"
          className="mt-3 w-full resize-none rounded-2xl border border-brand-purple/15 bg-white px-4 py-3 text-sm text-brand-purple-dark placeholder:text-brand-purple-dark/40 focus:border-brand-purple/40 focus:outline-none focus:ring-2 focus:ring-brand-purple/15"
        />
      </section>

      <div className="mt-7 flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-sm text-brand-purple-dark/60 transition hover:text-brand-purple-dark"
        >
          ← Back
        </button>
        <button
          onClick={onContinue}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(126,107,175,0.55)] transition hover:-translate-y-0.5 hover:bg-brand-purple-dark hover:shadow-[0_12px_24px_-8px_rgba(61,46,107,0.55)]"
        >
          Continue <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  );
}

function Step3({ summary, onClose }: { summary: string; onClose: () => void }) {
  const cards: { Icon: LucideIcon; heading: string; body: string; to?: string; onClick?: () => void }[] = [
    {
      Icon: MessageCircle,
      heading: "Talk this through with Lubin",
      body: "Pick this up in chat — Lubin already has context.",
      to: "/chat",
    },
    {
      Icon: LifeBuoy,
      heading: "Get support",
      body: "See resources and ways to connect with a professional.",
      to: "/resources",
    },
    {
      Icon: BookmarkCheck,
      heading: "Save to passport",
      body: "Keep this private and finish up.",
      onClick: onClose,
    },
  ];

  return (
    <div className="py-6">
      <motion.p
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="mx-auto max-w-[560px] text-center text-3xl font-medium leading-snug text-brand-purple-dark"
      >
        {summary}
      </motion.p>

      <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
        {cards.map(({ Icon, heading, body, to, onClick }) => {
          const className =
            "group flex flex-col rounded-2xl border border-transparent bg-white p-5 text-left shadow-[0_10px_30px_-20px_rgba(126,107,175,0.4)] transition duration-200 hover:scale-[1.02] hover:border-brand-purple/30";
          const inner = (
            <>
              <Icon className="h-6 w-6 text-brand-purple" strokeWidth={1.9} />
              <p className="mt-3 text-sm font-semibold text-brand-purple-dark">{heading}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-brand-purple-dark/60">{body}</p>
            </>
          );
          if (to) {
            return (
              <Link key={heading} to={to} className={className}>
                {inner}
              </Link>
            );
          }
          return (
            <button key={heading} onClick={onClick} className={className}>
              {inner}
            </button>
          );
        })}
      </div>
    </div>
  );
}