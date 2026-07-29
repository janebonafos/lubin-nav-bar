// Pseudonymous device ID. Random UUID, stored in localStorage. Never derived
// from user identity or PII. Used as Amplitude deviceId.

const KEY = "lubin.analyticsId";

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getAnalyticsId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing) return existing;
    const next = randomId();
    window.localStorage.setItem(KEY, next);
    return next;
  } catch {
    return randomId();
  }
}

export function resetAnalyticsId(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}