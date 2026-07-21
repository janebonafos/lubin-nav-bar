import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Lock, Check, X as XIcon } from "lucide-react";
import {
  INCLUDE_OPTIONS,
  RECIPIENT_OPTIONS,
  type SummaryData,
} from "@/lib/share/summary";
import type { RecipientId } from "@/lib/share/shareStore";

export type ConsentResult = {
  includedKeys: string[];
  recipient: RecipientId;
  futureUpdates?: boolean;
};

export type AssessmentContext = {
  id: string;
  label: string; // e.g. "Wellbeing Check (Feb 20, 2026)"
};

export type ProviderContext = {
  providerName: string; // "Dr. Camille Lazaro"
  appointmentLabel: string; // "Fri, Jun 28 at 3:00 PM"
  providerRole?: string;
  appointmentDate?: string; // e.g. "June 28, 2026"
};

export default function ShareConsentModal({
  open,
  onConfirm,
  summary,
  assessmentContext,
  providerContext,
  initialIncluded,
  confirmLabelOverride,
}: {
  open: boolean;
  onConfirm: (result: ConsentResult) => void;
  summary: SummaryData;
  assessmentContext?: AssessmentContext;
  providerContext?: ProviderContext;
  initialIncluded?: string[];
  confirmLabelOverride?: string;
}) {
  // Provider-linked flow adds a "choice" step (0) before the existing flow.
  // 0 = choice, 1 = custom selection (choose what to share), 3 = review.
  // Non-provider flow keeps the classic 1 → 2 → 3 shape.
  const [step, setStep] = useState<number>(providerContext ? 0 : 1);
  const [choice, setChoice] = useState<"all" | "custom" | "none">("all");
  const [futureUpdates, setFutureUpdates] = useState(false);

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
    if (initialIncluded) return initialIncluded.filter((k) => itemHasData[k]);
    // Provider-linked sharing: default is "share current Health Passport",
    // which pre-fills every available item. The user still has to review
    // and explicitly confirm on the final step.
    if (providerContext) {
      return INCLUDE_OPTIONS.map((o) => o.key).filter((k) => itemHasData[k]);
    }
    if (assessmentContext) return ["assessments"].filter((k) => itemHasData[k]);
    return INCLUDE_OPTIONS.map((o) => o.key).filter((k) => itemHasData[k]);
  }, [assessmentContext, itemHasData, providerContext, initialIncluded]);

  const [included, setIncluded] = useState<string[]>(defaultSelection);
  const [recipient, setRecipient] = useState<RecipientId | null>(null);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(providerContext ? 0 : 1);
      setChoice("all");
      setFutureUpdates(false);
      setIncluded(defaultSelection);
      setRecipient(providerContext ? "other-mhp" : null);
      setAgreed(false);
    }
  }, [open, defaultSelection, providerContext]);

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

  // Provider-linked sharing: the user is allowed to proceed with an empty
  // selection (they may choose to share nothing). The consent screen is
  // where they finalise the decision.
  const canStep1Continue = providerContext ? true : included.length > 0;
  const canStep2Continue = recipient !== null;

  // In provider mode we render a choice → (custom selection) → review flow.
  // Progress shown to the user: choice = 1/2 or 1/3, review = last.
  const providerStepsTotal = choice === "custom" ? 3 : 2;
  const totalSteps = providerContext ? providerStepsTotal : 3;
  const displayedStep = providerContext
    ? step === 0
      ? 1
      : step === 1
        ? 2
        : providerStepsTotal
    : step;
  const stepTitle = providerContext
    ? step === 0
      ? "How would you like to share?"
      : step === 1
        ? "Choose what to share"
        : "Review & confirm"
    : step === 1
      ? "Choose what to include"
      : step === 2
        ? "Choose recipient"
        : "Confirm & consent";
  const isConfirmStep = step === 3 || (providerContext && step === 2);
  const nextButtonLabel =
    providerContext && step === 3
      ? confirmLabelOverride ?? "Confirm and share"
      : !providerContext && step === 3
        ? "I agree"
        : "Continue";
  const confirmDisabled =
    step === 3 && providerContext
      ? !agreed || included.length === 0
      : false;

  const advance = () => {
    if (providerContext) {
      if (step === 0) {
        // Choice step
        if (choice === "none") {
          onConfirm({ includedKeys: [], recipient: recipient ?? "other-mhp", futureUpdates: false });
          return;
        }
        if (choice === "all") {
          setIncluded(allAvailable);
          setStep(3);
          return;
        }
        // custom
        setStep(1);
        return;
      }
      if (step === 1) {
        setStep(3);
        return;
      }
      if (recipient && !confirmDisabled) {
        onConfirm({ includedKeys: included, recipient, futureUpdates });
      }
    } else {
      if (step < 3) setStep(step + 1);
      else if (recipient)
        onConfirm({ includedKeys: included, recipient });
    }
  };

  const back = () => {
    if (providerContext) {
      if (step === 3) setStep(choice === "custom" ? 1 : 0);
      else if (step === 1) setStep(0);
      else if (step > 0) setStep(step - 1);
    } else {
      setStep(step - 1);
    }
  };

  const removeIncluded = (key: string) =>
    setIncluded((prev) => prev.filter((k) => k !== key));
  void isConfirmStep;

  return (
    <section
      aria-label="Share consent"
      className="overflow-hidden rounded-[28px] border border-[#ECE7F6] bg-white shadow-[0_24px_60px_-30px_rgba(74,62,127,0.18)]"
    >
      <div>
        {/* Stepped progress indicator */}
        <div className="relative">
          <div className="flex items-center justify-between gap-3 px-5 pt-4 md:px-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5A4A8A]">
              Step {displayedStep} of {totalSteps}
            </p>
            <p className="text-[11px] font-medium text-[#A29EB6]">
              {stepTitle}
            </p>
          </div>
          <div
            className="mt-3 flex w-full gap-1.5 px-5 md:px-7"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={totalSteps}
            aria-valuenow={displayedStep}
          >
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
              <span
                key={s}
                className={`h-1.5 flex-1 rounded-[12px] transition-all duration-300 ${
                  s <= displayedStep
                    ? "bg-gradient-to-r from-[#7E6BAF] to-[#A89BD0]"
                    : "bg-[#F4F0FB]"
                }`}
              />
            ))}
          </div>
          <div className="h-3" />
        </div>

        <div className="px-5 pb-6 md:px-7">
          {providerContext && step === 0 && (
            <Step0Choice
              providerName={providerContext.providerName}
              choice={choice}
              onChoice={setChoice}
            />
          )}
          {step === 1 && (
            <Step1
              included={included}
              toggle={toggleIncluded}
              itemHasData={itemHasData}
              allSelected={allSelected}
              selectAll={() => setIncluded(allAvailable)}
              deselectAll={() => setIncluded([])}
              assessmentContext={assessmentContext}
              providerContext={providerContext}
              summary={summary}
            />
          )}
          {step === 2 && !providerContext && (
            <Step2 recipient={recipient} setRecipient={setRecipient} />
          )}
          {step === 3 && (
            <Step3
              providerContext={providerContext}
              includedKeys={included}
              agreed={agreed}
              onAgreedChange={setAgreed}
              summary={summary}
              futureUpdates={futureUpdates}
              onFutureUpdatesChange={setFutureUpdates}
              onRemoveIncluded={removeIncluded}
            />
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[#F4F0FB] bg-white px-5 py-4 md:px-7">
          {(step > 1 || (providerContext && step === 1)) ? (
            <button
              type="button"
              onClick={back}
              className="inline-flex items-center gap-1.5 rounded-[12px] px-4 py-2 text-sm font-medium text-[#5A4A8A] hover:text-[#3D2E6B]"
            >
              <ArrowLeft className="h-4 w-4" />
              Go back
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            disabled={
              (step === 1 && !canStep1Continue) ||
              (step === 2 && !canStep2Continue) ||
              confirmDisabled
            }
            onClick={advance}
            className="inline-flex items-center gap-1.5 rounded-[12px] bg-gradient-to-r from-[#7E6BAF] to-[#6A5A98] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(126,107,175,0.55)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(61,46,107,0.55)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {nextButtonLabel}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

function Step0Choice({
  providerName,
  choice,
  onChoice,
}: {
  providerName: string;
  choice: "all" | "custom" | "none";
  onChoice: (v: "all" | "custom" | "none") => void;
}) {
  const options: { id: "all" | "custom" | "none"; title: string; blurb: string }[] = [
    {
      id: "all",
      title: "Share my current Health Passport",
      blurb: "Includes the information currently in your Health Passport.",
    },
    {
      id: "custom",
      title: "Choose what to share",
      blurb: "Select individual sections and date ranges.",
    },
    {
      id: "none",
      title: "Don't share",
      blurb: "Continue without sharing your Health Passport.",
    },
  ];
  return (
    <div>
      <h2 className="mt-2 text-xl font-bold text-[#3D2E6B]">
        Share your Health Passport?
      </h2>
      <p className="mt-1.5 text-sm text-[#5A4A8A]">
        Lubin will create a short summary for{" "}
        <strong>Dr. {providerName.replace(/^Dr\.?\s*/i, "")}</strong> using the
        information you choose to share. The provider can open the supporting
        information when needed.
      </p>
      <span className="mt-3 inline-flex items-center gap-1.5 rounded-[12px] bg-[#F4F0FB] px-3 py-1 text-[11px] font-semibold text-[#7E6BAF]">
        <Lock className="h-3 w-3" />
        Nothing is shared until you review and confirm
      </span>

      <ul className="mt-5 space-y-2">
        {options.map((opt) => {
          const active = choice === opt.id;
          return (
            <li key={opt.id}>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                  active
                    ? "border-[#7E6BAF] bg-[#FAF8FD] ring-2 ring-[#7E6BAF]/20"
                    : "border-[#ECE7F6] bg-white hover:border-[#7E6BAF]/40"
                }`}
              >
                <input
                  type="radio"
                  name="share-choice"
                  checked={active}
                  onChange={() => onChoice(opt.id)}
                  className="sr-only"
                />
                <span
                  className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 transition ${
                    active ? "border-[#7E6BAF]" : "border-[#D6CCEC]"
                  }`}
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full transition ${
                      active ? "bg-[#7E6BAF]" : "bg-transparent"
                    }`}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#3D2E6B]">{opt.title}</p>
                  <p className="mt-1 text-xs text-[#5A4A8A]">{opt.blurb}</p>
                </div>
              </label>
            </li>
          );
        })}
      </ul>
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
  providerContext,
  summary,
}: {
  included: string[];
  toggle: (key: string) => void;
  itemHasData: Record<string, boolean>;
  allSelected: boolean;
  selectAll: () => void;
  deselectAll: () => void;
  assessmentContext?: AssessmentContext;
  providerContext?: ProviderContext;
  summary: SummaryData;
}) {
  const [showAllAssess, setShowAllAssess] = useState(false);
  const attempts = summary.attemptsInRange;
  const visibleAttempts = showAllAssess ? attempts : attempts.slice(0, 3);
  return (
    <div>
      <h2 className="mt-2 text-xl font-bold text-[#3D2E6B]">
        {providerContext
          ? "What would you like to share?"
          : "Here's what's included in your summary"}
      </h2>
      <p className="mt-1.5 text-sm text-[#5A4A8A]">
        {providerContext
          ? `Choose any information you feel comfortable sharing with ${providerContext.providerName}. You can continue without selecting anything.`
          : "A quick look at what your provider will see, and what stays just with you."}
      </p>
      <span className="mt-3 inline-flex items-center gap-1.5 rounded-[12px] bg-[#F4F0FB] px-3 py-1 text-[11px] font-semibold text-[#7E6BAF]">
        <Lock className="h-3 w-3" />
        Nothing will be shared unless you review and confirm it
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
            {providerContext ? "Your choices" : "Included"}
          </p>
          {!providerContext && (
            <button
              type="button"
              onClick={allSelected ? deselectAll : selectAll}
              className="text-xs font-semibold text-[#7E6BAF] hover:text-[#6A5A98]"
            >
              {allSelected ? "Deselect all" : "Select all"}
            </button>
          )}
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
                  className={`flex items-center gap-3 rounded-xl border bg-white p-3.5 transition ${
                    disabled
                      ? "cursor-not-allowed border-[#ECE7F6] opacity-60"
                      : checked
                        ? "cursor-pointer border-[#7E6BAF] bg-white shadow-sm"
                        : "cursor-pointer border-[#ECE7F6] hover:border-[#7E6BAF]/40"
                  }`}
                >
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
                  <span
                    className={`flex h-6 w-6 flex-none items-center justify-center rounded-[12px] border-2 transition ${
                      checked
                        ? "border-[#7E6BAF] bg-[#7E6BAF] text-white"
                        : "border-[#D6CCEC] bg-white text-transparent"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                </label>
                {opt.key === "assessments" && checked && attempts.length > 0 && (
                  <div className="mt-1.5 ml-3 rounded-xl border border-dashed border-[#E1D9F1] bg-white px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7E6BAF]">
                      Results included ({attempts.length})
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {visibleAttempts.map((a) => (
                        <li
                          key={a.id}
                          className="flex items-baseline justify-between gap-3 text-[12px] text-[#3D2E6B]"
                        >
                          <span className="truncate font-medium">{a.assessmentName}</span>
                          <span className="flex-none text-[11px] text-[#8B85A6]">
                            {new Date(a.takenAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {attempts.length > 3 && (
                      <button
                        type="button"
                        onClick={() => setShowAllAssess((v) => !v)}
                        className="mt-2 text-[11px] font-semibold text-[#7E6BAF] underline-offset-2 hover:underline"
                      >
                        {showAllAssess ? "Show fewer" : `Show all ${attempts.length}`}
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {!providerContext && included.length === 0 && (
          <p className="mt-3 text-xs font-medium text-[#B45309]">
            Select at least one item to continue.
          </p>
        )}
        {providerContext && (
          <p className="mt-3 text-xs text-[#5A4A8A]">
            {included.length === 0
              ? "Nothing selected. You can still continue and choose to share nothing."
              : `${included.length} item${included.length === 1 ? "" : "s"} selected.`}{" "}
            {allSelected ? (
              <button
                type="button"
                onClick={deselectAll}
                className="font-semibold text-[#7E6BAF] underline-offset-2 hover:underline"
              >
                Clear all
              </button>
            ) : (
              <button
                type="button"
                onClick={selectAll}
                className="font-medium text-[#7E6BAF] underline-offset-2 hover:underline"
              >
                Select all
              </button>
            )}
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
                  className={`flex h-6 w-6 flex-none items-center justify-center rounded-[12px] border-2 transition ${
                    active
                      ? "border-[#7E6BAF] bg-[#7E6BAF] text-white"
                      : "border-[#D6CCEC] bg-white text-transparent"
                  }`}
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Step3({
  providerContext,
  includedKeys,
  agreed,
  onAgreedChange,
  summary,
  futureUpdates,
  onFutureUpdatesChange,
  onRemoveIncluded,
}: {
  providerContext?: ProviderContext;
  includedKeys: string[];
  agreed: boolean;
  onAgreedChange: (v: boolean) => void;
  summary: SummaryData;
  futureUpdates?: boolean;
  onFutureUpdatesChange?: (v: boolean) => void;
  onRemoveIncluded?: (key: string) => void;
}) {
  const includedLabels = INCLUDE_OPTIONS.filter((o) => includedKeys.includes(o.key));
  if (providerContext) {
    // Group into the five patient-facing spec sections. We map existing
    // include keys onto the closest spec section; sections without data
    // are omitted.
    const sectionMap: {
      title: string;
      keys: string[];
      body: React.ReactNode;
    }[] = [
      {
        title: "Recent check-ins",
        keys: ["mood", "checkinCount"],
        body: (
          <p className="text-[12px] text-[#5A4A8A]">
            {summary.checkinsInRange.length} check-in
            {summary.checkinsInRange.length === 1 ? "" : "s"} · mood “
            {summary.moodLabel.toLowerCase()}”, direction “
            {summary.directionLabel.toLowerCase()}”.
          </p>
        ),
      },
      {
        title: "Assessment results",
        keys: ["assessments"],
        body:
          summary.attemptsInRange.length > 0 ? (
            <ul className="space-y-1 text-[12px] text-[#3D2E6B]">
              {summary.attemptsInRange.slice(0, 5).map((a) => (
                <li key={a.id} className="flex justify-between gap-3">
                  <span className="truncate">– {a.assessmentName}</span>
                  <span className="flex-none text-[11px] text-[#8B85A6]">
                    {new Date(a.takenAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </li>
              ))}
              {summary.attemptsInRange.length > 5 && (
                <li className="text-[11px] italic text-[#8B85A6]">
                  + {summary.attemptsInRange.length - 5} more
                </li>
              )}
            </ul>
          ) : (
            <p className="text-[12px] italic text-[#8B85A6]">
              No assessment results yet.
            </p>
          ),
      },
      {
        title: "Patterns and observations",
        keys: ["topics", "narrative"],
        body: (
          <div className="space-y-1 text-[12px] text-[#5A4A8A]">
            {summary.themes.length > 0 && (
              <p>Themes: {summary.themes.slice(0, 4).map((t) => t.label).join(" · ")}</p>
            )}
            {summary.insight && <p className="italic">{summary.insight}</p>}
          </div>
        ),
      },
      {
        title: "Previous patient-facing appointment summaries",
        keys: [],
        body: (
          <p className="text-[12px] italic text-[#8B85A6]">
            No previous shared visit summaries yet.
          </p>
        ),
      },
      {
        title: "Medication information",
        keys: [],
        body: (
          <p className="text-[12px] italic text-[#8B85A6]">
            No medication information on file.
          </p>
        ),
      },
    ];
    const visibleSections = sectionMap.filter((s) =>
      s.keys.length === 0
        ? false // hide "no data" sections from the review by default
        : s.keys.some((k) => includedKeys.includes(k)),
    );
    return (
      <div>
        <h2 className="mt-2 text-xl font-bold text-[#3D2E6B]">
          Review what {providerContext.providerName} will see
        </h2>
        <p className="mt-1.5 text-sm text-[#5A4A8A]">
          The sections below will be visible for this appointment only. You can
          remove anything before confirming.
        </p>

        <dl className="mt-5 space-y-3 rounded-2xl border border-[#ECE7F6] bg-[#FAF8FD] p-5 text-sm text-[#3D2E6B]">
          <div className="flex justify-between gap-4">
            <dt className="text-[#6B6684]">Recipient</dt>
            <dd className="text-right font-semibold">
              {providerContext.providerName}
              {providerContext.providerRole && (
                <span className="block text-[11px] font-normal text-[#6B6684]">
                  {providerContext.providerRole}
                </span>
              )}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#6B6684]">Appointment</dt>
            <dd className="text-right font-semibold">{providerContext.appointmentLabel}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#6B6684]">Date range</dt>
            <dd className="text-right font-semibold">{summary.rangeLabel}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#6B6684]">Access expires</dt>
            <dd className="text-right font-semibold">7 days after your appointment</dd>
          </div>
        </dl>

        <div className="mt-4 space-y-3">
          {visibleSections.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E1D9F1] bg-white p-4 text-[13px] italic text-[#6B6684]">
              Nothing selected — no information will be shared.
            </div>
          ) : (
            visibleSections.map((sec) => (
              <div
                key={sec.title}
                className="rounded-2xl border border-[#ECE7F6] bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7E6BAF]">
                    {sec.title}
                  </p>
                  {onRemoveIncluded && (
                    <button
                      type="button"
                      onClick={() => sec.keys.forEach((k) => onRemoveIncluded(k))}
                      className="inline-flex items-center gap-1 rounded-[10px] px-2 py-1 text-[11px] font-semibold text-[#7E6BAF] hover:bg-[#F4F0FB]"
                      aria-label={`Remove ${sec.title}`}
                    >
                      <XIcon className="h-3 w-3" /> Remove
                    </button>
                  )}
                </div>
                <div className="mt-2">{sec.body}</div>
              </div>
            ))
          )}
        </div>

        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-[#ECE7F6] bg-white p-4 text-sm text-[#3D2E6B] transition hover:border-[#7E6BAF]/40">
          <input
            type="checkbox"
            checked={!!futureUpdates}
            onChange={(e) => onFutureUpdatesChange?.(e.target.checked)}
            className="mt-0.5 h-4 w-4 flex-none rounded border-[#D6CCEC] text-[#7E6BAF] focus:ring-[#7E6BAF]"
          />
          <span className="leading-relaxed">
            <span className="font-semibold text-[#3D2E6B]">
              Include future Health Passport updates
            </span>
            <span className="mt-0.5 block text-xs text-[#5A4A8A]">
              Off by default. When off, only this snapshot is shared.
            </span>
          </span>
        </label>

        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-[#7E6BAF]/40 bg-[#FAF8FD] p-4 text-sm text-[#3D2E6B] transition hover:border-[#7E6BAF]">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => onAgreedChange(e.target.checked)}
            className="mt-0.5 h-4 w-4 flex-none rounded border-[#D6CCEC] text-[#7E6BAF] focus:ring-[#7E6BAF]"
          />
          <span className="leading-relaxed">
            I have reviewed the information above and agree to share it with{" "}
            <strong>{providerContext.providerName}</strong> for this appointment.
            I understand that I can change or revoke access.
          </span>
        </label>

        <p className="mt-3 text-xs text-[#5A4A8A]">
          You can revoke access from your Health Passport at any time.
        </p>
        {includedLabels.length === 0 && (
          <p className="mt-2 text-xs font-medium text-[#B45309]">
            Nothing selected — go back to include at least one section.
          </p>
        )}
      </div>
    );
  }
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
      <p className="mt-4 text-xs text-[#5A4A8A]">
        Want the full details?{" "}
        <a
          href="/privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[#7E6BAF] underline-offset-2 hover:underline"
        >
          View our privacy policy
        </a>
      </p>
    </div>
  );
}