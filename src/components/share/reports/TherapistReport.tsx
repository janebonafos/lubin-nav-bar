import { PrivacyFooter, renderIncluded } from "./ReportSections";
import type { SummaryData } from "@/lib/share/summary";
import { recipientLabel } from "@/lib/share/summary";
import type { RecipientId } from "@/lib/share/shareStore";

export default function TherapistReport({
  summary,
  includedKeys,
  recipient,
}: {
  summary: SummaryData;
  includedKeys: string[];
  recipient: RecipientId;
}) {
  return (
    <article className="mx-auto max-w-3xl px-5 py-12">
      <header className="rounded-3xl bg-gradient-to-br from-[#ECE7F6] via-[#F4F0FB] to-white p-6 shadow-[0_30px_80px_-30px_rgba(126,107,175,0.45)] ring-1 ring-brand-purple/15">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7E6BAF]">
          Lubin.AI · Self-reported summary
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[#3D2E6B]">
          Wellbeing summary for {recipientLabel(recipient).replace(/^My /i, "")}
        </h1>
        <p className="mt-2 text-sm text-[#5A4A8A]">
          Range: <strong>{summary.rangeLabel}</strong> · {summary.dateSpan}
        </p>
      </header>

      <div className="mt-6">{renderIncluded(summary, includedKeys)}</div>

      <PrivacyFooter />
    </article>
  );
}