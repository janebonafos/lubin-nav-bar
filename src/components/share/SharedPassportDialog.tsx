import { createPortal } from "react-dom";
import { ShieldCheck, X } from "lucide-react";

import { INCLUDE_OPTIONS } from "@/lib/share/summary";
import type { ProviderShareGrant } from "@/lib/share/providerShareStore";
import {
  formatAckTime,
  formatShareDate,
  type ShareAcknowledgment,
} from "@/lib/share/appointmentSharing";
import ProviderSharedPassportContents from "@/components/share/ProviderSharedPassportContents";

/**
 * Controlled view of what the patient shared for this appointment.
 * Opening it is never treated as acknowledgment.
 */
export default function SharedPassportDialog({
  grant,
  patientName,
  ack,
  onClose,
}: {
  grant: ProviderShareGrant;
  patientName: string;
  ack?: ShareAcknowledgment | null;
  onClose: () => void;
}) {
  if (typeof document === "undefined") return null;
  const active = !grant.revoked && grant.expiresAt > Date.now();
  const sections = grant.includedKeys.map(
    (k) => INCLUDE_OPTIONS.find((o) => o.key === k) ?? { key: k, label: k, description: "" },
  );

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-[#241C42]/55 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#EFEAFA] px-6 py-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#A89BD0]">
              Shared Health Passport
            </p>
            <h3 className="mt-1 text-[17px] font-bold text-[#2C2B4B]">
              {patientName} · {grant.appointmentLabel}
            </h3>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#A89BD0]">
              Shared information
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-[#6F6889]">
              This is the information {patientName} included for this appointment. The provider brief is a summary and does not replace these entries.
            </p>
            <div className="mt-3">
              <ProviderSharedPassportContents grant={grant} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-[10px] p-1.5 text-[#7E6BAF] hover:bg-[#F6F4FC]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div
            className={`rounded-xl px-4 py-3 text-[13px] font-semibold ${
              active ? "bg-[#EAF6EF] text-[#256B47]" : "bg-[#F3F0FA] text-[#5B4B8A]"
            }`}
          >
            {active ? (
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" /> Access open until{" "}
                {formatShareDate(grant.expiresAt)}
              </span>
            ) : (
              <>Access {grant.revoked ? "revoked" : "expired"} {formatShareDate(grant.revokedAt ?? grant.expiresAt)}</>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Row label="Shared by" value={patientName} />
            <Row label="Shared with" value={grant.providerName} />
            <Row label="Date shared" value={formatShareDate(grant.updatedAt ?? grant.createdAt)} />
            <Row
              label={active ? "Access expires" : "Access ended"}
              value={formatShareDate(grant.revokedAt ?? grant.expiresAt)}
            />
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#A89BD0]">
              Included information
            </p>
            <ul className="mt-2 space-y-2">
              {sections.length === 0 ? (
                <li className="text-[13px] text-[#6B6684]">Nothing selected.</li>
              ) : (
                sections.map((s) => (
                  <li
                    key={s.key}
                    className="rounded-xl border border-[#EFEAFA] bg-[#FBF9FF] px-4 py-3"
                  >
                    <p className="text-[13.5px] font-semibold text-[#3D2E6B]">{s.label}</p>
                    {s.description ? (
                      <p className="mt-0.5 text-[12.5px] text-[#6F6889]">{s.description}</p>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </div>

          <p className="rounded-xl bg-[#F3F0FA] px-4 py-3 text-[12.5px] leading-relaxed text-[#4B4570]">
            {ack
              ? `Receipt acknowledged by ${ack.providerName} on ${formatAckTime(ack.at)}. Acknowledgment confirms receipt only — it is not a review or approval of the information.`
              : "Receipt has not been acknowledged yet. Sharing stays usable either way."}
          </p>

          <p className="text-[11.5px] text-[#8A7FB0]">
            Simulated view — all entries are fictional and nothing leaves this device.
          </p>
        </div>

        <div className="flex justify-end border-t border-[#EFEAFA] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center rounded-[12px] bg-[#5B4A93] px-5 text-[13px] font-semibold text-white hover:bg-[#4B3D80]"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#A89BD0]">{label}</p>
      <p className="mt-0.5 text-[13.5px] text-[#3D2E6B]">{value}</p>
    </div>
  );
}
