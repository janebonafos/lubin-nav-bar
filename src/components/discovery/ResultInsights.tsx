import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUp,
  CalendarCheck,
  Gift,
  Loader2,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import type { Assessment, Attempt } from "@/lib/patterns/types";
import {
  getAssessmentStatus,
  getScoreBands,
  type AssessmentStatus,
  type ScoreBand,
} from "@/lib/patterns/scoring";
import {
  claimFreeConsult,
  getFreeConsult,
  subscribeFreeConsult,
} from "@/lib/consult/freeConsult";

type Insight = {
  meaning: string;
  gauge: string;
  steps: { title: string; detail: string }[];
  encouragement: string;
};

function fallbackInsight(
  assessment: Assessment,
  status: AssessmentStatus,
): Insight {
  return {
    meaning: `${status.explanation} This is a snapshot of the last little while — not a label, and not something you have to fix on your own.`,
    gauge: assessment.lowerIsBetter
      ? "On this scale, the further left you sit the lighter things tend to feel."
      : "On this scale, the further right you sit the more supported things tend to feel.",
    steps: [
      {
        title: "Name one thing that's heaviest",
        detail: "Write a single sentence about what's taking the most from you lately.",
      },
      {
        title: "Protect one small routine",
        detail: "Pick one anchor — sleep, a walk, a meal, a message to a friend — and keep it this week.",
      },
      {
        title: "Check in again in a couple of weeks",
        detail: "Patterns tell you far more than any single result.",
      },
    ],
    encouragement:
      "You showed up and answered honestly — that's already the hard part. We'll keep looking at this with you.",
  };
}

