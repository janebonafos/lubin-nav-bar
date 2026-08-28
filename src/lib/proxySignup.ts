// Reads the "signing up on behalf of someone else" choice captured at signup
// (src/components/AuthModal.tsx). When present, Health Passport copy shifts
// from "About you" to "About {name}" so guardians aren't addressed as the
// patient.
import type { ProxySignup } from "@/components/AuthModal";

const KEY = "lubin.proxySignup";

export function loadProxySignup(): ProxySignup | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.personName === "string" && parsed.personName.trim()) {
      return parsed as ProxySignup;
    }
    return null;
  } catch {
    return null;
  }
}

/** First name only, for warm copy like "About Sofia". */
export function proxyFirstName(proxy: ProxySignup | null): string | null {
  if (!proxy) return null;
  const first = proxy.personName.trim().split(/\s+/)[0];
  return first || null;
}
