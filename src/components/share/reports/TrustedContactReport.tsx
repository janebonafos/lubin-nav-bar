import { Heart, Printer } from "lucide-react";
import { PrivacyFooter, renderIncluded } from "./ReportSections";
import type { SummaryData } from "@/lib/share/summary";

export default function TrustedContactReport({
  summary,
  includedKeys,
  sharerName = "They",
  healthFieldIds,
}: {
  summary: SummaryData;
  includedKeys: string[];
  sharerName?: string;
  healthFieldIds?: string[];
}) {
  return (
    <article className="mx-auto max-w-2xl px-5 py-10">
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FFF1F2] via-[#F4F0FB] to-[#ECE7F6] p-7 shadow-[0_30px_80px_-30px_rgba(126,107,175,0.45)] ring-1 ring-[#ECE7F6]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/50 blur-3xl"
        />
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/80 px-3 py-1 text-[11px] font-semibold text-[#7E6BAF] ring-1 ring-[#ECE7F6]">
          <Heart className="h-3.5 w-3.5 text-rose-400" />
          A note shared with you
        </span>
        <h1 className="mt-3 text-2xl font-bold leading-snug text-[#3D2E6B] md:text-3xl">
          {sharerName} wanted to share how they've been feeling lately.
        </h1>
        <p className="mt-2 text-sm text-[#5A4A8A]">
          This is a gentle summary — no clinical jargon. Just a window into{" "}
          {sharerName.toLowerCase() === "they" ? "their" : `${sharerName}'s`} week.
        </p>
      </header>

      <div className="mt-5 flex justify-end print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#ECE7F6] bg-white px-4 py-2 text-xs font-semibold text-[#3D2E6B] transition hover:border-[#7E6BAF]/40"
        >
          <Printer className="h-3.5 w-3.5" />
          Print / Save PDF
        </button>
      </div>

      <div className="mt-3">{renderIncluded(summary, includedKeys, { healthFieldIds })}</div>

      <PrivacyFooter includedKeys={includedKeys} />
    </article>
  );
}