export default function ResultInsights({
  assessment,
  attempt,
}: {
  assessment: Assessment;
  attempt: Attempt;
}) {
  const status = useMemo(
    () =>
      getAssessmentStatus(
        assessment.id,
        attempt.score,
        assessment.maxScore,
        assessment.lowerIsBetter,
      ),
    [assessment, attempt.score],
  );
  const bands = useMemo(
    () => getScoreBands(assessment.id, assessment.maxScore, assessment.lowerIsBetter),
    [assessment],
  );

  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch("/api/result-insight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: assessment.name,
            clinicalName: assessment.clinicalName,
            score: attempt.score,
            maxScore: assessment.maxScore,
            band: status.label,
            bandExplanation: status.explanation,
            lowerIsBetter: assessment.lowerIsBetter,
          }),
        });
        const data = (await res.json()) as Partial<Insight> & { error?: string };
        if (cancelled) return;
        if (!res.ok || !data.meaning || !Array.isArray(data.steps)) {
          setInsight(fallbackInsight(assessment, status));
        } else {
          setInsight({
            meaning: data.meaning,
            gauge: data.gauge ?? fallbackInsight(assessment, status).gauge,
            steps: data.steps.slice(0, 3),
            encouragement:
              data.encouragement ?? fallbackInsight(assessment, status).encouragement,
          });
        }
      } catch {
        if (!cancelled) setInsight(fallbackInsight(assessment, status));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assessment, attempt.score, status]);

  return (
    <div className="relative">
      {/* Soft organic glows */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-80 w-80 rounded-full bg-brand-purple/[0.06] blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-1/3 h-72 w-72 rounded-full bg-brand-purple-accent/[0.08] blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative space-y-16"
      >
        {/* Gauge */}
        <GaugeSection
          assessment={assessment}
          attempt={attempt}
          status={status}
          bands={bands}
          gaugeHint={insight?.gauge}
        />

        {/* AI read */}
        <AiReadSection loading={loading} insight={insight} status={status} />

        {/* Talk through + Booking */}
        <div className="grid items-stretch gap-4 lg:grid-cols-2">
          <TalkThroughCard assessment={assessment} attempt={attempt} status={status} />
          <BookingCard status={status} />
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================
// Gauge
// ============================================================

function GaugeSection({
  assessment,
  attempt,
  status,
  bands,
  gaugeHint,
}: {
  assessment: Assessment;
  attempt: Attempt;
  status: AssessmentStatus;
  bands: ScoreBand[];
  gaugeHint?: string;
}) {
  const max = assessment.maxScore || 1;
  const pct = Math.max(0, Math.min(100, (attempt.score / max) * 100));

  return (
    <section className="relative">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-md">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-purple/70">
            Your gauge
          </p>
          <h2 className="mt-2 font-serif-display text-2xl font-light italic text-brand-purple-dark md:text-3xl">
            Where {attempt.score} sits on this scale
          </h2>
          <p className="mt-2 text-[13.5px] leading-[1.6] text-brand-purple-dark/60">
            {gaugeHint ??
              (assessment.lowerIsBetter
                ? "Further left means things tend to feel lighter."
                : "Further right means things tend to feel more supported.")}
          </p>
        </div>
        <div className="text-right">
          <span className="font-serif-display text-4xl font-light text-brand-purple-dark">
            {attempt.score}
          </span>
          <span className="ml-1.5 text-[12px] font-medium uppercase tracking-widest text-brand-purple-dark/40">
            / {max}
          </span>
        </div>
      </div>

      {/* Minimal horizontal gauge */}
      <div className="mt-8">
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-brand-lavender">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand-purple-accent via-brand-purple to-brand-purple-dark"
            style={{ width: `${pct}%` }}
          />
          <div
            className="absolute top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-brand-purple-dark shadow-[0_0_0_4px_rgba(234,231,245,1)]"
            style={{ left: `${pct}%` }}
          />
        </div>
        <div className="mt-3 flex justify-between text-[11px] font-medium tabular-nums text-brand-purple-dark/40">
          <span>0</span>
          <span>{max}</span>
        </div>
        <div
          className="relative mt-1"
          style={{ marginLeft: `min(${pct}%, calc(100% - 80px))` }}
        >
          <span className="inline-flex items-center rounded-full bg-brand-purple-dark px-3 py-1 text-[11px] font-semibold text-white">
            You · {attempt.score}
          </span>
        </div>
      </div>

      {/* Band legend as a quiet inline list */}
      <div className="mt-10 flex flex-wrap gap-3">
        {bands.map((b) => {
          const active = b.label === status.label;
          return (
            <div
              key={b.label}
              className={`flex items-center gap-2.5 rounded-full border px-3.5 py-2 transition ${
                active
                  ? "border-brand-purple/25 bg-white shadow-sm"
                  : "border-brand-purple/10 bg-white/60"
              }`}
            >
              <span className={`inline-block h-2 w-2 rounded-full ${bandDotColor(b)}`} />
              <span className="text-[12px] font-medium text-brand-purple-dark">
                {b.label}
              </span>
              <span className="text-[11px] tabular-nums text-brand-purple-dark/50">
                {b.from === b.to ? b.from : `${b.from}–${b.to}`}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function bandDotColor(b: ScoreBand): string {
  if (b.tone.includes("emerald")) return "bg-emerald-400";
  if (b.tone.includes("sky")) return "bg-sky-400";
  if (b.tone.includes("amber")) return "bg-amber-400";
  if (b.tone.includes("orange")) return "bg-orange-400";
  return "bg-brand-purple";
}

// ============================================================
// AI read
// ============================================================

function AiReadSection({
  loading,
  insight,
  status,
}: {
  loading: boolean;
  insight: Insight | null;
  status: AssessmentStatus;
}) {
  return (
    <section className="relative">
      <div className="absolute -left-4 top-0 bottom-0 w-px bg-gradient-to-b from-brand-purple/20 to-transparent" />
      <div className="pl-6 md:pl-8">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-purple" strokeWidth={2.2} />
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-purple/70">
            AI Insights & next steps
          </p>
        </div>
        <h2 className="mt-2 font-serif-display text-2xl font-light italic text-brand-purple-dark md:text-3xl">
          What this means for you
        </h2>

        {loading || !insight ? (
          <div className="mt-6 space-y-3" aria-busy="true">
            <div className="h-3.5 w-11/12 animate-pulse rounded-full bg-brand-lavender" />
            <div className="h-3.5 w-10/12 animate-pulse rounded-full bg-brand-lavender" />
            <div className="h-3.5 w-8/12 animate-pulse rounded-full bg-brand-lavender" />
            <p className="pt-2 text-[12.5px] text-brand-purple-dark/50">
              Reading your {status.label.toLowerCase()} result…
            </p>
          </div>
        ) : (
          <>
            <p className="mt-5 max-w-2xl text-[16px] leading-[1.7] text-brand-purple-dark/80">
              {insight.meaning}
            </p>

            <div className="mt-10 space-y-10">
              {insight.steps.map((s, i) => (
                <div key={s.title} className="flex gap-5 items-start">
                  <span className="font-serif-display text-4xl font-light italic leading-none text-brand-purple/20">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1">
                    <h3 className="text-[15px] font-semibold text-brand-purple-dark">
                      {s.title}
                    </h3>
                    <p className="mt-1 text-[13.5px] leading-[1.6] text-brand-purple-dark/60">
                      {s.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-10 max-w-2xl text-[14px] leading-[1.7] italic text-brand-purple-dark/70">
              {insight.encouragement}
            </p>
          </>
        )}
      </div>
    </section>
  );
}

// ============================================================
// Talk it through with AI
// ============================================================

type Msg = { role: "user" | "assistant"; content: string };

function TalkThroughCard({
  assessment,
  attempt,
  status,
}: {
  assessment: Assessment;
  attempt: Attempt;
  status: AssessmentStatus;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content: `We can talk this through together. Your ${assessment.name} came out in the "${status.label}" range — what part of it would you like to unpack first?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const context = `Context for this conversation: the person just completed the ${assessment.name} (${assessment.clinicalName}). Score ${attempt.score} of ${assessment.maxScore}, band "${status.label}" — ${status.explanation}. Help them understand it warmly, never alarm them, never diagnose.`;

  const STARTERS = [
    "What does this score actually mean?",
    "Should I be worried about this?",
    "What can I do this week?",
  ];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setStreaming(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: context }, ...next],
        }),
      });
      if (!res.ok || !res.body) throw new Error("chat failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let buffer = "";
      setMessages([...next, { role: "assistant", content: "" }]);
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload) as {
              choices?: { delta?: { content?: string } }[];
            };
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setMessages([...next, { role: "assistant", content: acc }]);
            }
          } catch {
            /* partial chunk */
          }
        }
      }
      if (!acc) throw new Error("empty");
    } catch {
      setMessages([
        ...next,
        {
          role: "assistant",
          content:
            "I couldn't reach my words just then — could you try sending that again? I'm still here.",
        },
      ]);
    } finally {
      setStreaming(false);
    }
  }

  return (
    <section className="group relative flex h-full flex-col overflow-hidden rounded-[2rem] bg-brand-purple-dark p-7 text-white shadow-[0_24px_80px_-40px_rgba(61,46,107,0.45)] md:p-8">
      <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-brand-purple/30 blur-2xl" />
      <div className="relative flex flex-1 flex-col">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/25">
            <MessageCircle className="h-4 w-4" strokeWidth={2.1} />
          </span>
          <div>
            <p className="text-[16px] font-semibold text-white">Talk through your results</p>
            <p className="text-[12px] text-white/60">Ask anything — private, and at your pace</p>
          </div>
        </div>

        {!open && (
          <>
            <p className="mt-4 max-w-[420px] text-[14px] leading-[1.65] text-white/70">
              Bring any question about your result — what it means, what to watch
              for, or what to try this week. Nothing is recorded or shared.
            </p>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-auto inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-5 py-2.5 pt-2.5 text-[13px] font-semibold text-brand-purple-dark no-underline transition hover:-translate-y-0.5"
            >
              Start talking
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
            </button>
          </>
        )}

        {open && (
          <div className="mt-5">
            <div
              ref={scrollRef}
              className="max-h-[240px] space-y-3 overflow-y-auto rounded-2xl bg-white/10 p-4 ring-1 ring-white/15"
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <p
                    className={`max-w-[88%] whitespace-pre-wrap text-[13.5px] leading-[1.6] ${
                      m.role === "user"
                        ? "rounded-[18px_18px_4px_18px] bg-white px-4 py-2.5 text-brand-purple-dark"
                        : "rounded-[18px_18px_18px_4px] bg-white/15 px-4 py-2.5 text-white"
                    }`}
                  >
                    {m.content ||
                      (streaming ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        ""
                      ))}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  disabled={streaming}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-white/20 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="mt-3 flex items-end gap-2"
            >
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Type what's on your mind…"
                className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-[13.5px] text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/15"
              />
              <button
                type="submit"
                disabled={streaming || !input.trim()}
                aria-label="Send message"
                className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-full bg-white text-brand-purple-dark transition hover:bg-white/90 disabled:opacity-40"
              >
                {streaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4" strokeWidth={2.4} />
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================================
// Booking
// ============================================================

function BookingCard({ status }: { status: AssessmentStatus }) {
  const [claimed, setClaimed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setClaimed(getFreeConsult().claimed);
    setHydrated(true);
    return subscribeFreeConsult(() => setClaimed(getFreeConsult().claimed));
  }, []);

  if (!hydrated) return null;

  if (!claimed) {
    return (
      <section className="relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-brand-purple/15 bg-white p-7 transition hover:bg-brand-lavender/30 md:p-8">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-lavender px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-purple-dark">
          <Gift className="h-3.5 w-3.5" strokeWidth={2.3} />
          Yours to use
        </span>
        <h2 className="mt-4 font-serif-display text-[22px] font-light italic text-brand-purple-dark">
          Talk it over with a real person — 30 minutes, free
        </h2>
        <p className="mt-2 max-w-[520px] text-[14px] leading-[1.65] text-brand-purple-dark/70">
          You haven't used your free 30-minute consultation yet. It's a relaxed
          conversation with a verified professional — bring this result, or just
          bring yourself. No commitment afterwards.
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
          <Link
            to="/find-provider"
            onClick={() => claimFreeConsult()}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-purple px-5 py-2.5 text-[13px] font-semibold text-white no-underline shadow-sm transition hover:bg-brand-purple-dark"
          >
            <CalendarCheck className="h-4 w-4" strokeWidth={2.2} />
            Claim my free 30 minutes
          </Link>
          <span className="text-[12.5px] text-brand-purple-dark/50">
            One-time · {status.isCrisis ? "priority slots available" : "usually within a few days"}
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-brand-purple/15 bg-white p-7 transition hover:bg-brand-lavender/30 md:p-8">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-brand-lavender/70 text-brand-purple">
          <CalendarCheck className="h-4 w-4" strokeWidth={2.1} />
        </span>
        <div>
          <p className="text-[15px] font-semibold text-brand-purple-dark">
            Book a session with a provider
          </p>
          <p className="text-[12.5px] text-brand-purple-dark/60">
            You've already used your free consultation — here's how to keep going
          </p>
        </div>
      </div>
      <p className="mt-4 text-[13.5px] leading-[1.6] text-brand-purple-dark/70">
        Pick someone whose approach fits you, choose a time that works, and share
        this result with them if you'd like. You stay in control of what's shared.
      </p>
      <Link
        to="/find-provider"
        className="mt-auto inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-purple pt-2.5 px-5 py-2.5 text-[13px] font-semibold text-white no-underline shadow-sm transition hover:bg-brand-purple-dark"
      >
        Find a provider
        <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
      </Link>
    </section>
  );
}
