import { useEffect, useState } from "react";
import { CalendarCheck, ChevronRight, Eye, RefreshCw, ShieldOff } from "lucide-react";
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
  const [expanded, setExpanded] = useState(false);

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
      })
    : null;

  return (
    <div
      className={`rounded-2xl border bg-white transition ${
        highlight
          ? "border-[#7E6BAF]/50 ring-2 ring-[#7E6BAF]/25"
          : "border-[#ECE7F6]"
      }`}
    >
      <div className="flex items-center gap-3 p-3 sm:p-4">
        <div
          aria-hidden
          className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-gradient-to-br from-[#7E6BAF] to-[#4A3E7F] text-[11px] font-bold text-white"
        >
          {appointment.providerInitials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold text-[#2D245A]">
            {appointment.providerName}
          </p>
          <p className="mt-0.5 inline-flex items-center gap-1.5 text-[11.5px] text-[#6B6684]">
            <CalendarCheck className="h-3 w-3 text-[#7E6BAF]" />
            {appointment.fullLabel}
          </p>
        </div>
        <div className="flex flex-none items-center gap-2">
          <span
            className={`hidden sm:inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              shared
                ? "bg-[#F4F0FB] text-[#4A3E7F]"
                : "bg-[#F8F7FB] text-[#7E6BAF]"
            }`}
          >
            {shared ? `Shared · until ${expiresLabel}` : "Not shared"}
          </span>
          {shared ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-1 rounded-full border border-[#E1DAF1] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#3D2E6B] transition hover:border-[#7E6BAF]/40 hover:bg-[#FBFAFE]"
              aria-expanded={expanded}
            >
              Manage
              <ChevronRight
                className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-90" : ""}`}
              />
            </button>
          ) : (
            <button
              type="button"
              onClick={onReviewAndShare}
              className="inline-flex items-center gap-1 rounded-full bg-[#7C69BA] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-[0_8px_18px_-8px_rgba(124,105,186,0.55)] transition hover:-translate-y-0.5 hover:bg-[#6857A3]"
            >
              Review and share
            </button>
          )}
        </div>
      </div>

      {shared && grant && expanded && (
        <div className="border-t border-[#F0EDF8] px-3 py-3 sm:px-4">
          <p className="text-[11.5px] text-[#6B6684] sm:hidden">
            Available until <span className="font-semibold text-[#3D2E6B]">{expiresLabel}</span>
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onViewShared(grant)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E1DAF1] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#3D2E6B] transition hover:border-[#7E6BAF]/40 hover:bg-[#FBFAFE]"
            >
              <Eye className="h-3.5 w-3.5" /> View
            </button>
            <button
              type="button"
              onClick={onUpdate}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E1DAF1] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#3D2E6B] transition hover:border-[#7E6BAF]/40 hover:bg-[#FBFAFE]"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Update
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
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E1DAF1] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#4A3E7F] transition hover:bg-[#F8F7FB]"
            >
              <ShieldOff className="h-3.5 w-3.5" /> Revoke
            </button>
          </div>
        </div>
      )}
    </div>
  );
}