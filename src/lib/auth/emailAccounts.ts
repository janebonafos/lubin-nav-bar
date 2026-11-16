/**
 * Prototype-only email account registry (localStorage). No real accounts are
 * created; it only lets the design show "already registered" and
 * "registered as a provider" states.
 */
export type AccountRole = "client" | "provider";

const KEY = "lubin.emailAccounts";

/** Fictional sample accounts so the existing-account states can be previewed. */
export const SAMPLE_ACCOUNTS: Record<string, AccountRole> = {
  "client@example.com": "client",
  "provider@example.com": "provider",
};

const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  const e = normalizeEmail(email);
  if (e.length > 254 || e.includes("..")) return false;
  const tld = e.split(".").pop() ?? "";
  return EMAIL_RE.test(e) && /^[a-z]{2,}$/.test(tld);
}

function read(): Record<string, AccountRole> {
  try {
    return { ...SAMPLE_ACCOUNTS, ...JSON.parse(window.localStorage.getItem(KEY) || "{}") };
  } catch {
    return { ...SAMPLE_ACCOUNTS };
  }
}

export function findAccountRole(email: string): AccountRole | null {
  return read()[normalizeEmail(email)] ?? null;
}

export function registerEmailAccount(email: string, role: AccountRole) {
  const all = read();
  all[normalizeEmail(email)] = role;
  window.localStorage.setItem(KEY, JSON.stringify(all));
}

export type EmailCheck =
  | { kind: "invalid" }
  | { kind: "ok" }
  | { kind: "exists" } // signing up with an email that already has this role
  | { kind: "not-found" } // signing in with an unknown email
  | { kind: "other-role"; registeredAs: AccountRole };

export function checkEmail(email: string, mode: "signup" | "signin", role: AccountRole): EmailCheck {
  if (!isValidEmail(email)) return { kind: "invalid" };
  const existing = findAccountRole(email);
  if (existing && existing !== role) return { kind: "other-role", registeredAs: existing };
  if (mode === "signup" && existing) return { kind: "exists" };
  if (mode === "signin" && !existing) return { kind: "not-found" };
  return { kind: "ok" };
}
