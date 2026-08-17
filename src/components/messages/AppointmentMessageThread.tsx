import { useEffect, useMemo, useRef, useState } from "react";
import { Mail, Send, ShieldCheck, ChevronDown } from "lucide-react";
import {
  formatMessageTime,
  getThread,
  relayAddress,
  sendMessage,
  subscribeThread,
  type AppointmentMessage,
  type ThreadRole,
} from "@/lib/messages/appointmentMessages";

export default function AppointmentMessageThread({
  appointmentId,
  role,
  selfName,
  otherName,
  defaultOpen = false,
}: {
  appointmentId: string;
  role: ThreadRole;
  selfName: string;
  otherName: string;
  defaultOpen?: boolean;
}) {
  const [messages, setMessages] = useState<AppointmentMessage[]>([]);
  const [open, setOpen] = useState(defaultOpen);
  const [draft, setDraft] = useState("");
  const [justSent, setJustSent] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const refresh = () => setMessages(getThread(appointmentId));
    refresh();
    return subscribeThread(appointmentId, refresh);
  }, [appointmentId]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "nearest" });
  }, [open, messages.length]);

  const myRelay = useMemo(() => relayAddress(appointmentId, role), [appointmentId, role]);
  const unreadFromOther = messages.filter((m) => m.from !== role).length;

  const submit = () => {
    const body = draft.trim();
    if (!body) return;
    sendMessage(appointmentId, { from: role, authorName: selfName, body });
    setDraft("");
    setJustSent(true);
    window.setTimeout(() => setJustSent(false), 4000);
  };

  return (
    <div className="rounded-[12px] border border-[#EAE7F5] bg-white shadow-[0_8px_24px_-12px_rgba(61,46,107,0.08)]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#F4EEFE] text-[#5B4796]">
          <Mail className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-[#3D2E6B]">
            Messages with {otherName}
          </span>
          <span className="mt-0.5 block text-xs text-[#7E6BAF]">
            {messages.length === 0
              ? "No messages yet · emailed to both of you and kept on this appointment"
              : `${messages.length} message${messages.length === 1 ? "" : "s"} · last ${formatMessageTime(
                  messages[messages.length - 1]!.at,
                )}`}
          </span>
        </span>
        {unreadFromOther > 0 && (
          <span className="rounded-full bg-[#E0D9F7] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#3D2E6B]">
            {unreadFromOther} from {otherName.split(" ")[0]}
          </span>
        )}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#A89BD0] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-[#F0EAFB] px-5 pb-5 pt-4">
          <p className="mb-4 flex items-start gap-2 rounded-[10px] bg-[#FBF9FF] px-3 py-2.5 text-xs leading-relaxed text-[#7E6BAF]">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#A89BD0]" />
            <span>
              Every message is emailed to {role === "provider" ? otherName : "your provider"} and to
              you, and stays attached to this appointment in Lubin. Replies come back
              here through a private Lubin address — personal email addresses are never
              shared.
            </span>
          </p>

          {messages.length === 0 ? (
            <p className="mb-4 rounded-[10px] border border-dashed border-[#EAE7F5] px-4 py-6 text-center text-sm text-[#7E6BAF]">
              Nothing sent yet. Start the conversation below.
            </p>
          ) : (
            <ul className="mb-4 max-h-80 space-y-3 overflow-y-auto pr-1">
              {messages.map((m) => {
                const mine = m.from === role;
                return (
                  <li key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
                    <div
                      className={`max-w-[85%] rounded-[12px] px-4 py-3 ${
                        mine
                          ? "bg-[#3D2E6B] text-white"
                          : "border border-[#EAE7F5] bg-[#FBF9FF] text-[#3D2E6B]"
                      }`}
                    >
                      <p
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          mine ? "text-white/60" : "text-[#A89BD0]"
                        }`}
                      >
                        {mine ? "You" : m.authorName} · {formatMessageTime(m.at)}
                      </p>
                      <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed">
                        {m.body}
                      </p>
                      <p
                        className={`mt-2 text-[10px] ${
                          mine ? "text-white/50" : "text-[#A89BD0]"
                        }`}
                      >
                        Emailed to client and provider
                      </p>
                    </div>
                  </li>
                );
              })}
              <div ref={endRef} />
            </ul>
          )}

          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">
            {messages.length === 0 ? "Write a message" : "Reply"}
          </label>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder={
              role === "provider"
                ? `Reply to ${otherName} about this appointment…`
                : "Ask a question or share something before your session…"
            }
            className="mt-1.5 w-full resize-y rounded-[10px] border border-[#EAE7F5] bg-white px-3 py-2.5 text-sm text-[#3D2E6B] placeholder:text-[#A89BD0] focus:border-[#A89BD0] focus:outline-none focus:ring-2 focus:ring-[#E0D9F7]"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-[#7E6BAF]">
              Your Lubin address for this appointment:{" "}
              <span className="font-medium text-[#3D2E6B]">{myRelay}</span>
            </p>
            <button
              type="button"
              onClick={submit}
              disabled={!draft.trim()}
              className="inline-flex items-center gap-2 rounded-[8px] bg-[#3D2E6B] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2C2B4B] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
              {messages.length === 0 ? "Send message" : "Send reply"}
            </button>
          </div>
          {justSent && (
            <p className="mt-3 rounded-[10px] bg-[#E6F8F1] px-3 py-2 text-xs font-medium text-[#2D8E69]">
              Sent — emailed to both of you and saved on this appointment.
            </p>
          )}
        </div>
      )}
    </div>
  );
}