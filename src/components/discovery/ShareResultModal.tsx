import { useMemo, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { toast } from "sonner";
import {
  buildResultShareUrl,
  createResultShare,
  type SharedResultAnswer,
} from "@/lib/share/resultShareStore";

type Draft = {
  assessmentSlug: string;
  assessmentName: string;
  clinicalName: string;
  score: number;
  maxScore: number;
  lowerIsBetter: boolean;
  statusLabel: string;
  explanation: string;
  summary: string;
  takenAt: number;
  answers: SharedResultAnswer[];
};

export default function ShareResultModal({
  open,
  onClose,
  draft,
}: {
  open: boolean;
  onClose: () => void;
  draft: Draft;
}) {
  const [includeAnswers, setIncludeAnswers] = useState(true);
  const [note, setNote] = useState("");
  const [email, setEmail] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const takenLabel = useMemo(
    () =>
      new Date(draft.takenAt).toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [draft.takenAt],
  );

  if (!open) return null;

  function makeLink() {
    const record = createResultShare({
      assessmentSlug: draft.assessmentSlug,
      assessmentName: draft.assessmentName,
      clinicalName: draft.clinicalName,
      score: draft.score,
      maxScore: draft.maxScore,
      lowerIsBetter: draft.lowerIsBetter,
      statusLabel: draft.statusLabel,
      explanation: draft.explanation,
      summary: draft.summary,
      takenAt: draft.takenAt,
      ...(includeAnswers ? { answers: draft.answers } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    });
    const url = buildResultShareUrl(record);
    setLink(url);
    return url;
  }

  async function copyLink() {
    const url = link ?? makeLink();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy — select the link and copy it manually.");
    }
  }

  function sendEmail() {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    const url = link ?? makeLink();
    const subject = `${draft.assessmentName} — a result I wanted to share`;
    const body = [
      "Hi,",
      "",
      `I completed a ${draft.assessmentName} check (${draft.clinicalName}) on ${takenLabel} and wanted to share it with you:`,
      url,
      "",
      note.trim() ? `${note.trim()}\n` : "",
      "This link expires in 30 days. It's self-reported and not a clinical diagnosis.",
    ]
      .filter(Boolean)
      .join("\n");
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
    toast.success("Email draft opened");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-purple-dark/35 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Share this result"
        className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl border border-brand-purple/10 bg-white shadow-[0_40px_100px_-40px_rgba(126,107,175,0.5)] sm:rounded-3xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-20 rounded-full p-2 text-brand-purple-dark/40 transition hover:bg-brand-lavender/50 hover:text-brand-purple-dark"
        >
          <X className="h-4 w-4" strokeWidth={2.2} />
        </button>

        <div className="flex flex-col md:flex-row">
          {/* Left pane — controls */}
          <div className="w-full border-brand-purple/10 bg-[#FAF8FD] p-7 md:w-1/2 md:border-r md:p-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-purple/70">
              Share this result
            </p>
            <h2 className="mt-2 font-serif-display text-[28px] font-light leading-tight text-brand-purple-dark">
              You choose exactly what they see
            </h2>

            <div className="mt-8 space-y-6">
              {/* Answers toggle */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-[13.5px] font-medium text-brand-purple-dark">
                  Include my individual answers
                  <span className="ml-1 text-brand-purple-dark/45">
                    ({draft.answers.length})
                  </span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={includeAnswers}
                  aria-label="Include my individual answers"
                  onClick={() => {
                    setIncludeAnswers((v) => !v);
                    setLink(null);
                  }}
                  className={`relative h-6 w-11 flex-none rounded-full transition-colors ${
                    includeAnswers ? "bg-brand-purple" : "bg-brand-purple/20"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
                      includeAnswers ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              </div>

              {/* Note */}
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-purple-dark/50">
                  Add a short note (optional)
                </span>
                <textarea
                  value={note}
                  onChange={(e) => {
                    setNote(e.target.value);
                    setLink(null);
                  }}
                  rows={3}
                  maxLength={500}
                  placeholder="Anything you'd like them to know before they read this."
                  className="mt-2 w-full resize-none rounded-2xl border border-brand-purple/15 bg-white px-4 py-3 text-[13.5px] text-brand-purple-dark outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/15"
                />
              </label>

              {/* Primary action */}
              <div>
                {link ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-brand-purple/15 bg-white p-2 pl-3">
                    <code className="flex-1 truncate font-mono text-[11.5px] text-brand-purple-dark">
                      {link}
                    </code>
                    <button
                      type="button"
                      onClick={copyLink}
                      className="inline-flex flex-none items-center gap-1.5 rounded-full bg-brand-purple px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-brand-purple-dark"
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5" strokeWidth={2.4} />
                      ) : (
                        <Copy className="h-3.5 w-3.5" strokeWidth={2.2} />
                      )}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={copyLink}
                    className="w-full rounded-2xl bg-brand-purple px-5 py-4 text-[14px] font-semibold text-white shadow-lg shadow-brand-purple/20 transition hover:bg-brand-purple-dark"
                  >
                    Create a private link
                  </button>
                )}
                <p className="mt-3 text-center text-[12px] text-brand-purple-dark/50">
                  Anyone with the link can read it. It expires after 30 days.
                </p>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4">
                <span className="h-px flex-1 bg-brand-purple/10" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-purple-dark/30">
                  or
                </span>
                <span className="h-px flex-1 bg-brand-purple/10" />
              </div>

              {/* Email */}
              <div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={254}
                    placeholder="their@email.com"
                    className="flex-1 rounded-xl border border-brand-purple/15 bg-white px-4 py-3 text-[13.5px] text-brand-purple-dark outline-none transition focus:border-brand-purple"
                  />
                  <button
                    type="button"
                    onClick={sendEmail}
                    className="rounded-xl bg-brand-lavender/60 px-6 py-3 text-[13.5px] font-semibold text-brand-purple transition hover:bg-brand-lavender"
                  >
                    Email draft
                  </button>
                </div>
                <div className="mt-5 text-center">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="text-[13px] font-medium text-brand-purple underline-offset-4 hover:underline"
                  >
                    Or download this page as a PDF
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right pane — recipient preview */}
          <div className="flex w-full flex-col justify-center bg-white p-7 md:w-1/2 md:p-10">
            <div className="mb-6 flex items-center justify-between gap-3 pr-8">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-purple-dark/40">
                What they'll see
              </span>
              <span className="rounded-full bg-brand-lavender/60 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-purple">
                Private
              </span>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-brand-purple/10 bg-gradient-to-b from-white to-[#FAF8FD] p-7 shadow-sm">
              <span
                aria-hidden
                className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-brand-purple/5 blur-3xl"
              />
              <div className="relative space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-purple">
                    {draft.clinicalName}
                  </p>
                  <h3 className="mt-1 font-serif-display text-[24px] font-light leading-tight text-brand-purple-dark">
                    {draft.assessmentName}
                  </h3>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-[34px] font-semibold leading-none text-brand-purple-dark">
                    {draft.score}
                  </span>
                  <span className="text-[16px] font-medium text-brand-purple-dark/50">
                    / {draft.maxScore}
                  </span>
                  <span className="ml-1 text-[13px] font-medium text-brand-purple">
                    {draft.statusLabel}
                  </span>
                </div>

                <p className="text-[13.5px] leading-relaxed text-brand-purple-dark/75">
                  {draft.explanation || draft.summary}
                </p>

                {note.trim() && (
                  <p className="rounded-xl bg-white/70 px-3 py-2 text-[12.5px] italic leading-relaxed text-brand-purple-dark/70 ring-1 ring-brand-purple/10">
                    “{note.trim()}”
                  </p>
                )}

                <div className="flex items-center justify-between border-t border-brand-purple/10 pt-4">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-brand-purple-dark/40">
                    Completed {takenLabel}
                  </span>
                  <span className="text-[10px] font-medium text-brand-purple-dark/40">
                    {includeAnswers
                      ? `${draft.answers.length} answers included`
                      : "Answers hidden"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              {(includeAnswers
                ? draft.answers.slice(0, 3)
                : []
              ).map((a, i) => (
                <div
                  key={i}
                  className="rounded-xl bg-[#FAF8FD] px-3 py-2 text-[11.5px] text-brand-purple-dark/60"
                >
                  <span className="line-clamp-1">{a.question}</span>
                </div>
              ))}
              {!includeAnswers && (
                <p className="text-[11.5px] text-brand-purple-dark/40">
                  Your individual answers stay private.
                </p>
              )}
            </div>

            <p className="mt-6 text-[11px] leading-relaxed text-brand-purple-dark/40">
              Self-reported. Not a clinical diagnosis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
