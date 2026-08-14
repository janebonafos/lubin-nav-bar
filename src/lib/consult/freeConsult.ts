// Tracks whether the person has already used their one-time free
// 30-minute intro consultation. Local-only for now (no backend yet).

const KEY = "lubin:free-consult-claimed.v1";
export const FREE_CONSULT_EVENT = "lubin:free-consult-changed";

export type FreeConsultState = {
  claimed: boolean;
  claimedAt: number | null;
};

const isBrowser = () => typeof window !== "undefined";

export function getFreeConsult(): FreeConsultState {
  if (!isBrowser()) return { claimed: false, claimedAt: null };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { claimed: false, claimedAt: null };
    const parsed = JSON.parse(raw) as Partial<FreeConsultState>;
    return {
      claimed: Boolean(parsed.claimed),
      claimedAt: typeof parsed.claimedAt === "number" ? parsed.claimedAt : null,
    };
  } catch {
    return { claimed: false, claimedAt: null };
  }
}

export function claimFreeConsult(): void {
  if (!isBrowser()) return;
  const next: FreeConsultState = { claimed: true, claimedAt: Date.now() };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(FREE_CONSULT_EVENT));
  } catch {
    /* no-op */
  }
}

export function resetFreeConsult(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(KEY);
    window.dispatchEvent(new CustomEvent(FREE_CONSULT_EVENT));
  } catch {
    /* no-op */
  }
}

export function subscribeFreeConsult(handler: () => void): () => void {
  if (!isBrowser()) return () => {};
  const onChange = () => handler();
  window.addEventListener(FREE_CONSULT_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(FREE_CONSULT_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}