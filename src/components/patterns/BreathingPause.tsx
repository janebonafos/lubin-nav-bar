import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const DURATION = 30; // seconds

export default function BreathingPause({
  onSkip,
  onComplete,
}: {
  onSkip: () => void;
  onComplete: () => void;
}) {
  const [remaining, setRemaining] = useState(DURATION);

  useEffect(() => {
    const start = Date.now();
    const id = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const left = Math.max(0, DURATION - elapsed);
      setRemaining(left);
      if (left === 0) {
        window.clearInterval(id);
        onComplete();
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-brand-lavender/95 px-6 backdrop-blur-md"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-purple">
        A quiet moment
      </p>
      <h2 className="mt-4 max-w-md text-center text-[22px] font-semibold leading-tight text-brand-purple-dark">
        Let's take 30 seconds to breathe before continuing.
      </h2>

      <div className="relative mt-10 flex h-56 w-56 items-center justify-center">
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-purple/30 to-brand-purple-accent/20"
          animate={{ scale: [1, 1.25, 1] }}
          transition={{ duration: 8, ease: "easeInOut", repeat: Infinity }}
        />
        <motion.div
          className="absolute inset-6 rounded-full bg-gradient-to-br from-brand-purple/45 to-brand-purple-accent/30"
          animate={{ scale: [1, 1.18, 1] }}
          transition={{ duration: 8, ease: "easeInOut", repeat: Infinity }}
        />
        <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-white text-center text-brand-purple-dark shadow-[0_20px_40px_-20px_rgba(126,107,175,0.55)]">
          <span className="text-2xl font-semibold tabular-nums">{remaining}s</span>
        </div>
      </div>

      <p className="mt-10 max-w-sm text-center text-[14px] leading-[1.6] text-brand-purple-dark/65">
        Soft breath in… and gently out. You're doing the work just by being here.
      </p>

      <button
        type="button"
        onClick={onSkip}
        className="mt-8 text-[13px] text-brand-purple-dark/55 underline-offset-4 transition hover:text-brand-purple-dark hover:underline"
      >
        Skip the pause →
      </button>
    </motion.div>
  );
}