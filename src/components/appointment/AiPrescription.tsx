import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Check,
  AlertTriangle,
  Trash2,
  Plus,
  Printer,
  Lock,
  Info,
  ChevronLeft,
  ChevronDown,
  X,
  ShieldUser,
} from "lucide-react";
import rxIcon from "@/assets/rx-icon.png.asset.json";
import {
  loadPrescription,
  subscribePrescription,
  updatePrescription,
  genRxId,
  type Prescription,
  type PrescriptionMedication,
  type RxCountry,
  type MedicationReference,
  type MedicationCheck,
  type PatientSafetyInfo,
} from "@/lib/prescription/store";
import { loadWorkspace, type MedicationEntry } from "@/lib/visit-workspace/store";
import {
  CHECK_ROWS,
  CHECK_STATE_LABEL,
  CHECK_STATE_TONE,
  infoRelevance,
  missingInfoKeys,
  INFO_REQUIREMENT_LABEL,
  blockerSentence,
  checkState,
  formatCheckedAt,
  infoLabel,
  infoItems,
  infoRecordedSummary,
  reviewStale,
  requiredInfoKeys,
  runSafetyReview,
  safetyStatus,
  safetySummary,
  medSafetySignature,
  unreviewedCheckKeys,
  verificationBlockers,
  type Blocker,
  type CheckKey,
  type InfoKey,
} from "@/lib/prescription/safety";
import { MedicationReferenceDrawer } from "./MedicationReferenceDrawer";
import { MED_VERIFICATION_STATEMENT } from "@/lib/prescription/reference";
import { DEMO_BANNER, demoPrescription } from "@/lib/prescription/demo";
import { PatientInfoForm } from "./PatientInfoForm";
import { findCatalogue, searchCatalogue } from "@/lib/prescription/catalogue";
import { sharedSafetyResponse, type SharedSafetyResponse } from "@/lib/prescription/sharedSafety";

const JURISDICTION_LABEL: Record<RxCountry, string> = {
  US: "United States",
  PH: "Philippines",
};

const STAGES = ["Draft", "Clinical review", "Sign and issue"] as const;
type Stage = 0 | 1 | 2;

function medComplete(m: PrescriptionMedication) {
  return m.name.trim() && m.dose.trim() && m.frequency.trim() && m.instructions.trim();
}

