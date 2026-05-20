import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Sun,
  Minus,
  CloudRain,
  Wind,
  Heart,
  Moon,
  MessageCircle,
  Compass,
  HelpCircle,
  Brain,
  Activity,
  Layers,
  Quote,
  Info,
  LifeBuoy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MoodKey } from "@/components/CheckInFlow";

type Tip = { title: string; body: string };

type Guide = {
  id: string;
  name: string;
  subtitle: string;
  Icon: LucideIcon;
  quoteHeader: string;
  whatsHappening: string;
  famousQuote: { text: string; author: string };
  tips: Tip[];
  whenToSeekHelp: string;
};

const GUIDES: Record<string, Guide> = {
  overthinking: {
    id: "overthinking",
    name: "Overthinking & racing thoughts",
    subtitle: "When your mind won't slow down",
    Icon: Brain,
    quoteHeader:
      "When your mind keeps replaying, jumping ahead, or going in circles",
    whatsHappening:
      "Your mind keeps returning to the same thoughts, replaying scenarios or worrying about what might happen. It's exhausting — and surprisingly common when stress builds up over time. This doesn't mean something is wrong with you.",
    famousQuote: {
      text: "You don't have to control your thoughts. You just have to stop letting them control you.",
      author: "Dan Millman",
    },
    tips: [
      {
        title: "Slow your breathing",
        body: "Breathe in for 4 counts, hold for 4, out for 4, hold for 4. Repeat 3–4 times. This directly calms your nervous system — it works even if it feels strange at first.",
      },
      {
        title: "Write your thoughts down",
        body: "Grab any paper or open your phone notes. Write exactly what's going through your mind without filtering. Getting thoughts out of your head reduces their intensity. You don't need to read it back.",
      },
      {
        title: "Ground yourself in the present",
        body: "Look around and name: 5 things you can see, 4 things you can physically touch, 3 sounds you can hear, 2 things you can smell, 1 thing you can taste. This interrupts overthinking by bringing you back to right now.",
      },
      {
        title: "Give your worries a time limit",
        body: "Set a timer for 15 minutes. Allow yourself to worry fully during that time — write it all down. When the timer ends, close the list and move on.",
      },
    ],
    whenToSeekHelp:
      "If racing thoughts are consistently affecting your sleep or daily functioning.",
  },
  anxiety: {
    id: "anxiety",
    name: "Anxiety & worry",
    subtitle: "When worry starts taking over",
    Icon: Activity,
    quoteHeader: "When your body stays on alert even when nothing is wrong",
    whatsHappening:
      "Anxiety often shows up as a constant sense of dread, 'what if' thinking, or physical tension. Your nervous system is trying to protect you — but sometimes it stays switched on longer than needed.",
    famousQuote: {
      text: "Nothing in the universe can stop you from letting go and having a fresh start.",
      author: "Guy Finley",
    },
    tips: [
      {
        title: "Breathe out longer than you breathe in",
        body: "In for 4 counts, out for 6–8. A longer exhale activates your body's calm response. Do this for 2 minutes.",
      },
      {
        title: "Name the worry specifically",
        body: "Instead of \u201cI'm anxious about everything,\u201d try: \u201cI'm worried that [specific thing] will happen.\u201d Naming it precisely makes it smaller.",
      },
      {
        title: "Step away from your phone",
        body: "News, social media, and notifications can quietly feed anxiety. Give yourself 30–60 minutes without checking anything.",
      },
      {
        title: "Move your body gently",
        body: "A 10-minute walk, stretching, or shaking out your hands and shoulders releases the physical tension anxiety creates.",
      },
    ],
    whenToSeekHelp:
      "If anxiety is regularly interfering with work, relationships, or daily tasks.",
  },
  "low-mood": {
    id: "low-mood",
    name: "Feeling low or unmotivated",
    subtitle: "When everything feels heavier than usual",
    Icon: Heart,
    quoteHeader: "When everything feels a little heavier than it should",
    whatsHappening:
      "Low mood can show up as tiredness, lack of interest in things you usually enjoy, or feeling emotionally flat. It doesn't always mean depression — but it does mean your mind and body need some care.",
    famousQuote: {
      text: "Even the darkest night will end and the sun will rise.",
      author: "Victor Hugo",
    },
    tips: [
      {
        title: "Start with the smallest possible thing",
        body: "Pick one tiny task: make your bed, drink a glass of water, reply to one message. Completing even a tiny thing creates momentum.",
      },
      {
        title: "Get some natural light",
        body: "Step outside for 5–10 minutes. Natural light genuinely affects brain chemistry and mood.",
      },
      {
        title: "Reach out to one person",
        body: "Send a message to someone you trust. Even \u201chey, thinking of you\u201d counts.",
      },
      {
        title: "Talk to yourself like a friend",
        body: "Notice how you're speaking to yourself. Would you say those words to someone you care about? Replace harsh self-talk with what a kind friend would say.",
      },
    ],
    whenToSeekHelp:
      "If low mood has been present most days for more than two weeks.",
  },
  stress: {
    id: "stress",
    name: "Stress & overwhelm",
    subtitle: "When demands feel like too much",
    Icon: Layers,
    quoteHeader: "When there's more coming at you than you can handle",
    whatsHappening:
      "When demands pile up faster than you can process them, stress tips into overwhelm. Your mind and body start sending signals — tension, irritability, exhaustion, difficulty concentrating. These are signs to slow down, not push harder.",
    famousQuote: {
      text: "Almost everything will work again if you unplug it for a few minutes — including you.",
      author: "Anne Lamott",
    },
    tips: [
      {
        title: "Get it all out of your head",
        body: "Write down every single thing that's stressing you. A list is far less overwhelming than holding it all in your mind. Then pick just one thing to focus on today.",
      },
      {
        title: "Pause before deciding anything",
        body: "When overwhelmed, decisions get worse. Take 5 slow breaths before responding to anything urgent.",
      },
      {
        title: "Say no to one thing today",
        body: "Find one thing you can decline, delay, or hand off. Protecting your time is necessary, not selfish.",
      },
      {
        title: "Do a body check",
        body: "Sit quietly. Notice where you're holding tension — jaw, shoulders, chest, stomach. Consciously relax each area.",
      },
    ],
    whenToSeekHelp:
      "If stress is causing persistent physical symptoms like headaches, chest tightness, or disrupted sleep.",
  },
  sleep: {
    id: "sleep",
    name: "Sleep & exhaustion",
    subtitle: "When rest feels impossible",
    Icon: Moon,
    quoteHeader: "When rest feels out of reach",
    whatsHappening:
      "Poor sleep affects everything — mood, focus, patience, and emotional resilience. It's often both a cause and a symptom of mental health struggles. If you're exhausted, your mind and body are asking for rest.",
    famousQuote: {
      text: "Sleep is the best meditation.",
      author: "Dalai Lama",
    },
    tips: [
      {
        title: "Keep the same wake-up time every day",
        body: "Even weekends. The single most effective way to improve sleep quality over time.",
      },
      {
        title: "Wind down 30 minutes before bed",
        body: "Phone away, dim the lights, do something calm. Your brain needs a signal the day is ending.",
      },
      {
        title: "Make your room as dark and cool as possible",
        body: "Body temperature needs to drop slightly to fall asleep. Even covering LED lights helps.",
      },
      {
        title: "If you can't sleep, get up briefly",
        body: "If awake for more than 20 minutes, get up, do something quiet and boring in dim light, then return when sleepy.",
      },
    ],
    whenToSeekHelp:
      "If sleep difficulties have been ongoing for more than a month and affecting daily life.",
  },
  relationships: {
    id: "relationships",
    name: "Relationships & loneliness",
    subtitle: "When connection feels hard",
    Icon: MessageCircle,
    quoteHeader: "When connection feels far away",
    whatsHappening:
      "Loneliness isn't just about being physically alone — it's about feeling unseen or disconnected. Relationship stress can be one of the heaviest things to carry, especially when it's hard to talk about.",
    famousQuote: {
      text: "The pain of loneliness is just love with nowhere to go.",
      author: "C.S. Lewis",
    },
    tips: [
      {
        title: "Send one message today",
        body: "\u201cHey, I was thinking about you\u201d is enough. Most people feel touched to be remembered.",
      },
      {
        title: "Be honest about how you're feeling",
        body: "Try: \u201cI've been feeling a bit disconnected lately.\u201d Honesty invites closeness.",
      },
      {
        title: "Allow yourself to need people",
        body: "Needing others isn't weakness. Humans are wired for connection.",
      },
      {
        title: "Protect yourself from draining relationships",
        body: "Notice how you feel after time with different people. Gentle distance from draining relationships is okay.",
      },
    ],
    whenToSeekHelp:
      "If relationship difficulties are significantly and consistently affecting your wellbeing.",
  },
  lost: {
    id: "lost",
    name: "Feeling lost or disconnected",
    subtitle: "When life loses its direction",
    Icon: Compass,
    quoteHeader: "When life loses its sense of direction or meaning",
    whatsHappening:
      "Sometimes we lose our sense of who we are or where we're going. Feeling disconnected from yourself, your purpose, or others is more common than people talk about — especially after big life changes.",
    famousQuote: {
      text: "Not all those who wander are lost.",
      author: "J.R.R. Tolkien",
    },
    tips: [
      {
        title: "Write about what used to matter to you",
        body: "Finish: \u201cI used to feel most like myself when…\u201d Just notice what comes up.",
      },
      {
        title: "Do one thing that aligns with your values",
        body: "A tiny action connected to something you care about — kindness, creativity, learning — can restore meaning.",
      },
      {
        title: "Spend time somewhere grounding",
        body: "A park, a familiar street. Just being in a real, present space helps reconnect you to yourself.",
      },
      {
        title: "Lower the pressure to 'figure it out'",
        body: "Feeling lost often comes before growth. Clarity usually comes with time and movement.",
      },
    ],
    whenToSeekHelp:
      "If feelings of disconnection or emptiness are persistent and affecting your ability to function.",
  },
  unsure: {
    id: "unsure",
    name: "Not sure what I'm feeling",
    subtitle: "When you can't quite name it",
    Icon: HelpCircle,
    quoteHeader: "When something feels off but you can't quite name it",
    whatsHappening:
      "Sometimes emotions are hard to identify. You might feel numb, foggy, restless, or just 'off' without knowing why. This is still valid — and it's worth paying attention to.",
    famousQuote: {
      text: "Feelings are just visitors. Let them come and go.",
      author: "Mooji",
    },
    tips: [
      {
        title: "Try naming it loosely",
        body: "You don't need the perfect word. \u201cI feel heavy,\u201d \u201csomething's off,\u201d or \u201cI don't know\u201d are valid starting points.",
      },
      {
        title: "Check in with your body",
        body: "Emotions often live in the body before the mind catches up. Notice tightness, heaviness, restlessness.",
      },
      {
        title: "Don't try to force clarity",
        body: "Pushing hard often makes it harder. Sit with the uncertainty — just noticing, not solving.",
      },
      {
        title: "Talk it through with Lubin",
        body: "Open a conversation and just start talking — you don't need to know what you want to say.",
      },
    ],
    whenToSeekHelp:
      "If emotional numbness or confusion has been persistent for more than a few weeks.",
  },
};

