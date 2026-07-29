// Analytics wrapper. Lazy-loads Amplitude only in the browser after explicit
// consent. Feature code imports `track` from `./events` — never this module
// or `@amplitude/analytics-browser` directly.

import { getConsent, subscribeConsent } from "./consent";
import { getAnalyticsId } from "./id";
import { sanitizeProps } from "./sanitize";

type AmplitudeMod = typeof import("@amplitude/analytics-browser");

let amp: AmplitudeMod | null = null;
let initPromise: Promise<AmplitudeMod | null> | null = null;
let currentRole: "client" | "provider" | "guest" = "guest";

function apiKey(): string | undefined {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return env?.VITE_LUBIN_AMPLITUDE_API_KEY;
}

function serverZone(): "US" | "EU" {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return env?.VITE_LUBIN_AMPLITUDE_SERVER_ZONE === "EU" ? "EU" : "US";
}

export async function initAnalytics(): Promise<void> {
  if (typeof window === "undefined") return;
  if (getConsent() !== "granted") return;
  const key = apiKey();
  if (!key) return;
  if (amp) return;
  if (initPromise) {
    await initPromise;
    return;
  }
  initPromise = (async () => {
    try {
      const mod = await import("@amplitude/analytics-browser");
      mod.init(key, undefined, {
        // Kill every autocapture surface — no page views, clicks, forms,
        // sessions, file downloads, element interactions, or network capture.
        defaultTracking: false,
        autocapture: false,
        identityStorage: "localStorage",
        serverZone: serverZone(),
        trackingOptions: {
          ipAddress: false,
          language: false,
          platform: true,
        },
        deviceId: getAnalyticsId(),
        minIdLength: 1,
      });
      const identify = new mod.Identify();
      identify.set("role", currentRole);
      mod.identify(identify);
      amp = mod;
      return mod;
    } catch (err) {
      console.warn("[analytics] init failed", err);
      return null;
    }
  })();
  await initPromise;
}

export function track(name: string, props?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  if (getConsent() !== "granted") return;
  const clean = sanitizeProps(props);
  if (!amp) {
    // Fire-and-forget init; drop this event if init hasn't finished — we
    // prefer losing an event over queueing PHI-adjacent state.
    void initAnalytics();
    return;
  }
  try {
    amp.track(name, clean);
  } catch (err) {
    console.warn("[analytics] track failed", err);
  }
}

export function setRole(role: "client" | "provider" | "guest"): void {
  currentRole = role;
  if (!amp) return;
  try {
    const identify = new amp.Identify();
    identify.set("role", role);
    amp.identify(identify);
  } catch {
    /* ignore */
  }
}

export function optOut(): void {
  if (!amp) return;
  try {
    amp.setOptOut(true);
    amp.reset();
  } catch {
    /* ignore */
  }
}

export function optIn(): void {
  if (!amp) {
    void initAnalytics();
    return;
  }
  try {
    amp.setOptOut(false);
  } catch {
    /* ignore */
  }
}

// React to consent changes at runtime.
if (typeof window !== "undefined") {
  subscribeConsent(() => {
    const state = getConsent();
    if (state === "granted") void initAnalytics();
    else if (state === "denied") optOut();
  });
}