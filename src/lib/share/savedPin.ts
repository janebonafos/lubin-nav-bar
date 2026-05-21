const KEY = "lubin.savedPin.v1";
const PIN_RE = /^\d{4}$/;

export function getSavedPin(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw && PIN_RE.test(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function setSavedPin(pin: string): boolean {
  if (typeof window === "undefined") return false;
  if (!PIN_RE.test(pin)) return false;
  try {
    window.localStorage.setItem(KEY, pin);
    return true;
  } catch {
    return false;
  }
}

export function clearSavedPin(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}