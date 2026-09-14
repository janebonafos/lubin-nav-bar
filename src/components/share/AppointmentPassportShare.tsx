import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck, Clock3, Info } from "lucide-react";
import { toast } from "sonner";

import { revokeProviderGrant, subscribeProviderShares } from "@/lib/share/providerShareStore";
import {
  formatAckTime,
  formatShareDate,
  includeLabels,
  previewExpiry,
  savedSharingPreferences,
  sharePassportForAppointment,
  shareState,
  type ShareState,
} from "@/lib/share/appointmentSharing";
import SharedPassportDialog from "@/components/share/SharedPassportDialog";

/**
 * Patient-side Health Passport sharing inside an appointment booked through
 * Lubin. The provider comes from the appointment — there is no clinic picker
 * and no QR scan — and nothing is shared until the patient confirms once.
 */
export default function AppointmentPassportShare({
  appointmentId,
  providerName,
  appointmentLabel,
  patientName = "You",
  status,
}: {
  appointmentId: string;
  providerName: string;
  appointmentLabel: string;
  patientName?: string;
  status: "upcoming" | "completed" | "cancelled";
}) {
  const [state, setState] = useState<ShareState>({ kind: "not_shared" });
  const [confirming, setConfirming] = useState(false);
  const [viewing, setViewing] = useState(false);

  useEffect(() => {
    const refresh = () => setState(shareState(appointmentId));
    refresh();
    return subscribeProviderShares(refresh);
  }, [appointmentId]);

  const prefKeys = savedSharingPreferences();
  const prefLabels = includeLabels(prefKeys);

  if (status === "cancelled") {
    if (state.kind === "not_shared") return null;
    return (
      <Block>
        <StatusLine tone="muted">
          Health Passport access ended when this appointment was cancelled.
        </StatusLine>
      </Block>
    );
  }

  return (
    <Block>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {state.kind === "not_shared" && (
            <>
              <StatusLine tone="muted">Not shared</StatusLine>
              <p className="mt-1 text-xs text-[#6B6684]">
                Sharing is optional. Helps your clinician review your medications and health
                history before your session.
              </p>
            </>
          )}

          {state.kind === "awaiting_ack" && (
            <>
              <StatusLine tone="good">
                <ShieldCheck className="h-4 w-4" /> Health Passport shared ·{" "}
                {formatAckTime(state.grant.updatedAt ?? state.grant.createdAt)}
              </StatusLine>
              <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-[#8A6A1E]">
                <Clock3 className="h-3.5 w-3.5" /> Awaiting acknowledgment from {providerName} —
                this doesn't hold up your appointment.
              </p>
              <p className="mt-1 text-xs text-[#6B6684]">
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
              <StatusLine tone="good">
                <ShieldCheck className="h-4 w-4" /> Acknowledged by {state.ack.providerName} on{" "}
                {formatAckTime(state.ack.at)}
              </StatusLine>
              <p className="mt-1 text-xs text-[#6B6684]">
                Receipt confirmed only — not a clinical review. Access ends{" "}
                <span className="font-semibold text-[#3D2E6B]">
                  {formatShareDate(state.grant.expiresAt)}
                </span>
              </p>
            </>
          )}

          {state.kind === "ended" && (
            <>
              <StatusLine tone="muted">
                {state.reason === "revoked" ? "Access revoked" : "Access expired"} ·{" "}
                {formatShareDate(state.grant.revokedAt ?? state.grant.expiresAt)}
              </StatusLine>
              <p className="mt-1 text-xs text-[#6B6684]">
                {providerName} can no longer open what you shared.
              </p>
            </>
          )}
        </div>

        <div className="flex flex-none flex-wrap items-center gap-2">
          {state.kind === "not_shared" && status !== "completed" && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#3D2E6B] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2C2B4B]"
            >
              <ShieldCheck className="h-4 w-4" /> Share Health Passport
            </button>
          )}
          {state.kind !== "not_shared" && (
            <button
              type="button"
              onClick={() => setViewing(true)}
              className="inline-flex items-center rounded-[8px] border border-[#E1DAF1] bg-white px-3.5 py-2 text-sm font-medium text-[#3D2E6B] transition hover:bg-[#FBFAFE]"
            >
              View shared passport
            </button>
          )}
          {(state.kind === "awaiting_ack" || state.kind === "acknowledged") && (
            <>
              <Link
                to="/my-health-passport"
                search={{ tab: "share", share: appointmentId }}
                className="inline-flex items-center rounded-[8px] border border-[#E1DAF1] bg-white px-3.5 py-2 text-sm font-medium text-[#3D2E6B] transition hover:bg-[#FBFAFE]"
              >
                Manage sharing
              </Link>
              <button
                type="button"
                onClick={() => {
                  revokeProviderGrant(appointmentId);
                  toast.success("Sharing stopped for this appointment");
                }}
                className="inline-flex items-center rounded-[8px] border border-[#EAD9D9] bg-white px-3.5 py-2 text-sm font-medium text-[#B0453A] transition hover:bg-[#FBF4F4]"
              >
                Stop sharing
              </button>
            </>
          )}
        </div>
      </div>

      {confirming && (
        <ConfirmShare
          providerName={providerName}
          appointmentLabel={appointmentLabel}
          itemLabels={prefLabels}
          expiresAt={previewExpiry()}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            sharePassportForAppointment({
              appointmentId,
              providerName,
              appointmentLabel,
              includedKeys: prefKeys,
            });
            setConfirming(false);
            toast.success(`Health Passport shared with ${providerName}`);
          }}
        />
      )}

      {viewing && state.kind !== "not_shared" && (
        <SharedPassportDialog
          grant={state.grant}
          patientName={patientName === "You" ? "You" : patientName}
          ack={state.kind === "acknowledged" ? state.ack : null}
          onClose={() => setViewing(false)}
        />
      )}
    </Block>
  );
}