const MOOD_TO_GUIDES: Record<MoodKey, string[]> = {
  calm: ["unsure", "lost"],
  okay: ["unsure", "lost"],
  drained: ["sleep", "stress"],
  stressed: ["stress", "overthinking"],
  anxious: ["anxiety", "overthinking"],
  low: ["low-mood", "relationships"],
};

const FEEDBACK_OPTIONS = [
  { key: "better", label: "A little better", Icon: Sun, iconClass: "text-emerald-500" },
  { key: "same", label: "About the same", Icon: Minus, iconClass: "text-brand-purple/60" },
  { key: "heavier", label: "Heavier", Icon: CloudRain, iconClass: "text-amber-500" },
] as const;

type FeedbackKey = (typeof FEEDBACK_OPTIONS)[number]["key"];

const FEEDBACK_RESPONSE: Record<
  FeedbackKey,
  { eyebrow: string; title: string; message: string; quote: string; author: string; tone: "light" | "soft" | "care" }
> = {
  better: {
    eyebrow: "That's beautiful",
    title: "Hold onto that feeling.",
    message:
      "Even small shifts matter. You showed up for yourself just now — that's the practice.",
    quote:
      "Almost everything will work again if you unplug it for a few minutes, including you.",
    author: "Anne Lamott",
    tone: "light",
  },
  same: {
    eyebrow: "That's okay",
    title: "Sometimes calm comes quietly.",
    message:
      "Not every moment shifts on the first try. Coming back to yourself is enough for now.",
    quote: "You don't have to see the whole staircase. Just take the first step.",
    author: "Martin Luther King Jr.",
    tone: "soft",
  },
  heavier: {
    eyebrow: "We hear you",
    title: "You're not alone in this.",
    message:
      "Heavier moments deserve more than a breath. Be gentle with yourself — and if it helps, Lubin is right here to listen.",
    quote: "The wound is the place where the light enters you.",
    author: "Rumi",
    tone: "care",
  },
};

