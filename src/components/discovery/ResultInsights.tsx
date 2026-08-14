import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
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
    <div className="mt-5 space-y-5">
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <GaugeCard
            assessment={assessment}
            attempt={attempt}
            status={status}
            bands={bands}
            gaugeHint={insight?.gauge}
          />
        </div>
        <div className="lg:col-span-5">
          <AiReadCard loading={loading} insight={insight} status={status} />
        </div>
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <TalkThroughCard assessment={assessment} attempt={attempt} status={status} />
        <BookingCard status={status} />
      </div>
    </div>
  );
}

// ============================================================
// Gauge
// ============================================================

function GaugeCard({
  assessment,
  attempt,
  status,
  bands,
  gaugeHint,
}: {
  assessment: Assessment;
  attempt: Attempt;
  status: AssessmentStatus;
  bands: ReturnType<typeof getScoreBands>;
  gaugeHint?: string;
}) {
  const max = assessment.maxScore || 1;
  const pct = Math.max(0, Math.min(100, (attempt.score / max) * 100));

  return (
    <section className="rounded-3xl bg-white p-6 shadow-[0_24px_80px_-40px_rgba(126,107,175,0.35)] ring-1 ring-brand-purple/10 md:p-8">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-brand-purple">
        Your gauge
      </p>
      <h2 className="mt-2 text-[19px] font-semibold text-brand-purple-dark">
        Where {attempt.score} sits on this scale
      </h2>
      <p className="mt-1.5 text-[13.5px] leading-[1.6] text-brand-purple-dark/65">
        {gaugeHint ??
          (assessment.lowerIsBetter
            ? "Further left means things tend to feel lighter."
            : "Further right means things tend to feel more supported.")}
      </p>

      {/* Segmented band meter */}
      <div className="mt-7">
        <div className="relative">
          <div className="flex h-3 w-full gap-1 overflow-hidden rounded-full">
            {bands.map((b) => {
              const width = ((b.to - b.from + 1) / (max + 1)) * 100;
              const active = b.label === status.label;
              return (
                <div
                  key={b.label}
                  style={{ width: `${width}%` }}
                  className={`h-full rounded-full ring-1 transition ${b.tone} ${
                    active ? "opacity-100" : "opacity-40"
                  }`}
                />
              );
            })}
          </div>
          {/* Marker */}
          <div
            className="absolute -top-1.5 -translate-x-1/2"
            style={{ left: `${pct}%` }}
          >
            <span className="block h-6 w-[3px] rounded-full bg-brand-purple-dark shadow-[0_2px_8px_rgba(61,46,107,0.4)]" />
          </div>
          <div
            className="absolute top-7 -translate-x-1/2 whitespace-nowrap"
            style={{ left: `${pct}%` }}
          >
            <span className="inline-flex items-center rounded-full bg-brand-purple-dark px-2.5 py-1 text-[11px] font-semibold text-white tabular-nums">
              You · {attempt.score}
            </span>
          </div>
        </div>
        <div className="mt-14 flex items-center justify-between text-[11.5px] font-medium text-brand-purple-dark/45 tabular-nums">
          <span>0</span>
          <span>{max}</span>
        </div>
      </div>

      {/* Band legend */}
      <ul className="mt-4 space-y-2">
        {bands.map((b) => {
          const active = b.label === status.label;
          return (
            <li
              key={b.label}
              className={`flex items-start gap-3 rounded-2xl px-3.5 py-3 ring-1 transition ${
                active
                  ? "bg-brand-lavender/40 ring-brand-purple/25"
                  : "bg-white ring-brand-purple/10"
              }`}
            >
              <span
                className={`mt-0.5 inline-flex flex-none items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${b.tone}`}
              >
                {b.from === b.to ? b.from : `${b.from}–${b.to}`}
              </span>
              <span className="flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[13.5px] font-semibold ${
                      active ? "text-brand-purple-dark" : "text-brand-purple-dark/75"
                    }`}
                  >
                    {b.label}
                  </span>
                  {active && (
                    <span className="inline-flex items-center rounded-full bg-brand-purple px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                      You're here
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-[12.5px] leading-[1.55] text-brand-purple-dark/60">
                  {b.explanation}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ============================================================
// AI read
// ============================================================

function AiReadCard({
  loading,
  insight,
  status,
}: {
  loading: boolean;
  insight: Insight | null;
  status: AssessmentStatus;
}) {
  return (
    <section className="h-full rounded-3xl bg-gradient-to-br from-brand-purple to-brand-purple-dark p-6 text-white shadow-[0_24px_80px_-40px_rgba(61,46,107,0.6)] md:p-8">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/25">
          <Sparkles className="h-4 w-4" strokeWidth={2.2} />
        </span>
        <div>
          <p className="text-[15px] font-semibold text-white">
            What this means for you
          </p>
          <p className="text-[12px] text-white/60">
            A gentle read from Lubin — not a diagnosis
          </p>
        </div>
      </div>

      {loading || !insight ? (
        <div className="mt-5 space-y-3" aria-busy="true">
          <div className="h-3.5 w-11/12 animate-pulse rounded-full bg-white/20" />
          <div className="h-3.5 w-10/12 animate-pulse rounded-full bg-white/20" />
          <div className="h-3.5 w-8/12 animate-pulse rounded-full bg-white/20" />
          <p className="pt-2 text-[12.5px] text-white/60">
            Reading your {status.label.toLowerCase()} result…
          </p>
        </div>
      ) : (
        <>
          <p className="mt-5 text-[15px] leading-[1.65] text-white/90">
            {insight.meaning}
          </p>

          <p className="mt-6 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-white/65">
            Small things that could help
          </p>
          <ol className="mt-3 space-y-2.5">
            {insight.steps.map((s, i) => (
              <li
                key={s.title}
                className="flex items-start gap-3 rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15"
              >
                <span className="mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-white/20 text-[11.5px] font-semibold text-white">
                  {i + 1}
                </span>
                <span className="flex-1">
                  <span className="block text-[13.5px] font-semibold text-white">
                    {s.title}
                  </span>
                  <span className="mt-0.5 block text-[12.5px] leading-[1.55] text-white/70">
                    {s.detail}
                  </span>
                </span>
              </li>
            ))}
          </ol>

          <p className="mt-5 text-[13.5px] leading-[1.6] text-white/75">
            {insight.encouragement}
          </p>
        </>
      )}
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
    <section className="rounded-3xl bg-white p-6 shadow-[0_24px_80px_-40px_rgba(126,107,175,0.35)] ring-1 ring-brand-purple/10 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-lavender/70 text-brand-purple">
            <MessageCircle className="h-4 w-4" strokeWidth={2.1} />
          </span>
          <div>
            <p className="text-[15px] font-semibold text-brand-purple-dark">
              Talk through your results
            </p>
            <p className="text-[12.5px] text-brand-purple-dark/60">
              Ask anything about this result — private, and at your pace
            </p>
          </div>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-purple px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-brand-purple-dark"
          >
            Start talking
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
          </button>
        )}
      </div>

      {open && (
        <div className="mt-5">
          <div
            ref={scrollRef}
            className="max-h-[320px] space-y-3 overflow-y-auto rounded-2xl bg-brand-lavender/25 p-4"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <p
                  className={`max-w-[88%] whitespace-pre-wrap text-[13.5px] leading-[1.6] ${
                    m.role === "user"
                      ? "rounded-[18px_18px_4px_18px] bg-brand-purple px-4 py-2.5 text-white"
                      : "rounded-[18px_18px_18px_4px] bg-white px-4 py-2.5 text-brand-purple-dark ring-1 ring-brand-purple/10"
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
                className="rounded-full border border-brand-purple/20 bg-white px-3 py-1.5 text-[12.5px] font-medium text-brand-purple transition hover:border-brand-purple/45 hover:bg-brand-lavender/30 disabled:opacity-50"
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
              className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-brand-purple/15 bg-white px-4 py-3 text-[13.5px] text-brand-purple-dark placeholder:text-brand-purple-dark/40 focus:border-brand-purple/40 focus:outline-none focus:ring-2 focus:ring-brand-purple/15"
            />
            <button
              type="submit"
              disabled={streaming || !input.trim()}
              aria-label="Send message"
              className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-full bg-brand-purple text-white transition hover:bg-brand-purple-dark disabled:opacity-40"
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
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-purple to-brand-purple-dark p-6 text-white shadow-[0_24px_80px_-40px_rgba(61,46,107,0.6)] md:p-8">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ring-1 ring-white/25">
          <Gift className="h-3.5 w-3.5" strokeWidth={2.3} />
          Yours to use
        </span>
        <h2 className="mt-4 text-[21px] font-semibold leading-snug">
          Talk it over with a real person — 30 minutes, free
        </h2>
        <p className="mt-2 max-w-[520px] text-[14px] leading-[1.65] text-white/80">
          You haven't used your free 30-minute consultation yet. It's a relaxed
          conversation with a verified professional — bring this result, or just
          bring yourself. No commitment afterwards.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            to="/find-provider"
            onClick={() => claimFreeConsult()}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-[13.5px] font-semibold text-brand-purple-dark no-underline shadow-sm transition hover:-translate-y-0.5"
          >
            <CalendarCheck className="h-4 w-4" strokeWidth={2.2} />
            Claim my free 30 minutes
          </Link>
          <span className="text-[12.5px] text-white/65">
            One-time · {status.isCrisis ? "priority slots available" : "usually within a few days"}
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-[0_24px_80px_-40px_rgba(126,107,175,0.35)] ring-1 ring-brand-purple/10 md:p-8">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-lavender/70 text-brand-purple">
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
        className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-brand-purple px-5 py-2.5 text-[13.5px] font-semibold text-white no-underline shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-purple-dark"
      >
        Find a provider
        <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
      </Link>
    </section>
  );
}