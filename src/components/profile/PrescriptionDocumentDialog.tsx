import { useEffect, useState } from "react";
import { Printer, ExternalLink, X, Ban, ShieldAlert } from "lucide-react";

import { EPrescriptionDocument } from "@/components/appointment/EPrescriptionDocument";
import PatientAvatar from "@/components/profile/PatientAvatar";
import {
  loadPrescription,
  PREGNANCY_STATUS_LABEL,
  type Prescription,
} from "@/lib/prescription/store";
import { stashPrescriptionView } from "@/lib/prescription/viewHandoff";
import { loadIdentity, type PrescriberIdentity } from "@/lib/prescription/credentials";
import {
  type SignedPrescriptionDocument,
} from "@/lib/prescription/documents";

/**
 * In-app viewer for a signed prescription file. Both the prescriber and the
 * patient open the same immutable document here — no need to leave the
 * Prescriptions tab. Printing and opening a standalone tab stay available.
 */
export default function PrescriptionDocumentDialog({
  doc,
  onClose,
}: {
  doc: SignedPrescriptionDocument;
  onClose: () => void;
}) {
  const [rx, setRx] = useState<Prescription | null>(null);
  const [identity, setIdentity] = useState<PrescriberIdentity | null>(null);

  useEffect(() => {
    setRx(loadPrescription(doc.appointmentId));
    setIdentity(loadIdentity(doc.identity?.fullName));
  }, [doc.appointmentId, doc.identity?.fullName]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /** Opaque route id — nothing about the patient or prescription is in the URL. */
  const standaloneHref = (() => {
    const id = stashPrescriptionView({
      appointmentId: doc.appointmentId,
      country: doc.country,
      clientName: doc.patientName,
      providerName: doc.identity?.fullName,
      docId: doc.id,
      document: doc,
    });
    return `/e-prescription/${id}`;
  })();

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#2C2B4B]/60 p-0 backdrop-blur-sm sm:p-6">
      <div className="mx-auto flex h-full w-full max-w-[900px] flex-col overflow-hidden rounded-none bg-[#F3F0FA] shadow-2xl sm:rounded-2xl">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#E3DBF5] bg-white px-5 py-3 print:hidden">
          <div className="min-w-0">
            <p className="font-mono text-[12px] font-semibold text-[#3D2E6B]">
              {doc.number}
            </p>
            <p className="text-[12px] text-[#6F6889]">
              {doc.patientName || "Patient"} ·{" "}
              {doc.country === "PH" ? "Philippines" : "United States"}
              {doc.voided ? " · Voided" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#DCD4F0] px-3 text-[12.5px] font-semibold text-[#3D2E6B] transition hover:bg-[#F5F1FE]"
            >
              <Printer className="h-3.5 w-3.5" /> Print / save PDF
            </button>
            <a
              href={standaloneHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#DCD4F0] px-3 text-[12.5px] font-semibold text-[#3D2E6B] transition hover:bg-[#F5F1FE]"
            >
              Open in new tab <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close prescription"
              className="grid h-9 w-9 place-items-center rounded-xl bg-[#3D2E6B] text-white transition hover:bg-[#33265A]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {rx && identity ? (
            <>
              <PatientRecordPanel doc={doc} rx={rx} />
              <EPrescriptionDocument
              rx={rx}
              country={doc.country}
              clientName={doc.patientName}
              providerName={doc.identity?.fullName}
              identity={identity}
              />
            </>
          ) : (
            <p className="p-8 text-center text-[13.5px] text-[#6F6889]">
              Loading the prescription…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Patient profile + prescription details shown above the document itself, so a
 * provider or patient sees who the prescription is for and its current status
 * without opening the session. Hidden when printing — the printed output is the
 * legal prescription only.
 */
function PatientRecordPanel({
  doc,
  rx,
}: {
  doc: SignedPrescriptionDocument;
  rx: Prescription;
}) {
  const info = rx.patientInfo ?? {};
  const meds = doc.medications.filter((m) => (m.name ?? "").trim().length > 0);
  const allergies =
    (info.allergyEntries ?? [])
      .map((a) => `${a.name}${a.reaction ? ` (${a.reaction})` : ""}`)
      .join(", ") ||
    (info.allergies ?? "").trim() ||
    (info.allergyState === "none-known" ? "None known" : "Not documented");
  const current =
    (info.medicationEntries ?? [])
      .map((m) => `${m.name}${m.strength ? ` ${m.strength}` : ""}`)
      .join(", ") ||
    (info.currentMedications ?? "").trim() ||
    (info.medicationState === "none-known" ? "None known" : "Not documented");
  const conditions =
    (info.conditionEntries ?? []).map((c) => c.name).join(", ") ||
    (info.conditions ?? "").trim() ||
    (info.conditionState === "none-known" ? "None known" : "Not documented");

  return (
    <div className="space-y-4 p-5 print:hidden sm:p-6">
      <div className="rounded-2xl border border-[#E3DBF5] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <PatientAvatar
              name={doc.patientName}
              photoUrl={doc.patientPhotoUrl}
              size={40}
            />
            <div>
              <p className="text-[15px] font-bold text-[#3D2E6B]">
                {doc.patientName || "Patient"}
              </p>
              <p className="text-[11.5px] text-[#8A7FB0]">
                Patient profile on this prescription
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {doc.voided ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F3F0FA] px-2.5 py-1 text-[11px] font-semibold text-[#5B4B8A]">
                <Ban className="h-3.5 w-3.5" /> Voided — not dispensable
              </span>
            ) : (
              <span className="rounded-full bg-[#EEF7F0] px-2.5 py-1 text-[11px] font-semibold text-[#2F6B45]">
                Issued
              </span>
            )}
            {doc.controlled && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FDF6E7] px-2.5 py-1 text-[11px] font-semibold text-[#6B4E10]">
                <ShieldAlert className="h-3.5 w-3.5" />
                {doc.country === "PH" ? "Dangerous drug" : "Controlled substance"}
              </span>
            )}
          </div>
        </div>

        <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-3">
          <Field label="Date of birth" value={formatDob(info.dob)} />
          <Field
            label="Age"
            value={
              doc.patientAgeYears != null
                ? `${doc.patientAgeYears} years`
                : info.ageYears != null
                  ? `${info.ageYears} years`
                  : "Not on file"
            }
          />
          <Field
            label="Sex"
            value={info.sex && info.sex !== "not-documented" ? info.sex : "Not documented"}
          />
          <Field
            label="Address"
            value={(info.address ?? "").trim() || "Not on file"}
            wide
          />
          <Field
            label="Pregnancy / lactation"
            value={
              info.pregnancyStatus
                ? PREGNANCY_STATUS_LABEL[info.pregnancyStatus]
                : "Not documented"
            }
          />
          <Field label="Allergies" value={allergies} wide />
          <Field label="Current medications" value={current} wide />
          <Field label="Relevant conditions" value={conditions} wide />
        </dl>
      </div>

      <div className="rounded-2xl border border-[#E3DBF5] bg-white p-5">
        <p className="text-[13.5px] font-bold text-[#3D2E6B]">Prescription details</p>
        <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-3">
          <Field label="Rx number" value={doc.number} mono />
          <Field label="Date issued" value={formatDateTime(doc.signedAt)} />
          <Field
            label={doc.validityLabel || "Valid until"}
            value={doc.validUntil ? formatDate(doc.validUntil) : "Not applicable"}
          />
          <Field
            label="Prescriber"
            value={doc.identity?.fullName || doc.signedBy || "—"}
          />
          <Field
            label="Jurisdiction"
            value={doc.country === "PH" ? "Philippines" : "United States"}
          />
          <Field label="Authentication" value={doc.authenticationMethod || "—"} />
          {doc.delivery && (
            <Field
              label="Delivery"
              value={`${doc.delivery.method} · ${doc.delivery.state}${doc.delivery.destination ? ` · ${doc.delivery.destination}` : ""}`}
              wide
            />
          )}
          {doc.voided && (
            <Field
              label="Void reason"
              value={`${doc.voided.reason} · ${formatDateTime(doc.voided.at)}`}
              wide
            />
          )}
        </dl>

        <ol className="mt-4 space-y-2">
          {meds.map((m, i) => (
            <li
              key={`${m.name}-${i}`}
              className="rounded-xl border border-[#EDEBF3] bg-[#FBFAFE] px-4 py-3"
            >
              <p className="text-[13px] font-bold text-[#2C2B4B]">
                {i + 1}. {m.genericName || m.name}
                {m.strength ? ` ${m.strength}` : ""}
              </p>
              <p className="mt-0.5 text-[12px] text-[#6F6889]">
                {[m.dose, m.frequency, m.route, m.duration, m.quantity]
                  .filter(Boolean)
                  .join(" · ") || "See prescription below"}
              </p>
            </li>
          ))}
        </ol>
      </div>

      <p className="text-[11.5px] text-[#8A7FB0]">
        The prescription file below is the legal document — it is what prints and
        downloads.
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  wide,
  mono,
}: {
  label: string;
  value: string;
  wide?: boolean;
  mono?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-3" : undefined}>
      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#A89BD0]">
        {label}
      </dt>
      <dd
        className={`mt-0.5 text-[13px] text-[#2C2B4B] ${mono ? "font-mono font-semibold text-[#3D2E6B]" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

function formatDob(dob?: string): string {
  if (!dob) return "Not on file";
  const d = new Date(dob);
  return Number.isNaN(d.getTime()) ? dob : formatDate(d.getTime());
}

function formatDate(at: number): string {
  return new Date(at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(at: number): string {
  return new Date(at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}