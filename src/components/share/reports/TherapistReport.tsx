import { Printer, ShieldCheck } from "lucide-react";
import { PrivacyFooter, renderIncluded } from "./ReportSections";
import type { SummaryData } from "@/lib/share/summary";
import { recipientLabel } from "@/lib/share/summary";
import type { RecipientId } from "@/lib/share/shareStore";

export default function TherapistReport({
  summary,
  includedKeys,
  recipient,
  sharerName = "A Lubin user",
  healthFieldIds,
}: {
  summary: SummaryData;
  includedKeys: string[];
  recipient: RecipientId;
  sharerName?: string;
  healthFieldIds?: string[];
}) {
  const recipientName = recipientLabel(recipient).replace(/^My /i, "");
  return (
    <article className="mx-auto max-w-3xl px-5 py-10">
      {/* Document header */}
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#3D2E6B] via-[#5A4A8A] to-[#7E6BAF] p-7 text-white shadow-[0_30px_80px_-30px_rgba(61,46,107,0.55)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl"
        />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/70">
              Lubin.AI · Wellbeing summary
            </p>
            <h1 className="mt-1.5 text-2xl font-bold leading-tight md:text-3xl">
              Prepared for {recipientName}
            </h1>
            <p className="mt-1.5 text-sm text-white/80">
              Shared by <strong className="font-semibold text-white">{sharerName}</strong> ·{" "}
              {summary.dateSpan}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1 text-[11px] font-semibold backdrop-blur ring-1 ring-white/25">
            <ShieldCheck className="h-3.5 w-3.5" />
            Self-reported
          </span>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 text-[11px]">
          <Meta label="Range" value={summary.rangeLabel} />
          <Meta label="Mood" value={summary.moodLabel} />
          <Meta label="Stress" value={summary.stressLabel} />
          <Meta label="Direction" value={summary.directionLabel} />
        </div>
      </header>

      {/* Actions */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-xs text-[#5A4A8A]">
          This is a snapshot to support a conversation — not a clinical diagnosis.
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#ECE7F6] bg-white px-4 py-2 text-xs font-semibold text-[#3D2E6B] transition hover:border-[#7E6BAF]/40"
        >
          <Printer className="h-3.5 w-3.5" />
          Print / Save PDF
        </button>
      </div>

      <div className="mt-5">{renderIncluded(summary, includedKeys, { healthFieldIds })}</div>

      <PrivacyFooter includedKeys={includedKeys} />
    </article>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/12 px-2.5 py-1 backdrop-blur ring-1 ring-white/20">
      <span className="font-semibold uppercase tracking-[0.14em] text-white/70">
        {label}
      </span>
      <span className="font-semibold text-white">{value}</span>
    </span>
  );
}