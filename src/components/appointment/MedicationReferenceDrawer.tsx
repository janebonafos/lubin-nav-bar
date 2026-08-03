import { useEffect, useState } from "react";
import {
  X,
  Loader2,
  ExternalLink,
  FileText,
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  Check,
  RefreshCw,
} from "lucide-react";
import {
  ORIGIN_LABELS,
  SOURCE_KIND_LABEL,
  type MedicationReference,
  type MedicationSource,
  type PatientSafetyInfo,
  type PrescriptionMedication,
  type RxCountry,
  type SourceKind,
} from "@/lib/prescription/store";
import type { SharedSafetyResponse } from "@/lib/prescription/sharedSafety";
import {
  AI_SUMMARY_CAVEAT,
  PATIENT_REVIEW_CAVEAT,
  fetchMedicationReference,
} from "@/lib/prescription/reference";

/** Official starting point when the summary itself could not be produced. */
function officialSourceUrl(country: RxCountry, name: string) {
  const q = encodeURIComponent(name.trim() || "medication");
  return country === "PH"
    ? `https://verification.fda.gov.ph/all_registereddruglist.php?keyword=${q}`
    : `https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=${q}`;
}

function sourceOrganisation(s: MedicationSource) {
  if (s.organisation?.trim()) return s.organisation.trim();
  try {
    if (!s.url) return "Not stated";
    return new URL(s.url).hostname.replace(/^www\./, "");
  } catch {
    return "Not stated";
  }
}

const SOURCE_ORDER: SourceKind[] = ["label", "formulary", "secondary", "ai"];

export function OriginBadge({ med }: { med: PrescriptionMedication }) {
  const origin = med.origin ?? "ai";
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#E2D7F3] bg-[#FAF7FE] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#7E6BAF]">
      {origin === "manual" ? <FileText className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
      {ORIGIN_LABELS[origin]}
    </span>
  );
}

/** Shown first: what could stop this prescription. */
const KEY_SAFETY_ROWS: { key: keyof MedicationReference["general"]; label: string }[] = [
  { key: "interactions", label: "Important drug interactions" },
  { key: "contraindications", label: "Contraindications" },
  { key: "seriousAdverseEffects", label: "Serious adverse effects" },
  { key: "pregnancyLactation", label: "Pregnancy and breastfeeding (label wording)" },
];

/** Summary of the approved product label. */
const LABEL_ROWS: { key: keyof MedicationReference["general"]; label: string }[] = [
  { key: "genericName", label: "Generic name" },
  { key: "brandNames", label: "Brand names" },
  { key: "medicationClass", label: "Medication class" },
  { key: "approvedIndications", label: "Approved indications" },
  { key: "mechanism", label: "How the medication works" },
  { key: "strengthsForms", label: "Available strengths and dosage forms" },
  { key: "referenceDosing", label: "Reference dosing information" },
  { key: "administration", label: "Administration guidance" },
  { key: "commonAdverseEffects", label: "Common adverse effects" },
  { key: "monitoring", label: "Monitoring recommendations" },
  { key: "renalHepatic", label: "Renal and hepatic considerations" },
  { key: "discontinuation", label: "Discontinuation or tapering" },
  { key: "controlledSubstance", label: "Controlled-substance classification" },
  { key: "availability", label: "Availability in this jurisdiction" },
];

const PATIENT_ROWS: { key: keyof MedicationReference["patient"]; label: string }[] = [
  { key: "targetSymptoms", label: "Target symptoms or diagnosis" },
  { key: "patientInfoConsidered", label: "Patient information considered" },
  { key: "allergiesReviewed", label: "Allergies reviewed" },
  { key: "currentMedicationsReviewed", label: "Current medications reviewed" },
  { key: "potentialInteractions", label: "Potential patient-specific interactions" },
  { key: "relevantConditions", label: "Relevant medical conditions" },
  { key: "previousTrials", label: "Previous medication trials" },
  { key: "labMonitoring", label: "Relevant laboratory or monitoring information" },
  { key: "missingInformation", label: "Important information still missing" },
];

