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
  const timeZone =
    typeof Intl !== "undefined"
      ? (Intl.DateTimeFormat().resolvedOptions().timeZone ?? "")
      : "";
  /** Traceability identifier for this document, independent of the Rx number. */
  const documentId = doc?.id || rx.documentId || null;
  const rxNumber = doc ? doc.number : null;
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
                ? "A Philippine prescription must print your professional address, contact details, PRC and PTR numbers. Complete these in your Lubin prescribing verification."
                : "A United States prescription must print your professional address, contact details, state licence and NPI. Complete these in your Lubin prescribing verification.",
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
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">
                  Prescription
                </p>
                <p className="mt-1 text-[13px] text-white/80">
                  {identity.clinicName.trim() || "Lubin care team"} ·{" "}
                  {JURISDICTION_LABEL[country]}
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
                  Rx no.
                </p>
                <p className="mt-1 font-mono text-[20px] font-bold leading-none tracking-tight">
                  {rxNumber ?? "—"}
                </p>
                <p className="mt-2 text-[11.5px] text-white/70">
                  {rxNumber ? `Date issued ${dateLong}` : "Assigned when signed"}
                </p>
                <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-white/55">
                  Document ID {documentId ?? "pending"}
                </p>
              </div>
            </div>
          </header>

          {/* Identity grid */}
          <section className="grid gap-5 border-b border-[#EDEBF3] px-7 py-7 sm:grid-cols-2 sm:gap-6">
            <div className="rounded-[16px] border border-[#EAE5F6] bg-[#FCFBFE] p-5">
              <h2 className="border-b border-[#EAE5F6] pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#A79FC4]">
                Patient information
              </h2>
              <p className="mt-3 text-[18px] font-bold leading-tight text-[#2C2B4B]">
                {clientName || "—"}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-[13px] text-[#6F6889]">
                {age !== null && <span>{age} years old</span>}
                {age !== null && <span className="text-[#D9D5E3]">|</span>}
                <span>{sex}</span>
              </div>
              <p className="mt-1 text-[12px] text-[#8A7FB0]">
                DOB: {dob || "not documented"}
              </p>
              {(country === "US" || address) && (
                <p className="mt-0.5 text-[12px] text-[#8A7FB0]">
                  Address: {address || "not documented"}
                </p>
              )}
            </div>
            <div className="rounded-[16px] border border-[#EAE5F6] bg-[#FCFBFE] p-5">
              <h2 className="border-b border-[#EAE5F6] pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#A79FC4]">
                Prescribing professional
              </h2>
              <p className="mt-3 text-[14px] font-bold text-[#2C2B4B]">
                {prescriberName}
              </p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-[#6F6889]">
                {country === "PH"
                  ? identity.prcNumber
                    ? `PRC ${identity.prcNumber}${identity.ptrNumber ? ` | PTR ${identity.ptrNumber}` : ""}`
                    : "Credentials incomplete"
                  : identity.npiNumber
                    ? `NPI ${identity.npiNumber}${identity.licenseNumber ? ` | Licence ${identity.licenseNumber}` : ""}`
                    : "Credentials incomplete"}
                {identity.clinicAddress.trim() && (
                  <>
                    <br />
                    {identity.clinicAddress.trim()}
                  </>
                )}
                <br />
                Issued in {JURISDICTION_LABEL[country]}
              </p>
              {identity.clinicContact.trim() && (
                <p className="mt-1 text-[11.5px] font-medium text-[#6E4FD3]">
                  {identity.clinicContact.trim()}
                </p>
              )}
            </div>
          </section>

          {/* Medications */}
          <section className="px-7 py-7">
            <div className="flex items-center gap-3">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A79FC4]">
                Prescribed medication{meds.length > 1 ? "s" : ""}
                {meds.length > 0 ? ` (${meds.length})` : ""}
              </h2>
              <span className="h-px flex-1 bg-[#EDEBF3]" />
            </div>
            {meds.length === 0 ? (
              <p className="mt-3 text-[13px] text-[#6F6889]">
                No medication has been added yet.
              </p>
            ) : (
              <ol className="mt-4 space-y-6">
                {meds.map((m, i) => (
                  <li
                    key={m.id}
                    className="relative overflow-hidden rounded-[18px] border border-[#EAE5F6] bg-[#FBFAFE] p-6"
                  >
                    <span className="absolute right-0 top-0 rounded-bl-[10px] bg-[#EFE8FB] px-3 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#3D2E6B]">
                      Item {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="flex flex-wrap items-start justify-between gap-4 pr-16">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6E4FD3]">
                          Generic name
                        </p>
                        <p className="mt-1 text-[19px] font-bold leading-snug text-[#2C2B4B]">
                          {m.genericName || m.name}
                        </p>
                        {m.genericName && m.genericName !== m.name && (
                          <p className="text-[12.5px] text-[#6F6889]">
                            Brand name: {m.name}
                          </p>
                        )}
                      </div>
                      <div className="sm:text-right">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#A79FC4]">
                          Quantity
                        </p>
                        <p className="mt-1 text-[17px] font-bold text-[#2C2B4B]">
                          {m.quantity || "Not specified"}
                        </p>
                      </div>
                    </div>
                    {m.controlled && (
                      <p className="mt-3 inline-flex rounded-full bg-[#EFE8FB] px-2.5 py-1 text-[11px] font-semibold text-[#3D2E6B]">
                        {country === "PH"
                          ? "Dangerous drug — official special prescription form required"
                          : "Controlled substance — DEA registration and EPCS signing required"}
                      </p>
                    )}

                    <dl className="mt-5 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
                      <Stat label="Strength" value={m.strength || m.dose || "As directed"} />
                      <Stat label="Route" value={m.route || "As directed"} />
                      <Stat label="Frequency" value={m.frequency || "As directed"} />
                      <Stat label="Duration" value={m.duration || "As directed"} />
                    </dl>

                    <div className="mt-5 border-t border-[#EAE5F6] pt-5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#A79FC4]">
                        Patient instructions
                      </p>
                      <p className="mt-2 rounded-[12px] border border-[#E4DDF5] bg-white px-4 py-3 text-[13.5px] italic leading-relaxed text-[#3D2E6B]">
                        {m.instructions || "Follow your prescriber's directions."}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[11.5px] text-[#6F6889]">
                        <span>
                          <span className="font-bold uppercase tracking-[0.1em] text-[#A79FC4]">
                            Refills:{" "}
                          </span>
                          {refillCount(m.refills)}
                        </span>
                        {m.indication && (
                          <span>
                            <span className="font-bold uppercase tracking-[0.1em] text-[#A79FC4]">
                              Indication:{" "}
                            </span>
                            {m.indication}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-[11.5px] leading-relaxed text-[#6F6889]">
                        {refillNote(m.refills)}
                      </p>
                    </div>

                    {m.warnings && (
                      <details className="group mt-4 border-l-2 border-[#DCD3F5] pl-4">
                        <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6A5AA0] print:hidden">
                          Important medication information
                        </summary>
                        <p className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6A5AA0] print:block">
                          Important medication information
                        </p>
                        <p className="mt-2 text-[12px] leading-relaxed text-[#6F6889] print:block">
                          {m.warnings}
                        </p>
                      </details>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* Details */}
          <section className="border-t border-[#EDEBF3] bg-[#FCFBFE] px-7 py-6">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#A79FC4]">
              Prescription details
            </h2>
            <dl className="mt-3 grid grid-cols-1 gap-x-10 gap-y-2 text-[12px] sm:grid-cols-2">
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
          <footer className="grid gap-6 border-t border-[#EDEBF3] px-7 py-6 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="max-w-sm space-y-2 text-[11.5px] leading-relaxed text-[#6F6889]">
              <p>
                Take this exactly as written. Questions or side effects — message your
                prescriber in Lubin. Urgent help — contact local emergency services.
              </p>
              {country === "US" && (
                <p>
                  Your copy only — the prescription is sent electronically to your pharmacy.
                </p>
              )}
              <p className="text-[10px] text-[#A79FC4]">
                Computer-generated document. The prescriber's identity is verified through
                Lubin's prescribing verification.
              </p>
            </div>
            <div className="rounded-[16px] border border-[#E4E1EC] bg-white px-5 py-4 sm:min-w-[300px] sm:text-right">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#8A7FB0]">
                {rx.finalisedAt ? "Electronically signed by" : "Electronic signature"}
              </p>
              {signed ? (
                <>
                  <p className="mt-2 border-b border-[#EDEBF3] pb-2 text-[14px] font-bold text-[#2C2B4B]">
                    {withDoctorTitle(
                      identity.fullName || rx.finalisedBy || providerName || "your prescriber",
                    )}
                    {identity.qualifications ? `, ${identity.qualifications}` : ""}
                  </p>
                  <p className="mt-2 text-[12px] text-[#6F6889]">
                    Signed {signedStamp}
                    {timeZone ? ` (${timeZone})` : ""}
                  </p>
                  {rxNumber && (
                    <p className="mt-1 font-mono text-[12px] font-semibold text-[#2C2B4B]">
                      Rx # {rxNumber}
                    </p>
                  )}
                  {documentId && (
                    <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-[#A79FC4]">
                      Document ID {documentId}
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
                <>
                  <p className="mt-2 border-b border-dashed border-[#D9D5E3] pb-6" />
                  <p className="mt-2 text-[12.5px] font-semibold text-[#2C2B4B]">
                    This copy is not signed yet.
                  </p>
                  <p className="mt-1 text-[11.5px] text-[#6F6889]">
                    The prescriber's name, signing date and time, timezone and Rx
                    number appear here once the prescription is signed.
                  </p>
                </>
              )}
            </div>
          </footer>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EDEBF3] bg-[#FCFBFE] px-7 py-3 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#A79FC4]">
            <span>Lubin — patient prescription copy</span>
            <span>{rxNumber ? `Rx # ${rxNumber}` : "Rx # assigned when signed"}</span>
            <span>{documentId ? `Doc ${documentId}` : "Doc ID pending"}</span>
            <span>Page 1 of 1</span>
          </div>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A79FC4]">
        {label}
      </dt>
      <dd className="mt-1 text-[13px] font-semibold leading-snug text-[#2C2B4B]">
        {value}
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
