import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import PassportEmptyState from "./PassportEmptyState";
import { UploadPanel } from "./RecordsSection";

import {
  DEMO_OUTSIDE_VISIT,
  OUTSIDE_LABEL,
  PASSPORT_VISITS,
  allVisits,
  formatVisitDate,
  saveOutsideVisit,
  subscribeVisits,
  visitCounts,
  visitOptionLabel,
  type PassportVisit,
} from "@/lib/passport/visits";
import {
  allRecords,
  formatRecordDate,
  linkRecordToVisit,
  subscribeRecords,
  unlinkRecordFromVisit,
  type PassportRecord,
} from "@/lib/passport/records";

/**
 * Prototype visit timeline for the patient Health Passport.
 * Demo records only — see src/lib/passport/visits.ts.
 * Design: "Serene lavender split" — light, editorial, brand lavender.
 */
export default function VisitsTimeline({
  forceEmpty = false,
  onOpenPrescriptions,
  focusVisitId,
}: {
  forceEmpty?: boolean;
  onOpenPrescriptions?: () => void;
  /** When a document's "Related visit" is tapped, select that exact visit. */
  focusVisitId?: string;
}) {
  const [visits, setVisits] = useState<PassportVisit[]>(() => [
    DEMO_OUTSIDE_VISIT,
    ...PASSPORT_VISITS,
  ]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const read = () => setVisits(allVisits());
    read();
    return subscribeVisits(read);
  }, []);

  useEffect(() => {
    if (focusVisitId) setSelectedId(focusVisitId);
  }, [focusVisitId]);

  const scheduled = useMemo(
    () =>
      visits.filter((v) => v.kind === "scheduled").sort((a, b) => a.date.localeCompare(b.date)),
    [visits],
  );
  const completed = useMemo(
    () =>
      visits.filter((v) => v.kind === "completed").sort((a, b) => b.date.localeCompare(a.date)),
    [visits],
  );

  if (forceEmpty) {
    return (
      <section aria-label="Visits and checkups">
        <PassportEmptyState
          eyebrow="Visits and checkups"
          title="No visits yet"
          description="When you book a session through Lubin, it shows up here as an upcoming appointment. After the visit, the clinician's summary, findings, tests, and prescriptions are added automatically. You can also add a visit that happened outside Lubin."
          action={{ label: "Add outside visit", onClick: () => setAdding(true) }}
          secondary={{ label: "Review my health details", onClick: () => onOpenPrescriptions?.() }}
        />
      </section>
    );
  }

  const counts = visitCounts(visits);
  const selected =
    visits.find((v) => v.id === selectedId) ?? completed[0] ?? scheduled[0];

  return (
    <section className="space-y-8" aria-label="Visits and checkups">
      {/* Header Card */}
      <header className="rounded-[2rem] border border-brand-lavender bg-card p-8 shadow-[0_12px_40px_-12px_color-mix(in_oklab,var(--color-brand-purple)_18%,transparent)] sm:p-10">
        <span className="block text-[11px] font-bold uppercase tracking-[0.15em] text-brand-purple">
          Visits and checkups
        </span>
        <h2 className="mt-3 font-display text-4xl font-semibold leading-tight text-brand-purple-dark lg:text-5xl">
          Every visit in one timeline
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-brand-purple-dark/65 lg:text-base">
          Upcoming appointments are what is still ahead. Completed visits hold
          what the clinician recorded — summary, findings, tests,
          prescriptions, and follow-up.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <FilterPill tone="scheduled">
            {counts.scheduled} scheduled appointments
          </FilterPill>
          <FilterPill tone="completed">
            {counts.completed} completed visits
          </FilterPill>
          <span className="px-5 py-2 text-xs font-medium uppercase italic tracking-wider text-brand-purple/55 self-center">
            Demo records in this prototype
          </span>
        </div>
        <div className="mt-6 border-t border-brand-lavender pt-6">
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="inline-flex h-10 items-center rounded-xl bg-brand-purple-dark px-4 text-[13px] font-semibold text-white transition hover:opacity-90"
          >
            Add outside visit
          </button>
          <p className="mt-2 text-[12.5px] text-brand-purple-dark/60">
            Went to another clinic or hospital? Add it yourself. You can attach documents now or later.
          </p>
          {adding ? (
            <OutsideVisitForm
              onCancel={() => setAdding(false)}
              onSaved={(visit) => {
                setAdding(false);
                setSelectedId(visit.id);
                toast.success("Visit added to your Health Passport");
              }}
            />
          ) : null}
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
        {/* Left: Timeline */}
        <div className="space-y-8 lg:col-span-5">
          <TimelineGroup
            title="Scheduled appointments"
            hint="Not yet happened"
            visits={scheduled}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <TimelineGroup
            title="Completed visits"
            hint="Recorded by clinic"
            visits={completed}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>

        {/* Right: Detail Panel */}
        <div className="lg:col-span-7 lg:sticky lg:top-24">
          {selected ? (
            <VisitDetail
              key={selected.id}
              visit={selected}
              onOpenPrescriptions={onOpenPrescriptions}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

const COLLAPSED_COUNT = 4;

function TimelineGroup({
  title,
  hint,
  visits,
  selectedId,
  onSelect,
}: {
  title: string;
  hint: string;
  visits: PassportVisit[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hiddenCount = visits.length - COLLAPSED_COUNT;
  const visible =
    expanded || hiddenCount <= 0 ? visits : visits.slice(0, COLLAPSED_COUNT);

  if (!visits.length) return null;
  return (
    <section>
      <div className="mb-6 flex items-end justify-between">
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-brand-purple-accent">
          {title}
        </h3>
        <span className="text-[10px] uppercase italic tracking-wide text-brand-purple-accent/60">
          {hint}
        </span>
      </div>

      <div className="relative space-y-4 pl-8">
        {/* Timeline line */}
        <div className="absolute bottom-2 left-0 top-2 w-px bg-gradient-to-b from-brand-lavender via-brand-lavender to-transparent" />

        {visible.map((visit) => {
          const active = visit.id === selectedId;
          const isScheduled = visit.kind === "scheduled";
          return (
            <div key={visit.id} className="relative">
              {/* Timeline dot */}
              <span
                aria-hidden
                className={`absolute -left-[36px] top-6 h-4 w-4 rounded-full ring-4 ring-white ${
                  active
                    ? isScheduled
                      ? "border-2 border-brand-lavender bg-card"
                      : "bg-brand-purple shadow-sm"
                    : isScheduled
                      ? "border-2 border-brand-lavender bg-card"
                      : "bg-brand-purple-accent/40"
                }`}
              />
              <button
                type="button"
                onClick={() => onSelect(visit.id)}
                aria-current={active}
                className={`w-full rounded-2xl border p-5 text-left transition-all ${
                  active
                    ? "border-2 border-brand-purple/20 bg-brand-lavender/40 ring-4 ring-brand-purple/5"
                    : "border-brand-lavender bg-card/60 hover:border-brand-purple/30"
                }`}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <span
                    className={`text-xs font-semibold ${
                      active ? "text-brand-purple-dark" : "text-brand-purple"
                    }`}
                  >
                    {formatVisitDate(visit.date)}
                    {visit.time ? ` · ${visit.time}` : ""}
                  </span>
                  <StatusPill tone={isScheduled ? "scheduled" : "completed"}>
                    {isScheduled ? "Scheduled" : active ? "Selected" : "Completed"}
                  </StatusPill>
                </div>
                <h4 className="mb-1 font-display text-lg font-semibold text-brand-purple-dark">
                  {visit.reason}
                </h4>
                <p className="text-xs text-brand-purple/70">
                  {visit.origin === "patient"
                    ? visit.clinic
                    : `${visit.clinician} · ${visit.clinic}`}
                </p>
                {visit.origin === "patient" ? (
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-purple-accent">
                    {OUTSIDE_LABEL}
                  </p>
                ) : null}
                {!active && (
                  <span className="mt-4 flex items-center text-xs font-semibold text-brand-purple transition-transform">
                    {isScheduled ? "View appointment" : "View visit details"}
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </span>
                )}
              </button>
            </div>
          );
        })}

        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 w-full rounded-2xl border border-dashed border-brand-purple/25 bg-brand-lavender/20 px-5 py-3 text-center text-xs font-semibold text-brand-purple-dark transition-colors hover:bg-brand-lavender/40"
          >
            {expanded
              ? "Show fewer visits"
              : `Show ${hiddenCount} earlier ${hiddenCount === 1 ? "visit" : "visits"}`}
          </button>
        )}
      </div>
    </section>
  );
}

function VisitDetail({
  visit,
  onOpenPrescriptions,
}: {
  visit: PassportVisit;
  onOpenPrescriptions?: () => void;
}) {
  const scheduled = visit.kind === "scheduled";
  const patientAdded = visit.origin === "patient";
  return (
    <article className="overflow-hidden rounded-[2rem] border border-brand-lavender bg-card shadow-[0_20px_60px_-15px_color-mix(in_oklab,var(--color-brand-purple)_18%,transparent)]">
      {/* Detail Header */}
      <div className="border-b border-brand-lavender bg-brand-lavender/30 p-8 sm:p-10">
        <div className="mb-4 flex items-center gap-2">
          <span className="rounded bg-brand-purple px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
            {patientAdded ? "Outside Lubin" : scheduled ? "Scheduled" : "Completed visit"}
          </span>
          <span className="text-xs italic text-brand-purple-accent">
            {patientAdded ? OUTSIDE_LABEL : (visit.recordedBy ?? "Nothing recorded yet")}
          </span>
        </div>
        <h3 className="mb-6 font-display text-3xl font-semibold leading-tight text-brand-purple-dark">
          {visit.reason}
        </h3>
        <div className="grid gap-6 text-sm sm:grid-cols-2">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-purple-accent">
              Date & Time
            </span>
            <p className="font-medium text-brand-purple-dark">
              {formatVisitDate(visit.date)}
              {visit.time ? ` · ${visit.time}` : ""}
            </p>
          </div>
          {patientAdded ? null : (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-purple-accent">
                Provider
              </span>
              <p className="font-medium text-brand-purple-dark">
                {visit.clinician} · {visit.clinicianRole}
              </p>
            </div>
          )}
          <div className="space-y-1 sm:col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-purple-accent">
              Facility
            </span>
            <p className="font-medium text-brand-purple-dark">{visit.clinic}</p>
          </div>
        </div>
      </div>

      {/* Detail Body */}
      <div className="space-y-10 p-8 sm:p-10">
        {patientAdded ? (
          <>
            <DetailSection title="Your note">
              {visit.note ? (
                <p className="text-[15px] leading-relaxed text-brand-purple-dark/90">{visit.note}</p>
              ) : (
                <Empty>You did not add a note for this visit.</Empty>
              )}
            </DetailSection>
            <VisitDocuments visitId={visit.id} visitLabel={visitOptionLabel(visit)} />
            <p className="rounded-2xl bg-brand-lavender/40 px-5 py-4 text-[13px] leading-relaxed text-brand-purple-dark/65">
              You added this visit and any documents attached to it. Nothing here has been reviewed by
              a clinician.
            </p>
          </>
        ) : scheduled ? (
          <>
            <DetailSection title="Before this appointment">
              {visit.preparation?.length ? (
                <ul className="space-y-1.5">
                  {visit.preparation.map((item) => (
                    <li
                      key={item}
                      className="flex gap-2 text-[15px] leading-relaxed text-brand-purple-dark/80"
                    >
                      <span
                        aria-hidden
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-purple/50"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>Nothing to prepare yet.</Empty>
              )}
            </DetailSection>
            <div className="rounded-2xl bg-brand-lavender/40 px-5 py-4">
              <p className="text-sm leading-relaxed text-brand-purple-dark/65">
                A summary, findings, tests, and follow-up appear here once the
                visit is completed and the clinician records it.
              </p>
            </div>
          </>
        ) : (
          <>
            <DetailSection title="Visit summary">
              <p className="text-[15px] leading-relaxed text-brand-purple-dark/90">
                {visit.summary}
              </p>
            </DetailSection>

            <DetailSection title="Diagnoses or findings">
              {visit.findings?.length ? (
                <div className="flex flex-wrap gap-2">
                  {visit.findings.map((finding) => (
                    <span
                      key={finding}
                      className="rounded-xl border border-brand-lavender bg-brand-lavender/30 px-4 py-2 text-xs font-medium text-brand-purple-dark"
                    >
                      {finding}
                    </span>
                  ))}
                </div>
              ) : (
                <Empty>
                  The clinician did not record a diagnosis for this visit.
                </Empty>
              )}
            </DetailSection>

            <DetailSection title="Tests ordered">
              {visit.tests?.length ? (
                <div className="space-y-2">
                  {visit.tests.map((test) => (
                    <div
                      key={test.name}
                      className="flex items-center justify-between rounded-2xl border border-brand-lavender bg-card p-4"
                    >
                      <div>
                        <p className="text-sm font-semibold text-brand-purple-dark">
                          {test.name}
                        </p>
                        {test.detail ? (
                          <p className="text-[11px] text-brand-purple-accent">
                            {test.detail}
                          </p>
                        ) : null}
                      </div>
                      <span className="rounded bg-brand-lavender px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-brand-purple">
                        {test.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty>No tests were ordered.</Empty>
              )}
            </DetailSection>

            <DetailSection title="Prescriptions from this visit">
              {visit.prescriptions?.length ? (
                <div className="space-y-2">
                  {visit.prescriptions.map((rx) => (
                    <div
                      key={rx.label}
                      className="flex items-center justify-between rounded-2xl border-2 border-dashed border-brand-lavender p-5"
                    >
                      <div>
                        <p className="text-sm font-bold text-brand-purple-dark">
                          {rx.label}
                        </p>
                        <p className="text-[11px] text-brand-purple/70">
                          {rx.detail}
                        </p>
                      </div>
                      {onOpenPrescriptions ? (
                        <button
                          type="button"
                          onClick={onOpenPrescriptions}
                          className="text-xs font-bold text-brand-purple underline decoration-2 decoration-brand-lavender underline-offset-4 hover:decoration-brand-purple"
                        >
                          Open prescription
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <Empty>No prescription was issued at this visit.</Empty>
              )}
            </DetailSection>

            <div className="space-y-3 rounded-2xl bg-brand-lavender/30 p-6">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-purple">
                Follow-up & next step
              </h4>
              <p className="text-sm leading-relaxed text-brand-purple-dark/80">
                {visit.followUp ?? "No follow-up instructions were recorded."}
              </p>
              {visit.nextAppointment ? (
                <div className="flex items-center gap-2 border-t border-brand-lavender pt-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-purple" />
                  <p className="text-xs font-semibold text-brand-purple-dark">
                    Next appointment: {visit.nextAppointment}
                  </p>
                </div>
              ) : (
                <p className="text-xs font-medium text-brand-purple-dark/60">
                  No next appointment booked yet.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </article>
  );
}

/** Small form for a visit that happened outside Lubin. Prototype only. */
function OutsideVisitForm({
  onCancel,
  onSaved,
}: {
  onCancel: () => void;
  onSaved: (visit: PassportVisit) => void;
}) {
  const [date, setDate] = useState("");
  const [clinic, setClinic] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const ready = Boolean(date && clinic.trim());

  return (
    <div className="mt-4 rounded-2xl border border-brand-lavender bg-card p-5">
      <p className="text-[13.5px] font-bold text-brand-purple-dark">Add a visit outside Lubin</p>
      <p className="mt-0.5 text-[12.5px] text-brand-purple-dark/60">
        No clinic account or verification needed. Documents are optional — you can attach them later.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <FormField label="Visit date (required)">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldClass} />
        </FormField>
        <FormField label="Clinic or hospital name (required)">
          <input
            value={clinic}
            onChange={(e) => setClinic(e.target.value)}
            placeholder="e.g. Sample Community Clinic"
            className={fieldClass}
          />
        </FormField>
        <FormField label="Reason for visit (optional)">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. General checkup"
            className={fieldClass}
          />
        </FormField>
        <FormField label="Personal note (optional)">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything you want to remember"
            className={fieldClass}
          />
        </FormField>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!ready}
          onClick={() => onSaved(saveOutsideVisit({ date, clinic, reason, note }))}
          className="inline-flex h-10 items-center rounded-xl bg-brand-purple-dark px-4 text-[13px] font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-brand-lavender disabled:text-brand-purple-dark/50"
        >
          Save visit
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-10 items-center rounded-xl border border-brand-lavender bg-card px-4 text-[13px] font-semibold text-brand-purple-dark transition hover:bg-brand-lavender/40"
        >
          Cancel
        </button>
        {!ready ? (
          <span className="text-[12px] text-brand-purple-dark/55">
            Add the visit date and where it happened.
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** Documents linked to a visit. The same document stays in Records — never copied. */
function VisitDocuments({ visitId, visitLabel }: { visitId: string; visitLabel: string }) {
  const [records, setRecords] = useState<PassportRecord[]>([]);
  const [picking, setPicking] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const read = () => setRecords(allRecords());
    read();
    return subscribeRecords(read);
  }, []);

  const linked = records.filter((r) => r.visitId === visitId);
  const available = records.filter((r) => r.visitId !== visitId);

  return (
    <DetailSection title="Documents">
      {linked.length ? (
        <ul className="space-y-2">
          {linked.map((record) => (
            <li
              key={record.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-lavender bg-card p-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-brand-purple-dark">
                  {record.fileName ?? record.title}
                </p>
                <p className="text-[11.5px] text-brand-purple-accent">
                  {formatRecordDate(record.date)} · {record.source} · Also in Records
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  unlinkRecordFromVisit(record.id);
                  toast.success("Document unlinked from this visit. It stays in Records.");
                }}
                className="text-xs font-semibold text-brand-purple underline decoration-2 decoration-brand-lavender underline-offset-4 hover:decoration-brand-purple"
              >
                Unlink
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>No documents attached yet. You can add them any time.</Empty>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={() => {
            setPicking((v) => !v);
            setUploading(false);
          }}
          className="inline-flex h-9 items-center rounded-xl border border-brand-lavender bg-card px-3.5 text-[12.5px] font-semibold text-brand-purple-dark transition hover:bg-brand-lavender/40"
        >
          Add existing record
        </button>
        <button
          type="button"
          onClick={() => {
            setUploading((v) => !v);
            setPicking(false);
          }}
          className="inline-flex h-9 items-center rounded-xl bg-brand-purple-dark px-3.5 text-[12.5px] font-semibold text-white transition hover:opacity-90"
        >
          Upload document
        </button>
      </div>

      {picking ? (
        <div className="rounded-2xl border border-brand-lavender bg-card p-4">
          <p className="text-[12.5px] font-semibold text-brand-purple-dark">
            Choose a record already in your Health Passport
          </p>
          {available.length ? (
            <ul className="mt-3 space-y-2">
              {available.map((record) => (
                <li key={record.id} className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[12.5px] text-brand-purple-dark/85">
                    {record.title}
                    <span className="text-brand-purple-accent">
                      {" "}
                      · {formatRecordDate(record.date)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      linkRecordToVisit(record.id, visitId, visitLabel);
                      setPicking(false);
                      toast.success("Record linked to this visit");
                    }}
                    className="text-xs font-semibold text-brand-purple underline decoration-2 decoration-brand-lavender underline-offset-4 hover:decoration-brand-purple"
                  >
                    Link
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Every record is already linked to this visit.</Empty>
          )}
        </div>
      ) : null}

      {uploading ? (
        <UploadPanel
          presetVisitId={visitId}
          onClose={() => setUploading(false)}
          onSaved={() => {
            setUploading(false);
            toast.success("Document added to this visit and to Records");
          }}
        />
      ) : null}
    </DetailSection>
  );
}

const fieldClass =
  "h-10 w-full rounded-xl border border-brand-lavender bg-card px-3 text-[13px] text-brand-purple-dark outline-none transition focus:border-brand-purple";

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-purple-accent">
        {label}
      </span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-purple">
        {title}
      </h4>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] italic text-brand-purple-dark/45">{children}</p>;
}

function FilterPill({
  tone,
  children,
}: {
  tone: "scheduled" | "completed";
  children: React.ReactNode;
}) {
  const styles =
    tone === "completed"
      ? "bg-brand-purple text-white shadow-sm shadow-brand-purple/20"
      : "border border-brand-lavender bg-brand-lavender/30 text-brand-purple-dark hover:bg-brand-lavender";
  return (
    <span
      className={`rounded-full px-5 py-2 text-xs font-semibold transition-colors ${styles}`}
    >
      {children}
    </span>
  );
}

function StatusPill({
  tone,
  children,
}: {
  tone: "scheduled" | "completed";
  children: React.ReactNode;
}) {
  const styles =
    tone === "completed"
      ? "bg-brand-purple text-white"
      : "border border-brand-lavender text-brand-purple-accent";
  return (
    <span
      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${styles}`}
    >
      {children}
    </span>
  );
}
