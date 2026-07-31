import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  ClipboardList,
  FileText,
  History,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { getAnyProviderGrant } from "@/lib/share/providerShareStore";
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

  useEffect(() => {
    setBrief(loadBrief(appointmentId));
    return subscribeBriefChanges(() => setBrief(loadBrief(appointmentId)));
  }, [appointmentId]);

  const grant = useMemo(
    () => getAnyProviderGrant(appointmentId),
    [appointmentId, brief?.generatedAt],
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
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-[#E4DAF4] bg-gradient-to-br from-[#FBF7FF] to-[#F5EFFB] p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7E6BAF]">
            Before your session
          </p>
          <h2 className="mt-1 flex items-center gap-2 text-xl font-semibold text-[#3D2E6B]">
            <Sparkles className="h-5 w-5 text-[#7E6BAF]" />
            AI Provider Brief
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm text-[#5A4A8A]">
            Generated from information the client chose to share. Review
            supporting information before making clinical decisions.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={generate}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-[12px] bg-gradient-to-r from-[#7E6BAF] to-[#6A5A98] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : brief ? (
              <RefreshCw className="h-4 w-4" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {brief ? "Regenerate" : "Generate brief"}
          </button>
          {brief && (
            <p className="text-[11px] text-[#8B85A6]">
              Generated {new Date(brief.generatedAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {stale && brief && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
          <span>
            The patient shared updated information. Regenerate the brief to
            reflect the latest snapshot.
          </span>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      )}

      {!brief ? (
        <div className="mt-5 rounded-2xl border border-dashed border-[#D6CCEC] bg-white p-6 text-center text-sm text-[#6B6684]">
          No brief generated yet. Tap <strong>Generate brief</strong> to create
          one from the patient-consented information.
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          {BRIEF_SECTION_ORDER.map(({ key, label }, idx) => (
            <BriefSection
              key={key}
              index={idx + 1}
              label={label}
              bullets={brief.sections[key] ?? []}
            />
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2 border-t border-[#E4DAF4] pt-4">
        <ActionButton
          icon={FileText}
          label="View supporting information"
          onClick={onViewSupporting}
        />
        <ActionButton
          icon={ClipboardList}
          label="View assessment results"
          onClick={onViewAssessments}
        />
        <ActionButton
          icon={History}
          label="View shared timeline"
          onClick={onViewTimeline}
        />
      </div>

      <p className="mt-4 rounded-xl bg-white/60 px-3 py-2 text-[11px] italic leading-relaxed text-[#5A4A8A]">
        This AI-generated brief may contain errors and does not replace
        clinical assessment. It summarises only the information the patient
        consented to share, and it is not a clinical note.
      </p>
    </section>
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
    <div className="rounded-2xl border border-[#ECE7F6] bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[#EEE8F8] text-[10px] font-bold text-[#7E6BAF]">
          {index}
        </span>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7E6BAF]">
          {label}
        </p>
      </div>
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

function ActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-[12px] border border-[#D6CCEC] bg-white px-3 py-1.5 text-xs font-semibold text-[#5A4A8A] transition hover:border-[#7E6BAF] hover:bg-[#F7F4FB]"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
      <ChevronRight className="h-3 w-3 opacity-60" />
    </button>
  );
}