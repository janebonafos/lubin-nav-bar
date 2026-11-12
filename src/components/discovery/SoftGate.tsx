import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Lock, Mail, MessageCircle, Phone, Sparkles, Compass, X } from "lucide-react";
import { isIntakeDone, isSignedUp, subscribeSoftGate } from "@/lib/patterns/softGate";

export function useSoftGate() {
  const [state, setState] = useState({ signedUp: false, intakeDone: false });
  useEffect(() => {
    const sync = () => setState({ signedUp: isSignedUp(), intakeDone: isIntakeDone() });
    sync();
    return subscribeSoftGate(sync);
  }, []);
  return state;
}

export function CrisisHelpCard() {
  return (
    <section className="rounded-3xl border border-amber-200/70 bg-[#FEF9EE] p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#FBE89A]/70 text-[#7A5A2C]">
          <Phone className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-[#7A5A2C]">Need help right now?</p>
          <p className="mt-0.5 text-[13px] leading-[1.55] text-[#8A6A3C]">
            Free, confidential support, any time.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href="tel:2919" className="rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold text-[#7A5A2C] no-underline shadow-sm">Hopeline PH · 2919</a>
            <a href="tel:1553" className="rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold text-[#7A5A2C] no-underline shadow-sm">NCMH · 1553</a>
            <a href="https://findahelpline.com" target="_blank" rel="noreferrer" className="rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold text-[#7A5A2C] no-underline shadow-sm">findahelpline.com</a>
          </div>
        </div>
      </div>
    </section>
  );
}

const LOCKED = [
  { icon: Sparkles, title: "Your AI insights", lines: ["What your answers suggest about this week", "Patterns worth noticing"] },
  { icon: Compass, title: "Your next steps", lines: ["A short plan made for this result", "Start your AI intake"] },
  { icon: MessageCircle, title: "Ask Lubin AI about this result", lines: ["“Why is my score moderate?”", "“What can I try tonight?”"] },
];

export function LockedPreviews({ onUnlock }: { onUnlock: () => void }) {
  return (
    <div>
      <div className="grid gap-3 md:grid-cols-3">
        {LOCKED.map(({ icon: Icon, title, lines }) => (
          <button
            key={title}
            type="button"
            onClick={onUnlock}
            className="group relative overflow-hidden rounded-3xl border border-brand-purple/15 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-lavender text-brand-purple">
                <Icon className="h-4 w-4" />
              </span>
              <Lock className="h-4 w-4 text-brand-purple/70" />
            </div>
            <p className="mt-3 text-[15px] font-semibold text-brand-purple-dark">{title}</p>
            <div className="mt-2 space-y-1.5 blur-[5px] select-none" aria-hidden>
              {lines.map((l) => (
                <p key={l} className="text-[13px] text-brand-purple-dark/70">{l}</p>
              ))}
            </div>
          </button>
        ))}
      </div>
      <p className="mt-3 text-center text-[13px] text-brand-purple-dark/60">
        Free account, takes 30 seconds. No payment.
      </p>
    </div>
  );
}

export function NextStepsCard({ intakeDone }: { intakeDone: boolean }) {
  return (
    <section className="rounded-3xl border border-brand-purple/15 bg-white p-5 md:p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-brand-purple">Your next steps</p>
      <h2 className="mt-2 text-[18px] font-semibold text-brand-purple-dark">
        {intakeDone ? "Your AI intake is done" : "Tell Lubin a bit more about you"}
      </h2>
      <p className="mt-1.5 text-[13.5px] leading-[1.6] text-brand-purple-dark/70">
        {intakeDone
          ? "Thanks — your answers are saved to your Health Passport. You can review or update them any time."
          : "A short, private chat (about 5 minutes) so any provider you see later already understands your situation."}
      </p>
      <Link
        to="/ai-intake"
        className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand-purple px-5 py-2.5 text-[13px] font-semibold text-white no-underline shadow-sm transition hover:bg-brand-purple-deep"
      >
        {intakeDone ? "Review my AI intake" : "Start your AI intake"} <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}

export function SaveResultModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [emailMode, setEmailMode] = useState(false);
  const [email, setEmail] = useState("");
  useEffect(() => { if (!open) { setEmailMode(false); setEmail(""); } }, [open]);
  const validEmail = /\S+@\S+\.\S+/.test(email);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-end justify-center md:items-center md:p-4"
          role="dialog" aria-modal="true" aria-labelledby="save-result-title"
        >
          <div className="absolute inset-0 bg-brand-purple-dark/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ y: 30 }} animate={{ y: 0 }} exit={{ y: 20 }}
            className="relative w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl md:rounded-3xl md:p-7"
          >
            <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 rounded-full p-1.5 text-brand-purple-dark/50 hover:bg-brand-lavender/60">
              <X className="h-5 w-5" />
            </button>
            <h2 id="save-result-title" className="text-xl font-semibold text-brand-purple-dark">Save your result</h2>
            <p className="mt-2 text-sm leading-relaxed text-brand-purple-dark/70">
              Create a free account and your result will be saved to your Health Passport.
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              {!emailMode ? (
                <>
                  <button type="button" onClick={onDone} className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-purple/20 bg-white px-5 py-3 text-sm font-semibold text-brand-purple-dark transition hover:bg-brand-lavender/50">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2-1.9 3.2-4.7 3.2-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.1a11 11 0 0 0 0 9.9z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z"/></svg>
                    Continue with Google
                  </button>
                  <button type="button" onClick={() => setEmailMode(true)} className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-purple px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-purple-deep">
                    <Mail className="h-4 w-4" /> Continue with email
                  </button>
                </>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); if (validEmail) onDone(); }} className="flex flex-col gap-2.5">
                  <label htmlFor="save-email" className="text-[13px] font-medium text-brand-purple-dark">Email</label>
                  <input id="save-email" type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="rounded-xl border border-brand-purple/20 px-4 py-3 text-sm text-brand-purple-dark focus:border-brand-purple focus:outline-none" />
                  <button type="submit" disabled={!validEmail} className="rounded-full bg-brand-purple px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-purple-deep disabled:opacity-40">
                    Create free account
                  </button>
                  <button type="button" onClick={() => setEmailMode(false)} className="text-[13px] font-medium text-brand-purple">Back</button>
                </form>
              )}
            </div>
            <p className="mt-4 text-center text-[12px] text-brand-purple-dark/50">Free, no payment. Your result stays private.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
