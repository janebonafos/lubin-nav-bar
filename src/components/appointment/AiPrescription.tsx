import { useEffect, useMemo, useState } from "react";
import {
  Pill,
  Sparkles,
  Loader2,
  Check,
  ShieldCheck,
  AlertTriangle,
  Trash2,
  Plus,
  RefreshCw,
  Printer,
  Lock,
  Globe,
  Info,
} from "lucide-react";
import {
  loadPrescription,
  savePrescription,
  subscribePrescription,
  updatePrescription,
  genRxId,
  type Prescription,
  type PrescriptionMedication,
  type RxCountry,
} from "@/lib/prescription/store";
import { loadWorkspace } from "@/lib/visit-workspace/store";

export function AiPrescription({
  appointmentId,
  clientName,
  providerName,
  appointmentLabel,
}: {
  appointmentId: string;
  clientName?: string;
  providerName?: string;
  appointmentLabel?: string;
}) {
  const [rx, setRx] = useState<Prescription>(() => loadPrescription(appointmentId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRx(loadPrescription(appointmentId));
    return subscribePrescription(() => setRx(loadPrescription(appointmentId)));
  }, [appointmentId]);

  const patch = (p: Partial<Prescription>) => setRx(updatePrescription(appointmentId, p));
  const country: RxCountry = rx.country ?? "US";

  const approvedCount = rx.medications.filter((m) => m.approved).length;
  const total = rx.medications.length;
  const allApproved = total > 0 && approvedCount === total;
  const finalised = !!rx.finalisedAt;

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
        setError(data.error ?? "Could not generate. Please try again.");
        return;
      }
      const meds: PrescriptionMedication[] = (data.medications ?? []).map((m) => ({
        ...m,
        id: genRxId(),
        approved: false,
      }));
      patch({
        medications: meds,
        clinicalNotes: data.clinicalNotes,
        country: data.country ?? country,
        generatedAt: Date.now(),
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

  const updateMed = (id: string, p: Partial<PrescriptionMedication>) =>
    patch({
      medications: rx.medications.map((m) => (m.id === id ? { ...m, ...p } : m)),
    });
  const removeMed = (id: string) =>
    patch({ medications: rx.medications.filter((m) => m.id !== id) });
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
          approved: false,
        },
      ],
    });
  const finalise = () =>
    patch({ finalisedAt: Date.now(), finalisedBy: providerName });
  const unlock = () =>
    patch({ finalisedAt: undefined, finalisedBy: undefined });

  return (
    <section className="overflow-hidden rounded-2xl border border-[#ECE7F6] bg-white">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ECE7F6] bg-[#FAF7FE] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[10px] bg-[#EEE8F8] text-[#5A3E8F]">
            <Pill className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[#3D2E6B]">
              Prescription draft
            </h2>
            <p className="text-[12px] leading-snug text-[#5A4A8A]">
              Create a draft from this visit&rsquo;s notes or add medications
              manually. You remain the prescribing clinician.
            </p>
          </div>
        </div>
        {finalised ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#B5E4CD] bg-[#E6F8F1] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#2D8E69]">
            <ShieldCheck className="h-3.5 w-3.5" /> Finalised
          </span>
        ) : total > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E2D7F3] bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#7E6BAF]">
            {approvedCount}/{total} approved
          </span>
        ) : null}
      </div>

      <div className="space-y-3 px-4 py-4">
        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={generate}
            disabled={busy || finalised}
            className="inline-flex items-center gap-1.5 rounded-[12px] bg-gradient-to-r from-[#7E6BAF] to-[#5A3E8F] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : total > 0 ? (
              <RefreshCw className="h-4 w-4" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {total > 0 ? "Regenerate draft" : "Generate AI draft"}
          </button>
          {!finalised && (
            <button
              type="button"
              onClick={addMed}
              className="inline-flex items-center gap-1 rounded-[12px] border border-[#D6CCEC] bg-white px-3 py-2 text-sm font-semibold text-[#5A4A8A] hover:bg-[#F7F4FB]"
            >
              <Plus className="h-4 w-4" /> Add manually
            </button>
          )}
          {rx.generatedAt && (
            <span className="text-[11px] text-[#8B85A6]">
              Drafted {new Date(rx.generatedAt).toLocaleString()}
            </span>
          )}
        </div>

        {error && (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}

        {/* Inline caution */}
        {!finalised && (
          <p className="flex items-start gap-1.5 text-[12px] leading-snug text-[#7E6BAF]">
            <AlertTriangle className="mt-[1px] h-3.5 w-3.5 flex-none" />
            Verify dose, frequency, interactions, contraindications, and
            allergies before approval.
          </p>
        )}

        {/* Medications */}
        {total === 0 ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-[#E1D9F1] bg-[#FCFAFE] px-3.5 py-3">
            <Pill className="h-4 w-4 flex-none text-[#A89BD0]" />
            <p className="text-[13px] leading-snug text-[#3D2E6B]">
              <span className="font-medium">No prescription drafted yet</span>
              <span className="text-[#7E6BAF]">
                {" "}
                — generate a draft or add a medication manually.
              </span>
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {rx.medications.map((m, i) => (
              <MedicationCard
                key={m.id}
                index={i}
                med={m}
                locked={finalised}
                onChange={(p) => updateMed(m.id, p)}
                onRemove={() => removeMed(m.id)}
              />
            ))}
          </ul>
        )}

        {rx.clinicalNotes && (
          <div className="rounded-xl border border-[#ECE7F6] bg-[#FCFAFE] p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#7E6BAF]">
              AI clinical notes
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[#5A4A8A]">
              {rx.clinicalNotes}
            </p>
          </div>
        )}

        {/* Finalise */}
        {total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#ECE7F6] bg-gradient-to-r from-[#FCFAFE] to-white p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#EEE8F8] text-[#5A3E8F]">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#3D2E6B]">
                  {finalised
                    ? "Prescription finalised"
                    : allApproved
                      ? "Ready to finalise"
                      : "Approve every medication to finalise"}
                </p>
                <p className="text-xs text-[#7E6BAF]">
                  {finalised
                    ? `Signed off ${new Date(rx.finalisedAt!).toLocaleString()}${rx.finalisedBy ? ` · ${rx.finalisedBy}` : ""}`
                    : `${approvedCount} of ${total} approved`}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {finalised && (
                <>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1 rounded-[12px] border border-[#D6CCEC] bg-white px-3 py-1.5 text-sm font-semibold text-[#5A4A8A] hover:bg-[#F7F4FB]"
                  >
                    <Printer className="h-4 w-4" /> Print
                  </button>
                  <button
                    type="button"
                    onClick={unlock}
                    className="inline-flex items-center gap-1 rounded-[12px] border border-[#D6CCEC] bg-white px-3 py-1.5 text-sm font-semibold text-[#5A4A8A] hover:bg-[#F7F4FB]"
                  >
                    <Lock className="h-4 w-4" /> Unlock to edit
                  </button>
                </>
              )}
              {!finalised && (
                <button
                  type="button"
                  onClick={finalise}
                  disabled={!allApproved}
                  className="inline-flex items-center gap-1.5 rounded-[12px] bg-gradient-to-r from-[#3D2E6B] to-[#2C2B4B] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Check className="h-4 w-4" /> Finalise prescription
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function MedicationCard({
  index,
  med,
  locked,
  onChange,
  onRemove,
}: {
  index: number;
  med: PrescriptionMedication;
  locked: boolean;
  onChange: (p: Partial<PrescriptionMedication>) => void;
  onRemove: () => void;
}) {
  const missing = useMemo(
    () => !med.name.trim() || !med.dose.trim() || !med.frequency.trim() || !med.instructions.trim(),
    [med],
  );
  return (
    <li
      className={`overflow-hidden rounded-2xl border transition ${
        med.approved
          ? "border-[#B5E4CD] bg-gradient-to-br from-[#F1FBF6] to-white"
          : "border-[#ECE7F6] bg-white"
      }`}
    >
      <div className="flex items-center gap-3 border-b border-[#ECE7F6]/70 px-4 py-3">
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
            {med.name || "Untitled medication"}
          </p>
          <p className="truncate text-[11px] text-[#7E6BAF]">
            {[med.dose, med.frequency].filter(Boolean).join(" · ") || "Fill in dose and frequency"}
          </p>
        </div>
        {!locked && (
          <>
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] font-semibold text-[#3D2E6B]">
              <input
                type="checkbox"
                checked={med.approved}
                disabled={missing}
                onChange={(e) => onChange({ approved: e.target.checked })}
                className="h-4 w-4 rounded border-[#D6CCEC] text-[#7E6BAF] focus:ring-[#7E6BAF] disabled:opacity-40"
              />
              Approve
            </label>
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex items-center gap-1 rounded-[10px] px-2 py-1 text-[11px] font-semibold text-[#7E6BAF] hover:bg-[#F7F4FB] hover:text-[#5A3E8F]"
              aria-label="Remove medication"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
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
            label="Patient-facing instructions"
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

      {!locked && missing && (
        <div className="border-t border-[#ECE7F6] bg-[#FCFAFE] px-4 py-2 text-[11px] text-[#7E6BAF]">
          Fill in name, dose, frequency, and patient instructions to enable
          approval.
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