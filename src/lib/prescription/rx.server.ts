// Server-only prescribing primitives: hashing, OTP generation and rate limits.
// This module is never bundled for the browser.

const encoder = new TextEncoder();

/** SHA-256 hex digest. Used for the legal document hash and the OTP hash. */
export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Cryptographically secure six-digit signing code. Never Math.random. */
export function generateSigningOtp(): string {
  const max = 1_000_000;
  // Rejection sampling keeps the distribution uniform.
  const limit = Math.floor(0xffffffff / max) * max;
  const buf = new Uint32Array(1);
  let value = 0;
  do {
    crypto.getRandomValues(buf);
    value = buf[0]!;
  } while (value >= limit);
  return String(value % max).padStart(6, "0");
}

/** Only the hash is stored, bound to the exact prescription version. */
export function otpHashInput(args: {
  otp: string;
  draftId: string;
  version: number;
  documentSha256: string;
  providerUserId: string;
}): string {
  return [args.otp, args.draftId, args.version, args.documentSha256, args.providerUserId].join("|");
}

export async function hashOtp(args: Parameters<typeof otpHashInput>[0]): Promise<string> {
  const pepper = process.env["RX_OTP_PEPPER"] ?? "";
  return sha256Hex(`${otpHashInput(args)}|${pepper}`);
}

/** Constant-time string compare for OTP hashes. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
/** Signing-code requests allowed per provider per window. */
export const OTP_REQUEST_LIMIT = 5;
export const OTP_REQUEST_WINDOW_MS = 15 * 60 * 1000;

export function prescriptionNumber(now = new Date()): string {
  const stamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return `PH-${stamp}-${(buf[0]! % 1_000_000).toString().padStart(6, "0")}`;
}

export function calculateAge(dateOfBirth: string | null, at = new Date()): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  let age = at.getUTCFullYear() - dob.getUTCFullYear();
  const beforeBirthday =
    at.getUTCMonth() < dob.getUTCMonth() ||
    (at.getUTCMonth() === dob.getUTCMonth() && at.getUTCDate() < dob.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : null;
}
