export type RecipientId =
  | "therapist"
  | "psychiatrist"
  | "counselor"
  | "doctor"
  | "other-mhp"
  | "trusted";

export type SharePayload = {
  token: string;
  pin: string | null;
  recipient: RecipientId;
  includedKeys: string[];
  createdAt: number;
  expiresAt: number;
  revoked?: boolean;
};

const STORE_KEY = "lubin.shares.v1";
const TOKEN_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function readStore(): Record<string, SharePayload> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, SharePayload>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota / JSON errors */
  }
}

function randomToken(length = 10): string {
  let out = "";
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const bytes = new Uint8Array(length);
    window.crypto.getRandomValues(bytes);
    for (let i = 0; i < length; i++) {
      out += TOKEN_ALPHABET[bytes[i] % TOKEN_ALPHABET.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      out += TOKEN_ALPHABET[Math.floor(Math.random() * TOKEN_ALPHABET.length)];
    }
  }
  return out;
}

export function createShare(input: {
  pin: string | null;
  recipient: RecipientId;
  includedKeys: string[];
}): SharePayload {
  const now = Date.now();
  const store = readStore();
  let token = randomToken();
  while (store[token]) token = randomToken();
  const payload: SharePayload = {
    token,
    pin: input.pin,
    recipient: input.recipient,
    includedKeys: input.includedKeys,
    createdAt: now,
    expiresAt: now + THIRTY_DAYS_MS,
  };
  store[token] = payload;
  writeStore(store);
  return payload;
}

export function getShare(token: string): SharePayload | null {
  const store = readStore();
  const payload = store[token];
  if (!payload) return null;
  if (payload.revoked) return null;
  if (payload.expiresAt < Date.now()) return null;
  return payload;
}

export function revokeShare(token: string): void {
  const store = readStore();
  if (!store[token]) return;
  store[token] = { ...store[token], revoked: true };
  writeStore(store);
}

export function buildShareUrl(token: string): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/share/${token}`;
}