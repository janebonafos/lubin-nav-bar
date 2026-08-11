import { AlertTriangle, Printer } from "lucide-react";
import logo from "@/assets/lubin-logo.svg";
import type { Prescription, RxCountry } from "@/lib/prescription/store";
import type { PrescriberIdentity } from "@/lib/prescription/credentials";
import { patientAge } from "@/lib/prescription/safety";
import { latestSignedPrescription } from "@/lib/prescription/documents";
import {
  formatDob,
  patientLegalGaps,
  prescriberPrintGaps,
  refillCount,
  refillNote,
  requiresPhSpecialForm,
} from "@/lib/prescription/legal";

const JURISDICTION_LABEL: Record<RxCountry, string> = {
  US: "United States",
  PH: "Philippines",
};

/**
 * The patient's copy of the prescription. It carries the legal prescription
 * layer (identifiers, credentials, structured refills, signature metadata)
 * alongside plain-language guidance. In the United States this document is the
 * patient copy — it is not the electronic prescription transmitted to a
 * pharmacy.
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
  const dob = formatDob(rx.patientInfo);
  const address = (rx.patientInfo?.address ?? "").trim();
  const doc = rx.documentId ? latestSignedPrescription(rx.appointmentId) : null;
  const controlled = meds.some((m) => m.controlled);
  const specialForm = requiresPhSpecialForm(meds, country);
  const prescriberGaps = prescriberPrintGaps(identity, country, controlled);
  const patientGaps = patientLegalGaps({
    info: rx.patientInfo,
    patientName: clientName,
    country,
  });
  const prescriberName =
    [identity.fullName || providerName || "—", identity.qualifications]
      .filter(Boolean)
      .join(", ");
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
  const signedStamp = rx.finalisedAt
    ? issued.toLocaleString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      })
    : null;
  const signed = !!rx.finalisedAt;
  /** A signed prescription never prints "Required before signing": signing is
   *  blocked while credentials are incomplete, so missing values are omitted. */
  const printed = (value?: string) => {
    const text = (value ?? "").trim();
    if (text) return text;
    return signed ? null : REQUIRED;
  };

  return (
    <div className="min-h-screen bg-[#F3F0FA] py-8 print:bg-white print:py-0">
      <div className="mx-auto w-full max-w-[820px] px-4 sm:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8A7FB0]">
              {draft ? "Preview" : "Issued document"}
            </p>
            <h1 className="text-[19px] font-bold text-[#2C2B4B]">
              Patient prescription copy
            </h1>
            <p className="text-[12.5px] text-[#6F6889]">
              What {clientName || "the client"} receives.
            </p>
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
          <p className="mb-4 rounded-[14px] border border-[#DCD3F5] bg-[#F1ECFD] px-4 py-3 text-[12.5px] leading-relaxed text-[#3D2E6B] print:hidden">
            Preview only. The client receives this copy once you sign and issue the
            prescription.
          </p>
        )}

        {draft && specialForm.length > 0 && (
          <Notice
            title="Special prescription required"
            lines={[
              `${specialForm.map((m) => m.genericName || m.name).join(", ")} is a dangerous drug in the Philippines and cannot be issued in the standard Lubin e-prescription format.`,
              "Since 21 July 2023 these prescriptions must be written on the official special prescription form. Continue through the special-prescription process instead of issuing this copy.",
            ]}
          />
        )}

        {draft && patientGaps.length > 0 && (
          <Notice
            title="Patient information incomplete"
            lines={[
              `Record ${patientGaps.join(", ").toLowerCase()} before signing.`,
              "Required fields cannot remain blank on an issued prescription.",
            ]}
          />
        )}

        {draft && prescriberGaps.length > 0 && (
          <Notice
            title="Prescriber information incomplete"
            lines={[
              `Complete ${prescriberGaps.join(", ")} before signing.`,
              country === "PH"
                ? "A Philippine prescription must print your clinic details, PRC and PTR numbers."
                : "A United States prescription must print your practice address, state licence and NPI.",
            ]}
          />
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
                <p className="mt-1 font-mono text-[12px] text-white/70">
                  {doc ? `Rx # ${doc.number}` : "Rx # assigned when signed"}
                </p>
              </div>
            </div>
            <div className="relative mt-6 grid gap-x-8 gap-y-4 border-t border-white/15 pt-5 sm:grid-cols-2">
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white/60">
                  Patient
                </p>
                <p className="text-[18px] font-bold leading-tight">
                  {clientName || "—"}
                </p>
                <p className="text-[12px] text-white/70">
                  DOB:{" "}
                  {dob
                    ? `${dob}${age !== null ? ` (${age} years)` : ""}`
                    : age !== null
                      ? `not documented · estimated age ${age} years`
                      : "not documented"}
                </p>
                {(country === "US" || address) && (
                  <p className="text-[12px] text-white/70">
                    Address: {address || "not documented"}
                  </p>
                )}
                <p className="text-[12px] text-white/70">Sex: {sex}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white/60">
                  Prescriber
                </p>
                <p className="text-[14px] font-semibold leading-tight">
                  {prescriberName}
                </p>
                <p className="text-[12px] text-white/70">
                  {country === "PH"
                    ? identity.prcNumber
                      ? `PRC ${identity.prcNumber}`
                      : "Credentials incomplete"
                    : identity.npiNumber
                      ? `NPI ${identity.npiNumber}`
                      : "Credentials incomplete"}
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
                              ? "Dangerous drug — official special prescription form required"
                              : "Controlled substance — DEA registration and EPCS signing required"}
                          </p>
                        )}
                      </div>
                    </div>

                    <p className="mt-4 rounded-[14px] border border-[#E4DDF5] bg-white px-4 py-3 text-[13.5px] leading-relaxed text-[#3D2E6B]">
                      <span className="font-semibold">How to take it: </span>
                      {m.instructions || "Follow your prescriber's directions."}
                    </p>

                    <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <Stat label="Route" value={m.route || "As directed"} />
                      <Stat label="Frequency" value={m.frequency || "As directed"} />
                      <Stat label="Duration" value={m.duration || "As directed"} />
                      <Stat label="Quantity" value={m.quantity || "Not specified"} />
                      <Stat
                        label="Refills"
                        value={String(refillCount(m.refills))}
                        note={refillNote(m.refills)}
                      />
                      {m.indication && (
                        <Stat label="Indication" value={m.indication} />
                      )}
                    </dl>

                    {m.warnings && (
                      <div className="mt-4 rounded-[14px] bg-[#F1ECFD] px-4 py-3 text-[12.5px] leading-relaxed text-[#3D2E6B]">
                        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#6A5AA0]">
                          Important medication information
                        </p>
                        <p className="mt-1.5">{m.warnings}</p>
                      </div>
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
              <Line
                label="Rx no."
                value={doc ? doc.number : "Assigned when the prescription is signed"}
              />
              {country === "PH" ? (
                <>
                  <Line
                    label="Practice / clinic name"
                    value={identity.clinicName.trim() || (signed ? null : "Optional")}
                  />
                  <Line
                    label="Professional / practice address"
                    value={printed(identity.clinicAddress)}
                  />
                  <Line label="Professional contact" value={printed(identity.clinicContact)} />
                  <Line label="PRC no." value={printed(identity.prcNumber)} />
                  <Line label="PTR no." value={printed(identity.ptrNumber)} />
                  {controlled && (
                    <Line label="S2 licence no." value={printed(identity.s2Number)} />
                  )}
                </>
              ) : (
                <>
                  <Line
                    label="Practice / clinic name"
                    value={identity.clinicName.trim() || (signed ? null : "Optional")}
                  />
                  <Line
                    label="Professional / practice address"
                    value={printed(identity.clinicAddress)}
                  />
                  <Line label="Professional contact" value={printed(identity.clinicContact)} />
                  <Line
                    label="State licence"
                    value={
                      identity.licenseNumber
                        ? `${identity.licenseNumber}${identity.licenseState ? ` · ${identity.licenseState}` : ""}`
                        : printed(identity.licenseNumber)
                    }
                  />
                  <Line label="NPI no." value={printed(identity.npiNumber)} />
                  {controlled && (
                    <Line label="DEA no." value={printed(identity.deaNumber)} />
                  )}
                </>
              )}
              <Line
                label="Pharmacy"
                value={rx.delivery?.destination || "Given to you directly"}
              />
            </dl>
          </section>

          {/* Signature */}
          <footer className="border-t border-[#EDEBF3] px-7 py-6">
            <div className="rounded-[16px] border border-[#E4E1EC] bg-white px-5 py-4">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#8A7FB0]">
                {rx.finalisedAt ? "Electronically signed by" : "Electronic signature"}
              </p>
              {signed ? (
                <>
                  <p className="mt-1.5 text-[13px] font-semibold text-[#2C2B4B]">
                    {withDoctorTitle(
                      identity.fullName || rx.finalisedBy || providerName || "your prescriber",
                    )}
                    {identity.qualifications ? `, ${identity.qualifications}` : ""}
                  </p>
                  <p className="mt-1 text-[12px] text-[#6F6889]">
                    {signedStamp}
                  </p>
                  {doc && (
                    <p className="mt-1 font-mono text-[12px] text-[#6F6889]">
                      Rx # {doc.number}
                    </p>
                  )}
                  {rx.signature?.credentials && (
                    <p className="mt-1 text-[12px] text-[#6F6889]">
                      {rx.signature.credentials}
                    </p>
                  )}
                  {rx.signature?.methodLabel && (
                    <p className="mt-1 text-[12px] text-[#6F6889]">
                      {rx.signature.methodLabel}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-1.5 text-[13px] font-semibold text-[#2C2B4B]">
                  This copy is not signed yet.
                </p>
              )}
            </div>
            <p className="mt-4 text-[12px] leading-relaxed text-[#6F6889]">
              Take your medication exactly as written above. If something does not feel
              right, or you have questions about a dose, message your prescriber through
              Lubin. If you feel unsafe or need urgent help, contact local emergency
              services.
            </p>
            {country === "US" && (
              <p className="mt-2 text-[12px] leading-relaxed text-[#6F6889]">
                This is your prescription copy. The prescription itself is sent to your
                pharmacy as structured electronic prescription data through the
                e-prescribing network; a printed or emailed copy of this page is not the
                electronic prescription.
              </p>
            )}
          </footer>
        </article>
      </div>
    </div>
  );
}

const REQUIRED = "Required before signing";

/** The signed copy names the verified prescriber; it is never hand-entered. */
function withDoctorTitle(name: string): string {
  return /^(dr\.?|doctor)\b/i.test(name.trim()) ? name.trim() : `Dr. ${name.trim()}`;
}

function Notice({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="mb-4 flex gap-3 rounded-[14px] border border-[#F0D9A8] bg-[#FDF6E7] px-4 py-3 text-[12.5px] leading-relaxed text-[#6B4E10]">
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
      <div>
        <p className="font-semibold">{title}</p>
        {lines.map((l) => (
          <p key={l} className="mt-1">
            {l}
          </p>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-[12px] border border-[#EAE5F6] bg-white px-3 py-2.5">
      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#8A7FB0]">
        {label}
      </dt>
      <dd className="mt-1 text-[12.5px] font-semibold leading-snug text-[#2C2B4B]">
        {value}
        {note && (
          <span className="mt-1 block text-[11.5px] font-normal leading-relaxed text-[#6F6889]">
            {note}
          </span>
        )}
      </dd>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <dt className="min-w-[110px] shrink-0 text-[#8A7FB0]">{label}</dt>
      <dd
        className={
          value === REQUIRED ? "font-medium text-[#B0741A]" : "font-medium text-[#2C2B4B]"
        }
      >
        {value}
      </dd>
    </div>
  );
}
