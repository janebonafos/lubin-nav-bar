import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import {
  getThread,
  subscribeThread,
  type ThreadRole,
} from "@/lib/messages/appointmentMessages";

function seenKey(appointmentId: string, role: ThreadRole) {
  return `lubin:appt-thread-seen:${appointmentId}:${role}`;
}

export function markThreadSeen(appointmentId: string, role: ThreadRole) {
  try {
    window.localStorage.setItem(seenKey(appointmentId, role), String(Date.now()));
  } catch {
    /* noop */
  }
}

/**
 * Compact message shortcut shown next to the Details button on an appointment
 * row: shows the total message count and highlights when the other person has
 * written something new since the thread was last opened.
 */
export default function AppointmentMessageButton({
  appointmentId,
  role,
  onOpen,
  active = false,
}: {
  appointmentId: string;
  role: ThreadRole;
  onOpen: () => void;
  active?: boolean;
}) {
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const refresh = () => {
      const thread = getThread(appointmentId);
      let seen = 0;
      try {
        seen = Number(window.localStorage.getItem(seenKey(appointmentId, role)) || 0);
      } catch {
        seen = 0;
      }
      setTotal(thread.length);
      setUnread(thread.filter((m) => m.from !== role && m.at > seen).length);
    };
    refresh();
    return subscribeThread(appointmentId, refresh);
  }, [appointmentId, role]);

  useEffect(() => {
    if (active) {
      markThreadSeen(appointmentId, role);
      setUnread(0);
    }
  }, [active, appointmentId, role]);

  const label =
    unread > 0
      ? `${unread} new message${unread === 1 ? "" : "s"}`
      : total > 0
        ? `${total} message${total === 1 ? "" : "s"}`
        : "Send a message";

  return (
    <button
      type="button"
      onClick={() => {
        markThreadSeen(appointmentId, role);
        setUnread(0);
        onOpen();
      }}
      title={label}
      aria-label={label}
      className={`relative inline-flex items-center gap-1.5 rounded-[8px] border px-3 py-2 text-sm font-medium transition ${
        unread > 0
          ? "border-[#3D2E6B] bg-[#3D2E6B] text-white hover:bg-[#2C2B4B]"
          : "border-[#EAE7F5] text-[#3D2E6B] hover:bg-white"
      }`}
    >
      <MessageCircle className="h-4 w-4" />
      {total > 0 && (
        <span
          className={`min-w-5 rounded-full px-1.5 text-[11px] font-bold leading-5 ${
            unread > 0 ? "bg-white text-[#3D2E6B]" : "bg-[#EAE7F5] text-[#3D2E6B]"
          }`}
        >
          {unread > 0 ? unread : total}
        </span>
      )}
      {total === 0 && <span className="hidden sm:inline">Message</span>}
    </button>
  );
}
