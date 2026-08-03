import { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  Check,
  ShieldCheck,
  AlertTriangle,
  Trash2,
  Plus,
  Printer,
  Lock,
  Info,
  BookOpen,
  Columns3,
  FileSignature,
  ChevronDown,
  ClipboardList,
} from "lucide-react";
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
import { CompareOptionsDrawer } from "./CompareOptionsDrawer";
import {
  DRAFT_STATUS_BODY,
  MED_VERIFICATION_STATEMENT,
} from "@/lib/prescription/reference";
import { DEMO_BANNER } from "@/lib/prescription/demo";


const JURISDICTION_LABEL: Record<RxCountry, string> = {
  US: "United States",
  PH: "Philippines",
};

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
  const [rx, setRx] = useState<Prescription>(() => loadPrescription(appointmentId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refMedId, setRefMedId] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  // Prescriptions are optional — the clinician opts in per appointment.
  const [started, setStarted] = useState(false);
  // Only a deliberate "Prepare draft" asks the AI for a draft.
  const [autoDraft, setAutoDraft] = useState(false);

  useEffect(() => {
    setRx(loadPrescription(appointmentId));
    return subscribePrescription(() => setRx(loadPrescription(appointmentId)));
  }, [appointmentId]);

  const patch = (p: Partial<Prescription>) => setRx(updatePrescription(appointmentId, p));
  const country: RxCountry = rx.country ?? jurisdiction ?? "PH";

  const verifiedCount = rx.medications.filter((m) => m.approved).length;
  const total = rx.medications.length;
  const allVerified = total > 0 && verifiedCount === total;
  const signed = !!rx.finalisedAt;
  const reviewed = !!rx.reviewedAt;
  const controlledMeds = rx.medications.filter((m) => m.controlled);
  const active =
    started || signed || rx.medications.length > 0 || !!rx.generatedAt;

  const generate = async () => {
    setBusy(true);
    setError(null);
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
      if (!res.ok) {
        setError(data.error ?? "Could not prepare a draft. Please try again.");
        return;
      }
      const ws2 = loadWorkspace(appointmentId);
      const missingInformation = missingClinicalInfo(ws2);
      const meds: PrescriptionMedication[] = (data.medications ?? []).map((m) => ({
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
      }));
      patch({
        medications: meds,
        clinicalNotes: data.clinicalNotes,
        country: data.country ?? country,
        missingInformation: meds.length === 0 ? missingInformation : undefined,
        generatedAt: Date.now(),
        reviewedAt: undefined,
        restrictedAcknowledgedAt: undefined,
        finalisedAt: undefined,
        finalisedBy: undefined,
      });
    } catch (e) {
      console.error(e);
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  /** Any medication-field change resets that medication's verification and
   *  any completed whole-prescription review. */
  const updateMed = (id: string, p: Partial<PrescriptionMedication>) => {
    const meds = rx.medications.map((m) => (m.id === id ? { ...m, ...p } : m));
    const isVerificationToggle =
      Object.keys(p).length === 1 && "approved" in p;
    patch({
      medications: meds,
      ...(isVerificationToggle ? {} : { reviewedAt: undefined }),
    });
  };
  const removeMed = (id: string) =>
    patch({
      medications: rx.medications.filter((m) => m.id !== id),
      reviewedAt: undefined,
    });
  const addMed = () =>
    patch({
      medications: [
        ...rx.medications,
        {
          id: genRxId(),
          name: "",
          dose: "",
          route: "Oral",
          frequency: "",
          instructions: "",
          origin: "manual",
          approved: false,
        },
      ],
      reviewedAt: undefined,
    });

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
          ? { ...m, externallyVerifiedAt: m.externallyVerifiedAt ? undefined : Date.now() }
          : m,
      ),
    });

  const unverifiedSources = rx.medications.filter(
    (m) => m.reference && !m.reference.sourcesAvailable && !m.externallyVerifiedAt,
  );
  const restrictedPending =
    controlledMeds.length > 0 && !rx.restrictedAcknowledgedAt;
  const canSign =
    allVerified && reviewed && unverifiedSources.length === 0 && !restrictedPending;
  const refMed = rx.medications.find((m) => m.id === refMedId) ?? null;

  // The AI draft is prepared automatically — the clinician validates it.
  const autoRef = useRef<string | null>(null);
  useEffect(() => {
    if (!autoDraft) return;
    if (autoRef.current === appointmentId) return;
    const existing = loadPrescription(appointmentId);
    autoRef.current = appointmentId;
    if (existing.generatedAt || existing.medications.length > 0) return;
    void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId, autoDraft]);

  const missingList = rx.missingInformation ?? [];

  if (rx.skippedAt && !active) {
    return (
      <section className="rounded-2xl border border-[#ECE7F6] bg-white px-4 py-4">
        <p className="text-[13px] font-semibold text-[#3D2E6B]">
          No prescription needed for this appointment
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#7E6BAF]">
          Recorded {new Date(rx.skippedAt).toLocaleString()}.
        </p>
        <button
          type="button"
          onClick={() => patch({ skippedAt: undefined })}
          className="mt-3 inline-flex items-center gap-1.5 rounded-[12px] border border-[#D6CCEC] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#3D2E6B] transition hover:bg-[#F7F4FB]"
        >
          Undo
        </button>
      </section>
    );
  }

  if (!active) {
    return (
      <section className="overflow-hidden rounded-2xl border border-[#ECE7F6] bg-white">
        <div className="flex items-center justify-between border-b border-[#ECE7F6] px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[#2C2B4B]">Prescriptions</h2>
            <p className="mt-0.5 text-[13px] text-[#7E6BAF]">
              Optional. Add medication only if clinically indicated.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full border border-[#E2D7F3] bg-[#F4EEFC] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#3D2E6B]">
            Optional
          </span>
        </div>
        <div className="flex flex-wrap gap-2 p-5">
          <button
            type="button"
            onClick={() => {
              setAutoDraft(true);
              setStarted(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-[12px] bg-[#3D2E6B] px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-[#2C2B4B]"
          >
            Prepare draft
          </button>
          <button
            type="button"
            onClick={() => {
              setStarted(true);
              addMed();
            }}
            className="inline-flex items-center gap-1.5 rounded-[12px] border border-[#D6CCEC] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#3D2E6B] transition hover:bg-[#F7F4FB]"
          >
            <Plus className="h-4 w-4" /> Add manually
          </button>
          <button
            type="button"
            onClick={() => patch({ skippedAt: Date.now() })}
            className="inline-flex items-center gap-1.5 rounded-[12px] px-3 py-2 text-[13px] font-semibold text-[#7E6BAF] transition hover:bg-[#F7F4FB] hover:text-[#5A3E8F]"
          >
            No prescription needed
          </button>
        </div>
      </section>
    );
  }


  return (
    <section className="overflow-hidden rounded-2xl border border-[#ECE7F6] bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#ECE7F6] bg-white px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-[#2C2B4B]">Prescriptions</h2>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#7E6BAF]">
              Jurisdiction:
            </span>
            <span className="inline-flex items-center rounded-md border border-[#E2D7F3] bg-[#F4EEFC] px-2 py-0.5 text-[11px] font-medium text-[#3D2E6B]">
              {JURISDICTION_LABEL[country]}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!signed && (
            <button
              type="button"
              onClick={addMed}
              className="inline-flex h-9 items-center gap-1.5 rounded-[12px] border border-[#D6CCEC] bg-white px-3.5 text-[13px] font-semibold text-[#3D2E6B] transition hover:bg-[#F7F4FB]"
            >
              <Plus className="h-4 w-4" /> Add medication
            </button>
          )}
        </div>
      </div>

      {/* Soft informational banner */}
      {missingList.length > 0 && total === 0 && (
        <div className="flex items-center gap-3 border-b border-[#EFE9F9] bg-[#FAF7FE] px-5 py-3">
          <Info className="h-4 w-4 flex-none text-[#8B7BC0]" />
          <p className="text-[13px] font-medium text-[#5A4A8A]">
            Clinical information required before finalizing the prescription order.
          </p>
          {onAddClinicalInfo && (
            <button
              type="button"
              onClick={onAddClinicalInfo}
              className="ml-auto inline-flex h-8 items-center whitespace-nowrap rounded-[10px] border border-[#D6CCEC] bg-white px-3 text-[12px] font-semibold text-[#3D2E6B] transition hover:bg-[#F4EEFC]"
            >
              Add information
            </button>
          )}
        </div>
      )}

      <div className="space-y-4 p-5">
        {rx.demo && (
          <p className="flex items-start gap-1.5 rounded-[12px] border border-[#E2D7F3] bg-[#FAF7FE] px-3 py-2 text-[11px] font-semibold leading-snug text-[#5A3E8F]">
            <Info className="mt-[1px] h-3.5 w-3.5 flex-none" />
            {DEMO_BANNER}
          </p>
        )}

        {/* Draft status helper */}
        {!signed && total > 0 && (
          <p className="text-[12px] leading-relaxed text-[#7E6BAF]">
            {DRAFT_STATUS_BODY}
          </p>
        )}

        {/* Error */}
        {error && (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}

        {/* Busy state */}
        {total === 0 && busy && (
          <div className="flex items-center gap-2.5 rounded-xl border border-[#E1D9F1] bg-[#FCFAFE] px-3.5 py-3">
            <Loader2 className="h-4 w-4 flex-none animate-spin text-[#7E6BAF]" />
            <p className="text-[13px] leading-snug text-[#3D2E6B]">
              <span className="font-medium">Preparing draft…</span>
              <span className="text-[#7E6BAF]">
                {" "}
                — you will review and verify each medication.
              </span>
            </p>
          </div>
        )}

        {/* Empty state */}
        {total === 0 && !busy && (
          <div className="rounded-xl border-2 border-dashed border-[#E2D7F3] p-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF7FE]">
              <img
                src={rxIcon.url}
                alt=""
                aria-hidden="true"
                className="h-6 w-6 opacity-40"
              />
            </div>
            <h3 className="text-sm font-medium text-[#2C2B4B]">
              No medications added yet
            </h3>
            <p className="mt-1 text-sm text-[#7E6BAF]">
              Click the button above to manually add or search for a prescription.
            </p>
          </div>
        )}

        {/* Medication list */}
        {total > 0 && (
          <ul className="space-y-3">
            {rx.medications.map((m, i) => (
              <MedicationCard
                key={m.id}
                index={i}
                med={m}
                locked={signed}
                onChange={(p) => updateMed(m.id, p)}
                onRemove={() => removeMed(m.id)}
                onOpenReference={() => setRefMedId(m.id)}
                onAddClinicalInfo={onAddClinicalInfo}
              />
            ))}
          </ul>
        )}

        {/* Review the complete prescription */}
        {total > 0 && !signed && (
          <div className="rounded-2xl border border-[#ECE7F6] bg-[#FCFAFE] p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#7E6BAF]">
              Review the prescription
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-[#5A4A8A]">
              {reviewed
                ? `Reviewed ${new Date(rx.reviewedAt!).toLocaleString()}. Any change to a medication reopens this review.`
                : `Verify each medication individually, then review the prescription as a whole. ${verifiedCount} of ${total} verified.`}
            </p>
            {unverifiedSources.length > 0 && (
              <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-[#5A3E8F]">
                <AlertTriangle className="mt-[1px] h-3.5 w-3.5 flex-none" />
                Official prescribing information is unavailable for{" "}
                {unverifiedSources.map((m) => m.name || "an item").join(", ")}.
                Open the medication reference and confirm verification through
                another authoritative source.
              </p>
            )}
            <button
              type="button"
              disabled={!allVerified || reviewed}
              onClick={() => patch({ reviewedAt: Date.now() })}
              className="mt-3 inline-flex items-center gap-1.5 rounded-[12px] border border-[#D6CCEC] bg-white px-4 py-2 text-sm font-semibold text-[#3D2E6B] transition hover:bg-[#F7F4FB] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {reviewed ? (
                <>
                  <Check className="h-4 w-4 text-[#2D8E69]" /> Prescription
                  reviewed
                </>
              ) : (
                <>
                  <ClipboardList className="h-4 w-4" /> Review prescription
                </>
              )}
            </button>
          </div>
        )}

        {/* Controlled substances — separate restricted workflow */}
        {controlledMeds.length > 0 && !signed && (
          <div className="rounded-2xl border border-[#D8C7F0] bg-white p-4">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#5A3E8F]">
              <Lock className="h-3.5 w-3.5" /> Restricted workflow · controlled
              substance
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#3D2E6B]">
              {controlledMeds.map((m) => m.name || "This medication").join(", ")}{" "}
              {controlledMeds.length > 1 ? "are" : "is"} a controlled substance
              in {JURISDICTION_LABEL[country]}
              {controlledMeds[0]?.controlledLabel
                ? ` (${controlledMeds[0].controlledLabel})`
                : ""}
              . It cannot be issued with the standard confirmation below. It must
              be issued on the official controlled-prescription form and signed
              there.
            </p>
            <label className="mt-3 flex items-start gap-2.5 text-[12px] leading-relaxed text-[#3D2E6B]">
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
                className="mt-0.5 h-4 w-4 flex-none rounded border-[#D6CCEC] text-[#7E6BAF] focus:ring-[#7E6BAF]"
              />
              I will issue this medication on the official
              controlled-prescription form. I understand the confirmation in
              Lubin is a record only and is not the legal signature.
            </label>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[#ECE7F6] bg-[#FAF7FE] px-5 py-4">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-tight text-[#A89BD0]">
              Status
            </span>
            <span className="text-sm font-medium text-[#3D2E6B]">
              {signed ? "Signed and issued" : "Drafting"}
            </span>
          </div>
          <div className="h-8 w-[1px] bg-[#E2D7F3]"></div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-tight text-[#A89BD0]">
              Provider
            </span>
            <span className="text-sm font-medium text-[#3D2E6B]">
              {providerName || "—"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {signed ? (
            <>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex h-9 items-center gap-1.5 rounded-[12px] border border-[#D6CCEC] bg-white px-3.5 text-[13px] font-semibold text-[#5A4A8A] hover:bg-[#F7F4FB]"
              >
                <Printer className="h-4 w-4" /> Print
              </button>
              <button
                type="button"
                onClick={() =>
                  patch({
                    finalisedAt: undefined,
                    finalisedBy: undefined,
                    reviewedAt: undefined,
                  })
                }
                className="inline-flex h-9 items-center gap-1.5 rounded-[12px] border border-[#D6CCEC] bg-white px-3.5 text-[13px] font-semibold text-[#5A4A8A] hover:bg-[#F7F4FB]"
              >
                <Lock className="h-4 w-4" /> Unlock
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() =>
                patch({ finalisedAt: Date.now(), finalisedBy: providerName })
              }
              disabled={!canSign}
              className="inline-flex h-9 items-center justify-center rounded-[12px] bg-[#3D2E6B] px-4 text-[13px] font-semibold text-white transition hover:bg-[#2C2B4B] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sign and issue
            </button>
          )}
        </div>
      </div>

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
      <CompareOptionsDrawer
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        medications={rx.medications}
        country={country}
        appointmentId={appointmentId}
        clientName={clientName}
        onCached={cacheReference}
        onSelectOption={(medId) =>
          patch({
            medications: rx.medications.map((m) =>
              m.id === medId ? { ...m, origin: "ai-option" } : m,
            ),
          })
        }
      />
    </section>
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

const CHECK_ROWS: {
  key: keyof Omit<NonNullable<PrescriptionMedication["checks"]>, "missingInformation">;
  label: string;
}[] = [
  { key: "allergies", label: "Allergies checked" },
  { key: "currentMedications", label: "Current medications checked" },
  { key: "interactions", label: "Interactions checked" },
  { key: "contraindications", label: "Contraindications checked" },
  { key: "conditions", label: "Relevant medical conditions checked" },
];

function CheckRow({ label, check }: { label: string; check?: MedicationCheck }) {
  const ok = check?.status === "checked";
  return (
    <li className="flex items-start gap-1.5 text-[12px] leading-snug">
      {ok ? (
        <Check className="mt-[2px] h-3.5 w-3.5 flex-none text-[#2D8E69]" />
      ) : (
        <AlertTriangle className="mt-[2px] h-3.5 w-3.5 flex-none text-[#7E6BAF]" />
      )}
      <span className={ok ? "text-[#5A4A8A]" : "text-[#3D2E6B]"}>
        <span className="font-semibold">{label}:</span>{" "}
        {check?.detail ??
          "Unable to complete — required clinical information is missing."}
      </span>
    </li>
  );
}

function MedicationCard({
  index,
  med,
  locked,
  onChange,
  onRemove,
  onOpenReference,
  onAddClinicalInfo,
}: {
  index: number;
  med: PrescriptionMedication;
  locked: boolean;
  onChange: (p: Partial<PrescriptionMedication>) => void;
  onRemove: () => void;
  onOpenReference: () => void;
  onAddClinicalInfo?: () => void;
}) {
  const [checksOpen, setChecksOpen] = useState(false);
  const hasName = med.name.trim().length > 0;
  const missing = useMemo(
    () =>
      !hasName ||
      !med.dose.trim() ||
      !med.frequency.trim() ||
      !med.instructions.trim(),
    [hasName, med],
  );
  const manual = (med.origin ?? "ai") === "manual";
  const incompleteChecks = CHECK_ROWS.filter(
    (r) => med.checks?.[r.key]?.status !== "checked",
  );

  return (
    <li
      className={`overflow-hidden rounded-2xl border transition ${
        med.approved
          ? "border-[#B5E4CD] bg-gradient-to-br from-[#F1FBF6] to-white"
          : "border-[#ECE7F6] bg-white"
      }`}
    >
      <div className="flex flex-wrap items-center gap-3 border-b border-[#ECE7F6]/70 px-4 py-3">
        <span
          className={`flex h-8 w-8 flex-none items-center justify-center rounded-full text-[11px] font-bold ${
            med.approved
              ? "bg-[#D7F0E3] text-[#2D8E69]"
              : "bg-[#EEE8F8] text-[#5A3E8F]"
          }`}
        >
          {med.approved ? <Check className="h-4 w-4" /> : `Rx${index + 1}`}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#3D2E6B]">
            {med.name || "New medication"}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            {!med.approved && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#E2D7F3] bg-[#FAF7FE] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#5A3E8F]">
                Verification required
              </span>
            )}
            {med.approved && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#B5E4CD] bg-[#E6F8F1] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#2D8E69]">
                Verified
              </span>
            )}
            {med.demo && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#E2D7F3] bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#7E6BAF]">
                Demo data
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenReference}
          disabled={!hasName}
          title={
            hasName
              ? undefined
              : "Enter a medication name to open its reference"
          }
          className="inline-flex flex-none items-center gap-1 rounded-[10px] border border-[#D6CCEC] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[#5A4A8A] hover:bg-[#F7F4FB] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <BookOpen className="h-3.5 w-3.5" /> Reference
        </button>
        {!locked && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1 rounded-[10px] px-2 py-1 text-[11px] font-semibold text-[#7E6BAF] hover:bg-[#F7F4FB] hover:text-[#5A3E8F]"
            aria-label="Remove medication"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Compact patient-specific checks */}
      <div className="border-b border-[#ECE7F6]/70 bg-[#FCFAFE] px-4 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            {manual ? (
              <p className="text-[12px] leading-snug text-[#5A4A8A]">
                Please confirm safety checks before verifying.
              </p>
            ) : incompleteChecks.length > 0 ? (
              <p className="text-[12px] leading-snug text-[#5A4A8A]">
                Some clinical information is missing for this medication.
              </p>
            ) : (
              <p className="flex items-start gap-1.5 text-[12px] leading-snug text-[#2D6E56]">
                <Check className="mt-[2px] h-3.5 w-3.5 flex-none text-[#2D8E69]" />
                Patient-specific safety checks completed.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setChecksOpen((v) => !v)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#7E6BAF] hover:text-[#5A3E8F]"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${checksOpen ? "rotate-180" : ""}`}
            />
            {checksOpen ? "Hide" : "View checks"}
          </button>
        </div>
        {checksOpen && (
          <ul className="mt-2 space-y-1 border-t border-[#F1ECF9] pt-2">
            {CHECK_ROWS.map((r) => (
              <CheckRow key={r.key} label={r.label} check={med.checks?.[r.key]} />
            ))}
            {incompleteChecks.length > 0 && onAddClinicalInfo && (
              <li className="pt-1">
                <button
                  type="button"
                  onClick={onAddClinicalInfo}
                  className="text-[11px] font-semibold text-[#6E4FD3] hover:text-[#5A3E8F]"
                >
                  Add missing clinical information
                </button>
              </li>
            )}
          </ul>
        )}
      </div>


      <div className="grid grid-cols-1 gap-3 px-4 py-4 md:grid-cols-2">
        <Field
          label="Medication name"
          value={med.name}
          onChange={(v) => onChange({ name: v, approved: false })}
          locked={locked}
          required
        />
        <Field
          label="Generic name"
          value={med.genericName ?? ""}
          onChange={(v) => onChange({ genericName: v, approved: false })}
          locked={locked}
        />
        <Field
          label="Dose"
          value={med.dose}
          onChange={(v) => onChange({ dose: v, approved: false })}
          locked={locked}
          required
        />
        <Field
          label="Route"
          value={med.route ?? ""}
          onChange={(v) => onChange({ route: v, approved: false })}
          locked={locked}
          placeholder="Oral"
        />
        <Field
          label="Frequency"
          value={med.frequency}
          onChange={(v) => onChange({ frequency: v, approved: false })}
          locked={locked}
          required
          placeholder="Once daily at bedtime"
        />
        <Field
          label="Duration"
          value={med.duration ?? ""}
          onChange={(v) => onChange({ duration: v, approved: false })}
          locked={locked}
          placeholder="4 weeks"
        />
        <div className="md:col-span-2">
          <Field
            label="Indication"
            value={med.indication ?? ""}
            onChange={(v) => onChange({ indication: v, approved: false })}
            locked={locked}
            placeholder="Why this is being prescribed"
          />
        </div>
        <div className="md:col-span-2">
          <FieldArea
            label="Patient instructions"
            value={med.instructions}
            onChange={(v) => onChange({ instructions: v, approved: false })}
            locked={locked}
            required
            placeholder="How to take it, when, what to do if a dose is missed"
          />
        </div>
        <div className="md:col-span-2">
          <FieldArea
            label="Warnings & side effects to discuss"
            value={med.warnings ?? ""}
            onChange={(v) => onChange({ warnings: v, approved: false })}
            locked={locked}
            placeholder="Common side effects, red flags, interactions, when to call"
          />
        </div>
      </div>

      {/* Individual verification */}
      {!locked && (
        <div
          className={`border-t px-4 py-3 ${
            med.approved
              ? "border-[#B5E4CD] bg-[#F1FBF6]"
              : "border-[#ECE7F6] bg-[#FCFAFE]"
          }`}
        >
          <label className="flex items-start gap-2.5 text-[12px] leading-relaxed text-[#3D2E6B]">
            <input
              type="checkbox"
              checked={med.approved}
              disabled={missing}
              onChange={(e) =>
                onChange({
                  approved: e.target.checked,
                  verifiedAt: e.target.checked ? Date.now() : undefined,
                })
              }
              className="mt-0.5 h-4 w-4 flex-none rounded border-[#D6CCEC] text-[#7E6BAF] focus:ring-[#7E6BAF] disabled:opacity-40"
            />
            <span>
              <span className="font-semibold">Verify medication</span> —{" "}
              {MED_VERIFICATION_STATEMENT}
              {med.approved && med.verifiedAt && (
                <span className="block text-[11px] text-[#2D8E69]">
                  Verified {new Date(med.verifiedAt).toLocaleString()}
                </span>
              )}
            </span>
          </label>
          <p className="mt-1.5 pl-7 text-[11px] leading-snug text-[#8B85A6]">
            {missing
              ? "Fill in name, dose, frequency and patient instructions before verifying."
              : "Changing any field on this medication resets this verification."}
          </p>
        </div>
      )}
    </li>
  );
}


function Field({
  label,
  value,
  onChange,
  placeholder,
  locked,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  locked?: boolean;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wider text-[#7E6BAF]">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      <input
        value={value}
        readOnly={locked}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-[#ECE7F6] bg-white px-2.5 py-1.5 text-sm text-[#3D2E6B] placeholder:text-[#B0A8CD] focus:border-[#7E6BAF] focus:outline-none focus:ring-2 focus:ring-[#7E6BAF]/20 read-only:bg-[#FCFAFE] read-only:text-[#5A4A8A]"
      />
    </div>
  );
}

function FieldArea({
  label,
  value,
  onChange,
  placeholder,
  locked,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  locked?: boolean;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wider text-[#7E6BAF]">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      <textarea
        value={value}
        readOnly={locked}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="mt-1 w-full resize-y rounded-lg border border-[#ECE7F6] bg-white px-2.5 py-1.5 text-sm leading-relaxed text-[#3D2E6B] placeholder:text-[#B0A8CD] focus:border-[#7E6BAF] focus:outline-none focus:ring-2 focus:ring-[#7E6BAF]/20 read-only:bg-[#FCFAFE] read-only:text-[#5A4A8A]"
      />
    </div>
  );
}
