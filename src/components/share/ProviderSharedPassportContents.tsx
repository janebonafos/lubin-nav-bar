import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  ALL_HEALTH_DETAIL_FIELDS,
  loadHealthDetails,
  type HealthDetails,
} from "@/lib/intake/healthDetails";
import { groupMedications, type MedicationEntry } from "@/lib/passport/medications";
import {
  allRecords,
  formatRecordDate,
  recordReviewLabel,
  recordTypeLabel,
  type PassportRecord,
} from "@/lib/passport/records";
import { allVisits, formatVisitDate, type PassportVisit } from "@/lib/passport/visits";
import type { ProviderShareGrant } from "@/lib/share/providerShareStore";

type SharedData = {
  health: HealthDetails;
  medications: MedicationEntry[];
  visits: PassportVisit[];
  records: PassportRecord[];
};

const EMPTY: SharedData = { health: {}, medications: [], visits: [], records: [] };

function displayHealthValue(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => {
          if (!item || typeof item !== "object") return String(item);
          const row = item as Record<string, string>;
          return [row.name, row.dose, row.frequency].filter(Boolean).join(" · ");
        })
        .filter(Boolean)
        .join("; ");
    }
  } catch {
    /* Plain text values are expected for most fields. */
  }
  return value;
}

function providerRecordSourceLabel(record: PassportRecord) {
  if (record.origin === "uploaded") {
    return record.addedBy ? `Added by the client · From ${record.addedBy}` : "Added by the client";
  }
  if (record.addedBy) {
    return `Added by ${record.addedBy}${record.addedByRole ? ` · ${record.addedByRole}` : ""}`;
  }
  return "Added by the care team";
}

