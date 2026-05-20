import { Phone, MessageSquare, X } from "lucide-react";
import { motion } from "framer-motion";

const HOTLINES = [
  {
    region: "United States",
    name: "988 Suicide & Crisis Lifeline",
    detail: "Call or text 988",
    href: "tel:988",
    icon: Phone,
  },
  {
    region: "United States",
    name: "Crisis Text Line",
    detail: "Text HOME to 741741",
    href: "sms:741741?body=HOME",
    icon: MessageSquare,
  },
  {
    region: "United Kingdom & Ireland",
    name: "Samaritans",
    detail: "Call 116 123 — free, 24/7",
    href: "tel:116123",
    icon: Phone,
  },
  {
    region: "Europe",
    name: "European Emergency Number",
    detail: "Call 112 — free across the EU",
    href: "tel:112",
    icon: Phone,
  },
  {
    region: "Australia",
    name: "Lifeline Australia",
    detail: "Call 13 11 14",
    href: "tel:131114",
    icon: Phone,
  },
];

export default function CrisisOverlay({
  onDismiss,
}: {
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-purple-dark/80 backdrop-blur-md p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crisis-title"
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative mx-auto w-full max-w-[560px] overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="bg-gradient-to-br from-brand-purple to-brand-purple-dark px-7 py-7 text-white">
          <h2 id="crisis-title" className="text-[22px] font-semibold leading-tight">
            We're really glad you said something.
          </h2>
          <p className="mt-3 text-[14.5px] leading-[1.6] text-white/85">
            What you shared just now matters. You don't have to be in crisis to
            reach out — kind people are ready to talk with you, any time.
          </p>
        </div>

        <div className="px-7 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-purple-accent">
            Free, confidential support
          </p>
          <ul className="mt-4 space-y-3">
            {HOTLINES.map((h) => {
              const Icon = h.icon;
              return (
                <li key={h.name}>
                  <a
                    href={h.href}
                    className="flex items-start gap-3 rounded-2xl border border-brand-purple/15 bg-brand-lavender/40 px-4 py-3 no-underline transition hover:border-brand-purple/35 hover:bg-brand-lavender/70"
                  >
                    <span className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white text-brand-purple">
                      <Icon className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-purple/70">
                        {h.region}
                      </p>
                      <p className="mt-0.5 text-[15px] font-semibold text-brand-purple-dark">
                        {h.name}
                      </p>
                      <p className="text-[13.5px] text-brand-purple-dark/75">
                        {h.detail}
                      </p>
                    </div>
                  </a>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 flex flex-col items-center gap-3">
            <a
              href="tel:988"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-purple px-5 py-3 text-sm font-semibold text-white no-underline shadow-[0_10px_24px_-12px_rgba(126,107,175,0.7)] transition hover:-translate-y-0.5 hover:bg-brand-purple-dark"
            >
              <Phone className="h-4 w-4" strokeWidth={2.2} />
              Call 988 now
            </a>
            <button
              type="button"
              onClick={onDismiss}
              className="text-[13px] text-brand-purple-dark/55 underline-offset-4 transition hover:text-brand-purple-dark hover:underline"
            >
              I'm okay — continue
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Close"
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
        >
          <X className="h-4 w-4" />
        </button>
      </motion.div>
    </motion.div>
  );
}