import { useEffect, useState } from "react";
import { Clock3, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { subscribeProviderShares } from "@/lib/share/providerShareStore";
import {
  acknowledgeShare,
  formatAckTime,
  formatShareDate,
  shareState,
  type ShareState,
} from "@/lib/share/appointmentSharing";
import SharedPassportDialog from "@/components/share/SharedPassportDialog";
import { INCLUDE_OPTIONS } from "@/lib/share/summary";

/**
 * Provider-side view of the Health Passport a patient shared for this
 * appointment. Acknowledgment is an explicit action and confirms receipt only.
 */
export default function ProviderPassportShareCard({
  appointmentId,
  clientName,
  providerName = "You",
}: {
  appointmentId: string;
  clientName: string;
  providerName?: string;
}) {
  const [state, setState] = useState<ShareState>({ kind: "not_shared" });
  const [viewing, setViewing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const refresh = () => setState(shareState(appointmentId));
    refresh();
    return subscribeProviderShares(refresh);
  }, [appointmentId]);

  const includedLabels =
    state.kind === "not_shared"
      ? []
      : state.grant.includedKeys.map(
          (key) => INCLUDE_OPTIONS.find((option) => option.key === key)?.label ?? key,
        );

  return (
    <div className="rounded-[12px] border border-[#EAE7F5] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">
            Before the visit · Shared by {clientName}
          </p>
          <h3 className="mt-1 font-display text-[18px] text-[#3D2E6B]">Health Passport</h3>

          {state.kind === "not_shared" && (
            <>
              <p className="mt-2 text-sm font-semibold text-[#6B6684]">Not shared</p>
              <p className="mt-1 text-xs text-[#6B6684]">
                {clientName} hasn't shared their Health Passport for this appointment. Sharing is
                optional and up to them.
              </p>
            </>
          )}

          {state.kind === "awaiting_ack" && (
            <>
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[#2D8E69]">
                <ShieldCheck className="h-4 w-4" /> Shared —{" "}
                <span className="inline-flex items-center gap-1 text-[#8A6A1E]">
                  <Clock3 className="h-3.5 w-3.5" /> awaiting your acknowledgment
                </span>
              </p>
              <p className="mt-1 text-xs text-[#6B6684]">
                Shared {formatAckTime(state.grant.updatedAt ?? state.grant.createdAt)} ·{" "}
                {state.grant.includedKeys.length} section
                {state.grant.includedKeys.length === 1 ? "" : "s"} · access ends{" "}
                <span className="font-semibold text-[#3D2E6B]">
                  {formatShareDate(state.grant.expiresAt)}
                </span>
              </p>
            </>
          )}

          {state.kind === "acknowledged" && (
            <>
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[#2D8E69]">
                <ShieldCheck className="h-4 w-4" /> Acknowledged by {state.ack.providerName} on{" "}
                {formatAckTime(state.ack.at)}
              </p>
              <p className="mt-1 text-xs text-[#6B6684]">
                Receipt confirmed only — not a clinical review of the information. Access ends{" "}
                <span className="font-semibold text-[#3D2E6B]">
                  {formatShareDate(state.grant.expiresAt)}
                </span>
              </p>
            </>
          )}

          {state.kind === "ended" && (
            <>
              <p className="mt-2 text-sm font-semibold text-[#6B6684]">
                {state.reason === "revoked" ? "Access revoked" : "Access expired"} ·{" "}
                {formatShareDate(state.grant.revokedAt ?? state.grant.expiresAt)}
              </p>
              <p className="mt-1 text-xs text-[#6B6684]">
                You can no longer open what {clientName} shared.
              </p>
            </>
          )}

          {includedLabels.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Included Health Passport information">
              {includedLabels.map((label) => (
                <span
                  key={label}
                  className="rounded-[8px] border border-[#E3DBF5] bg-[#F8F5FC] px-2.5 py-1 text-[11px] font-semibold text-[#5B4B8A]"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-none flex-wrap items-center gap-2">
          {state.kind !== "not_shared" && (
            <button
              type="button"
              onClick={() => setViewing(true)}
              className="inline-flex items-center rounded-[8px] border border-[#E1DAF1] bg-white px-3.5 py-2 text-sm font-medium text-[#3D2E6B] transition hover:bg-[#FBFAFE]"
            >
              View shared Health Passport
            </button>
          )}
          {state.kind === "awaiting_ack" && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#3D2E6B] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2C2B4B]"
            >
              Acknowledge receipt
            </button>
          )}
        </div>
      </div>

      {confirming && state.kind === "awaiting_ack" && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-[#241C42]/55 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-7">
            <h4 className="text-[17px] font-bold text-[#2C2B4B]">Acknowledge receipt?</h4>
            <p className="mt-2 text-[13px] leading-relaxed text-[#6F6889]">
              This records that you received the Health Passport {clientName} shared for this
              appointment, and lets them know. It does not mark the information as verified,
              approved or clinically reviewed.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="inline-flex h-10 items-center rounded-[12px] border border-[#DCD4F0] px-4 text-[13px] font-semibold text-[#5B4B8A] hover:bg-[#F6F4FC]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  acknowledgeShare({
                    appointmentId,
                    providerName: providerName === "You" ? "Dr. Camille Lazaro" : providerName,
                    patientName: clientName,
                  });
                  setConfirming(false);
                  toast.success("Receipt acknowledged");
                }}
                className="inline-flex h-10 items-center gap-1.5 rounded-[12px] bg-[#5B4A93] px-5 text-[13px] font-semibold text-white shadow-sm hover:bg-[#4B3D80]"
              >
                <ShieldCheck className="h-4 w-4" /> Acknowledge receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {viewing && state.kind !== "not_shared" && (
        <SharedPassportDialog
          grant={state.grant}
          patientName={clientName}
          ack={state.kind === "acknowledged" ? state.ack : null}
          onClose={() => setViewing(false)}
        />
      )}
    </div>
  );
}
