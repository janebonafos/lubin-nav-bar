import { useState } from "react";
import { Sparkles, Loader2, Mic } from "lucide-react";

export type AiSessionSummaryProps = {
  appointmentId: string;
  clientName?: string;
  aiSummary?: string;
  recordingConsent?: { client: boolean; provider: boolean };
  onChange: (patch: { aiSummary?: string }) => void;
};

export function AiSessionSummary({
  aiSummary,
  recordingConsent,
  onChange,
}: AiSessionSummaryProps) {
  const [generating, setGenerating] = useState(false);

  const clientConsent = !!recordingConsent?.client;
  const providerConsent = !!recordingConsent?.provider;
  const bothConsent = clientConsent && providerConsent;

  const generateSummary = () => {
    setGenerating(true);
    window.setTimeout(() => {
      onChange({
        aiSummary:
          "Session focused on coping strategies and emotional regulation. Provider introduced a breathing exercise and a thought-reframing template. Action items captured below. Tone remained collaborative throughout.",
      });
      setGenerating(false);
    }, 900);
  };

  return (
    <div className="relative overflow-hidden rounded-[20px] border border-[#D7C9F2] bg-gradient-to-br from-[#F4EEFE] via-[#EBE0FB] to-[#E2D2F9] p-5 shadow-[0_10px_30px_-18px_rgba(61,46,107,0.25)]">
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/40 blur-2xl" />

      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#5B4796] to-[#3D2E6B] text-white shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <p className="text-sm font-semibold text-[#3D2E6B]">
              AI-generated draft · Not yet reviewed
            </p>
          </div>
          <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-[#5B4796]">
            Created from a recording consented to by both parties. Review and
            edit before using it. This draft has not been shared.
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#3D2E6B]">
            Draft · Not shared
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
              bothConsent
                ? "bg-white/70 text-[#3D2E6B]"
                : "bg-white/50 text-[#7E6BAF]"
            }`}
          >
            <Mic className="h-3 w-3" />
            {bothConsent ? "Both consented" : "Consent required"}
          </span>
        </div>
      </div>

      {!bothConsent ? (
        <p className="relative mt-4 text-xs leading-relaxed text-[#5B4796]">
          An AI draft can only be generated when both you and the client agreed
          to record this session. Current consent status:
          <span className="ml-1 font-semibold">
            Client {clientConsent ? "✓" : "—"} · You{" "}
            {providerConsent ? "✓" : "—"}
          </span>
        </p>
      ) : aiSummary ? (
        <div className="relative mt-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#2C2050]">
            {aiSummary}
          </p>
          <button
            type="button"
            onClick={() => onChange({ aiSummary: undefined })}
            className="mt-3 text-xs font-semibold text-[#7E6BAF] hover:text-[#3D2E6B]"
          >
            Clear draft
          </button>
        </div>
      ) : (
        <div className="relative mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#5B4796]">
            Recording processed. Generate a draft to review and edit before you
            decide whether to publish anything from it.
          </p>
          <button
            type="button"
            onClick={generateSummary}
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-[8px] bg-[#3D2E6B] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2C2B4B] disabled:opacity-60"
          >
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {generating ? "Generating…" : "Generate draft"}
          </button>
        </div>
      )}
    </div>
  );
}
