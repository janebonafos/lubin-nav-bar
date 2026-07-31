import { useEffect, useMemo, useState } from "react";
import { ChevronRight, ChevronDown, AlertTriangle, Check, X } from "lucide-react";
import { useReviewedFlags, type ReviewMeta } from "@/lib/provider-brief/reviewedFlagsStore";
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
  appointmentId,
}: {
  attempts: Attempt[];
  clientName?: string;
  appointmentId?: string;
}) {
  const groups = useMemo(() => groupAttemptsByAssessment(attempts), [attempts]);
  const [openId, setOpenId] = useState<string | null>(null);
  const { reviewedIds, reviewMeta, markReviewed } = useReviewedFlags(appointmentId);
  const [providerName, setProviderName] = useState<string | undefined>(undefined);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("lubin.providerProfile.v1");
      if (raw) {
        const parsed = JSON.parse(raw) as { name?: string; displayName?: string };
        setProviderName(parsed.displayName || parsed.name || undefined);
      }
    } catch {
      /* noop */
    }
  }, []);
  const active = groups.find((g) => g.assessmentId === openId) ?? null;
  const firstName = clientName?.split(" ")[0] ?? "The client";

  if (groups.length === 0) return null;

  return (
    <>
      <div className="divide-y divide-[#EAE2F6] border-y border-[#EAE2F6]">
        {groups.map((g) => {
          const trend = trendWord(g);
          const span = spanLabel(g);
          const flaggedAttempts = g.attempts.filter((a) => safetyResponse(a));
          const flaggedIds = flaggedAttempts.map((a) => a.id);
          const hasUnreviewedFlag = flaggedIds.some((id) => !reviewedIds.has(id));
          const allFlaggedReviewed = flaggedIds.length > 0 && !hasUnreviewedFlag;
          return (
            <div key={g.assessmentId} className="group flex w-full items-start gap-3 py-5">
              <button
                type="button"
                onClick={() => setOpenId(g.assessmentId)}
                className="min-w-0 flex-1 text-left"
              >
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="truncate text-[14px] font-semibold text-[#2C2B4B]">
                    {g.friendlyName} ({g.clinicalName})
                  </span>
                  {hasUnreviewedFlag && (
                    <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-tight text-[#C27800]">
                      <AlertTriangle className="h-3 w-3" />
                      Review needed
                    </span>
                  )}
                  {allFlaggedReviewed && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#F4ECFB] px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight text-[#5A4A8A]">
                      <Check className="h-3 w-3" />
                      Reviewed
                    </span>
                  )}
                </span>
                <span className="mt-1 block text-[13px] leading-relaxed text-[#7E6BAF]">
                  {g.attempts.length} result{g.attempts.length === 1 ? "" : "s"}
                  {g.latest.status?.label ? ` · Latest: ${g.latest.status.label}` : ""}
                  {trend && span ? ` · ${trend} over ${span}` : ""}
                </span>
              </button>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {hasUnreviewedFlag && (
                  <button
                    type="button"
                    onClick={() => setOpenId(g.assessmentId)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#E4DCF3] bg-[#FBF9FF] px-2.5 py-1 text-[11px] font-semibold text-[#6B5A9A] transition hover:bg-[#F4F0FB] active:scale-[0.98]"
                  >
                    View response
                  </button>
                )}
                <span className="hidden items-center gap-1 text-[13px] font-semibold text-[#6E4FD3] transition-opacity sm:flex sm:opacity-0 sm:group-hover:opacity-100">
                  View trend
                  <ChevronRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <Sheet open={!!active} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto border-l-[#EFEAF8] bg-white p-0 sm:w-[520px] sm:max-w-[560px] [&>button]:hidden"
        >
          {active && (
            <GroupDetail
              group={active}
              firstName={firstName}
              reviewedIds={reviewedIds}
              markReviewed={markReviewed}
              reviewMeta={reviewMeta}
              providerName={providerName}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function GroupDetail({
  group,
  firstName,
  reviewedIds,
  markReviewed,
  reviewMeta,
  providerName,
}: {
  group: AssessmentGroup;
  firstName: string;
  reviewedIds: Set<string>;
  markReviewed: (attemptIds: string | string[], by?: string) => void;
  reviewMeta: Record<string, ReviewMeta>;
  providerName?: string;
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
  const countFor = (days: number | null) =>
    days === null
      ? totalCount
      : group.attempts.filter((a) => a.takenAt >= Date.now() - days * DAY).length;
  // A filter is only offered when it would leave enough results to be useful.
  const usableRanges = RANGES.filter((r) => countFor(r.days) >= 3);
  const showFilters = totalCount >= 3 && usableRanges.length >= 2;

  const shown = inRange.length;
  const mode: 1 | 2 | 3 = shown < 2 ? 1 : shown === 2 ? 2 : 3;
  const singleInPeriod = totalCount >= 2 && shown < 2;
  const initialRows = 5;

  const latest = inRange[0] ?? group.latest;
  const oldest = inRange[inRange.length - 1];
  const previous = inRange[1] ?? null;
  const change = inRange.length > 1 && oldest ? latest.score - oldest.score : null;
  const ranges = useMemo(
    () => getScoreRanges(group.assessmentId, group.maxScore, group.lowerIsBetter),
    [group.assessmentId, group.maxScore, group.lowerIsBetter],
  );
  const flagged = group.attempts.filter((a) => safetyResponse(a));
  const inRangeIds = useMemo(() => new Set(inRange.map((a) => a.id)), [inRange]);
  const toggleFlag = (id: string) => {
    setOpenFlagId((prev) => (prev === id ? null : id));
    // Make sure the matching Result history row is reachable.
    setShowAll(true);
  };
  const flaggedIds = new Set(flagged.map((a) => a.id));
  const unreviewedFlagIds = new Set([...flaggedIds].filter((id) => !reviewedIds.has(id)));
  const allFlaggedReviewed = flaggedIds.size > 0 && unreviewedFlagIds.size === 0;
  const markAllReviewed = () => markReviewed([...flaggedIds], providerName);

  return (
    <div className="flex min-h-full flex-col">
      <SheetHeader className="sticky top-0 z-10 border-b border-[#F1EDF9] bg-white px-5 py-4 text-left sm:px-7">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <SheetTitle className="text-[16px] font-semibold text-[#2C2B4B]">
              {group.friendlyName} ({group.clinicalName})
            </SheetTitle>
            <SheetDescription className="text-[12.5px] text-[#8B85A6]">
              {totalCount} result{totalCount === 1 ? "" : "s"} recorded · scored out of{" "}
              {group.maxScore}
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
            outsidePeriod={range !== "all" && !flagged.some((a) => inRangeIds.has(a.id))}
            onShowAllTime={() => {
              setRange("all");
              setVisible(10);
              setShowAll(true);
            }}
            reviewedIds={reviewedIds}
            onMarkAllReviewed={markAllReviewed}
            reviewMeta={reviewMeta}
          />
        )}

        {/* Range filters — only when enough results make them useful */}
        {showFilters && (
          <div className="flex flex-wrap gap-1.5">
            {usableRanges.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => {
                  setRange(r.key);
                  setVisible(10);
                  setShowAll(false);
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

        {/* 1 result — no graph */}
        {mode === 1 && (
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
              Score history will appear after more assessments are completed.
            </p>
          </div>
        )}

        {/* 2 results — simple comparison, no graph */}
        {mode === 2 && previous && (
          <div className="min-w-0 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ResultBlock
                label="Previous result"
                attempt={previous}
                maxScore={group.maxScore}
                flagged={flaggedIds.has(previous.id)}
                onFlagClick={toggleFlag}
              />
              <ResultBlock
                label="Latest result"
                attempt={latest}
                maxScore={group.maxScore}
                flagged={flaggedIds.has(latest.id)}
                onFlagClick={toggleFlag}
              />
            </div>
            <div className="min-w-0 rounded-xl border border-[#EDE7F8] bg-[#FBF9FF] p-4">
              <p className="text-[12px] text-[#8B85A6]">Change</p>
              <p className="mt-1 text-[17px] font-semibold text-[#2C2B4B]">
                {change === 0
                  ? "No change"
                  : `${Math.abs(change ?? 0)} point${Math.abs(change ?? 0) === 1 ? "" : "s"} ${(change ?? 0) < 0 ? "lower" : "higher"}`}
                <span className="text-[13px] font-normal text-[#7E6BAF]">
                  {" "}
                  over {Math.max(1, Math.round((latest.takenAt - previous.takenAt) / DAY))} days
                </span>
              </p>
            </div>
            <p className="text-[12.5px] leading-relaxed text-[#8B85A6]">
              Two results show a change, but more results are needed to identify a pattern.
            </p>
          </div>
        )}

        {/* 3+ results — score history graph */}
        {mode === 3 && (
          <div className="min-w-0 space-y-4">
            <ResultBlock
              label="Latest result"
              attempt={latest}
              maxScore={group.maxScore}
              flagged={flaggedIds.has(latest.id)}
              onFlagClick={toggleFlag}
            />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#3D2E6B]">Score history</p>
              <div className="mt-2">
                <TrendChart
                  attempts={inRange}
                  maxScore={group.maxScore}
                  flaggedIds={flaggedIds}
                  onFlagClick={toggleFlag}
                  ranges={ranges}
                />
              </div>
            </div>
          </div>
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
          <p className="text-[13px] font-semibold text-[#3D2E6B]">Result history</p>
          <div className="mt-2 divide-y divide-[#F4F0FB] overflow-hidden rounded-xl border border-[#EFEAF8]">
            {(showAll ? inRange.slice(0, visible) : inRange.slice(0, initialRows)).map((a) => (
              <AttemptRow
                key={a.id}
                attempt={a}
                maxScore={group.maxScore}
                group={group}
                firstName={firstName}
                expanded={openFlagId === a.id}
                onToggle={toggleFlag}
                reviewedIds={reviewedIds}
                markReviewed={markReviewed}
              />
            ))}
            {inRange.length === 0 && (
              <p className="px-4 py-4 text-[12.5px] text-[#8B85A6]">No results in this period.</p>
            )}
          </div>

          {!showAll && inRange.length > initialRows && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="mt-3 rounded-xl border border-[#E4DCF3] bg-[#FBF9FF] px-3.5 py-2 text-[12.5px] font-medium text-[#6B5A9A] transition hover:border-[#CDBFEA] hover:bg-[#F4F0FB]"
            >
              {range === "all"
                ? `View all ${inRange.length} results`
                : `View all ${inRange.length} results in this period`}
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
          This screening result supports clinical review and is not a diagnosis.
        </p>
      </div>
    </div>
  );
}

function SafetyAlert({
  group,
  flagged,
  firstName,
  openFlagId,
  onToggle,
  outsidePeriod = false,
  onShowAllTime,
  reviewedIds,
  onMarkAllReviewed,
}: {
  group: AssessmentGroup;
  flagged: AttemptWithStatus[];
  firstName: string;
  openFlagId: string | null;
  onToggle: (id: string) => void;
  outsidePeriod?: boolean;
  onShowAllTime?: () => void;
  reviewedIds: Set<string>;
  onMarkAllReviewed: () => void;
}) {
  const first = flagged[0];
  if (!first) return null;
  const s = safetyResponse(first)!;
  const open = openFlagId === first.id;
  const allReviewed = flagged.every((a) => reviewedIds.has(a.id));
  const unreviewedCount = flagged.filter((a) => !reviewedIds.has(a.id)).length;

  if (allReviewed) {
    return (
      <div className="min-w-0 space-y-2">
        <div className="rounded-xl border border-[#E4DCF3] bg-[#F7F4FD] px-4 py-3">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-[#5A4A8A]">
            <Check className="h-4 w-4 flex-none" />
            Reviewed: {group.clinicalName} question 9
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[#6B5A9A]">
            {firstName} selected “{plainLabel(s.response)}” on {fullDate(first.takenAt)}. You have
            marked this response as reviewed.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <button
              type="button"
              onClick={() => onToggle(first.id)}
              className="flex items-center gap-1 text-[12.5px] font-semibold text-[#5A4A8A]"
            >
              {open ? "Hide response" : "View response"}
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>
          </div>
          {open && <FlagDetail group={group} attempt={first} className="mt-3" />}
          {flagged.length > 1 && (
            <p className="mt-2 text-[12px] text-[#6B5A9A]">
              +{flagged.length - 1} earlier result
              {flagged.length - 1 === 1 ? "" : "s"} also reviewed — see Result history.
            </p>
          )}
        </div>
        <p className="text-[12px] leading-relaxed text-[#8B85A6]">
          Flagged because {firstName} selected a response other than “Not at all” for{" "}
          {group.clinicalName} question 9. This response has been reviewed and comes directly from{" "}
          {firstName === "The client" ? "the client’s" : `${firstName}’s`} assessment response, not
          from AI.
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-2">
      <div className="rounded-xl border border-[#F0DEC2] bg-[#FDF6EC] px-4 py-3">
        {outsidePeriod ? (
          <>
            <p className="flex items-center gap-2 text-[13px] font-semibold text-[#8A5E1A]">
              <AlertTriangle className="h-4 w-4 flex-none" />
              Earlier response to review · Outside selected period
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-[#7A5416]">
              {group.clinicalName} question 9 · {fullDate(first.takenAt)}
            </p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#7A5416]">
              {firstName} selected “{plainLabel(s.response)}.”
            </p>
          </>
        ) : (
          <>
            <p className="flex items-center gap-2 text-[13px] font-semibold text-[#8A5E1A]">
              <AlertTriangle className="h-4 w-4 flex-none" />
              Review needed: {group.clinicalName} question 9
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-[#7A5416]">
              {firstName} selected “{plainLabel(s.response)}” on the {group.friendlyName} completed{" "}
              {fullDate(first.takenAt)}.
            </p>
          </>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <button
            type="button"
            onClick={() => onToggle(first.id)}
            className="flex items-center gap-1 text-[12.5px] font-semibold text-[#8A5E1A]"
          >
            {open ? "Hide response" : "View response"}
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
          {outsidePeriod && onShowAllTime && (
            <button
              type="button"
              onClick={onShowAllTime}
              className="text-[12.5px] font-semibold text-[#8A5E1A] underline underline-offset-2"
            >
              Show in All-time chart
            </button>
          )}
          <button
            type="button"
            onClick={onMarkAllReviewed}
            className="inline-flex items-center gap-1 rounded-md bg-[#F4ECFB] px-2 py-1 text-[11.5px] font-semibold text-[#5A4A8A] transition hover:bg-[#EBE3F7] active:scale-[0.98]"
          >
            <Check className="h-3 w-3" />
            Mark as reviewed
          </button>
        </div>
        {open && <FlagDetail group={group} attempt={first} className="mt-3" />}
        {unreviewedCount > 1 && (
          <p className="mt-2 text-[12px] text-[#8A5E1A]">
            +{unreviewedCount - 1} earlier result
            {unreviewedCount - 1 === 1 ? "" : "s"} also marked for review — see Result history.
          </p>
        )}
      </div>
      <p className="text-[12px] leading-relaxed text-[#8B85A6]">
        Flagged because {firstName} selected a response other than “Not at all” for{" "}
        {group.clinicalName} question 9. This comes directly from{" "}
        {firstName === "The client" ? "the client’s" : `${firstName}’s`} assessment response, not
        from AI.
      </p>
    </div>
  );
}

function FlagDetail({
  group,
  attempt,
  className = "",
}: {
  group: AssessmentGroup;
  attempt: AttemptWithStatus;
  className?: string;
}) {
  const s = safetyResponse(attempt);
  if (!s) return null;
  const meta = ASSESSMENTS.find((a) => a.id === group.assessmentId);
  const total = meta?.questions.length ?? 9;
  const rows: [string, string][] = [
    ["Source", `${group.friendlyName} (${group.clinicalName})`],
    ["Completed", fullDate(attempt.takenAt)],
    ["Question", `9 of ${total}`],
    ["Response", plainLabel(s.response)],
  ];
  return (
    <div className={`rounded-lg border border-[#EFDCBE] bg-white/70 p-3 ${className}`}>
      <dl className="space-y-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-2 text-[12.5px] leading-relaxed">
            <dt className="w-[74px] shrink-0 text-[#A0793A]">{k}</dt>
            <dd className="min-w-0 font-medium text-[#7A5416]">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[12.5px] leading-relaxed text-[#7A5416]">“{s.text}”</p>
      <p className="mt-2 text-[12px] leading-relaxed text-[#8A5E1A]">
        This response requires separate clinical review and should not be interpreted from the total
        score or trend alone.
      </p>
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
    ? Math.max(0, ...meta.questions.map((q) => Math.max(...q.options.map((o) => o.value))))
    : 0;
  const perItemMin = meta
    ? Math.min(...meta.questions.map((q) => Math.min(...q.options.map((o) => o.value))))
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
            {group.clinicalName} contains {questionCount} question
            {questionCount === 1 ? "" : "s"}. Each response is scored from {perItemMin} to{" "}
            {perItemMax}, giving a total score from 0 to {group.maxScore}. The total is interpreted
            using {group.clinicalName} severity ranges. {firstName}’s latest responses totaled{" "}
            {latest.score}, which falls within the {latest.status?.label ?? "recorded"} range.
          </p>

          {ranges.length > 0 && (
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-[#3D2E6B]">Score ranges</p>
              <ul className="mt-1.5 space-y-1">
                {ranges.map((r) => {
                  const isCurrent = latest.score >= r.from && latest.score <= r.to;
                  return (
                    <li
                      key={`${r.from}-${r.label}`}
                      className={`text-[12.5px] leading-relaxed ${
                        isCurrent ? "font-medium text-[#5A4A8A]" : "text-[#8B85A6]"
                      }`}
                    >
                      {r.from === r.to ? r.from : `${r.from}–${r.to}`}: {r.label}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <p className="text-[12.5px] leading-relaxed text-[#8B85A6]">
            Completed {fullDate(latest.takenAt)}.
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
                      <p className="text-[12.5px] leading-relaxed text-[#2C2B4B]">{r.text}</p>
                      <p className="mt-0.5 text-[12px] text-[#8B85A6]">{plainLabel(r.response)}</p>
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
  group,
  expanded,
  onToggle,
  reviewedIds,
  markReviewed,
}: {
  attempt: AttemptWithStatus;
  maxScore: number;
  group: AssessmentGroup;
  firstName: string;
  expanded: boolean;
  onToggle: (id: string) => void;
  reviewedIds: Set<string>;
  markReviewed: (id: string | string[]) => void;
}) {
  const s = safetyResponse(attempt);
  const reviewed = s ? reviewedIds.has(attempt.id) : false;
  return (
    <div className="min-w-0 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] text-[#2C2B4B]">{fullDate(attempt.takenAt)}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-[#8B85A6]">
            <span className="truncate">{attempt.status?.label ?? "Recorded"}</span>
            {s && !reviewed && (
              <button
                type="button"
                onClick={() => onToggle(attempt.id)}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#FDF6EC] px-1.5 py-0.5 text-[10px] font-semibold text-[#8A5E1A] transition hover:bg-[#F8EBD5]"
              >
                <AlertTriangle className="h-2.5 w-2.5" />
                Review needed · Question 9
              </button>
            )}
            {s && reviewed && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#F7F4FD] px-1.5 py-0.5 text-[10px] font-semibold text-[#5A4A8A]">
                <Check className="h-2.5 w-2.5" />
                Reviewed · Question 9
              </span>
            )}
          </p>
        </div>
        <span className="shrink-0 text-[13.5px] font-medium text-[#5A4A8A]">
          {attempt.score}
          <span className="text-[11.5px] font-normal text-[#A79FC0]">/{maxScore}</span>
        </span>
      </div>
      {s && expanded && (
        <div className="mt-3 space-y-3">
          <FlagDetail group={group} attempt={attempt} />
          {!reviewed && (
            <button
              type="button"
              onClick={() => markReviewed(attempt.id)}
              className="inline-flex items-center gap-1 rounded-md bg-[#F4ECFB] px-2.5 py-1.5 text-[11.5px] font-semibold text-[#5A4A8A] transition hover:bg-[#EBE3F7] active:scale-[0.98]"
            >
              <Check className="h-3 w-3" />
              Mark as reviewed
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function TrendChart({
  attempts,
  maxScore,
  flaggedIds,
  onFlagClick,
  ranges = [],
}: {
  attempts: AttemptWithStatus[];
  maxScore: number;
  flaggedIds?: Set<string>;
  onFlagClick?: (id: string) => void;
  ranges?: { from: number; to: number; label: string }[];
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
  const bandFills = ["#F6F2FD", "#EFE8FB", "#E4D9F6", "#D8C9F1", "#CBB8EC"];
  const hasVisibleFlag = pts.some((p) => flaggedIds?.has(p.id));

  return (
    <div className="rounded-xl border border-[#EDE7F8] bg-[#FBF9FF] p-4">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Score history over time with severity ranges"
      >
        {ranges.map((r, i) => {
          const yTop = yFor(r.to);
          const yBottom = yFor(Math.max(0, r.from - 0.5));
          return (
            <rect
              key={`${r.label}-${r.from}`}
              x={PAD_L}
              y={yTop}
              width={plotW}
              height={Math.max(1, yBottom - yTop)}
              fill={bandFills[i % bandFills.length]}
            />
          );
        })}
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
            <text x={PAD_L - 6} y={yFor(v) + 3} textAnchor="end" fontSize={8} fill="#A79FC0">
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
            {flaggedIds?.has(pts[i].id) ? (
              <>
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={activeIdx === i ? 5 : 4.2}
                  fill="#F2A33C"
                  stroke="#FFFFFF"
                  strokeWidth={1.2}
                />
                <text
                  x={c.x}
                  y={c.y + 2.2}
                  textAnchor="middle"
                  fontSize={6}
                  fontWeight="bold"
                  fill="#7A5416"
                >
                  !
                </text>
              </>
            ) : (
              <circle cx={c.x} cy={c.y} r={activeIdx === i ? 3.4 : 2.4} fill="#5A4A8A" />
            )}
            <circle
              cx={c.x}
              cy={c.y}
              r={10}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setActiveIdx(i)}
              onMouseLeave={() => setActiveIdx(null)}
              onClick={() => {
                if (flaggedIds?.has(pts[i].id) && onFlagClick) {
                  onFlagClick(pts[i].id);
                  return;
                }
                setActiveIdx(activeIdx === i ? null : i);
              }}
            />
          </g>
        ))}
        {active && activeC && (
          <g pointerEvents="none">
            <rect
              x={Math.min(Math.max(activeC.x - 55, PAD_L), W - PAD_R - 110)}
              y={Math.max(activeC.y - 34, 0)}
              width={110}
              height={28}
              rx={5}
              fill="#3D2E6B"
            />
            <text
              x={Math.min(Math.max(activeC.x - 55, PAD_L), W - PAD_R - 110) + 55}
              y={Math.max(activeC.y - 34, 0) + 11.5}
              textAnchor="middle"
              fontSize={8}
              fill="#FFFFFF"
            >
              {active.score} of {maxScore}
              {active.status?.label ? ` · ${active.status.label}` : ""}
            </text>
            <text
              x={Math.min(Math.max(activeC.x - 55, PAD_L), W - PAD_R - 110) + 55}
              y={Math.max(activeC.y - 34, 0) + 22}
              textAnchor="middle"
              fontSize={7.5}
              fill="#D9CDF5"
            >
              {fullDate(active.takenAt)}
            </text>
          </g>
        )}
      </svg>
      <div className="mt-2 flex justify-between text-[11.5px] text-[#A79FC0]">
        <span>{fullDate(minT)}</span>
        <span>{fullDate(maxT)}</span>
      </div>
      {ranges.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-[#EDE7F8] pt-3">
          {ranges.map((r, i) => (
            <span
              key={`legend-${r.label}-${r.from}`}
              className="inline-flex items-center gap-1.5 text-[11px] text-[#7E6BAF]"
            >
              <span
                className="h-2.5 w-2.5 rounded-[3px]"
                style={{ background: bandFills[i % bandFills.length] }}
              />
              {r.label} ({r.from === r.to ? r.from : `${r.from}–${r.to}`})
            </span>
          ))}
          {hasVisibleFlag && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#8A5E1A]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#F2A33C]" />
              Review needed · Question 9
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function ResultBlock({
  label,
  attempt,
  maxScore,
  flagged,
  onFlagClick,
}: {
  label: string;
  attempt: AttemptWithStatus;
  maxScore: number;
  flagged?: boolean;
  onFlagClick?: (id: string) => void;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-[#EDE7F8] bg-[#FBF9FF] p-4">
      <p className="text-[12px] text-[#8B85A6]">{label}</p>
      <p className="mt-1 text-[19px] font-semibold text-[#2C2B4B]">
        {attempt.score} of {maxScore}
        {attempt.status?.label ? (
          <span className="text-[14px] font-medium text-[#5A4A8A]"> · {attempt.status.label}</span>
        ) : null}
      </p>
      <p className="mt-1 text-[12.5px] text-[#8B85A6]">{fullDate(attempt.takenAt)}</p>
      {flagged && (
        <button
          type="button"
          onClick={() => onFlagClick?.(attempt.id)}
          className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#FDF6EC] px-2 py-0.5 text-[10.5px] font-semibold text-[#8A5E1A] transition hover:bg-[#F8EBD5]"
        >
          <AlertTriangle className="h-2.5 w-2.5" />
          Review needed · Question 9
        </button>
      )}
    </div>
  );
}
