import { PrivacyFooter, renderIncluded } from "./ReportSections";
import type { SummaryData } from "@/lib/share/summary";

export default function TrustedContactReport({
  summary,
  includedKeys,
  sharerName = "They",
}: {
  summary: SummaryData;
  includedKeys: string[];
  sharerName?: string;
}) {
  return (
    <article className="mx-auto max-w-2xl px-5 py-12">
      <header className="rounded-3xl bg-gradient-to-br from-[#FAF8FD] via-[#F4F0FB] to-white p-6 shadow-[0_30px_80px_-30px_rgba(126,107,175,0.45)] ring-1 ring-brand-purple/15">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7E6BAF]">
          A note shared with you
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[#3D2E6B]">
          {sharerName} wanted to share how they have been feeling lately.
        </h1>
        <p className="mt-2 text-sm text-[#5A4A8A]">
          This is a gentle summary — not a clinical report.
        </p>
      </header>

      <div className="mt-6">{renderIncluded(summary, includedKeys)}</div>

      <PrivacyFooter />
    </article>
  );
}