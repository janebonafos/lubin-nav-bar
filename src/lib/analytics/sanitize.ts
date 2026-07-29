// URL sanitization. Convert dynamic route segments to placeholders and drop
// query strings + hashes entirely. The allowlist is derived from route file
// naming so new dynamic routes fail closed (unknown → generic template).

const ROUTE_TEMPLATES: { match: RegExp; template: string }[] = [
  { match: /^\/$/, template: "/" },
  { match: /^\/auth\/?$/, template: "/auth" },
  { match: /^\/profile\/?$/, template: "/profile" },
  { match: /^\/profile\/preview\/?$/, template: "/profile/preview" },
  { match: /^\/my-health-passport\/?$/, template: "/my-health-passport" },
  { match: /^\/self-discovery\/?$/, template: "/self-discovery" },
  { match: /^\/self-discovery\/[^/]+\/?$/, template: "/self-discovery/:slug" },
  { match: /^\/find-provider\/?$/, template: "/find-provider" },
  { match: /^\/provider\/[^/]+\/?$/, template: "/provider/:id" },
  { match: /^\/provider-onboarding\/?$/, template: "/provider-onboarding" },
  { match: /^\/check-in\/?$/, template: "/check-in" },
  { match: /^\/checkout\/?$/, template: "/checkout" },
  { match: /^\/payment-success\/?$/, template: "/payment-success" },
  { match: /^\/payment-failed\/?$/, template: "/payment-failed" },
  { match: /^\/appointment\/details\/?$/, template: "/appointment/details" },
  { match: /^\/appointment\/cancel\/?$/, template: "/appointment/cancel" },
  { match: /^\/appointment\/reschedule\/?$/, template: "/appointment/reschedule" },
  { match: /^\/share\/preview\/?$/, template: "/share/preview" },
  { match: /^\/share\/[^/]+\/?$/, template: "/share/:token" },
  { match: /^\/faqs\/?$/, template: "/faqs" },
  { match: /^\/resources\/?$/, template: "/resources" },
  { match: /^\/privacy\/?$/, template: "/privacy" },
  { match: /^\/terms\/?$/, template: "/terms" },
  { match: /^\/email-preview\/?$/, template: "/email-preview" },
];

export function sanitizePath(pathname: string): string {
  // Strip query/hash defensively (callers should already have done this).
  const clean = pathname.split("?")[0].split("#")[0];
  for (const { match, template } of ROUTE_TEMPLATES) {
    if (match.test(clean)) return template;
  }
  // Unknown route: return the leading segment only, with any remaining
  // segments replaced. Never echo the raw path.
  const parts = clean.split("/").filter(Boolean);
  if (parts.length === 0) return "/";
  return "/" + parts.map((p, i) => (i === 0 ? p.replace(/[^a-z0-9-]/gi, "") : ":seg")).join("/");
}

// Allowlist of primitive-only event property keys we ever forward. Anything
// else is dropped at the wrapper. Keeps free text / PHI out of payloads.
const ALLOWED_KEYS = new Set<string>([
  "route",
  "role",
  "target",
  "method",
  "granted",
  "instrument",
  "tab",
  "has_filters",
  "provider_hash",
  "zero_value",
  "currency",
  "outcome",
  "option",
  "categories_count",
  "include_future",
  "action",
  "step_index",
  "section",
  "has_content",
  "has_next_steps",
  "has_resources",
  "has_attachments",
  "kind",
  "ok",
]);

type Primitive = string | number | boolean;

export function sanitizeProps(input: Record<string, unknown> | undefined): Record<string, Primitive> {
  if (!input) return {};
  const out: Record<string, Primitive> = {};
  for (const [k, v] of Object.entries(input)) {
    if (!ALLOWED_KEYS.has(k)) continue;
    if (typeof v === "string") {
      // Keep strings short and stripped of any accidental URL/email shapes.
      if (v.length > 64) continue;
      if (/[@\s]/.test(v) && k !== "route") continue;
      out[k] = v;
    } else if (typeof v === "number" && Number.isFinite(v)) {
      out[k] = v;
    } else if (typeof v === "boolean") {
      out[k] = v;
    }
  }
  return out;
}

// Short opaque hash for opaque IDs (provider IDs, etc.). Not reversible.
export async function hashId(value: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    return "h_" + Math.abs(hashCode(value)).toString(36).slice(0, 10);
  }
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  const bytes = new Uint8Array(buf);
  let out = "";
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  for (let i = 0; i < 10; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return h;
}