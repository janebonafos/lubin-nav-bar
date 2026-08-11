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
      : null;
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
  const credentialLine =
    country === "PH"
      ? identity.prcNumber
        ? `PRC ${identity.prcNumber}${identity.ptrNumber ? ` | PTR ${identity.ptrNumber}` : ""}${controlled && identity.s2Number ? ` | S2 ${identity.s2Number}` : ""}`
        : "Credentials incomplete"
      : identity.npiNumber
        ? `NPI ${identity.npiNumber}${identity.licenseNumber ? ` | Licence ${identity.licenseNumber}${identity.licenseState ? ` (${identity.licenseState})` : ""}` : ""}${controlled && identity.deaNumber ? ` | DEA ${identity.deaNumber}` : ""}`
        : "Credentials incomplete";
  /** Registration identifiers are legally required on the printed copy, so they
   *  render as highlighted chips instead of a low-contrast text line. */
  const credentialChips: { label: string; value: string }[] =
    country === "PH"
      ? [
          ...(identity.prcNumber ? [{ label: "PRC no.", value: identity.prcNumber }] : []),
          ...(identity.ptrNumber ? [{ label: "PTR no.", value: identity.ptrNumber }] : []),
          ...(controlled && identity.s2Number
            ? [{ label: "S2 licence", value: identity.s2Number }]
            : []),
        ]
      : [
          ...(identity.npiNumber ? [{ label: "NPI", value: identity.npiNumber }] : []),
          ...(identity.licenseNumber
            ? [
                {
                  label: "State licence",
                  value: `${identity.licenseNumber}${identity.licenseState ? ` (${identity.licenseState})` : ""}`,
                },
              ]
            : []),
          ...(controlled && identity.deaNumber
            ? [{ label: "DEA", value: identity.deaNumber }]
            : []),
        ];

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
                  Issued in {JURISDICTION_LABEL[country]}
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
                  Rx no.
                </p>
                <p className="mt-1 font-mono text-[20px] font-bold leading-none tracking-tight">
                  {rxNumber ?? "Pending"}
                </p>
                <p className="mt-2 text-[11.5px] text-white/70">
                  {rxNumber ? `Date issued ${dateLong}` : "Assigned when signed"}
                </p>
              </div>
            </div>
          </header>

          {/* Identity grid */}
          <section className="grid gap-6 border-b border-[#EDEBF3] px-7 py-5 sm:grid-cols-2 sm:gap-10">
            <div>
              <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A79FC4]">
                Patient information
              </h2>
              <p className="mt-2.5 text-[18px] font-bold leading-tight text-[#2C2B4B]">
                {clientName || "—"}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-[13px] text-[#6F6889]">
                {age !== null && <span>{age} years old</span>}
                {age !== null && sex && <span className="text-[#D9D5E3]">|</span>}
                {sex && <span>Sex: {sex}</span>}
              </div>
              <p className="mt-1 text-[12px] text-[#8A7FB0]">
                DOB: {dob || "not recorded"}
                {!sex && " · Sex not recorded"}
              </p>
              {(country === "US" || address) && (
                <p className="mt-0.5 text-[12px] text-[#8A7FB0]">
                  Address: {address || "not recorded"}
                </p>
              )}
            </div>
            <div className="sm:border-l sm:border-[#F5F3F9] sm:pl-10">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A79FC4]">
                Prescribing professional
              </h2>
              <p className="mt-2.5 text-[14px] font-bold text-[#2C2B4B]">
                {prescriberName}
              </p>
              {credentialChips.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {credentialChips.map((c) => (
                    <span
                      key={c.label}
                      className="inline-flex items-baseline gap-1.5 rounded-[7px] border border-[#DCD2F4] bg-[#F6F2FF] px-2 py-1 print:border-[#B9ABE0] print:bg-transparent"
                    >
                      <span className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-[#8A7FB0]">
                        {c.label}
                      </span>
                      <span className="text-[12px] font-bold tabular-nums text-[#3D2E6B]">
                        {c.value}
                      </span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-[11.5px] font-semibold text-[#B4342F]">{credentialLine}</p>
              )}
              {identity.clinicAddress.trim() && (
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#6F6889]">
                  {identity.clinicAddress.trim()}
                </p>
              )}
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
                    className="relative overflow-hidden rounded-[18px] border border-[#F1EDF9] bg-[#FBFAFE] p-5"
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

                    <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
                      <Stat label="Strength" value={m.strength || m.dose || "As directed"} />
                      <Stat label="Route" value={m.route || "As directed"} />
                      <Stat label="Frequency" value={m.frequency || "As directed"} />
                      <Stat label="Duration" value={m.duration || "As directed"} />
                    </dl>

                    <div className="mt-4 border-t border-[#F1EDF9] pt-4">
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
                      <details className="group mt-4 rounded-[12px] border border-[#EAE5F6] bg-white px-4 py-2.5 print:border-0 print:bg-transparent print:px-0 print:py-0">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6A5AA0] print:hidden">
                          <span>View important medication information</span>
                          <span aria-hidden className="text-[13px] transition-transform group-open:rotate-180">
                            ⌄
                          </span>
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

          {/* Signature */}
          <footer className="border-t border-[#EDEBF3]">
            <div className="space-y-1.5 px-7 py-5 text-[11.5px] leading-relaxed text-[#6F6889]">
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
            <div className="border-t border-[#EDEBF3] bg-[#FCFBFE] px-7 py-4">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#8A7FB0]">
                {rx.finalisedAt ? "Electronically signed by" : "Electronic signature"}
              </p>
              {signed ? (
                <>
                  <p className="mt-1.5 text-[14px] font-bold text-[#2C2B4B]">
                    {withDoctorTitle(
                      identity.fullName || rx.finalisedBy || providerName || "your prescriber",
                    )}
                    {identity.qualifications ? `, ${identity.qualifications}` : ""}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[#6F6889]">
                    <span>
                      Signed {signedStamp}
                      {timeZone ? ` (${timeZone})` : ""}
                    </span>
                    {rx.signature?.methodLabel && <span>{rx.signature.methodLabel}</span>}
                    {rxNumber && <span>Rx {rxNumber}</span>}
                  </div>
                </>
              ) : (
                <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="text-[12.5px] font-semibold text-[#2C2B4B]">
                    Not signed yet.
                  </p>
                  <p className="text-[11.5px] text-[#6F6889]">
                    Prescriber name, signing date and time, timezone and Rx number
                    appear here once signed.
                  </p>
                </div>
              )}
            </div>
          </footer>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EDEBF3] bg-[#FCFBFE] px-7 py-3 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#A79FC4]">
            <span>Lubin — patient prescription copy</span>
            <span>{documentId ? `Doc ${documentId}` : "Doc ID pending"}</span>
          </div>
        </article>
      </div>
    </div>
  );
}

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
