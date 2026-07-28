import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Sparkles,
  Loader2,
  Check,
  Pill,
  FileText,
  Eye,
  ClipboardList,
  Wand2,
  RefreshCw,
  Trash2,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Activity,
  ListChecks,
} from "lucide-react";
import {
  loadWorkspace,
  saveWorkspace,
  updateWorkspace,
  subscribeWorkspace,
  genMedId,
  type VisitWorkspace,
  type VisitNotes,
  type MedicationEntry,
} from "@/lib/visit-workspace/store";
import { getAnyProviderGrant } from "@/lib/share/providerShareStore";
import { ASSESSMENTS as assessments } from "@/lib/patterns/assessments";
import { getAssessmentStatus } from "@/lib/patterns/scoring";
import { getAttemptsFor } from "@/lib/patterns/storage";
import type { Attempt, Assessment } from "@/lib/patterns/types";
import {
  groupAttemptsByAssessment,
  formatShortDate,
  labelForItem,
  type AssessmentGroup,
} from "@/lib/patterns/grouping";

type Step = "shared" | "assessments" | "notes" | "ai" | "meds" | "publish";

const STEPS: { id: Step; label: string }[] = [
  { id: "shared", label: "Review shared Health Passport" },
  { id: "assessments", label: "Review assessment results" },
  { id: "notes", label: "Add session notes" },
  { id: "ai", label: "Generate AI-assisted summary" },
  { id: "meds", label: "Review medication plan" },
  { id: "publish", label: "Publish patient-facing summary" },
];

