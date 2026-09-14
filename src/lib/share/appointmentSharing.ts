/**
 * Health Passport sharing + provider acknowledgment for appointments booked
 * through Lubin.
 *
 * Prototype only: grants live in the local provider-share store, acknowledgments
 * live in localStorage, and every "notification" is a simulated in-thread
 * message. Nothing is sent anywhere and no real access is granted.
 *
 * Deliberate rules encoded here:
 * - Booking an appointment never shares anything; the patient confirms once.
 * - Acknowledgment confirms receipt only. It is never "verified", "approved"
 *   or "clinician-reviewed", and it is never inferred from a notice being
 *   delivered or a page being opened — only from an explicit action.
 */
import { INCLUDE_OPTIONS, mockSummary } from "@/lib/share/summary";
import {
  createProviderGrant,
  getAnyProviderGrant,
  getProviderGrant,
  type ProviderShareGrant,
} from "@/lib/share/providerShareStore";
import {
  linkedAppointmentId,
  passportAcknowledgedNotice,
  sendMessage,
} from "@/lib/messages/appointmentMessages";

const PREFS_KEY = "lubin.share.appointmentPrefs.v1";
const ACK_KEY = "lubin.share.appointmentAcks.v1";
const CHANGE_EVENT = "lubin-provider-shares-change";

export type ShareAcknowledgment = {
  appointmentId: string;
  providerName: string;
  at: number;
};

/** Everything included unless the patient has narrowed it before. */
const DEFAULT_KEYS = INCLUDE_OPTIONS.map((o) => o.key);

export function savedSharingPreferences(): string[] {
  if (typeof window === "undefined") return DEFAULT_KEYS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : null;
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_KEYS;
  } catch {
    return DEFAULT_KEYS;
  }
}

export function saveSharingPreferences(keys: string[]): void {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(keys));
  } catch {
    /* prototype only */
  }
}

export function includeLabels(keys: string[]): string[] {
  return keys.map((k) => INCLUDE_OPTIONS.find((o) => o.key === k)?.label ?? k);
}

function readAcks(): Record<string, ShareAcknowledgment> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(ACK_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAcks(next: Record<string, ShareAcknowledgment>) {
  try {
    window.localStorage.setItem(ACK_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* prototype only */
  }
}

/** Acknowledgments are shared by the two ids that model one appointment. */
function ackIds(appointmentId: string): string[] {
  const linked = linkedAppointmentId(appointmentId);
  return linked ? [appointmentId, linked] : [appointmentId];
}

export function getAcknowledgment(appointmentId: string): ShareAcknowledgment | null {
  const acks = readAcks();
  for (const id of ackIds(appointmentId)) {
    if (acks[id]) return acks[id];
  }
  return null;
}

/**
 * Explicit provider action only. Posts a receipt message from the provider so
 * both participants see the same acknowledgment.
 */
export function acknowledgeShare(input: {
  appointmentId: string;
  providerName: string;
  patientName?: string;
}): ShareAcknowledgment {
  const ack: ShareAcknowledgment = {
    appointmentId: input.appointmentId,
    providerName: input.providerName,
    at: Date.now(),
  };
  const acks = readAcks();
  for (const id of ackIds(input.appointmentId)) acks[id] = ack;
  writeAcks(acks);

  const body = passportAcknowledgedNotice({
    providerName: input.providerName,
    patientName: input.patientName,
    at: ack.at,
  });
  for (const id of ackIds(input.appointmentId)) {
    sendMessage(id, {
      from: "provider",
      authorName: input.providerName,
      body,
      eventType: "passport_acknowledged",
    });
  }
  return ack;
}

export type ShareState =
  | { kind: "not_shared" }
  | { kind: "awaiting_ack"; grant: ProviderShareGrant }
  | { kind: "acknowledged"; grant: ProviderShareGrant; ack: ShareAcknowledgment }
  | { kind: "ended"; grant: ProviderShareGrant; reason: "revoked" | "expired" };

export function shareState(appointmentId: string): ShareState {
  const active = getProviderGrant(appointmentId);
  const any = getAnyProviderGrant(appointmentId);
  if (!active) {
    if (!any) return { kind: "not_shared" };
    return {
      kind: "ended",
      grant: any,
      reason: any.revoked ? "revoked" : "expired",
    };
  }
  const ack = getAcknowledgment(appointmentId);
  if (ack && ack.at >= (active.updatedAt ?? active.createdAt)) {
    return { kind: "acknowledged", grant: active, ack };
  }
  return { kind: "awaiting_ack", grant: active };
}

export function shareStateLabel(state: ShareState): string {
  switch (state.kind) {
    case "not_shared":
      return "Not shared";
    case "awaiting_ack":
      return "Shared — awaiting acknowledgment";
    case "acknowledged":
      return `Acknowledged by ${state.ack.providerName} on ${formatAckTime(state.ack.at)}`;
    case "ended":
      return state.reason === "revoked" ? "Access revoked" : "Access expired";
  }
}

export function formatAckTime(at: number): string {
  return new Date(at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatShareDate(at: number): string {
  return new Date(at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Share this appointment's provider using the patient's saved preferences.
 * The provider comes from the appointment — no clinic picker, no QR scan.
 */
export function sharePassportForAppointment(input: {
  appointmentId: string;
  providerId?: string;
  providerName: string;
  appointmentLabel: string;
  appointmentTs?: number;
  includedKeys?: string[];
}): ProviderShareGrant {
  const includedKeys = input.includedKeys ?? savedSharingPreferences();
  saveSharingPreferences(includedKeys);
  return createProviderGrant({
    appointmentId: input.appointmentId,
    providerId: input.providerId,
    providerName: input.providerName,
    appointmentLabel: input.appointmentLabel,
    appointmentTs: input.appointmentTs,
    includedKeys,
    snapshot: mockSummary(),
  });
}

/** Seven days after the appointment (or from now for a past appointment). */
export function previewExpiry(appointmentTs?: number): number {
  const now = Date.now();
  const base = appointmentTs && appointmentTs > now ? appointmentTs : now;
  return base + 7 * 24 * 60 * 60 * 1000;
}
