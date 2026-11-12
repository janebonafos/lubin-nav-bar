import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowUp, CheckCircle2 } from "lucide-react";
import { markIntakeDone } from "@/lib/patterns/softGate";

export const Route = createFileRoute("/ai-intake")({
  head: () => ({
    meta: [
      { title: "AI intake — Health Passport" },
      { name: "description", content: "A short private chat with Lubin AI so providers understand your situation before you meet." },
      { property: "og:title", content: "AI intake — Health Passport" },
      { property: "og:description", content: "A short private chat with Lubin AI before you meet a provider." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AiIntakePage,
});

const QUESTIONS = [
  { q: "Hi, I'm Lubin. What's been on your mind most lately?", options: ["Stress at work or school", "Low mood", "Worry or anxiety", "Sleep"] },
  { q: "How long has this been going on?", options: ["A few days", "A few weeks", "A few months", "Longer"] },
  { q: "How much is it affecting your day-to-day?", options: ["A little", "Quite a bit", "A lot"] },
  { q: "Have you talked to a professional about this before?", options: ["Yes", "No", "Not sure"] },
  { q: "What would help most right now?", options: ["Someone to talk to", "Practical tips", "A professional opinion"] },
];

type Msg = { from: "ai" | "me"; text: string };

function AiIntakePage() {
  const router = useRouter();
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "ai", text: QUESTIONS[0].q }]);
  const [step, setStep] = useState(0);
  const [input, setInput] = useState("");
  const done = step >= QUESTIONS.length;

  function answer(text: string) {
    if (!text.trim() || done) return;
    const next = step + 1;
    const add: Msg[] = [{ from: "me", text }];
    if (next < QUESTIONS.length) add.push({ from: "ai", text: QUESTIONS[next].q });
    else {
      add.push({ from: "ai", text: "Thank you. Your intake is saved to your Health Passport, and a provider can read it before you meet." });
      markIntakeDone();
    }
    setMsgs((m) => [...m, ...add]);
    setStep(next);
    setInput("");
  }

  return (
    <div className="min-h-screen bg-brand-lavender/60 px-4 pb-10 pt-6">
      <div className="mx-auto flex w-full max-w-[640px] flex-col">
        <button type="button" onClick={() => router.history.back()} className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/80 px-3.5 py-2 text-[13px] font-medium text-brand-purple-dark shadow-sm hover:bg-white">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <h1 className="mt-5 text-2xl font-semibold text-brand-purple-dark">Your AI intake</h1>
        <p className="mt-1 text-[13.5px] text-brand-purple-dark/65">About 5 minutes. Private, and you can skip anything. Lubin AI is not a clinician.</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white">
          <div className="h-full bg-brand-purple transition-all" style={{ width: `${(Math.min(step, QUESTIONS.length) / QUESTIONS.length) * 100}%` }} />
        </div>

        <div className="mt-5 flex flex-col gap-2.5">
          {msgs.map((m, i) => (
            <div key={i} className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] leading-[1.5] ${m.from === "ai" ? "self-start bg-white text-brand-purple-dark" : "self-end bg-brand-purple text-white"}`}>
              {m.text}
            </div>
          ))}
        </div>

        {!done ? (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              {QUESTIONS[step].options.map((o) => (
                <button key={o} type="button" onClick={() => answer(o)} className="rounded-full border border-brand-purple/20 bg-white px-3.5 py-2 text-[13px] font-medium text-brand-purple-dark hover:border-brand-purple">
                  {o}
                </button>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); answer(input); }} className="mt-4 flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Or type your own answer…" className="flex-1 rounded-full border border-brand-purple/20 bg-white px-4 py-2.5 text-sm text-brand-purple-dark focus:border-brand-purple focus:outline-none" />
              <button type="submit" aria-label="Send" disabled={!input.trim()} className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-purple text-white disabled:opacity-40">
                <ArrowUp className="h-4 w-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="mt-6 rounded-3xl border border-brand-purple/15 bg-white p-5">
            <p className="flex items-center gap-2 text-[15px] font-semibold text-brand-purple-dark"><CheckCircle2 className="h-5 w-5 text-brand-purple" /> AI intake complete</p>
            <p className="mt-1 text-[13.5px] text-brand-purple-dark/70">You can now talk to a provider. Your first 30-min consult is free.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => router.history.back()} className="rounded-full bg-brand-purple px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-purple-deep">Back to my result</button>
              <Link to="/my-health-passport" className="rounded-full border border-brand-purple/20 px-5 py-2.5 text-[13px] font-semibold text-brand-purple-dark no-underline">Open Health Passport</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
