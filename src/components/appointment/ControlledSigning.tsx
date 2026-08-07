import { useState } from "react";
import { KeyRound, Lock, ShieldCheck } from "lucide-react";
import type { Prescription, RxCountry } from "@/lib/prescription/store";
import type { PrescriberIdentity } from "@/lib/prescription/credentials";
import { formatCheckedAt } from "@/lib/prescription/safety";

/**
 * Controlled / dangerous drugs never use the standard prescription
 * attestation as the legal signature. Each jurisdiction has its own path:
 *  - US: verified DEA authority plus two-factor signing (EPCS).
 *  - PH: the S2 licence and the serial number of the official S2 form.
 */
export function ControlledSigning({
  rx,
  country,
  identity,
  medicationNames,
  onChange,
}: {
  rx: Prescription;
  country: RxCountry;
  identity: PrescriberIdentity;
  medicationNames: string[];
  onChange: (patch: NonNullable<Prescription["controlledAuth"]>) => void;
}) {
  const auth = rx.controlledAuth ?? {};
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);

  const deaOnFile = (identity.deaNumber || "").trim();
  const deaVerified = !!identity.deaVerifiedAt && !!deaOnFile;

  return (
    <section className="rounded-xl border border-[#E9C3C3] bg-[#FDF4F4] px-4 py-3.5">
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-[#9B4A4A]">
        <Lock className="h-4 w-4" /> Controlled medication — separate signing workflow
      </p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-[#5C3B3B]">
        {medicationNames.join(", ") || "This medication"}{" "}
        {medicationNames.length > 1 ? "are" : "is"} controlled in{" "}
        {country === "PH" ? "the Philippines" : "the United States"}. The standard prescription
        confirmation is not the legal signature for these items.
      </p>

      {country === "US" ? (
        <div className="mt-3 space-y-3">
          <div className="rounded-lg border border-[#E7CFCF] bg-white px-3.5 py-3">
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#2C2B4B]">
              <ShieldCheck className="h-4 w-4 text-[#6E4FD3]" /> 1. Verified DEA authority
            </p>
            {deaVerified ? (
              <p className="mt-1 text-[12.5px] text-[#3D6B54]">
                DEA {deaOnFile} verified {formatCheckedAt(identity.deaVerifiedAt)}.
              </p>
            ) : (
              <p className="mt-1 text-[12.5px] text-[#9B4A4A]">
                No verified DEA registration is on file. Controlled prescribing stays blocked until
                your DEA registration is added and verified in your prescriber credentials.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-[#E7CFCF] bg-white px-3.5 py-3">
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#2C2B4B]">
              <KeyRound className="h-4 w-4 text-[#6E4FD3]" /> 2. Two-factor signing
            </p>
            <p className="mt-1 text-[12px] leading-snug text-[#5A4A8A]">
              Enter the 6-digit code from your registered authenticator. This second factor, not a
              checkbox, is the legal signature for a controlled prescription.
            </p>
            {auth.twoFactorAt ? (
              <p className="mt-1.5 text-[12.5px] font-medium text-[#3D6B54]">
                Two-factor signing completed {formatCheckedAt(auth.twoFactorAt)}.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  value={code}
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, ""));
                    setCodeError(null);
                  }}
                  placeholder="123456"
                  disabled={!deaVerified}
                  className="w-28 rounded-lg border border-[#DEDAE8] bg-white px-3 py-2 text-[13px] tracking-[0.3em] text-[#2C2B4B] placeholder:tracking-normal placeholder:text-[#9C96AF] focus:border-[#6E4FD3] focus:outline-none disabled:bg-[#F7F5FB]"
                />
                <button
                  type="button"
                  disabled={!deaVerified || code.length !== 6}
                  onClick={() => {
                    if (code.length !== 6) {
                      setCodeError("Enter the full 6-digit code.");
                      return;
                    }
                    onChange({
                      ...auth,
                      deaNumber: deaOnFile,
                      deaConfirmedAt: Date.now(),
                      twoFactorAt: Date.now(),
                    });
                  }}
                  className="inline-flex h-9 items-center rounded-[10px] bg-[#6E4FD3] px-3.5 text-[12.5px] font-semibold text-white transition hover:bg-[#5A3EB8] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Authenticate
                </button>
                {codeError && <span className="text-[12px] text-[#9B4A4A]">{codeError}</span>}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="rounded-lg border border-[#E7CFCF] bg-white px-3.5 py-3">
            <p className="text-[12.5px] font-semibold text-[#2C2B4B]">1. S2 licence</p>
            {identity.s2Number.trim() ? (
              <p className="mt-1 text-[12.5px] text-[#3D6B54]">
                S2 licence {identity.s2Number} on file.
              </p>
            ) : (
              <p className="mt-1 text-[12.5px] text-[#9B4A4A]">
                Add your S2 licence number to your prescriber credentials before issuing a dangerous
                drug prescription.
              </p>
            )}
          </div>
          <div className="rounded-lg border border-[#E7CFCF] bg-white px-3.5 py-3">
            <p className="text-[12.5px] font-semibold text-[#2C2B4B]">
              2. Official S2 form serial number
            </p>
            <p className="mt-1 text-[12px] leading-snug text-[#5A4A8A]">
              A dangerous drug prescription is issued on the official yellow S2 form. Record its
              serial number here so the electronic record matches the form you hand over.
            </p>
            <input
              value={auth.s2SerialNumber ?? ""}
              onChange={(e) =>
                onChange({
                  ...auth,
                  s2Number: identity.s2Number,
                  s2SerialNumber: e.target.value,
                })
              }
              placeholder="S2 form serial number"
              className="mt-2 w-full max-w-xs rounded-lg border border-[#DEDAE8] bg-white px-3 py-2 text-[13px] text-[#2C2B4B] placeholder:text-[#9C96AF] focus:border-[#6E4FD3] focus:outline-none"
            />
          </div>
        </div>
      )}
    </section>
  );
}

/** True when the jurisdiction-specific controlled requirements are satisfied. */
export function controlledSigningReady(
  rx: Prescription,
  country: RxCountry,
  identity: PrescriberIdentity,
): boolean {
  if (!rx.medications.some((m) => m.controlled)) return true;
  const auth = rx.controlledAuth ?? {};
  if (country === "US") {
    return !!identity.deaNumber.trim() && !!identity.deaVerifiedAt && !!auth.twoFactorAt;
  }
  return !!identity.s2Number.trim() && !!(auth.s2SerialNumber ?? "").trim();
}
