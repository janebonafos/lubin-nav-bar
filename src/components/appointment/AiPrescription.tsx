import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  ShieldCheck,
  Eye,
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
  infoRelevance,
  missingInfoKeys,
  INFO_REQUIREMENT_LABEL,
  blockerSentence,
  checkState,
  checkHeadline,
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
import {
  requiredSigningBlockers,
  SAFETY_CLASS_LABEL,
  checkSafetyClass,
  patientAge,
} from "@/lib/prescription/safety";
import { sharedSourceMap, type SharedSourceItem } from "@/lib/prescription/intakeImport";
import { findPharmacy, pharmacyLine } from "@/lib/prescription/pharmacies";
import {
  prescriptionStatus,
  prescriptionStatusLabel,
  RX_STATUS_HINT,
  deliveryComplete,
} from "@/lib/prescription/status";
import {
  loadIdentity,
  saveIdentity,
  subscribeIdentity,
  credentialSummary,
  missingIdentityFields,
  IDENTITY_FIELDS,
  type PrescriberIdentity,
} from "@/lib/prescription/credentials";
import { appendRxAudit, loadRxAudit, RX_AUDIT_LABEL } from "@/lib/prescription/audit";
import {
  saveSignedPrescription,
  latestSignedPrescription,
  updateSignedPrescription,
  voidSignedPrescription,
} from "@/lib/prescription/documents";
import { DeliveryStep } from "./DeliveryStep";
import { ControlledSigning, controlledSigningReady } from "./ControlledSigning";
import { SigningDialog } from "./SigningDialog";
import { Link } from "@tanstack/react-router";
import {
  useVerifiedPrescribing,
  prescribingGate,
  applyVerifiedRecord,
  localProviderProfile,
  VERIFICATION_STATUS_LABEL,
  type PrescribingGate,
} from "@/lib/prescription/useVerifiedPrescribing";
import {
  prescribingAuthority,
  type SigningMethod,

} from "@/lib/prescription/signing";
import { MedicationReferenceDrawer } from "./MedicationReferenceDrawer";
import {
  formatValidityDate,
  prescriptionValidity,
} from "@/lib/prescription/legal";
import { MED_VERIFICATION_STATEMENT } from "@/lib/prescription/reference";
import { loadApplication } from "@/lib/prescription/verificationApplication";
import { REVIEW_BANNER, fallbackPrescription } from "@/lib/prescription/demo";
import { PatientInfoForm } from "./PatientInfoForm";
import { findCatalogue, searchCatalogue } from "@/lib/prescription/catalogue";
import { sharedSafetyResponse, type SharedSafetyResponse } from "@/lib/prescription/sharedSafety";
import { toast } from "sonner";

const JURISDICTION_LABEL: Record<RxCountry, string> = {
  US: "United States",
  PH: "Philippines",
};


export const RX_ATTESTATION_STATEMENT =
  "I have reviewed this prescription and the relevant patient information. I confirm that it is clinically appropriate and authorize it under my verified prescribing credentials.";

function medComplete(m: PrescriptionMedication) {
  return m.name.trim() && m.dose.trim() && m.frequency.trim() && m.instructions.trim();
}

