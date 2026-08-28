// Captures the "I'm signing up on behalf of someone else" choice made during
// registration (src/components/AuthModal.tsx) so Health Passport copy shifts
// from "About you" to "About {name}" and clinicians know who the account holder
// is relative to the patient.

export type ProxyRelationship =
  | "parent"
  | "child"
  | "partner"
  | "sibling"
  | "relative"
  | "caregiver"
  | "legal-guardian"
  | "other";

export type ProxySignup = {
  /** Relationship of the account holder TO the person receiving care. */
  relationship: ProxyRelationship | string;
  /** Human label for the relationship, e.g. "Parent or guardian". */
  relationshipLabel?: string;
  /** Free text when relationship is "other". */
  relationshipOther?: string;
  /** First name (or preferred name) of the person receiving care. */
  personName: string;
  capturedAt?: string;
};

export const PROXY_RELATIONSHIPS: { value: ProxyRelationship; label: string }[] = [
  { value: "parent", label: "Parent or guardian" },
  { value: "child", label: "Adult child" },
  { value: "partner", label: "Partner or spouse" },
  { value: "sibling", label: "Sibling" },
  { value: "relative", label: "Another family member" },
  { value: "caregiver", label: "Caregiver or support worker" },
  { value: "legal-guardian", label: "Legal representative" },
  { value: "other", label: "Other" },
];

export function relationshipLabel(value: string): string {
  return PROXY_RELATIONSHIPS.find((r) => r.value === value)?.label ?? value;
}

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

export function saveProxySignup(proxy: ProxySignup | null) {
  if (typeof window === "undefined") return;
  try {
    if (!proxy) {
      window.localStorage.removeItem(KEY);
      return;
    }
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ ...proxy, capturedAt: proxy.capturedAt ?? new Date().toISOString() }),
    );
  } catch {
    /* storage unavailable */
  }
}

export function clearProxySignup() {
  saveProxySignup(null);
}

/** First name only, for warm copy like "About Sofia". */
export function proxyFirstName(proxy: ProxySignup | null): string | null {
  if (!proxy) return null;
  const first = proxy.personName.trim().split(/\s+/)[0];
  return first || null;
}

/** e.g. "You manage this passport as Anna's parent or guardian." */
export function proxyRelationshipSentence(proxy: ProxySignup | null): string | null {
  if (!proxy) return null;
  const name = proxyFirstName(proxy);
  const label = (
    proxy.relationship === "other" && proxy.relationshipOther
      ? proxy.relationshipOther
      : proxy.relationshipLabel ?? relationshipLabel(proxy.relationship)
  ).toLowerCase();
  return `You manage this passport as ${name}'s ${label}.`;
}
