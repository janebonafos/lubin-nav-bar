// Shareable snapshots of a single assessment result.
//
// Demo storage layer: snapshots live in localStorage keyed by token, and the
// token also carries an encoded copy so a link opened in another browser can
// still render (server-side storage can replace both paths later).

export type SharedResultAnswer = { question: string; answer: string };

export type SharedResult = {
  token: string;
  assessmentSlug: string;
  assessmentName: string;
  clinicalName: string;
  score: number;
  maxScore: number;
  lowerIsBetter: boolean;
  statusLabel: string;
  explanation: string;
  summary: string;
  takenAt: number;
  /** Optional — only present when the sender chose to include answers. */
  answers?: SharedResultAnswer[];
  note?: string;
  createdAt: number;
  expiresAt: number;
  revoked?: boolean;
};

const STORE_KEY = "lubin.resultShares.v1";
const TOKEN_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function readStore(): Record<string, SharedResult> {
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

function writeStore(store: Record<string, SharedResult>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota / serialisation errors */
  }
}

function randomToken(length = 10): string {
  let out = "";
  const rand = new Uint8Array(length);
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(rand);
    for (let i = 0; i < length; i++) out += TOKEN_ALPHABET[rand[i]! % TOKEN_ALPHABET.length];
    return out;
  }
  for (let i = 0; i < length; i++)
    out += TOKEN_ALPHABET[Math.floor(Math.random() * TOKEN_ALPHABET.length)];
  return out;
}

export function encodeSharedResult(result: SharedResult): string {
  const json = JSON.stringify(result);
  if (typeof window === "undefined") return "";
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return window.btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeSharedResult(encoded: string): SharedResult | null {
  if (typeof window === "undefined") return null;
  try {
    const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const bin = window.atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    return parsed && typeof parsed === "object" ? (parsed as SharedResult) : null;
  } catch {
    return null;
  }
}

export function createResultShare(
  input: Omit<SharedResult, "token" | "createdAt" | "expiresAt">,
): SharedResult {
  const now = Date.now();
  const store = readStore();
  let token = randomToken();
  while (store[token]) token = randomToken();
  const record: SharedResult = {
    ...input,
    token,
    createdAt: now,
    expiresAt: now + THIRTY_DAYS_MS,
  };
  store[token] = record;
  writeStore(store);
  return record;
}

export function getResultShare(token: string): SharedResult | null {
  const record = readStore()[token];
  if (!record) return null;
  if (record.revoked) return null;
  if (record.expiresAt < Date.now()) return null;
  return record;
}

export function revokeResultShare(token: string): void {
  const store = readStore();
  if (!store[token]) return;
  store[token] = { ...store[token]!, revoked: true };
  writeStore(store);
}

export function buildResultShareUrl(record: SharedResult): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/result/${record.token}?d=${encodeSharedResult(record)}`;
}
