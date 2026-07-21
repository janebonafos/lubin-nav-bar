import { useEffect, useState } from "react";
import { CalendarCheck, Eye, Lock, RefreshCw, ShieldOff, Sparkles } from "lucide-react";
import {
  getProviderGrant,
  revokeProviderGrant,
  subscribeProviderShares,
  type ProviderShareGrant,
} from "@/lib/share/providerShareStore";
import type { ClientUpcomingAppointment } from "@/components/profile/ClientAppointmentsSection";

export default function BookedProviderShareCard({
  appointment,
  onReviewAndShare,
  onViewShared,
  onUpdate,
  highlight = false,
}: {
  appointment: ClientUpcomingAppointment;
  onReviewAndShare: () => void;
  onViewShared: (grant: ProviderShareGrant) => void;
  onUpdate: () => void;
  highlight?: boolean;
}) {
  const [grant, setGrant] = useState<ProviderShareGrant | null>(null);

  useEffect(() => {
    const refresh = () => setGrant(getProviderGrant(appointment.id));
    refresh();
    return subscribeProviderShares(refresh);
  }, [appointment.id]);

  const shared = !!grant;
  const expiresLabel = grant
    ? new Date(grant.expiresAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <section
      className={`overflow-hidden rounded-[24px] border bg-white p-5 shadow-[0_18px_40px_-24px_rgba(74,62,127,0.18)] transition sm:p-6 ${
        highlight
          ? "border-[#7E6BAF]/50 ring-2 ring-[#7E6BAF]/25"
          : "border-[#ECE7F6]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#7E6BAF]">
            <Sparkles className="h-3 w-3" />
            Share with your booked provider
          </p>
          <h3 className="mt-2 text-lg font-bold text-[#2D245A]">
            {appointment.providerName}
          </h3>
          <p className="text-[13px] text-[#6B6684]">
            {appointment.providerRole}
          </p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#4A3E7F]">
            <CalendarCheck className="h-3.5 w-3.5 text-[#7E6BAF]" />
            {appointment.fullLabel}
          </p>
        </div>

        <div className="flex flex-none flex-col items-end gap-2">
          <div
            aria-hidden
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#7E6BAF] to-[#4A3E7F] text-[13px] font-bold text-white"
          >
            {appointment.providerInitials}
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              shared
                ? "bg-[#E6F8F1] text-[#2D8E69]"
                : "bg-[#F4F0FB] text-[#7E6BAF]"
            }`}
          >
            {shared ? "Shared" : "Not shared yet"}
          </span>
        </div>
      </div>

      {shared && grant ? (
        <div className="mt-4 space-y-3 rounded-2xl border border-[#E6F1EB] bg-[#F6FBF9] p-4">
          <p className="text-[13px] text-[#3D2E6B]">
            Shared with{" "}
            <span className="font-semibold">{grant.providerName}</span>
          </p>
          <p className="text-[12px] text-[#6B6684]">
            Available until{" "}
            <span className="font-semibold text-[#3D2E6B]">{expiresLabel}</span>
            {grant.updatedAt && (
              <>
                {" · "}Updated{" "}
                {new Date(grant.updatedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </>
            )}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => onViewShared(grant)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E1DAF1] bg-white px-3.5 py-1.5 text-[12px] font-semibold text-[#3D2E6B] transition hover:border-[#7E6BAF]/40 hover:bg-[#FBFAFE]"
            >
              <Eye className="h-3.5 w-3.5" /> View what was shared
            </button>
            <button
              type="button"
              onClick={onUpdate}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E1DAF1] bg-white px-3.5 py-1.5 text-[12px] font-semibold text-[#3D2E6B] transition hover:border-[#7E6BAF]/40 hover:bg-[#FBFAFE]"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Update shared information
            </button>
            <button
              type="button"
              onClick={() => {
                if (
                  typeof window !== "undefined" &&
                  !window.confirm(
                    `Revoke ${grant.providerName}'s access to your Health Passport?`,
                  )
                )
                  return;
                revokeProviderGrant(appointment.id);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-rose-100 bg-white px-3.5 py-1.5 text-[12px] font-semibold text-rose-700 transition hover:bg-rose-50"
            >
              <ShieldOff className="h-3.5 w-3.5" /> Revoke access
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-4 text-[13px] leading-relaxed text-[#4A3E7F]">
            Choose what {appointment.providerName} can see before your
            appointment. Nothing is shared without your permission.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#7E6BAF]">
              <Lock className="h-3 w-3" />
              You choose what's included
            </span>
            <button
              type="button"
              onClick={onReviewAndShare}
              className="inline-flex items-center gap-2 rounded-full bg-[#7C69BA] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_12px_24px_-10px_rgba(124,105,186,0.55)] transition hover:-translate-y-0.5 hover:bg-[#6857A3]"
            >
              Review and share
            </button>
          </div>
        </>
      )}
    </section>
  );
}