export function MedicationReferenceDrawer({
  open,
  onClose,
  med,
  country,
  appointmentId,
  clientName,
  onCached,
  onExternallyVerified,
  patientInfo,
  sharedSafety,
}: {
  open: boolean;
  onClose: () => void;
  med: PrescriptionMedication | null;
  country: RxCountry;
  appointmentId: string;
  clientName?: string;
  onCached?: (ref: MedicationReference) => void;
  onExternallyVerified?: () => void;
  patientInfo?: PatientSafetyInfo;
  sharedSafety?: SharedSafetyResponse | null;
}) {
  const [ref, setRef] = useState<MedicationReference | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (force?: boolean) => {
    if (!med) return;
    if (!force && med.reference && med.reference.country === country) {
      setRef(med.reference);
      setError(null);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const data = await fetchMedicationReference({
        appointmentId,
        med,
        country,
        clientName,
        patientInfo,
      });
      setRef(data);
      onCached?.(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load reference.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!open || !med) return;
    setRef(null);
    setError(null);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, med?.id, country]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const sortedSources = [...(ref?.sources ?? [])].sort(
    (x, y) =>
      SOURCE_ORDER.indexOf(x.kind ?? "secondary") - SOURCE_ORDER.indexOf(y.kind ?? "secondary"),
  );
  const otherSources = sortedSources.filter((s) => (s.kind ?? "secondary") !== "label");
  const missingPatientInfo = ref ? missingFromReference(ref) : [];

  if (!open || !med) return null;

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <button
        type="button"
        aria-label="Close medication reference"
        onClick={onClose}
        className="absolute inset-0 bg-[#2C2B4B]/40"
      />
      <aside
        role="dialog"
        aria-label={`Medication reference for ${med.name || "medication"}`}
        className="relative flex h-full w-full max-w-[560px] flex-col bg-white shadow-2xl"
      >
        <header className="flex items-start gap-3 border-b border-[#ECE7F6] bg-[#FAF7FE] px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#7E6BAF]">
              Medication reference · {country === "PH" ? "Philippines" : "United States"}
            </p>
            <h2 className="truncate text-base font-semibold text-[#3D2E6B]">
              {med.name || "Medication draft"}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <OriginBadge med={med} />
              {[med.dose, med.route, med.frequency].filter(Boolean).length > 0 && (
                <span className="text-[11px] text-[#7E6BAF]">
                  {[med.dose, med.route, med.frequency].filter(Boolean).join(" · ")}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] p-1.5 text-[#7E6BAF] hover:bg-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {busy && (
            <div className="flex items-center gap-2 rounded-xl border border-[#E1D9F1] bg-[#FCFAFE] px-3.5 py-3 text-[13px] text-[#3D2E6B]">
              <Loader2 className="h-4 w-4 animate-spin text-[#7E6BAF]" />
              Loading medication reference…
            </div>
          )}
          {!busy && error && !ref && (
            <div className="rounded-xl border border-[#E9C3C3] bg-[#FDF4F4] px-3.5 py-3">
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-[#9B4A4A]">
                <AlertTriangle className="h-4 w-4" /> Medication reference could not be loaded.
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-[#7A4B4B]">{error}</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void load(true)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-[10px] bg-[#6E4FD3] px-3 text-[12.5px] font-semibold text-white hover:bg-[#5A3EB8]"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Try again
                </button>
                <a
                  href={officialSourceUrl(country, med.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-[10px] border border-[#D9D5E3] bg-white px-3 text-[12.5px] font-semibold text-[#3D2E6B] hover:bg-[#F7F5FB]"
                >
                  Open official source <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              <p className="mt-2 text-[11.5px] leading-relaxed text-[#7A4B4B]">
                Jurisdiction: {country === "PH" ? "Philippines" : "United States"}. No AI summary is
                shown when the reference cannot be retrieved.
              </p>
            </div>
          )}

          {ref && (
            <>
              {/* AI summary caveat */}
              <div className="rounded-xl border border-[#E1D9F1] bg-[#FAF7FE] px-3.5 py-3">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#7E6BAF]">
                  <Sparkles className="h-3.5 w-3.5" /> AI-generated summary
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-[#5A4A8A]">
                  {AI_SUMMARY_CAVEAT}
                </p>
              </div>

              {ref.general.boxedWarning && (
                <div className="rounded-xl border border-[#E2D7F3] bg-white px-3.5 py-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#5A3E8F]">
                    <AlertTriangle className="h-3.5 w-3.5" /> Boxed warning
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-[#3D2E6B]">
                    {ref.general.boxedWarning}
                  </p>
                </div>
              )}

              {/* 1. Key safety information */}
              <Section
                title="Key safety information"
                subtitle="Reviewed first · interactions, contraindications and missing patient information"
              >
                {missingPatientInfo.length > 0 && (
                  <div className="mb-2.5 rounded-xl border border-[#E2D7F3] bg-[#FAF7FE] px-3 py-2.5">
                    <p className="text-[12px] font-semibold text-[#5A3E8F]">
                      Patient information still required
                    </p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[12px] leading-relaxed text-[#3D2E6B]">
                      {missingPatientInfo.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-[#7E6BAF]">
                      These items are shown as “Information required”, never as “no issue”.
                    </p>
                  </div>
                )}
                <dl className="divide-y divide-[#F1ECF9]">
                  {KEY_SAFETY_ROWS.map(({ key, label }) => (
                    <Row key={key} label={label} value={ref.general[key]} />
                  ))}
                </dl>
              </Section>

              {/* 2. Patient-specific review */}
              <Section
                title="Patient-specific review"
                subtitle="Based on the information recorded for this patient · Not a clinical determination"
                note={PATIENT_REVIEW_CAVEAT}
              >
                {sharedSafety && (
                  <div className="mb-2.5 rounded-xl border border-[#E7D9B8] bg-[#FDF8EE] px-3 py-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#8A6A20]">
                      Shared assessment safety response — review required
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-[#3D2E6B]">
                      {sharedSafety.assessmentName} ({sharedSafety.clinicalName}) ·{" "}
                      {new Date(sharedSafety.takenAt).toLocaleDateString()}
                    </p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-[#3D2E6B]">
                      {sharedSafety.itemText}
                    </p>
                    <p className="mt-0.5 text-[13px] font-semibold text-[#3D2E6B]">
                      Response: “{sharedSafety.response}”
                    </p>
                  </div>
                )}
                <dl className="divide-y divide-[#F1ECF9]">
                  {PATIENT_ROWS.map(({ key, label }) => (
                    <Row key={key} label={label} value={ref.patient[key]} />
                  ))}
                </dl>
              </Section>

              {/* 3. Official product label */}
              <Section
                title="Official product label"
                subtitle="Summarised from the approved product information linked below"
              >
                <dl className="divide-y divide-[#F1ECF9]">
                  {LABEL_ROWS.map(({ key, label }) => (
                    <Row key={key} label={label} value={ref.general[key]} />
                  ))}
                </dl>
              </Section>

              {/* 4. Additional drug references */}
              <Section
                title="Additional drug references"
                subtitle="Formularies and secondary references · not the approved product label"
              >
                {otherSources.length > 0 ? (
                  <ul className="space-y-2">
                    {otherSources.map((s, i) => (
                      <SourceItem key={`${s.url}-${i}`} source={s} country={country} ref_={ref} />
                    ))}
                  </ul>
                ) : (
                  <p className="text-[12.5px] leading-relaxed text-[#5A4A8A]">
                    No formulary or secondary reference was identified for this medication in this
                    jurisdiction.
                  </p>
                )}
              </Section>

              {/* 5. AI explanation */}
              <Section
                title="AI explanation"
                subtitle="Why this option was shown · not official prescribing information"
              >
                <dl className="divide-y divide-[#F1ECF9]">
                  <Row
                    label="Reason this option was shown"
                    value={ref.patient.aiRationale ?? med.rationale}
                  />
                </dl>
              </Section>

              {/* 6. Sources */}
              <Section title="Sources" subtitle="Every source name and link is clickable">
                {ref.sourcesAvailable ? (
                  <ul className="space-y-2">
                    {sortedSources.map((s, i) => (
                      <SourceItem key={`${s.url}-${i}`} source={s} country={country} ref_={ref} />
                    ))}
                  </ul>
                ) : (
                  <div className="space-y-2 rounded-xl border border-[#E2D7F3] bg-[#FAF7FE] p-3">
                    <p className="flex items-center gap-1.5 text-[13px] font-semibold text-[#3D2E6B]">
                      <AlertTriangle className="h-4 w-4 text-[#7E6BAF]" />
                      Official medication reference unavailable
                    </p>
                    <p className="text-[12px] leading-relaxed text-[#5A4A8A]">
                      Verify this medication through another authoritative source before signing the
                      prescription.
                    </p>
                    <label className="flex items-start gap-2 text-[12px] font-medium text-[#3D2E6B]">
                      <input
                        type="checkbox"
                        checked={!!med.externallyVerifiedAt}
                        onChange={() => onExternallyVerified?.()}
                        className="mt-0.5 h-4 w-4 rounded border-[#D6CCEC] text-[#7E6BAF] focus:ring-[#7E6BAF]"
                      />
                      I verified this medication through another authoritative
                      prescribing-information source.
                    </label>
                    {med.externallyVerifiedAt && (
                      <p className="flex items-center gap-1 text-[11px] text-[#2D8E69]">
                        <Check className="h-3.5 w-3.5" /> Verified externally{" "}
                        {new Date(med.externallyVerifiedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
                <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-[#8B85A6]">
                  <ShieldCheck className="mt-[1px] h-3.5 w-3.5 flex-none" />
                  The sections above are an AI-generated summary. A document is only called an
                  official approved product label when it links to the regulator- or
                  manufacturer-approved label for this medication and jurisdiction.
                </p>
              </Section>

              <button
                type="button"
                onClick={() => void load(true)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-[12px] border border-[#D6CCEC] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#5A4A8A] hover:bg-[#F7F4FB] disabled:opacity-60"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Refresh reference
              </button>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function Section({
  title,
  subtitle,
  note,
  children,
}: {
  title: string;
  subtitle?: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#ECE7F6] bg-white p-3.5">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#5A3E8F]">{title}</h3>
      {subtitle && <p className="mt-0.5 text-[12px] font-semibold text-[#3D2E6B]">{subtitle}</p>}
      {note && <p className="mt-1 text-[11px] leading-relaxed text-[#7E6BAF]">{note}</p>}
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="py-2">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-[#7E6BAF]">{label}</dt>
      <dd className="mt-0.5 text-[13px] leading-relaxed text-[#3D2E6B]">
        {value?.trim() ? value : <span className="text-[#A89BD0]">Not stated</span>}
      </dd>
    </div>
  );
}

/** Items the reference itself reports as unavailable, surfaced as required. */
function missingFromReference(ref: MedicationReference): string[] {
  const out: string[] = [];
  const flag = (label: string, value?: string) => {
    const v = (value ?? "").toLowerCase();
    if (!v.trim() || v.includes("not supplied") || v.includes("no information") || v.includes("information required"))
      out.push(label);
  };
  flag("Allergy history", ref.patient.allergiesReviewed);
  flag("Current medications", ref.patient.currentMedicationsReviewed);
  flag("Relevant medical conditions", ref.patient.relevantConditions);
  flag("Laboratory or organ-function information", ref.patient.labMonitoring);
  return out;
}

function SourceItem({
  source,
  country,
  ref_,
}: {
  source: MedicationSource;
  country: RxCountry;
  ref_: MedicationReference;
}) {
  const kind: SourceKind = source.kind ?? "secondary";
  return (
    <li className="rounded-xl border border-[#ECE7F6] bg-white p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#7E6BAF]">
        {SOURCE_KIND_LABEL[kind]}
      </p>
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-0.5 inline-flex items-start gap-1.5 text-[13px] font-semibold text-[#5A3E8F] underline decoration-[#D6CCEC] hover:decoration-[#5A3E8F]"
      >
        {source.title}
        <ExternalLink className="mt-[3px] h-3.5 w-3.5 flex-none" />
      </a>
      <p className="mt-1 text-[11px] text-[#8B85A6]">
        Source organisation: {sourceOrganisation(source)}
      </p>
      <p className="text-[11px] text-[#8B85A6]">
        Jurisdiction: {source.jurisdiction ?? (country === "PH" ? "Philippines" : "United States")}
      </p>
      <p className="text-[11px] text-[#8B85A6]">
        Last updated: {source.revisedAt ? source.revisedAt : "not stated by the source"} · Lubin last
        checked {new Date(ref_.checkedAt).toLocaleDateString()}
      </p>
      {source.url && (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate text-[11px] text-[#6E4FD3] underline"
        >
          {source.url}
        </a>
      )}
    </li>
  );
}
