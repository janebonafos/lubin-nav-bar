import { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  Check,
  AlertTriangle,
  Trash2,
  Plus,
  Printer,
  Lock,
  Info,
  BookOpen,
  ChevronLeft,
  ChevronDown,
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
} from "@/lib/prescription/store";
import { loadWorkspace } from "@/lib/visit-workspace/store";
import { MedicationReferenceDrawer } from "./MedicationReferenceDrawer";
import { MED_VERIFICATION_STATEMENT } from "@/lib/prescription/reference";
import { DEMO_BANNER, demoPrescription } from "@/lib/prescription/demo";

const JURISDICTION_LABEL: Record<RxCountry, string> = {
  US: "United States",
  PH: "Philippines",
};

const STAGES = ["Draft", "Clinical review", "Sign and issue"] as const;
type Stage = 0 | 1 | 2;

const CHECK_ROWS: {
  key: keyof Omit<
    NonNullable<PrescriptionMedication["checks"]>,
    "missingInformation"
  >;
  label: string;
}[] = [
  { key: "allergies", label: "Allergies" },
  { key: "currentMedications", label: "Current medications" },
  { key: "interactions", label: "Interactions" },
  { key: "contraindications", label: "Contraindications" },
  { key: "conditions", label: "Relevant medical conditions" },
];

function medComplete(m: PrescriptionMedication) {
  return (
    m.name.trim() && m.dose.trim() && m.frequency.trim() && m.instructions.trim()
  );
}