export default function ProviderSharedPassportContents({ grant }: { grant: ProviderShareGrant }) {
  const [data, setData] = useState<SharedData>(EMPTY);
  const [showAllVisits, setShowAllVisits] = useState(false);
  const [showAllRecords, setShowAllRecords] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<PassportVisit | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<PassportRecord | null>(null);
  const includesHealth = grant.includedKeys.includes("health");

  useEffect(() => {
    if (!includesHealth) return;
    const grouped = groupMedications();
    setData({
      health: loadHealthDetails(),
      medications: grouped.current,
      visits: allVisits()
        .filter((visit) => visit.kind === "completed")
        .sort((a, b) => b.date.localeCompare(a.date)),
      records: allRecords(),
    });
  }, [includesHealth, grant.updatedAt, grant.createdAt]);

  const healthRows = useMemo(() => {
    if (!includesHealth) return [];
    const allowed = grant.healthFieldIds ? new Set(grant.healthFieldIds) : null;
    return ALL_HEALTH_DETAIL_FIELDS.flatMap((field) => {
      if (allowed && !allowed.has(field.id)) return [];
      if (["history.allergies", "medication.list"].includes(field.id)) return [];
      const value = data.health[field.id]?.trim();
      return value ? [{ label: field.label, value: displayHealthValue(value) }] : [];
    });
  }, [data.health, grant.healthFieldIds, includesHealth]);

  const includeCheckins = grant.includedKeys.some((key) =>
    ["mood", "summary", "checkins", "conversations"].includes(key),
  );
  const includeAssessments = grant.includedKeys.includes("assessments");
  const visibleVisits = showAllVisits ? data.visits : data.visits.slice(0, 3);
  const visibleRecords = showAllRecords ? data.records : data.records.slice(0, 3);
  const selectedVisitDocuments = selectedVisit
    ? data.records.filter((record) => record.visitId === selectedVisit.id)
    : [];
  const selectedRecordVisit = selectedRecord?.visitId
    ? data.visits.find((visit) => visit.id === selectedRecord.visitId) ?? null
    : null;

  return (
    <div className="space-y-5 font-body">
      {includesHealth ? (
        <>
          <PassportSection title="Health details" count={healthRows.length}>
            {healthRows.length ? (
              <dl className="divide-y divide-brand-lavender/70">
                {healthRows.map((row) => (
                  <div key={row.label} className="grid gap-1 py-2.5 sm:grid-cols-[180px_1fr] sm:gap-4">
                    <dt className="text-[12px] font-semibold text-brand-purple-dark">{row.label}</dt>
                    <dd className="text-[12.5px] leading-relaxed text-brand-navy/75">{row.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <EmptyLine>No completed health details were included.</EmptyLine>
            )}
          </PassportSection>

          <PassportSection title="Allergies" count={data.health["history.allergies"]?.trim() ? 1 : 0}>
            <p className="text-[12.5px] leading-relaxed text-brand-navy/75">
              {data.health["history.allergies"]?.trim() ?? "Not answered"}
            </p>
          </PassportSection>

          <PassportSection title="Current medications" count={data.medications.length}>
            {data.medications.length ? (
              <ul className="divide-y divide-brand-lavender/70">
                {data.medications.map((medication) => (
                  <li key={medication.id} className="py-2.5 first:pt-0 last:pb-0">
                    <p className="text-[12.5px] font-semibold text-brand-purple-dark">
                      {medication.name} {medication.strength}
                    </p>
                    <p className="mt-0.5 text-[12px] text-brand-navy/65">
                      {medication.frequency} · {medication.sourceDetail}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyLine>No current medications were included.</EmptyLine>
            )}
          </PassportSection>

          <div className="grid gap-4 lg:grid-cols-2">
            <PassportSection
              title="Visits"
              count={data.visits.length}
              action={
                data.visits.length > 3 ? (
                  <button
                    type="button"
                    onClick={() => setShowAllVisits((value) => !value)}
                    className="rounded-[8px] border border-brand-lavender bg-card px-2.5 py-1 text-[11px] font-semibold text-brand-purple-dark hover:bg-secondary"
                  >
                    {showAllVisits ? "Show fewer" : `View all ${data.visits.length}`}
                  </button>
                ) : null
              }
            >
              {visibleVisits.length ? (
                <ul className="space-y-3">
                  {visibleVisits.map((visit) => (
                    <li key={visit.id} className="rounded-[10px] border border-brand-lavender/70 bg-secondary/45 px-3 py-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-semibold text-brand-purple-dark">{visit.reason}</p>
                          <p className="mt-0.5 text-[12px] text-brand-navy/65">
                            {formatVisitDate(visit.date)} · {visit.clinic}
                          </p>
                          <p className="mt-0.5 text-[11.5px] text-brand-purple">
                            {visit.origin === "patient" ? "Added by the client · Outside Lubin" : visit.recordedBy ?? "Added by the care team"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedVisit((current) => (current?.id === visit.id ? null : visit))}
                          className="shrink-0 rounded-[8px] bg-brand-purple-dark px-2.5 py-1 text-[11px] font-semibold text-primary-foreground hover:bg-brand-purple"
                        >
                          {selectedVisit?.id === visit.id ? "Close" : "Open visit"}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyLine>No visits were included.</EmptyLine>
              )}
              {selectedVisit && (
                <VisitDetail
                  visit={selectedVisit}
                  documents={selectedVisitDocuments}
                  onOpenDocument={(record) => {
                    setSelectedRecord(record);
                    setShowAllRecords(true);
                  }}
                />
              )}
            </PassportSection>

            <PassportSection
              title="Documents"
              count={data.records.length}
              action={
                data.records.length > 3 ? (
                  <button
                    type="button"
                    onClick={() => setShowAllRecords((value) => !value)}
                    className="rounded-[8px] border border-brand-lavender bg-card px-2.5 py-1 text-[11px] font-semibold text-brand-purple-dark hover:bg-secondary"
                  >
                    {showAllRecords ? "Show fewer" : `View all ${data.records.length}`}
                  </button>
                ) : null
              }
            >
              {visibleRecords.length ? (
                <ul className="space-y-3">
                  {visibleRecords.map((record) => (
                    <li key={record.id} className="rounded-[10px] border border-brand-lavender/70 bg-secondary/45 px-3 py-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-semibold text-brand-purple-dark">
                            {record.fileName ?? record.title}
                          </p>
                          <p className="mt-0.5 text-[11.5px] text-brand-navy/65">{providerRecordSourceLabel(record)}</p>
                          <p className="mt-0.5 text-[11.5px] text-brand-purple">
                            {recordReviewLabel(record) ?? "No clinician review recorded"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedRecord((current) => (current?.id === record.id ? null : record))}
                          className="shrink-0 rounded-[8px] bg-brand-purple-dark px-2.5 py-1 text-[11px] font-semibold text-primary-foreground hover:bg-brand-purple"
                        >
                          {selectedRecord?.id === record.id ? "Close" : "View document"}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyLine>No documents were included.</EmptyLine>
              )}
              {selectedRecord && (
                <RecordDetail
                  record={selectedRecord}
                  relatedVisit={selectedRecordVisit}
                  onOpenVisit={(visit) => {
                    setSelectedVisit(visit);
                    setShowAllVisits(true);
                  }}
                />
              )}
            </PassportSection>
          </div>
        </>
      ) : (
        <div className="rounded-[12px] border border-dashed border-brand-lavender bg-secondary/50 px-4 py-3">
          <p className="text-[12.5px] text-brand-navy/70">
            Health details, allergies, medications, visits and documents were not included in this share.
          </p>
        </div>
      )}

      {(includeCheckins || includeAssessments) && (
        <PassportSection title="Wellbeing information">
          <div className="grid gap-3 sm:grid-cols-2">
            {includeCheckins && (
              <SummaryLine
                label="Check-ins and patterns"
                value={`${grant.snapshot.checkinsInRange.length} check-ins · ${grant.snapshot.rangeLabel}`}
              />
            )}
            {includeAssessments && (
              <SummaryLine
                label="Assessment results"
                value={`${grant.snapshot.attemptsInRange.length} shared result${grant.snapshot.attemptsInRange.length === 1 ? "" : "s"}`}
              />
            )}
          </div>
        </PassportSection>
      )}
    </div>
  );
}

function PassportSection({
  title,
  count,
  action,
  children,
}: {
  title: string;
  count?: number;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[12px] border border-brand-lavender bg-card px-4 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="font-display text-[17px] text-brand-purple-dark">{title}</h4>
        <div className="flex shrink-0 items-center gap-2">
          {count !== undefined && <span className="text-[11px] font-semibold text-brand-purple">{count} shared</span>}
          {action}
        </div>
      </div>
      {children}
    </section>
  );
}

function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="text-[12.5px] text-brand-navy/55">{children}</p>;
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[12px] font-semibold text-brand-purple-dark">{label}</p>
      <p className="mt-0.5 text-[12px] text-brand-navy/65">{value}</p>
    </div>
  );
}

function VisitDetail({
  visit,
  documents,
  onOpenDocument,
}: {
  visit: PassportVisit;
  documents: PassportRecord[];
  onOpenDocument: (record: PassportRecord) => void;
}) {
  return (
    <div className="mt-3 rounded-[10px] border border-brand-lavender bg-card px-3 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand-purple">Open visit</p>
      <p className="mt-1 text-[13px] font-semibold text-brand-purple-dark">{visit.reason}</p>
      <p className="mt-0.5 text-[12px] text-brand-navy/65">
        {formatVisitDate(visit.date)} · {visit.clinic} · {visit.clinician}
      </p>
      {(visit.summary || visit.note) && (
        <p className="mt-2 text-[12.5px] leading-relaxed text-brand-navy/75">{visit.summary ?? visit.note}</p>
      )}
      {visit.findings && visit.findings.length > 0 && (
        <DetailList title="Findings" items={visit.findings} />
      )}
      {visit.tests && visit.tests.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand-purple">Tests</p>
          <ul className="mt-1.5 space-y-1.5">
            {visit.tests.map((test) => (
              <li key={`${test.name}-${test.status}`} className="text-[12px] text-brand-navy/70">
                <span className="font-semibold text-brand-purple-dark">{test.name}</span> · {test.status}
                {test.detail ? ` · ${test.detail}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
      {visit.prescriptions && visit.prescriptions.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand-purple">Prescriptions</p>
          <ul className="mt-1.5 space-y-1.5">
            {visit.prescriptions.map((prescription) => (
              <li key={prescription.label} className="text-[12px] text-brand-navy/70">
                <span className="font-semibold text-brand-purple-dark">{prescription.label}</span> · {prescription.detail}
              </li>
            ))}
          </ul>
        </div>
      )}
      {visit.followUp && <DetailList title="Follow-up" items={[visit.followUp]} />}
      {documents.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand-purple">Documents from this visit</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {documents.map((record) => (
              <button
                key={record.id}
                type="button"
                onClick={() => onOpenDocument(record)}
                className="rounded-[8px] border border-brand-lavender bg-secondary px-2.5 py-1 text-[11px] font-semibold text-brand-purple-dark hover:bg-brand-lavender/50"
              >
                {record.fileName ?? record.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RecordDetail({
  record,
  relatedVisit,
  onOpenVisit,
}: {
  record: PassportRecord;
  relatedVisit: PassportVisit | null;
  onOpenVisit: (visit: PassportVisit) => void;
}) {
  return (
    <div className="mt-3 rounded-[10px] border border-brand-lavender bg-card px-3 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand-purple">Document view</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <p className="text-[13px] font-semibold text-brand-purple-dark">{record.fileName ?? record.title}</p>
        <span className="rounded-[8px] bg-secondary px-2 py-0.5 text-[10px] font-semibold text-brand-purple">
          {recordTypeLabel(record.type)}
        </span>
      </div>
      <p className="mt-0.5 text-[12px] text-brand-navy/65">
        {formatRecordDate(record.date)} · {record.source}
      </p>
      <p className="mt-0.5 text-[11.5px] text-brand-purple">
        {providerRecordSourceLabel(record)} · {recordReviewLabel(record) ?? "No clinician review recorded"}
      </p>
      {record.summary && <p className="mt-2 text-[12.5px] leading-relaxed text-brand-navy/75">{record.summary}</p>}
      <div className="mt-3 rounded-[8px] border border-dashed border-brand-lavender bg-secondary/45 px-3 py-2.5">
        <p className="text-[12px] font-semibold text-brand-purple-dark">
          {record.fileName ? `${record.fileName}${record.fileSizeLabel ? ` · ${record.fileSizeLabel}` : ""}` : "Demo document details"}
        </p>
        <p className="mt-0.5 text-[11.5px] text-brand-navy/60">
          This prototype opens the saved dummy details for review; no real file leaves the device.
        </p>
      </div>
      {relatedVisit && (
        <button
          type="button"
          onClick={() => onOpenVisit(relatedVisit)}
          className="mt-3 rounded-[8px] border border-brand-lavender bg-card px-2.5 py-1 text-[11px] font-semibold text-brand-purple-dark hover:bg-secondary"
        >
          Open related visit
        </button>
      )}
    </div>
  );
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand-purple">{title}</p>
      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[12px] leading-relaxed text-brand-navy/70">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}