function ConfirmShare({
  providerName,
  appointmentLabel,
  itemLabels,
  expiresAt,
  onCancel,
  onConfirm,
}: {
  providerName: string;
  appointmentLabel: string;
  itemLabels: string[];
  expiresAt: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-[#241C42]/55 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#A89BD0]">
          Confirm sharing
        </p>
        <h4 className="mt-1 text-[17px] font-bold text-[#2C2B4B]">
          Share your Health Passport with {providerName}?
        </h4>
        <p className="mt-2 text-[13px] leading-relaxed text-[#6F6889]">
          Helps your clinician review your medications and health history. Your saved sharing
          choices are used, so there's nothing else to set up.
        </p>

        <dl className="mt-4 space-y-3 rounded-xl border border-[#EFEAFA] bg-[#FBF9FF] px-4 py-4">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#A89BD0]">
              Who receives it
            </dt>
            <dd className="mt-0.5 text-[13.5px] text-[#3D2E6B]">
              {providerName} · {appointmentLabel}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#A89BD0]">
              What's included
            </dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {itemLabels.map((l) => (
                <span
                  key={l}
                  className="inline-flex items-center rounded-[12px] bg-white px-2.5 py-1 text-[12px] text-[#3D2E6B] ring-1 ring-[#EAE7F5]"
                >
                  {l}
                </span>
              ))}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#A89BD0]">
              Access expires
            </dt>
            <dd className="mt-0.5 text-[13.5px] text-[#3D2E6B]">{formatShareDate(expiresAt)}</dd>
          </div>
        </dl>

        <p className="mt-3 inline-flex items-start gap-1.5 text-[12px] leading-relaxed text-[#6F6889]">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Private conversations, journals and detailed assessment answers aren't included. You can
          stop access any time.
        </p>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 items-center rounded-[12px] border border-[#DCD4F0] px-4 text-[13px] font-semibold text-[#5B4B8A] hover:bg-[#F6F4FC]"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex h-10 items-center gap-1.5 rounded-[12px] bg-[#5B4A93] px-5 text-[13px] font-semibold text-white shadow-sm hover:bg-[#4B3D80]"
          >
            <ShieldCheck className="h-4 w-4" /> Share with {providerName}
          </button>
        </div>
      </div>
    </div>
  );
}

function Block({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-6 border-t border-[#F0EAFB] pt-5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">
        Health Passport
      </p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function StatusLine({
  tone,
  children,
}: {
  tone: "good" | "muted";
  children: React.ReactNode;
}) {
  return (
    <p
      className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
        tone === "good" ? "text-[#2D8E69]" : "text-[#6B6684]"
      }`}
    >
      {children}
    </p>
  );
}
