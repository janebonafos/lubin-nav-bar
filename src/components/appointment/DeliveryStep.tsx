import { useMemo, useState } from "react";
import { AlertTriangle, Building2, Check, Loader2, Search, User } from "lucide-react";
import type { Prescription, RxCountry } from "@/lib/prescription/store";
import { findPharmacy, pharmaciesFor, pharmacyLine } from "@/lib/prescription/pharmacies";
import { formatCheckedAt } from "@/lib/prescription/safety";

/**
 * Delivery of an already-signed prescription. Signing and delivery are
 * deliberately separate: nothing here changes the clinical content or the
 * signature — it only records how the signed document reaches the patient.
 */
export function DeliveryStep({
  rx,
  country,
  clientName,
  onSendToPharmacy,
  onGiveToPatient,
}: {
  rx: Prescription;
  country: RxCountry;
  clientName?: string;
  onSendToPharmacy: (pharmacyId: string) => void;
  onGiveToPatient: () => void;
}) {
  const delivery = rx.delivery;
  const chosen = delivery?.method;
  const state = delivery?.state ?? "not-chosen";
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(delivery?.pharmacyId ?? null);
  const results = useMemo(() => pharmaciesFor(country, query), [country, query]);
  const controlled = rx.medications.some((m) => m.controlled);

  if (state === "sent" || state === "given") {
    const pharmacy = findPharmacy(delivery?.pharmacyId);
    const methodLabel =
      state === "sent" ? "Sent to pharmacy" : "Signed copy given to patient";
    return (
      <section className="rounded-xl border border-[#CDE8D8] bg-[#F3FAF6] px-4 py-3.5">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-[#2F6B4A]">
          <Check className="h-4 w-4" /> Prescription issued
        </p>
        <p className="mt-1 text-[12.5px] font-semibold text-[#2F6B4A]">
          {methodLabel}
          {delivery?.at ? ` · ${formatCheckedAt(delivery.at)}` : ""}
        </p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-[#3D6B54]">
          {state === "sent" && pharmacy
            ? `${pharmacyLine(pharmacy)} · ${pharmacy.phone}`
            : `${clientName || "The patient"} received the signed copy in their Lubin account.`}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-[#E4E1EC] bg-white p-4">
      <h3 className="text-[13.5px] font-semibold text-[#2C2B4B]">
        Delivery — choose how this prescription is delivered
      </h3>
      <p className="mt-1 text-[12.5px] leading-relaxed text-[#5A4A8A]">
        The prescription is already signed. Delivery is recorded separately, so the signed document
        stays unchanged whichever route you choose.
      </p>

      <div className={`mt-3 grid grid-cols-1 gap-2.5 ${country === "PH" ? "" : "sm:grid-cols-2"}`}>
        {country !== "PH" && (
          <button
            type="button"
            onClick={() => setSelected(selected ?? results[0]?.id ?? null)}
            className={`rounded-xl border px-3.5 py-3 text-left transition ${
              chosen === "pharmacy" || selected
                ? "border-[#6E4FD3] bg-[#F6F3FE]"
                : "border-[#E4E1EC] bg-white hover:bg-[#FAF7FE]"
            }`}
          >
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-[#2C2B4B]">
              <Building2 className="h-4 w-4 text-[#6E4FD3]" /> Send to pharmacy
            </p>
            <p className="mt-0.5 text-[12px] leading-snug text-[#5A4A8A]">
              Transmit to a verified pharmacy branch from the directory.
            </p>
          </button>
        )}
        <button
          type="button"
          onClick={onGiveToPatient}
          className="rounded-xl border border-[#E4E1EC] bg-white px-3.5 py-3 text-left transition hover:bg-[#FAF7FE]"
        >
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-[#2C2B4B]">
            <User className="h-4 w-4 text-[#6E4FD3]" /> Give signed copy to patient
          </p>
          <p className="mt-0.5 text-[12px] leading-snug text-[#5A4A8A]">
            {clientName || "The patient"} receives the signed copy to bring to any pharmacy.
          </p>
        </button>
      </div>

      {country !== "PH" && (
        <div className="mt-4 rounded-xl border border-[#EDEBF3] bg-[#FBFAFE] p-3.5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#8A7FB0]">
            Verified pharmacy directory
          </p>
          <label className="mt-2 flex items-center gap-2 rounded-lg border border-[#DEDAE8] bg-white px-2.5 py-2">
            <Search className="h-4 w-4 flex-none text-[#9C96AF]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by pharmacy, branch or city"
              className="w-full bg-transparent text-[13px] text-[#2C2B4B] placeholder:text-[#9C96AF] focus:outline-none"
            />
          </label>
          <ul className="mt-2.5 max-h-64 space-y-2 overflow-y-auto">
            {results.length === 0 && (
              <li className="text-[12.5px] text-[#6F6889]">
                No verified branch matches that search.
              </li>
            )}
            {results.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setSelected(p.id)}
                  className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${
                    selected === p.id
                      ? "border-[#6E4FD3] bg-[#F6F3FE]"
                      : "border-[#E7E2F5] bg-white hover:bg-[#FAF7FE]"
                  }`}
                >
                  <p className="text-[13px] font-semibold text-[#2C2B4B]">
                    {p.name} — {p.branch}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[#5A4A8A]">
                    {p.address}, {p.city}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-[#6F6889]">
                    {p.phone} · Licence verified {p.verifiedOn}
                    {controlled && p.acceptsControlled ? " · Accepts controlled prescriptions" : ""}
                  </p>
                </button>
              </li>
            ))}
          </ul>

          {controlled && selected && !findPharmacy(selected)?.acceptsControlled && (
            <p className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-[#F0D9A8] bg-[#FDF8EE] px-3 py-2 text-[12px] leading-snug text-[#8A6A20]">
              <AlertTriangle className="mt-[2px] h-3.5 w-3.5 flex-none" />
              This branch is not registered to receive controlled prescriptions electronically. Choose
              another branch or give the signed copy to the patient.
            </p>
          )}

          {state === "failed" && (
            <p className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-[#E9C3C3] bg-[#FDF4F4] px-3 py-2 text-[12px] leading-snug text-[#9B4A4A]">
              <AlertTriangle className="mt-[2px] h-3.5 w-3.5 flex-none" />
              {delivery?.error || "The pharmacy did not acknowledge the transmission."} Attempt
              {delivery?.attempts ? ` ${delivery.attempts}` : ""} failed
              {delivery?.at ? ` at ${formatCheckedAt(delivery.at)}` : ""}. You can retry or give the
              signed copy to the patient.
            </p>
          )}

          <button
            type="button"
            disabled={
              !selected ||
              state === "sending" ||
              (controlled && !findPharmacy(selected ?? undefined)?.acceptsControlled)
            }
            onClick={() => selected && onSendToPharmacy(selected)}
            className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-[#6E4FD3] px-4 text-[13px] font-semibold text-white transition hover:bg-[#5A3EB8] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {state === "sending" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Sending…
              </>
            ) : state === "failed" ? (
              "Retry send to pharmacy"
            ) : (
              "Send to pharmacy"
            )}
          </button>
        </div>
      )}
    </section>
  );
}
