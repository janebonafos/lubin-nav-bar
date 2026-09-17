import { useEffect, useMemo, useState } from "react";

import {
  ALL_HEALTH_DETAIL_FIELDS,
  loadHealthDetails,
  type HealthDetails,
} from "@/lib/intake/healthDetails";
import { groupMedications, type MedicationEntry } from "@/lib/passport/medications";
import { allRecords, recordReviewLabel, recordSourceLabel, type PassportRecord } from "@/lib/passport/records";
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

export default function ProviderSharedPassportContents({ grant }: { grant: ProviderShareGrant }) {
  const [data, setData] = useState<SharedData>(EMPTY);
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
      const value = data.health[field.id]?.trim();
      return value ? [{ label: field.label, value: displayHealthValue(value) }] : [];
    });
  }, [data.health, grant.healthFieldIds, includesHealth]);

  const includeCheckins = grant.includedKeys.some((key) =>
    ["mood", "summary", "checkins", "conversations"].includes(key),
  );
  const includeAssessments = grant.includedKeys.includes("assessments");

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

          <PassportSection title="Allergies" count={healthRows.some((row) => row.label === "Allergies or reactions") ? 1 : 0}>
            <p className="text-[12.5px] leading-relaxed text-brand-navy/75">
              {healthRows.find((row) => row.label === "Allergies or reactions")?.value ?? "Not answered"}
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
            <PassportSection title="Visits" count={data.visits.length}>
              <ul className="space-y-3">
                {data.visits.slice(0, 3).map((visit) => (
                  <li key={visit.id}>
                    <p className="text-[12.5px] font-semibold text-brand-purple-dark">{visit.reason}</p>
                    <p className="mt-0.5 text-[12px] text-brand-navy/65">
                      {formatVisitDate(visit.date)} · {visit.clinic}
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-brand-purple">
                      {visit.origin === "patient" ? "Added by the client · Outside Lubin" : visit.recordedBy ?? "Added by the care team"}
                    </p>
                  </li>
                ))}
              </ul>
            </PassportSection>

            <PassportSection title="Documents" count={data.records.length}>
              <ul className="space-y-3">
                {data.records.slice(0, 3).map((record) => (
                  <li key={record.id}>
                    <p className="text-[12.5px] font-semibold text-brand-purple-dark">
                      {record.fileName ?? record.title}
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-brand-navy/65">{recordSourceLabel(record)}</p>
                    <p className="mt-0.5 text-[11.5px] text-brand-purple">
                      {recordReviewLabel(record) ?? "No clinician review recorded"}
                    </p>
                  </li>
                ))}
              </ul>
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
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[12px] border border-brand-lavender bg-card px-4 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="font-display text-[17px] text-brand-purple-dark">{title}</h4>
        {count !== undefined && <span className="text-[11px] font-semibold text-brand-purple">{count} shared</span>}
      </div>
      {children}
    </section>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
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