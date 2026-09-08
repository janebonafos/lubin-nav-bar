// Local-only claim links for a signed prescription.
//
// Prototype: a claim link is the single way a signed prescription reaches the
// patient. The same link is what the email button opens and what the printed
// copy would carry as a QR code. The URL holds nothing but an opaque id — the
// prescription itself is read from local browser storage.

import { findSignedPrescription, type SignedPrescriptionDocument } from "./documents";

export type ClaimState = "unclaimed" | "opened" | "claimed";

export type PrescriptionClaim = {
  claimId: string;
  docId: string;
  /** Snapshot so the claim page renders the signed record as issued. */
  document: SignedPrescriptionDocument;
  state: ClaimState;
  createdAt: number;
  openedAt?: number;
  claimedAt?: number;
  /** Email the provider shared the link with, if any. */
  sentTo?: string;
  sentAt?: number;
  /** Set when someone claimed it on behalf of the patient. */
  claimedFor?: { relationship: string; byName?: string };
};

const KEY = "lubin.rxClaims.v1";
const CHANGE_EVENT = "lubin-rx-claims-change";

function readAll(): PrescriptionClaim[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PrescriptionClaim[]) : [];
  } catch {
    return [];
  }
}

function writeAll(claims: PrescriptionClaim[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(claims.slice(0, 300)));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* noop */
  }
}

function opaqueId(): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 16)
      : Math.random().toString(36).slice(2, 18);
  return `rxc_${rand}`;
}

/** One durable claim link per signed prescription. */
export function ensureClaim(doc: SignedPrescriptionDocument): PrescriptionClaim {
  const all = readAll();
  const existing = all.find((c) => c.docId === doc.id);
  if (existing) {
    // Keep the snapshot fresh (void / delivery updates) without changing the id.
    const updated = { ...existing, document: doc };
    writeAll(all.map((c) => (c.claimId === existing.claimId ? updated : c)));
    return updated;
  }
  const claim: PrescriptionClaim = {
    claimId: opaqueId(),
    docId: doc.id,
    document: doc,
    state: "unclaimed",
    createdAt: Date.now(),
  };
  writeAll([claim, ...all]);
  return claim;
}

export function findClaim(claimId: string): PrescriptionClaim | undefined {
  const claim = readAll().find((c) => c.claimId === claimId);
  if (!claim) return undefined;
  const live = findSignedPrescription(claim.docId);
  return live ? { ...claim, document: live } : claim;
}

export function claimForDocument(docId: string): PrescriptionClaim | undefined {
  return readAll().find((c) => c.docId === docId);
}

export function claimPath(claimId: string): string {
  return `/rx-claim/${claimId}`;
}

export function claimUrl(claimId: string): string {
  const origin = typeof window === "undefined" ? "https://lubin.care" : window.location.origin;
  return `${origin}${claimPath(claimId)}`;
}

function patch(claimId: string, next: Partial<PrescriptionClaim>) {
  writeAll(readAll().map((c) => (c.claimId === claimId ? { ...c, ...next } : c)));
}

export function markClaimOpened(claimId: string) {
  const claim = readAll().find((c) => c.claimId === claimId);
  if (!claim || claim.state === "claimed") return;
  patch(claimId, { state: "opened", openedAt: claim.openedAt ?? Date.now() });
}

export function markClaimSent(claimId: string, email: string) {
  patch(claimId, { sentTo: email, sentAt: Date.now() });
}

export function claimPrescription(
  claimId: string,
  args?: { relationship?: string; byName?: string },
) {
  patch(claimId, {
    state: "claimed",
    claimedAt: Date.now(),
    claimedFor: args?.relationship
      ? { relationship: args.relationship, byName: args.byName }
      : undefined,
  });
}

export const CLAIM_STATE_LABEL: Record<ClaimState, string> = {
  unclaimed: "Not opened yet",
  opened: "Opened — not claimed",
  claimed: "In patient's account",
};

export function subscribeClaims(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, fn);
  return () => window.removeEventListener(CHANGE_EVENT, fn);
}
