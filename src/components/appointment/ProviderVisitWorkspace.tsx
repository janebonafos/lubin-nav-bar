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

const STEPS: { id: Step; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "shared", label: "Review shared Health Passport", icon: ShieldCheck },
  { id: "assessments", label: "Review assessment results", icon: ClipboardList },
  { id: "notes", label: "Add session notes", icon: FileText },
  { id: "ai", label: "Generate AI-assisted summary", icon: Sparkles },
  { id: "meds", label: "Review medication plan", icon: Pill },
  { id: "publish", label: "Publish patient-facing summary", icon: Eye },
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
          Post-appointment workspace
        </p>
        <h2 className="text-lg font-semibold text-[#3D2E6B]">
          Wrap up this visit
        </h2>
        <p className="text-sm text-[#5A4A8A]">
          Move through each step, then publish a warm patient-facing summary
          into the client’s Health Passport.
        </p>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {STEPS.map((s, i) => (
          <span
            key={s.id}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
              completeMap[s.id]
                ? "border-[#B5E4CD] bg-[#E6F8F1] text-[#2D8E69]"
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
        {STEPS.map((s) => (
          <StepPanel
            key={s.id}
            open={open[s.id]}
            onToggle={() => setOpen((o) => ({ ...o, [s.id]: !o[s.id] }))}
            icon={s.icon}
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
  icon: Icon,
  title,
  done,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#ECE7F6] bg-[#FCFAFE]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#F7F4FB]"
      >
        <span
          className={`flex h-8 w-8 flex-none items-center justify-center rounded-full ${
            done ? "bg-[#E6F8F1] text-[#2D8E69]" : "bg-[#EEE8F8] text-[#7E6BAF]"
          }`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="flex-1 text-sm font-semibold text-[#3D2E6B]">{title}</span>
        {done && <Check className="h-4 w-4 text-[#2D8E69]" />}
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
        {grant.futureUpdates && (
          <span className="rounded-full bg-[#F4F0FB] px-2 py-0.5 font-semibold text-[#7E6BAF]">
            Future updates included
          </span>
        )}
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
  return (
    <div className="space-y-2">
      <p className="text-xs text-[#6B6684]">
        Choose which results to include in the patient-facing summary.
      </p>
      <ul className="divide-y divide-[#ECE7F6] rounded-xl border border-[#ECE7F6]">
        {attempts.slice(0, 12).map((a) => {
          const meta = (assessments as Assessment[]).find((x) => x.id === a.assessmentId);
          const status = meta
            ? getAssessmentStatus(
                meta.id,
                a.score,
                meta.maxScore,
                meta.lowerIsBetter,
              )
            : null;
          const isOn = !!included[a.id];
          return (
            <li key={a.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#3D2E6B]">
                  {a.assessmentName}
                  {meta && (
                    <span className="ml-1.5 text-[11px] font-normal text-[#8B85A6]">
                      ({meta.clinicalName})
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-[#6B6684]">
                  Score {a.score}
                  {status ? ` · ${status.label}` : ""}
                  {" · "}
                  {new Date(a.takenAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-[#5A4A8A]">
                <input
                  type="checkbox"
                  checked={isOn}
                  onChange={(e) => onToggle(a.id, e.target.checked)}
                  className="h-4 w-4 rounded border-[#D6CCEC] text-[#7E6BAF] focus:ring-[#7E6BAF]"
                />
                Include
              </label>
            </li>
          );
        })}
      </ul>
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