export function AiPrescription({
  appointmentId,
  clientName,
  providerName,
  jurisdiction,
  onAddClinicalInfo,
}: {
  appointmentId: string;
  clientName?: string;
  providerName?: string;
  appointmentLabel?: string;
  /** Locked from the client's jurisdiction and the provider's authority. */
  jurisdiction?: RxCountry;
  /** Takes the provider to the clinical documentation fields. */
  onAddClinicalInfo?: () => void;
}) {
  const [rx, setRx] = useState<Prescription>(() =>
    loadPrescription(appointmentId),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refMedId, setRefMedId] = useState<string | null>(null);
  const [reviewMedId, setReviewMedId] = useState<string | null>(null);
  const [finalReview, setFinalReview] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    setRx(loadPrescription(appointmentId));
    return subscribePrescription(() => setRx(loadPrescription(appointmentId)));
  }, [appointmentId]);

  useEffect(() => {
    mounted.current = true;
  }, []);

  const patch = (p: Partial<Prescription>) =>
    setRx(updatePrescription(appointmentId, p));
  const country: RxCountry = rx.country ?? jurisdiction ?? "PH";

  const total = rx.medications.length;
  const verifiedCount = rx.medications.filter((m) => m.approved).length;
  const allVerified = total > 0 && verifiedCount === total;
  const signed = !!rx.finalisedAt;
  const controlledMeds = rx.medications.filter((m) => m.controlled);
  const restrictedPending =
    controlledMeds.length > 0 && !rx.restrictedAcknowledgedAt;
  const unverifiedSources = rx.medications.filter(
    (m) => m.reference && !m.reference.sourcesAvailable && !m.externallyVerifiedAt,
  );
  const stage: Stage = signed ? 2 : total === 0 ? 0 : allVerified ? 2 : 1;

  const reviewMed =
    rx.medications.find((m) => m.id === reviewMedId) ?? null;
  const refMed = rx.medications.find((m) => m.id === refMedId) ?? null;

  const generate = async (opts?: { demoFallback?: boolean }) => {
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
        );
        return;
      }
      if (meds.length === 0) {
        setError(data.error ?? "Could not prepare a draft. Please try again.");
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
      );
    } finally {
      setBusy(false);
    }
  };

  const loadDemo = (message?: string) => {
    const demo = demoPrescription(appointmentId);
    patch({ ...demo, skippedAt: undefined });
    setNotice(message ?? null);
  };

  /** Any medication-field change resets that medication's verification and
   *  any completed whole-prescription review. */
  const updateMed = (id: string, p: Partial<PrescriptionMedication>) => {
    const meds = rx.medications.map((m) => (m.id === id ? { ...m, ...p } : m));
    const isVerificationToggle = Object.keys(p).length <= 2 && "approved" in p;
    patch({
      medications: meds,
      ...(isVerificationToggle
        ? {}
        : { reviewedAt: undefined, legalAcknowledgedAt: undefined }),
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
  const addMed = () => {
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
          route: "Oral",
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
  };

  const discardDraft = () => {
    patch({
      medications: [],
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
    setNotice(null);
  };

  const cacheReference = (medId: string, reference: MedicationReference) =>
    patch({
      medications: rx.medications.map((m) =>
        m.id === medId ? { ...m, reference } : m,
      ),
    });
  const markExternallyVerified = (medId: string) =>
    patch({
      medications: rx.medications.map((m) =>
        m.id === medId
          ? {
              ...m,
              externallyVerifiedAt: m.externallyVerifiedAt
                ? undefined
                : Date.now(),
            }
          : m,
      ),
    });

  const canSign =
    allVerified &&
    !!rx.legalAcknowledgedAt &&
    unverifiedSources.length === 0 &&
    !restrictedPending;

  const saveDraft = () => {
    patch({});
    setSavedAt(Date.now());
  };

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-3 pb-4">
      <div>
        <h2 className="text-[17px] font-semibold text-[#2C2B4B]">
          Prescription
        </h2>
        <p className="mt-1 text-[12.5px] text-[#5A4A8A]">
          Jurisdiction{" "}
          <span className="font-semibold text-[#3D2E6B]">
            {JURISDICTION_LABEL[country]}
          </span>{" "}
          · matched to {clientName || "the client"} and your verified
          prescribing authority
        </p>
      </div>
      <StageBar stage={stage} hideSign={total > 0 && !allVerified && !signed} />
    </div>
  );

  // ---------- No prescription needed ----------
  if (rx.skippedAt && total === 0) {
    return (
      <section className="text-[#2C2B4B]">
        {header}
        <div className="rounded-xl border border-[#E4E1EC] bg-white px-4 py-4">
          <p className="text-[13.5px] font-semibold">
            No prescription needed for this appointment
          </p>
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

  // ---------- Empty ----------
  if (total === 0) {
    return (
      <section className="text-[#2C2B4B]">
        {header}
        {error && <ErrorNote text={error} />}
        {busy ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-[#E4E1EC] bg-white px-4 py-4">
            <Loader2 className="h-4 w-4 animate-spin text-[#6E4FD3]" />
            <p className="text-[13px] text-[#3D2E6B]">
              Preparing draft from the recorded clinical information…
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-[#E4E1EC] bg-white px-5 py-8 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#F5F2FB]">
              <img
                src={rxIcon.url}
                alt=""
                aria-hidden="true"
                className="h-5 w-5 opacity-50"
              />
            </div>
            <h3 className="text-[14px] font-semibold text-[#2C2B4B]">
              No prescription prepared
            </h3>
            <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-relaxed text-[#5A4A8A]">
              Prepare a draft from this visit&rsquo;s clinical information, add a
              medication yourself, or record that no prescription is needed.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => void generate()}
                className="inline-flex h-9 items-center rounded-[10px] bg-[#6E4FD3] px-4 text-[13px] font-semibold text-white transition hover:bg-[#5A3EB8]"
              >
                Prepare draft from clinical information
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
                className="inline-flex h-9 items-center rounded-[10px] px-3 text-[13px] font-semibold text-[#5A4A8A] transition hover:bg-[#F7F5FB] hover:text-[#3D2E6B]"
              >
                No prescription needed
              </button>
            </div>
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
            {unverifiedSources.map((m) => m.name || "an item").join(", ")}. Open
            the medication reference and confirm through another authoritative
            source.
          </p>
        )}

        {controlledMeds.length > 0 && (
          <div className="mt-3 rounded-xl border border-[#E9C3C3] bg-[#FDF4F4] px-4 py-3">
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#9B4A4A]">
              <Lock className="h-3.5 w-3.5" /> Controlled substance — restricted
              issuing workflow
            </p>
            <label className="mt-2 flex items-start gap-2.5 text-[12.5px] leading-relaxed text-[#5C3B3B]">
              <input
                type="checkbox"
                checked={!!rx.restrictedAcknowledgedAt}
                onChange={(e) =>
                  patch({
                    restrictedAcknowledgedAt: e.target.checked
                      ? Date.now()
                      : undefined,
                  })
                }
                className="mt-0.5 h-4 w-4 flex-none rounded border-[#D9D5E3] text-[#6E4FD3] focus:ring-[#6E4FD3]"
              />
              I will issue this medication on the official
              controlled-prescription form. The confirmation in Lubin is a record
              only and is not the legal signature.
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
              <span className="font-semibold">Required acknowledgement</span> — I
              am the prescribing clinician, I am authorised to prescribe in{" "}
              {JURISDICTION_LABEL[country]}, and I take clinical responsibility
              for every medication and direction in this prescription.
            </span>
          </label>
        </div>

        <StickyBar>
          <span className="mr-auto text-[12.5px] font-medium text-[#5A4A8A]">
            {verifiedCount} of {total} medications verified
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
            disabled={!canSign}
            onClick={() =>
              patch({ finalisedAt: Date.now(), finalisedBy: providerName })
            }
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
    return (
      <section className="text-[#2C2B4B]">
        {header}
        <button
          type="button"
          onClick={() => setReviewMedId(null)}
          className="mb-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#5A4A8A] hover:text-[#3D2E6B]"
        >
          <ChevronLeft className="h-4 w-4" /> All medications
        </button>
        {reviewMed.demo && <DemoNote />}
        <MedicationEditor
          med={reviewMed}
          country={country}
          onChange={(p) => updateMed(reviewMed.id, p)}
          onOpenReference={() => setRefMedId(reviewMed.id)}
          onAddClinicalInfo={onAddClinicalInfo}
        />
        <StickyBar>
          <span className="mr-auto text-[12.5px] font-medium text-[#5A4A8A]">
            {verifiedCount} of {total} medications verified
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
            disabled={!complete || reviewMed.approved}
            onClick={() => {
              updateMed(reviewMed.id, {
                approved: true,
                verifiedAt: Date.now(),
              });
              setReviewMedId(null);
            }}
            className="inline-flex h-9 items-center rounded-[10px] bg-[#6E4FD3] px-4 text-[13px] font-semibold text-white transition hover:bg-[#5A3EB8] disabled:cursor-not-allowed disabled:opacity-45"
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
          {verifiedCount} of {total} medications verified
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
        ) : (
          <button
            type="button"
            onClick={() => {
              const next = rx.medications.find((m) => !m.approved);
              if (next) setReviewMedId(next.id);
            }}
            className="inline-flex h-9 items-center rounded-[10px] bg-[#6E4FD3] px-4 text-[13px] font-semibold text-white transition hover:bg-[#5A3EB8]"
          >
            Review medication
          </button>
        )}
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
        onCached={(reference) => refMed && cacheReference(refMed.id, reference)}
        onExternallyVerified={() => refMed && markExternallyVerified(refMed.id)}
      />
    );
  }
}

/* ------------------------------ pieces ------------------------------ */

function StageBar({ stage, hideSign }: { stage: Stage; hideSign?: boolean }) {
  return (
    <ol className="flex items-center gap-1.5">
      {STAGES.map((label, i) => {
        if (i === 2 && hideSign) return null;
        const active = i === stage;
        const done = i < stage;
        return (
          <li key={label} className="flex items-center gap-1.5">
            {i > 0 && <span className="h-px w-4 bg-[#DEDAE8]" />}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
                active
                  ? "bg-[#6E4FD3] text-white"
                  : done
                    ? "bg-[#F1EDFA] text-[#5A3EB8]"
                    : "text-[#8C86A0]"
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

function StickyBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-[#E4E1EC] bg-white/95 px-4 py-3 backdrop-blur">
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

function checkSummary(med: PrescriptionMedication) {
  const rows = CHECK_ROWS.map((r) => med.checks?.[r.key]);
  const completed = rows.filter((c) => c?.status === "checked").length;
  const missing = CHECK_ROWS.length - completed;
  return { completed, missing };
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
  const { completed, missing } = checkSummary(med);
  const line = [med.route, med.frequency, med.duration]
    .filter((v) => v && v.trim())
    .join(" · ");
  return (
    <li className="rounded-xl border border-[#E4E1EC] bg-white px-4 py-3.5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-[#2C2B4B]">
            {hasName ? med.name : "Untitled medication"}
            {med.dose ? (
              <span className="font-normal text-[#3D2E6B]"> {med.dose}</span>
            ) : null}
          </p>
          {line && (
            <p className="mt-0.5 text-[12.5px] text-[#5A4A8A]">{line}</p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[11.5px] text-[#6F6889]">
              {med.origin === "manual"
                ? "Added by clinician"
                : "AI-prepared"}
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
                <span className="text-[11.5px] font-semibold text-[#6E4FD3]">
                  Demo data
                </span>
              </>
            )}
          </div>
          {hasName && (
            <p className="mt-1.5 text-[11.5px] text-[#6F6889]">
              {completed} checks completed
              {missing > 0 ? ` · ${missing} require information` : ""}
            </p>
          )}
        </div>
        <div className="flex flex-none flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onReview}
            className="inline-flex h-9 items-center rounded-[10px] border border-[#D9D5E3] bg-white px-3.5 text-[13px] font-semibold text-[#3D2E6B] transition hover:bg-[#F7F5FB]"
          >
            Review medication
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

function ReferenceButton({
  hasName,
  onClick,
}: {
  hasName: boolean;
  onClick: () => void;
}) {
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
      className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#D9D5E3] bg-white px-3.5 text-[13px] font-semibold text-[#3D2E6B] transition hover:bg-[#F7F5FB]"
    >
      <BookOpen className="h-4 w-4" /> View reference
    </button>
  );
}

function MedicationEditor({
  med,
  country,
  onChange,
  onOpenReference,
  onAddClinicalInfo,
}: {
  med: PrescriptionMedication;
  country: RxCountry;
  onChange: (p: Partial<PrescriptionMedication>) => void;
  onOpenReference: () => void;
  onAddClinicalInfo?: () => void;
}) {
  const [checksOpen, setChecksOpen] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);
  const hasName = med.name.trim().length > 0;
  const complete = useMemo(() => medComplete(med), [med]);
  const { completed, missing } = checkSummary(med);
  const edit = (p: Partial<PrescriptionMedication>) =>
    onChange({ ...p, approved: false, verifiedAt: undefined });

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      {/* Left — the prescription itself */}
      <div className="rounded-xl border border-[#E4E1EC] bg-white p-4">
        <h3 className="text-[13.5px] font-semibold text-[#2C2B4B]">
          Medication and directions
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label="Medication"
            value={med.name}
            onChange={(v) => edit({ name: v })}
            required
          />
          <Field
            label="Strength and formulation"
            value={med.strength ?? ""}
            onChange={(v) => edit({ strength: v })}
            placeholder="50 mg film-coated tablet"
          />
          <Field
            label="Dose"
            value={med.dose}
            onChange={(v) => edit({ dose: v })}
            required
          />
          <Field
            label="Route"
            value={med.route ?? ""}
            onChange={(v) => edit({ route: v })}
            placeholder="Oral"
          />
          <Field
            label="Frequency"
            value={med.frequency}
            onChange={(v) => edit({ frequency: v })}
            required
            placeholder="Once daily in the morning"
          />
          <Field
            label="Duration"
            value={med.duration ?? ""}
            onChange={(v) => edit({ duration: v })}
            placeholder="4 weeks"
          />
          <Field
            label="Quantity"
            value={med.quantity ?? ""}
            onChange={(v) => edit({ quantity: v })}
            placeholder="30 tablets"
          />
          <Field
            label="Refills"
            value={med.refills ?? ""}
            onChange={(v) => edit({ refills: v })}
            placeholder="No refills"
          />
          <div className="sm:col-span-2">
            <Field
              label="Indication"
              value={med.indication ?? ""}
              onChange={(v) => edit({ indication: v })}
              placeholder="Why this is being prescribed"
            />
          </div>
          <div className="sm:col-span-2">
            <FieldArea
              label="Patient instructions"
              value={med.instructions}
              onChange={(v) => edit({ instructions: v })}
              required
              placeholder="How to take it, when, what to do if a dose is missed"
            />
          </div>
        </div>

        <div className="mt-4 border-t border-[#EDEBF3] pt-3.5">
          <label className="flex items-start gap-2.5 text-[13px] leading-relaxed text-[#2C2B4B]">
            <input
              type="checkbox"
              checked={med.approved}
              disabled={!complete}
              onChange={(e) =>
                onChange({
                  approved: e.target.checked,
                  verifiedAt: e.target.checked ? Date.now() : undefined,
                })
              }
              className="mt-0.5 h-4 w-4 flex-none rounded border-[#D9D5E3] text-[#6E4FD3] focus:ring-[#6E4FD3] disabled:opacity-40"
            />
            <span>
              <span className="font-semibold">Verify medication</span>
              <span className="mt-0.5 block text-[12.5px] text-[#5A4A8A]">
                I reviewed the prescription details, safety information and
                patient-specific considerations.
              </span>
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
              {MED_VERIFICATION_STATEMENT} Any change to this medication resets
              the verification.
            </p>
          )}
          {!complete && (
            <p className="mt-1.5 pl-7 text-[12px] text-[#8A6A20]">
              Add medication, dose, frequency and patient instructions before
              verifying.
            </p>
          )}
        </div>
      </div>

      {/* Right — supporting information */}
      <div className="space-y-3">
        <Panel title="Why this medication was included">
          <p className="text-[12.5px] leading-relaxed text-[#3D2E6B]">
            {med.basis?.whyIncluded ??
              med.rationale ??
              (med.origin === "manual"
                ? "Added by the prescribing clinician."
                : "No rationale was recorded for this medication.")}
          </p>
          {med.basis?.clinicalInformationUsed && (
            <p className="mt-2 text-[12px] leading-relaxed text-[#5A4A8A]">
              {med.basis.clinicalInformationUsed}
            </p>
          )}
        </Panel>

        <Panel title="Patient-specific safety checks">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E7F6EF] px-2.5 py-1 text-[11.5px] font-semibold text-[#1F7A57]">
              <Check className="h-3.5 w-3.5" /> {completed} checks completed
            </span>
            {missing > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FBF2DF] px-2.5 py-1 text-[11.5px] font-semibold text-[#8A6A20]">
                <AlertTriangle className="h-3.5 w-3.5" /> {missing} require
                information
              </span>
            )}
            <button
              type="button"
              onClick={() => setChecksOpen((v) => !v)}
              className="ml-auto inline-flex items-center gap-1 text-[12px] font-semibold text-[#6E4FD3] hover:text-[#5A3EB8]"
            >
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${checksOpen ? "rotate-180" : ""}`}
              />
              {checksOpen ? "Hide details" : "Show details"}
            </button>
          </div>
          {checksOpen && (
            <ul className="mt-2.5 space-y-1.5 border-t border-[#EDEBF3] pt-2.5">
              {CHECK_ROWS.map((r) => (
                <CheckRow
                  key={r.key}
                  label={r.label}
                  check={med.checks?.[r.key]}
                />
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Missing clinical information">
          {med.checks?.missingInformation || med.basis?.missingInformation ? (
            <>
              <p className="text-[12.5px] leading-relaxed text-[#3D2E6B]">
                {med.checks?.missingInformation ??
                  med.basis?.missingInformation}
              </p>
              {onAddClinicalInfo && (
                <button
                  type="button"
                  onClick={onAddClinicalInfo}
                  className="mt-2 inline-flex h-8 items-center rounded-[10px] border border-[#D9D5E3] bg-white px-3 text-[12.5px] font-semibold text-[#3D2E6B] hover:bg-[#F7F5FB]"
                >
                  Add clinical information
                </button>
              )}
            </>
          ) : (
            <p className="text-[12.5px] text-[#5A4A8A]">
              Nothing outstanding for this medication.
            </p>
          )}
        </Panel>

        <Panel title="Interactions and contraindications">
          <p className="text-[12.5px] leading-relaxed text-[#3D2E6B]">
            {med.checks?.interactions?.detail ??
              "No interaction review is recorded for this medication."}
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#3D2E6B]">
            {med.checks?.contraindications?.detail ??
              "No contraindication review is recorded for this medication."}
          </p>
          {med.warnings && (
            <p className="mt-2 text-[12px] leading-relaxed text-[#5A4A8A]">
              {med.warnings}
            </p>
          )}
        </Panel>

        <Panel title="Medication reference">
          <p className="text-[12.5px] leading-relaxed text-[#5A4A8A]">
            Official prescribing information for {JURISDICTION_LABEL[country]},
            patient-specific considerations and the AI explanation, kept
            separate.
          </p>
          <div className="mt-2">
            <ReferenceButton hasName={hasName} onClick={onOpenReference} />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#E4E1EC] bg-white p-4">
      <h3 className="mb-2 text-[13px] font-semibold text-[#2C2B4B]">{title}</h3>
      {children}
    </section>
  );
}

function CheckRow({ label, check }: { label: string; check?: MedicationCheck }) {
  const ok = check?.status === "checked";
  return (
    <li className="flex items-start gap-1.5 text-[12.5px] leading-snug">
      {ok ? (
        <Check className="mt-[2px] h-3.5 w-3.5 flex-none text-[#1F7A57]" />
      ) : (
        <AlertTriangle className="mt-[2px] h-3.5 w-3.5 flex-none text-[#C08A2A]" />
      )}
      <span className="text-[#3D2E6B]">
        <span className="font-semibold">{label}:</span>{" "}
        {check?.detail ??
          "Unable to complete — required clinical information is missing."}
      </span>
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
        <h3 className="text-[13.5px] font-semibold text-[#2C2B4B]">
          Complete prescription
        </h3>
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-2">
          <Row label="Patient" value={clientName || "—"} />
          <Row label="Prescriber" value={providerName || "—"} />
          <Row label="Jurisdiction" value={JURISDICTION_LABEL[country]} />
          <Row
            label="Safety review"
            value={`${rx.medications.filter((m) => m.approved).length} of ${rx.medications.length} medications verified`}
          />
        </dl>
      </section>

      <section className="rounded-xl border border-[#E4E1EC] bg-white p-4">
        <h3 className="text-[13.5px] font-semibold text-[#2C2B4B]">
          Medications and directions
        </h3>
        <ul className="mt-3 space-y-3">
          {rx.medications.map((m) => (
            <li
              key={m.id}
              className="border-t border-[#EDEBF3] pt-3 first:border-t-0 first:pt-0"
            >
              <p className="text-[13.5px] font-semibold text-[#2C2B4B]">
                {m.name || "Untitled medication"} {m.dose}
              </p>
              <p className="mt-0.5 text-[12.5px] text-[#3D2E6B]">
                {[m.strength, m.route, m.frequency, m.duration]
                  .filter((v) => v && v.trim())
                  .join(" · ")}
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
      <input
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