export default function TryHelpOverlay({
  open,
  mood,
  onClose,
}: {
  open: boolean;
  mood: MoodKey | null;
  onClose: () => void;
}) {
  const list = useMemo(
    () => (mood ? MOOD_TO_GUIDES[mood].map((id) => GUIDES[id]) : []),
    [mood],
  );
  const [idx, setIdx] = useState(0);
  const [rated, setRated] = useState<FeedbackKey | null>(null);

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

  const guide = list[idx];

  return (
    <AnimatePresence>
      {open && guide && (
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

          <div className="relative mx-auto w-full max-w-[600px] px-5 pb-24 pt-16 sm:pt-20">
            {/* Picker */}
            {list.length > 1 && (
              <div className="mb-10">
                <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-brand-purple-dark/45">
                  Choose what fits
                </p>
                <div className="flex flex-wrap justify-center gap-2.5">
                  {list.map((item, i) => {
                    const active = i === idx;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setIdx(i);
                          setRated(null);
                        }}
                        className={`inline-flex items-center rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200 ease-out ${
                          active
                            ? "bg-white text-brand-purple-dark ring-2 ring-brand-purple shadow-[0_6px_18px_-10px_rgba(126,107,175,0.55)]"
                            : "bg-white/60 text-brand-purple-dark/70 ring-1 ring-brand-purple/15 backdrop-blur-sm hover:-translate-y-0.5 hover:bg-white hover:text-brand-purple-dark"
                        }`}
                      >
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
              {/* Hero */}
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-white to-brand-lavender shadow-[0_20px_44px_-22px_rgba(126,107,175,0.45)] ring-1 ring-brand-purple-accent/40"
                >
                  <span
                    aria-hidden
                    className="absolute inset-1.5 rounded-full ring-1 ring-brand-purple-accent/20"
                  />
                  <guide.Icon
                    className="relative h-10 w-10 text-brand-purple"
                    strokeWidth={1.25}
                  />
                </motion.div>

                <h2 className="mt-7 text-[2.25rem] font-light leading-[1.1] tracking-tight text-brand-purple-dark">
                  {guide.name}
                </h2>

                <p className="mt-3 text-[13px] font-medium uppercase tracking-[0.22em] text-brand-purple/75">
                  {guide.subtitle}
                </p>

                <p className="mx-auto mt-6 max-w-[460px] text-[15px] italic leading-[1.6] text-brand-purple-dark/70">
                  &ldquo;{guide.quoteHeader}&rdquo;
                </p>
              </div>

              {/* What's happening */}
              <section className="mt-10 rounded-2xl bg-white/70 p-5 ring-1 ring-brand-purple-accent/25 backdrop-blur-sm">
                <div className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-brand-purple/80">
                  <Info className="h-3 w-3" strokeWidth={2} />
                  What's happening
                </div>
                <p className="text-[15px] leading-[1.6] text-brand-purple-dark/80">
                  {guide.whatsHappening}
                </p>
              </section>

              {/* Famous quote */}
              <figure className="mt-6 rounded-2xl bg-gradient-to-br from-white/80 to-brand-lavender/60 p-6 text-center ring-1 ring-brand-purple-accent/30 backdrop-blur-sm">
                <Quote
                  className="mx-auto h-5 w-5 text-brand-purple-accent"
                  strokeWidth={1.5}
                />
                <blockquote className="mt-3 text-[17px] font-light italic leading-[1.5] text-brand-purple-dark">
                  &ldquo;{guide.famousQuote.text}&rdquo;
                </blockquote>
                <figcaption className="mt-3 text-[11px] font-medium uppercase tracking-[0.24em] text-brand-purple/70">
                  — {guide.famousQuote.author}
                </figcaption>
              </figure>

              {/* Things that help */}
              <div className="mt-10">
                <h3 className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-purple-dark/55">
                  Things that help
                </h3>
                <ol className="space-y-3">
                  {guide.tips.map((tip, i) => (
                    <motion.li
                      key={`${guide.id}-${i}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.35,
                        ease: "easeOut",
                        delay: 0.1 + i * 0.06,
                      }}
                      className="flex items-start gap-4 rounded-2xl bg-white/75 p-5 ring-1 ring-brand-purple-accent/20 backdrop-blur-sm transition-colors hover:bg-white"
                    >
                      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand-lavender text-[13px] font-semibold text-brand-purple-dark ring-1 ring-brand-purple-accent/40">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-[15px] font-semibold text-brand-purple-dark">
                          {tip.title}
                        </p>
                        <p className="mt-1.5 text-[14.5px] leading-[1.6] text-brand-purple-dark/75">
                          {tip.body}
                        </p>
                      </div>
                    </motion.li>
                  ))}
                </ol>
              </div>

              {/* When to seek help */}
              <section className="mt-6 flex items-start gap-3 rounded-2xl bg-white/55 p-4 ring-1 ring-brand-purple-accent/20 backdrop-blur-sm">
                <LifeBuoy
                  className="mt-0.5 h-4 w-4 flex-none text-brand-purple"
                  strokeWidth={1.8}
                />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-purple/80">
                    When to seek help
                  </p>
                  <p className="mt-1 text-[14px] leading-[1.55] text-brand-purple-dark/75">
                    {guide.whenToSeekHelp}
                  </p>
                </div>
              </section>

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
                    <FeedbackResponse rated={rated} onClose={onClose} />
                  )}
                </AnimatePresence>
              </div>

              {/* Closing actions */}
              <div className="mt-10 flex flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex w-full max-w-[280px] items-center justify-center rounded-full bg-brand-purple px-6 py-4 text-sm font-medium tracking-wide text-white shadow-[0_10px_28px_-12px_rgba(126,107,175,0.6)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-brand-purple-dark"
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

function FeedbackResponse({
  rated,
  onClose,
}: {
  rated: FeedbackKey;
  onClose: () => void;
}) {
  const r = FEEDBACK_RESPONSE[rated];
  const toneStyles =
    r.tone === "care"
      ? "from-brand-lavender to-white ring-brand-purple-accent/40"
      : r.tone === "light"
        ? "from-white to-brand-lavender/70 ring-brand-purple-accent/30"
        : "from-white to-brand-lavender/60 ring-brand-purple-accent/25";

  return (
    <motion.div
      key={`response-${rated}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`relative mx-auto max-w-[460px] rounded-3xl bg-gradient-to-br ${toneStyles} p-7 text-center ring-1 backdrop-blur-sm shadow-[0_18px_44px_-24px_rgba(126,107,175,0.45)]`}
    >
      <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-brand-purple/80">
        <span className="h-1 w-1 rounded-full bg-brand-purple-accent" />
        {r.eyebrow}
        <span className="h-1 w-1 rounded-full bg-brand-purple-accent" />
      </div>
      <h3 className="mt-4 text-[1.5rem] font-light leading-[1.2] tracking-tight text-brand-purple-dark">
        {r.title}
      </h3>
      <p className="mx-auto mt-3 max-w-[380px] text-[15px] leading-[1.6] text-brand-purple-dark/75">
        {r.message}
      </p>

      <div className="mx-auto mt-6 h-px w-10 bg-brand-purple-accent/40" />

      <figure className="mt-5">
        <blockquote className="text-[15px] font-light italic leading-[1.55] text-brand-purple-dark/85">
          &ldquo;{r.quote}&rdquo;
        </blockquote>
        <figcaption className="mt-3 text-[11px] font-medium uppercase tracking-[0.22em] text-brand-purple/70">
          — {r.author}
        </figcaption>
      </figure>

      {rated === "heavier" && (
        <Link
          to="/chat"
          onClick={onClose}
          className="mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-brand-purple px-5 py-3 text-sm font-medium text-white no-underline shadow-[0_10px_24px_-12px_rgba(126,107,175,0.6)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-brand-purple-dark"
        >
          <MessageCircle className="h-4 w-4" strokeWidth={1.8} />
          Talk it through with Lubin
        </Link>
      )}
    </motion.div>
  );
}