export function AiPrescription({
  appointmentId,
  clientName,
  providerName,
  jurisdiction,
  clinicalDocumentationReady = true,
  encounterBlock = null,
  onAddClinicalInfo,
}: {
  appointmentId: string;
  clientName?: string;
  providerName?: string;
  appointmentLabel?: string;
  /** Locked from the client's jurisdiction and the provider's authority. */
  jurisdiction?: RxCountry;
  /** True once Step 1 holds clinical documentation supporting a medication
   *  decision. Prescribing stays closed until then. */
  clinicalDocumentationReady?: boolean;
  /** Set when the recorded appointment outcome (no-show, cancelled,
   *  rescheduled) means this is no longer an active prescribing encounter. */
  encounterBlock?: { title: string; reason: string } | null;
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
  const [localIdentity, setLocalIdentity] = useState<PrescriberIdentity>(() =>
    loadIdentity(providerName),
  );
  const [signingOpen, setSigningOpen] = useState(false);
  const [editIdentity, setEditIdentity] = useState(false);
  const [auditTick, setAuditTick] = useState(0);

  useEffect(() => {
    setLocalIdentity(loadIdentity(providerName));
    return subscribeIdentity(() => setLocalIdentity(loadIdentity(providerName)));
  }, [providerName]);

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

  // Prescribing authority and every regulated credential number come from
  // Lubin's verification record on the backend — never typed in here, and
  // never shown on client-facing surfaces.
  const profile = localProviderProfile();
  const verification = useVerifiedPrescribing(providerName, profile.profession);
  const record = verification.data ?? null;
  const { identity, locked: lockedIdentityKeys } = useMemo(
    () => applyVerifiedRecord(localIdentity, record),
    [localIdentity, record],
  );
  const setIdentity = (next: PrescriberIdentity) => setLocalIdentity(saveIdentity(next));
  const gate = prescribingGate({ record, country, profession: profile.profession });

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
  const medWord = total === 1 ? "medication" : "medications";
  const countLabel =
    total === 0
      ? "No medication added"
      : `${verifiedCount} of ${total} ${medWord} clinically reviewed`;
  const hasAiDraft = namedMeds.some((m) => m.origin !== "manual");
  const draftSourceLabel =
    hasAiDraft
      ? "Includes an AI-assisted medication option. Clinical review required."
      : total > 0
        ? "Clinician-added medication."
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
        loadFallback(
          res.ok
            ? "Not enough clinical information was recorded for a live draft. A review draft has been prepared for verification."
            : "The drafting service is unavailable right now. A review draft has been prepared for verification.",
          mode,
        );
        return;
      }
      if (meds.length === 0) {
        setError(data.error ?? "Could not prepare a draft. Please try again.");
        return;
      }
      if (mode === "suggest") {
        if (meds.length === 1) {
          // One option only: open it straight in the clinical review workspace.
          // It is still unverified — the provider decides and verifies there.
          openAsDraft(meds[0]!, [], data.country ?? country);
        } else {
          patch({
            suggestions: meds,
            suggestedAt: Date.now(),
            country: data.country ?? country,
            skippedAt: undefined,
          });
          setShowSuggestions(true);
        }
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
      loadFallback(
        "The drafting service could not be reached. A review draft has been prepared for verification.",
        mode,
      );
    } finally {
      setBusy(false);
    }
  };

  const loadFallback = (message?: string, mode: "draft" | "suggest" = "draft") => {
    const fallback = fallbackPrescription(appointmentId);
    if (mode === "suggest") {
      const list = fallback.suggestions ?? [];
      setNotice(message ?? null);
      if (list.length === 1) {
        openAsDraft(list[0]!, [], country);
        return;
      }
      patch({
        suggestions: list,
        suggestedAt: fallback.suggestedAt,
        demo: true,
        skippedAt: undefined,
      });
      setShowSuggestions(true);
      return;
    }
    patch({ ...fallback, skippedAt: undefined });
    setNotice(message ?? null);
  };

  const suggestions = rx.suggestions ?? [];

  /** Move one option into the draft and open it for review. It is still
   *  unverified: the provider must complete the clinical review to issue it. */
  function openAsDraft(
    s: PrescriptionMedication,
    remaining: PrescriptionMedication[],
    nextCountry?: RxCountry,
  ) {
    const med: PrescriptionMedication = {
      ...s,
      id: genRxId(),
      origin: "ai-option",
      approved: false,
      verifiedAt: undefined,
      acknowledgedAt: undefined,
    };
    const named = rx.medications.filter((m) => m.name.trim());
    patch({
      medications: [...named, med],
      suggestions: remaining,
      suggestedAt: remaining.length ? Date.now() : undefined,
      ...(nextCountry ? { country: nextCountry } : {}),
      skippedAt: undefined,
      reviewedAt: undefined,
      legalAcknowledgedAt: undefined,
      finalisedAt: undefined,
      finalisedBy: undefined,
    });
    setShowSuggestions(false);
    setReviewMedId(med.id);
    setFinalReview(false);
  }

  const acceptSuggestion = (id: string) => {
    const s = suggestions.find((m) => m.id === id);
    if (!s) return;
    openAsDraft(
      s,
      suggestions.filter((m) => m.id !== id),
    );
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
                  Suggestion · not verified
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
    const meds = rx.medications.map((m) => {
      if (m.id !== id) return m;
      const verified = "approved" in p && p.approved;
      return { ...m, ...p, ...(verified ? { demo: false } : {}) };
    });
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
      toast.info("Finish this medication first", {
        description:
          "Add the medication name and required details, then you can add another to the same prescription.",
      });
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
    const at = Date.now();
    setSavedAt(at);
    toast.success("Draft saved", {
      description: `Prescription draft saved ${formatCheckedAt(at)}. You can leave and come back to it.`,
    });
  };

  const visitMeds: MedicationEntry[] = loadWorkspace(appointmentId).medications ?? [];

  /** Shared assessment safety response, carried into the clinical review. */
  const sharedSafety = useMemo(() => sharedSafetyResponse(appointmentId), [appointmentId]);

  /** Open the patient-facing copy in a new tab so it reads as a document. */
  const openClientCopy = (draft = true) => {
    const params = new URLSearchParams({ appointment: appointmentId, country });
    if (clientName) params.set("client", clientName);
    const name = identity.fullName || providerName;
    if (name) params.set("provider", name);
    if (draft) params.set("draft", "true");
    window.open(`/e-prescription?${params.toString()}`, "_blank", "noopener,noreferrer");
  };

  const identityMissing = missingIdentityFields(identity, country);
  const controlledReady = controlledSigningReady(rx, country, identity);

  /** Only medication-specific required items block a signature. */
  const signingBlocked = rx.medications.some((m) => {
    if (!m.name.trim()) return false;
    return (
      requiredSigningBlockers(
        verificationBlockers({
          med: m,
          info: rx.patientInfo,
          visitMedications: visitMeds,
          fieldsComplete: !!medComplete(m),
          acknowledged: !!m.acknowledgedAt,
          sharedSafetyPending: !!sharedSafety && !m.sharedSafetyAcknowledgedAt,
        }),
      ).length > 0
    );
  });

  /** Everything except the final authorisation tick. */
  const readyToSign =
    allVerified &&
    !signingBlocked &&
    unverifiedSources.length === 0 &&
    identityMissing.length === 0 &&
    controlledReady;

  /** Jurisdiction, authority and medication class decide what signing needs. */
  const authority = prescribingAuthority({ rx, country, identity, patientName: clientName });
  const canSign = readyToSign && authority.authorised;
  const isEpcsSigning = authority.method === "epcs-two-factor";

  /** Required review states, re-validated on the server before a code is issued. */
  const reviewSnapshot = useMemo(() => {
    const meds = rx.medications.filter((m) => m.name.trim().length > 0);
    const perMed = meds.map((m) => {
      const required = requiredSigningBlockers(
        verificationBlockers({
          med: m,
          info: rx.patientInfo,
          visitMedications: visitMeds,
          fieldsComplete: !!medComplete(m),
          acknowledged: !!m.acknowledgedAt,
          sharedSafetyPending: !!sharedSafety && !m.sharedSafetyAcknowledgedAt,
        }),
      );
      return {
        med: m,
        infoOutstanding: required.some((b) => b.kind === "info"),
        entry: {
          id: m.id,
          name: m.name,
          fieldsComplete: !!medComplete(m),
          safetyChecksComplete: !required.some(
            (b) => b.kind === "review" || b.kind === "stale" || b.kind === "blocking",
          ),
          highRiskAcknowledged: !(!!sharedSafety && !m.sharedSafetyAcknowledgedAt),
          clinicianConfirmed: !!m.acknowledgedAt,
        },
      };
    });
    return {
      appointmentId,
      patientInfoComplete: perMed.every((p) => !p.infoOutstanding),
      identityComplete: identityMissing.length === 0,
      controlledReady,
      medications: perMed.map((p) => p.entry),
    };
  }, [
    appointmentId,
    rx.medications,
    rx.patientInfo,
    visitMeds,
    sharedSafety,
    identityMissing.length,
    controlledReady,
  ]);

  /** Final clinical authorisation tick, required before the signing action. */
  const [finalAuthorised, setFinalAuthorised] = useState(false);

  const signatureMethodLabel = isEpcsSigning
    ? "EPCS two-factor signing"
    : "Verified with a one-time code sent to the prescriber's registered email";

  const audit = (
    action: Parameters<typeof appendRxAudit>[0]["action"],
    extra?: { destination?: string; detail?: string; authenticationMethod?: string },
  ) =>
    appendRxAudit({
      appointmentId,
      action,
      providerName: identity.fullName || providerName || "Prescriber",
      credentials: credentialSummary(identity, country),
      jurisdiction: JURISDICTION_LABEL[country],
      patient: clientName || "Patient",
      version: rx.version ?? 1,
      authenticationMethod: extra?.authenticationMethod ?? signatureMethodLabel,
      destination: extra?.destination,
      detail: extra?.detail,
    });

  const signPrescription = (auth: {
    method: SigningMethod;
    methodLabel: string;
    hash: string;
  }) => {
    const at = Date.now();
    const version = (rx.version ?? 0) + 1;
    const controlled = controlledMeds.length > 0;
    const validity = prescriptionValidity({ country, controlled, issuedAt: at });
    const doc = saveSignedPrescription({
      appointmentId,
      patientName: clientName || "Patient",
      patientAgeYears: patientAge(rx.patientInfo) ?? undefined,
      patientSex: rx.patientInfo?.sex,
      country,
      version,
      signedAt: at,
      signedBy: identity.fullName || providerName || "Prescriber",
      authenticationMethod: auth.methodLabel,
      identity,
      medications: namedMeds,
      controlled,
      validUntil: validity.validUntil,
      validityLabel: validity.label,
      patientInfo: rx.patientInfo,
      clinicalNotes: rx.clinicalNotes,
      signedHash: auth.hash,
      signature: {
        method: auth.method,
        methodLabel: auth.methodLabel,
        documentHash: auth.hash,
        version,
        at,
        by: identity.fullName || providerName || "Prescriber",
        credentials: credentialSummary(identity, country),
        jurisdiction: country,
      },
    });
    patch({
      finalisedAt: at,
      finalisedBy: identity.fullName || providerName,
      legalAcknowledgedAt: at,
      recordAttestedAt: at,
      version,
      documentId: doc.id,
      signedHash: auth.hash,
      signatureInvalidatedAt: undefined,
      signature: {
        method: auth.method,
        methodLabel: auth.methodLabel,
        documentHash: auth.hash,
        version,
        at,
        by: identity.fullName || providerName || "Prescriber",
        credentials: credentialSummary(identity, country),
        jurisdiction: country,
      },
    });
    appendRxAudit({
      appointmentId,
      action: controlled ? "controlled-signed" : "signed",
      providerName: identity.fullName || providerName || "Prescriber",
      credentials: credentialSummary(identity, country),
      jurisdiction: JURISDICTION_LABEL[country],
      patient: clientName || "Patient",
      version,
      authenticationMethod: auth.methodLabel,
      detail: `Prescription ${doc.number} signed and saved to the patient's prescription record. Document hash ${auth.hash}.`,
    });
    setFinalReview(false);
    setSigningOpen(false);
    setAuditTick((t) => t + 1);
    toast.success("Prescription signed", {
      description: "Now choose how the signed prescription reaches the patient.",
    });
  };

  const sendToPharmacy = async (pharmacyId: string) => {
    const pharmacy = findPharmacy(pharmacyId);
    const attempts = (rx.delivery?.attempts ?? 0) + 1;
    patch({
      delivery: {
        method: "pharmacy",
        state: "sending",
        pharmacyId,
        destination: pharmacy ? pharmacyLine(pharmacy) : undefined,
        attempts,
        at: Date.now(),
      },
    });
    audit("delivery-chosen", { destination: pharmacy ? pharmacyLine(pharmacy) : pharmacyId });
    await new Promise((r) => setTimeout(r, 900));
    if (!pharmacy) {
      patch({
        delivery: {
          method: "pharmacy",
          state: "failed",
          pharmacyId,
          attempts,
          at: Date.now(),
          error: "That pharmacy branch is no longer in the verified directory.",
        },
      });
      audit("send-failed", { detail: "Branch not found in the verified directory." });
      setAuditTick((t) => t + 1);
      toast.error("Send failed", { description: "Choose another verified branch." });
      return;
    }
    const at = Date.now();
    patch({
      delivery: {
        method: "pharmacy",
        state: "sent",
        pharmacyId,
        destination: pharmacyLine(pharmacy),
        attempts,
        at,
      },
    });
    if (rx.documentId)
      updateSignedPrescription(rx.documentId, {
        delivery: {
          method: "pharmacy",
          state: "sent",
          destination: pharmacyLine(pharmacy),
          at,
        },
      });
    audit("sent-to-pharmacy", { destination: pharmacyLine(pharmacy) });
    setAuditTick((t) => t + 1);
    toast.success("Sent to pharmacy", { description: pharmacyLine(pharmacy) });
  };

  const giveCopyToPatient = () => {
    const at = Date.now();
    patch({
      delivery: {
        method: "patient",
        state: "given",
        destination: `Signed copy released to ${clientName || "the patient"}`,
        at,
      },
    });
    if (rx.documentId)
      updateSignedPrescription(rx.documentId, {
        delivery: {
          method: "patient",
          state: "given",
          destination: `Signed copy released to ${clientName || "the patient"}`,
          at,
        },
      });
    audit("copy-given", { destination: clientName || "Patient" });
    setAuditTick((t) => t + 1);
    toast.success("Signed copy released", {
      description: `${clientName || "The patient"} can download it from their Lubin account.`,
    });
  };

  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");

  // Voiding never deletes the signature or the signed document: the original
  // prescription and its audit trail are preserved and marked void with a
  // reason and timestamp.
  const voidPrescription = (reason: string) => {
    const at = Date.now();
    const by = identity.fullName || providerName || undefined;
    if (rx.documentId) voidSignedPrescription(rx.documentId, { reason, by, at });
    audit("voided", { detail: `Void reason: ${reason}` });
    patch({ voided: { at, reason, by } });
    setAuditTick((t) => t + 1);
    setVoidOpen(false);
    setVoidReason("");
    toast.success("Prescription voided", {
      description: "The signed prescription is preserved in the record and marked void.",
    });
  };

  const status = prescriptionStatus(rx, { readyToSign: canSign });
  const statusLabel = prescriptionStatusLabel(rx, { readyToSign: canSign });

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
          </p>
          {draftSourceLabel && !signed && !allVerified ? (
            <p className="mt-0.5 max-w-lg text-[12px] leading-relaxed text-[#6F6889]">
              {draftSourceLabel}
            </p>
          ) : null}
          <p className="mt-0.5 max-w-lg text-[12px] leading-relaxed text-[#5A4A8A]">
            {RX_STATUS_HINT[status]}
          </p>
          <p className="mt-0.5 text-[12px] text-[#5A4A8A]">
            Jurisdiction{" "}
            <span className="font-semibold text-[#3D2E6B]">{JURISDICTION_LABEL[country]}</span> —
            set from {clientName || "the client"}&rsquo;s recorded location and your verified
            prescribing authority. Not selectable here.
          </p>
        </div>
      </div>
    </>
  );

  // ---------- No prescription needed ----------
  // Recorded first: this path stays available whatever the verification state.
  if (rx.skippedAt && total === 0) {
    return (
      <section className="text-[#2C2B4B]">
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

  // ---------- Not an active prescribing encounter ----------
  // The recorded appointment outcome (no-show, cancelled, rescheduled) closes
  // creation, signing and issuance here. A prescription already signed stays
  // visible below with its audit trail.
  if (encounterBlock && !signed) {
    return (
      <section className="text-[#2C2B4B]">
        <div className="rounded-xl border border-[#E4E1EC] bg-white px-4 py-4">
          <p className="text-[13.5px] font-semibold">{encounterBlock.title}</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[#5A4A8A]">
            {encounterBlock.reason}
          </p>
          {total > 0 && (
            <p className="mt-2 text-[12.5px] leading-relaxed text-[#8A6420]">
              An unsigned draft is kept on record for reference only. It is no longer associated
              with an active prescribing encounter and cannot be signed or issued.
            </p>
          )}
        </div>
      </section>
    );
  }

  // ---------- Prescribing not verified by Lubin ----------
  if (verification.isLoading) {
    return (
      <section className="rounded-xl border border-[#E4E1EC] bg-white px-4 py-4 text-[13px] text-[#5A4A8A]">
        Checking your prescribing verification…
      </section>
    );
  }
  if (!gate.allowed) {
    return (
      <PrescribingLocked
        gate={gate}
        country={country}
        onSkip={() => patch({ skippedAt: Date.now() })}
      />
    );
  }
  // ---------- Clinical documentation required before prescribing ----------
  if (!clinicalDocumentationReady && !signed) {
    return (
      <DocumentationRequired
        onAddClinicalInfo={onAddClinicalInfo}
        onSkip={() => patch({ skippedAt: Date.now() })}
      />
    );
  }

  // ---------- Signed ----------
  if (signed) {
    const doc = latestSignedPrescription(appointmentId);
    const signedControlled = rx.medications.some(
      (m) => m.controlled && m.name.trim().length > 0,
    );
    return (
      <section className="text-[#2C2B4B]">
        {header}
        {encounterBlock && (
          <div className="mb-3 rounded-xl border border-[#EBD3A6] bg-[#FDF8EE] px-4 py-3.5">
            <p className="text-[13px] font-semibold text-[#8A6420]">{encounterBlock.title}</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-[#6B5327]">
              {encounterBlock.reason} The signed prescription and its audit history are preserved —
              use void if it must be withdrawn.
            </p>
          </div>
        )}
        {rx.voided && (
          <div className="mb-3 rounded-xl border border-[#E9C3C3] bg-[#FDF4F4] px-4 py-3.5">
            <p className="text-[13px] font-semibold text-[#9B4A4A]">Prescription voided</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-[#5C3B3B]">
              Voided {new Date(rx.voided.at).toLocaleString()}
              {rx.voided.by ? ` by ${rx.voided.by}` : ""} · Reason: {rx.voided.reason}. The original
              signed prescription and its audit trail are preserved.
            </p>
          </div>
        )}
        <div className="mb-3 rounded-xl border border-[#DCD2F4] bg-[#F6F3FE] px-4 py-3.5">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-[#3D2E6B]">
            <ShieldCheck className="h-4 w-4 text-[#6E4FD3]" /> Signed prescription
            {doc ? ` ${doc.number}` : ""}
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[#5A4A8A]">
            Signed {new Date(rx.finalisedAt!).toLocaleString()}
            {rx.finalisedBy ? ` by ${rx.finalisedBy}` : ""} ·{" "}
            {credentialSummary(identity, country, { controlled: signedControlled })}{" "}
            · {JURISDICTION_LABEL[country]} · Version {rx.version ?? 1}. Saved as its own signed
            clinical document in {clientName || "the patient"}&rsquo;s medication and prescription
            record — it is not part of the session summary.
          </p>
          <p className="mt-1.5 text-[12.5px] font-medium text-[#3D2E6B]">
            Date issued {new Date(rx.finalisedAt!).toLocaleDateString()} ·{" "}
            {doc?.validUntil
              ? `${doc.validityLabel ?? "Valid until"} ${formatValidityDate(doc.validUntil)}`
              : "Validity rule not configured (internal)"}
          </p>
        </div>
        {!rx.voided && (
        <div className="mb-3">
          <DeliveryStep
            rx={rx}
            country={country}
            clientName={clientName}
            onSendToPharmacy={(id) => void sendToPharmacy(id)}
            onGiveToPatient={giveCopyToPatient}
          />
        </div>
        )}
        <FinalReviewBody
          rx={rx}
          country={country}
          clientName={clientName}
          providerName={identity.fullName || providerName}
          identity={identity}
          locked
          collapsed
        />
        <AuditTrail appointmentId={appointmentId} tick={auditTick} collapsed />
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-[#E4E1EC] bg-white px-4 py-3">
          <p className="mr-auto text-[12.5px] text-[#5A4A8A]">
            {statusLabel}
          </p>
          <button
            type="button"
            onClick={() => openClientCopy(false)}
            className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-[#6E4FD3] px-3.5 text-[13px] font-semibold text-white transition hover:bg-[#5A3EB8]"
          >
            <Eye className="h-4 w-4" /> View E-Prescription
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#D9D5E3] bg-white px-3.5 text-[13px] font-semibold text-[#3D2E6B] hover:bg-[#F7F5FB]"
          >
            <Printer className="h-4 w-4" /> Print
          </button>
          {!rx.voided && (
            <button
              type="button"
              onClick={() => setVoidOpen((v) => !v)}
              className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#D9D5E3] bg-white px-3.5 text-[13px] font-semibold text-[#3D2E6B] hover:bg-[#F7F5FB]"
            >
              <Lock className="h-4 w-4" /> Void prescription
            </button>
          )}
        </div>
        {voidOpen && !rx.voided && (
          <div className="mt-2 rounded-xl border border-[#E4E1EC] bg-white px-4 py-3.5">
            <p className="text-[13px] font-semibold text-[#2C2B4B]">Void this prescription</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-[#5A4A8A]">
              The signature and the signed document are kept in the patient record and in the audit
              trail. Voiding only marks the prescription as no longer valid to dispense.
            </p>
            <label className="mt-2.5 block text-[12px] font-medium text-[#5A4A8A]">
              Reason for voiding
              <input
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g. Wrong strength issued — replacement prescription to follow"
                className="mt-1 w-full rounded-lg border border-[#DEDAE8] bg-white px-3 py-2 text-[13px] text-[#2C2B4B] focus:border-[#6E4FD3] focus:outline-none focus:ring-2 focus:ring-[#6E4FD3]/20"
              />
            </label>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={voidReason.trim().length < 4}
                onClick={() => voidPrescription(voidReason.trim())}
                className="inline-flex h-9 items-center rounded-[10px] bg-[#6E4FD3] px-4 text-[13px] font-semibold text-white transition hover:bg-[#5A3EB8] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Void prescription
              </button>
              <button
                type="button"
                onClick={() => setVoidOpen(false)}
                className="inline-flex h-9 items-center rounded-[10px] border border-[#D9D5E3] bg-white px-3.5 text-[13px] font-semibold text-[#3D2E6B] hover:bg-[#F7F5FB]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
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
          <div className="rounded-xl border border-[#E4E1EC] bg-white px-4 py-4">
            <div className="flex items-start gap-3">
              <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-[#6E4FD3]" />
              <div>
                <p className="text-[13px] font-semibold text-[#2C2B4B]">
                  AI is reviewing the visit context…
                </p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-[#5A4A8A]">
                  It pulls from the recorded presenting concerns, session observations, clinician
                  plan, assessment results, medications, allergies, and profile. It then matches
                  these against standard first-line options for this jurisdiction — producing
                  suggestions, not a final prescription.
                </p>
              </div>
            </div>
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
            <div className="flex flex-wrap items-center justify-center gap-2">
              <h3 className="text-[14px] font-semibold text-[#2C2B4B]">AI suggestions ready</h3>
              <span className="inline-flex items-center rounded-full bg-[#F1ECFD] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6E4FD3]">
                AI-generated
              </span>
            </div>
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
              suggestions are generated from this visit&apos;s recorded notes and assessments. They are
              not prescriptions — the clinician must review, verify, and explicitly choose to add any
              option to the draft.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-[#E4E1EC] bg-white px-5 py-8 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#F5F2FB]">
              <img src={rxIcon.url} alt="" aria-hidden="true" className="h-5 w-5 opacity-50" />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <h3 className="text-[14px] font-semibold text-[#2C2B4B]">No prescription prepared</h3>
              <span className="inline-flex items-center rounded-full bg-[#F1ECFD] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6E4FD3]">
                AI-assisted
              </span>
            </div>
            <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-relaxed text-[#5A4A8A]">
              You can ask Lubin&apos;s AI to suggest medication options to consider, add a medication
              yourself, or record that no prescription is needed. Nothing is prescribed until you
              review and verify it.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => void generate({ mode: "suggest" })}
                className="inline-flex h-9 items-center rounded-[10px] bg-[#6E4FD3] px-4 text-[13px] font-semibold text-white transition hover:bg-[#5A3EB8]"
              >
                Generate AI suggestions
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
              suggestions are generated from this visit&apos;s recorded notes and assessments. They are
              not prescriptions — the clinician must review, verify, and explicitly choose to add any
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
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setFinalReview(false)}
            className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#5A4A8A] hover:text-[#3D2E6B]"
          >
            <ChevronLeft className="h-4 w-4" /> Back to medications
          </button>
          <span className="hidden h-4 w-px bg-[#E7E2F5] sm:block" />
          <button
            type="button"
            onClick={addMed}
            className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#3D2E6B] hover:text-[#6E4FD3]"
          >
            <Plus className="h-3.5 w-3.5" /> Add another medication
          </button>
        </div>
        {rx.demo && verifiedCount < total && <ReviewBanner />}
        <FinalReviewBody
          rx={rx}
          country={country}
          clientName={clientName}
          providerName={identity.fullName || providerName}
          identity={identity}
        />

        <div className="mt-3">
          <IdentityCard
            identity={identity}
            country={country}
            editing={editIdentity}
            onEdit={setEditIdentity}
            locked={lockedIdentityKeys}
            verifiedAt={record?.verifiedAt}
            controlled={rx.medications.some((m) => m.controlled && m.name.trim().length > 0)}
            onChange={(next) => {
              setIdentity(next);
              saveIdentity(next);
            }}
          />
        </div>

        {unverifiedSources.length > 0 && (
          <p className="mt-3 flex items-start gap-1.5 rounded-xl border border-[#F0D9A8] bg-[#FDF8EE] px-3.5 py-2.5 text-[12.5px] leading-snug text-[#8A6A20]">
            <AlertTriangle className="mt-[2px] h-3.5 w-3.5 flex-none" />
            Official prescribing information is unavailable for{" "}
            {unverifiedSources.map((m) => m.name || "an item").join(", ")}. Open the medication
            reference and confirm through another authoritative source.
          </p>
        )}

        {controlledMeds.length > 0 && (
          <div className="mt-3">
            <ControlledSigning
              rx={rx}
              country={country}
              identity={identity}
              medicationNames={controlledMeds.map((m) => m.name).filter(Boolean)}
              onChange={(next) =>
                patch({ controlledAuth: { ...(rx.controlledAuth ?? {}), ...next } })
              }
            />
          </div>
        )}

        {rx.signatureInvalidatedAt && (
          <p className="mt-3 flex items-start gap-1.5 rounded-xl border border-[#F0D9A8] bg-[#FDF8EE] px-3.5 py-2.5 text-[12.5px] leading-snug text-[#8A6A20]">
            <AlertTriangle className="mt-[2px] h-3.5 w-3.5 flex-none" />
            This prescription was edited after it was signed, so the earlier signature is void. It
            is now version {rx.version ?? 1} and needs to be signed again.
          </p>
        )}

        {readyToSign && (
          <div className="mt-3 rounded-xl border border-[#E7E2F5] bg-white px-4 py-3.5">
            <p className="text-[13px] font-semibold text-[#2C2B4B]">
              Final clinical authorization
            </p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#3D2E6B]">
              “I, Dr.{" "}
              {(identity.fullName || providerName || "").replace(/^Dr\.?\s+/i, "") ||
                "[verified prescriber name]"}
              , confirm that I have independently reviewed the patient information, medication, dose,
              directions, relevant safety checks, and prescribing information, and that this
              prescription reflects my clinical judgment for this patient.”
            </p>
            <label className="mt-2.5 flex items-start gap-2.5 text-[12.5px] font-semibold leading-relaxed text-[#2C2B4B]">
              <input
                type="checkbox"
                checked={finalAuthorised}
                onChange={(e) => setFinalAuthorised(e.target.checked)}
                className="mt-0.5 h-4 w-4 flex-none rounded border-[#D9D5E3] text-[#6E4FD3] focus:ring-[#6E4FD3]"
              />
              <span>I confirm and authorize this prescription</span>
            </label>
          </div>
        )}

        <div className="mt-3 rounded-xl border border-[#DCD2F4] bg-[#F6F3FE] px-4 py-3.5">
          <p className="text-[13px] font-semibold text-[#2C2B4B]">
            {readyToSign ? "Ready to sign" : "Not yet ready to sign"}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-[#5A4A8A]">
            {readyToSign
              ? `You will see the complete prescription, the patient, your verified credentials and the ${JURISDICTION_LABEL[country]} requirements, then re-authenticate. The signature is bound to that exact version and recorded in the audit log. Signing does not send anything.`
              : identityMissing.length > 0
                ? `Add your ${identityMissing.join(", ")} before signing.`
                : !controlledReady
                  ? "Complete the controlled-substance workflow above before signing."
                  : authority.blockers.length > 0
                    ? authority.blockers[0]!.detail
                    : "Finish the required medication checks before signing."}
          </p>
          {readyToSign && authority.blockers.length > 0 && (
            <p className="mt-2 text-[11.5px] font-semibold leading-relaxed text-[#8A6A20]">
              {authority.blockers[0]!.detail}
            </p>
          )}
        </div>

        <StickyBar>
          <span className="mr-auto text-[12.5px] font-medium text-[#5A4A8A]">
            {countLabel}
            {savedAt ? ` · Draft saved ${formatCheckedAt(savedAt)}` : ""}
          </span>
          <button
            type="button"
            onClick={saveDraft}
            className="inline-flex h-9 items-center rounded-[10px] border border-[#D9D5E3] bg-white px-3.5 text-[13px] font-semibold text-[#3D2E6B] hover:bg-[#F7F5FB]"
          >
            Save draft
          </button>
          <button
            type="button"
            onClick={() => openClientCopy()}
            className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#D9D5E3] bg-white px-3.5 text-[13px] font-semibold text-[#3D2E6B] hover:bg-[#F7F5FB]"
          >
            <Eye className="h-4 w-4" /> Preview E-Prescription
          </button>
          <button
            type="button"
            disabled={!canSign || !finalAuthorised}
            onClick={() => setSigningOpen(true)}
            className="inline-flex h-9 items-center rounded-[10px] bg-[#6E4FD3] px-4 text-[13px] font-semibold text-white transition hover:bg-[#5A3EB8] disabled:cursor-not-allowed disabled:opacity-45"
          >
            Sign prescription
          </button>
        </StickyBar>
        <ReferenceDrawerHost />
        <SigningDialog
          open={signingOpen}
          onOpenChange={setSigningOpen}
          rx={rx}
          country={country}
          identity={identity}
          clientName={clientName}
          patientAgeYears={patientAge(rx.patientInfo)}
          onIdentityChange={setIdentity}
          onSigned={signPrescription}
          reviewState={reviewSnapshot}
        />
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
    void reviews;
    /** Same "actions remaining" definition used everywhere — one source of truth. */
    const counts = actionCounts({
      blockers,
      infoOutstanding: infoItems(reviewMed, rx.patientInfo, visitMeds).filter((i) => !i.recorded)
        .length,
      safetyAckPending: !!sharedSafety && !reviewMed.sharedSafetyAcknowledgedAt,
    });
    const totalActions = counts.total;
    const countText = counts.text;
    const countBreakdown = counts.breakdown;
    /** Clinically meaningful states instead of a gamified readiness percentage. */
    const readinessLabel = blocked ? "Not ready to sign" : "Ready to sign";
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
            <span className="hidden h-4 w-px bg-[#E7E2F5] sm:block" />
            <button
              type="button"
              onClick={addMed}
              className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#3D2E6B] hover:text-[#6E4FD3]"
            >
              <Plus className="h-3.5 w-3.5" /> Add another medication
            </button>
            {reviewMed.name.trim() ? (
              <button
                type="button"
                onClick={() => setSafetyOpen(true)}
                title={`Safety review — ${totalActions} action${totalActions === 1 ? "" : "s"} remaining`}
                aria-label={`Safety review — ${totalActions} action${totalActions === 1 ? "" : "s"} remaining`}
                className={`relative ml-auto inline-flex h-9 items-center gap-1.5 rounded-[10px] border px-3 text-[12.5px] font-semibold transition ${
                  totalActions > 0
                    ? "border-[#DCD2F4] bg-[#F6F3FE] text-[#5A3EB8] hover:bg-[#EFE9FC]"
                    : "border-[#E7E2F5] bg-white text-[#5A4A8A] hover:bg-[#FAF7FE]"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                {totalActions > 0 ? (
                  <>
                    {totalActions} safety check{totalActions === 1 ? "" : "s"} to review
                  </>
                ) : (
                  <>Safety checks complete</>
                )}
              </button>
            ) : (
              <span
                title="Add a medication first — safety items depend on the medication selected."
                className="ml-auto inline-flex h-9 cursor-not-allowed items-center gap-1.5 rounded-[10px] border border-[#EDEAF4] bg-[#FAF9FD] px-3 text-[12.5px] font-semibold text-[#A29CB8]"
              >
                <ShieldCheck className="h-4 w-4" />
                Safety checks
              </span>
            )}
          </div>
          <MedicationEditor
            med={reviewMed}
            appointmentId={appointmentId}
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
            providerName={providerName}
            safetyOpen={safetyOpen}
            onSafetyOpenChange={setSafetyOpen}
          />
        </div>
        <StickyBar tone="dark">
          <div className="mr-auto flex flex-wrap items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold text-white">
                {blocked && !reviewMed.approved ? countText : countLabel}
              </span>
              {blocked && !reviewMed.approved && countBreakdown && (
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#A9A2C4]">
                  {countBreakdown}
                </span>
              )}
            </div>
            <span className="hidden h-8 w-px bg-white/15 sm:block" />
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#A9A2C4]">
              {readinessLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={saveDraft}
            className="inline-flex h-10 items-center rounded-xl border border-white/20 px-4 text-[12.5px] font-semibold text-[#D9D4EC] transition hover:bg-white/10 hover:text-white"
          >
            {savedAt ? "Draft saved" : "Save draft"}
          </button>
          <button
            type="button"
            onClick={() => openClientCopy()}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/20 px-4 text-[12.5px] font-semibold text-[#D9D4EC] transition hover:bg-white/10 hover:text-white"
          >
            <Eye className="h-3.5 w-3.5" /> Preview prescription
          </button>
          <button
            type="button"
            onClick={() => {
              if (!reviewMed.name.trim()) {
                toast.info("Add the medication name first", {
                  description:
                    "Once this medication has a name, you can save it and start another for the same prescription.",
                });
                return;
              }
              saveDraft();
              addMed();
            }}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/20 px-4 text-[12.5px] font-semibold text-[#D9D4EC] transition hover:bg-white/10 hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" /> Save and add another
          </button>
          <button
            type="button"
            disabled={blocked}
            title={blocked ? blockerSentence(blockers) : undefined}
            onClick={() => {
              // The clinical review state is still recorded — it is now captured as
              // part of signing instead of a separate confirmation step.
              if (!reviewMed.approved) {
                updateMed(reviewMed.id, { approved: true, verifiedAt: Date.now() });
              }
              const othersPending = namedMeds.some((m) => m.id !== reviewMed.id && !m.approved);
              const signingReady =
                !othersPending &&
                authority.authorised &&
                identityMissing.length === 0 &&
                controlledReady &&
                unverifiedSources.length === 0;
              if (signingReady) {
                setSigningOpen(true);
                return;
              }
              setReviewMedId(null);
              setFinalReview(true);
              toast.info(othersPending ? "One more medication to review" : "Almost ready to sign", {
                description: othersPending
                  ? "Review the remaining medication, then sign the prescription."
                  : identityMissing.length > 0
                    ? `Add your ${identityMissing.join(", ")} before signing.`
                    : !controlledReady
                      ? "Complete the controlled-substance workflow before signing."
                      : (authority.blockers[0]?.detail ??
                        "Confirm the prescribing requirements before signing."),
              });
            }}
            className="inline-flex h-10 items-center rounded-xl bg-[#6E4FD3] px-5 text-[13px] font-semibold text-white shadow-lg shadow-[#6E4FD3]/30 transition hover:bg-[#7C5FE0] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
          >
            Sign prescription
          </button>
        </StickyBar>
        <ReferenceDrawerHost />
        <SigningDialog
          open={signingOpen}
          onOpenChange={setSigningOpen}
          rx={rx}
          country={country}
          identity={identity}
          clientName={clientName}
          patientAgeYears={patientAge(rx.patientInfo)}
          onIdentityChange={setIdentity}
          onSigned={signPrescription}
          reviewState={reviewSnapshot}
        />
      </section>
    );
  }

  // ---------- Medication summary list ----------
  return (
    <section className="text-[#2C2B4B]">
      {header}
      {rx.demo && verifiedCount < total && <ReviewBanner />}
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
            Generate AI suggestions
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

function StickyBar({
  children,
  tone = "light",
}: {
  children: ReactNode;
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

function ReviewBanner() {
  return (
    <p className="mb-3 flex items-start gap-1.5 rounded-xl border border-[#E4E1EC] bg-[#FAF9FD] px-3.5 py-2.5 text-[12px] font-medium leading-snug text-[#5A4A8A]">
      <Info className="mt-[2px] h-3.5 w-3.5 flex-none text-[#6E4FD3]" />
      {REVIEW_BANNER}
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

/** Fixed, self-contained checklist of the information a prescription always
 *  needs. Static on purpose: it never depends on an external record to render. */
const STANDARD_INFO_CHECKLIST: { key: InfoKey; label: string }[] = [
  { key: "allergies", label: "Allergies" },
  { key: "currentMedications", label: "Current medications" },
  { key: "conditions", label: "Medical conditions" },
  { key: "bipolarHistory", label: "Mania / bipolar history" },
  { key: "age", label: "Date of birth" },
  { key: "pregnancy", label: "Pregnancy / breastfeeding" },
  { key: "labs", label: "Labs / organ function" },
];

/** Single source of truth for "N actions remaining" and its breakdown.

 *  Every surface (header count, drawer, sticky footer, Medical profile tab
 *  badge) reads from here so the numbers always reconcile exactly. */
function actionCounts(args: {
  blockers: Blocker[];
  /** Every incomplete patient-information row, required or recommended. */
  infoOutstanding: number;
  safetyAckPending: boolean;
}) {
  const { blockers, infoOutstanding, safetyAckPending } = args;
  const reviews = blockers.filter((b) => b.kind === "review" || b.kind === "stale").length;
  const safetyAck = safetyAckPending ? 1 : 0;
  const medReviews = Math.max(reviews - safetyAck, 0);
  const details = blockers.filter((b) => b.kind === "fields").length;
  const blocking = blockers.filter((b) => b.kind === "blocking").length;
  const confirmations = blockers.filter((b) => b.kind === "acknowledgement").length;
  const total = infoOutstanding + medReviews + safetyAck + details + blocking + confirmations;
  const breakdown = [
    infoOutstanding > 0 ? `${infoOutstanding} patient information` : null,
    medReviews > 0 ? `${medReviews} medication review${medReviews === 1 ? "" : "s"}` : null,
    safetyAck > 0 ? "1 safety acknowledgement" : null,
    blocking > 0 ? `${blocking} blocking safety issue${blocking === 1 ? "" : "s"}` : null,
    details > 0 ? "1 prescription detail" : null,
    confirmations > 0 ? "1 clinical confirmation" : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    total,
    infoOutstanding,
    breakdown,
    text: `${total} action${total === 1 ? "" : "s"} remaining`,
  };
}

function SafetyReviewDrawer({
  onClose,
  clientName,
  countLabel,
  tab,
  onTab,
  profileBadge = 0,
  children,
  footer,
}: {
  onClose: () => void;
  clientName?: string;
  countLabel: string;
  tab: "safety" | "profile";
  onTab: (t: "safety" | "profile") => void;
  profileBadge?: number;
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
        className="relative flex h-dvh max-h-dvh w-full flex-col bg-white shadow-2xl md:max-w-[540px]"
      >
        <header className="shrink-0 flex items-start gap-3 border-b border-[#ECE7F6] bg-[#FAF7FE] px-5 py-4">
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
        <div className="shrink-0 flex gap-1 border-b border-[#ECE7F6] px-5" role="tablist">
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
              <span className="inline-flex items-center gap-1.5">
                {t.label}
                {t.id === "profile" && profileBadge > 0 && (
                  <span
                    aria-label={`${profileBadge} item${profileBadge === 1 ? "" : "s"} need attention`}
                    className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#EDE6FF] px-1.5 text-[10.5px] font-bold text-[#5A3EB8]"
                  >
                    {profileBadge}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-5 py-4">{children}</div>
        <div className="shrink-0 flex flex-wrap items-center gap-3 border-t border-[#ECE7F6] bg-[#FBFAFE] px-5 py-3.5">
          {footer}
        </div>
      </aside>
    </div>
  );
}

function MedicationEditor({
  med,
  appointmentId,
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
  providerName,
  safetyOpen,
  onSafetyOpenChange,
}: {
  med: PrescriptionMedication;
  appointmentId: string;
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
  providerName?: string;
  /** The patient information & safety drawer is controlled by the parent so the
   *  shield icon in the prescription header can open the same panel. */
  safetyOpen: boolean;
  onSafetyOpenChange: (open: boolean) => void;
}) {
  const [legalOpen, setLegalOpen] = useState(false);
  const [openInfoKey, setOpenInfoKey] = useState<InfoKey | null>(null);
  const [openCheckKey, setOpenCheckKey] = useState<CheckKey | null>(null);
  /** Frozen display state for the patient-information rows. While a row is open
   *  the list renders from this snapshot, so nothing re-labels, resizes or moves
   *  while the provider is still typing. Cleared on an explicit save or close. */
  const [frozenInfo, setFrozenInfo] = useState<Record<
    string,
    { recorded: boolean; value: string }
  > | null>(null);
  /** Preserve the exact row order from the moment editing starts. Draft input
   *  must never reorder the profile; only an explicit save may refresh it. */
  const [frozenInfoOrder, setFrozenInfoOrder] = useState<InfoKey[] | null>(null);
  /** Last item the provider saved — shows an inline confirmation on that row. */
  
  const [drawerTab, setDrawerTab] = useState<"safety" | "profile">("safety");
  const [whyOpen, setWhyOpen] = useState(false);
  const [clearedOpen, setClearedOpen] = useState(false);
  const [medOpen, setMedOpen] = useState(true);
  const hasName = med.name.trim().length > 0;
  const complete = useMemo(() => medComplete(med), [med]);
  const infoList = useMemo(
    () => infoItems(med, patientInfo, visitMeds),
    [med, patientInfo, visitMeds],
  );
  /** What the client themselves shared for this appointment, per check. Used to
   *  state plainly that the answer came from the client — never pulled silently
   *  from anywhere else — and to compare it with their current health card. */
  const sharedSources = useMemo<Record<string, SharedSourceItem>>(
    () => (appointmentId ? sharedSourceMap(appointmentId) : {}),
    [appointmentId, patientInfo],
  );
  const sharedCount = Object.keys(sharedSources).length;
  const outstanding = useMemo(() => infoList.filter((i) => !i.recorded), [infoList]);
  const requiredOutstanding = outstanding.filter((i) => i.requirement === "required");
  const reviewOutstanding = outstanding.filter((i) => i.requirement !== "required");
  /** Patient information already recorded — kept visible so it stays editable. */
  const recordedInfo = useMemo(() => infoList.filter((i) => i.recorded), [infoList]);
  /** Medication-specific checks the clinician has already acknowledged. */
  const reviewedCheckKeys = CHECK_ROWS.map((r) => r.key).filter(
    (k) => !!med.checkReviews?.[k] && !!med.checks?.[k],
  );
  const summary = safetySummary(med);
  const reviewRan = summary.ran;
  const status = safetyStatus(med, patientInfo);
  const unreviewedKeys = useMemo(() => unreviewedCheckKeys(med), [med]);
  /** Fixed-order check rows: present or pending review, order never changes. */
  const stableCheckKeys = useMemo(
    () =>
      CHECK_ROWS.map((r) => r.key).filter(
        (k) => !!med.checks?.[k] || unreviewedKeys.includes(k),
      ),
    [med, unreviewedKeys],
  );
  /** Header, safety summary and the sticky footer all count the same blockers. */
  const reviewsRemaining = blockers.filter((b) => b.kind === "review" || b.kind === "stale").length;
  const requiredCount = blockers.length - reviewsRemaining;
  /** Shared counter: the breakdown adds up to the headline number exactly, and
   *  the patient-information figure is the same one shown on the profile tab. */
  const counts = actionCounts({
    blockers,
    infoOutstanding: outstanding.length,
    safetyAckPending: !!sharedSafety && !med.sharedSafetyAcknowledgedAt,
  });
  const totalActions = counts.total;
  const countText = counts.text;
  const countBreakdown = counts.breakdown;
  /** One shared "nothing left" state for the summary card, drawer and footer. */
  const safetyResolved = requiredCount === 0 && reviewsRemaining === 0 && totalActions === 0;
  const outstandingLabels = requiredOutstanding.map((i) => infoLabel(i.key));
  const outstandingNames = outstandingLabels.join(" and ").trim();
  const captureInfoSnapshot = () =>
    {
      setFrozenInfoOrder(infoList.map((i) => i.key));
      setFrozenInfo(
        Object.fromEntries(
          infoList.map((i) => [
            i.key,
            { recorded: i.recorded, value: infoRecordedSummary(i.key, patientInfo, visitMeds) },
          ]),
        ),
      );
    };
  const confirmInfoSaved = (key: InfoKey, edited: boolean) => {
    setFrozenInfo(null);
    setFrozenInfoOrder(null);
    setOpenInfoKey(null);
    toast.success(`${infoLabel(key)} ${edited ? "updated" : "added"}`, {
      description: "Saved to the client's private clinical record.",
    });
  };
  /** One accordion row for a patient-information item inside the drawer. */
  const infoAccordionRow = (key: InfoKey, requirement: "required" | "recommended") => {
    const open = openInfoKey === key;
    const snap = frozenInfo?.[key];
    const live = infoList.find((i) => i.key === key);
    const done = snap ? snap.recorded : !!live?.recorded;
    const value = done ? (snap?.value ?? infoRecordedSummary(key, patientInfo, visitMeds)) : "";
    const shared = sharedSources[key];
    /** The record and the client's current health card no longer say the same
     *  thing — surfaced so the provider works from up-to-date information. */
    const drifted =
      !!shared &&
      done &&
      !!value &&
      !value.toLowerCase().includes(shared.value.trim().toLowerCase().slice(0, 24));
    return (
      <li
        key={key}
        className={
          open
            ? "bg-[#FBFAFE]"
            : done
              ? "bg-[#F3FBF7] transition hover:bg-[#EBF7F1]"
              : "transition hover:bg-[#FBFAFE]"
        }
      >
        <button
          type="button"
          aria-expanded={open}
          onClick={() => {
            setOpenCheckKey(null);
            if (open) {
              setFrozenInfo(null);
              setFrozenInfoOrder(null);
              setOpenInfoKey(null);
            } else {
              captureInfoSnapshot();
              setOpenInfoKey(key);
            }
          }}
          className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left"
        >
          <span className="min-w-0 flex-1">
            <span
              className={`flex items-center gap-1.5 text-[13.5px] font-semibold ${
                done ? "text-[#1F7A57]" : "text-[#2C2B4B]"
              }`}
            >
              {done && (
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#1F7A57] text-white">
                  <Check className="h-2.5 w-2.5" />
                </span>
              )}
              <span className="truncate">{infoLabel(key)}</span>
            </span>
            {done && value && (
              <span className="mt-0.5 block truncate text-[11.5px] text-[#5A4A8A]">{value}</span>
            )}
            {shared && (
              <span className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center rounded-[12px] bg-[#F3FBF7] px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-[#1F5C46] ring-1 ring-[#CFE7DD]">
                  {shared.source === "passport"
                    ? `Shared by ${clientName || "the client"} · health card`
                    : `Shared by ${clientName || "the client"} · intake form`}
                </span>
                <span className="text-[11px] text-[#6F6889]">“{shared.value}”</span>
              </span>
            )}
            {drifted && (
              <span className="mt-1 block text-[11px] leading-relaxed text-[#8A6A20]">
                Their health card now says something different from what&rsquo;s on the record —
                check it before prescribing.
              </span>
            )}
          </span>
          <StatusChip level={done ? "complete" : requirement} />
          <span className="inline-flex w-[128px] items-center justify-end gap-1 text-[11.5px] font-semibold text-[#6E4FD3]">
            {open ? "Close" : done ? "Edit" : "Add information"}
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
              appointmentId={appointmentId}
              clientName={clientName}
              onChange={onPatientInfo}
              onSave={() => confirmInfoSaved(key, !!snap?.recorded)}
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
  /** Medication-level review items still open (check acknowledgements / re-run). */
  const pendingCheckLabels = unreviewedKeys.map(
    (k) => CHECK_ROWS.find((r) => r.key === k)?.label ?? String(k),
  );
  const needsReviewRun = !safetySummary(med).ran || reviewStale(med, patientInfo);
  /** Patient information is settled — the only thing left is the medication review. */
  const medicationReviewOnly =
    hasName && outstanding.length === 0 && !finalReady && (needsReviewRun || unreviewedKeys.length > 0);
  const medicationReviewRemainder = [
    needsReviewRun ? "Run the patient-specific safety review" : null,
    pendingCheckLabels.length
      ? `Review & acknowledge: ${pendingCheckLabels.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
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
          {(med.origin === "ai" || med.origin === "ai-option") && (
            <span className="inline-flex items-center rounded-full bg-[#F1ECFD] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6E4FD3]">
              Suggested by AI
            </span>
          )}
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
        {(med.origin === "ai" || med.origin === "ai-option") && (
          <div className="mt-3 rounded-lg border-l-[3px] border-l-[#6E4FD3] border border-[#E4E1EC] bg-[#FAF8FF] px-4 py-3">
            <p className="text-[13px] font-semibold text-[#2C2B4B]">
              Suggested by Lubin&apos;s AI
            </p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-[#5A4A8A]">
              A starting option based on the visit context, not a final prescription. Review every
              field, adjust as needed, or replace it with a different medication.
            </p>
          </div>
        )}
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
                  hint="The dose form and strength as it will be dispensed, e.g. 50 mg film-coated tablet."
                />
              ) : (
                <Field
                  label="Strength and formulation"
                  value={med.strength ?? ""}
                  onChange={(v) => edit({ strength: v })}
                  placeholder="Strength and formulation as dispensed"
                  hint="The dose form and strength as it will be dispensed, e.g. 50 mg film-coated tablet."
                />
              )}
            </div>
            <div className="md:col-span-3">
              <Field
                label="Dose"
                value={med.dose}
                onChange={(v) => edit({ dose: v })}
                required
                hint="Amount per administration, e.g. 50 mg, 1 tablet, or 5 mL."
              />
            </div>
            <div className="md:col-span-2">
              {catalogue ? (
                <SelectField
                  label="Route"
                  value={med.route ?? ""}
                  options={catalogue.routes}
                  onChange={(v) => edit({ route: v })}
                  hint="How the medication enters the body, e.g. oral, sublingual, topical, IM, or IV."
                />
              ) : (
                <Field
                  label="Route"
                  value={med.route ?? ""}
                  onChange={(v) => edit({ route: v })}
                  placeholder="Route of administration"
                  hint="How the medication enters the body, e.g. oral, sublingual, topical, IM, or IV."
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
                hint="How often the patient takes it, e.g. once daily, twice daily, or PRN."
              />
            </div>
            <div className="md:col-span-2">
              <Field
                label="Duration"
                value={med.duration ?? ""}
                onChange={(v) => edit({ duration: v })}
                placeholder="How long to continue"
                hint="How long the patient should continue, e.g. 4 weeks, 30 days, or until finished."
              />
            </div>
            <div className="md:col-span-3">
              <Field
                label="Quantity"
                value={med.quantity ?? ""}
                onChange={(v) => edit({ quantity: v })}
                placeholder="Total amount to dispense"
                hint="Total amount to dispense, e.g. 30 tablets or 1 bottle/60 mL."
              />
            </div>
            <div className="md:col-span-3">
              <Field
                label="Refills"
                value={med.refills ?? ""}
                onChange={(v) => edit({ refills: v })}
                placeholder="Number of refills, or none"
                hint="Number of times the prescription may be refilled without a new order."
              />
            </div>
            <div className="md:col-span-6">
              <Field
                label="Indication"
                value={med.indication ?? ""}
                onChange={(v) => edit({ indication: v })}
                placeholder="Why this is being prescribed"
                hint="The clinical reason for the medication, e.g. moderate depressive symptoms with anxiety."
              />
            </div>
            <div className="md:col-span-6">
              <Field
                label="Follow-up needed"
                value={med.followUp ?? ""}
                onChange={(v) => edit({ followUp: v })}
                placeholder="When should this be reviewed again? e.g. Review in 4 weeks"
                hint="When the patient should be seen or reviewed again before continuing or changing this medication. Leave blank if no follow-up is required."
              />
            </div>
            <div className="md:col-span-6">
              <FieldArea
                label="Patient instructions"
                value={med.instructions}
                onChange={(v) => edit({ instructions: v })}
                required
                placeholder="How to take it, when, what to do if a dose is missed"
                hint="Plain-language directions for the patient, including when/how to take it and what to do if a dose is missed."
              />
            </div>
          </div>
        )}
      </section>

      {/* 2 — Safety review — compact summary only; details live in the drawer */}
      <section>
        <SectionHeading>Safety review</SectionHeading>
        {!hasName ? (
          <p className="mt-2 text-[12.5px] leading-relaxed text-[#5A4A8A]">
            Choose a medication above to see the patient information and safety items this
            prescription needs.
          </p>
        ) : (
          <>
            <div
              className={`mt-3 rounded-2xl border px-5 py-4 ${
                safetyResolved ? "border-[#CFE9DD] bg-[#F6FBF8]" : "border-[#DCD2F4] bg-[#F6F3FE]"
              }`}
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3">
                <div className="min-w-0">
                  <p
                    className={`text-[15px] font-semibold ${
                      safetyResolved ? "text-[#1F7A57]" : "text-[#2C2B4B]"
                    }`}
                  >
                    {safetyResolved ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Check className="h-4 w-4" /> Ready for verification
                      </span>
                    ) : (
                      countText
                    )}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-[#6F6889]">
                    {safetyResolved
                      ? "Required information and safety acknowledgements are complete."
                      : reviewRan && reviewStale(med, patientInfo)
                        ? "Patient information changed — run the safety checks again."
                        : medicationReviewOnly
                          ? "Patient information is complete. Finish the medication review to unlock the final review."
                          : "Add the required patient information, then review the flagged items."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDrawerTab(medicationReviewOnly ? "safety" : drawerTab);
                    onSafetyOpenChange(true);
                  }}
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[#6E4FD3] px-4 text-[13px] font-semibold text-white transition hover:bg-[#7C5FE0]"
                >
                  {safetyResolved
                    ? "View details"
                    : medicationReviewOnly
                      ? "Complete medication review"
                      : "Review patient information"}
                  <span aria-hidden="true">&rarr;</span>
                </button>
              </div>

              {!safetyResolved && (
                <div className="mt-3 border-t border-[#DCD2F4]/70 pt-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8B82A8]">
                    Standard information for every prescription
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {STANDARD_INFO_CHECKLIST.map((item) => {
                      const done = infoList.find((i) => i.key === item.key)?.recorded ?? false;
                      const shared = sharedSources[item.key];
                      return (
                        <li
                          key={item.key}
                          className={`inline-flex items-center gap-1.5 rounded-[12px] px-2.5 py-1 text-[12px] font-medium ring-1 ${
                            done
                              ? "bg-[#F1F7F4] text-[#1F7A57] ring-[#CFE9DD]"
                              : "bg-white text-[#5A3EB8] ring-[#DCD2F4]"
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`h-1.5 w-1.5 rounded-full ${
                              done ? "bg-[#1F7A57]" : "bg-[#A796DE]"
                            }`}
                          />
                          {item.label}
                          {shared && (
                            <span className="rounded-[12px] bg-white/70 px-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-[#5A4A8A] ring-1 ring-[#DCD2F4]">
                              {shared.source === "passport"
                                ? "Shared from health card"
                                : "Shared in intake"}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-2 text-[11.5px] leading-relaxed text-[#6F6889]">
                    {sharedCount > 0
                      ? `${clientName || "The client"} chose to share ${sharedCount} of these with you — from their health card or intake form. Nothing else is pulled from anywhere: anything unlabelled is blank until you document it.`
                      : `${clientName || "The client"} hasn't shared any of these yet, so nothing has been filled in. Document what comes up in the session.`}
                  </p>
                </div>
              )}


              {!safetyResolved && medicationReviewOnly && medicationReviewRemainder && (
                <p className="mt-3 border-t border-[#DCD2F4]/70 pt-3 text-[12px] leading-relaxed text-[#5A3EB8]">
                  Remaining: {medicationReviewRemainder}
                </p>
              )}
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
              <div className="mt-3 space-y-3 rounded-xl bg-[#FAF9FD] px-4 py-3.5">
                <p className="text-[12.5px] leading-relaxed text-[#3D2E6B]">
                  {med.origin === "manual"
                    ? "Added by the prescribing clinician. The basis below is shown so it can be checked independently."
                    : "This option was generated from the information documented for this visit. It is decision support only — review the basis, the knowns and the unknowns below and decide independently."}
                </p>
                <WhyBlock
                  title="Why this option was shown"
                  body={
                    med.basis?.whyIncluded ??
                    med.rationale ??
                    "No supporting explanation was recorded for this option."
                  }
                />
                <WhyBlock
                  title="Patient factors considered"
                  body={
                    med.basis?.patientConsiderations ??
                    med.basis?.clinicalInformationUsed ??
                    "No patient-specific factors were recorded with this option. Treat the recommendation as unpersonalised."
                  }
                />
                <WhyBlock
                  title="Guideline and label basis"
                  body={
                    med.reference?.sourcesAvailable
                      ? "Based on the approved product information and reference sources linked under Medication information. Open it to read the source text before prescribing."
                      : "No authoritative product label or formulary source has been linked for this medication yet. Verify against the prescribing information yourself before issuing."
                  }
                />
                <WhyBlock
                  title="Relevant contraindications and warnings"
                  body={
                    [
                      checkState(med.checks?.contraindications) === "blocking" ||
                      checkState(med.checks?.contraindications) === "review-needed"
                        ? med.checks?.contraindications?.detail
                        : null,
                      checkState(med.checks?.conditions) === "review-needed"
                        ? med.checks?.conditions?.detail
                        : null,
                      checkState(med.checks?.interactions) === "review-needed"
                        ? med.checks?.interactions?.detail
                        : null,
                      med.warnings || null,
                    ]
                      .filter(Boolean)
                      .join(" ") ||
                    "No contraindication or interaction was identified from the information available. This is not a statement that none exists."
                  }
                />
                <WhyBlock
                  title="Missing inputs"
                  body={
                    med.basis?.missingInformation ??
                    (outstandingNames
                      ? `Not available for this patient: ${outstandingNames}. The checks that depend on them could not be completed.`
                      : "Every input this review depends on has been recorded.")
                  }
                />
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
          profileBadge={outstanding.length}
          footer={
            <>
              <span className="mr-auto text-[12px] font-semibold text-[#5A4A8A]">
                {safetyResolved
                  ? "Nothing outstanding"
                  : countBreakdown
                    ? `${countText} — ${countBreakdown}`
                    : countText}
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
              {(!reviewRan || reviewStale(med, patientInfo)) && (
                <div
                  className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-4 py-2.5 ${
                    reviewRan
                      ? "border border-[#EADFC4] bg-[#FDF8EC]"
                      : "bg-[#FBFAFE]"
                  }`}
                >
                  <p
                    className={`min-w-0 flex-1 text-[12px] leading-relaxed ${
                      reviewRan ? "text-[#8A6A20]" : "text-[#5A4A8A]"
                    }`}
                  >
                    {reviewRan
                      ? "The patient information changed after the last safety review. Run it again so the checks reflect what is now on the record."
                      : "The patient-specific safety review has not run yet."}
                  </p>
                  <button
                    type="button"
                    onClick={onRunReview}
                    className="shrink-0 text-[11.5px] font-bold uppercase tracking-tight text-[#6E4FD3] transition hover:text-[#5A3EB8]"
                  >
                    {reviewRan ? "Run safety review again" : "Run safety review"}
                  </button>
                </div>
              )}

              {/* Patient information lives on the Medical profile tab — this is only a pointer,
                  so the same rows are not duplicated in two places. */}
              <div className="rounded-xl border border-[#EFECF7] bg-[#FBFAFE] px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="min-w-0 flex-1 text-[13px] font-semibold text-[#2C2B4B]">
                    Patient information
                  </p>
                  {outstanding.length === 0 ? (
                    <StatusChip level="complete" />
                  ) : (
                    <StatusChip level={requiredOutstanding.length > 0 ? "required" : "review"} />
                  )}
                  <button
                    type="button"
                    onClick={() => setDrawerTab("profile")}
                    className="text-[11.5px] font-bold uppercase tracking-tight text-[#6E4FD3] transition hover:text-[#5A3EB8]"
                  >
                    Open medical profile
                  </button>
                </div>
                <p className="mt-1 text-[12px] text-[#5A4A8A]">
                  {outstanding.length === 0
                    ? "All patient information needed for this medication is on the record."
                    : `${requiredOutstanding.length} required · ${reviewOutstanding.length} to review${
                        outstandingNames ? ` — ${outstandingNames}` : ""
                      }`}
                </p>
              </div>

              {stableCheckKeys.length > 0 && (
                <div>
                  {(() => {
                    const actionKeys = stableCheckKeys.filter((k) => {
                      const st = checkState(med.checks?.[k]);
                      return (
                        (st === "review-needed" || st === "blocking") && !med.checkReviews?.[k]
                      );
                    });
                    const clearedKeys = stableCheckKeys.filter((k) => !actionKeys.includes(k));
                    const renderRow = (k: (typeof stableCheckKeys)[number]) => {
                      const open = openCheckKey === k;
                      const reviewed = !!med.checkReviews?.[k];
                      const label = CHECK_ROWS.find((r) => r.key === k)?.label ?? k;
                      const state = checkState(med.checks?.[k]);
                      const needsAck = state === "review-needed" || state === "blocking";
                      const missingInfo = state === "info-required";
                      const headline = checkHeadline(med.checks?.[k]);
                      return (
                        <li key={k} className={open ? "bg-[#FBFAFE]" : "hover:bg-[#FBFAFE]"}>
                          <div className="flex w-full flex-col gap-2 px-4 py-3 text-left sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1">
                            <span className="min-w-[180px] flex-1">

                              <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-[#2C2B4B]">
                                {reviewed && (
                                  <Check className="h-3.5 w-3.5 shrink-0 text-[#1F7A57]" />
                                )}
                                <span>{label}</span>
                              </span>
                              {reviewed && med.checkReviews?.[k] ? (
                                <span className="mt-0.5 block text-[11px] text-[#8C86A0]">
                                  Reviewed {formatCheckedAt(med.checkReviews[k]!)} · {headline}
                                </span>
                              ) : (
                                <span
                                  className={`mt-0.5 block text-[11px] ${
                                    needsAck ? "text-[#5A4A8A]" : "text-[#8C86A0]"
                                  }`}
                                >
                                  {needsAck
                                    ? `${headline} · Review & acknowledge this item individually`
                                    : missingInfo
                                      ? `${headline} · Information not available — judge independently`
                                      : "No conflict identified from available information"}
                                </span>
                              )}
                            </span>
                            <div className="flex flex-wrap items-center gap-2 sm:contents">
                              <StatusChip
                                level={
                                  reviewed
                                    ? "complete"
                                    : needsAck
                                      ? "review"
                                      : missingInfo
                                        ? "unavailable"
                                        : "no-issue"
                                }
                              />
                              {needsAck && !reviewed && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onMarkCheckReviewed(k);
                                    toast.success(`${label} marked as reviewed`);
                                  }}
                                  className="inline-flex h-8 items-center rounded-[9px] bg-[#6E4FD3] px-3 text-[12px] font-semibold text-white transition hover:bg-[#7C5FE0]"
                                >
                                  Review &amp; acknowledge
                                </button>
                              )}
                              <button
                                type="button"
                                aria-expanded={open}
                                onClick={() => {
                                  setOpenInfoKey(null);
                                  setOpenCheckKey(open ? null : k);
                                }}
                                className="ml-auto inline-flex items-center justify-end gap-1 text-[11.5px] font-bold uppercase tracking-tight text-[#6E4FD3] transition hover:text-[#5A3EB8] sm:ml-0 sm:w-[80px]"
                              >
                                {open ? "Hide" : "Details"}
                                <ChevronDown
                                  className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
                                />
                              </button>
                            </div>
                          </div>

                          {open && (
                            <ul className="px-4 pb-3">
                              <CheckRow
                                label={label}
                                check={med.checks?.[k]}
                                provenance={checkProvenance(k, sharedSources, clientName)}
                                reviewedAt={med.checkReviews?.[k]}

                                onMarkReviewed={() => {
                                  const wasReviewed = !!med.checkReviews?.[k];
                                  onMarkCheckReviewed(k);
                                  if (wasReviewed) {
                                    toast(`${label} review undone`, {
                                      description: "This item needs review again.",
                                    });
                                  } else {
                                    toast.success(`${label} marked as reviewed`);
                                  }
                                }}
                              />
                            </ul>
                          )}
                        </li>
                      );
                    };
                    return (
                      <>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <p className="min-w-0 flex-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#6F6889]">
                            Medication-specific checks
                          </p>
                          <StatusChip level={actionKeys.length === 0 ? "complete" : "review"} />
                        </div>
                        <p className="mt-1 text-[13px] font-semibold text-[#3D2E6B]">
                          {actionKeys.length === 0
                            ? "No items require your review"
                            : `${actionKeys.length} item${
                                actionKeys.length === 1 ? "" : "s"
                              } require your review`}
                        </p>
                        <p className="mt-0.5 text-[12px] leading-relaxed text-[#5A4A8A]">
                          {actionKeys.length === 0
                            ? "Every check for this medication has been reviewed or cleared."
                            : "Each item is acknowledged individually with its reason shown. There is no bulk review."}
                        </p>

                        {actionKeys.length > 0 && (
                          <ul className="mt-2 divide-y divide-[#EFECF7] rounded-xl border border-[#DCD2F4] bg-[#FCFBFE]">
                            {actionKeys.map(renderRow)}
                          </ul>
                        )}

                        {clearedKeys.length > 0 && (
                          <div className="mt-3">
                            <button
                              type="button"
                              aria-expanded={clearedOpen}
                              onClick={() => setClearedOpen((v) => !v)}
                              className="flex w-full items-center gap-2 rounded-xl border border-[#EFECF7] px-4 py-2.5 text-left transition hover:bg-[#FBFAFE]"
                            >
                              <Check className="h-3.5 w-3.5 shrink-0 text-[#1F7A57]" />
                              <span className="min-w-0 flex-1 text-[12.5px] font-semibold text-[#3D2E6B]">
                                {clearedKeys.length} check{clearedKeys.length === 1 ? "" : "s"}{" "}
                                completed
                              </span>
                              <ChevronDown
                                className={`h-3.5 w-3.5 text-[#6E4FD3] transition-transform ${
                                  clearedOpen ? "rotate-180" : ""
                                }`}
                              />
                            </button>
                            {clearedOpen && (
                              <ul className="mt-1 divide-y divide-[#EFECF7] border-y border-[#EFECF7]">
                                {clearedKeys.map(renderRow)}
                              </ul>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {sharedSafety && (
                <div className="rounded-xl border border-[#EFECF7] px-4 py-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="min-w-0 flex-1 text-[13px] font-semibold text-[#2C2B4B]">
                      Suicide and self-harm safety — {sharedSafety.clinicalName} response
                    </p>
                    <StatusChip level={med.sharedSafetyAcknowledgedAt ? "acknowledged" : "review"} />
                    <span className="text-[11.5px] font-medium text-[#8C86A0]">
                      {med.sharedSafetyAcknowledgedAt ? "Acknowledged" : "Needs acknowledgement"}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-[#5A4A8A]">
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
                  {med.sharedSafetyAcknowledgedAt ? (
                    <p className="mt-2 text-[11.5px] text-[#1F7A57]">
                      Acknowledged{" "}
                      {new Date(med.sharedSafetyAcknowledgedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "numeric",
                      })}
                      . Required before signing the prescription.
                    </p>
                  ) : (
                    <div className="mt-2 rounded-[10px] border border-[#EDEBF3] bg-[#FCFBFE] px-2.5 py-2">
                      <p className="text-[11.5px] leading-snug text-[#5A4A8A]">
                        This item has its own acknowledgement and is never cleared by reviewing the
                        medication checks. I have reviewed this response and considered whether
                        further suicide risk assessment or immediate clinical action is required
                        before prescribing.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          onChange({ sharedSafetyAcknowledgedAt: Date.now() });
                          toast.success("Shared safety response acknowledged");
                        }}
                        className="mt-1.5 inline-flex h-7 items-center rounded-[8px] bg-[#6E4FD3] px-2.5 text-[11.5px] font-semibold text-white transition hover:bg-[#5A3EB8]"
                      >
                        Review & acknowledge safety response
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="border-t border-[#EDEBF3] pt-3">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#6F6889]">
                  Medication safety information
                </p>
                {med.warnings ? (
                  <p className="mt-1.5 text-[12px] leading-relaxed text-[#5A4A8A]">
                    {med.warnings}
                  </p>
                ) : (
                  <p className="mt-1.5 text-[12px] leading-relaxed text-[#5A4A8A]">
                    General effect and warning information for this medication is available in the
                    reference source. It is not patient-specific.
                  </p>
                )}
                <button
                  type="button"
                  onClick={onOpenReference}
                  className="mt-1.5 text-[12px] font-semibold text-[#6E4FD3] transition hover:text-[#5A3EB8]"
                >
                  View prescribing information
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[12.5px] font-semibold text-[#2C2B4B]">Clinical profile</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-[#5A4A8A]">
                Information saved here becomes part of the patient&rsquo;s clinical record and may be
                used in future medication safety reviews.
              </p>
              <ul className="mt-3 divide-y divide-[#EFECF7] border-y border-[#EFECF7]">
                {(frozenInfoOrder
                  ? frozenInfoOrder.flatMap((key) => {
                      const item = infoList.find((candidate) => candidate.key === key);
                      return item ? [item] : [];
                    })
                  : infoList
                ).map(({ key, requirement }) =>
                  infoAccordionRow(key, requirement === "required" ? "required" : "recommended"),
                )}
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
            {medicationReviewOnly && medicationReviewRemainder
              ? `Final review unlocks once the medication review is complete — ${medicationReviewRemainder.toLowerCase()}.`
              : "Final review becomes available once the required patient information and safety items above are complete."}
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
                  I, {providerName ? `Dr. ${providerName}` : "Dr. [Provider name]"}, confirm that I
                  reviewed this medication and its patient-specific safety information.
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
function StatusChip({
  level,
}: {
  level:
    | "required"
    | "recommended"
    | "review"
    | "complete"
    | "acknowledged"
    | "unavailable"
    | "no-issue";
}) {
  const map = {
    required: { label: "Required for this prescription", cls: "bg-[#FDF3E0] text-[#8A6A20]" },
    recommended: { label: "Recommended", cls: "bg-[#F4F1FB] text-[#5A4A8A]" },
    review: { label: "Needs your review", cls: "bg-[#F4F1FB] text-[#5A4A8A]" },
    complete: { label: "Reviewed", cls: "bg-[#EDF7F2] text-[#1F7A57]" },
    acknowledged: { label: "Acknowledged", cls: "bg-[#EDF7F2] text-[#1F7A57]" },
    unavailable: { label: "Information not available", cls: "bg-[#FDF3E0] text-[#8A6A20]" },
    "no-issue": { label: "No conflict identified", cls: "bg-[#F4F3F7] text-[#6F6889]" },
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

/** One labelled block inside the decision-support basis panel. */
function WhyBlock({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#6F6889]">{title}</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-[#3D2E6B]">{body}</p>
    </div>
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
  hint,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1 text-[12px] font-medium text-[#5A4A8A]">
        {label}
        {hint && <FieldHint text={hint} />}
      </span>
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

function FieldHint({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex cursor-help align-middle" tabIndex={0} aria-label={text}>
      <Info className="h-3.5 w-3.5 text-[#9C96AF] transition-colors group-hover:text-[#6E4FD3] group-focus:text-[#6E4FD3]" />
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 w-56 -translate-x-1/2 rounded-xl border border-[#E8E3F4] bg-white px-3 py-2 text-left text-[11.5px] font-normal leading-snug text-[#4A4262] opacity-0 shadow-lg shadow-[#6E4FD3]/10 transition-opacity duration-150 group-hover:opacity-100 group-focus:opacity-100"
      >
        {text}
      </span>
    </span>
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
  check,
  reviewedAt,
  onMarkReviewed,
}: {
  label?: string;
  check?: MedicationCheck;
  reviewedAt?: number;
  onMarkReviewed?: () => void;
}) {
  const state = checkState(check);
  const needsAck = state === "review-needed" || state === "blocking";
  return (
    <li className="text-[12.5px] leading-snug">
      {check?.detail && (
        <p className="font-medium text-[#3D2E6B]">{check.detail}</p>
      )}
      {(check?.informationUsed || check?.checkedAt) && (
        <p className="mt-1 text-[11.5px] text-[#6F6889]">
          {check?.informationUsed}
          {check?.checkedAt
            ? `${check.informationUsed ? " " : ""}Last checked ${formatCheckedAt(check.checkedAt)}.`
            : ""}
        </p>
      )}
      {needsAck && onMarkReviewed && (
        <div className="mt-2.5 rounded-[10px] border border-[#EDEBF3] bg-[#FCFBFE] px-2.5 py-2">
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
  identity,
  locked,
  collapsed,
}: {
  rx: Prescription;
  country: RxCountry;
  clientName?: string;
  providerName?: string;
  identity: PrescriberIdentity;
  locked?: boolean;
  /** After signing the primary task is delivery, so the repeated review
   *  sections start collapsed. */
  collapsed?: boolean;
}) {
  const age = patientAge(rx.patientInfo);
  const controlled = rx.medications.some((m) => m.controlled && m.name.trim().length > 0);
  return (
    <div className="space-y-3">
      <FoldSection title="Complete prescription" collapsed={collapsed}>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-2">
          <Row label="Patient" value={clientName || "—"} />
          <Row
            label="Age and sex"
            value={[age !== null ? `${age} years` : null, sexLabel(rx.patientInfo?.sex)]
              .filter(Boolean)
              .join(" · ")}
          />
          <Row label="Prescriber" value={providerName || "—"} />
          <Row label="Credentials" value={credentialSummary(identity, country, { controlled })} />
          <Row label="Jurisdiction" value={JURISDICTION_LABEL[country]} />
          <Row
            label="Clinical review"
            value={(() => {
              const named = rx.medications.filter((m) => m.name.trim().length > 0);
              if (named.length === 0) return "No medication added";
              const word = named.length === 1 ? "medication" : "medications";
              return `${named.filter((m) => m.approved).length} of ${named.length} ${word} reviewed`;
            })()}
          />
        </dl>
      </FoldSection>

      <FoldSection title="Medications and directions" collapsed={collapsed}>
        <ul className="space-y-3">
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
                {m.followUp?.trim() ? ` · Follow-up: ${m.followUp.trim()}` : ""}
              </p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[#3D2E6B]">
                {m.instructions || "No patient instructions recorded."}
              </p>
            </li>
          ))}
        </ul>
      </FoldSection>

      {!collapsed && (
      <section className="rounded-xl border border-[#E4E1EC] bg-white p-4">
        <h3 className="text-[13.5px] font-semibold text-[#2C2B4B]">Delivery</h3>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#5A4A8A]">
          {locked
            ? rx.delivery?.destination ||
              "Not chosen yet — pick a verified pharmacy or release the signed copy to the patient."
            : "Delivery is chosen after signing, so a signed document is never changed to reroute it."}
        </p>
      </section>
      )}
    </div>
  );
}

/** Section that is a plain card while editing and a collapsed fold once the
 *  prescription is signed. */
function FoldSection({
  title,
  collapsed,
  children,
}: {
  title: string;
  collapsed?: boolean;
  children: React.ReactNode;
}) {
  if (!collapsed) {
    return (
      <section className="rounded-xl border border-[#E4E1EC] bg-white p-4">
        <h3 className="text-[13.5px] font-semibold text-[#2C2B4B]">{title}</h3>
        <div className="mt-3">{children}</div>
      </section>
    );
  }
  return (
    <details className="group rounded-xl border border-[#E4E1EC] bg-white px-4 py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[13.5px] font-semibold text-[#2C2B4B]">
        {title}
        <ChevronDown className="h-4 w-4 flex-none text-[#8A7FB0] transition group-open:rotate-180" />
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

function sexLabel(sex?: PatientSafetyInfo["sex"]): string {
  switch (sex) {
    case "female":
      return "Female";
    case "male":
      return "Male";
    case "intersex":
      return "Intersex";
    case "prefer-not-to-say":
      return "Prefers not to say";
    default:
      return "Sex not documented";
  }
}

/** Immutable record of who signed, under which authority and where it went. */
function AuditTrail({
  appointmentId,
  tick,
  collapsed,
}: {
  appointmentId: string;
  tick: number;
  collapsed?: boolean;
}) {
  const events = useMemo(() => loadRxAudit(appointmentId), [appointmentId, tick]);
  if (events.length === 0) return null;
  const list = (
      <ul className="space-y-2.5">
        {events.map((e) => (
          <li key={e.id} className="border-t border-[#EDEBF3] pt-2.5 first:border-t-0 first:pt-0">
            <p className="text-[12.5px] font-semibold text-[#3D2E6B]">
              {RX_AUDIT_LABEL[e.action]} · {formatCheckedAt(e.at)}
            </p>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#6F6889]">
              {e.providerName} · {e.credentials} · {e.jurisdiction} · Patient {e.patient} · Version{" "}
              {e.version} · {e.authenticationMethod}
              {e.destination ? ` · Destination: ${e.destination}` : ""}
            </p>
            {e.detail && (
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#6F6889]">{e.detail}</p>
            )}
          </li>
        ))}
      </ul>
  );
  return (
    <section className="mt-3">
      <FoldSection title="Audit log" collapsed={collapsed}>
        {list}
      </FoldSection>
    </section>
  );
}

/** Prescriber identity that must be printed on the prescription. */
function IdentityCard({
  identity,
  country,
  editing,
  onEdit,
  onChange,
  locked,
  verifiedAt,
  controlled,
}: {
  identity: PrescriberIdentity;
  country: RxCountry;
  editing: boolean;
  onEdit: (v: boolean) => void;
  onChange: (next: PrescriberIdentity) => void;
  /** Field keys supplied by Lubin's verification record. */
  locked?: Set<string>;
  verifiedAt?: number;
  /** Controlled / dangerous-drug credentials (PH S2, US DEA) only appear when
   *  this prescription actually uses that pathway. */
  controlled?: boolean;
}) {
  const controlledKeys = new Set(["s2Number", "s2SerialNumber", "deaNumber"]);
  const fields = IDENTITY_FIELDS[country].filter(
    (f) => controlled || !controlledKeys.has(String(f.key)),
  );
  const missing = missingIdentityFields(identity, country);
  const lockedKeys = locked ?? new Set<string>();
  const editableFields = fields.filter((f) => !lockedKeys.has(String(f.key)));
  return (
    <section className="rounded-xl border border-[#E4E1EC] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[13.5px] font-semibold text-[#2C2B4B]">
            Prescriber details printed on the prescription
          </h3>
          <p className="mt-0.5 text-[12px] leading-relaxed text-[#5A4A8A]">
            {lockedKeys.size > 0
              ? `Pulled from your Lubin verification record${verifiedAt ? ` (verified ${new Date(verifiedAt).toLocaleDateString()})` : ""}. Verified credentials cannot be edited here and are never shown to clients.`
              : missing.length === 0
                ? "Complete — these appear on every copy the patient and pharmacy receive."
                : `Missing: ${missing.join(", ")}. A prescription cannot be signed without them.`}
          </p>
        </div>
        {editableFields.length > 0 && (
          <button
            type="button"
            onClick={() => onEdit(!editing)}
            className="inline-flex h-8 items-center rounded-[10px] border border-[#D9D5E3] bg-white px-3 text-[12.5px] font-semibold text-[#3D2E6B] hover:bg-[#F7F5FB]"
          >
            {editing ? "Done" : missing.length ? "Add details" : "Edit"}
          </button>
        )}
      </div>
      {editing && editableFields.length > 0 ? (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {editableFields.map((f) => (
            <Field
              key={f.key}
              label={f.label}
              required={f.required}
              placeholder={f.hint}
              value={String(identity[f.key] ?? "")}
              onChange={(v) => onChange({ ...identity, [f.key]: v })}
            />
          ))}
        </div>
      ) : (
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-2">
          {fields.map((f) => (
            <Row
              key={f.key}
              label={lockedKeys.has(String(f.key)) ? `${f.label} (verified)` : f.label}
              value={String(identity[f.key] ?? "").trim() || "Not on file"}
            />
          ))}
        </dl>
      )}
    </section>
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
  hint,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="flex items-center gap-1 text-[12px] font-medium text-[#5A4A8A]">
        {label}
        {required && <span className="ml-0.5 text-[#B4534F]">*</span>}
        {hint && <FieldHint text={hint} />}
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
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label className="flex items-center gap-1 text-[12px] font-medium text-[#5A4A8A]">
        {label}
        {required && <span className="ml-0.5 text-[#B4534F]">*</span>}
        {hint && <FieldHint text={hint} />}
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

/** Shown instead of the prescribing tools when Lubin has not verified this
 *  provider's prescribing authority for the patient's jurisdiction. Being a
 *  doctor is not enough — the credentials must be verified by Lubin first. */
function PrescribingLocked({
  gate,
  country,
  onSkip,
}: {
  gate: PrescribingGate;
  country: RxCountry;
  onSkip?: () => void;
}) {
  const submittedApp = loadApplication();
  const awaitingReview = !!submittedApp?.submittedAt && gate.status !== "expired";
  const started = !!submittedApp && !submittedApp.submittedAt;
  const cta = awaitingReview
    ? "View verification status"
    : gate.status === "expired"
      ? "Renew my credentials"
      : started
        ? "Continue verification"
        : "Start Lubin verification";
  return (
    <section className="rounded-2xl border border-[#EAE2F6] bg-white px-5 py-5 text-[#2C2B4B]">
      <div className="flex items-start gap-2.5">
        <Lock className="mt-[3px] h-4 w-4 flex-none text-[#6E4FD3]" />
        <div>
          <h3 className="text-[14px] font-semibold">Prescribing is not available yet</h3>
          <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-[#5A4A8A]">
            {gate.reason} Prescriptions on Lubin can only be written once your professional licence
            and prescribing credentials are verified through Lubin&rsquo;s verification process for{" "}
            {country === "PH" ? "the Philippines" : "the United States"}.
          </p>
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#F1ECFD] px-2.5 py-1 text-[11.5px] font-semibold text-[#5A3EB8]">
            {awaitingReview ? "Verification in review" : VERIFICATION_STATUS_LABEL[gate.status]}
          </p>
          {awaitingReview && (
            <p className="mt-2 max-w-xl text-[12.5px] leading-relaxed text-[#5A4A8A]">
              Your documents are with Lubin. Prescribing opens automatically once they are verified
              against the issuing register — usually within 2 business days.
            </p>
          )}
          {gate.outstanding.length > 0 && (
            <>
              <p className="mt-3 text-[12.5px] font-semibold text-[#3D2E6B]">
                What Lubin still needs
              </p>
              <ul className="mt-1.5 space-y-1.5">
                {gate.outstanding.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[12.5px] text-[#5A4A8A]">
                    <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-[#B9A9E8]" />
                    {item}
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="mt-3 text-[12px] leading-relaxed text-[#6F6889]">
            You can still document the session, review the client&rsquo;s current medication and
            share a summary. Your credential numbers stay with Lubin — they are never shown to
            clients, and they are filled in automatically once verification is complete.
          </p>
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <Link
              to="/prescribing-verification"
              className="inline-flex h-9 items-center rounded-[10px] bg-[#6E4FD3] px-4 text-[13px] font-semibold text-white transition hover:bg-[#5A3EB8]"
            >
              {cta}
            </Link>
            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="inline-flex h-9 items-center rounded-[10px] border border-[#D9D5E3] bg-white px-3.5 text-[13px] font-semibold text-[#3D2E6B] transition hover:bg-[#F7F5FB]"
              >
                No prescription needed
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Prescribing needs clinical documentation supporting the medication
 *  decision. Recording that no prescription is needed stays available. */
function DocumentationRequired({
  onAddClinicalInfo,
  onSkip,
}: {
  onAddClinicalInfo?: () => void;
  onSkip: () => void;
}) {
  return (
    <section className="rounded-2xl border border-[#EAE2F6] bg-white px-4 py-3.5 text-[#2C2B4B]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Lock className="h-4 w-4 flex-none text-[#6E4FD3]" />
        <p className="min-w-[220px] flex-1 text-[13px] leading-relaxed text-[#5A4A8A]">
          Prescribing unlocks once step 1 is complete.
        </p>
        {onAddClinicalInfo && (
          <button
            type="button"
            onClick={onAddClinicalInfo}
            className="text-[13px] font-semibold text-[#6E4FD3] underline underline-offset-2 transition hover:text-[#5A3EB8]"
          >
            Go to step 1
          </button>
        )}
        <button
          type="button"
          onClick={onSkip}
          className="inline-flex h-9 items-center rounded-[10px] border border-[#D9D5E3] bg-white px-3.5 text-[13px] font-semibold text-[#3D2E6B] transition hover:bg-[#F7F5FB]"
        >
          No prescription needed
        </button>
      </div>
    </section>
  );
}
