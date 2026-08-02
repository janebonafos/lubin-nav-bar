import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, ChevronRight } from "lucide-react";
import { AssessmentHistory } from "@/components/appointment/AssessmentHistory";
import { getAnyProviderGrant } from "@/lib/share/providerShareStore";
import { seedDemoSharedGrant } from "@/lib/share/demoSharedGrant";
import {
  loadBrief,
  saveBrief,
  subscribeBriefChanges,
  isStale,
  BRIEF_SECTION_ORDER,
  type ProviderBrief,
  type BriefBullet,
} from "@/lib/provider-brief/store";
import { ASSESSMENTS } from "@/lib/patterns/assessments";
import { getAssessmentStatus } from "@/lib/patterns/scoring";
import type { Assessment } from "@/lib/patterns/types";
import { groupAttemptsByAssessment } from "@/lib/patterns/grouping";

type Props = {
  appointmentId: string;
  providerName?: string;
  appointmentLabel?: string;
  clientName?: string;
  onViewSupporting?: () => void;
  onViewAssessments?: () => void;
  onViewTimeline?: () => void;
};

export function AiProviderBrief({
  appointmentId,
  providerName,
  appointmentLabel,
  clientName,
  onViewSupporting,
  onViewAssessments,
  onViewTimeline,
}: Props) {
  const [brief, setBrief] = useState<ProviderBrief | null>(() => loadBrief(appointmentId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  useEffect(() => {
    setBrief(loadBrief(appointmentId));
    return subscribeBriefChanges(() => setBrief(loadBrief(appointmentId)));
  }, [appointmentId]);

  const grant = useMemo(
    () => getAnyProviderGrant(appointmentId),
    [appointmentId, brief?.generatedAt, refreshKey],
  );

  const sharedAt = grant?.updatedAt ?? grant?.createdAt ?? 0;
  const stale = grant ? isStale(brief, sharedAt) : false;

  const generate = useCallback(async () => {
    if (!grant || grant.revoked) return;
    setBusy(true);
    setError(null);
    try {
      const snap = grant.snapshot;
      const included = new Set(grant.includedKeys);
      const includeAssessments = included.has("assessments");
      const includeConversations = included.has("conversations");

      // Group by clinical tool so the model can talk about change over time
      // per instrument (e.g. PHQ-9 across 3 attempts) rather than treating
      // each attempt as an independent instrument.
      const groups = includeAssessments ? groupAttemptsByAssessment(snap.attemptsInRange) : [];
      const assessmentPayload = groups.map((g) => ({
        name: g.friendlyName,
        clinicalName: g.clinicalName,
        resultCount: g.attempts.length,
        latestScore: g.latest.score,
        latestStatusLabel: g.latest.status?.label,
        latestStatusKind: g.latest.status?.kind,
        latestTakenAt: g.latest.takenAt,
        previousScore: g.previous?.score ?? null,
        previousTakenAt: g.previous?.takenAt ?? null,
        change: g.change,
        direction: g.direction, // increased | decreased | stable | null
        improving: g.improving, // true = clinically improving, false = worsening, null = n/a
        history: g.attempts.map((a) => ({
          score: a.score,
          takenAt: a.takenAt,
          statusLabel: a.status?.label,
        })),
        safetyFlag: g.safetyFlag
          ? {
              itemIndex: g.safetyFlag.itemIndex,
              itemText: g.safetyFlag.itemText,
              response: g.safetyFlag.response,
              date: g.safetyFlag.date,
            }
          : null,
      }));

      const res = await fetch("/api/generate-provider-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerName,
          appointmentLabel,
          rangeLabel: snap.rangeLabel,
          sharedKeys: grant.includedKeys,
          includeConversations,
          snapshot: {
            moodLabel: snap.moodLabel,
            directionLabel: snap.directionLabel,
            stressLabel: snap.stressLabel,
            themes: snap.themes,
            insight: snap.insight,
            checkinCount: snap.checkinsInRange.length,
            latestCheckinDate: snap.checkinsInRange[0]?.date,
          },
          assessments: assessmentPayload,
          conversationsSummary: includeConversations ? snap.insight : undefined,
          medications: [],
          patientGoals: [],
        }),
      });
      const data = (await res.json()) as {
        sections?: ProviderBrief["sections"];
        error?: string;
      };
      if (!res.ok || !data.sections) {
        setError(data.error ?? "Could not generate the brief. Please try again.");
        return;
      }
      const next: ProviderBrief = {
        version: (brief?.version ?? 0) + 1,
        generatedAt: Date.now(),
        sharedAt,
        sections: data.sections,
      };
      saveBrief(appointmentId, next);
      setBrief(next);
    } catch (e) {
      console.error(e);
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }, [grant, providerName, appointmentLabel, sharedAt, appointmentId, brief?.version]);

  // No share yet — the brief cannot exist.
  if (!grant || grant.revoked || grant.includedKeys.length === 0) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-dashed border-[#E1D9F1] bg-[#FBF9FF] p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-[#3D2E6B]">Shared Health Passport</p>
            <span className="w-fit rounded-full bg-[#F0EEF6] px-2.5 py-1 text-[10px] font-semibold text-[#6B6684]">
              Not shared
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[#6B6684]">
            The client hasn't shared their Health Passport for this appointment yet. Nothing is
            wrong — sharing is optional and client-controlled.
          </p>
        </div>

        <div className="rounded-2xl border border-dashed border-[#E1D9F1] bg-[#FBF9FF] p-5 opacity-80">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-[#3D2E6B]">AI Provider Brief</p>
            <span className="w-fit rounded-full bg-[#F0EEF6] px-2.5 py-1 text-[10px] font-semibold text-[#6B6684]">
              Unavailable
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[#6B6684]">
            A brief can't be generated until Health Passport information is shared. No action is
            required from you.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            seedDemoSharedGrant({
              appointmentId,
              providerName: providerName ?? "Your provider",
              appointmentLabel: appointmentLabel ?? "",
            });
            setRefreshKey((k) => k + 1);
          }}
          className="w-full rounded-xl border border-dashed border-[#D6CCEC] bg-white px-3 py-2 text-[11px] font-semibold text-[#7E6BAF] transition hover:border-[#7E6BAF] hover:bg-[#F7F4FB]"
        >
          Preview shared view (demo data)
        </button>
      </div>
    );
  }

  const snap = grant.snapshot;
  const firstName = clientName?.split(" ")[0] ?? "the client";

  return (
    <section className="rounded-2xl border border-[#EAE2F6] bg-white px-5 pt-6 pb-8 shadow-[0_1px_2px_rgba(61,46,107,0.04)] sm:px-8 sm:pt-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[#7E6BAF]">
          <span className="shrink-0 rounded-full bg-[#EFE8FB] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#3D2E6B]">
            Provider only
          </span>
          <span>Check-in overview · {snap.rangeLabel}</span>
          <span className="text-[#A89BD0]">·</span>
          <button
            type="button"
            onClick={() => setAboutOpen((v) => !v)}
            className="underline decoration-[#D8C7F0] underline-offset-4 transition hover:text-[#3D2E6B]"
          >
            About this overview
          </button>
        </p>
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="inline-flex w-fit shrink-0 items-center gap-1.5 text-[13px] font-semibold text-[#6E4FD3] transition hover:text-[#3D2E6B] disabled:opacity-60"
        >
          {busy && <Loader2 className="h-3 w-3 animate-spin" />}
          Refresh
        </button>
      </div>

      {aboutOpen && (
        <p className="mt-4 max-w-[620px] border-l-2 border-[#EAE2F6] pl-4 text-[13px] leading-relaxed text-[#7E6BAF]">
          Created from information {firstName} chose to share. Review before using it in your
          clinical assessment.
        </p>
      )}

      {stale && brief && (
        <p className="mt-4 rounded-md border border-[#EAE2F6] bg-[#F7F4FD] p-3 text-[12px] leading-relaxed text-[#5A4A8A]">
          {firstName} shared updated information. Refresh the overview to see the latest.
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{error}</p>
      )}

      <div className="mt-6 max-w-[620px]">
        <p className="text-[15px] leading-relaxed text-[#2C2B4B]">{snap.insight}</p>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        <PatternChip label="Mood" value={snap.moodLabel} />
        <PatternChip label="Stress" value={snap.stressLabel} />
        <PatternChip label="Trend" value={snap.directionLabel} />
      </div>

      {brief && (
        <details className="mt-8">
          <summary className="cursor-pointer list-none text-[12px] font-medium text-[#6B6B6B] hover:text-[#1A1A1A]">
            Show full overview
          </summary>
          <div className="mt-3 space-y-3">
            {BRIEF_SECTION_ORDER.map(({ key, label }, idx) => (
              <BriefSection
                key={key}
                index={idx + 1}
                label={label}
                bullets={brief.sections[key] ?? []}
              />
            ))}
          </div>
        </details>
      )}

      {snap.attemptsInRange.length > 0 && (
        <div className="mt-10 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#A89BD0]">
            Shared assessment history
          </p>
          <p className="mt-1 text-[13px] leading-snug text-[#7E6BAF]">
            Select a result to view trend and history details.
          </p>
          <div className="mt-5">
            <AssessmentHistory
              attempts={snap.attemptsInRange}
              clientName={clientName}
              appointmentId={appointmentId}
            />
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-col">
        <HistoryRow
          label="Check-in timeline"
          open={timelineOpen}
          onClick={() => {
            setTimelineOpen((v) => !v);
            onViewTimeline?.();
          }}
          divider
        />
        {timelineOpen && (
          <div className="border-b border-[#EAE2F6] pb-4">
            {snap.checkinsInRange.length === 0 ? (
              <p className="text-[13px] text-[#7E6BAF]">
                No check-ins were shared for this period.
              </p>
            ) : (
              <ul className="space-y-3">
                {snap.checkinsInRange.slice(0, 12).map((c) => (
                  <li key={c.id} className="flex gap-3">
                    <span className="mt-0.5 w-24 shrink-0 text-[12px] font-semibold text-[#5A4A8A]">
                      {formatDay(c.date)}
                    </span>
                    <span className="min-w-0 flex-1 text-[13px] leading-snug text-[#2C2B4B]">
                      Mood {c.mood}/5
                      {c.note ? (
                        <span className="block text-[#7E6BAF]">“{c.note}”</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {snap.checkinsInRange.length > 12 && (
              <p className="mt-3 text-[12px] text-[#A89BD0]">
                Showing the 12 most recent of {snap.checkinsInRange.length} check-ins.
              </p>
            )}
          </div>
        )}
        <HistoryRow
          label="Information used for this overview"
          open={sourcesOpen}
          onClick={() => {
            setSourcesOpen((v) => !v);
            onViewSupporting?.();
          }}
        />
        {sourcesOpen && (
          <div className="pt-1">
            <ul className="space-y-2 text-[13px] leading-snug text-[#2C2B4B]">
              <li>
                <span className="font-semibold">Period:</span> {snap.rangeLabel}
                {snap.dateSpan ? ` · ${snap.dateSpan}` : ""}
              </li>
              <li>
                <span className="font-semibold">Check-ins:</span>{" "}
                {snap.checkinsInRange.length} shared
              </li>
              <li>
                <span className="font-semibold">Assessment results:</span>{" "}
                {snap.attemptsInRange.length} shared
              </li>
              <li>
                <span className="font-semibold">Shared by {firstName}:</span>{" "}
                {grant.includedKeys.join(", ") || "nothing"}
              </li>
            </ul>
            <p className="mt-3 text-[12px] leading-relaxed text-[#7E6BAF]">
              This overview only uses the information above. It is a summary, not a
              diagnosis — review it before using it clinically.
            </p>
          </div>
        )}
      </div>

    </section>
  );
}

function PatternChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#EAE2F6] bg-[#F4EEFC] px-3.5 py-1.5 text-[13px] text-[#7E6BAF]">
      {label}
      <span className="mx-1.5 text-[#A89BD0]">/</span>
      <span className="font-semibold text-[#2C2B4B]">{value}</span>
    </span>
  );
}

function HistoryRow({
  label,
  onClick,
  divider,
  open,
}: {
  label: string;
  onClick?: () => void;
  divider?: boolean;
  open?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open ?? undefined}
      className={`group flex w-full items-center justify-between gap-3 py-3.5 text-left text-[14px] font-medium text-[#2C2B4B] transition hover:text-[#6E4FD3] ${divider ? "border-b border-[#EAE2F6]" : ""}`}
    >
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <ChevronRight
        className={`h-4 w-4 flex-none text-[#A89BD0] transition group-hover:text-[#6E4FD3] ${open ? "rotate-90" : ""}`}
      />
    </button>
  );
}

function formatDay(date: string) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function BriefSection({
  index,
  label,
  bullets,
}: {
  index: number;
  label: string;
  bullets: BriefBullet[];
}) {
  const empty =
    bullets.length === 0 ||
    (bullets.length === 1 &&
      bullets[0].sourceType === "system" &&
      /not enough/i.test(bullets[0].text));
  return (
    <div className="py-2">
      <p className="text-[13px] font-semibold text-[#1A1A1A]">{label}</p>
      {empty ? (
        <p className="mt-2 text-[12px] italic text-[#8C8C8C]">Not enough information</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {bullets.map((b, i) => (
            <li key={i} className="text-[13px] leading-snug text-[#333333]">
              <span className="mr-1 text-[#8C8C8C]">•</span>
              {b.text}
              <SourceChip bullet={b} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SourceChip({ bullet }: { bullet: BriefBullet }) {
  const tone: Record<BriefBullet["sourceType"], string> = {
    assessment: "bg-[#EFE8FB] text-[#5A4A8A]",
    checkin: "bg-[#E6F8F1] text-[#2D8E69]",
    conversation: "bg-[#F4F0FB] text-[#7E6BAF]",
    patient: "bg-[#FFF4E4] text-[#8A5E1A]",
    system: "bg-[#F0EEF6] text-[#6B6684]",
  };
  return (
    <span
      className={`ml-1.5 inline-block rounded px-1.5 py-0.5 align-middle text-[10px] font-medium ${tone[bullet.sourceType]}`}
      title={bullet.sourceLabel}
    >
      {bullet.sourceLabel}
    </span>
  );
}
