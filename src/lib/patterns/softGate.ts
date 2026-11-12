// Prototype-only soft gate: mock sign-up + AI intake completion, stored locally.
const GUEST_KEY = "lubinai_guest_mode";
const INTAKE_KEY = "lubinai_ai_intake_done";
const EVT = "lubin-soft-gate";

function read(key: string) {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function write(key: string, v: string) {
  try { window.localStorage.setItem(key, v); } catch {}
  window.dispatchEvent(new Event(EVT));
}

export const isSignedUp = () => read(GUEST_KEY) === "false";
export const mockSignUp = () => write(GUEST_KEY, "false");
export const isIntakeDone = () => read(INTAKE_KEY) === "1";
export const markIntakeDone = () => write(INTAKE_KEY, "1");

export function subscribeSoftGate(cb: () => void) {
  const onStorage = () => cb();
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener("storage", onStorage);
  };
}
