// Who a Health Passport belongs to, and who manages it.
//
// The passport always belongs to the person receiving care. When someone
// registers on another person's behalf, the passport is created in that
// person's name and the account holder is recorded as their representative
// (relationship captured once, at registration). Neither the person nor the
// relationship can be changed or re-assigned from the app — only the person's
// name can be corrected or updated, following the rules in nameHistory.ts.
//
// Prototype only: everything is read from localStorage on this device.
import { useEffect, useState } from "react";
import { loadHealthDetails, subscribeHealthDetails } from "@/lib/intake/healthDetails";
import { loadProxySignup, relationshipLabel, type ProxySignup } from "@/lib/proxySignup";
import { NAME_HISTORY_EVENT, previousNames } from "@/lib/passport/nameHistory";

export type PassportHolder = {
  /** True when the account holder registered on someone else's behalf. */
  isProxy: boolean;
  /** Short name used in copy ("Anna's health card"). Null for self-managed. */
  firstName: string | null;
  /** Full legal name on the passport, if entered. */
  legalName: string | null;
  /** Name given at registration. */
  registeredName: string | null;
  /** When the registration answer was captured. */
  registeredAt: string | null;
  /** Relationship of the account holder to the person, e.g. "Parent or guardian". */
  relationshipLabel: string | null;
  /** Account holder's own name, when known. Never used as the passport name. */
  accountHolderName: string | null;
  /** Earlier names kept so past visits and records still match. */
  previousNames: string[];
};

const EMPTY: PassportHolder = {
  isProxy: false,
  firstName: null,
  legalName: null,
  registeredName: null,
  registeredAt: null,
  relationshipLabel: null,
  accountHolderName: null,
  previousNames: [],
};

function firstToken(value: string | undefined): string | null {
  const t = (value ?? "").trim().split(/\s+/)[0];
  return t || null;
}

function proxyRelationshipTitle(proxy: ProxySignup): string {
  if (proxy.relationship === "other" && proxy.relationshipOther) return proxy.relationshipOther;
  return proxy.relationshipLabel ?? relationshipLabel(proxy.relationship);
}

export function readAccountHolderName(): string | null {
  if (typeof window === "undefined") return null;
  const raw = (window.localStorage.getItem("lubin.userName") ?? "").trim();
  if (!raw || raw === "Guest User") return null;
  return raw;
}

export function loadPassportHolder(): PassportHolder {
  if (typeof window === "undefined") return EMPTY;
  const proxy = loadProxySignup();
  const details = loadHealthDetails();
  const legalName = details["identity.fullName"]?.trim() || null;
  const preferred = details["identity.preferredName"]?.trim() || null;
  const registeredName = proxy?.personName.trim() || null;
  return {
    isProxy: Boolean(proxy),
    firstName: proxy ? preferred || firstToken(legalName ?? undefined) || firstToken(registeredName ?? undefined) : null,
    legalName,
    registeredName,
    registeredAt: proxy?.capturedAt ?? null,
    relationshipLabel: proxy ? proxyRelationshipTitle(proxy) : null,
    accountHolderName: readAccountHolderName(),
    previousNames: previousNames(),
  };
}

/** Hydration-safe: empty on the server and first paint, then the real holder. */
export function usePassportHolder(): PassportHolder {
  const [holder, setHolder] = useState<PassportHolder>(EMPTY);
  useEffect(() => {
    const refresh = () => setHolder(loadPassportHolder());
    refresh();
    const stop = subscribeHealthDetails(refresh);
    window.addEventListener(NAME_HISTORY_EVENT, refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("lubin:auth-change", refresh);
    return () => {
      stop();
      window.removeEventListener(NAME_HISTORY_EVENT, refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("lubin:auth-change", refresh);
    };
  }, []);
  return holder;
}

export function formatRegisteredAt(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function normalise(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Guards against a name that would effectively hand the passport to someone
 * else. Returns a plain-language problem, or null when the name is fine.
 */
export function passportNameProblem(name: string, holder: PassportHolder): string | null {
  const value = name.trim();
  if (value.length < 2) return "Enter at least 2 characters.";
  if (!/\p{L}/u.test(value)) return "A name needs letters.";
  if (/[0-9@#$%^*_=+<>{}[\]\\|~`]/.test(value)) return "Use letters, spaces, hyphens or apostrophes only.";
  if (holder.isProxy && holder.accountHolderName && normalise(value) === normalise(holder.accountHolderName)) {
    return `That's your name as the account holder. This passport belongs to ${holder.firstName ?? "the person you care for"} — enter their name instead.`;
  }
  return null;
}

/** True when a first-time legal name doesn't start with the registered name. */
export function differsFromRegistration(name: string, holder: PassportHolder): boolean {
  if (!holder.isProxy || !holder.registeredName) return false;
  const first = firstToken(name)?.toLowerCase();
  const registered = firstToken(holder.registeredName)?.toLowerCase();
  return Boolean(first && registered && first !== registered);
}
