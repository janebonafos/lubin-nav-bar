import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, AlertTriangle, ChevronRight } from "lucide-react";
import { getAnyProviderGrant } from "@/lib/share/providerShareStore";
import {
  seedDemoSharedGrant,
  clearDemoSharedGrant,
} from "@/lib/share/demoSharedGrant";
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
  const [brief, setBrief] = useState<ProviderBrief | null>(() =>
    loadBrief(appointmentId),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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
      const groups = includeAssessments
        ? groupAttemptsByAssessment(snap.attemptsInRange)
        : [];
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
          conversationsSummary: includeConversations
            ? snap.insight
            : undefined,
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
  }, [
    grant,
    providerName,
    appointmentLabel,
    sharedAt,
    appointmentId,
    brief?.version,
  ]);

  // No share yet — the brief cannot exist.
  if (!grant || grant.revoked || grant.includedKeys.length === 0) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-dashed border-[#E1D9F1] bg-[#FBF9FF] p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-[#3D2E6B]">
              Shared Health Passport
            </p>
            <span className="w-fit rounded-full bg-[#F0EEF6] px-2.5 py-1 text-[10px] font-semibold text-[#6B6684]">
              Not shared
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[#6B6684]">
            The client hasn't shared their Health Passport for this appointment yet. Nothing is wrong — sharing is optional and client-controlled.
          </p>
        </div>

        <div className="rounded-2xl border border-dashed border-[#E1D9F1] bg-[#FBF9FF] p-5 opacity-80">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-[#3D2E6B]">
              AI Provider Brief
            </p>
            <span className="w-fit rounded-full bg-[#F0EEF6] px-2.5 py-1 text-[10px] font-semibold text-[#6B6684]">
              Unavailable
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[#6B6684]">
            A brief can't be generated until Health Passport information is shared. No action is required from you.
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
    <section className="rounded-2xl bg-white px-1 py-1">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold text-[#2C2B4B]">
            Shared health overview
          </h2>
          <p className="mt-1 text-[13px] text-[#8B85A6]">
            Information {firstName} chose to share · {snap.rangeLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#7E6BAF] underline-offset-4 transition hover:underline disabled:opacity-60"
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {brief ? "Refresh overview" : "Create overview"}
        </button>
      </div>

      {stale && brief && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-[#FDF6EC] p-3 text-[12px] text-[#8A5E1A]">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
          <span>
            {firstName} shared updated information. Refresh the overview to see
            the latest.
          </span>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
          {error}
        </p>
      )}

      <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-[#2C2B4B]">
        {snap.insight}
      </p>

      <p className="mt-4 text-[13px] text-[#6B6684]">
        <span className="text-[#7E6BAF]">Recent pattern:</span> Mood{" "}
        {snap.moodLabel.toLowerCase()} · Stress {snap.stressLabel.toLowerCase()}{" "}
        · {snap.directionLabel.toLowerCase()} overall
      </p>

      {brief && (
        <details className="mt-4">
          <summary className="cursor-pointer list-none text-[13px] font-medium text-[#7E6BAF] hover:underline">
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

      <div className="mt-6 divide-y divide-[#F1EDF9] border-t border-[#F1EDF9]">
        <HistoryRow label="Assessment results" onClick={onViewAssessments} />
        <HistoryRow label="Check-in timeline" onClick={onViewTimeline} />
        <HistoryRow
          label="Information used for this overview"
          onClick={onViewSupporting}
        />
      </div>

      <details className="mt-6">
        <summary className="cursor-pointer list-none text-[12px] text-[#A79FC0] hover:text-[#7E6BAF]">
          About this overview
        </summary>
        <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-[#8B85A6]">
          Created from information {firstName} chose to share. Review before
          using it in your clinical assessment.
        </p>
        <button
          type="button"
          onClick={() => {
            clearDemoSharedGrant(appointmentId);
            setRefreshKey((k) => k + 1);
          }}
          className="mt-2 text-[12px] text-[#A79FC0] underline-offset-2 transition hover:text-[#7E6BAF] hover:underline"
        >
          Exit preview
        </button>
      </details>
    </section>
  );
}

function HistoryRow({
  label,
  onClick,
}: {
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 py-3 text-left transition hover:text-[#7E6BAF]"
    >
      <span className="min-w-0 flex-1 truncate text-[14px] text-[#2C2B4B]">
        {label}
      </span>
      <ChevronRight className="h-4 w-4 flex-none text-[#C3BAD8]" />
    </button>
  );
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
      <p className="text-[13px] font-semibold text-[#3D2E6B]">{label}</p>
      {empty ? (
        <p className="mt-2 text-[12px] italic text-[#8B85A6]">
          Not enough information
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {bullets.map((b, i) => (
            <li key={i} className="text-[13px] leading-snug text-[#3D2E6B]">
              <span className="mr-1 text-[#7E6BAF]">•</span>
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