export function ProviderVisitWorkspace({
  appointmentId,
  providerName,
  appointmentLabel,
  canPrescribe = true,
}: {
  appointmentId: string;
  providerName?: string;
  appointmentLabel?: string;
  canPrescribe?: boolean;
}) {
  const [ws, setWs] = useState<VisitWorkspace>(() => loadWorkspace(appointmentId));
  const [open, setOpen] = useState<Record<Step, boolean>>({
    shared: true,
    assessments: false,
    notes: false,
    ai: false,
    meds: false,
    publish: false,
  });

  useEffect(() => {
    setWs(loadWorkspace(appointmentId));
    return subscribeWorkspace(() => setWs(loadWorkspace(appointmentId)));
  }, [appointmentId]);

  const grant = useMemo(() => getAnyProviderGrant(appointmentId), [appointmentId, ws.updatedAt]);
  const attempts = useMemo(() => allAttempts(), [ws.updatedAt]);

  const patch = (p: Partial<VisitWorkspace>) => setWs(updateWorkspace(appointmentId, p));

  const completeMap: Record<Step, boolean> = {
    shared: true, // review is passive
    assessments: Object.keys(ws.includedAssessments).length > 0,
    notes: !!(ws.notes.presenting || ws.notes.observations || ws.notes.plan),
    ai: !!ws.aiDraft,
    meds: !!ws.medicationsAcknowledgedAt,
    publish: !!ws.published,
  };

  return (
    <section className="rounded-2xl border border-[#ECE7F6] bg-white p-6 shadow-sm">
      <header className="flex flex-col gap-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A89BD0]">
          Care plan & patient summary
        </p>
        <h2 className="text-lg font-semibold text-[#3D2E6B]">
          Build what your client will see
        </h2>
        <p className="text-sm text-[#5A4A8A]">
          Review what your client shared, add notes, and publish anything you
          want them to read in their Health Passport. Each step is optional.
        </p>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {STEPS.map((s, i) => (
          <span
            key={s.id}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
              completeMap[s.id]
                ? "border-[#D6C7EE] bg-[#EFE8FB] text-[#3D2E6B]"
                : "border-[#ECE7F6] bg-[#FAF8FD] text-[#6B6684]"
            }`}
          >
            {completeMap[s.id] ? (
              <Check className="h-3 w-3" />
            ) : (
              <span className="text-[10px] font-bold">{i + 1}</span>
            )}
            {s.label}
          </span>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {STEPS.map((s, i) => (
          <StepPanel
            key={s.id}
            open={open[s.id]}
            onToggle={() => setOpen((o) => ({ ...o, [s.id]: !o[s.id] }))}
            index={i + 1}
            title={s.label}
            done={completeMap[s.id]}
          >
            {s.id === "shared" && <SharedSection grant={grant} />}
            {s.id === "assessments" && (
              <AssessmentsSection
                attempts={attempts}
                included={ws.includedAssessments}
                onToggle={(id, v) =>
                  patch({ includedAssessments: { ...ws.includedAssessments, [id]: v } })
                }
              />
            )}
            {s.id === "notes" && (
              <NotesSection notes={ws.notes} onChange={(n) => patch({ notes: n })} />
            )}
            {s.id === "ai" && (
              <AiSection
                ws={ws}
                grant={grant}
                attempts={attempts}
                providerName={providerName}
                appointmentLabel={appointmentLabel}
                onDraft={(text) =>
                  patch({ aiDraft: text, aiDraftGeneratedAt: Date.now() })
                }
                onEditDraft={(text) => patch({ aiDraft: text })}
              />
            )}
            {s.id === "meds" && (
              <MedsSection
                meds={ws.medications}
                canPrescribe={canPrescribe}
                acknowledgedAt={ws.medicationsAcknowledgedAt}
                onChange={(meds) => patch({ medications: meds })}
                onAcknowledge={() => patch({ medicationsAcknowledgedAt: Date.now() })}
              />
            )}
            {s.id === "publish" && (
              <PublishSection
                ws={ws}
                onPublish={(markdown) =>
                  patch({
                    published: {
                      version: (ws.published?.version ?? 0) + 1,
                      publishedAt: Date.now(),
                      markdown,
                    },
                  })
                }
              />
            )}
          </StepPanel>
        ))}
      </div>
    </section>
  );
}

function StepPanel({
  open,
  onToggle,
  index,
  title,
  done,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  index: number;
  title: string;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#ECE7F6] bg-[#FCFAFE]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span
          className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-[12px] font-semibold ${
            done ? "bg-[#3D2E6B] text-white" : "bg-[#EFE8FB] text-[#3D2E6B]"
          }`}
        >
          {done ? <Check className="h-3.5 w-3.5" /> : index}
        </span>
        <span className="flex-1 text-sm font-semibold text-[#3D2E6B]">{title}</span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-[#7E6BAF]" />
        ) : (
          <ChevronRight className="h-4 w-4 text-[#7E6BAF]" />
        )}
      </button>
      {open && <div className="border-t border-[#ECE7F6] bg-white px-4 py-4 md:px-5">{children}</div>}
    </div>
  );
}

/* ---------- Sections ---------- */

