import { useEffect, useMemo, useState } from "react";
import { X, ArrowLeft, ArrowRight, Lock, Check } from "lucide-react";
import {
  INCLUDE_OPTIONS,
  RECIPIENT_OPTIONS,
  type SummaryData,
} from "@/lib/share/summary";
import type { RecipientId } from "@/lib/share/shareStore";

export type ConsentResult = {
  includedKeys: string[];
  recipient: RecipientId;
};

export type AssessmentContext = {
  id: string;
  label: string; // e.g. "Wellbeing Check (Feb 20, 2026)"
};

export default function ShareConsentModal({
  open,
  onClose,
  onConfirm,
  summary,
  assessmentContext,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (result: ConsentResult) => void;
  summary: SummaryData;
  assessmentContext?: AssessmentContext;
}) {
  const [step, setStep] = useState(1);

  // Which include options have data
  const itemHasData = useMemo(() => {
    return {
      mood: summary.checkinsInRange.length > 0,
      topics: summary.themes.length > 0,
      assessments: summary.attemptsInRange.length > 0,
      checkinCount: summary.checkinsInRange.length > 0,
      narrative: summary.hasAnyData,
    } as Record<string, boolean>;
  }, [summary]);

  const defaultSelection = useMemo(() => {
    if (assessmentContext) return ["assessments"].filter((k) => itemHasData[k]);
    return INCLUDE_OPTIONS.map((o) => o.key).filter((k) => itemHasData[k]);
  }, [assessmentContext, itemHasData]);

  const [included, setIncluded] = useState<string[]>(defaultSelection);
  const [recipient, setRecipient] = useState<RecipientId | null>(null);

  useEffect(() => {
    if (open) {
      setStep(1);
      setIncluded(defaultSelection);
      setRecipient(null);
    }
  }, [open, defaultSelection]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const toggleIncluded = (key: string) => {
    setIncluded((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const allAvailable = INCLUDE_OPTIONS.map((o) => o.key).filter(
    (k) => itemHasData[k],
  );
  const allSelected = allAvailable.every((k) => included.includes(k));

  const canStep1Continue = included.length > 0;
  const canStep2Continue = recipient !== null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share consent"
      className="fixed inset-0 z-[80] flex items-end md:items-center justify-center p-0 md:p-4"
    >
      <div
        className="absolute inset-0 bg-[#3D2E6B]/45 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl md:h-auto md:max-h-[90vh] md:max-w-xl md:rounded-3xl">
        {/* Progress bar */}
        <div className="relative">
          <div className="h-1 w-full bg-[#F4F0FB]">
            <div
              className="h-full bg-gradient-to-r from-[#7E6BAF] to-[#A89BD0] transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-between px-5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5A4A8A]">
              Step {step} of 3
            </p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-full p-1.5 text-[#5A4A8A] transition hover:bg-[#F4F0FB] hover:text-[#3D2E6B]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6 md:px-7">
          {step === 1 && (
            <Step1
              included={included}
              toggle={toggleIncluded}
              itemHasData={itemHasData}
              allSelected={allSelected}
              selectAll={() => setIncluded(allAvailable)}
              deselectAll={() => setIncluded([])}
              assessmentContext={assessmentContext}
            />
          )}
          {step === 2 && <Step2 recipient={recipient} setRecipient={setRecipient} />}
          {step === 3 && <Step3 />}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[#F4F0FB] bg-white px-5 py-4 md:px-7">
          <button
            type="button"
            onClick={() => (step === 1 ? onClose() : setStep(step - 1))}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-[#5A4A8A] hover:text-[#3D2E6B]"
          >
            <ArrowLeft className="h-4 w-4" />
            {step === 1 ? "Cancel" : "Back"}
          </button>
          <button
            type="button"
            disabled={
              (step === 1 && !canStep1Continue) || (step === 2 && !canStep2Continue)
            }
            onClick={() => {
              if (step < 3) setStep(step + 1);
              else if (recipient)
                onConfirm({ includedKeys: included, recipient });
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#7E6BAF] to-[#6A5A98] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(126,107,175,0.55)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(61,46,107,0.55)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {step < 3 ? "Continue" : "Confirm"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Step1({
  included,
  toggle,
  itemHasData,
  allSelected,
  selectAll,
  deselectAll,
  assessmentContext,
}: {
  included: string[];
  toggle: (key: string) => void;
  itemHasData: Record<string, boolean>;
  allSelected: boolean;
  selectAll: () => void;
  deselectAll: () => void;
  assessmentContext?: AssessmentContext;
}) {
  return (
    <div>
      <h2 className="mt-2 text-xl font-bold text-[#3D2E6B]">
        Here's what's included in your summary
      </h2>
      <p className="mt-1.5 text-sm text-[#5A4A8A]">
        A quick look at what your provider will see, and what stays just with you.
      </p>
      <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#F4F0FB] px-3 py-1 text-[11px] font-semibold text-[#7E6BAF]">
        <Lock className="h-3 w-3" />
        Nothing is shared until you confirm
      </span>

      {assessmentContext && (
        <p className="mt-3 rounded-xl border border-[#ECE7F6] bg-[#FAF8FD] px-3 py-2 text-xs text-[#5A4A8A]">
          Sharing from your <strong>{assessmentContext.label}</strong> result —
          only Assessment results is pre-selected. You can add more if you'd
          like.
        </p>
      )}

      <div className="mt-5 rounded-2xl border border-[#ECE7F6] bg-[#FAF8FD] p-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7E6BAF]">
            Included
          </p>
          <button
            type="button"
            onClick={allSelected ? deselectAll : selectAll}
            className="text-xs font-semibold text-[#7E6BAF] hover:text-[#6A5A98]"
          >
            {allSelected ? "Deselect all" : "Select all"}
          </button>
        </div>
        <ul className="mt-3 space-y-2">
          {INCLUDE_OPTIONS.map((opt) => {
            const disabled = !itemHasData[opt.key];
            const checked = included.includes(opt.key);
            const label =
              opt.key === "assessments" && assessmentContext
                ? assessmentContext.label
                : opt.label;
            return (
              <li key={opt.key}>
                <label
                  className={`flex items-start gap-3 rounded-xl border bg-white p-3 transition ${
                    disabled
                      ? "cursor-not-allowed border-[#ECE7F6] opacity-60"
                      : "cursor-pointer border-[#ECE7F6] hover:border-[#7E6BAF]/40"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded border-2 transition ${
                      checked
                        ? "border-[#7E6BAF] bg-[#7E6BAF] text-white"
                        : "border-[#C4B5FD] bg-white"
                    }`}
                  >
                    {checked && <Check className="h-3 w-3" />}
                  </span>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggle(opt.key)}
                    className="sr-only"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#3D2E6B]">{label}</p>
                    <p className="mt-0.5 text-xs text-[#5A4A8A]">
                      {disabled ? "Nothing to share yet." : opt.description}
                    </p>
                  </div>
                </label>
              </li>
            );
          })}
        </ul>
        {included.length === 0 && (
          <p className="mt-3 text-xs font-medium text-[#B45309]">
            Select at least one item to continue.
          </p>
        )}
      </div>

      <div className="mt-5 rounded-2xl border border-[#ECE7F6] bg-white p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7E6BAF]">
          Always stays private
        </p>
        <ul className="mt-2 space-y-1.5 text-sm text-[#5A4A8A]">
          <li>• Chat conversations</li>
          <li>• Your private notes</li>
          <li>• Anything you haven't shared</li>
        </ul>
      </div>
    </div>
  );
}

function Step2({
  recipient,
  setRecipient,
}: {
  recipient: RecipientId | null;
  setRecipient: (id: RecipientId) => void;
}) {
  return (
    <div>
      <h2 className="mt-2 text-xl font-bold text-[#3D2E6B]">
        Who are you sharing this with?
      </h2>
      <p className="mt-1.5 text-sm text-[#5A4A8A]">
        This helps us format the summary for your provider.
      </p>

      <ul className="mt-5 space-y-2">
        {RECIPIENT_OPTIONS.map((r) => {
          const active = recipient === r.id;
          return (
            <li key={r.id}>
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3.5 transition ${
                  active
                    ? "border-[#7E6BAF] bg-[#F4F0FB] ring-2 ring-[#7E6BAF]/20"
                    : "border-[#ECE7F6] bg-white hover:border-[#7E6BAF]/40"
                }`}
              >
                <input
                  type="radio"
                  name="recipient"
                  checked={active}
                  onChange={() => setRecipient(r.id)}
                  className="sr-only"
                />
                <span className="text-2xl" aria-hidden>
                  {r.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#3D2E6B]">{r.label}</p>
                  <p className="mt-0.5 text-xs text-[#5A4A8A]">
                    {r.description}
                  </p>
                </div>
                <span
                  className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 ${
                    active
                      ? "border-[#7E6BAF] bg-[#7E6BAF]"
                      : "border-[#C4B5FD] bg-white"
                  }`}
                >
                  {active && <span className="h-2 w-2 rounded-full bg-white" />}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Step3() {
  return (
    <div>
      <h2 className="mt-2 text-xl font-bold text-[#3D2E6B]">Your consent matters</h2>
      <p className="mt-1.5 text-sm text-[#5A4A8A]">One last look before you share.</p>

      <div className="mt-5 rounded-2xl border border-[#ECE7F6] bg-[#FAF8FD] p-5 text-sm leading-relaxed text-[#3D2E6B]">
        <p>By sharing your summary you confirm:</p>
        <ul className="mt-3 space-y-2 text-[#5A4A8A]">
          <li>• You've reviewed what's included</li>
          <li>• You're sharing this voluntarily</li>
          <li>• This is not a clinical diagnosis</li>
        </ul>
        <p className="mt-4 text-xs text-[#5A4A8A]">
          You can revoke access at any time from your settings.
        </p>
      </div>
    </div>
  );
}