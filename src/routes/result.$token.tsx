import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { ASSESSMENTS_BY_SLUG } from "@/lib/patterns/assessments";
import { getScoreBands, type ScoreBand } from "@/lib/patterns/scoring";
import {
  decodeSharedResult,
  getResultShare,
  type SharedResult,
} from "@/lib/share/resultShareStore";

export const Route = createFileRoute("/result/$token")({
  validateSearch: z.object({ d: z.string().optional() }),
  component: SharedResultPage,
  head: () => ({
    meta: [
      { title: "A shared wellbeing result — Lubin" },
      {
        name: "description",
        content:
          "A self-reported wellbeing check shared voluntarily by the person who completed it. Not a clinical diagnosis.",
      },
      { property: "og:title", content: "A shared wellbeing result — Lubin" },
      {
        property: "og:description",
        content:
          "A self-reported wellbeing check shared voluntarily. Not a clinical diagnosis.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function SharedResultPage() {
  const { token } = Route.useParams();
  const { d } = Route.useSearch();
  const [record, setRecord] = useState<SharedResult | null | undefined>(undefined);

  const bands = useMemo<ScoreBand[]>(() => {
    if (!record) return [];
    const id = ASSESSMENTS_BY_SLUG[record.assessmentSlug]?.id ?? record.assessmentSlug;
    return getScoreBands(id, record.maxScore, record.lowerIsBetter);
  }, [record]);

  useEffect(() => {
    const local = getResultShare(token);
    if (local) {
      setRecord(local);
      return;
    }
    const decoded = d ? decodeSharedResult(d) : null;
    if (decoded && decoded.expiresAt > Date.now() && !decoded.revoked) {
      setRecord(decoded);
      return;
    }
    setRecord(null);
  }, [token, d]);

  if (record === undefined) {
    return <div className="min-h-screen bg-[#FAF8FD]" />;
  }

  if (record === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8FD] px-6 text-center">
        <div className="max-w-md">
          <h1 className="font-serif-display text-3xl font-light text-brand-purple-dark">
            This link is no longer available
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-brand-purple-dark/60">
            Shared results expire after 30 days, and the sender can revoke them at
            any time. Ask them for a fresh link if you still need it.
          </p>
        </div>
      </div>
    );
  }

  const taken = new Date(record.takenAt);
  const dateLabel = taken.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const expires = new Date(record.expiresAt).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-[#FAF8FD] px-6 py-14 print:bg-white">
      <div className="mx-auto max-w-3xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-purple/70">
          Shared wellbeing result · {record.clinicalName}
        </p>
        <h1 className="mt-4 font-serif-display text-4xl font-light leading-[1.05] text-brand-purple-dark md:text-5xl">
          {record.assessmentName}
        </h1>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center rounded-full border border-brand-purple/15 bg-white px-3 py-1.5 text-[12px] font-semibold text-brand-purple-dark">
            {record.statusLabel}
          </span>
          <span className="text-[12px] font-medium tabular-nums text-brand-purple-dark/50">
            {record.score} / {record.maxScore}{" "}
            {record.lowerIsBetter ? "(lower = lighter)" : "(higher = better)"}
          </span>
          <span className="text-[12px] text-brand-purple-dark/45">
            Completed {dateLabel}
          </span>
        </div>

        <div className="mt-10 h-px w-full bg-brand-purple/10" />

        <p className="mt-10 font-serif-display text-xl font-light italic leading-relaxed text-brand-purple-dark md:text-2xl">
          “{record.summary}”
        </p>
        <p className="mt-6 max-w-2xl text-[14px] leading-[1.7] text-brand-purple-dark/70">
          {record.explanation}
        </p>

        {bands.length > 0 && (
          <ScoreGuide
            bands={bands}
            score={record.score}
            maxScore={record.maxScore}
            clinicalName={record.clinicalName}
            lowerIsBetter={record.lowerIsBetter}
          />
        )}

        {record.note && (
          <div className="mt-10 rounded-2xl bg-white p-5 ring-1 ring-brand-purple/10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-purple/70">
              Note from the sender
            </p>
            <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-brand-purple-dark/80">
              {record.note}
            </p>
          </div>
        )}

        {record.answers && record.answers.length > 0 && (
          <section className="mt-12">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-purple/70">
              Individual responses
            </h2>
            <ol className="mt-4 divide-y divide-brand-purple/10 border-t border-brand-purple/10">
              {record.answers.map((a, i) => (
                <li key={i} className="flex items-start gap-3 py-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand-lavender/60 text-[11.5px] font-semibold text-brand-purple">
                    {i + 1}
                  </span>
                  <p className="flex-1 text-[13.5px] leading-snug text-brand-purple-dark">
                    {a.question}
                  </p>
                  <span className="ml-2 flex-none text-right text-[13px] font-semibold text-brand-purple">
                    {a.answer}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <div className="mt-14 border-t border-brand-purple/10 pt-6">
          <p className="text-[12px] leading-[1.7] text-brand-purple-dark/45">
            This is a self-reported wellbeing check, voluntarily shared by the
            person who completed it. It is not a clinical diagnosis and should be
            read alongside a conversation with them. This link expires on{" "}
            {expires}.
          </p>
          <button
            type="button"
            onClick={() => window.print()}
            className="mt-5 rounded-full bg-brand-purple px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-brand-purple-dark print:hidden"
          >
            Save as PDF
          </button>
        </div>
      </div>
    </main>
  );
}

function ScoreGuide({
  bands,
  score,
  maxScore,
  clinicalName,
  lowerIsBetter,
}: {
  bands: ScoreBand[];
  score: number;
  maxScore: number;
  clinicalName: string;
  lowerIsBetter: boolean;
}) {
  const pct = maxScore > 0 ? Math.min(100, Math.max(0, (score / maxScore) * 100)) : 0;
  const activeIndex = bands.findIndex((b) => score >= b.from && score <= b.to);

  return (
    <section className="mt-12 rounded-2xl bg-white p-6 ring-1 ring-brand-purple/10 print:ring-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-purple/70">
          Scoring guide · {clinicalName}
        </h2>
        <span className="text-[11.5px] text-brand-purple-dark/45">
          {lowerIsBetter
            ? "Higher totals indicate greater difficulty"
            : "Reverse-scored: lower totals indicate greater difficulty"}
        </span>
      </div>

      {/* Gauge */}
      <div className="mt-6">
        <div className="flex h-2 w-full overflow-hidden rounded-full">
          {bands.map((b, i) => {
            const width = ((b.to - b.from + 1) / (maxScore + 1)) * 100;
            const isActive = i === activeIndex;
            return (
              <span
                key={`${b.label}-${i}`}
                title={`${b.label} · ${b.from}–${b.to}`}
                style={{
                  width: `${width}%`,
                  opacity: isActive ? 1 : 0.18 + i * 0.06,
                }}
                className="block h-full bg-brand-purple"
              />
            );
          })}
        </div>
        <div className="relative mt-2 h-6">
          <div
            className="absolute -translate-x-1/2 whitespace-nowrap text-[11.5px] font-semibold tabular-nums text-brand-purple-dark"
            style={{ left: `${pct}%` }}
          >
            <span className="mx-auto mb-1 block h-2 w-px bg-brand-purple-dark/40" />
            {score}
          </div>
          <span className="absolute right-0 top-3 text-[11px] text-brand-purple-dark/35 tabular-nums">
            {maxScore}
          </span>
        </div>
      </div>

      {/* Band table */}
      <ol className="mt-5 divide-y divide-brand-purple/10 border-t border-brand-purple/10">
        {bands.map((b, i) => {
          const isActive = i === activeIndex;
          return (
            <li
              key={`${b.label}-row-${i}`}
              className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 px-2 py-3 ${
                isActive ? "rounded-lg bg-brand-lavender/40" : ""
              }`}
            >
              <span className="w-16 flex-none text-[12.5px] font-semibold tabular-nums text-brand-purple-dark/70">
                {b.from === b.to ? b.from : `${b.from}–${b.to}`}
              </span>
              <span
                className={`flex w-44 flex-none flex-wrap items-center gap-2 text-[13px] ${
                  isActive
                    ? "font-semibold text-brand-purple-dark"
                    : "font-medium text-brand-purple-dark/70"
                }`}
              >
                <span>{b.label}</span>
                {isActive && (
                  <span className="whitespace-nowrap rounded-full bg-brand-purple px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-white">
                    This result
                  </span>
                )}
              </span>
              <span className="min-w-[12rem] flex-1 text-[12.5px] leading-relaxed text-brand-purple-dark/55">
                {b.explanation}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