export function AiPrescription({
  appointmentId,
  clientName,
  providerName,
  jurisdiction,
}: {
  appointmentId: string;
  clientName?: string;
  providerName?: string;
  appointmentLabel?: string;
  /** Locked from the client's jurisdiction and the provider's authority. */
  jurisdiction?: RxCountry;
  /** Kept for callers; missing patient information is now captured in place. */
  onAddClinicalInfo?: () => void;
}) {
  const [rx, setRx] = useState<Prescription>(() => loadPrescription(appointmentId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refMedId, setRefMedId] = useState<string | null>(null);
  const [reviewMedId, setReviewMedId] = useState<string | null>(null);
  const [finalReview, setFinalReview] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);

  useEffect(() => {
    const loaded = loadPrescription(appointmentId);
    // Demo safeguard: a leftover AI draft from an earlier visit must never
    // reappear on its own. The section always opens in the true
    // "No prescription prepared" state, and AI content only comes back when
    // the provider asks for it in this session.
    const stale =
      loaded.demo &&
      !loaded.finalisedAt &&
      !loaded.reviewedAt &&
      Date.now() - (loaded.updatedAt ?? 0) > 10 * 60 * 1000 &&
      (loaded.medications.some((m) => m.origin !== "manual" && !m.approved) ||
        (loaded.suggestions?.length ?? 0) > 0);
    if (stale) {
      setRx(
        updatePrescription(appointmentId, {
          medications: loaded.medications.filter((m) => m.origin === "manual" || m.approved),
          suggestions: [],
          suggestedAt: undefined,
        }),
      );
      return subscribePrescription(() => setRx(loadPrescription(appointmentId)));
    }
    // Drop any blank placeholder left behind by an abandoned manual entry so
    // the section opens in the true "No prescription prepared" state instead
    // of an empty draft.
    const cleaned = loaded.medications.filter(
      (m) =>
        m.name.trim() ||
        m.dose.trim() ||
        m.frequency.trim() ||
        m.instructions.trim() ||
        (m.strength ?? "").trim(),
    );
    if (cleaned.length !== loaded.medications.length) {
      setRx(updatePrescription(appointmentId, { medications: cleaned }));
    } else {
      setRx(loaded);
    }
    return subscribePrescription(() => setRx(loadPrescription(appointmentId)));
  }, [appointmentId]);

  const patch = (p: Partial<Prescription>) => setRx(updatePrescription(appointmentId, p));
  // Locked: the client's jurisdiction and the provider's verified authority win
  // over anything stored on the draft. Never a selectable display value.
  const country: RxCountry = jurisdiction ?? rx.country ?? "PH";

  // A blank placeholder is never counted as a medication.
  const namedMeds = rx.medications.filter((m) => m.name.trim().length > 0);
  const blankMed = rx.medications.find((m) => !m.name.trim());
  const total = namedMeds.length;
  const verifiedCount = namedMeds.filter((m) => m.approved).length;
  const allVerified = total > 0 && verifiedCount === total;
  const signed = !!rx.finalisedAt;
  const controlledMeds = rx.medications.filter((m) => m.controlled);
  const restrictedPending = controlledMeds.length > 0 && !rx.restrictedAcknowledgedAt;
  const unverifiedSources = rx.medications.filter(
    (m) => m.reference && !m.reference.sourcesAvailable && !m.externallyVerifiedAt,
  );
  const stage: Stage = signed ? 2 : total === 0 ? 0 : allVerified ? 2 : 1;
  const medWord = total === 1 ? "medication" : "medications";
  const countLabel =
    total === 0
      ? "No medication added"
      : allVerified
        ? `${verifiedCount} of ${total} ${medWord} verified`
        : verifiedCount > 0
          ? `${verifiedCount} of ${total} ${medWord} verified`
          : `${total} ${medWord} · Verification required`;
  const hasAiDraft = namedMeds.some((m) => m.origin !== "manual");
  const statusLabel = signed
    ? "Prescription signed and issued"
    : total === 0
      ? blankMed
        ? "Medication details incomplete"
        : "No prescription prepared"
      : allVerified
        ? "Verified — ready for final review"
        : "Review required before prescribing";
  const draftSourceLabel = hasAiDraft
    ? "AI-prepared draft"
    : total > 0
      ? "Clinician-added medication"
      : null;

  const reviewMed = rx.medications.find((m) => m.id === reviewMedId) ?? null;
  const refMed = rx.medications.find((m) => m.id === refMedId) ?? null;

  const generate = async (opts?: { demoFallback?: boolean; mode?: "draft" | "suggest" }) => {
    const mode = opts?.mode ?? "draft";
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const ws = loadWorkspace(appointmentId);
      const res = await fetch("/api/generate-prescription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientContext: { firstName: clientName },
          country,
          presenting: ws.notes.presenting,
          observations: ws.notes.observations,
          plan: ws.notes.plan,
          currentMedications: ws.medications?.map((m) => ({
            name: m.name,
            dose: m.dose,
            frequency: m.frequency,
          })),
        }),
      });
      const data = (await res.json()) as {
        medications?: Omit<PrescriptionMedication, "id" | "approved">[];
        clinicalNotes?: string;
        country?: RxCountry;
        error?: string;
      };
      const ws2 = loadWorkspace(appointmentId);
      const missingInformation = missingClinicalInfo(ws2);
      const meds: PrescriptionMedication[] = res.ok
        ? (data.medications ?? []).map((m) => ({
            ...m,
            id: genRxId(),
            origin: "ai",
            approved: false,
            basis: {
              generatedAt: Date.now(),
              clinicalInformationUsed: clinicalInfoUsed(ws2),
              whyIncluded: m.rationale,
              patientConsiderations: m.indication,
              missingInformation: missingInformation.join(", ") || undefined,
            },
          }))
        : [];

      if (meds.length === 0 && opts?.demoFallback !== false) {
        loadDemo(
          res.ok
            ? "Not enough clinical information was recorded for a live draft, so a demo prescription was prepared instead."
            : "The drafting service is unavailable right now, so a demo prescription was prepared instead.",
          mode,
        );
        return;
      }
      if (meds.length === 0) {
        setError(data.error ?? "Could not prepare a draft. Please try again.");
        return;
      }
      if (mode === "suggest") {
        patch({
          suggestions: meds,
          suggestedAt: Date.now(),
          country: data.country ?? country,
          skippedAt: undefined,
        });
        setShowSuggestions(true);
        return;
      }
      patch({
        medications: meds,
        clinicalNotes: data.clinicalNotes,
        country: data.country ?? country,
        demo: false,
        missingInformation: undefined,
        skippedAt: undefined,
        generatedAt: Date.now(),
        reviewedAt: undefined,
        legalAcknowledgedAt: undefined,
        restrictedAcknowledgedAt: undefined,
        finalisedAt: undefined,
        finalisedBy: undefined,
      });
    } catch (e) {
      console.error(e);
      loadDemo(
        "The drafting service could not be reached, so a demo prescription was prepared instead.",
        mode,
      );
    } finally {
      setBusy(false);
    }
  };

  const loadDemo = (message?: string, mode: "draft" | "suggest" = "draft") => {
    const demo = demoPrescription(appointmentId);
    if (mode === "suggest") {
      patch({
        suggestions: demo.suggestions,
        suggestedAt: demo.suggestedAt,
        demo: true,
        skippedAt: undefined,
      });
      setNotice(message ?? null);
      setShowSuggestions(true);
      return;
    }
    patch({ ...demo, skippedAt: undefined });
    setNotice(message ?? null);
  };

  const suggestions = rx.suggestions ?? [];

  /** Move one suggestion into the draft. It is still unverified: the provider
   *  must complete the clinical review before it can be issued. */
  const acceptSuggestion = (id: string) => {
    const s = suggestions.find((m) => m.id === id);
    if (!s) return;
    const med: PrescriptionMedication = {
      ...s,
      id: genRxId(),
      origin: "ai-option",
      approved: false,
      verifiedAt: undefined,
      acknowledgedAt: undefined,
    };
    const blank = rx.medications.filter((m) => m.name.trim());
    patch({
      medications: [...blank, med],
      suggestions: suggestions.filter((m) => m.id !== id),
      skippedAt: undefined,
      reviewedAt: undefined,
      legalAcknowledgedAt: undefined,
      finalisedAt: undefined,
      finalisedBy: undefined,
    });
    setReviewMedId(med.id);
    setFinalReview(false);
  };

  const dismissSuggestions = () => {
    patch({ suggestions: [], suggestedAt: undefined });
    setNotice(null);
    setShowSuggestions(false);
  };

  const suggestionsPanel =
    suggestions.length > 0 && showSuggestions ? (
      <div className="mb-4 rounded-2xl border border-[#E7E2F5] bg-[#FBFAFE] px-4 py-4 md:px-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#8C86A0]">
              For your consideration only
            </p>
            <h3 className="mt-1 text-[14px] font-semibold text-[#2C2B4B]">
              AI suggestions — not a recommendation to prescribe
            </h3>
            <p className="mt-1 max-w-xl text-[12.5px] leading-relaxed text-[#5A4A8A]">
              These options were generated from this visit&rsquo;s recorded information. Nothing
              here is part of the prescription. If you judge an option clinically appropriate,
              accept it into your draft and complete the clinical review — the prescribing decision
              and the directions remain yours.
            </p>
          </div>
          <button
            type="button"
            onClick={dismissSuggestions}
            className="inline-flex h-9 items-center rounded-[10px] px-3 text-[13px] font-semibold text-[#5A4A8A] transition hover:bg-white hover:text-[#3D2E6B]"
          >
            Dismiss suggestions
          </button>
        </div>
        <ul className="mt-3 space-y-2.5">
          {suggestions.map((s) => (
            <li
              key={s.id}
              className="rounded-xl border border-[#E4E1EC] bg-white px-4 py-3.5 md:flex md:items-start md:gap-4"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold text-[#2C2B4B]">
                  {s.name || "Suggested option"}{" "}
                  <span className="font-normal text-[#5A4A8A]">{s.strength ?? ""}</span>
                </p>
                <p className="mt-0.5 text-[12.5px] text-[#5A4A8A]">
                  {[s.route, s.frequency, s.duration].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-1 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[#8C86A0]">
                  Suggestion · not verified{s.demo ? " · demo data" : ""}
                </p>
                {(s.rationale || s.indication) && (
                  <p className="mt-2 text-[12.5px] leading-relaxed text-[#5A4A8A]">
                    <span className="font-semibold text-[#3D2E6B]">Why it was surfaced: </span>
                    {oneLine(s.rationale || s.indication || "")}
                  </p>
                )}
              </div>
              <div className="mt-3 flex flex-none flex-wrap items-center gap-2 md:mt-0">
                <button
                  type="button"
                  onClick={() => acceptSuggestion(s.id)}
                  className="inline-flex h-9 items-center rounded-[10px] bg-[#6E4FD3] px-4 text-[13px] font-semibold text-white transition hover:bg-[#5A3EB8]"
                >
                  Review Suggested Medication
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = suggestions.filter((m) => m.id !== s.id);
                    patch({ suggestions: next });
                    if (next.length === 0) setShowSuggestions(false);
                  }}
                  className="inline-flex h-9 items-center rounded-[10px] border border-[#D9D5E3] bg-white px-3.5 text-[13px] font-semibold text-[#3D2E6B] transition hover:bg-[#F7F5FB]"
                >
                  Not applicable
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#E7E2F5] pt-3.5">
          <p className="mr-1 text-[12px] text-[#5A4A8A]">None of these fit?</p>
          <button
            type="button"
            onClick={addMed}
            className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#D9D5E3] bg-white px-3.5 text-[13px] font-semibold text-[#3D2E6B] transition hover:bg-[#F7F5FB]"
          >
            <Plus className="h-4 w-4" /> Add medication manually
          </button>
          <button
            type="button"
            onClick={() => patch({ skippedAt: Date.now() })}
            className="inline-flex h-9 items-center rounded-[10px] border border-[#D9D5E3] bg-white px-3.5 text-[13px] font-semibold text-[#3D2E6B] transition hover:bg-[#F7F5FB]"
          >
            No prescription needed
          </button>
        </div>
      </div>
    ) : null;

  /** Any medication-field change resets that medication's verification and
   *  any completed whole-prescription review. */
  const updateMed = (id: string, p: Partial<PrescriptionMedication>) => {
    const meds = rx.medications.map((m) => (m.id === id ? { ...m, ...p } : m));
    const isVerificationToggle = Object.keys(p).length <= 2 && "approved" in p;
    patch({
      medications: meds,
      ...(isVerificationToggle ? {} : { reviewedAt: undefined, legalAcknowledgedAt: undefined }),
    });
  };
  const removeMed = (id: string) => {
    patch({
      medications: rx.medications.filter((m) => m.id !== id),
      reviewedAt: undefined,
      legalAcknowledgedAt: undefined,
    });
    if (reviewMedId === id) setReviewMedId(null);
  };
  function addMed() {
    const blank = rx.medications.find((m) => !m.name.trim());
    if (blank) {
      setReviewMedId(blank.id);
      setFinalReview(false);
      return;
    }
    const id = genRxId();
    patch({
      medications: [
        ...rx.medications,
        {
          id,
          name: "",
          dose: "",
          frequency: "",
          instructions: "",
          origin: "manual",
          approved: false,
        },
      ],
      skippedAt: undefined,
      reviewedAt: undefined,
      legalAcknowledgedAt: undefined,
    });
    setReviewMedId(id);
    setFinalReview(false);
  }

  const discardDraft = () => {
    patch({
      medications: [],
      suggestions: [],
      suggestedAt: undefined,
      clinicalNotes: undefined,
      demo: false,
      generatedAt: undefined,
      reviewedAt: undefined,
      legalAcknowledgedAt: undefined,
      restrictedAcknowledgedAt: undefined,
      finalisedAt: undefined,
      finalisedBy: undefined,
      missingInformation: undefined,
    });
    setReviewMedId(null);
    setFinalReview(false);
    setShowSuggestions(false);
    setNotice(null);
  };

  const cacheReference = (medId: string, reference: MedicationReference) =>
    patch({
      medications: rx.medications.map((m) => (m.id === medId ? { ...m, reference } : m)),
    });
  const markExternallyVerified = (medId: string) =>
    patch({
      medications: rx.medications.map((m) =>
        m.id === medId
          ? {
              ...m,
              externallyVerifiedAt: m.externallyVerifiedAt ? undefined : Date.now(),
            }
          : m,
      ),
    });

  const saveDraft = () => {
    patch({});
    setSavedAt(Date.now());
  };

  const visitMeds: MedicationEntry[] = loadWorkspace(appointmentId).medications ?? [];

  /** Shared assessment safety response, carried into the clinical review. */
  const sharedSafety = useMemo(() => sharedSafetyResponse(appointmentId), [appointmentId]);

  const canSign =
    allVerified &&
    !!rx.legalAcknowledgedAt &&
    unverifiedSources.length === 0 &&
    !restrictedPending &&
    // Required information must still be complete and every review acknowledged.
    rx.medications.every(
      (m) =>
        missingInfoKeys(m, rx.patientInfo, visitMeds).length === 0 &&
        unreviewedCheckKeys(m).length === 0 &&
        !reviewStale(m, rx.patientInfo) &&
        (!sharedSafety || !!m.sharedSafetyAcknowledgedAt),
    );

  const setPatientInfo = (p: Partial<PatientSafetyInfo>) =>
    patch({ patientInfo: { ...(rx.patientInfo ?? {}), ...p, updatedAt: Date.now() } });

  const runReview = (medId: string) => {
    const target = rx.medications.find((m) => m.id === medId);
    if (!target) return;
    const checks = runSafetyReview(target, rx.patientInfo, visitMeds);
    patch({
      medications: rx.medications.map((m) =>
        m.id === medId
          ? {
              ...m,
              checks,
              safetyReviewedAt: Date.now(),
              safetySignature: medSafetySignature(m),
              // A fresh review invalidates earlier per-finding acknowledgements.
              checkReviews: {},
              approved: false,
              verifiedAt: undefined,
              acknowledgedAt: undefined,
            }
          : m,
      ),
    });
  };

  const markCheckReviewed = (medId: string, key: CheckKey) =>
    patch({
      medications: rx.medications.map((m) =>
        m.id === medId
          ? {
              ...m,
              checkReviews: {
                ...(m.checkReviews ?? {}),
                [key]: m.checkReviews?.[key] ? undefined : Date.now(),
              },
            }
          : m,
      ),
    });

  const header = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4">
        <div>
          <p className="text-[13px] font-semibold text-[#3D2E6B]">
            {statusLabel}
            {draftSourceLabel && !signed && !allVerified ? (
              <span className="font-normal text-[#6F6889]"> · {draftSourceLabel}</span>
            ) : null}
          </p>
          {total > 0 && !signed && !allVerified && (
            <p className="mt-0.5 max-w-lg text-[12px] leading-relaxed text-[#5A4A8A]">
              Review and verify this draft before issuing it, or discard it if no prescription is
              needed.
            </p>
          )}
          <p className="mt-0.5 text-[12px] text-[#5A4A8A]">
            Jurisdiction{" "}
            <span className="font-semibold text-[#3D2E6B]">{JURISDICTION_LABEL[country]}</span> —
            set from {clientName || "the client"}&rsquo;s recorded location and your verified
            prescribing authority. Not selectable here.
          </p>
        </div>
        <StageBar stage={stage} draftReady={total > 0} />
      </div>
    </>
  );

  // ---------- No prescription needed ----------
  if (rx.skippedAt && total === 0) {
    return (
      <section className="text-[#2C2B4B]">
        {header}
        <div className="rounded-xl border border-[#E4E1EC] bg-white px-4 py-4">
          <p className="text-[13.5px] font-semibold">No prescription needed for this appointment</p>
          <p className="mt-1 text-[12.5px] text-[#5A4A8A]">
            Recorded {new Date(rx.skippedAt).toLocaleString()}.
          </p>
          <button
            type="button"
            onClick={() => patch({ skippedAt: undefined })}
            className="mt-3 inline-flex h-9 items-center rounded-[10px] border border-[#D9D5E3] bg-white px-3.5 text-[13px] font-semibold text-[#3D2E6B] transition hover:bg-[#F7F5FB]"
          >
            Undo
          </button>
        </div>
      </section>
    );
  }

  // ---------- Signed ----------
  if (signed) {
    return (
      <section className="text-[#2C2B4B]">
        {header}
        <FinalReviewBody
          rx={rx}
          country={country}
          clientName={clientName}
          providerName={providerName}
          locked
        />
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-[#E4E1EC] bg-white px-4 py-3">
          <p className="mr-auto text-[12.5px] text-[#5A4A8A]">
            Signed and issued {new Date(rx.finalisedAt!).toLocaleString()}
            {rx.finalisedBy ? ` by ${rx.finalisedBy}` : ""}.
          </p>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#D9D5E3] bg-white px-3.5 text-[13px] font-semibold text-[#3D2E6B] hover:bg-[#F7F5FB]"
          >
            <Printer className="h-4 w-4" /> Print
          </button>
          <button
            type="button"
            onClick={() =>
              patch({
                finalisedAt: undefined,
                finalisedBy: undefined,
                legalAcknowledgedAt: undefined,
              })
            }
            className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#D9D5E3] bg-white px-3.5 text-[13px] font-semibold text-[#3D2E6B] hover:bg-[#F7F5FB]"
          >
            <Lock className="h-4 w-4" /> Unlock
          </button>
        </div>
      </section>
    );
  }

  // ---------- Empty / incomplete ----------
  if (total === 0 && !reviewMed) {
    return (
      <section className="text-[#2C2B4B]">
        {header}
        {error && <ErrorNote text={error} />}
        {busy ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-[#E4E1EC] bg-white px-4 py-4">
            <Loader2 className="h-4 w-4 animate-spin text-[#6E4FD3]" />
            <p className="text-[13px] text-[#3D2E6B]">
              Preparing options from the recorded clinical information…
            </p>
          </div>
        ) : blankMed ? (
          <div className="rounded-xl border border-[#E4E1EC] bg-white px-4 py-4">
            <h3 className="text-[13.5px] font-semibold text-[#2C2B4B]">
              Medication details incomplete
            </h3>
            <p className="mt-1 text-[12.5px] leading-relaxed text-[#5A4A8A]">
              No medication has been selected yet, so this does not count as a medication or a
              prepared draft.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setReviewMedId(blankMed.id)}
                className="inline-flex h-9 items-center rounded-[10px] bg-[#6E4FD3] px-4 text-[13px] font-semibold text-white transition hover:bg-[#5A3EB8]"
              >
                Continue adding details
              </button>
              <button
                type="button"
                onClick={() => removeMed(blankMed.id)}
                className="inline-flex h-9 items-center rounded-[10px] border border-[#D9D5E3] bg-white px-3.5 text-[13px] font-semibold text-[#3D2E6B] transition hover:bg-[#F7F5FB]"
              >
                Discard
              </button>
            </div>
          </div>
        ) : suggestions.length > 0 && showSuggestions ? (
          suggestionsPanel
        ) : suggestions.length > 0 ? (
          <div className="rounded-xl border border-[#E4E1EC] bg-white px-5 py-8 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#F5F2FB]">
              <img src={rxIcon.url} alt="" aria-hidden="true" className="h-5 w-5 opacity-50" />
            </div>
            <h3 className="text-[14px] font-semibold text-[#2C2B4B]">AI suggestions ready</h3>
            <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-relaxed text-[#5A4A8A]">
              AI-generated medication options are available for your review. You can preview them,
              add a medication yourself, or record that no prescription is needed.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setShowSuggestions(true)}
                className="inline-flex h-9 items-center rounded-[10px] bg-[#6E4FD3] px-4 text-[13px] font-semibold text-white transition hover:bg-[#5A3EB8]"
              >
                Show AI suggestions
              </button>
              <button
                type="button"
                onClick={addMed}
                className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#D9D5E3] bg-white px-3.5 text-[13px] font-semibold text-[#3D2E6B] transition hover:bg-[#F7F5FB]"
              >
                <Plus className="h-4 w-4" /> Add medication manually
              </button>
              <button
                type="button"
                onClick={() => patch({ skippedAt: Date.now() })}
                className="inline-flex h-9 items-center rounded-[10px] border border-[#D9D5E3] bg-white px-3.5 text-[13px] font-semibold text-[#3D2E6B] transition hover:bg-[#F7F5FB]"
              >
                No prescription needed
              </button>
            </div>
            <p className="mx-auto mt-3 max-w-md text-[11.5px] leading-relaxed text-[#7E6BAF]">
              <Info className="inline h-3.5 w-3.5 align-text-bottom" aria-hidden="true" /> AI
              suggestions are generated from the visit notes and assessments. They are not
              prescriptions — the clinician must review, verify, and explicitly choose to add any
              option to the draft.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-[#E4E1EC] bg-white px-5 py-8 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#F5F2FB]">
              <img src={rxIcon.url} alt="" aria-hidden="true" className="h-5 w-5 opacity-50" />
            </div>
            <h3 className="text-[14px] font-semibold text-[#2C2B4B]">No prescription prepared</h3>
            <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-relaxed text-[#5A4A8A]">
              You can ask for AI suggestions to consider, add a medication yourself, or record that
              no prescription is needed. Nothing is prescribed until you review and verify it.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => void generate({ mode: "suggest" })}
                className="inline-flex h-9 items-center rounded-[10px] bg-[#6E4FD3] px-4 text-[13px] font-semibold text-white transition hover:bg-[#5A3EB8]"
              >
                See AI suggestion
              </button>
              <button
                type="button"
                onClick={addMed}
                className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#D9D5E3] bg-white px-3.5 text-[13px] font-semibold text-[#3D2E6B] transition hover:bg-[#F7F5FB]"
              >
                <Plus className="h-4 w-4" /> Add medication manually
              </button>
              <button
                type="button"
                onClick={() => patch({ skippedAt: Date.now() })}
                className="inline-flex h-9 items-center rounded-[10px] border border-[#D9D5E3] bg-white px-3.5 text-[13px] font-semibold text-[#3D2E6B] transition hover:bg-[#F7F5FB]"
              >
                No prescription needed
              </button>
            </div>
            <p className="mx-auto mt-3 max-w-md text-[11.5px] leading-relaxed text-[#7E6BAF]">
              <Info className="inline h-3.5 w-3.5 align-text-bottom" aria-hidden="true" /> AI
              suggestions are generated from the visit notes and assessments. They are not
              prescriptions — the clinician must review, verify, and explicitly choose to add any
              option to the draft.
            </p>
          </div>
        )}
      </section>
    );
  }

  // ---------- Final review ----------
  if (finalReview) {
    return (
      <section className="text-[#2C2B4B]">
        {header}
        <button
          type="button"
          onClick={() => setFinalReview(false)}
          className="mb-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#5A4A8A] hover:text-[#3D2E6B]"
        >
          <ChevronLeft className="h-4 w-4" /> Back to medications
        </button>
        {rx.demo && <DemoNote />}
        <FinalReviewBody
          rx={rx}
          country={country}
          clientName={clientName}
          providerName={providerName}
          onDestination={(v) => patch({ destination: v })}
        />

        {unverifiedSources.length > 0 && (
          <p className="mt-3 flex items-start gap-1.5 rounded-xl border border-[#F0D9A8] bg-[#FDF8EE] px-3.5 py-2.5 text-[12.5px] leading-snug text-[#8A6A20]">
            <AlertTriangle className="mt-[2px] h-3.5 w-3.5 flex-none" />
            Official prescribing information is unavailable for{" "}
            {unverifiedSources.map((m) => m.name || "an item").join(", ")}. Open the medication
            reference and confirm through another authoritative source.
          </p>
        )}

        {controlledMeds.length > 0 && (
          <div className="mt-3 rounded-xl border border-[#E9C3C3] bg-[#FDF4F4] px-4 py-3">
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#9B4A4A]">
              <Lock className="h-3.5 w-3.5" /> Controlled substance — restricted issuing workflow
            </p>
            <label className="mt-2 flex items-start gap-2.5 text-[12.5px] leading-relaxed text-[#5C3B3B]">
              <input
                type="checkbox"
                checked={!!rx.restrictedAcknowledgedAt}
                onChange={(e) =>
                  patch({
                    restrictedAcknowledgedAt: e.target.checked ? Date.now() : undefined,
                  })
                }
                className="mt-0.5 h-4 w-4 flex-none rounded border-[#D9D5E3] text-[#6E4FD3] focus:ring-[#6E4FD3]"
              />
              I will issue this medication on the official controlled-prescription form. The
              confirmation in Lubin is a record only and is not the legal signature.
            </label>
          </div>
        )}

        <div className="mt-3 rounded-xl border border-[#E4E1EC] bg-white px-4 py-3.5">
          <label className="flex items-start gap-2.5 text-[13px] leading-relaxed text-[#2C2B4B]">
            <input
              type="checkbox"
              checked={!!rx.legalAcknowledgedAt}
              onChange={(e) =>
                patch({
                  legalAcknowledgedAt: e.target.checked ? Date.now() : undefined,
                  reviewedAt: e.target.checked ? Date.now() : undefined,
                })
              }
              className="mt-0.5 h-4 w-4 flex-none rounded border-[#D9D5E3] text-[#6E4FD3] focus:ring-[#6E4FD3]"
            />
            <span>
              <span className="font-semibold">Required acknowledgement</span> — I am the prescribing
              clinician, I am authorised to prescribe in {JURISDICTION_LABEL[country]}, and I take
              clinical responsibility for every medication and direction in this prescription.
            </span>
          </label>
        </div>

        <StickyBar>
          <span className="mr-auto text-[12.5px] font-medium text-[#5A4A8A]">{countLabel}</span>
          <button
            type="button"
            onClick={saveDraft}
            className="inline-flex h-9 items-center rounded-[10px] border border-[#D9D5E3] bg-white px-3.5 text-[13px] font-semibold text-[#3D2E6B] hover:bg-[#F7F5FB]"
          >
            Save draft
          </button>
          <button
            type="button"
            disabled={!canSign}
            onClick={() => patch({ finalisedAt: Date.now(), finalisedBy: providerName })}
            className="inline-flex h-9 items-center rounded-[10px] bg-[#6E4FD3] px-4 text-[13px] font-semibold text-white transition hover:bg-[#5A3EB8] disabled:cursor-not-allowed disabled:opacity-45"
          >
            Sign and issue prescription
          </button>
        </StickyBar>
        <ReferenceDrawerHost />
      </section>
    );
  }

  // ---------- Single medication review ----------
  if (reviewMed) {
    const complete = medComplete(reviewMed);
    const blockers = verificationBlockers({
      med: reviewMed,
      info: rx.patientInfo,
      visitMedications: visitMeds,
      fieldsComplete: !!complete,
      acknowledged: !!reviewMed.acknowledgedAt,
      sharedSafetyPending: !!sharedSafety && !reviewMed.sharedSafetyAcknowledgedAt,
    });
    const blocked = blockers.length > 0;
    const reviews = blockers.filter((b) => b.kind === "review" || b.kind === "stale").length;
    const requiredLeft = blockers.length - reviews;
    const readiness = reviewMed.approved
      ? 100
      : Math.round((1 - Math.min(blockers.length, 6) / 6) * 100);
    return (
      <section className="text-[#2C2B4B]">
        {header}
        <div className="overflow-hidden rounded-2xl border border-[#E7E2F5] bg-white shadow-sm shadow-[#6E4FD3]/5">
          <div className="flex flex-wrap items-center gap-3 border-b border-[#F1EDFA] px-5 py-3.5 md:px-7">
            <button
              type="button"
              onClick={() => setReviewMedId(null)}
              className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#6E4FD3] hover:text-[#5A3EB8]"
            >
              <ChevronLeft className="h-4 w-4" /> All medications
            </button>
            {reviewMed.demo && (
              <span className="ml-auto text-[11.5px] italic text-[#8C86A0]">
                Demo data — sample clinical content for demonstration
              </span>
            )}
            <button
              type="button"
              onClick={() => setSafetyOpen(true)}
              title={`Patient safety review — ${requiredLeft} required item${requiredLeft === 1 ? "" : "s"}`}
              aria-label={`Patient safety review — ${requiredLeft} required item${requiredLeft === 1 ? "" : "s"}`}
              className={`relative inline-flex h-9 items-center gap-1.5 rounded-[10px] border px-3 text-[12.5px] font-semibold transition ${
                reviewMed.demo ? "" : "ml-auto"
              } ${
                requiredLeft > 0 || reviews > 0
                  ? "border-[#F0D9A8] bg-[#FDFAF3] text-[#8A6A20] hover:bg-[#FBF4E6]"
                  : "border-[#CFE9DD] bg-[#F6FBF8] text-[#1F7A57] hover:bg-[#EDF7F2]"
              }`}
            >
              <ShieldUser className="h-4 w-4" />
              Patient safety
              {requiredLeft > 0 && (
                <span className="ml-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#E0A32B] px-1 text-[11px] font-bold text-white">
                  {requiredLeft}
                </span>
              )}
            </button>
          </div>
          <MedicationEditor
            med={reviewMed}
            country={country}
            patientInfo={rx.patientInfo}
            visitMeds={visitMeds}
            onChange={(p) => updateMed(reviewMed.id, p)}
            onPatientInfo={setPatientInfo}
            onRunReview={() => runReview(reviewMed.id)}
            onMarkCheckReviewed={(k) => markCheckReviewed(reviewMed.id, k)}
            blockers={blockers}
            onOpenReference={() => setRefMedId(reviewMed.id)}
            sharedSafety={sharedSafety}
            clientName={clientName}
            safetyOpen={safetyOpen}
            onSafetyOpenChange={setSafetyOpen}
          />
        </div>
        <StickyBar tone="dark">
          <div className="mr-auto flex flex-wrap items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold text-white">
                {blocked && !reviewMed.approved
                  ? `${requiredLeft} required item${requiredLeft === 1 ? "" : "s"}`
                  : countLabel}
              </span>
              {blocked && !reviewMed.approved && (
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#A9A2C4]">
                  {reviews} review{reviews === 1 ? "" : "s"} remaining
                </span>
              )}
            </div>
            <span className="hidden h-8 w-px bg-white/15 sm:block" />
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-[#9C7DF0] transition-all"
                  style={{ width: `${readiness}%` }}
                />
              </div>
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#A9A2C4]">
                {readiness}% ready
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={saveDraft}
            className="inline-flex h-10 items-center rounded-xl border border-white/20 px-4 text-[12.5px] font-semibold text-[#D9D4EC] transition hover:bg-white/10 hover:text-white"
          >
            Save draft
          </button>
          <button
            type="button"
            disabled={blocked || reviewMed.approved}
            title={blocked ? blockerSentence(blockers) : undefined}
            onClick={() => {
              updateMed(reviewMed.id, {
                approved: true,
                verifiedAt: Date.now(),
              });
              setReviewMedId(null);
            }}
            className="inline-flex h-10 items-center rounded-xl bg-[#6E4FD3] px-5 text-[13px] font-semibold text-white shadow-lg shadow-[#6E4FD3]/30 transition hover:bg-[#7C5FE0] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
          >
            {reviewMed.approved ? "Verified" : "Verify medication"}
          </button>
        </StickyBar>
        <ReferenceDrawerHost />
      </section>
    );
  }

  // ---------- Medication summary list ----------
  return (
    <section className="text-[#2C2B4B]">
      {header}
      {rx.demo && <DemoNote />}
      {notice && (
        <p className="mb-3 flex items-start gap-1.5 rounded-xl border border-[#E4E1EC] bg-[#FAF9FD] px-3.5 py-2.5 text-[12.5px] leading-snug text-[#5A4A8A]">
          <Info className="mt-[2px] h-3.5 w-3.5 flex-none text-[#6E4FD3]" />
          {notice}
        </p>
      )}
      {error && <ErrorNote text={error} />}

      {suggestions.length > 0 && showSuggestions && suggestionsPanel}

      <ul className="space-y-2.5">
        {rx.medications.map((m) => (
          <MedicationSummaryCard
            key={m.id}
            med={m}
            onReview={() => setReviewMedId(m.id)}
            onOpenReference={() => setRefMedId(m.id)}
            onRemove={() => removeMed(m.id)}
          />
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={addMed}
          className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#D9D5E3] bg-white px-3.5 text-[13px] font-semibold text-[#3D2E6B] transition hover:bg-[#F7F5FB]"
        >
          <Plus className="h-4 w-4" /> Add medication
        </button>
        {suggestions.length === 0 && (
          <button
            type="button"
            onClick={() => void generate({ mode: "suggest" })}
            className="inline-flex h-9 items-center rounded-[10px] border border-[#D9D5E3] bg-white px-3.5 text-[13px] font-semibold text-[#3D2E6B] transition hover:bg-[#F7F5FB]"
          >
            See AI suggestion
          </button>
        )}
        {suggestions.length > 0 && !showSuggestions && (
          <button
            type="button"
            onClick={() => setShowSuggestions(true)}
            className="inline-flex h-9 items-center rounded-[10px] border border-[#D9D5E3] bg-white px-3.5 text-[13px] font-semibold text-[#3D2E6B] transition hover:bg-[#F7F5FB]"
          >
            Show AI suggestions
          </button>
        )}
        <button
          type="button"
          onClick={discardDraft}
          className="inline-flex h-9 items-center rounded-[10px] px-3 text-[13px] font-semibold text-[#5A4A8A] transition hover:bg-[#F7F5FB] hover:text-[#3D2E6B]"
        >
          Discard draft
        </button>
      </div>

      <StickyBar>
        <span className="mr-auto text-[12.5px] font-medium text-[#5A4A8A]">
          {countLabel}
          {savedAt ? " · Draft saved" : ""}
        </span>
        {!allVerified && (
          <button
            type="button"
            onClick={saveDraft}
            className="inline-flex h-9 items-center rounded-[10px] border border-[#D9D5E3] bg-white px-3.5 text-[13px] font-semibold text-[#3D2E6B] hover:bg-[#F7F5FB]"
          >
            Save draft
          </button>
        )}
        {allVerified ? (
          <button
            type="button"
            onClick={() => setFinalReview(true)}
            className="inline-flex h-9 items-center rounded-[10px] bg-[#6E4FD3] px-4 text-[13px] font-semibold text-white transition hover:bg-[#5A3EB8]"
          >
            Review complete prescription
          </button>
        ) : null}
      </StickyBar>
      <ReferenceDrawerHost />
    </section>
  );

  function ReferenceDrawerHost() {
    return (
      <MedicationReferenceDrawer
        open={!!refMed}
        onClose={() => setRefMedId(null)}
        med={refMed}
        country={country}
        appointmentId={appointmentId}
        clientName={clientName}
        patientInfo={rx.patientInfo}
        sharedSafety={sharedSafety}
        onCached={(reference) => refMed && cacheReference(refMed.id, reference)}
        onExternallyVerified={() => refMed && markExternallyVerified(refMed.id)}
      />
    );
  }
}

/* ------------------------------ pieces ------------------------------ */

/** First sentence only — the entry card shows one line, the full text lives in review. */
function oneLine(text: string) {
  const first = text.split(/(?<=\.)\s+/)[0]?.trim() ?? text.trim();
  return first.length > 180 ? `${first.slice(0, 177).trimEnd()}…` : first;
}

function StageBar({ stage, draftReady }: { stage: Stage; draftReady?: boolean }) {
  return (
    <ol className="flex flex-wrap items-center gap-0.5 rounded-full bg-[#F4F1FC] p-1">
      {STAGES.map((label, i) => {
        const active = i === stage;
        // "Draft" is only complete once the draft actually contains a medication.
        const done = i < stage && (i !== 0 || !!draftReady);
        return (
          <li key={label} className="flex items-center">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11.5px] font-semibold transition ${
                active
                  ? "bg-[#6E4FD3] text-white shadow-sm shadow-[#6E4FD3]/25"
                  : done
                    ? "text-[#5A3EB8]"
                    : "text-[#9A93B1]"
              }`}
            >
              {done && <Check className="h-3 w-3" />}
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function StickyBar({
  children,
  tone = "light",
}: {
  children: React.ReactNode;
  tone?: "light" | "dark";
}) {
  return (
    <div
      className={`sticky bottom-0 z-10 mt-4 flex flex-wrap items-center gap-3 rounded-2xl px-5 py-4 backdrop-blur ${
        tone === "dark"
          ? "border border-[#2C2B4B] bg-[#2C2B4B]/95 shadow-lg shadow-[#2C2B4B]/20"
          : "border border-[#E4E1EC] bg-white/95"
      }`}
    >
      {children}
    </div>
  );
}

function DemoNote() {
  return (
    <p className="mb-3 flex items-start gap-1.5 rounded-xl border border-[#E4E1EC] bg-[#FAF9FD] px-3.5 py-2.5 text-[12px] font-medium leading-snug text-[#5A4A8A]">
      <Info className="mt-[2px] h-3.5 w-3.5 flex-none text-[#6E4FD3]" />
      {DEMO_BANNER}
    </p>
  );
}

function ErrorNote({ text }: { text: string }) {
  return (
    <p className="mb-3 rounded-xl border border-[#E9C3C3] bg-[#FDF4F4] px-3.5 py-2.5 text-[12.5px] text-[#9B4A4A]">
      {text}
    </p>
  );
}

function MedicationSummaryCard({
  med,
  onReview,
  onOpenReference,
  onRemove,
}: {
  med: PrescriptionMedication;
  onReview: () => void;
  onOpenReference: () => void;
  onRemove: () => void;
}) {
  const hasName = med.name.trim().length > 0;
  const summary = safetySummary(med);
  const line = [med.route, med.frequency, med.duration].filter((v) => v && v.trim()).join(" · ");
  if (!hasName) {
    return (
      <li className="rounded-xl border border-[#E4E1EC] bg-white px-4 py-3.5">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-[#2C2B4B]">
              Medication details incomplete
            </p>
            <p className="mt-0.5 text-[12.5px] text-[#5A4A8A]">
              Select a medication to add it to this prescription.
            </p>
          </div>
          <div className="flex flex-none items-center gap-2">
            <button
              type="button"
              onClick={onReview}
              className="inline-flex h-9 items-center rounded-[10px] border border-[#D9D5E3] bg-white px-3.5 text-[13px] font-semibold text-[#3D2E6B] transition hover:bg-[#F7F5FB]"
            >
              Continue adding details
            </button>
            <button
              type="button"
              onClick={onRemove}
              aria-label="Discard incomplete medication"
              className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] text-[#7E7794] transition hover:bg-[#F7F5FB] hover:text-[#3D2E6B]"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </li>
    );
  }
  return (
    <li className="rounded-xl border border-[#E4E1EC] bg-white px-4 py-3.5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-[#2C2B4B]">
            {med.name}
            {med.strength || med.dose ? (
              <span className="font-normal text-[#3D2E6B]"> {med.strength || med.dose}</span>
            ) : null}
          </p>
          {line && <p className="mt-0.5 text-[12.5px] text-[#5A4A8A]">{line}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[11.5px] text-[#6F6889]">
              {med.origin === "manual" ? "Added by clinician" : "AI-prepared"}
            </span>
            <span className="text-[#CFC9DC]">·</span>
            {med.approved ? (
              <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#1F7A57]">
                <Check className="h-3.5 w-3.5" /> Verified
              </span>
            ) : (
              <span className="text-[11.5px] font-semibold text-[#8A6A20]">
                Verification required
              </span>
            )}
            {med.demo && (
              <>
                <span className="text-[#CFC9DC]">·</span>
                <span className="text-[11.5px] font-semibold text-[#6E4FD3]">Demo data</span>
              </>
            )}
          </div>
          <p className="mt-1.5 text-[11.5px] text-[#6F6889]">{summary.text}</p>
          {med.origin !== "manual" && (med.basis?.whyIncluded || med.rationale) && (
            <p className="mt-2 border-t border-[#EFECF6] pt-2 text-[11.5px] leading-relaxed text-[#5A4A8A]">
              <span className="font-semibold text-[#3D2E6B]">Drafted because: </span>
              {oneLine(med.basis?.whyIncluded || med.rationale || "")}
            </p>
          )}
        </div>
        <div className="flex flex-none flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onReview}
            className="inline-flex h-9 items-center rounded-[10px] bg-[#6E4FD3] px-4 text-[13px] font-semibold text-white transition hover:bg-[#5A3EB8]"
          >
            {med.approved ? "Open medication" : "Review medication"}
          </button>
          <ReferenceButton hasName={hasName} onClick={onOpenReference} />
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove medication"
            className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] text-[#7E7794] transition hover:bg-[#F7F5FB] hover:text-[#3D2E6B]"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </li>
  );
}

function ReferenceButton({ hasName, onClick }: { hasName: boolean; onClick: () => void }) {
  if (!hasName) {
    return (
      <span className="text-[12px] text-[#7E7794]">
        Add a medication name to open its reference
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center rounded-[10px] border border-[#D9D5E3] bg-white px-3.5 text-[13px] font-semibold text-[#3D2E6B] transition hover:bg-[#F7F5FB]"
    >
      Medication information
    </button>
  );
}

function SafetyReviewDrawer({
  onClose,
  clientName,
  countLabel,
  tab,
  onTab,
  children,
  footer,
}: {
  onClose: () => void;
  clientName?: string;
  countLabel: string;
  tab: "safety" | "profile";
  onTab: (t: "safety" | "profile") => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <button
        type="button"
        aria-label="Close safety review"
        onClick={onClose}
        className="absolute inset-0 bg-[#2C2B4B]/40"
      />
      <aside
        role="dialog"
        aria-label="Patient information and safety"
        className="relative flex h-full w-full flex-col bg-white shadow-2xl md:max-w-[540px]"
      >
        <header className="flex items-start gap-3 border-b border-[#ECE7F6] bg-[#FAF7FE] px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-[#3D2E6B]">
              {clientName || "Client"}
            </h2>
            <p className="text-[12.5px] text-[#5A4A8A]">Patient information &amp; safety</p>
            <p className="mt-0.5 text-[12px] font-semibold text-[#6F6889]">{countLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-[10px] p-1.5 text-[#7E6BAF] hover:bg-white"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex gap-1 border-b border-[#ECE7F6] px-5" role="tablist">
          {(
            [
              { id: "safety", label: "Safety review" },
              { id: "profile", label: "Medical profile" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => onTab(t.id)}
              className={`-mb-px border-b-2 px-2 py-2.5 text-[12.5px] font-semibold transition ${
                tab === t.id
                  ? "border-[#6E4FD3] text-[#3D2E6B]"
                  : "border-transparent text-[#8C86A0] hover:text-[#5A4A8A]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-auto px-5 py-4">{children}</div>
        <div className="flex flex-wrap items-center gap-3 border-t border-[#ECE7F6] bg-[#FBFAFE] px-5 py-3.5">
          {footer}
        </div>
      </aside>
    </div>
  );
}

function MedicationEditor({
  med,
  country,
  patientInfo,
  visitMeds,
  onChange,
  onPatientInfo,
  onRunReview,
  onMarkCheckReviewed,
  blockers,
  onOpenReference,
  sharedSafety,
  clientName,
  safetyOpen,
  onSafetyOpenChange,
}: {
  med: PrescriptionMedication;
  country: RxCountry;
  patientInfo?: PatientSafetyInfo;
  visitMeds?: MedicationEntry[];
  onChange: (p: Partial<PrescriptionMedication>) => void;
  onPatientInfo: (p: Partial<PatientSafetyInfo>) => void;
  onRunReview: () => void;
  onMarkCheckReviewed: (key: CheckKey) => void;
  blockers: Blocker[];
  onOpenReference: () => void;
  sharedSafety?: SharedSafetyResponse | null;
  clientName?: string;
  /** The patient information & safety drawer is controlled by the parent so the
   *  shield icon in the prescription header can open the same panel. */
  safetyOpen: boolean;
  onSafetyOpenChange: (open: boolean) => void;
}) {
  const [legalOpen, setLegalOpen] = useState(false);
  const [openInfoKey, setOpenInfoKey] = useState<InfoKey | null>(null);
  const [openCheckKey, setOpenCheckKey] = useState<CheckKey | null>(null);
  const [drawerTab, setDrawerTab] = useState<"safety" | "profile">("safety");
  const [whyOpen, setWhyOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [medOpen, setMedOpen] = useState(true);
  const hasName = med.name.trim().length > 0;
  const complete = useMemo(() => medComplete(med), [med]);
  const infoList = useMemo(
    () => infoItems(med, patientInfo, visitMeds),
    [med, patientInfo, visitMeds],
  );
  const outstanding = useMemo(() => infoList.filter((i) => !i.recorded), [infoList]);
  const requiredOutstanding = outstanding.filter((i) => i.requirement === "required");
  const reviewOutstanding = outstanding.filter((i) => i.requirement !== "required");
  /** Medication-specific checks the clinician has already acknowledged. */
  const reviewedCheckKeys = CHECK_ROWS.map((r) => r.key).filter(
    (k) => !!med.checkReviews?.[k] && !!med.checks?.[k],
  );
  const summary = safetySummary(med);
  const reviewRan = summary.ran;
  /** Medication or patient information changed after the last review ran. */
  const staleReview = reviewStale(med, patientInfo);
  const status = safetyStatus(med, patientInfo);
  const unreviewedKeys = useMemo(() => unreviewedCheckKeys(med), [med]);
  /** Header, safety summary and the sticky footer all count the same blockers. */
  const reviewsRemaining = blockers.filter((b) => b.kind === "review" || b.kind === "stale").length;
  const requiredCount = blockers.length - reviewsRemaining;
  /** One shared count for the summary card, the drawer and the sticky footer. */
  const safetyResolved = requiredCount === 0 && reviewsRemaining === 0;
  const countText = `${requiredCount} required · ${reviewsRemaining} to review`;
  const outstandingNames = requiredOutstanding
    .map((i) => infoLabel(i.key))
    .join(" and ")
    .trim();
  /** One accordion row for a patient-information item inside the drawer. */
  const infoAccordionRow = (key: InfoKey, level: "required" | "review") => {
    const open = openInfoKey === key;
    return (
      <li key={key} className={open ? "bg-[#FBFAFE]" : "transition hover:bg-[#FBFAFE]"}>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => {
            setOpenCheckKey(null);
            setOpenInfoKey(open ? null : key);
          }}
          className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left"
        >
          <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-[#2C2B4B]">
            {infoLabel(key)}
          </span>
          <StatusChip level={level} />
          <span className="inline-flex w-[92px] items-center justify-end gap-1 text-[11.5px] font-bold uppercase tracking-tight text-[#6E4FD3]">
            {open ? "Close" : "Add"}
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </span>
        </button>
        {open && (
          <div className="px-4 pb-3">
            <p className="text-[12px] leading-relaxed text-[#5A4A8A]">{infoRelevance(med, key)}</p>
            <PatientInfoForm
              keys={[key]}
              info={patientInfo}
              onChange={onPatientInfo}
              onSave={() => setOpenInfoKey(null)}
              relevanceFor={(k) => infoRelevance(med, k)}
            />
          </div>
        )}
      </li>
    );
  };
  /** Everything that must be settled before the final review becomes active. */
  const prerequisitesLeft =
    blockers.filter(
      (b) =>
        b.kind === "fields" || b.kind === "info" || b.kind === "blocking" || b.kind === "stale",
    ).length + unreviewedKeys.length;
  const finalReady = prerequisitesLeft === 0;
  const medSummary = [med.name, med.dose, med.frequency, med.quantity].filter(Boolean).join(" · ");
  const clientResponse = (sharedSafety?.response ?? "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\uFE0F/g, "")
    .trim();
  const edit = (p: Partial<PrescriptionMedication>) =>
    onChange({ ...p, approved: false, verifiedAt: undefined, acknowledgedAt: undefined });
  const catalogue = findCatalogue(med.name);
  const selectMedication = (name: string) => {
    const entry = findCatalogue(name);
    edit({
      name,
      genericName: entry?.genericName,
      strength: entry && med.strength && entry.forms.includes(med.strength) ? med.strength : "",
      route: entry?.routes.length === 1 ? entry.routes[0] : (med.route ?? ""),
      requiresLabs: entry?.requiresLabs ?? med.requiresLabs,
      requiresPregnancyStatus: entry?.requiresPregnancyStatus ?? med.requiresPregnancyStatus,
      controlled: entry?.controlled ?? med.controlled,
      // A new medication invalidates the previous reference and safety review.
      reference: undefined,
      checks: undefined,
      safetyReviewedAt: undefined,
    });
  };

  return (
    <div className="mx-auto max-w-[960px] space-y-10 px-5 py-7 md:px-8">
      {/* 1 — Medication details */}
      <section>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <SectionHeading>Medication details</SectionHeading>
          <button
            type="button"
            onClick={() => setMedOpen((v) => !v)}
            aria-expanded={medOpen}
            className="ml-auto inline-flex items-center gap-1 text-[11.5px] font-bold uppercase tracking-tight text-[#6E4FD3] transition hover:text-[#5A3EB8]"
          >
            {medOpen ? "Collapse" : "Edit"}
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${medOpen ? "rotate-180" : ""}`}
            />
          </button>
        </div>
        {!medOpen && (
          <p className="mt-2 text-[13px] font-semibold text-[#2C2B4B]">
            {medSummary || "No medication details recorded yet"}
          </p>
        )}
        {medOpen && (
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-6">
            <div className="md:col-span-6">
              <MedicationSelector
                value={med.name}
                genericName={med.genericName}
                onSelect={selectMedication}
              />
            </div>
            <div className="md:col-span-3">
              {catalogue ? (
                <SelectField
                  label="Strength and formulation"
                  value={med.strength ?? ""}
                  options={catalogue.forms}
                  onChange={(v) => edit({ strength: v })}
                />
              ) : (
                <Field
                  label="Strength and formulation"
                  value={med.strength ?? ""}
                  onChange={(v) => edit({ strength: v })}
                  placeholder="Strength and formulation as dispensed"
                />
              )}
            </div>
            <div className="md:col-span-3">
              <Field label="Dose" value={med.dose} onChange={(v) => edit({ dose: v })} required />
            </div>
            <div className="md:col-span-2">
              {catalogue ? (
                <SelectField
                  label="Route"
                  value={med.route ?? ""}
                  options={catalogue.routes}
                  onChange={(v) => edit({ route: v })}
                />
              ) : (
                <Field
                  label="Route"
                  value={med.route ?? ""}
                  onChange={(v) => edit({ route: v })}
                  placeholder="Route of administration"
                />
              )}
            </div>
            <div className="md:col-span-2">
              <Field
                label="Frequency"
                value={med.frequency}
                onChange={(v) => edit({ frequency: v })}
                required
                placeholder="How often it is taken"
              />
            </div>
            <div className="md:col-span-2">
              <Field
                label="Duration"
                value={med.duration ?? ""}
                onChange={(v) => edit({ duration: v })}
                placeholder="How long to continue"
              />
            </div>
            <div className="md:col-span-3">
              <Field
                label="Quantity"
                value={med.quantity ?? ""}
                onChange={(v) => edit({ quantity: v })}
                placeholder="Total amount to dispense"
              />
            </div>
            <div className="md:col-span-3">
              <Field
                label="Refills"
                value={med.refills ?? ""}
                onChange={(v) => edit({ refills: v })}
                placeholder="Number of refills, or none"
              />
            </div>
            <div className="md:col-span-6">
              <Field
                label="Indication"
                value={med.indication ?? ""}
                onChange={(v) => edit({ indication: v })}
                placeholder="Why this is being prescribed"
              />
            </div>
            <div className="md:col-span-6">
              <FieldArea
                label="Patient instructions"
                value={med.instructions}
                onChange={(v) => edit({ instructions: v })}
                required
                placeholder="How to take it, when, what to do if a dose is missed"
              />
            </div>
          </div>
        )}
      </section>

      {/* 2 — Patient safety review — compact summary only; details live in the drawer */}
      <section>
        <SectionHeading>Patient safety review</SectionHeading>
        {!hasName ? (
          <p className="mt-2 text-[12.5px] leading-relaxed text-[#5A4A8A]">
            Choose a medication above to see the patient information and safety items this
            prescription needs.
          </p>
        ) : (
          <>
            <div
              className={`mt-3 rounded-2xl border px-5 py-4 ${
                safetyResolved ? "border-[#CFE9DD] bg-[#F6FBF8]" : "border-[#F0D9A8] bg-[#FDFAF3]"
              }`}
            >
              <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-[#2C2B4B]">Patient safety review</p>
                  <p
                    className={`mt-0.5 text-[12.5px] font-semibold ${
                      safetyResolved ? "text-[#1F7A57]" : "text-[#8A6A20]"
                    }`}
                  >
                    {safetyResolved ? (
                      <span className="inline-flex items-center gap-1">
                        Ready for verification <Check className="h-3.5 w-3.5" />
                      </span>
                    ) : (
                      countText
                    )}
                  </p>
                  <p className="mt-1.5 max-w-xl text-[12.5px] leading-relaxed text-[#5A4A8A]">
                    {safetyResolved
                      ? "Required information and safety acknowledgements are complete."
                      : "Complete the required patient information and review the flagged safety items before verification."}
                  </p>
                  {!safetyResolved && outstandingNames && (
                    <p className="mt-1 text-[12px] leading-relaxed text-[#6F6889]">
                      {outstandingNames} still needed before this medication can be verified.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onSafetyOpenChange(true)}
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[#6E4FD3] px-4 text-[13px] font-semibold text-white transition hover:bg-[#7C5FE0]"
                >
                  {safetyResolved ? "View details" : "Review patient information"}
                  <span aria-hidden="true">&rarr;</span>
                </button>
              </div>
            </div>

            {/* Supporting links — plain, clearly secondary */}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] font-semibold text-[#6E4FD3]">
              <button
                type="button"
                onClick={() => setWhyOpen((v) => !v)}
                className="hover:text-[#5A3EB8]"
              >
                Why this option was shown
              </button>
              <button type="button" onClick={onOpenReference} className="hover:text-[#5A3EB8]">
                Medication information
              </button>
              {reviewRan && (
                <span className={`ml-auto font-normal ${TONE_TEXT[status.tone]}`}>
                  {summary.text}
                </span>
              )}
            </div>

            {whyOpen && (
              <div className="mt-3 rounded-xl bg-[#FAF9FD] px-4 py-3">
                <p className="text-[12.5px] leading-relaxed text-[#3D2E6B]">
                  This option was generated from the information documented for this visit. Review
                  the supporting information, alternatives, and patient-specific risks before
                  deciding whether it is appropriate.
                </p>
                <p className="mt-2 text-[12.5px] leading-relaxed text-[#3D2E6B]">
                  {med.basis?.whyIncluded ??
                    med.rationale ??
                    (med.origin === "manual"
                      ? "Added by the prescribing clinician."
                      : "No supporting explanation was recorded for this option.")}
                </p>
                {med.basis?.clinicalInformationUsed && (
                  <p className="mt-2 text-[12px] leading-relaxed text-[#5A4A8A]">
                    {med.basis.clinicalInformationUsed}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* Patient information & safety drawer — the only place the checklist lives */}
      {safetyOpen && hasName && (
        <SafetyReviewDrawer
          onClose={() => onSafetyOpenChange(false)}
          clientName={clientName}
          countLabel={countText}
          tab={drawerTab}
          onTab={setDrawerTab}
          footer={
            <>
              <span className="mr-auto text-[12px] font-semibold text-[#5A4A8A]">
                {safetyResolved
                  ? "Nothing outstanding"
                  : `${requiredCount} required · ${reviewsRemaining} review${
                      reviewsRemaining === 1 ? "" : "s"
                    } remaining`}
              </span>
              <button
                type="button"
                onClick={() => onSafetyOpenChange(false)}
                className="inline-flex h-9 items-center rounded-[10px] bg-[#6E4FD3] px-4 text-[13px] font-semibold text-white transition hover:bg-[#7C5FE0]"
              >
                Save and close
              </button>
            </>
          }
        >
          {drawerTab === "safety" ? (
            <div className="space-y-5">
              {(!reviewRan || staleReview) && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-[#FBFAFE] px-4 py-2.5">
                  <p className="text-[12px] text-[#5A4A8A]">
                    {!reviewRan
                      ? "The patient-specific safety review has not run yet."
                      : "Safety information changed since the last review."}
                  </p>
                  <button
                    type="button"
                    onClick={onRunReview}
                    className="ml-auto text-[11.5px] font-bold uppercase tracking-tight text-[#6E4FD3] transition hover:text-[#5A3EB8]"
                  >
                    {reviewRan ? "Run review again" : "Run safety review"}
                  </button>
                </div>
              )}

              {requiredOutstanding.length > 0 && (
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#8A6A20]">
                    Required
                  </p>
                  <ul className="mt-2 divide-y divide-[#EFECF7] border-y border-[#EFECF7]">
                    {requiredOutstanding.map(({ key }) => infoAccordionRow(key, "required"))}
                  </ul>
                </div>
              )}

              {(reviewOutstanding.length > 0 ||
                unreviewedKeys.length > 0 ||
                (sharedSafety && !med.sharedSafetyAcknowledgedAt)) && (
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#6F6889]">
                    To review
                  </p>
                  <ul className="mt-2 divide-y divide-[#EFECF7] border-y border-[#EFECF7]">
                    {reviewOutstanding.map(({ key }) => infoAccordionRow(key, "review"))}
                    {unreviewedKeys.map((k) => {
                      const open = openCheckKey === k;
                      return (
                        <li key={k} className={open ? "bg-[#FBFAFE]" : "hover:bg-[#FBFAFE]"}>
                          <button
                            type="button"
                            aria-expanded={open}
                            onClick={() => {
                              setOpenInfoKey(null);
                              setOpenCheckKey(open ? null : k);
                            }}
                            className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left"
                          >
                            <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-[#2C2B4B]">
                              {CHECK_ROWS.find((r) => r.key === k)?.label ?? k}
                            </span>
                            <StatusChip level="review" />
                            <span className="inline-flex w-[92px] items-center justify-end gap-1 text-[11.5px] font-bold uppercase tracking-tight text-[#6E4FD3]">
                              {open ? "Close" : "Review"}
                              <ChevronDown
                                className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
                              />
                            </span>
                          </button>
                          {open && (
                            <ul className="px-4 pb-3">
                              <CheckRow
                                label={CHECK_ROWS.find((r) => r.key === k)?.label ?? k}
                                check={med.checks?.[k]}
                                reviewedAt={med.checkReviews?.[k]}
                                onMarkReviewed={() => {
                                  onMarkCheckReviewed(k);
                                  setOpenCheckKey(null);
                                }}
                              />
                            </ul>
                          )}
                        </li>
                      );
                    })}
                    {sharedSafety && !med.sharedSafetyAcknowledgedAt && (
                      <li>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                          <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-[#2C2B4B]">
                            Shared {sharedSafety.clinicalName} safety response
                          </span>
                          <StatusChip level="review" />
                          <span className="inline-flex w-[132px] justify-end text-[11.5px] font-medium text-[#8C86A0]">
                            Review in final step
                          </span>
                        </div>
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {reviewedCheckKeys.length > 0 && (
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#1F7A57]">
                    Completed
                  </p>
                  <ul className="mt-2 divide-y divide-[#EFECF7] border-y border-[#EFECF7]">
                    <li>
                      <button
                        type="button"
                        aria-expanded={showCompleted}
                        onClick={() => setShowCompleted((v) => !v)}
                        className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left"
                      >
                        <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-[#2C2B4B]">
                          Completed medication-specific checks · {reviewedCheckKeys.length}
                        </span>
                        <StatusChip level="complete" />
                        <span className="inline-flex w-[92px] items-center justify-end gap-1 text-[11.5px] font-bold uppercase tracking-tight text-[#6E4FD3]">
                          {showCompleted ? "Hide" : "View"}
                          <ChevronDown
                            className={`h-3.5 w-3.5 transition-transform ${showCompleted ? "rotate-180" : ""}`}
                          />
                        </span>
                      </button>
                      {showCompleted && (
                        <ul className="space-y-3 px-4 pb-3">
                          {reviewedCheckKeys.map((k) => (
                            <CheckRow
                              key={k}
                              label={CHECK_ROWS.find((r) => r.key === k)?.label ?? k}
                              check={med.checks?.[k]}
                              reviewedAt={med.checkReviews?.[k]}
                              onMarkReviewed={() => onMarkCheckReviewed(k)}
                            />
                          ))}
                        </ul>
                      )}
                    </li>
                  </ul>
                </div>
              )}

              {med.warnings && (
                <p className="border-t border-[#EDEBF3] pt-3 text-[12px] leading-relaxed text-[#5A4A8A]">
                  {med.warnings}
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-[12px] leading-relaxed text-[#5A4A8A]">
                Reusable patient information. Editing here updates it everywhere it is used.
              </p>
              <ul className="mt-3 divide-y divide-[#EFECF7] border-y border-[#EFECF7]">
                {infoList.map(({ key, recorded }) => {
                  const open = openInfoKey === key;
                  const value = infoRecordedSummary(key, patientInfo, visitMeds);
                  return (
                    <li key={key} className={open ? "bg-[#FBFAFE]" : ""}>
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() => {
                          setOpenCheckKey(null);
                          setOpenInfoKey(open ? null : key);
                        }}
                        className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold text-[#2C2B4B]">
                            {infoLabel(key)}
                          </span>
                          <span
                            className={`block truncate text-[11.5px] ${
                              recorded ? "text-[#5A4A8A]" : "text-[#9A93AE]"
                            }`}
                          >
                            {recorded ? value : "Not documented"}
                          </span>
                          {recorded && patientInfo?.updatedAt && (
                            <span className="block text-[11px] text-[#8C86A0]">
                              Updated {formatCheckedAt(patientInfo.updatedAt)}
                            </span>
                          )}
                        </span>
                        <span className="inline-flex w-[92px] items-center justify-end gap-1 text-[11.5px] font-bold uppercase tracking-tight text-[#6E4FD3]">
                          {open ? "Close" : recorded ? "Edit" : "Add"}
                          <ChevronDown
                            className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
                          />
                        </span>
                      </button>
                      {open && (
                        <div className="px-4 pb-3">
                          <PatientInfoForm
                            keys={[key]}
                            info={patientInfo}
                            onChange={onPatientInfo}
                            onSave={() => setOpenInfoKey(null)}
                            relevanceFor={(k) => infoRelevance(med, k)}
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </SafetyReviewDrawer>
      )}

      {/* 3 — Final review */}
      <section className={finalReady ? "" : "opacity-55"}>
        <SectionHeading>Final review</SectionHeading>
        {!finalReady ? (
          <p className="mt-2 text-[12.5px] leading-relaxed text-[#5A4A8A]">
            Final review becomes available once the required patient information and safety items
            above are complete.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {sharedSafety && (
              <div className="rounded-xl border border-[#F0D9A8] bg-[#FDF8EE] px-4 py-3">
                <p className="text-[12px] font-semibold text-[#8A6A20]">
                  Shared assessment safety response — review required
                </p>
                <p className="mt-1 text-[11.5px] text-[#8A6A20]">
                  {sharedSafety.assessmentName} ({sharedSafety.clinicalName}) ·{" "}
                  {new Date(sharedSafety.takenAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#3D2E6B]">
                  {sharedSafety.itemText}
                </p>
                <p className="mt-1 text-[13px] font-semibold text-[#3D2E6B]">
                  Client response: “{clientResponse}”
                </p>
                <label className="mt-2.5 flex items-start gap-2.5 text-[12.5px] leading-relaxed text-[#2C2B4B]">
                  <input
                    type="checkbox"
                    checked={!!med.sharedSafetyAcknowledgedAt}
                    onChange={(e) =>
                      onChange({
                        sharedSafetyAcknowledgedAt: e.target.checked ? Date.now() : undefined,
                      })
                    }
                    className="mt-0.5 h-4 w-4 flex-none rounded border-[#D9D5E3] text-[#6E4FD3] focus:ring-[#6E4FD3]"
                  />
                  <span>
                    Review and acknowledge — I reviewed this shared safety-related response and took
                    it into account for this medication.
                  </span>
                </label>
              </div>
            )}

            <div className="rounded-xl bg-[#FBFAFE] px-4 py-3.5">
              <label className="flex items-start gap-2.5 text-[13px] leading-relaxed text-[#2C2B4B]">
                <input
                  type="checkbox"
                  checked={!!med.acknowledgedAt}
                  onChange={(e) =>
                    onChange({ acknowledgedAt: e.target.checked ? Date.now() : undefined })
                  }
                  className="mt-0.5 h-4 w-4 flex-none rounded border-[#D9D5E3] text-[#6E4FD3] focus:ring-[#6E4FD3] disabled:opacity-40"
                />
                <span className="font-semibold">
                  I confirm that I reviewed this medication and its patient-specific safety
                  information.
                </span>
              </label>
              <button
                type="button"
                onClick={() => setLegalOpen((v) => !v)}
                className="mt-1.5 pl-7 text-[12px] font-semibold text-[#6E4FD3] hover:text-[#5A3EB8]"
              >
                What am I confirming?
              </button>
              {legalOpen && (
                <p className="mt-1.5 pl-7 text-[12px] leading-relaxed text-[#5A4A8A]">
                  {MED_VERIFICATION_STATEMENT} Any change to this medication resets the
                  verification.
                </p>
              )}
              {med.approved && med.verifiedAt && (
                <p className="mt-1.5 pl-7 text-[12px] font-semibold text-[#1F7A57]">
                  Verified {formatCheckedAt(med.verifiedAt)}
                </p>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/** One status per checklist row. Amber only for items needing attention. */
function StatusChip({ level }: { level: "required" | "review" | "complete" | "unavailable" }) {
  const map = {
    required: { label: "Required", cls: "bg-[#FDF3E0] text-[#8A6A20]" },
    review: { label: "Review", cls: "bg-[#F4F1FB] text-[#5A4A8A]" },
    complete: { label: "Complete", cls: "bg-[#EDF7F2] text-[#1F7A57]" },
    unavailable: { label: "Not available", cls: "bg-[#F4F3F7] text-[#6F6889]" },
  } as const;
  const s = map[level];
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.cls}`}
    >
      {s.label}
    </span>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[#6F6889]">
      {children}
    </h3>
  );
}

/** One searchable medication selector — the single place a medication is chosen. */
function MedicationSelector({
  value,
  genericName,
  onSelect,
}: {
  value: string;
  genericName?: string;
  onSelect: (name: string) => void;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const results = useMemo(() => searchCatalogue(query), [query]);
  const selected = findCatalogue(value);
  return (
    <div className="relative">
      <label
        className="mb-1 block text-[12px] font-medium text-[#5A4A8A]"
        htmlFor="rx-medication-name"
      >
        Medication <span className="text-[#9B4A4A]">*</span>
      </label>
      <input
        id="rx-medication-name"
        value={query}
        autoComplete="off"
        placeholder="Search a medication by brand or generic name"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          onSelect(e.target.value);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        className="w-full rounded-lg border border-[#DEDAE8] bg-white px-3 py-2 text-[13px] text-[#2C2B4B] placeholder:text-[#9C96AF] focus:border-[#6E4FD3] focus:outline-none focus:ring-2 focus:ring-[#6E4FD3]/20"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-[#DEDAE8] bg-white shadow-lg">
          {results.map((r) => (
            <li key={r.name}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQuery(r.name);
                  onSelect(r.name);
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-[12.5px] text-[#2C2B4B] hover:bg-[#F7F5FB]"
              >
                <span className="font-semibold">{r.name}</span>{" "}
                <span className="text-[#6F6889]">
                  {r.genericName}
                  {r.medicationClass ? ` · ${r.medicationClass}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-[11.5px] text-[#6F6889]">
        {selected
          ? `${selected.genericName}${selected.medicationClass ? ` · ${selected.medicationClass}` : ""} — strengths, routes, reference and safety requirements updated.`
          : genericName
            ? genericName
            : "Selecting a medication updates the available strengths, routes, reference and safety-review requirements."}
      </p>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-[#5A4A8A]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-[#DEDAE8] bg-white px-3 py-2 text-[13px] text-[#2C2B4B] focus:border-[#6E4FD3] focus:outline-none focus:ring-2 focus:ring-[#6E4FD3]/20"
      >
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

const TONE_TEXT = {
  neutral: "text-[#6F6889]",
  amber: "text-[#8A6A20]",
  green: "text-[#1F7A57]",
  red: "text-[#9B4A4A]",
} as const;

function requiredKeys(med: PrescriptionMedication): InfoKey[] {
  return requiredInfoKeys(med);
}

function CheckRow({
  label,
  check,
  reviewedAt,
  onMarkReviewed,
}: {
  label: string;
  check?: MedicationCheck;
  reviewedAt?: number;
  onMarkReviewed?: () => void;
}) {
  const state = checkState(check);
  const tone = CHECK_STATE_TONE[state];
  const needsAck = state === "review-needed" || state === "blocking";
  return (
    <li className="text-[12.5px] leading-snug">
      <p className="flex flex-wrap items-center gap-x-1.5">
        <span className="font-semibold text-[#2C2B4B]">{label}</span>
        <span className="text-[#CFC9DC]">—</span>
        <span className={`font-semibold ${TONE_TEXT[tone]}`}>{CHECK_STATE_LABEL[state]}</span>
        {needsAck && reviewedAt && (
          <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#1F7A57]">
            <Check className="h-3.5 w-3.5" /> Reviewed
          </span>
        )}
      </p>
      {check?.detail && <p className="mt-0.5 text-[#3D2E6B]">{check.detail}</p>}
      {(check?.informationUsed || check?.checkedAt) && (
        <p className="mt-0.5 text-[11.5px] text-[#6F6889]">
          {check?.informationUsed}
          {check?.checkedAt
            ? `${check.informationUsed ? " " : ""}Last checked ${formatCheckedAt(check.checkedAt)}.`
            : ""}
        </p>
      )}
      {needsAck && onMarkReviewed && (
        <div className="mt-1.5 rounded-[10px] border border-[#EDEBF3] bg-[#FCFBFE] px-2.5 py-2">
          <p className="text-[11.5px] leading-snug text-[#5A4A8A]">
            By marking this as reviewed you confirm that you read this finding
            {check?.detail ? ` — “${check.detail}” — ` : " "}
            and have taken it into account for this patient.
          </p>
          <button
            type="button"
            onClick={onMarkReviewed}
            className={`mt-1.5 inline-flex h-7 items-center rounded-[8px] px-2.5 text-[11.5px] font-semibold transition ${
              reviewedAt
                ? "border border-[#D9D5E3] bg-white text-[#3D2E6B] hover:bg-[#F7F5FB]"
                : "bg-[#6E4FD3] text-white hover:bg-[#5A3EB8]"
            }`}
          >
            {reviewedAt ? "Undo review" : "Mark as reviewed"}
          </button>
          {reviewedAt && (
            <p className="mt-1 text-[11px] text-[#6F6889]">
              Reviewed {formatCheckedAt(reviewedAt)}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

function FinalReviewBody({
  rx,
  country,
  clientName,
  providerName,
  locked,
  onDestination,
}: {
  rx: Prescription;
  country: RxCountry;
  clientName?: string;
  providerName?: string;
  locked?: boolean;
  onDestination?: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-[#E4E1EC] bg-white p-4">
        <h3 className="text-[13.5px] font-semibold text-[#2C2B4B]">Complete prescription</h3>
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-2">
          <Row label="Patient" value={clientName || "—"} />
          <Row label="Prescriber" value={providerName || "—"} />
          <Row label="Jurisdiction" value={JURISDICTION_LABEL[country]} />
          <Row
            label="Safety review"
            value={(() => {
              const named = rx.medications.filter((m) => m.name.trim().length > 0);
              if (named.length === 0) return "No medication added";
              const word = named.length === 1 ? "medication" : "medications";
              return `${named.filter((m) => m.approved).length} of ${named.length} ${word} verified`;
            })()}
          />
        </dl>
      </section>

      <section className="rounded-xl border border-[#E4E1EC] bg-white p-4">
        <h3 className="text-[13.5px] font-semibold text-[#2C2B4B]">Medications and directions</h3>
        <ul className="mt-3 space-y-3">
          {rx.medications.map((m) => (
            <li key={m.id} className="border-t border-[#EDEBF3] pt-3 first:border-t-0 first:pt-0">
              <p className="text-[13.5px] font-semibold text-[#2C2B4B]">
                {m.name || "Medication draft"} {m.strength || m.dose}
              </p>
              <p className="mt-0.5 text-[12.5px] text-[#3D2E6B]">
                {[m.route, m.frequency, m.duration].filter((v) => v && v.trim()).join(" · ")}
              </p>
              <p className="mt-0.5 text-[12.5px] text-[#5A4A8A]">
                Quantity: {m.quantity || "—"} · Refills: {m.refills || "—"}
              </p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[#3D2E6B]">
                {m.instructions || "No patient instructions recorded."}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-[#E4E1EC] bg-white p-4">
        <h3 className="text-[13.5px] font-semibold text-[#2C2B4B]">
          Pharmacy or delivery destination
        </h3>
        {locked ? (
          <p className="mt-1.5 text-[12.5px] text-[#3D2E6B]">
            {rx.destination || "Given to the patient."}
          </p>
        ) : (
          <input
            value={rx.destination ?? ""}
            onChange={(e) => onDestination?.(e.target.value)}
            placeholder="Pharmacy name and branch, or give to the patient"
            className="mt-2 w-full rounded-lg border border-[#DEDAE8] bg-white px-3 py-2 text-[13px] text-[#2C2B4B] placeholder:text-[#9C96AF] focus:border-[#6E4FD3] focus:outline-none focus:ring-2 focus:ring-[#6E4FD3]/20"
          />
        )}
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="min-w-[92px] text-[#6F6889]">{label}</dt>
      <dd className="font-medium text-[#2C2B4B]">{value}</dd>
    </div>
  );
}

function clinicalInfoUsed(ws: ReturnType<typeof loadWorkspace>): string {
  const parts: string[] = [];
  if (ws.notes.presenting) parts.push("presenting concerns");
  if (ws.notes.observations) parts.push("session observations");
  if (ws.notes.plan) parts.push("clinician plan");
  if (ws.medications?.length) parts.push("current medication list");
  return parts.length
    ? `Recorded for this visit: ${parts.join(", ")}.`
    : "No structured clinical information was recorded for this visit.";
}

function missingClinicalInfo(ws: ReturnType<typeof loadWorkspace>): string[] {
  const missing: string[] = [];
  if (!ws.notes.presenting) missing.push("Presenting concerns");
  if (!ws.notes.observations) missing.push("Session observations");
  if (!ws.notes.plan) missing.push("Clinician plan");
  if (!ws.medications?.length) missing.push("Current medications");
  return missing;
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-[12px] font-medium text-[#5A4A8A]">
        {label}
        {required && <span className="ml-0.5 text-[#B4534F]">*</span>}
      </label>
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-[#DEDAE8] bg-white px-3 py-2 text-[13px] text-[#2C2B4B] placeholder:text-[#9C96AF] focus:border-[#6E4FD3] focus:outline-none focus:ring-2 focus:ring-[#6E4FD3]/20"
      />
    </div>
  );
}

function FieldArea({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-[12px] font-medium text-[#5A4A8A]">
        {label}
        {required && <span className="ml-0.5 text-[#B4534F]">*</span>}
      </label>
      <textarea
        value={value}
        rows={4}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full resize-y rounded-lg border border-[#DEDAE8] bg-white px-3 py-2 text-[13px] leading-relaxed text-[#2C2B4B] placeholder:text-[#9C96AF] focus:border-[#6E4FD3] focus:outline-none focus:ring-2 focus:ring-[#6E4FD3]/20"
      />
    </div>
  );
}
