import { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  ClipboardList,
  FlaskConical,
  MapPin,
  Pill,
  Stethoscope,
  UserRound,
} from "lucide-react";

import {
  PASSPORT_VISITS,
  formatVisitDate,
  visitCounts,
  type PassportVisit,
} from "@/lib/passport/visits";

/**
 * Prototype visit timeline for the patient Health Passport.
 * Demo records only — see src/lib/passport/visits.ts.
 */
export default function VisitsTimeline({
  onOpenPrescriptions,
}: {
  onOpenPrescriptions?: () => void;
}) {
  const scheduled = useMemo(
    () =>
      PASSPORT_VISITS.filter((v) => v.kind === "scheduled").sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    [],
  );
  const completed = useMemo(
    () =>
      PASSPORT_VISITS.filter((v) => v.kind === "completed").sort((a, b) =>
        b.date.localeCompare(a.date),
      ),
    [],
  );
  const counts = visitCounts();
  const [selectedId, setSelectedId] = useState<string>(completed[0]?.id ?? scheduled[0]?.id ?? "");
  const selected = PASSPORT_VISITS.find((v) => v.id === selectedId) ?? completed[0];

  return (
    <section className="space-y-5" aria-label="Visits and checkups">
      <div className="rounded-[12px] border border-brand-purple/15 bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2 text-brand-purple">
          <Stethoscope className="h-4 w-4" />
          <span className="text-[11px] font-bold uppercase tracking-[0.15em]">
            Visits and checkups
          </span>
        </div>
        <h2 className="mt-3 text-xl font-bold text-brand-purple-dark sm:text-2xl">
          Every visit in one timeline
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-purple-dark/65">
          Upcoming appointments are what is still ahead. Completed visits hold what the clinician
          recorded — summary, findings, tests, prescriptions, and follow-up.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Pill2 tone="scheduled">{counts.scheduled} scheduled appointments</Pill2>
          <Pill2 tone="completed">{counts.completed} completed visits</Pill2>
          <Pill2 tone="muted">Demo records in this prototype</Pill2>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
        <div className="space-y-6">
          <TimelineGroup
            title="Scheduled appointments"
            hint="Not yet happened · nothing recorded"
            visits={scheduled}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <TimelineGroup
            title="Completed visits"
            hint="Recorded by the clinic"
            visits={completed}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>

        <div className="lg:sticky lg:top-24">
          {selected ? (
            <VisitDetail visit={selected} onOpenPrescriptions={onOpenPrescriptions} />
          ) : null}
        </div>
      </div>
    </section>
  );
}

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
  if (!visits.length) return null;
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[13px] font-bold uppercase tracking-[0.14em] text-brand-purple-dark/70">
          {title}
        </h3>
        <span className="text-[11.5px] text-brand-purple-dark/45">{hint}</span>
      </div>
      <ol className="mt-3 space-y-2.5 border-l border-brand-purple/15 pl-4">
        {visits.map((visit) => {
          const active = visit.id === selectedId;
          const scheduled = visit.kind === "scheduled";
          return (
            <li key={visit.id} className="relative">
              <span
                aria-hidden
                className={`absolute -left-[21px] top-5 h-2.5 w-2.5 rounded-full ${
                  scheduled
                    ? "border-2 border-brand-purple/50 bg-card"
                    : "bg-brand-purple"
                }`}
              />
              <button
                type="button"
                onClick={() => onSelect(visit.id)}
                aria-current={active}
                className={`w-full rounded-[12px] border p-4 text-left transition ${
                  active
                    ? "border-brand-purple/45 bg-brand-lavender/50 shadow-sm"
                    : "border-brand-purple/15 bg-card hover:border-brand-purple/35 hover:bg-brand-lavender/30"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12.5px] font-bold text-brand-purple-dark">
                    {formatVisitDate(visit.date)}
                    {visit.time ? ` · ${visit.time}` : ""}
                  </span>
                  <Pill2 tone={scheduled ? "scheduled" : "completed"}>
                    {scheduled ? "Scheduled" : "Completed visit"}
                  </Pill2>
                </div>
                <p className="mt-1.5 text-[14px] font-semibold text-brand-purple-dark">
                  {visit.reason}
                </p>
                <p className="mt-1 text-[12px] text-brand-purple-dark/60">
                  {visit.clinician} · {visit.clinic}
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-brand-purple">
                  {scheduled ? "View appointment" : "View visit details"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
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
  return (
    <article className="overflow-hidden rounded-[12px] border border-brand-purple/15 bg-card shadow-sm">
      <header className="bg-brand-lavender/45 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Pill2 tone={scheduled ? "scheduled" : "completed"}>
            {scheduled ? "Scheduled appointment" : "Completed visit"}
          </Pill2>
          <span className="text-[12px] font-medium text-brand-purple-dark/60">
            {visit.recordedBy ?? "Nothing recorded yet"}
          </span>
        </div>
        <h3 className="mt-2.5 text-[17px] font-bold text-brand-purple-dark">{visit.reason}</h3>
        <div className="mt-2 grid gap-1.5 text-[12.5px] text-brand-purple-dark/65 sm:grid-cols-2">
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5 text-brand-purple" />
            {formatVisitDate(visit.date)}
            {visit.time ? ` · ${visit.time}` : ""}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <UserRound className="h-3.5 w-3.5 text-brand-purple" />
            {visit.clinician} · {visit.clinicianRole}
          </span>
          <span className="inline-flex items-center gap-1.5 sm:col-span-2">
            <MapPin className="h-3.5 w-3.5 text-brand-purple" />
            {visit.clinic}
          </span>
        </div>
      </header>

      <div className="space-y-5 px-5 py-5 sm:px-6">
        {scheduled ? (
          <>
            <Block icon={ClipboardList} title="Before this appointment">
              {visit.preparation?.length ? (
                <ul className="space-y-1.5">
                  {visit.preparation.map((item) => (
                    <li key={item} className="flex gap-2 text-[13px] text-brand-purple-dark/75">
                      <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-purple/50" />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>Nothing to prepare yet.</Empty>
              )}
            </Block>
            <p className="rounded-[12px] bg-brand-lavender/40 px-4 py-3 text-[12.5px] leading-relaxed text-brand-purple-dark/65">
              A summary, findings, tests, and follow-up appear here once the visit is completed and
              the clinician records it.
            </p>
          </>
        ) : (
          <>
            <Block icon={ClipboardList} title="Visit summary">
              <p className="text-[13px] leading-relaxed text-brand-purple-dark/75">
                {visit.summary}
              </p>
            </Block>

            <Block icon={Stethoscope} title="Diagnoses or findings">
              {visit.findings?.length ? (
                <ul className="flex flex-wrap gap-2">
                  {visit.findings.map((finding) => (
                    <li
                      key={finding}
                      className="rounded-[10px] border border-brand-purple/20 bg-brand-lavender/35 px-2.5 py-1 text-[12.5px] font-medium text-brand-purple-dark"
                    >
                      {finding}
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>The clinician did not record a diagnosis for this visit.</Empty>
              )}
            </Block>

            <Block icon={FlaskConical} title="Tests ordered">
              {visit.tests?.length ? (
                <ul className="space-y-2">
                  {visit.tests.map((test) => (
                    <li
                      key={test.name}
                      className="rounded-[12px] border border-brand-purple/15 px-3.5 py-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[13px] font-semibold text-brand-purple-dark">
                          {test.name}
                        </span>
                        <Pill2 tone="muted">{test.status}</Pill2>
                      </div>
                      {test.detail ? (
                        <p className="mt-1 text-[12.5px] text-brand-purple-dark/60">{test.detail}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>No tests were ordered.</Empty>
              )}
            </Block>

            <Block icon={Pill} title="Prescriptions from this visit">
              {visit.prescriptions?.length ? (
                <ul className="space-y-2">
                  {visit.prescriptions.map((rx) => (
                    <li
                      key={rx.label}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-brand-purple/15 px-3.5 py-2.5"
                    >
                      <span>
                        <span className="block text-[13px] font-semibold text-brand-purple-dark">
                          {rx.label}
                        </span>
                        <span className="block text-[12.5px] text-brand-purple-dark/60">
                          {rx.detail}
                        </span>
                      </span>
                      {onOpenPrescriptions ? (
                        <button
                          type="button"
                          onClick={onOpenPrescriptions}
                          className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-purple hover:text-brand-purple-dark"
                        >
                          Open prescription <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>No prescription was issued at this visit.</Empty>
              )}
            </Block>

            <Block icon={CalendarClock} title="Follow-up and next appointment">
              <p className="text-[13px] leading-relaxed text-brand-purple-dark/75">
                {visit.followUp ?? "No follow-up instructions were recorded."}
              </p>
              <p className="mt-2 text-[12.5px] font-medium text-brand-purple-dark/60">
                {visit.nextAppointment
                  ? `Next appointment: ${visit.nextAppointment}`
                  : "No next appointment booked yet."}
              </p>
            </Block>
          </>
        )}
      </div>
    </article>
  );
}

function Block({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof CalendarClock;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-purple">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </h4>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[12.5px] italic text-brand-purple-dark/45">{children}</p>;
}

function Pill2({
  tone,
  children,
}: {
  tone: "scheduled" | "completed" | "muted";
  children: React.ReactNode;
}) {
  const styles =
    tone === "completed"
      ? "bg-brand-purple text-primary-foreground"
      : tone === "scheduled"
        ? "border border-brand-purple/35 bg-card text-brand-purple"
        : "bg-brand-purple/10 text-brand-purple-dark/65";
  return (
    <span
      className={`inline-flex items-center rounded-[10px] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] ${styles}`}
    >
      {children}
    </span>
  );
}
