// Parsing helpers for inbound email replies to an appointment thread.
// Devs point their inbound-email provider (SES/Postmark/Mailgun/Resend inbound)
// at /api/public/appointment-message-inbound and these helpers normalise the
// payload into the same shape the in-app thread uses.

import type { ThreadRole } from "./appointmentMessages";

export type InboundReply = {
  appointmentRef: string;
  role: ThreadRole;
  body: string;
};

const REPLY_MARKER = /write your reply above this line/i;

/** provider-abcd1234@messages.lubin.care -> { role, appointmentRef } */
export function parseRelayAddress(
  address: string,
): { role: ThreadRole; appointmentRef: string } | null {
  const local = address.trim().toLowerCase().split("@")[0];
  if (!local) return null;
  const match = /^(provider|client)-([a-z0-9]+)$/.exec(local);
  if (!match) return null;
  return { role: match[1] as ThreadRole, appointmentRef: match[2]! };
}

/** Strip signatures, the reply marker and quoted history from an email reply. */
export function stripQuotedReply(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const kept: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (REPLY_MARKER.test(trimmed)) break;
    if (/^-{2,}\s*$/.test(trimmed)) break; // signature delimiter
    if (/^on .+wrote:$/i.test(trimmed)) break; // gmail/outlook quote header
    if (trimmed.startsWith(">")) continue; // quoted history
    kept.push(line);
  }
  return kept.join("\n").trim();
}

/** Normalise a provider webhook payload into an InboundReply. */
export function normaliseInbound(payload: {
  to?: string;
  recipient?: string;
  text?: string;
  plain?: string;
}): InboundReply | null {
  const to = payload.to ?? payload.recipient ?? "";
  const parsed = parseRelayAddress(to);
  if (!parsed) return null;
  const body = stripQuotedReply(payload.text ?? payload.plain ?? "");
  if (!body) return null;
  return { ...parsed, body };
}
