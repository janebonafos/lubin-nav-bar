import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Lock, ShieldCheck, AlertTriangle, Check, KeyRound } from "lucide-react";
import type { Prescription, RxCountry } from "@/lib/prescription/store";
import {
  type PrescriberIdentity,
  credentialSummary,
  hasSigningPassphrase,
  setSigningPassphrase,
  verifySigningPassphrase,
} from "@/lib/prescription/credentials";
import {
  prescribingAuthority,
  prescriptionContentHash,
  formatHash,
  epcsReadiness,
  controlledMedications,
  SIGNING_BUTTON_COPY,
  SIGNING_METHOD_LABEL,
  type SigningMethod,
} from "@/lib/prescription/signing";
import { FINAL_AUTHORISATION_STATEMENT } from "@/lib/prescription/reference";

const JURISDICTION_LABEL: Record<RxCountry, string> = {
  US: "United States",
  PH: "Philippines",
};

/**
 * One signing experience for both jurisdictions. The prescription is shown
 * uneditable, the prescriber re-authenticates, and the signature is bound to
 * this exact version through its content hash. Credential and authentication
 * requirements come from the patient's jurisdiction, the prescriber's verified
 * authority and the medication classification.
 */
export function SigningDialog({
  open,
  onOpenChange,
  rx,
  country,
  identity,
  clientName,
  patientAgeYears,
  patientState,
  onIdentityChange,
  onSigned,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rx: Prescription;
  country: RxCountry;
  identity: PrescriberIdentity;
  clientName?: string;
  patientAgeYears?: number | null;
  patientState?: string;
  onIdentityChange: (next: PrescriberIdentity) => void;
  onSigned: (args: { method: SigningMethod; methodLabel: string; hash: string }) => void;
}) {
  const meds = rx.medications.filter((m) => m.name.trim().length > 0);
  const controlled = controlledMedications(rx.medications);
  const version = (rx.version ?? 0) + 1;

  const authority = useMemo(
    () => prescribingAuthority({ rx, country, identity, patientState, patientName: clientName }),
    [rx, country, identity, patientState, clientName],
  );
  const hash = useMemo(
    () =>
      prescriptionContentHash({
        medications: rx.medications,
        patientName: clientName,
        patientAgeYears: patientAgeYears ?? null,
        patientSex: rx.patientInfo?.sex,
        country,
        version,
      }),
    [rx.medications, rx.patientInfo?.sex, clientName, patientAgeYears, country, version],
  );

  const epcs = epcsReadiness(identity);
  const isEpcs = authority.method === "epcs-two-factor";

  const [passphrase, setPassphrase] = useState("");
  const [newPassphrase, setNewPassphrase] = useState("");
  const [code, setCode] = useState("");
  const [attested, setAttested] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passphraseSet = hasSigningPassphrase(identity);
  const codeValid = /^\d{6}$/.test(code.trim());
  const ready =
    authority.authorised &&
    attested &&
    (passphraseSet ? passphrase.length > 0 : newPassphrase.length >= 8) &&
    (!isEpcs || (epcs.ready && codeValid));

  const sign = () => {
    setError(null);
    let workingIdentity = identity;
    if (!passphraseSet) {
      if (newPassphrase.length < 8) {
        setError("Choose a signing passphrase of at least 8 characters.");
        return;
      }
      workingIdentity = setSigningPassphrase(identity, newPassphrase);
      onIdentityChange(workingIdentity);
    } else if (!verifySigningPassphrase(identity, passphrase)) {
      setError("That signing passphrase does not match. The prescription was not signed.");
      return;
    }
    if (isEpcs && !epcs.ready) {
      setError("EPCS signing is not available for this account.");
      return;
    }
    const methodLabel = isEpcs
      ? `${SIGNING_METHOD_LABEL["epcs-two-factor"]} (${epcs.provider})`
      : SIGNING_METHOD_LABEL["password-reauth"];
    setPassphrase("");
    setNewPassphrase("");
    setCode("");
    setAttested(false);
    onSigned({ method: authority.method, methodLabel, hash });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto border-[#E4E1EC] bg-[#F7F5FB] p-0 sm:max-w-[620px]">
        <DialogHeader className="sticky top-0 z-10 flex-row items-center gap-2 border-b border-[#E4E1EC] bg-white px-5 py-3.5 text-left">
          <Lock className="h-4 w-4 text-[#6E4FD3]" />
          <DialogTitle className="text-[13.5px] font-semibold text-[#2C2B4B]">
            {isEpcs ? "Authenticate and sign with EPCS" : "Authenticate and sign"}
          </DialogTitle>
          <span className="ml-auto rounded-full bg-[#F1ECFD] px-2.5 py-1 text-[11px] font-semibold text-[#5A3EB8]">
            {JURISDICTION_LABEL[country]}
          </span>
        </DialogHeader>

        <div className="space-y-3 px-5 py-4">
          {/* Uneditable prescription */}
          <section className="rounded-xl border border-[#E4E1EC] bg-white p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A7FB0]">
              <Lock className="h-3.5 w-3.5" /> Prescription as it will be signed — no longer editable
            </p>
            <ul className="mt-3 space-y-2.5">
              {meds.map((m) => (
                <li key={m.id} className="rounded-lg border border-[#EDEBF3] bg-[#FBFAFE] p-3">
                  <p className="text-[13.5px] font-semibold text-[#2C2B4B]">
                    {m.genericName || m.name} {m.strength || m.dose}
                    {m.controlled && (
                      <span className="ml-2 rounded-full bg-[#FDF4F4] px-2 py-0.5 text-[10.5px] font-semibold text-[#9B4A4A]">
                        {country === "PH" ? "Dangerous drug" : "Controlled"}
                      </span>
                    )}
                  </p>
                  {m.genericName && m.genericName !== m.name && (
                    <p className="mt-0.5 text-[11.5px] text-[#6F6889]">Brand: {m.name}</p>
                  )}
                  <p className="mt-1 text-[12px] leading-relaxed text-[#3D2E6B]">
                    {[m.instructions, m.frequency, m.duration].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-1 text-[11.5px] text-[#6F6889]">
                    Quantity {m.quantity || "not specified"} · Refills {m.refills || "none"}
                  </p>
                </li>
              ))}
              {meds.length === 0 && (
                <li className="text-[12.5px] text-[#6F6889]">No medication has been added.</li>
              )}
            </ul>
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 border-t border-[#EDEBF3] pt-3 text-[12px] sm:grid-cols-2">
              <Row label="Patient" value={clientName || "—"} />
              <Row
                label="Age"
                value={patientAgeYears ? `${patientAgeYears} years` : "Not documented"}
              />
              <Row label="Prescriber" value={identity.fullName || "—"} />
              <Row label="Credentials" value={credentialSummary(identity, country)} />
              <Row label="Jurisdiction" value={JURISDICTION_LABEL[country]} />
              <Row label="Version" value={`v${version}`} />
              <Row label="Document hash" value={formatHash(hash)} />
            </dl>
            <p className="mt-2 text-[11.5px] leading-relaxed text-[#6F6889]">
              The signature is bound to this hash. Any later edit voids the signature and returns
              the prescription to clinical review at a new version.
            </p>
          </section>

          {/* Jurisdiction credential requirements */}
          <section className="rounded-xl border border-[#E4E1EC] bg-white p-4">
            <p className="text-[13px] font-semibold text-[#2C2B4B]">
              {country === "PH"
                ? "Philippine prescribing requirements"
                : "United States prescribing requirements"}
            </p>
            <ul className="mt-2.5 space-y-2.5">
              {authority.checks.map((c) => (
                <li key={c.key} className="flex items-start gap-2">
                  {c.ok ? (
                    <span className="mt-[2px] inline-flex h-4 w-4 flex-none items-center justify-center rounded-full bg-[#E9F4EE]">
                      <Check className="h-3 w-3 text-[#3D6B54]" />
                    </span>
                  ) : (
                    <AlertTriangle
                      className={`mt-[2px] h-4 w-4 flex-none ${c.blocking ? "text-[#9B4A4A]" : "text-[#B08A2E]"}`}
                    />
                  )}
                  <span>
                    <span className="text-[12.5px] font-semibold text-[#2C2B4B]">{c.label}</span>
                    <span className="block text-[11.5px] leading-relaxed text-[#5A4A8A]">
                      {c.detail}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Re-authentication */}
          <section className="rounded-xl border border-[#DCD2F4] bg-white p-4">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-[#2C2B4B]">
              <KeyRound className="h-4 w-4 text-[#6E4FD3]" /> Re-authenticate to sign
            </p>
            {passphraseSet ? (
              <label className="mt-2.5 block text-[12px] font-medium text-[#5A4A8A]">
                Your signing passphrase
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  autoComplete="off"
                  className="mt-1 w-full rounded-lg border border-[#DEDAE8] bg-white px-3 py-2 text-[13px] text-[#2C2B4B] focus:border-[#6E4FD3] focus:outline-none focus:ring-2 focus:ring-[#6E4FD3]/20"
                />
              </label>
            ) : (
              <label className="mt-2.5 block text-[12px] font-medium text-[#5A4A8A]">
                Create your signing passphrase (at least 8 characters). You will re-enter it every
                time you sign.
                <input
                  type="password"
                  value={newPassphrase}
                  onChange={(e) => setNewPassphrase(e.target.value)}
                  autoComplete="new-password"
                  className="mt-1 w-full rounded-lg border border-[#DEDAE8] bg-white px-3 py-2 text-[13px] text-[#2C2B4B] focus:border-[#6E4FD3] focus:outline-none focus:ring-2 focus:ring-[#6E4FD3]/20"
                />
              </label>
            )}

            {isEpcs && (
              <div className="mt-3 rounded-lg border border-[#E9C3C3] bg-[#FDF4F4] px-3.5 py-3">
                <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#9B4A4A]">
                  <ShieldCheck className="h-4 w-4" /> EPCS two-factor signing required
                </p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-[#5C3B3B]">{epcs.detail}</p>
                {epcs.ready ? (
                  <label className="mt-2.5 block text-[12px] font-medium text-[#5C3B3B]">
                    One-time code from your registered authenticator
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      inputMode="numeric"
                      placeholder="6-digit code"
                      className="mt-1 w-full rounded-lg border border-[#E7CFCF] bg-white px-3 py-2 text-[13px] tracking-[0.3em] text-[#2C2B4B] focus:border-[#9B4A4A] focus:outline-none"
                    />
                  </label>
                ) : (
                  <p className="mt-2 text-[11.5px] font-semibold leading-relaxed text-[#9B4A4A]">
                    This controlled-substance prescription cannot be signed in Lubin. Issue it
                    through your certified EPCS system — a confirmation here is not a DEA-compliant
                    signature.
                  </p>
                )}
              </div>
            )}

            <label className="mt-3 flex items-start gap-2.5 text-[12.5px] leading-relaxed text-[#2C2B4B]">
              <input
                type="checkbox"
                checked={attested}
                onChange={(e) => setAttested(e.target.checked)}
                className="mt-0.5 h-4 w-4 flex-none rounded border-[#D9D5E3] text-[#6E4FD3] focus:ring-[#6E4FD3]"
              />
              <span>{FINAL_AUTHORISATION_STATEMENT}</span>
            </label>

            {error && (
              <p className="mt-2 flex items-start gap-1.5 text-[12px] font-semibold text-[#9B4A4A]">
                <AlertTriangle className="mt-[1px] h-3.5 w-3.5 flex-none" /> {error}
              </p>
            )}
          </section>

          {controlled.length > 0 && country === "PH" && (
            <p className="rounded-xl border border-[#F0D9A8] bg-[#FDF8EE] px-3.5 py-2.5 text-[12px] leading-relaxed text-[#8A6A20]">
              The electronic copy signed here accompanies the official special prescription form.
              The S2 form remains the legal instrument for a dangerous drug.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 pb-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex h-10 items-center rounded-xl border border-[#D9D5E3] bg-white px-4 text-[13px] font-semibold text-[#3D2E6B] hover:bg-[#F7F5FB]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!ready}
              onClick={sign}
              className="ml-auto inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#6E4FD3] px-5 text-[13px] font-semibold text-white shadow-lg shadow-[#6E4FD3]/30 transition hover:bg-[#7C5FE0] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
            >
              <Lock className="h-4 w-4" />
              {isEpcs ? SIGNING_BUTTON_COPY.epcs : SIGNING_BUTTON_COPY.standard}
            </button>
          </div>
          <p className="pb-2 text-[11.5px] leading-relaxed text-[#6F6889]">
            Signing does not send the prescription. After signing you choose whether to send it to a
            pharmacy or give the signed copy to the patient.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="min-w-[104px] shrink-0 text-[#8A7FB0]">{label}</dt>
      <dd className="font-medium text-[#2C2B4B]">{value}</dd>
    </div>
  );
}