function SharedSection({
  grant,
}: {
  grant: ReturnType<typeof getAnyProviderGrant>;
}) {
  if (!grant || grant.revoked || grant.includedKeys.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#E1D9F1] bg-white p-4 text-sm text-[#6B6684]">
        The client did not share their Health Passport for this appointment.
      </div>
    );
  }
  const s = grant.snapshot;
  const expires = new Date(grant.expiresAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return (
    <div className="space-y-3 text-sm text-[#3D2E6B]">
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-[#6B6684]">
        <span>
          <strong className="text-[#3D2E6B]">Range:</strong> {s.rangeLabel}
        </span>
        <span>
          <strong className="text-[#3D2E6B]">Access ends:</strong> {expires}
        </span>
      </div>
      <dl className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <MiniStat label="Check-ins" value={String(s.checkinsInRange.length)} />
        <MiniStat label="Mood" value={s.moodLabel} />
        <MiniStat label="Direction" value={s.directionLabel} />
      </dl>
      {s.themes.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#7E6BAF]">
            Themes
          </p>
          <p className="mt-1 text-sm text-[#3D2E6B]">
            {s.themes.map((t) => t.label).join(" · ")}
          </p>
        </div>
      )}
      {s.insight && (
        <p className="rounded-xl bg-[#FAF8FD] p-3 text-sm italic text-[#5A4A8A]">
          “{s.insight}”
        </p>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#ECE7F6] bg-[#FCFAFE] p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#7E6BAF]">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-[#3D2E6B]">{value}</p>
    </div>
  );
}

function AssessmentsSection({
  attempts,
  included,
  onToggle,
}: {
  attempts: Attempt[];
  included: Record<string, boolean>;
  onToggle: (id: string, v: boolean) => void;
}) {
  if (attempts.length === 0) {
    return (
      <p className="text-sm italic text-[#6B6684]">
        No self-discovery assessments to review.
      </p>
    );
  }
  const groups = groupAttemptsByAssessment(attempts);
  return (
    <div className="space-y-2">
      <p className="text-xs text-[#6B6684]">
        Grouped by clinical tool. Choose which results to include in the
        patient-facing summary.
      </p>
      <ul className="space-y-3">
        {groups.map((g) => (
          <AssessmentGroupCard
            key={g.assessmentId}
            group={g}
            included={included}
            onToggle={onToggle}
          />
        ))}
      </ul>
    </div>
  );
}

function AssessmentGroupCard({
  group,
  included,
  onToggle,
}: {
  group: AssessmentGroup;
  included: Record<string, boolean>;
  onToggle: (id: string, v: boolean) => void;
}) {
  const [view, setView] = useState<"none" | "trend" | "responses">("none");
  const [reviewIdx, setReviewIdx] = useState(0);
  const includedCount = group.attempts.filter((a) => included[a.id]).length;
  const allOn = includedCount === group.attempts.length;

  const toggleAll = () => {
    group.attempts.forEach((a) => onToggle(a.id, !allOn));
  };

  const changeInfo = () => {
    if (group.change === null || group.direction === null) return null;
    const abs = Math.abs(group.change);
    const Icon =
      group.direction === "increased"
        ? TrendingUp
        : group.direction === "decreased"
          ? TrendingDown
          : Minus;
    const tone =
      group.improving === true
        ? "text-[#3D2E6B] bg-[#EFE8FB]"
        : group.improving === false
          ? "text-[#5A3E8F] bg-[#F4ECFB]"
          : "text-[#6B6684] bg-[#F0EEF6]";
    const word =
      group.direction === "stable"
        ? "stable"
        : `${group.direction} ${abs} pt${abs === 1 ? "" : "s"}`;
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone}`}
      >
        <Icon className="h-3 w-3" />
        {word}
      </span>
    );
  };

  return (
    <li className="rounded-xl border border-[#ECE7F6] bg-white">
      <div className="flex flex-wrap items-start gap-3 px-3.5 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#3D2E6B]">
            {group.friendlyName}{" "}
            <span className="text-[11px] font-normal text-[#8B85A6]">
              · {group.clinicalName} · {group.attempts.length} result
              {group.attempts.length === 1 ? "" : "s"}
            </span>
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[#6B6684]">
            <span>
              <span className="font-semibold text-[#3D2E6B]">
                Latest: {group.latest.score}
                <span className="text-[#8B85A6]">/{group.maxScore}</span>
              </span>
              {group.latest.status ? ` · ${group.latest.status.label}` : ""} ·{" "}
              {formatShortDate(group.latest.takenAt)}
            </span>
            {group.previous && (
              <span className="text-[#8B85A6]">
                Previous: {group.previous.score} ·{" "}
                {formatShortDate(group.previous.takenAt)}
              </span>
            )}
            {changeInfo()}
          </div>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-[#5A4A8A]">
          <input
            type="checkbox"
            checked={allOn}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-[#D6CCEC] text-[#7E6BAF] focus:ring-[#7E6BAF]"
          />
          Include all
        </label>
      </div>

      {group.safetyFlag && (
        <div className="mx-3.5 mb-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-amber-700" />
            <div className="min-w-0 text-[12px] text-amber-900">
              <p className="font-semibold">
                Safety-related response — review recommended
              </p>
              <p className="mt-0.5">
                On {formatShortDate(group.safetyFlag.date)}, the patient
                responded <strong>“{group.safetyFlag.response}”</strong> to
                item {group.safetyFlag.itemIndex + 1}: “
                {group.safetyFlag.itemText}”. This is a screening response, not
                a diagnosis or an inference of intent.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-[#ECE7F6] px-3.5 py-2">
        <button
          type="button"
          onClick={() => setView(view === "trend" ? "none" : "trend")}
          className="inline-flex items-center gap-1 rounded-[10px] border border-[#D6CCEC] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#5A4A8A] hover:bg-[#F7F4FB]"
        >
          <Activity className="h-3 w-3" /> View trend
        </button>
        <button
          type="button"
          onClick={() => {
            setReviewIdx(0);
            setView(view === "responses" ? "none" : "responses");
          }}
          className="inline-flex items-center gap-1 rounded-[10px] border border-[#D6CCEC] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#5A4A8A] hover:bg-[#F7F4FB]"
        >
          <ListChecks className="h-3 w-3" /> Review responses
        </button>
      </div>

      {view === "trend" && (
        <div className="border-t border-[#ECE7F6] bg-[#FCFAFE] px-3.5 py-3">
          <Sparkline group={group} />
        </div>
      )}

      {view === "responses" && (
        <ResponsesPanel
          group={group}
          index={reviewIdx}
          onChangeIndex={setReviewIdx}
          onToggleInclude={onToggle}
          included={included}
        />
      )}
    </li>
  );
}

function Sparkline({ group }: { group: AssessmentGroup }) {
  // Chronological (oldest → newest) for the sparkline.
  const chron = [...group.attempts].reverse();
  const w = 200;
  const h = 40;
  const max = group.maxScore || 1;
  const step = chron.length > 1 ? w / (chron.length - 1) : 0;
  const points = chron.map((a, i) => {
    const x = chron.length > 1 ? i * step : w / 2;
    const y = h - (a.score / max) * (h - 4) - 2;
    return { x, y, a };
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#7E6BAF]">
        Score over time
      </p>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="mt-1 h-10 w-full max-w-[220px]"
        aria-label="Trend sparkline"
      >
        <path d={path} fill="none" stroke="#7E6BAF" strokeWidth="1.5" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={i === points.length - 1 ? "#3D2E6B" : "#A89BD0"} />
        ))}
      </svg>
      <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#6B6684]">
        {chron.map((a, i) => (
          <li key={a.id}>
            {formatShortDate(a.takenAt)}: <strong className="text-[#3D2E6B]">{a.score}</strong>
            {i === chron.length - 1 ? " (latest)" : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResponsesPanel({
  group,
  index,
  onChangeIndex,
  onToggleInclude,
  included,
}: {
  group: AssessmentGroup;
  index: number;
  onChangeIndex: (i: number) => void;
  onToggleInclude: (id: string, v: boolean) => void;
  included: Record<string, boolean>;
}) {
  const attempt = group.attempts[index];
  if (!attempt) return null;
  const meta = (assessments as Assessment[]).find((x) => x.id === group.assessmentId);
  const items = meta?.questions.map((_, i) =>
    labelForItem(attempt, group.assessmentId, i),
  ) ?? [];
  const isSafety = group.assessmentId === "phq-9";
  const isOn = !!included[attempt.id];
  return (
    <div className="border-t border-[#ECE7F6] bg-white px-3.5 py-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#7E6BAF]">
          Item responses
        </span>
        {group.attempts.length > 1 && (
          <select
            value={index}
            onChange={(e) => onChangeIndex(Number(e.target.value))}
            className="rounded-md border border-[#ECE7F6] bg-white px-2 py-1 text-[11px] text-[#3D2E6B] focus:border-[#7E6BAF] focus:outline-none"
          >
            {group.attempts.map((a, i) => (
              <option key={a.id} value={i}>
                {formatShortDate(a.takenAt)} — Score {a.score}
                {i === 0 ? " (latest)" : ""}
              </option>
            ))}
          </select>
        )}
        <label className="ml-auto inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-[#5A4A8A]">
          <input
            type="checkbox"
            checked={isOn}
            onChange={(e) => onToggleInclude(attempt.id, e.target.checked)}
            className="h-3.5 w-3.5 rounded border-[#D6CCEC] text-[#7E6BAF] focus:ring-[#7E6BAF]"
          />
          Include this attempt
        </label>
      </div>
      <ol className="space-y-1.5 text-[12px] text-[#3D2E6B]">
        {items.map((it, i) => {
          if (!it) return null;
          const isSafetyItem = isSafety && i === 8 && it.value > 0;
          return (
            <li
              key={i}
              className={`rounded-md px-2 py-1.5 ${
                isSafetyItem
                  ? "border border-amber-300 bg-amber-50"
                  : "bg-[#FCFAFE]"
              }`}
            >
              <p className="text-[11px] text-[#6B6684]">
                Item {i + 1}
                {isSafetyItem ? " · safety-related" : ""}
              </p>
              <p className="mt-0.5 leading-snug">{it.text}</p>
              <p className="mt-1 text-[12px] font-semibold text-[#3D2E6B]">
                → {it.response}{" "}
                <span className="text-[10px] font-normal text-[#8B85A6]">
                  (value {it.value})
                </span>
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function NotesSection({
  notes,
  onChange,
}: {
  notes: VisitNotes;
  onChange: (n: VisitNotes) => void;
}) {
  const field = (
    key: keyof VisitNotes,
    label: string,
    hint: string,
    isPrivate = false,
  ) => (
    <div>
      <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7E6BAF]">
        {label}
        {isPrivate && (
          <span className="ml-2 rounded bg-[#F4F0FB] px-1.5 py-0.5 text-[9px] normal-case tracking-normal text-[#7E6BAF]">
            private · never shared
          </span>
        )}
      </label>
      <textarea
        value={notes[key] ?? ""}
        onChange={(e) => onChange({ ...notes, [key]: e.target.value })}
        placeholder={hint}
        rows={3}
        className="mt-1 w-full resize-y rounded-xl border border-[#ECE7F6] bg-white p-3 text-sm text-[#3D2E6B] placeholder:text-[#B0A8CD] focus:border-[#7E6BAF] focus:outline-none focus:ring-2 focus:ring-[#7E6BAF]/20"
      />
    </div>
  );
  return (
    <div className="space-y-3">
      {field("presenting", "Presenting concerns", "What brought them in today…")}
      {field(
        "observations",
        "Observations",
        "Affect, engagement, key moments in session…",
      )}
      {field("plan", "Plan", "Next steps, referrals, homework…")}
      {field("private", "Private clinician notes", "Only visible to you.", true)}
    </div>
  );
}

function AiSection({
  ws,
  grant,
  attempts,
  providerName,
  appointmentLabel,
  onDraft,
  onEditDraft,
}: {
  ws: VisitWorkspace;
  grant: ReturnType<typeof getAnyProviderGrant>;
  attempts: Attempt[];
  providerName?: string;
  appointmentLabel?: string;
  onDraft: (t: string) => void;
  onEditDraft: (t: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const includedAssessments = attempts
        .filter((a) => ws.includedAssessments[a.id])
        .map((a) => {
          const meta = (assessments as Assessment[]).find((x) => x.id === a.assessmentId);
          const status = meta
            ? getAssessmentStatus(meta.id, a.score, meta.maxScore, meta.lowerIsBetter)
            : null;
          return {
            name: a.assessmentName,
            clinicalName: meta?.clinicalName,
            score: a.score,
            statusLabel: status?.label,
            takenAt: a.takenAt,
          };
        });

      const sharedSnapshot = grant && !grant.revoked
        ? {
            moodLabel: grant.snapshot.moodLabel,
            directionLabel: grant.snapshot.directionLabel,
            themes: grant.snapshot.themes,
            insight: grant.snapshot.insight,
            checkinCount: grant.snapshot.checkinsInRange.length,
            rangeLabel: grant.snapshot.rangeLabel,
          }
        : null;

      const res = await fetch("/api/generate-visit-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerName,
          appointmentLabel,
          sharedSnapshot,
          includedAssessments,
          notes: {
            presenting: ws.notes.presenting,
            observations: ws.notes.observations,
            plan: ws.notes.plan,
          },
          medications: ws.medications,
        }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not generate. Please try again.");
        return;
      }
      onDraft(data.text ?? "");
    } catch (e) {
      console.error(e);
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-[12px] bg-gradient-to-r from-[#7E6BAF] to-[#6A5A98] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="h-4 w-4" />
          )}
          {ws.aiDraft ? "Regenerate draft" : "Generate draft"}
        </button>
        {ws.aiDraftGeneratedAt && (
          <span className="text-[11px] text-[#8B85A6]">
            Drafted {new Date(ws.aiDraftGeneratedAt).toLocaleString()}
          </span>
        )}
      </div>
      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
      )}
      <textarea
        value={ws.aiDraft ?? ""}
        onChange={(e) => onEditDraft(e.target.value)}
        placeholder="An AI-assisted patient-facing summary will appear here. You can edit anything before publishing."
        rows={10}
        className="w-full resize-y rounded-xl border border-[#ECE7F6] bg-white p-3 text-sm text-[#3D2E6B] placeholder:text-[#B0A8CD] focus:border-[#7E6BAF] focus:outline-none focus:ring-2 focus:ring-[#7E6BAF]/20"
      />
      <p className="text-[11px] italic text-[#8B85A6]">
        You are responsible for the final wording. Nothing is shared with the
        client until you publish.
      </p>
    </div>
  );
}

function MedsSection({
  meds,
  canPrescribe,
  acknowledgedAt,
  onChange,
  onAcknowledge,
}: {
  meds: MedicationEntry[];
  canPrescribe: boolean;
  acknowledgedAt?: number;
  onChange: (meds: MedicationEntry[]) => void;
  onAcknowledge: () => void;
}) {
  const add = () =>
    onChange([
      ...meds,
      { id: genMedId(), name: "", dose: "", frequency: "", instructions: "", action: "start" },
    ]);
  const update = (id: string, patch: Partial<MedicationEntry>) =>
    onChange(meds.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  const remove = (id: string) => onChange(meds.filter((m) => m.id !== id));

  if (!canPrescribe) {
    return (
      <div className="rounded-xl border border-dashed border-[#E1D9F1] bg-white p-4 text-sm text-[#6B6684]">
        Medication management is available for prescribing clinicians only. You
        can still review any medications shared by the client.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {meds.length === 0 && (
        <p className="text-sm italic text-[#6B6684]">
          No medications added. Add one only if it's part of today’s plan.
        </p>
      )}
      {meds.map((m) => (
        <div key={m.id} className="rounded-xl border border-[#ECE7F6] bg-white p-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <MedField
              label="Name"
              value={m.name}
              onChange={(v) => update(m.id, { name: v })}
            />
            <MedField
              label="Dose"
              value={m.dose ?? ""}
              onChange={(v) => update(m.id, { dose: v })}
            />
            <MedField
              label="Frequency"
              value={m.frequency ?? ""}
              onChange={(v) => update(m.id, { frequency: v })}
            />
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7E6BAF]">
                Action
              </label>
              <select
                value={m.action ?? "start"}
                onChange={(e) =>
                  update(m.id, { action: e.target.value as MedicationEntry["action"] })
                }
                className="mt-1 w-full rounded-lg border border-[#ECE7F6] bg-white px-2 py-1.5 text-sm text-[#3D2E6B] focus:border-[#7E6BAF] focus:outline-none"
              >
                <option value="start">Start</option>
                <option value="continue">Continue</option>
                <option value="adjust">Adjust</option>
                <option value="stop">Stop</option>
              </select>
            </div>
          </div>
          <div className="mt-2">
            <MedField
              label="Instructions for the client"
              value={m.instructions ?? ""}
              onChange={(v) => update(m.id, { instructions: v })}
            />
          </div>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => remove(m.id)}
              className="inline-flex items-center gap-1 rounded-[10px] px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
            >
              <Trash2 className="h-3 w-3" /> Remove
            </button>
          </div>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1.5 rounded-[12px] border border-[#D6CCEC] bg-white px-3 py-1.5 text-sm font-semibold text-[#5A4A8A] hover:bg-[#F7F4FB]"
        >
          + Add medication
        </button>
        <button
          type="button"
          onClick={onAcknowledge}
          className="inline-flex items-center gap-1.5 rounded-[12px] bg-[#3D2E6B] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#2C2B4B]"
        >
          <Check className="h-4 w-4" />
          {acknowledgedAt ? "Medication plan reviewed" : "Mark medication plan reviewed"}
        </button>
        {acknowledgedAt && (
          <span className="text-[11px] text-[#8B85A6]">
            Reviewed {new Date(acknowledgedAt).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}

function MedField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wider text-[#7E6BAF]">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-[#ECE7F6] bg-white px-2 py-1.5 text-sm text-[#3D2E6B] focus:border-[#7E6BAF] focus:outline-none"
      />
    </div>
  );
}

function PublishSection({
  ws,
  onPublish,
}: {
  ws: VisitWorkspace;
  onPublish: (markdown: string) => void;
}) {
  const [preview, setPreview] = useState(false);
  const draft = ws.aiDraft ?? "";

  if (!draft.trim()) {
    return (
      <p className="text-sm italic text-[#6B6684]">
        Generate or write the summary in the previous step, then publish it
        here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPreview((p) => !p)}
          className="inline-flex items-center gap-1.5 rounded-[12px] border border-[#D6CCEC] bg-white px-3 py-1.5 text-sm font-semibold text-[#5A4A8A] hover:bg-[#F7F4FB]"
        >
          <Eye className="h-4 w-4" /> {preview ? "Hide preview" : "Preview as client"}
        </button>
        <button
          type="button"
          onClick={() => onPublish(draft)}
          className="inline-flex items-center gap-1.5 rounded-[12px] bg-gradient-to-r from-[#3D2E6B] to-[#2C2B4B] px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5"
        >
          {ws.published ? <RefreshCw className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          {ws.published ? `Publish new version (v${ws.published.version + 1})` : "Publish to client"}
        </button>
        {ws.published && (
          <span className="text-[11px] text-[#8B85A6]">
            v{ws.published.version} · published{" "}
            {new Date(ws.published.publishedAt).toLocaleString()}
          </span>
        )}
      </div>
      {preview && (
        <div className="rounded-2xl border border-[#ECE7F6] bg-[#FCFAFE] p-4 text-sm text-[#3D2E6B]">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#7E6BAF]">
            Client will see
          </p>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-[#3D2E6B]">
            {draft}
          </pre>
        </div>
      )}
    </div>
  );
}

/* ---------- helpers ---------- */

function allAttempts(): Attempt[] {
  const out: Attempt[] = [];
  for (const a of assessments) {
    for (const at of getAttemptsFor(a.id)) out.push(at);
  }
  return out.sort((a, b) => b.takenAt - a.takenAt);
}