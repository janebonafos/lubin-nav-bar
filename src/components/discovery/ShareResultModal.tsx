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
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-[0_30px_80px_-30px_rgba(126,107,175,0.45)] sm:rounded-3xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-purple/70">
              Share this result
            </p>
            <h2 className="mt-2 font-serif-display text-2xl font-light leading-tight text-brand-purple-dark">
              You choose exactly what they see
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-brand-purple-dark/50 transition hover:bg-brand-lavender/50 hover:text-brand-purple-dark"
          >
            <X className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>

        {/* What's included */}
        <div className="mt-6 rounded-2xl bg-[#FAF8FD] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-purple/70">
            Included
          </p>
          <ul className="mt-2 space-y-1.5 text-[13.5px] text-brand-purple-dark/75">
            <li>
              {draft.assessmentName} · {draft.clinicalName}
            </li>
            <li>
              {draft.statusLabel} — {draft.score} / {draft.maxScore}
            </li>
            <li>Plain-language explanation, completed {takenLabel}</li>
          </ul>
          <label className="mt-4 flex items-start gap-2.5 text-[13.5px] text-brand-purple-dark/80">
            <input
              type="checkbox"
              checked={includeAnswers}
              onChange={(e) => {
                setIncludeAnswers(e.target.checked);
                setLink(null);
              }}
              className="mt-0.5 h-4 w-4 accent-[#7E6BAF]"
            />
            Include my individual answers ({draft.answers.length} questions)
          </label>
        </div>

        <label className="mt-5 block">
          <span className="text-[12px] font-medium text-brand-purple-dark/70">
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
            className="mt-1.5 w-full resize-none rounded-2xl border border-brand-purple/15 bg-white px-4 py-3 text-[13.5px] text-brand-purple-dark outline-none focus:border-brand-purple"
          />
        </label>

        {/* Link */}
        <div className="mt-6">
          {link ? (
            <div className="flex items-center gap-2 rounded-2xl border border-brand-purple/15 bg-[#FAF8FD] p-2 pl-3">
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
              className="w-full rounded-full bg-brand-purple px-5 py-3 text-[13.5px] font-semibold text-white transition hover:bg-brand-purple-dark"
            >
              Create a private link
            </button>
          )}
          <p className="mt-2 text-[12px] text-brand-purple-dark/45">
            Anyone with the link can read it. It expires after 30 days.
          </p>
        </div>

        {/* Email + PDF */}
        <div className="mt-6 border-t border-brand-purple/10 pt-6">
          <p className="text-[12px] font-medium text-brand-purple-dark/70">
            Or send it straight to someone
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={254}
              placeholder="their@email.com"
              className="flex-1 rounded-full border border-brand-purple/15 bg-white px-4 py-2.5 text-[13.5px] text-brand-purple-dark outline-none focus:border-brand-purple"
            />
            <button
              type="button"
              onClick={sendEmail}
              className="rounded-full border border-brand-purple/25 px-5 py-2.5 text-[13.5px] font-semibold text-brand-purple transition hover:bg-brand-lavender/40"
            >
              Email draft
            </button>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="mt-3 text-[13px] font-semibold text-brand-purple underline-offset-2 hover:underline"
          >
            Or download this page as a PDF
          </button>
        </div>
      </div>
    </div>
  );
}
