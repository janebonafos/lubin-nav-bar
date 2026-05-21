import type { SummaryData } from "@/lib/share/summary";
import { ASSESSMENTS } from "@/lib/patterns/assessments";

export function MoodPatternsSection({ summary }: { summary: SummaryData }) {
  return (
    <section className="rounded-2xl border border-brand-purple/15 bg-white p-5">
      <h3 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-brand-purple">
        Mood patterns
      </h3>
      <p className="mt-2 text-sm text-brand-purple-dark/80 leading-relaxed">
        Overall mood: <strong>{summary.moodLabel}</strong> · Stress:{" "}
        <strong>{summary.stressLabel}</strong> · Direction:{" "}
        <strong>{summary.directionLabel}</strong>
      </p>
    </section>
  );
}

export function KeyTopicsSection({ summary }: { summary: SummaryData }) {
  if (summary.themes.length === 0) return null;
  return (
    <section className="rounded-2xl border border-brand-purple/15 bg-white p-5">
      <h3 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-brand-purple">
        Key topics
      </h3>
      <ul className="mt-3 flex flex-wrap gap-2">
        {summary.themes.map((t) => (
          <li
            key={t.label}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#F4F0FB] px-3 py-1 text-xs font-medium text-[#3D2E6B]"
          >
            {t.label}
            <span className="text-[10px] font-semibold text-[#5A4A8A]">
              {t.count}×
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AssessmentsSection({ summary }: { summary: SummaryData }) {
  if (summary.attemptsInRange.length === 0) return null;
  return (
    <section className="rounded-2xl border border-brand-purple/15 bg-white p-5">
      <h3 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-brand-purple">
        Assessment results
      </h3>
      <ul className="mt-3 space-y-2">
        {summary.attemptsInRange.map((a) => {
          const meta = ASSESSMENTS.find((x) => x.id === a.assessmentId);
          return (
            <li
              key={a.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-[#FAF8FD] px-3 py-2 text-sm"
            >
              <span className="font-medium text-[#3D2E6B]">
                {meta?.name ?? a.assessmentName}
              </span>
              <span className="text-xs text-[#5A4A8A]">
                {new Date(a.takenAt).toLocaleDateString()}
              </span>
              <span className="text-sm font-semibold text-[#7E6BAF]">
                {a.score}
                {meta ? ` / ${meta.maxScore}` : ""}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function CheckinCountSection({ summary }: { summary: SummaryData }) {
  return (
    <section className="rounded-2xl border border-brand-purple/15 bg-white p-5">
      <h3 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-brand-purple">
        Check-in count
      </h3>
      <p className="mt-2 text-sm text-brand-purple-dark/80">
        <strong>{summary.checkinsInRange.length}</strong> check-ins logged in{" "}
        {summary.rangeLabel.toLowerCase()}.
      </p>
    </section>
  );
}

export function NarrativeSection({ summary }: { summary: SummaryData }) {
  return (
    <section className="rounded-2xl border border-brand-purple/15 bg-white p-5">
      <h3 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-brand-purple">
        General feeling summary
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-brand-purple-dark/80">
        {summary.insight}
      </p>
    </section>
  );
}

export function PrivacyFooter() {
  return (
    <p className="mt-6 text-center text-xs italic text-[#5A4A8A]">
      Voluntarily shared and self-reported. Not a clinical diagnosis. Chat
      conversations and private notes are never shared.
    </p>
  );
}

export function renderIncluded(summary: SummaryData, includedKeys: string[]) {
  const has = (k: string) => includedKeys.includes(k);
  return (
    <div className="space-y-4">
      {has("narrative") && <NarrativeSection summary={summary} />}
      {has("mood") && <MoodPatternsSection summary={summary} />}
      {has("topics") && <KeyTopicsSection summary={summary} />}
      {has("assessments") && <AssessmentsSection summary={summary} />}
      {has("checkinCount") && <CheckinCountSection summary={summary} />}
    </div>
  );
}