import { useMemo, useState } from "react";
import { ChevronRight, ChevronDown, AlertTriangle, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import {
  groupAttemptsByAssessment,
  labelForItem,
  type AssessmentGroup,
  type AttemptWithStatus,
} from "@/lib/patterns/grouping";
import type { Attempt } from "@/lib/patterns/types";
import { ASSESSMENTS } from "@/lib/patterns/assessments";
import { getScoreRanges } from "@/lib/patterns/scoring";

const DAY = 86_400_000;

type RangeKey = "30d" | "90d" | "6m" | "all";

const RANGES: { key: RangeKey; label: string; days: number | null }[] = [
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
  { key: "6m", label: "6 months", days: 182 },
  { key: "all", label: "All time", days: null },
];

function fullDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function shortDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/** Answer labels carry a leading emoji for the client UI; strip it here. */
function plainLabel(s: string) {
  return s.replace(/^[^\p{L}\p{N}]+/u, "").trim();
}

/** PHQ-9 item 9 safety response on any attempt (not just the latest). */
function safetyResponse(a: AttemptWithStatus) {
  if (a.assessmentId !== "phq-9") return null;
  const v = a.answers?.[8];
  if (typeof v !== "number" || v <= 0) return null;
  return labelForItem(a, "phq-9", 8);
}

function spanLabel(g: AssessmentGroup) {
  const oldest = g.attempts[g.attempts.length - 1];
  if (!oldest || g.attempts.length < 2) return null;
  const days = Math.round((g.latest.takenAt - oldest.takenAt) / DAY);
  if (days >= 330) return `${Math.round(days / 365)} year${days >= 660 ? "s" : ""}`;
  if (days >= 55) return `${Math.round(days / 30)} months`;
  return `${days} days`;
}

/** Trend across the whole recorded history, not just the last two attempts. */
function trendWord(g: AssessmentGroup) {
  const oldest = g.attempts[g.attempts.length - 1];
  if (!oldest || g.attempts.length < 2) return null;
  const change = g.latest.score - oldest.score;
  if (Math.abs(change) < 2) return "Stable";
  const better = g.lowerIsBetter ? change < 0 : change > 0;
  return better ? "Improving" : "Worsening";
}

export function AssessmentHistory({
  attempts,
  clientName,
}: {
  attempts: Attempt[];
  clientName?: string;
}) {
  const groups = useMemo(() => groupAttemptsByAssessment(attempts), [attempts]);
  const [openId, setOpenId] = useState<string | null>(null);
  const active = groups.find((g) => g.assessmentId === openId) ?? null;
  const firstName = clientName?.split(" ")[0] ?? "The client";

  if (groups.length === 0) return null;

  return (
    <>
      <div className="divide-y divide-[#EAE2F6] border-y border-[#EAE2F6]">
        {groups.map((g) => {
          const trend = trendWord(g);
          const span = spanLabel(g);
          const flagged = g.attempts.some((a) => safetyResponse(a));
          return (
            <button
              key={g.assessmentId}
              type="button"
              onClick={() => setOpenId(g.assessmentId)}
              className="group flex w-full items-center gap-3 py-5 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="truncate text-[14px] font-semibold text-[#2C2B4B]">
                    {g.friendlyName} ({g.clinicalName})
                  </span>
                  {flagged && (
                    <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-tight text-[#C27800]">
                      <AlertTriangle className="h-3 w-3" />
                      Safety response
                    </span>
                  )}
                </span>
                <span className="mt-1 block text-[13px] leading-relaxed text-[#7E6BAF]">
                  {g.attempts.length} result{g.attempts.length === 1 ? "" : "s"}
                  {g.latest.status?.label
                    ? ` · Latest: ${g.latest.status.label}`
                    : ""}
                  {trend && span ? ` · ${trend} over ${span}` : ""}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-[#6E4FD3] transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                View trend
                <ChevronRight className="h-4 w-4" />
              </span>
            </button>
          );
        })}
      </div>

      <Sheet open={!!active} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto border-l-[#EFEAF8] bg-white p-0 sm:w-[520px] sm:max-w-[560px] [&>button]:hidden"
        >
          {active && <GroupDetail group={active} firstName={firstName} />}
        </SheetContent>
      </Sheet>
    </>
  );
}

function GroupDetail({
  group,
  firstName,
}: {
  group: AssessmentGroup;
  firstName: string;
}) {
  const [range, setRange] = useState<RangeKey>("90d");
  const [showAll, setShowAll] = useState(false);
  const [visible, setVisible] = useState(10);
  const [openFlagId, setOpenFlagId] = useState<string | null>(null);

  const cutoff = RANGES.find((r) => r.key === range)?.days ?? null;
  const inRange = useMemo(
    () =>
      cutoff === null
        ? group.attempts
        : group.attempts.filter((a) => a.takenAt >= Date.now() - cutoff * DAY),
    [group.attempts, cutoff],
  );

  const totalCount = group.attempts.length;
  const singleOverall = totalCount < 2;
  const singleInPeriod = !singleOverall && inRange.length < 2;
  const showTrend = inRange.length >= 2;
  const initialRows = totalCount > 10 ? 5 : 3;

  const latest = inRange[0] ?? group.latest;
  const oldest = inRange[inRange.length - 1];
  const change =
    inRange.length > 1 && oldest ? latest.score - oldest.score : null;
  const flagged = group.attempts.filter((a) => safetyResponse(a));
  const toggleFlag = (id: string) =>
    setOpenFlagId((prev) => (prev === id ? null : id));
  const flaggedIds = new Set(flagged.map((a) => a.id));

  return (
    <div className="flex min-h-full flex-col">
      <SheetHeader className="sticky top-0 z-10 border-b border-[#F1EDF9] bg-white px-5 py-4 text-left sm:px-7">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <SheetTitle className="text-[16px] font-semibold text-[#2C2B4B]">
              {group.friendlyName} ({group.clinicalName})
            </SheetTitle>
            <SheetDescription className="text-[12.5px] text-[#8B85A6]">
              {totalCount} result{totalCount === 1 ? "" : "s"} recorded · scored
              out of {group.maxScore}
            </SheetDescription>
          </div>
          <SheetClose className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E7E0F4] bg-white text-[#6B5A9A] transition hover:bg-[#F4F0FB]">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </SheetClose>
        </div>
      </SheetHeader>

      <div className="min-w-0 space-y-6 px-5 py-6 sm:px-7">
        {flagged.length > 0 && (
          <SafetyAlert
            group={group}
            flagged={flagged}
            firstName={firstName}
            openFlagId={openFlagId}
            onToggle={toggleFlag}
          />
        )}

        {/* Latest result */}
        {singleOverall ? (
          <div className="min-w-0">
            <p className="text-[12px] text-[#8B85A6]">Latest result</p>
            <p className="mt-1 text-[20px] font-semibold text-[#2C2B4B]">
              {latest.score} of {group.maxScore}
              {latest.status?.label ? (
                <span className="text-[15px] font-medium text-[#5A4A8A]">
                  {" "}
                  · {latest.status.label}
                </span>
              ) : null}
            </p>
            <p className="mt-1 text-[12.5px] text-[#8B85A6]">
              Completed {fullDate(latest.takenAt)}
            </p>
            <p className="mt-4 text-[12.5px] leading-relaxed text-[#7E6BAF]">
              A trend will appear after this assessment is completed again.
            </p>
          </div>
        ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0 rounded-xl border border-[#EDE7F8] bg-[#FBF9FF] p-4">
            <p className="text-[12px] text-[#8B85A6]">Latest result</p>
            <p className="mt-1 text-[20px] font-semibold text-[#2C2B4B]">
              {latest.score} of {group.maxScore}
              {latest.status?.label ? (
                <span className="text-[15px] font-medium text-[#5A4A8A]">
                  {" "}
                  · {latest.status.label}
                </span>
              ) : null}
            </p>
            <p className="mt-1 text-[12.5px] text-[#8B85A6]">
              Completed {fullDate(latest.takenAt)}
            </p>
          </div>
          {change !== null && (
          <div className="min-w-0 rounded-xl border border-[#EDE7F8] bg-[#FBF9FF] p-4">
            <p className="text-[12px] text-[#8B85A6]">
              {oldest
                ? `Change since ${shortDate(oldest.takenAt)}`
                : `Change over ${RANGES.find((r) => r.key === range)?.label.toLowerCase()}`}
            </p>
            <p className="mt-1 text-[20px] font-semibold text-[#2C2B4B]">
              {change === 0
                ? "No change"
                : `${Math.abs(change)} point${Math.abs(change) === 1 ? "" : "s"} ${change < 0 ? "lower" : "higher"}`}
            </p>
            {oldest && (
              <p className="mt-1 text-[12.5px] text-[#8B85A6]">
                Latest score: {latest.score}, previously {oldest.score}
              </p>
            )}
            <p className="mt-1 text-[12.5px] text-[#5A4A8A]">
              {change === 0
                ? "Scores were the same on both assessments."
                : `Symptoms scored ${change < 0 ? "lower" : "higher"} on the latest assessment.`}
            </p>
          </div>
          )}
        </div>
        )}

        {/* Range filters + trend chart */}
        {!singleOverall && (
          <div className="flex flex-wrap gap-1.5">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => {
                  setRange(r.key);
                  setVisible(10);
                }}
                className={`rounded-full px-3 py-1.5 text-[12.5px] transition ${
                  range === r.key
                    ? "bg-[#EFE8FB] font-medium text-[#5A4A8A]"
                    : "bg-[#F7F5FC] text-[#8B85A6] hover:bg-[#F1EDF9]"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}

        {showTrend && (
          <TrendChart
            attempts={inRange}
            maxScore={group.maxScore}
            flaggedIds={flaggedIds}
            onFlagClick={toggleFlag}
          />
        )}

        {inRange.length === 2 && (
          <p className="text-[12.5px] leading-relaxed text-[#8B85A6]">
            Two results show a change, but more results are needed to establish a
            pattern.
          </p>
        )}

        {singleInPeriod && (
          <div className="min-w-0">
            <p className="text-[12.5px] leading-relaxed text-[#7E6BAF]">
              Only one result is available in this period.
            </p>
            <button
              type="button"
              onClick={() => {
                setRange("all");
                setVisible(10);
              }}
              className="mt-2 rounded-xl border border-[#E4DCF3] bg-[#FBF9FF] px-3.5 py-2 text-[12.5px] font-medium text-[#6B5A9A] transition hover:border-[#CDBFEA] hover:bg-[#F4F0FB]"
            >
              View all time
            </button>
          </div>
        )}

        {/* Result history */}
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[#3D2E6B]">
            Result history
          </p>
          <div className="mt-2 divide-y divide-[#F4F0FB] overflow-hidden rounded-xl border border-[#EFEAF8]">
            {(showAll ? inRange.slice(0, visible) : inRange.slice(0, initialRows)).map(
              (a) => (
                <AttemptRow
                  key={a.id}
                  attempt={a}
                  maxScore={group.maxScore}
                  group={group}
                  firstName={firstName}
                  expanded={openFlagId === a.id}
                  onToggle={toggleFlag}
                />
              ),
            )}
            {inRange.length === 0 && (
              <p className="px-4 py-4 text-[12.5px] text-[#8B85A6]">
                No results in this period.
              </p>
            )}
          </div>

          {!showAll && inRange.length > initialRows && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="mt-3 rounded-xl border border-[#E4DCF3] bg-[#FBF9FF] px-3.5 py-2 text-[12.5px] font-medium text-[#6B5A9A] transition hover:border-[#CDBFEA] hover:bg-[#F4F0FB]"
            >
              View all results ({inRange.length})
            </button>
          )}
          {showAll && visible < inRange.length && (
            <button
              type="button"
              onClick={() => setVisible((v) => v + 10)}
              className="mt-3 rounded-xl border border-[#E4DCF3] bg-[#FBF9FF] px-3.5 py-2 text-[12.5px] font-medium text-[#6B5A9A] transition hover:border-[#CDBFEA] hover:bg-[#F4F0FB]"
            >
              Load 10 more
            </button>
          )}
        </div>

        <HowCalculated group={group} latest={latest} firstName={firstName} />

        <p className="text-[12.5px] leading-relaxed text-[#8B85A6]">
          This is a screening result and is not a diagnosis.
        </p>
      </div>
    </div>
  );
}

function SafetyAlert({
  flagged,
  hiddenCount,
}: {
  flagged: AttemptWithStatus[];
  hiddenCount: number;
}) {
  const [open, setOpen] = useState(false);
  const first = flagged[0];
  if (!first) return null;
  return (
    <div className="rounded-xl border border-[#F0DEC2] bg-[#FDF6EC] p-4">
      <p className="flex items-center gap-2 text-[13px] font-semibold text-[#8A5E1A]">
        <AlertTriangle className="h-4 w-4 flex-none" />
        Safety-related response recorded
      </p>
      <p className="mt-1 text-[12.5px] text-[#8A5E1A]">
        {fullDate(first.takenAt)} · Review recommended
      </p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-3 flex items-center gap-1 text-[12.5px] font-semibold text-[#8A5E1A]"
      >
        {open ? "Hide response" : "View response"}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          {flagged.map((a) => {
            const s = safetyResponse(a)!;
            return (
              <div
                key={a.id}
                className="rounded-lg border border-[#EFDCBE] bg-white/70 p-3"
              >
                <p className="text-[11.5px] font-semibold uppercase tracking-tight text-[#8A5E1A]">
                  Question 9 · {fullDate(a.takenAt)}
                </p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-[#7A5416]">
                  “{s.text}”
                </p>
                <p className="mt-2 text-[11.5px] font-semibold uppercase tracking-tight text-[#8A5E1A]">
                  Response
                </p>
                <p className="mt-0.5 text-[12.5px] text-[#7A5416]">
                  {plainLabel(s.response)}
                </p>
              </div>
            );
          })}
          {hiddenCount > 0 && (
            <p className="text-[12px] text-[#8A5E1A]">
              +{hiddenCount} earlier attempt{hiddenCount === 1 ? "" : "s"} with a
              safety-related response.
            </p>
          )}
          <p className="text-[12.5px] leading-relaxed text-[#7A5416]">
            This response requires separate clinical review and should not be
            interpreted from the total score or trend alone.
          </p>
        </div>
      )}
    </div>
  );
}

function HowCalculated({
  group,
  latest,
  firstName,
}: {
  group: AssessmentGroup;
  latest: AttemptWithStatus;
  firstName: string;
}) {
  const [open, setOpen] = useState(false);
  const [showResponses, setShowResponses] = useState(false);

  const meta = ASSESSMENTS.find((a) => a.id === group.assessmentId);
  const ranges = useMemo(
    () => getScoreRanges(group.assessmentId, group.maxScore, group.lowerIsBetter),
    [group.assessmentId, group.maxScore, group.lowerIsBetter],
  );
  const questionCount = meta?.questions.length ?? 0;
  const perItemMax = meta
    ? Math.max(
        0,
        ...meta.questions.map((q) =>
          Math.max(...q.options.map((o) => o.value)),
        ),
      )
    : 0;
  const perItemMin = meta
    ? Math.min(
        ...meta.questions.map((q) =>
          Math.min(...q.options.map((o) => o.value)),
        ),
      )
    : 0;

  const responses = useMemo(() => {
    if (!meta || !latest.answers) return [];
    return meta.questions
      .map((_, i) => labelForItem(latest, group.assessmentId, i))
      .filter((r): r is NonNullable<typeof r> => !!r);
  }, [meta, latest, group.assessmentId]);
  const allowResponses = responses.length > 0;

  return (
    <div className="min-w-0 border-t border-[#F1EDF9] pt-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left"
      >
        <span className="flex-1 text-[13px] font-semibold text-[#3D2E6B]">
          How scores are calculated
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#8B85A6] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-3 space-y-4">
          <p className="text-[12.5px] leading-relaxed text-[#7E6BAF]">
            {group.clinicalName} contains {questionCount} response
            {questionCount === 1 ? "" : "s"} scored from {perItemMin} to{" "}
            {perItemMax}, giving a total score from 0 to {group.maxScore}. The
            total is interpreted using {group.clinicalName} severity ranges.{" "}
            {firstName}’s latest responses totaled {latest.score}, which falls
            within the {latest.status?.label ?? "recorded"} range.
          </p>

          {ranges.length > 0 && (
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-[#3D2E6B]">
                Score ranges
              </p>
              <ul className="mt-1.5 space-y-1">
                {ranges.map((r) => {
                  const isCurrent =
                    latest.score >= r.from && latest.score <= r.to;
                  return (
                    <li
                      key={`${r.from}-${r.label}`}
                      className={`text-[12.5px] leading-relaxed ${
                        isCurrent
                          ? "font-medium text-[#5A4A8A]"
                          : "text-[#8B85A6]"
                      }`}
                    >
                      {r.from === r.to ? r.from : `${r.from}–${r.to}`}:{" "}
                      {r.label}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <p className="text-[12.5px] leading-relaxed text-[#8B85A6]">
            Completed {fullDate(latest.takenAt)}. This screening score supports
            clinical review and is not a diagnosis.
          </p>

          {allowResponses && (
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => setShowResponses((v) => !v)}
                className="text-[12.5px] font-semibold text-[#6E4FD3]"
              >
                {showResponses ? "Hide responses" : "View responses"}
              </button>
              {showResponses && (
                <ul className="mt-2 divide-y divide-[#F4F0FB] overflow-hidden rounded-xl border border-[#EFEAF8]">
                  {responses.map((r, i) => (
                    <li key={i} className="min-w-0 px-4 py-3">
                      <p className="text-[12.5px] leading-relaxed text-[#2C2B4B]">
                        {r.text}
                      </p>
                      <p className="mt-0.5 text-[12px] text-[#8B85A6]">
                        {plainLabel(r.response)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AttemptRow({
  attempt,
  maxScore,
}: {
  attempt: AttemptWithStatus;
  maxScore: number;
}) {
  const s = safetyResponse(attempt);
  return (
    <div className="flex min-w-0 items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] text-[#2C2B4B]">
          {fullDate(attempt.takenAt)}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-[#8B85A6]">
          <span className="truncate">{attempt.status?.label ?? "Recorded"}</span>
          {s && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#FDF6EC] px-1.5 py-0.5 text-[10px] font-semibold text-[#8A5E1A]">
              <AlertTriangle className="h-2.5 w-2.5" />
              Safety-related response
            </span>
          )}
        </p>
      </div>
      <span className="shrink-0 text-[13.5px] font-medium text-[#5A4A8A]">
        {attempt.score}
        <span className="text-[11.5px] font-normal text-[#A79FC0]">
          /{maxScore}
        </span>
      </span>
    </div>
  );
}

function TrendChart({
  attempts,
  maxScore,
}: {
  attempts: AttemptWithStatus[];
  maxScore: number;
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const pts = [...attempts].sort((a, b) => a.takenAt - b.takenAt);
  if (pts.length < 2) {
    return (
      <div className="rounded-xl border border-[#EDE7F8] bg-[#FBF9FF] p-4 text-[12.5px] text-[#8B85A6]">
        Not enough results in this period to show a trend.
      </div>
    );
  }

  // Pixel-space chart with a left gutter for the score scale.
  const W = 320;
  const H = 150;
  const PAD_L = 30;
  const PAD_R = 8;
  const PAD_T = 12;
  const PAD_B = 22;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const step = maxScore <= 10 ? 2 : maxScore <= 30 ? 5 : 10;
  const ticks: number[] = [];
  for (let v = 0; v <= maxScore; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] !== maxScore) ticks.push(maxScore);

  const minT = pts[0].takenAt;
  const maxT = pts[pts.length - 1].takenAt;
  const span = Math.max(1, maxT - minT);
  const xFor = (t: number) => PAD_L + ((t - minT) / span) * plotW;
  const yFor = (s: number) =>
    PAD_T + plotH - (Math.min(Math.max(s, 0), maxScore) / maxScore) * plotH;

  const coords = pts.map((p) => ({ x: xFor(p.takenAt), y: yFor(p.score) }));
  const line = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const active = activeIdx !== null ? pts[activeIdx] : null;
  const activeC = activeIdx !== null ? coords[activeIdx] : null;

  return (
    <div className="rounded-xl border border-[#EDE7F8] bg-[#FBF9FF] p-4">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Score trend over time with score scale"
      >
        {ticks.map((v) => (
          <g key={v}>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={yFor(v)}
              y2={yFor(v)}
              stroke="#EAE2F6"
              strokeWidth={1}
            />
            <text
              x={PAD_L - 6}
              y={yFor(v) + 3}
              textAnchor="end"
              fontSize={8}
              fill="#A79FC0"
            >
              {v}
            </text>
          </g>
        ))}
        <polyline
          points={`${PAD_L},${PAD_T + plotH} ${line} ${W - PAD_R},${PAD_T + plotH}`}
          fill="#EFE8FB"
          stroke="none"
          opacity={0.7}
        />
        <polyline
          points={line}
          fill="none"
          stroke="#7E6BAF"
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
        {coords.map((c, i) => (
          <g key={i}>
            <circle
              cx={c.x}
              cy={c.y}
              r={activeIdx === i ? 3.4 : 2.4}
              fill="#5A4A8A"
            />
            <circle
              cx={c.x}
              cy={c.y}
              r={10}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setActiveIdx(i)}
              onMouseLeave={() => setActiveIdx(null)}
              onClick={() => setActiveIdx(activeIdx === i ? null : i)}
            />
          </g>
        ))}
        {active && activeC && (
          <g pointerEvents="none">
            <rect
              x={Math.min(Math.max(activeC.x - 34, PAD_L), W - PAD_R - 68)}
              y={Math.max(activeC.y - 26, 0)}
              width={68}
              height={20}
              rx={5}
              fill="#3D2E6B"
            />
            <text
              x={Math.min(Math.max(activeC.x - 34, PAD_L), W - PAD_R - 68) + 34}
              y={Math.max(activeC.y - 26, 0) + 13.5}
              textAnchor="middle"
              fontSize={8}
              fill="#FFFFFF"
            >
              {active.score} · {shortDate(active.takenAt)}
            </text>
          </g>
        )}
      </svg>
      <div className="mt-2 flex justify-between text-[11.5px] text-[#A79FC0]">
        <span>{fullDate(minT)}</span>
        <span>{fullDate(maxT)}</span>
      </div>
    </div>
  );
}
