import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import {
  getProviderGrant,
  subscribeProviderShares,
  type ProviderShareGrant,
} from "@/lib/share/providerShareStore";
import type { ClientUpcomingAppointment } from "@/components/profile/ClientAppointmentsSection";

export default function BookedProviderShareCard({
  appointment,
  onReviewAndShare,
  onViewShared: _onViewShared,
  onUpdate: _onUpdate,
  highlight = false,
  expanded: expandedProp,
  onToggleExpand,
  expandedContent,
}: {
  appointment: ClientUpcomingAppointment;
  onReviewAndShare: () => void;
  onViewShared: (grant: ProviderShareGrant) => void;
  onUpdate: () => void;
  highlight?: boolean;
  expanded?: boolean;
  onToggleExpand?: (next: boolean) => void;
  expandedContent?: ReactNode;
}) {
  void _onViewShared;
  void _onUpdate;
  const [grant, setGrant] = useState<ProviderShareGrant | null>(null);
  const [expandedInternal, setExpandedInternal] = useState(false);
  const isControlled = expandedProp !== undefined;
  const expanded = isControlled ? !!expandedProp : expandedInternal;
  const setExpanded = (next: boolean) => {
    if (isControlled) onToggleExpand?.(next);
    else setExpandedInternal(next);
  };

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
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-purple to-brand-purple-dark text-[15px] font-extrabold text-white shadow-md shadow-[#A89BD0]/40 ring-2 ring-white sm:h-12 sm:w-12 sm:text-lg">
            {appointment.providerInitials}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-[14.5px] font-semibold text-[#2D245A] transition-colors group-hover:text-[#4A3E7F]">
              {appointment.providerName}
            </h3>
            <div className="mt-0.5 text-[12px] text-[#4A3E7F]/60">
              <span className="truncate">{appointment.fullLabel}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-none items-center justify-between gap-3 sm:justify-end">
          <span
            className={`inline-flex items-center whitespace-nowrap rounded-lg px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
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
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
              className="inline-flex items-center gap-1 rounded-[12px] border-2 border-[#7C69BA]/20 px-4 py-2 text-[13px] font-semibold text-[#7C69BA] transition-all hover:border-[#7C69BA] hover:bg-[#F7F4FC]"
            >
              Manage
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
              />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (isControlled) setExpanded(!expanded);
                else onReviewAndShare();
              }}
              aria-expanded={isControlled ? expanded : undefined}
              className="inline-flex items-center gap-1 rounded-[12px] bg-[#7C69BA] px-4 py-2 text-[13px] font-semibold text-white shadow-lg shadow-[#7C69BA]/20 transition-all hover:bg-[#4A3E7F] active:scale-95 sm:px-5"
            >
              {isControlled && expanded ? "Review and Share" : "Review and share"}
              {isControlled ? (
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
                />
              ) : null}
            </button>
          )}
        </div>
      </div>

      {expanded && (shared || expandedContent) && (
        <div className="border-t border-[#F4F0FB] bg-[#FBFAFE]">
          {expandedContent && (
            <div className="p-3 sm:p-4">{expandedContent}</div>
          )}
        </div>
      )}
    </div>
  );
}