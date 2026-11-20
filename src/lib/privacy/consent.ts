// Design prototype only: preferences stay in this browser, not a live consent record.
export const CONSENT_KEY = "lubin.privacy.care-consent.v1";
export const PRIVACY_EVENT = "lubin:privacy:request";
export const PRIVACY_CHANGED = "lubin:privacy:changed";
export type PrivacyChoices = { research: boolean; aiTraining: boolean };
export const DEFAULT_CHOICES: PrivacyChoices = { research: false, aiTraining: false };

export function hasCareConsent(): boolean {
  try { return typeof window !== "undefined" && window.localStorage.getItem(CONSENT_KEY) === "yes"; }
  catch { return false; }
}

// Providers manage other people's data under their own terms, so the
// care-saving consent prompt is for patients only.
export function isProviderRole(): boolean {
  try { return typeof window !== "undefined" && window.localStorage.getItem("lubin.userRole") === "provider"; }
  catch { return false; }
}

export function canSaveInformation(saving: boolean): boolean {
  return !saving;
}

export function storeCareConsent(): void {
  window.localStorage.setItem(CONSENT_KEY, "yes");
  window.dispatchEvent(new Event(PRIVACY_CHANGED));
}

export function requestCareConsent(onSave?: () => void | Promise<void>): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PRIVACY_EVENT, { detail: { onSave } }));
}

export function loadPrivacyChoices(): PrivacyChoices {
  try {
    const stored = JSON.parse(window.localStorage.getItem("lubin.privacy.optional.v1") ?? "{}");
    return { research: stored.research === true, aiTraining: stored.aiTraining === true };
  } catch { return { ...DEFAULT_CHOICES }; }
}

export function savePrivacyChoices(choices: PrivacyChoices): void {
  window.localStorage.setItem("lubin.privacy.optional.v1", JSON.stringify(choices));
}