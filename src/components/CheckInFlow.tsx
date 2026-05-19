import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Leaf,
  Smile,
  Moon,
  Waves,
  Wind,
  CloudDrizzle,
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
  drained: ["Burnout", "Sleep loss", "Overwork", "Caregiving"],
  stressed: ["Deadlines", "Pressure", "Conflict", "Workload"],
  anxious: ["Uncertainty", "Future", "Big change", "Performance"],
  low: ["Loneliness", "Grief", "Self-doubt", "Stuckness"],
};

const UNIVERSAL_TOPICS = ["Sleep", "Work", "Relationships", "Family", "Health", "Money", "Energy"];

export default function CheckInFlow({ onClose }: { onClose: () => void }) {
  const [mood, setMood] = useState<MoodKey | null>(null);
  const [intensityIdx, setIntensityIdx] = useState<number | null>(null);
  const [topics, setTopics] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const pickMood = (m: MoodKey) => {
    if (mood === m) {
      setMood(null);
      setIntensityIdx(null);
      setTopics([]);
      setNote("");
      return;
    }
    setMood(m);
    setIntensityIdx(2);
    setTopics([]);
  };

  const toggleTopic = (t: string) =>
    setTopics((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  return (
    <div className="relative mx-auto w-full max-w-[640px] py-4">
      <button
        onClick={onClose}
        className="absolute right-0 top-0 inline-flex h-9 w-9 items-center justify-center rounded-full text-brand-purple-dark/60 transition hover:bg-white/60 hover:text-brand-purple-dark"
        aria-label="Close check-in"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="pt-6">
        <Step1 mood={mood} onPick={pickMood} />

        <AnimatePresence initial={false}>
          {mood && (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="mt-6"
            >
              <Step2
                mood={mood}
                intensityIdx={intensityIdx}
                setIntensityIdx={setIntensityIdx}
                topics={topics}
                toggleTopic={toggleTopic}
                note={note}
                setNote={setNote}
                onSave={onClose}
              />
            </motion.div>
          )}
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

function Step1({ mood, onPick }: { mood: MoodKey | null; onPick: (m: MoodKey) => void }) {
  return (
    <div>
      <h1 className="text-center text-3xl font-semibold text-brand-purple-dark">
        How are you feeling today?
      </h1>
      <p className="mt-3 text-center text-sm text-brand-purple-dark/60">
        Pick what feels closest. There's no wrong answer.
      </p>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {MOODS.map(({ key, label, Icon }) => {
          const active = mood === key;
          return (
            <button
              key={key}
              onClick={() => onPick(key)}
              aria-pressed={active}
              className={`group flex min-w-0 items-center gap-2.5 rounded-xl border-2 px-3 py-3 text-left transition-all duration-150 active:scale-[0.98] ${
                active
                  ? "border-[#7E6BAF] bg-[#ECE7F6] shadow-sm"
                  : "border-[#E5E7EB] bg-white hover:border-[#7E6BAF]/40 hover:bg-[#F5F1FB]"
              }`}
            >
              <span
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                  active ? "bg-[#DCD2EE]" : "bg-[#ECE7F6]"
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${active ? "text-[#4A3A7A]" : "text-[#7E6BAF]"}`}
                  strokeWidth={2.5}
                />
              </span>
              <span
                className={`flex-1 whitespace-nowrap text-[13.5px] font-semibold ${
                  active ? "text-[#4A3A7A]" : "text-[#374151]"
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
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
  onSave,
}: {
  mood: MoodKey;
  intensityIdx: number | null;
  setIntensityIdx: (i: number) => void;
  topics: string[];
  toggleTopic: (t: string) => void;
  note: string;
  setNote: (s: string) => void;
  onSave: () => void;
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

      <div className="mt-7 flex items-center justify-end">
        <button
          onClick={onSave}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(126,107,175,0.55)] transition hover:-translate-y-0.5 hover:bg-brand-purple-dark hover:shadow-[0_12px_24px_-8px_rgba(61,46,107,0.55)]"
        >
          Save check-in
        </button>
      </div>
    </div>
  );
}