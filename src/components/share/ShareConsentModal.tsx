import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Lock,
  Check,
  X as XIcon,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react";
import {
  INCLUDE_OPTIONS,
  RECIPIENT_OPTIONS,
  RANGE_OPTIONS,
  type RangeKey,
  type SummaryData,
} from "@/lib/share/summary";
import type { RecipientId } from "@/lib/share/shareStore";
import {
  groupAttemptsByAssessment,
  formatShortDate,
  type AssessmentGroup,
} from "@/lib/patterns/grouping";
import { ASSESSMENTS } from "@/lib/patterns/assessments";
import { getAssessmentStatus } from "@/lib/patterns/scoring";
import {
  hasSharedHealthDetails,
  sharedHealthDetails,
} from "@/lib/intake/healthDetails";

export type ConsentResult = {
  includedKeys: string[];
  recipient: RecipientId;
  /**
   * When `includedKeys` includes "assessments", this narrows the shared
   * results to a specific subset of attempt IDs. When undefined, all
   * assessments in range are shared.
   */
  attemptIds?: string[];
  /**
   * When `includedKeys` includes "health", this narrows the shared Health
   * Passport details to specific field IDs. When undefined, all available
   * health details are shared.
   */
  healthFieldIds?: string[];
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
  initialAttemptIds,
  initialHealthFieldIds,
  mode = "share",
  onRevoke,
  confirmLabelOverride,
  submitting = false,
  onRangeChange,
}: {
  open: boolean;
  onConfirm: (result: ConsentResult) => void;
  summary: SummaryData;
  assessmentContext?: AssessmentContext;
  providerContext?: ProviderContext;
  initialIncluded?: string[];
  initialAttemptIds?: string[];
  initialHealthFieldIds?: string[];
  mode?: "share" | "update";
  onRevoke?: () => void;
  confirmLabelOverride?: string;
  submitting?: boolean;
  onRangeChange?: (range: RangeKey) => void;
}) {
  // Provider-linked flow adds a "choice" step (0) before the existing flow.
  // 0 = choice, 1 = custom selection (choose what to share), 3 = review.
  // Non-provider flow keeps the classic 1 → 2 → 3 shape.
  // Provider-linked flow: skip the "how would you like to share" choice
  // screen and go straight to selecting what to share. The review step
  // (3) still confirms the snapshot before it's sent.
  const [step, setStep] = useState<number>(1);
  const [choice, setChoice] = useState<"all" | "custom" | "none">("custom");

  // Which include options have data
  const itemHasData = useMemo(() => {
    return {
      mood: summary.checkinsInRange.length > 0,
      assessments: summary.attemptsInRange.length > 0,
      health: hasSharedHealthDetails(),
    } as Record<string, boolean>;
  }, [summary]);

  const defaultKeys = useMemo(
    () =>
      INCLUDE_OPTIONS.filter((o) => !o.defaultOff)
        .map((o) => o.key)
        .filter((k) => itemHasData[k]),
    [itemHasData],
  );

  const defaultSelection = useMemo(() => {
    if (initialIncluded) return initialIncluded.filter((k) => itemHasData[k]);
    // Provider-linked sharing: default is "share current Health Passport",
    // which pre-fills every available non-sensitive item. The user still has
    // to review and explicitly confirm on the final step.
    if (providerContext) return defaultKeys;
    if (assessmentContext) return ["assessments"].filter((k) => itemHasData[k]);
    return defaultKeys;
  }, [assessmentContext, itemHasData, providerContext, initialIncluded, defaultKeys]);

  const [included, setIncluded] = useState<string[]>(defaultSelection);
  const [recipient, setRecipient] = useState<RecipientId | null>(null);
  const [agreed, setAgreed] = useState(false);
  const allAttemptIds = useMemo(
    () => summary.attemptsInRange.map((a) => a.id),
    [summary],
  );
  const defaultAttemptIds = useMemo(() => {
    if (initialAttemptIds) {
      const set = new Set(allAttemptIds);
      return initialAttemptIds.filter((id) => set.has(id));
    }
    return allAttemptIds;
  }, [initialAttemptIds, allAttemptIds]);
  const [selectedAttemptIds, setSelectedAttemptIds] =
    useState<string[]>(defaultAttemptIds);

  // Per-field control over which Health Passport details are shared.
  const healthGroups = useMemo(() => sharedHealthDetails(), []);
  const allHealthFieldIds = useMemo(
    () => healthGroups.flatMap((g) => g.items.map((it) => it.id)),
    [healthGroups],
  );
  const defaultHealthFieldIds = useMemo(() => {
    if (initialHealthFieldIds) {
      const set = new Set(allHealthFieldIds);
      return initialHealthFieldIds.filter((id) => set.has(id));
    }
    return allHealthFieldIds;
  }, [initialHealthFieldIds, allHealthFieldIds]);
  const [selectedHealthFieldIds, setSelectedHealthFieldIds] =
    useState<string[]>(defaultHealthFieldIds);

  useEffect(() => {
    if (open) {
      setStep(1);
      setChoice("custom");
      setIncluded(defaultSelection);
      setRecipient(providerContext ? "other-mhp" : null);
      // In update mode the user already consented once, so start checked.
      // Any change will uncheck it and require re-consent.
      setAgreed(mode === "update");
      setSelectedAttemptIds(defaultAttemptIds);
      setSelectedHealthFieldIds(defaultHealthFieldIds);
    }
  }, [open, defaultSelection, providerContext, defaultAttemptIds, defaultHealthFieldIds, mode]);

  // Dirty tracking (update mode): the "share update" button only appears
  // when the patient actually changed something vs the current grant.
  const dirty = useMemo(() => {
    const baselineIncluded = initialIncluded ?? defaultSelection;
    const incSet = new Set(baselineIncluded);
    const incDirty =
      included.length !== incSet.size ||
      included.some((k) => !incSet.has(k));
    const attemptsBaseline = defaultAttemptIds;
    const attSet = new Set(attemptsBaseline);
    const attDirty =
      selectedAttemptIds.length !== attSet.size ||
      selectedAttemptIds.some((id) => !attSet.has(id));
    const healthSet = new Set(defaultHealthFieldIds);
    const healthDirty =
      selectedHealthFieldIds.length !== healthSet.size ||
      selectedHealthFieldIds.some((id) => !healthSet.has(id));
    return incDirty || attDirty || healthDirty;
  }, [
    included,
    initialIncluded,
    defaultSelection,
    selectedAttemptIds,
    defaultAttemptIds,
    selectedHealthFieldIds,
    defaultHealthFieldIds,
  ]);

  // Auto-uncheck the "Assessment results" parent category when the user has
  // deselected every individual attempt. Keeps parent state in sync with
  // child selections.
  useEffect(() => {
    if (
      included.includes("assessments") &&
      allAttemptIds.length > 0 &&
      selectedAttemptIds.length === 0
    ) {
      setIncluded((prev) => prev.filter((k) => k !== "assessments"));
    }
  }, [selectedAttemptIds, included, allAttemptIds]);

  // Same for Health Passport details: deselecting every field removes the
  // parent category so nothing is shared by accident.
  useEffect(() => {
    if (
      included.includes("health") &&
      allHealthFieldIds.length > 0 &&
      selectedHealthFieldIds.length === 0
    ) {
      setIncluded((prev) => prev.filter((k) => k !== "health"));
    }
  }, [selectedHealthFieldIds, included, allHealthFieldIds]);

  // In update mode, if the user edits anything, reset the consent checkbox
  // so they must explicitly re-confirm before sharing the update.
  useEffect(() => {
    if (mode === "update" && dirty && agreed) {
      setAgreed(false);
    }
  }, [mode, dirty, agreed]);

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

  const toggleAttempt = (id: string) =>
    setSelectedAttemptIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  const selectAllAttempts = () => setSelectedAttemptIds(allAttemptIds);
  const deselectAllAttempts = () => setSelectedAttemptIds([]);

  const toggleHealthField = (id: string) =>
    setSelectedHealthFieldIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  const selectAllHealthFields = () => setSelectedHealthFieldIds(allHealthFieldIds);
  const deselectAllHealthFields = () => setSelectedHealthFieldIds([]);

  // Provider-linked sharing: we show the selection, review, and consent in a
  // single step so the user can choose what to share, see the review, check
  // "I agree", and then click "Continue and share" directly.
  const canStep1Continue = providerContext ? true : included.length > 0;
  const canStep2Continue = recipient !== null;

  // In provider mode there's only one visible step: choose + review + consent.
  // Non-provider flow keeps the classic 1 → 2 → 3 shape.
  const providerStepsTotal = 1;
  const totalSteps = providerContext ? providerStepsTotal : 3;
  const displayedStep = providerContext ? 1 : step;
  const stepTitle = providerContext
    ? "Review and share"
    : step === 1
      ? "Choose what to include"
      : step === 2
        ? "Choose recipient"
        : "Confirm & consent";
  const isConfirmStep = step === 3 || (providerContext && step === 1);
  const isUpdateMode = !!providerContext && mode === "update";
  // In update mode, hide the primary "share update" button until the
  // patient actually changes something.
  const showPrimary = isUpdateMode ? dirty : true;
  const nextButtonLabel = isConfirmStep
    ? confirmLabelOverride ??
      (isUpdateMode ? "Share update" : "Continue and share")
    : "Continue";
  const confirmDisabled =
    isConfirmStep && providerContext
      ? !agreed || included.length === 0
      : false;

  const buildResult = (): ConsentResult => ({
    includedKeys: included,
    recipient: recipient!,
    attemptIds: included.includes("assessments") ? selectedAttemptIds : undefined,
    healthFieldIds: included.includes("health")
      ? selectedHealthFieldIds
      : undefined,
  });

  const advance = () => {
    if (providerContext) {
      if (recipient && !confirmDisabled) {
        onConfirm(buildResult());
      }
    } else {
      if (step < 3) setStep(step + 1);
      else if (recipient) onConfirm(buildResult());
    }
  };

  const back = () => {
    if (!providerContext) {
      setStep(step - 1);
    }
  };

  const removeIncluded = (key: string) =>
    setIncluded((prev) => prev.filter((k) => k !== key));
  void choice;
  void setChoice;
  void Step0Choice;

  return (
    <section
      aria-label="Share consent"
      className="max-h-[85vh] overflow-y-auto rounded-[28px] border border-[#ECE7F6] bg-white shadow-[0_24px_60px_-30px_rgba(74,62,127,0.18)]"
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
              selectedAttemptIds={selectedAttemptIds}
              toggleAttempt={toggleAttempt}
              selectAllAttempts={selectAllAttempts}
              deselectAllAttempts={deselectAllAttempts}
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
              onRemoveIncluded={removeIncluded}
              selectedAttemptIds={selectedAttemptIds}
              mode={mode}
              dirty={dirty}
              onRangeChange={onRangeChange}
            />
          )}
          {/* Provider-linked flow: merge review/consent into the selection step. */}
          {providerContext && step === 1 && (
            <div className="mt-2">
              <Step3
                providerContext={providerContext}
                includedKeys={included}
                agreed={agreed}
                onAgreedChange={setAgreed}
                summary={summary}
                onRemoveIncluded={removeIncluded}
                selectedAttemptIds={selectedAttemptIds}
                mode={mode}
                dirty={dirty}
                onRangeChange={onRangeChange}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[#F4F0FB] bg-white px-5 py-4 md:px-7">
          {onRevoke ? (
            <button
              type="button"
              onClick={onRevoke}
              disabled={submitting}
              className="inline-flex items-center rounded-[12px] border border-[#E1DAF1] bg-white px-4 py-2 text-sm font-semibold text-[#4A3E7F] transition hover:border-[#7E6BAF]/40 hover:bg-[#F7F4FC] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Revoke access
            </button>
          ) : step > 1 && !providerContext ? (
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
          {showPrimary ? (
          <button
            type="button"
            disabled={
              (step === 1 && !providerContext && !canStep1Continue) ||
              (step === 1 && providerContext && !agreed) ||
              (step === 2 && !canStep2Continue) ||
              confirmDisabled ||
              submitting
            }
            onClick={advance}
            className="inline-flex items-center gap-1.5 rounded-[12px] bg-gradient-to-r from-[#7E6BAF] to-[#6A5A98] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(126,107,175,0.55)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(61,46,107,0.55)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting && isConfirmStep ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sharing…
              </>
            ) : (
              <>
                {nextButtonLabel}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
          ) : (
            <p className="text-xs text-[#8B85A6]">
              Change a selection above to share an update.
            </p>
          )}
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
      blurb: "Send your latest mood patterns and assessment results so your provider can prepare for your session.",
    },
    {
      id: "custom",
      title: "Choose what to share",
      blurb: "Pick exactly what goes into the summary — skip anything you’re not comfortable sharing.",
    },
    {
      id: "none",
      title: "Don't share",
      blurb: "Continue without sharing now. You can always come back and share later from your Health Passport.",
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
  selectedAttemptIds,
  toggleAttempt,
  selectAllAttempts,
  deselectAllAttempts,
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
  selectedAttemptIds: string[];
  toggleAttempt: (id: string) => void;
  selectAllAttempts: () => void;
  deselectAllAttempts: () => void;
}) {
  const [showAllAssess, setShowAllAssess] = useState(false);
  const attempts = summary.attemptsInRange;
  const groups = useMemo(() => groupAttemptsByAssessment(attempts), [attempts]);
  const selectedCount = attempts.filter((a) =>
    selectedAttemptIds.includes(a.id),
  ).length;
  const allAttemptsSelected =
    attempts.length > 0 && selectedCount === attempts.length;
  void showAllAssess;
  void setShowAllAssess;
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
      <p className="mt-3 rounded-xl border border-[#ECE7F6] bg-[#FAF8FD] px-3 py-2 text-xs leading-relaxed text-[#5A4A8A]">
        Any medication, allergy, or health condition details you include may be
        used by your provider to prescribe and treat you safely. You can change
        or revoke access at any time.
      </p>


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
            // For assessments, treat the tile as visually unchecked when the
            // category is included but the patient hasn't picked any attempts
            // yet — the purple check should only appear once at least one
            // result is selected.
            const visuallyChecked =
              checked &&
              !(opt.key === "assessments" && attempts.length > 0 && selectedCount === 0);
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
                      : visuallyChecked
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
                      visuallyChecked
                        ? "border-[#7E6BAF] bg-[#7E6BAF] text-white"
                        : "border-[#D6CCEC] bg-white text-transparent"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                </label>
                {opt.key === "assessments" && checked && attempts.length > 0 && (
                  <div className="mt-1.5 ml-3 rounded-xl border border-dashed border-[#E1D9F1] bg-white px-3 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7E6BAF]">
                        Results included ({selectedCount} of {attempts.length})
                      </p>
                      <button
                        type="button"
                        onClick={
                          allAttemptsSelected
                            ? deselectAllAttempts
                            : selectAllAttempts
                        }
                        className="text-[11px] font-semibold text-[#7E6BAF] hover:text-[#6A5A98]"
                      >
                        {allAttemptsSelected ? "Deselect all" : "Select all"}
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] text-[#8B85A6]">
                      Grouped by assessment. Expand a group to pick specific
                      attempts.
                    </p>
                    <ul className="mt-2 space-y-2">
                      {groups.map((g) => (
                        <AssessmentGroupRow
                          key={g.assessmentId}
                          group={g}
                          selectedIds={selectedAttemptIds}
                          toggleAttempt={toggleAttempt}
                        />
                      ))}
                    </ul>
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
              : `${included.length} categor${included.length === 1 ? "y" : "ies"} selected${
                  included.includes("assessments")
                    ? ` · ${selectedCount} assessment result${selectedCount === 1 ? "" : "s"}`
                    : ""
                }.`}{" "}
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
          <li>• Full Lubin chat transcripts</li>
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
  return renderStep2(recipient, setRecipient);
}

function AssessmentGroupRow({
  group,
  selectedIds,
  toggleAttempt,
}: {
  group: AssessmentGroup;
  selectedIds: string[];
  toggleAttempt: (id: string) => void;
}) {
  const [open, setOpen] = useState(group.attempts.length > 1 ? false : true);
  const single = group.attempts.length === 1;
  const selectedInGroup = group.attempts.filter((a) => selectedIds.includes(a.id)).length;
  const allOn = selectedInGroup === group.attempts.length;
  const someOn = selectedInGroup > 0 && !allOn;
  const toggleGroup = () => {
    if (allOn) {
      // deselect every attempt in this group
      group.attempts.forEach((a) => {
        if (selectedIds.includes(a.id)) toggleAttempt(a.id);
      });
    } else {
      group.attempts.forEach((a) => {
        if (!selectedIds.includes(a.id)) toggleAttempt(a.id);
      });
    }
  };

  // Single-attempt: keep the current compact single-row treatment.
  if (single) {
    const a = group.attempts[0]!;
    const isSel = selectedIds.includes(a.id);
    return (
      <li>
        <label
          className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-2 transition ${
            isSel
              ? "border-[#7E6BAF]/40 bg-[#FAF8FD]"
              : "border-transparent hover:bg-[#FAF8FD]"
          }`}
        >
          <input
            type="checkbox"
            checked={isSel}
            onChange={() => toggleAttempt(a.id)}
            className="sr-only"
          />
          <span
            className={`flex h-4 w-4 flex-none items-center justify-center rounded-[6px] border-2 transition ${
              isSel
                ? "border-[#7E6BAF] bg-[#7E6BAF] text-white"
                : "border-[#D6CCEC] bg-white text-transparent"
            }`}
          >
            <Check className="h-2.5 w-2.5" strokeWidth={3} />
          </span>
          <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#3D2E6B]">
            {group.friendlyName}{" "}
            <span className="text-[10px] text-[#8B85A6]">({group.clinicalName})</span>
          </span>
          <span className="flex-none text-[11px] text-[#8B85A6]">
            {formatShortDate(a.takenAt)}
          </span>
        </label>
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-[#ECE7F6] bg-white">
      <div className="flex items-center gap-2 px-2.5 py-2">
        <button
          type="button"
          onClick={toggleGroup}
          aria-label={allOn ? "Deselect all in group" : "Select all in group"}
          className={`flex h-4 w-4 flex-none items-center justify-center rounded-[6px] border-2 transition ${
            allOn
              ? "border-[#7E6BAF] bg-[#7E6BAF] text-white"
              : "border-[#D6CCEC] bg-white text-transparent"
          }`}
        >
          {allOn ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold text-[#3D2E6B]">
              {group.friendlyName}{" "}
              <span className="text-[10px] font-normal text-[#8B85A6]">
                ({group.clinicalName}) · {group.attempts.length} results
              </span>
            </p>
            <p className="mt-0.5 truncate text-[11px] text-[#6B6684]">
              Latest:{" "}
              {group.latest.status ? (
                <span className="font-medium text-[#3D2E6B]">
                  {group.latest.status.label}
                </span>
              ) : null}
              {group.latest.status ? " · " : ""}
              {formatShortDate(group.latest.takenAt)}
            </p>
          </div>
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 flex-none text-[#7E6BAF]" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 flex-none text-[#7E6BAF]" />
          )}
        </button>
      </div>

      {open && (
        <div className="border-t border-[#ECE7F6] px-2.5 py-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] font-medium text-[#8B85A6]">
              {selectedInGroup} of {group.attempts.length} selected
            </span>
            <button
              type="button"
              onClick={toggleGroup}
              className="text-[10px] font-semibold text-[#7E6BAF] hover:underline"
            >
              {allOn ? "Deselect all" : `Select all ${group.attempts.length}`}
            </button>
          </div>
          <ul className="space-y-1">
            {group.attempts.map((a, idx) => {
              const isSel = selectedIds.includes(a.id);
              return (
                <li key={a.id}>
                  <label
                    className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[11px] transition ${
                      isSel ? "bg-[#FAF8FD]" : "hover:bg-[#FAF8FD]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => toggleAttempt(a.id)}
                      className="sr-only"
                    />
                    <span
                      className={`flex h-3.5 w-3.5 flex-none items-center justify-center rounded-[5px] border-2 transition ${
                        isSel
                          ? "border-[#7E6BAF] bg-[#7E6BAF] text-white"
                          : "border-[#D6CCEC] bg-white text-transparent"
                      }`}
                    >
                      <Check className="h-2 w-2" strokeWidth={3} />
                    </span>
                    <span className="flex-none font-medium text-[#3D2E6B]">
                      {formatShortDate(a.takenAt)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[#5A4A8A]">
                      · Score {a.score}
                      {a.status ? ` · ${a.status.label}` : ""}
                    </span>
                    {idx === 0 && (
                      <span className="flex-none rounded-md bg-[#EEE8F8] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#7E6BAF]">
                        Latest
                      </span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </li>
  );
}

function renderStep2(
  recipient: RecipientId | null,
  setRecipient: (id: RecipientId) => void,
) {
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
  onRemoveIncluded,
  selectedAttemptIds,
  mode = "share",
  dirty = false,
  onRangeChange,
}: {
  providerContext?: ProviderContext;
  includedKeys: string[];
  agreed: boolean;
  onAgreedChange: (v: boolean) => void;
  summary: SummaryData;
  onRemoveIncluded?: (key: string) => void;
  selectedAttemptIds?: string[];
  mode?: "share" | "update";
  dirty?: boolean;
  onRangeChange?: (range: RangeKey) => void;
}) {
  const includedLabels = INCLUDE_OPTIONS.filter((o) => includedKeys.includes(o.key));
  const sharedAttempts = summary.attemptsInRange.filter((a) =>
    selectedAttemptIds ? selectedAttemptIds.includes(a.id) : true,
  );
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
        keys: ["mood"],
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
        body: (() => {
          // Group selected attempts by assessment and show date/score/severity
          // for every selected attempt.
          const byName = new Map<string, typeof sharedAttempts>();
          for (const a of sharedAttempts) {
            const list = byName.get(a.assessmentName) ?? [];
            list.push(a);
            byName.set(a.assessmentName, list);
          }
          return (
            <div className="space-y-2 text-[12px] text-[#3D2E6B]">
              {[...byName.entries()].map(([name, list]) => {
                const sorted = [...list].sort((a, b) => b.takenAt - a.takenAt);
                const latest = sorted[0];
                const meta = latest
                  ? ASSESSMENTS.find((x) => x.id === latest.assessmentId)
                  : null;
                const latestStatus =
                  latest && meta
                    ? getAssessmentStatus(
                        meta.id,
                        latest.score,
                        meta.maxScore,
                        meta.lowerIsBetter,
                      )
                    : null;
                return (
                  <details
                    key={name}
                    className="group rounded-xl border border-[#ECE7F6] bg-white open:bg-[#FAF8FD]"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3 py-2 hover:bg-[#FAF8FD]">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-semibold text-[#3D2E6B]">
                          {name}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-[#6B6684]">
                          {sorted.length} result{sorted.length === 1 ? "" : "s"}
                          {latestStatus ? ` · Latest: ${latestStatus.label}` : ""}
                        </span>
                      </span>
                      <span
                        aria-hidden
                        className="flex-none text-[11px] text-[#7E6BAF] transition-transform group-open:rotate-180"
                      >
                        ▾
                      </span>
                    </summary>
                    <ul className="space-y-0.5 border-t border-[#ECE7F6] px-3 py-2">
                      {sorted.map((a) => {
                        const m = ASSESSMENTS.find((x) => x.id === a.assessmentId);
                        const st = m
                          ? getAssessmentStatus(m.id, a.score, m.maxScore, m.lowerIsBetter)
                          : null;
                        return (
                          <li
                            key={a.id}
                            className="text-[11px] text-[#5A4A8A]"
                          >
                            {new Date(a.takenAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                            {typeof a.score === "number" ? ` · Score ${a.score}` : ""}
                            {st ? ` · ${st.label}` : ""}
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                );
              })}
            </div>
          );
        })(),
      },
      {
        title: "Health Passport details",
        keys: ["health"],
        body: (
          <div className="space-y-2">
            {sharedHealthDetails().map((g) => (
              <div
                key={g.group}
                className="rounded-lg bg-white px-2.5 py-1.5 ring-1 ring-[#ECE7F6]"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#7E6BAF]">
                  {g.group}
                </p>
                <ul className="mt-1 space-y-0.5">
                  {g.items.map((it) => (
                    <li key={it.label} className="text-[12px] text-[#3D2E6B]">
                      <span className="font-medium">{it.label}:</span> {it.value}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="text-[11px] text-[#8B85A6]">
              Your provider may use these details to prescribe and treat you
              safely. Remove this if you'd rather keep them private.
            </p>
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
        : s.keys.some((k) => includedKeys.includes(k)) &&
          // For assessments specifically, hide the whole card when the
          // user hasn't selected any individual attempt to share.
          !(s.keys.includes("assessments") && sharedAttempts.length === 0),
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
                <span className="mt-0.5 block whitespace-nowrap text-[11px] font-normal text-[#6B6684]">
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
            <dd className="text-right font-semibold">
              {onRangeChange ? (
                <select
                  value={summary.range}
                  onChange={(e) => onRangeChange(e.target.value as RangeKey)}
                  className="rounded-lg border border-[#E4DAF4] bg-white px-2.5 py-1 text-sm font-semibold text-[#3D2E6B] focus:border-[#7E6BAF] focus:outline-none focus:ring-2 focus:ring-[#7E6BAF]/20"
                >
                  {RANGE_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                summary.rangeLabel
              )}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#6B6684]">Assessments included</dt>
            <dd className="text-right font-semibold">
              {(() => {
                if (!includedKeys.includes("assessments")) return "Not included";
                if (sharedAttempts.length === 0) return "None selected";
                const distinct = new Set(
                  sharedAttempts.map((a) => a.assessmentName),
                ).size;
                return `${distinct} assessment${distinct === 1 ? "" : "s"} · ${sharedAttempts.length} result${sharedAttempts.length === 1 ? "" : "s"}`;
              })()}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#6B6684]">Access expires</dt>
            <dd className="text-right font-semibold">7 days after your appointment</dd>
          </div>
        </dl>

        <div className="mt-4 rounded-2xl border border-[#E4DAF4] bg-gradient-to-br from-[#F7F1FB] to-[#FAF8FD] p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7E6BAF]">
            What Dr. {providerContext.providerName.replace(/^Dr\.?\s*/i, "")} will see first
          </p>
          <p className="mt-1.5 text-[12px] text-[#3D2E6B]">
            Lubin will create a short <strong>AI Provider Brief</strong> from
            the information above, helping your provider understand the shared
            information before your appointment. Supporting details are
            available when needed.
          </p>
        </div>

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

        <p className="mt-4 rounded-2xl border border-[#ECE7F6] bg-[#FAF8FD] p-4 text-xs leading-relaxed text-[#5A4A8A]">
          This is a fixed snapshot. New Health Passport updates won't be
          shared automatically. You can update the shared information later.
        </p>

        {(() => {
          const readOnlyChecked = mode === "update" && !dirty;
          return (
            <button
              type="button"
              role="checkbox"
              aria-checked={agreed}
              aria-readonly={readOnlyChecked}
              disabled={readOnlyChecked}
              onClick={() => !readOnlyChecked && onAgreedChange(!agreed)}
              className={`mt-4 flex w-full items-start gap-3 rounded-2xl p-4 text-left text-sm transition ${
                readOnlyChecked
                  ? "cursor-default border border-[#ECE7F6] bg-[#F7F4FC] text-[#5A4A8A]"
                  : "cursor-pointer border-2 border-[#7E6BAF]/40 bg-[#FAF8FD] text-[#3D2E6B] hover:border-[#7E6BAF]"
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-md border-2 transition ${
                  agreed
                    ? "border-[#7E6BAF] bg-[#7E6BAF] text-white"
                    : "border-[#D6CCEC] bg-white text-transparent"
                }`}
              >
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              <span className="leading-relaxed">
                I have reviewed the information above and agree to share it with{" "}
                <strong>{providerContext.providerName}</strong> for this appointment. I understand
                that any medication, allergy, and health condition details I include may be used by
                my provider to prescribe and treat me safely. I can change or revoke access at any
                time.
              </span>
            </button>
          );
        })()}

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
          <li>• Any medication, allergy, or health condition details you include may be used by your provider to prescribe and treat you safely</li>
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