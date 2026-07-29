// Analytics consent — persisted in localStorage. Default is "unset" (no data
// sent). Users must explicitly grant. DNT / Sec-GPC map to implicit deny.

export type ConsentState = "granted" | "denied" | "unset";

const KEY = "lubin.analyticsConsent";
const EVENT = "lubin:analytics-consent-change";

function dntDenied(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { doNotTrack?: string; globalPrivacyControl?: boolean };
  const dnt = nav.doNotTrack ?? (typeof window !== "undefined" ? (window as unknown as { doNotTrack?: string }).doNotTrack : undefined);
  if (dnt === "1" || dnt === "yes") return true;
  if (nav.globalPrivacyControl === true) return true;
  return false;
}

export function getConsent(): ConsentState {
  if (typeof window === "undefined") return "unset";
  if (dntDenied()) return "denied";
  try {
    const v = window.localStorage.getItem(KEY);
    if (v === "granted" || v === "denied") return v;
  } catch {
    /* ignore */
  }
  return "unset";
}

export function setConsent(next: "granted" | "denied"): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, next);
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

export function subscribeConsent(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}

export function isDntDenied(): boolean {
  return dntDenied();
}