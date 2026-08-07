import { Printer } from "lucide-react";
import logo from "@/assets/lubin-logo.svg";
import type { Prescription, RxCountry } from "@/lib/prescription/store";
import type { PrescriberIdentity } from "@/lib/prescription/credentials";
import { patientAge } from "@/lib/prescription/safety";
import { latestSignedPrescription } from "@/lib/prescription/documents";

const JURISDICTION_LABEL: Record<RxCountry, string> = {
  US: "United States",
  PH: "Philippines",
};

/**
 * Patient-facing copy of the prescription, presented as a full-page document
 * so the prescriber can read it exactly as the client will.
 */
export function EPrescriptionDocument({
  rx,
  country,
  clientName,
  providerName,
  identity,
  draft,
}: {
  rx: Prescription;
  country: RxCountry;
  clientName?: string;
  providerName?: string;
  identity: PrescriberIdentity;
  /** True when shown before signing, so the copy is clearly a preview. */
  draft?: boolean;
}) {
  const issued = rx.finalisedAt ? new Date(rx.finalisedAt) : new Date();
  const meds = rx.medications.filter((m) => m.name.trim().length > 0);
  const age = patientAge(rx.patientInfo);
  const doc = rx.documentId ? latestSignedPrescription(rx.appointmentId) : null;
  const controlled = meds.some((m) => m.controlled);
  const sex =
    rx.patientInfo?.sex && rx.patientInfo.sex !== "not-documented"
      ? rx.patientInfo.sex === "prefer-not-to-say"
        ? "Prefers not to say"
        : rx.patientInfo.sex.charAt(0).toUpperCase() + rx.patientInfo.sex.slice(1)
      : "Not documented";
  const dateLong = issued.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#F3F0FA] py-8 print:bg-white print:py-0">
      <div className="mx-auto w-full max-w-[820px] px-4 sm:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8A7FB0]">
              {draft ? "Preview" : "Issued document"}
            </p>
            <h1 className="text-[19px] font-bold text-[#2C2B4B]">
              What {clientName || "the client"} receives
            </h1>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-[#D9D5E3] bg-white px-4 text-[13px] font-semibold text-[#3D2E6B] hover:bg-[#FBFAFE]"
          >
            <Printer className="h-4 w-4" /> Print or save as PDF
          </button>
        </div>

        {draft && (
          <p className="mb-5 rounded-[14px] border border-[#DCD3F5] bg-[#F1ECFD] px-4 py-3 text-[12.5px] leading-relaxed text-[#3D2E6B] print:hidden">
            Preview only. The client receives this copy once you sign and issue the
            prescription.
          </p>
        )}

        <article className="relative overflow-hidden rounded-[24px] border border-[#E4E1EC] bg-white shadow-[0_24px_60px_-32px_rgba(61,46,107,0.45)] print:rounded-none print:border-0 print:shadow-none">
          {/* Header */}
          <header className="relative overflow-hidden bg-[#3D2E6B] px-7 py-7 text-white">
            <span
              aria-hidden
              className="pointer-events-none absolute -right-6 -top-10 select-none font-serif text-[170px] leading-none text-white/10"
            >
              ℞
            </span>
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div>
                <img
                  src={logo}
                  alt="Lubin"
                  className="h-7 w-auto brightness-0 invert"
                />
                <p className="mt-2 text-[12px] text-white/70">
                  {identity.clinicName || "Lubin care team"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">
                  E-prescription
                </p>
                <p className="mt-1 text-[15px] font-semibold">{dateLong}</p>
                {doc && (
                  <p className="mt-1 font-mono text-[12px] text-white/70">{doc.number}</p>
                )}
              </div>
            </div>
            <div className="relative mt-6 flex flex-wrap items-end gap-x-8 gap-y-3 border-t border-white/15 pt-5">
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white/60">
                  Patient
                </p>
                <p className="text-[18px] font-bold leading-tight">
                  {clientName || "—"}
                </p>
                <p className="text-[12px] text-white/70">
                  {age !== null ? `${age} years` : "Age not documented"} · {sex}
                </p>
              </div>
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white/60">
                  Prescriber
                </p>
                <p className="text-[14px] font-semibold leading-tight">
                  {[identity.fullName || providerName || "—", identity.qualifications]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                <p className="text-[12px] text-white/70">
                  Issued in {JURISDICTION_LABEL[country]}
                </p>
              </div>
            </div>
          </header>

          {/* Medications */}
          <section className="px-7 py-7">
            <div className="flex items-center gap-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A7FB0]">
                Your medication{meds.length > 1 ? "s" : ""}
              </h2>
              <span className="h-px flex-1 bg-[#EDEBF3]" />
            </div>
            {meds.length === 0 ? (
              <p className="mt-3 text-[13px] text-[#6F6889]">
                No medication has been added yet.
              </p>
            ) : (
              <ol className="mt-4 space-y-5">
                {meds.map((m, i) => (
                  <li
                    key={m.id}
                    className="relative overflow-hidden rounded-[18px] border border-[#EAE5F6] bg-[#FBFAFE] p-5"
                  >
                    <span className="absolute left-0 top-0 h-full w-1 bg-[#6E4FD3]" />
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#EFE8FB] text-[11.5px] font-bold leading-none text-[#3D2E6B]">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[16px] font-bold leading-snug text-[#2C2B4B]">
                          {m.genericName || m.name} {m.strength || m.dose}
                        </p>
                        {m.genericName && m.genericName !== m.name && (
                          <p className="mt-0.5 text-[12.5px] text-[#6F6889]">
                            Brand name: {m.name}
                          </p>
                        )}
                        {m.controlled && (
                          <p className="mt-2 inline-flex rounded-full bg-[#EFE8FB] px-2.5 py-1 text-[11px] font-semibold text-[#3D2E6B]">
                            {country === "PH"
                              ? "Dangerous drug — official S2 form"
                              : "Controlled substance — DEA authority"}
                          </p>
                        )}
                      </div>
                    </div>

                    <p className="mt-4 rounded-[14px] border border-[#E4DDF5] bg-white px-4 py-3 text-[13.5px] leading-relaxed text-[#3D2E6B]">
                      <span className="font-semibold">How to take it: </span>
                      {m.instructions || "Follow your prescriber's directions."}
                    </p>

                    <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <Stat label="When" value={m.frequency || "As directed"} />
                      <Stat label="How long" value={m.duration || "As directed"} />
                      <Stat label="Quantity" value={m.quantity || "Not specified"} />
                      <Stat label="Refills" value={m.refills || "None"} />
                    </dl>

                    {m.indication && (
                      <p className="mt-3 text-[12.5px] text-[#5A4A8A]">
                        Prescribed for: {m.indication}
                      </p>
                    )}
                    {m.warnings && (
                      <p className="mt-3 rounded-[14px] bg-[#F1ECFD] px-4 py-3 text-[12.5px] leading-relaxed text-[#3D2E6B]">
                        <span className="font-semibold">Good to know: </span>
                        {m.warnings}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* Details */}
          <section className="border-t border-[#EDEBF3] bg-[#FCFBFE] px-7 py-6">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A7FB0]">
              Prescription details
            </h2>
            <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-2.5 text-[12.5px] sm:grid-cols-2">
              <Line label="Date issued" value={dateLong} />
              {doc && <Line label="Prescription no." value={doc.number} />}
              <Line label="Clinic" value={identity.clinicName || "Not on file"} />
              <Line label="Clinic address" value={identity.clinicAddress || "Not on file"} />
              <Line label="Contact" value={identity.clinicContact || "Not on file"} />
              {country === "PH" ? (
                <>
                  <Line label="PRC no." value={identity.prcNumber || "Not on file"} />
                  <Line label="PTR no." value={identity.ptrNumber || "Not on file"} />
                  {controlled && (
                    <Line label="S2 licence no." value={identity.s2Number || "Not on file"} />
                  )}
                </>
              ) : (
                <>
                  <Line label="NPI no." value={identity.npiNumber || "Not on file"} />
                  {controlled && (
                    <Line label="DEA no." value={identity.deaNumber || "Not on file"} />
                  )}
                </>
              )}
              <Line
                label="Where to collect"
                value={rx.delivery?.destination || "Given to you directly"}
              />
            </dl>
          </section>

          {/* Signature */}
          <footer className="border-t border-[#EDEBF3] px-7 py-6">
            <div className="rounded-[16px] border border-[#E4E1EC] bg-white px-5 py-4">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#8A7FB0]">
                Signature
              </p>
              <p className="mt-1.5 text-[13px] font-semibold text-[#2C2B4B]">
                {rx.finalisedAt
                  ? `Authenticated signature — ${rx.finalisedBy || identity.fullName || providerName || "your prescriber"}${identity.qualifications ? `, ${identity.qualifications}` : ""}`
                  : "This copy is not signed yet."}
              </p>
              {rx.finalisedAt && (
                <p className="mt-1 text-[12px] text-[#6F6889]">
                  {issued.toLocaleString()}
                  {rx.signature ? ` · ${rx.signature.credentials}` : ""}
                </p>
              )}
            </div>
            <p className="mt-4 text-[12px] leading-relaxed text-[#6F6889]">
              Take your medication exactly as written above. If something does not feel
              right, or you have questions about a dose, message your prescriber through
              Lubin. If you feel unsafe or need urgent help, contact local emergency
              services.
            </p>
          </footer>
        </article>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-[#EAE5F6] bg-white px-3 py-2.5">
      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#8A7FB0]">
        {label}
      </dt>
      <dd className="mt-1 text-[12.5px] font-semibold leading-snug text-[#2C2B4B]">
        {value}
      </dd>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="min-w-[110px] shrink-0 text-[#8A7FB0]">{label}</dt>
      <dd className="font-medium text-[#2C2B4B]">{value}</dd>
    </div>
  );
}
