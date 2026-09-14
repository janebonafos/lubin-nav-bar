import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, MessageCircle, Send, ShieldCheck } from "lucide-react";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import SharedPassportDialog from "@/components/share/SharedPassportDialog";
import { shareState } from "@/lib/share/appointmentSharing";
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
  closedReason,
}: {
  appointmentId: string;
  role: ThreadRole;
  selfName: string;
  otherName: string;
  defaultOpen?: boolean;
  closedReason?: "cancelled" | "completed";
}) {
  const [messages, setMessages] = useState<AppointmentMessage[]>([]);
  const [open, setOpen] = useState(defaultOpen || Boolean(closedReason));
  const [draft, setDraft] = useState("");
  const [justSent, setJustSent] = useState(false);
  const [seenAt, setSeenAt] = useState(0);
  const [viewingShare, setViewingShare] = useState(false);
  const shared = viewingShare ? shareState(appointmentId) : null;
  const endRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLElement | null>(null);

  // When the thread is opened via the appointment's Message button
  // (defaultOpen on a fresh mount), bring the conversation into view so the
  // user lands on the messages — not on a form further down the page.
  useEffect(() => {
    if (!defaultOpen) return;
    const el = rootRef.current;
    if (!el) return;
    const t = window.setTimeout(() => {
      const top = el.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }, 80);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const refresh = () => {
      const next = getThread(appointmentId);
      setMessages(next);
      if (next.some((message) => message.from !== role && !message.system)) {
        setOpen(true);
      }
      try {
        setSeenAt(
          Number(window.localStorage.getItem(`lubin:appt-thread-seen:${appointmentId}:${role}`) || 0),
        );
      } catch {
        setSeenAt(0);
      }
    };
    refresh();
    return subscribeThread(appointmentId, refresh);
  }, [appointmentId, role]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "nearest" });
  }, [open, messages.length]);

  // Once the conversation is open, everything in it counts as read so the
  // "N new" pill and the icon dot clear for this visit.
  useEffect(() => {
    if (!open) return;
    try {
      const now = Date.now();
      window.localStorage.setItem(`lubin:appt-thread-seen:${appointmentId}:${role}`, String(now));
      setSeenAt(now);
    } catch {
      /* noop */
    }
  }, [open, appointmentId, role]);

  const myRelay = useMemo(() => relayAddress(appointmentId, role), [appointmentId, role]);
  const unreadFromOther = messages.filter((m) => m.from !== role && !m.system && m.at > seenAt).length;

  const submit = (submittedText = draft) => {
    const body = submittedText.trim();
    if (!body) return;
    sendMessage(appointmentId, { from: role, authorName: selfName, body });
    setDraft("");
    setJustSent(true);
    window.setTimeout(() => setJustSent(false), 4000);
  };

  return (
    <section
      ref={rootRef}
      className="overflow-hidden rounded-xl border border-brand-lavender bg-card shadow-[0_18px_44px_-24px_color-mix(in_oklab,var(--color-brand-purple)_35%,transparent)]"
    >
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="h-auto w-full justify-start rounded-none border-b border-brand-lavender px-4 py-4 text-left hover:bg-brand-lavender/30 sm:px-6"
      >
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-purple text-primary-foreground">
          <MessageCircle className="h-5 w-5" />
          {unreadFromOther > 0 && (
            <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-card bg-brand-purple-dark" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-brand-purple-dark">
            Appointment messages
          </span>
          <span className="mt-0.5 block truncate text-xs font-normal text-brand-purple">
            {closedReason
              ? `Conversation with ${otherName}`
              : messages.length === 0
              ? `Start a conversation with ${otherName}`
              : `${otherName} · Last message ${formatMessageTime(messages[messages.length - 1].at)}`}
          </span>
        </span>
        {unreadFromOther > 0 && (
          <span className="hidden rounded-full bg-brand-lavender px-3 py-1 text-xs font-semibold text-brand-purple-dark sm:inline-flex">
            {unreadFromOther} new
          </span>
        )}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-brand-purple-accent transition-transform ${open ? "rotate-180" : ""}`}
        />
      </Button>

      {viewingShare && shared && shared.kind !== "not_shared" && (
        <SharedPassportDialog
          grant={shared.grant}
          patientName={role === "client" ? "You" : otherName}
          ack={shared.kind === "acknowledged" ? shared.ack : null}
          onClose={() => setViewingShare(false)}
        />
      )}
      {open && (
        <div>
          {messages.length === 0 ? (
            closedReason ? null : (
            <p className="px-5 py-4 text-center text-xs text-brand-purple sm:px-8">
              No messages yet — start the conversation below.
            </p>
            )
          ) : (
            <div className="max-h-[34rem] space-y-5 overflow-y-auto px-5 py-6 sm:px-8">
              {messages.map((m) => {
                const legacyReschedule = m.system && /appointment (?:was successfully )?rescheduled by/i.test(m.body);
                const eventRole: ThreadRole | null =
                  m.eventType === "passport_shared" || m.eventType === "passport_acknowledged"
                    ? (m.from === "provider" || m.from === "client" ? m.from : null)
                    : null;
                const rescheduleRole: ThreadRole | null = eventRole ?? (m.eventType === "rescheduled"
                  ? (m.from === "provider" || m.from === "client" ? m.from : null)
                  : legacyReschedule
                    ? /\(provider\)|by the provider/i.test(m.body)
                      ? "provider"
                      : "client"
                    : null;

                if (m.system && !legacyReschedule) {
                  return (
                    <div key={m.id} className="flex justify-center">
                      <div className="w-full rounded-lg border border-dashed border-brand-lavender bg-brand-lavender/20 px-4 py-3 text-center">
                        <p className="text-[10px] font-semibold uppercase text-brand-purple-accent">
                          Lubin update · {formatMessageTime(m.at)}
                        </p>
                        <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-brand-purple-dark">
                          {m.body}
                        </p>
                        <p className="mt-2 text-[10px] text-brand-purple-accent">
                          Emailed to client and provider
                        </p>
                      </div>
                    </div>
                  );
                }
                const mine = rescheduleRole ? rescheduleRole === role : m.from === role;
                const authorLabel = rescheduleRole
                  ? mine
                    ? "You"
                    : otherName
                  : mine
                    ? "You"
                    : m.authorName;
                return (
                  <Message key={m.id} from={mine ? "user" : "assistant"} className={mine ? "items-end" : "items-start"}>
                    <p className="px-1 text-[10px] font-semibold uppercase text-brand-purple-accent">
                      {authorLabel} · {formatMessageTime(m.at)}
                    </p>
                    <MessageContent
                      className={mine
                        ? "max-w-[88%] rounded-xl rounded-tr-sm bg-brand-purple-dark px-4 py-3 text-primary-foreground shadow-sm"
                        : "max-w-[88%] rounded-xl rounded-tl-sm border border-brand-lavender bg-brand-lavender/30 px-4 py-3 text-brand-purple-dark shadow-sm"}
                    >
                      <p className="whitespace-pre-line text-sm leading-relaxed">{m.body}</p>
                      {rescheduleRole && (
                        <p className={`text-[10px] font-medium ${mine ? "text-primary-foreground/70" : "text-brand-purple-accent"}`}>
                          Automated appointment update
                        </p>
                      )}
                      {(m.eventType === "passport_shared" ||
                        m.eventType === "passport_acknowledged") && (
                        <button
                          type="button"
                          onClick={() => setViewingShare(true)}
                          className={`mt-1 inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1 text-[11.5px] font-semibold transition ${
                            mine
                              ? "bg-white/15 text-primary-foreground hover:bg-white/25"
                              : "bg-white text-brand-purple-dark ring-1 ring-brand-lavender hover:bg-brand-lavender/20"
                          }`}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" /> View shared passport
                        </button>
                      )}
                    </MessageContent>
                  </Message>
                );
              })}
              <div ref={endRef} />
            </div>
          )}

          {closedReason ? (
            <div className="border-t border-brand-lavender px-5 py-5 text-center sm:px-8">
              <p className="mx-auto max-w-md text-xs leading-relaxed text-brand-purple">
                You can no longer send messages in this conversation. If you need anything, email{" "}
                <a
                  href="mailto:info@lubin.ai"
                  className="font-medium text-brand-purple-dark underline underline-offset-2"
                >
                  info@lubin.ai
                </a>
                .
              </p>
            </div>
          ) : (
          <div className="border-t border-brand-lavender bg-brand-lavender/15 px-4 py-5 sm:px-8">
            <PromptInput
              onSubmit={({ text }) => submit(text)}
              className="[&_[data-slot=input-group]]:rounded-xl [&_[data-slot=input-group]]:border-brand-lavender [&_[data-slot=input-group]]:bg-card [&_[data-slot=input-group]]:shadow-sm"
            >
              <PromptInputTextarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={role === "provider" ? `Reply to ${otherName}…` : "Ask a question or share something before your session…"}
                className="min-h-20 text-sm text-brand-purple-dark placeholder:text-brand-purple-accent"
              />
              <PromptInputFooter className="justify-end">
                <PromptInputSubmit
                  size="sm"
                  disabled={!draft.trim()}
                  className="h-9 min-w-max gap-2 rounded-lg bg-brand-purple-dark px-4 text-primary-foreground hover:bg-brand-navy"
                >
                  <Send className="h-4 w-4 shrink-0" />
                  <span>{messages.length === 0 ? "Send message" : "Send reply"}</span>
                </PromptInputSubmit>
              </PromptInputFooter>
            </PromptInput>
            <div className="mt-3 flex flex-wrap items-start justify-between gap-3 text-[11px] text-brand-purple">
              <div>
              <p>
                Your Lubin address for this appointment:{" "}
                  <span className="font-medium text-brand-purple-dark">{myRelay}</span>
              </p>
              <a
                href={`/email-preview?template=${
                  role === "provider"
                    ? "appointment-message-sender-copy"
                    : "appointment-message"
                }`}
                target="_blank"
                rel="noreferrer"
                  className="mt-1 inline-block font-medium text-brand-purple-dark underline underline-offset-2"
              >
                Preview the email notification
              </a>
              </div>
              <p className="flex max-w-sm items-start gap-1.5 leading-relaxed">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-purple-accent" />
                Personal email addresses stay private.
              </p>
            </div>
            {justSent && (
              <p className="mt-3 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground">
                Sent — emailed to both of you and saved on this appointment.
              </p>
            )}
          </div>
          )}
        </div>
      )}
    </section>
  );
}
