import { useMemo, useState } from "react";
import { ChevronRight, AlertTriangle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  groupAttemptsByAssessment,
  labelForItem,
  type AssessmentGroup,
  type AttemptWithStatus,
} from "@/lib/patterns/grouping";
import type { Attempt } from "@/lib/patterns/types";

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

export function AssessmentHistory({ attempts }: { attempts: Attempt[] }) {
  const groups = useMemo(() => groupAttemptsByAssessment(attempts), [attempts]);
  const [openId, setOpenId] = useState<string | null>(null);
  const active = groups.find((g) => g.assessmentId === openId) ?? null;

  if (groups.length === 0) return null;

  return (
    <>
      <div className="divide-y divide-[#EFEAF9] border-y border-[#EFEAF9]">
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
                  <span className="truncate text-[14px] font-semibold text-[#3D2E6B]">
                    {g.friendlyName} ({g.clinicalName})
                  </span>
                  {flagged && (
                    <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-tight text-[#C27800]">
                      <AlertTriangle className="h-3 w-3" />
                      Safety response
                    </span>
                  )}
                </span>
                <span className="mt-1 block text-[12px] leading-relaxed text-[#7A73A0]">
                  {g.attempts.length} result{g.attempts.length === 1 ? "" : "s"}
                  {g.latest.status?.label
                    ? ` · Latest: ${g.latest.status.label}`
                    : ""}
                  {trend && span ? ` · ${trend} over ${span}` : ""}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-[12px] font-semibold text-[#7E6BAF] transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
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
          className="w-full overflow-y-auto border-l-[#EFEAF8] bg-white p-0 sm:max-w-xl"
        >
          {active && <GroupDetail group={active} />}
        </SheetContent>
      </Sheet>
    </>
  );
}

function GroupDetail({ group }: { group: AssessmentGroup }) {
  const [range, setRange] = useState<RangeKey>("90d");
  const [showAll, setShowAll] = useState(false);
  const [visible, setVisible] = useState(10);

  const cutoff = RANGES.find((r) => r.key === range)?.days ?? null;
  const inRange = useMemo(
    () =>
      cutoff === null
        ? group.attempts
        : group.attempts.filter((a) => a.takenAt >= Date.now() - cutoff * DAY),
    [group.attempts, cutoff],
  );

  const latest = inRange[0] ?? group.latest;
  const oldest = inRange[inRange.length - 1];
  const change =
    inRange.length > 1 && oldest ? latest.score - oldest.score : null;
  const changeGood =
    change === null || change === 0
      ? null
      : group.lowerIsBetter
        ? change < 0
        : change > 0;

  const flagged = group.attempts.filter((a) => safetyResponse(a));
  const flaggedShown = flagged.slice(0, 3);

  return (
    <div className="flex min-h-full flex-col">
      <SheetHeader className="sticky top-0 z-10 space-y-1 border-b border-[#F1EDF9] bg-white px-5 py-4 text-left sm:px-7">
        <SheetTitle className="pr-8 text-[16px] font-semibold text-[#2C2B4B]">
          {group.friendlyName} ({group.clinicalName})
        </SheetTitle>
        <SheetDescription className="text-[12.5px] text-[#8B85A6]">
          {group.attempts.length} result
          {group.attempts.length === 1 ? "" : "s"} recorded · scored out of{" "}
          {group.maxScore}
        </SheetDescription>
      </SheetHeader>

      <div className="min-w-0 space-y-6 px-5 py-6 sm:px-7">
        {flagged.length > 0 && (
          <div className="rounded-xl border border-[#F0DEC2] bg-[#FDF6EC] p-4">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-[#8A5E1A]">
              <AlertTriangle className="h-4 w-4 flex-none" />
              Safety-related response
            </p>
            <ul className="mt-2 space-y-1.5">
              {flaggedShown.map((a) => {
                const s = safetyResponse(a)!;
                return (
                  <li
                    key={a.id}
                    className="text-[12.5px] leading-relaxed text-[#7A5416]"
                  >
                    {fullDate(a.takenAt)} — “{s.text}”: {s.response}
                  </li>
                );
              })}
            </ul>
            {flagged.length > flaggedShown.length && (
              <p className="mt-2 text-[12px] text-[#8A5E1A]">
                +{flagged.length - flaggedShown.length} earlier attempt
                {flagged.length - flaggedShown.length === 1 ? "" : "s"} with a
                safety-related response.
              </p>
            )}
          </div>
        )}

        {/* Range filters */}
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

        {/* Trend chart */}
        <TrendChart attempts={inRange} maxScore={group.maxScore} />

        {/* Latest + change */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0 rounded-xl border border-[#EDE7F8] bg-[#FBF9FF] p-4">
            <p className="text-[12px] text-[#8B85A6]">Latest score</p>
            <p className="mt-1 text-[20px] font-semibold text-[#2C2B4B]">
              {latest.score}
              <span className="text-[13px] font-normal text-[#8B85A6]">
                {" "}
                / {group.maxScore}
              </span>
            </p>
            {latest.status?.label && (
              <p className="mt-1 text-[12.5px] text-[#5A4A8A]">
                {latest.status.label} · {fullDate(latest.takenAt)}
              </p>
            )}
          </div>
          <div className="min-w-0 rounded-xl border border-[#EDE7F8] bg-[#FBF9FF] p-4">
            <p className="text-[12px] text-[#8B85A6]">
              Change over {RANGES.find((r) => r.key === range)?.label.toLowerCase()}
            </p>
            <p className="mt-1 text-[20px] font-semibold text-[#2C2B4B]">
              {change === null
                ? "—"
                : `${change > 0 ? "+" : ""}${change} point${Math.abs(change) === 1 ? "" : "s"}`}
            </p>
            <p className="mt-1 text-[12.5px] text-[#5A4A8A]">
              {change === null
                ? "Not enough results in this period"
                : changeGood === null
                  ? "No meaningful change"
                  : changeGood
                    ? "Moving in a better direction"
                    : "Moving in a harder direction"}
            </p>
          </div>
        </div>

        {/* Recent attempts */}
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[#3D2E6B]">
            {showAll ? "All results" : "Three most recent"}
          </p>
          <div className="mt-2 divide-y divide-[#F4F0FB] overflow-hidden rounded-xl border border-[#EFEAF8]">
            {(showAll ? inRange.slice(0, visible) : inRange.slice(0, 3)).map(
              (a) => (
                <AttemptRow key={a.id} attempt={a} maxScore={group.maxScore} />
              ),
            )}
            {inRange.length === 0 && (
              <p className="px-4 py-4 text-[12.5px] text-[#8B85A6]">
                No results in this period.
              </p>
            )}
          </div>

          {!showAll && inRange.length > 3 && (
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
      </div>
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
        <p className="mt-0.5 truncate text-[12px] text-[#8B85A6]">
          {attempt.status?.label ?? "Recorded"}
          {s ? " · safety response flagged" : ""}
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
  const pts = [...attempts].sort((a, b) => a.takenAt - b.takenAt);
  const W = 100;
  const H = 40;
  if (pts.length < 2) {
    return (
      <div className="rounded-xl border border-[#EDE7F8] bg-[#FBF9FF] p-4 text-[12.5px] text-[#8B85A6]">
        Not enough results in this period to show a trend.
      </div>
    );
  }
  const minT = pts[0].takenAt;
  const maxT = pts[pts.length - 1].takenAt;
  const span = Math.max(1, maxT - minT);
  const coords = pts.map((p) => ({
    x: ((p.takenAt - minT) / span) * W,
    y: H - (Math.min(p.score, maxScore) / maxScore) * H,
  }));
  const line = coords.map((c) => `${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(" ");
  return (
    <div className="rounded-xl border border-[#EDE7F8] bg-[#FBF9FF] p-4">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-28 w-full"
        role="img"
        aria-label="Score trend over time"
      >
        <polyline
          points={`0,${H} ${line} ${W},${H}`}
          fill="#EFE8FB"
          stroke="none"
          opacity={0.7}
        />
        <polyline
          points={line}
          fill="none"
          stroke="#7E6BAF"
          strokeWidth={1.2}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={1.1} fill="#5A4A8A" />
        ))}
      </svg>
      <div className="mt-2 flex justify-between text-[11.5px] text-[#A79FC0]">
        <span>{fullDate(minT)}</span>
        <span>{fullDate(maxT)}</span>
      </div>
    </div>
  );
}
