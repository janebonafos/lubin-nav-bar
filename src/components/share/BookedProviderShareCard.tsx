import { useEffect, useState } from "react";
import { CalendarCheck, ChevronDown, Eye, RefreshCw, ShieldOff } from "lucide-react";
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
      className={`group overflow-hidden rounded-2xl border bg-white transition-all duration-200 hover:shadow-md ${
        highlight
          ? "border-[#7C69BA]/40 ring-2 ring-[#7C69BA]/20"
          : "border-[#F4F0FB] hover:border-[#7C69BA]/30"
      }`}
    >
      <div className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-[#7C69BA]/10 bg-[#F7F4FC] text-[15px] font-bold text-[#7C69BA] sm:h-12 sm:w-12 sm:text-lg">
            {appointment.providerInitials}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-[14.5px] font-semibold text-[#2D245A] transition-colors group-hover:text-[#4A3E7F]">
              {appointment.providerName}
            </h3>
            <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[#4A3E7F]/60">
              <CalendarCheck className="h-3.5 w-3.5 flex-none" />
              <span className="truncate">{appointment.fullLabel}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-none items-center justify-between gap-3 sm:justify-end">
          <span
            className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
              shared
                ? "bg-[#2D245A] text-white"
                : "border border-[#7C69BA]/10 bg-[#F7F4FC] text-[#7C69BA]"
            }`}
          >
            {shared ? `Shared · until ${expiresLabel}` : "Not shared"}
          </span>
          {shared ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="inline-flex items-center gap-1 rounded-xl border-2 border-[#7C69BA]/20 px-4 py-2 text-[13px] font-semibold text-[#7C69BA] transition-all hover:border-[#7C69BA] hover:bg-[#F7F4FC]"
            >
              Manage
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
              />
            </button>
          ) : (
            <button
              type="button"
              onClick={onReviewAndShare}
              className="inline-flex items-center rounded-xl bg-[#7C69BA] px-4 py-2 text-[13px] font-semibold text-white shadow-lg shadow-[#7C69BA]/20 transition-all hover:bg-[#4A3E7F] active:scale-95 sm:px-5"
            >
              Review and share
            </button>
          )}
        </div>
      </div>

      {shared && grant && expanded && (
        <div className="border-t border-[#F4F0FB] bg-[#FBFAFE] px-4 py-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onViewShared(grant)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#7C69BA]/15 bg-white px-3 py-1.5 text-[12px] font-semibold text-[#3D2E6B] transition hover:border-[#7C69BA]/40 hover:bg-white"
            >
              <Eye className="h-3.5 w-3.5" /> View
            </button>
            <button
              type="button"
              onClick={onUpdate}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#7C69BA]/15 bg-white px-3 py-1.5 text-[12px] font-semibold text-[#3D2E6B] transition hover:border-[#7C69BA]/40 hover:bg-white"
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
              className="inline-flex items-center gap-1.5 rounded-full border border-[#7C69BA]/15 bg-white px-3 py-1.5 text-[12px] font-semibold text-[#4A3E7F] transition hover:bg-[#F7F4FC]"
            >
              <ShieldOff className="h-3.5 w-3.5" /> Revoke
            </button>
          </div>
        </div>
      )}
    </div>
  );
}