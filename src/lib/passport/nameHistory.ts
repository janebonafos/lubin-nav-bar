// Rules for changing the name on a Health Passport (prototype, local only).
//
// Based on how medical records treat patient identity:
// - Amend, never erase (HIPAA right to amend, 45 CFR §164.526; Philippine Data
//   Privacy Act, RA 10173 — right to rectification). A name change is added to
//   the record with who, when and why; the earlier name is kept.
// - Name + date of birth are the two identifiers clinics use to match a
//   patient to their records (WHO Patient Safety Solutions; Joint Commission
//   NPSG.01.01.01). Earlier names stay as "previously known as" so past
//   visits, prescriptions and results still match.
// - A legal name change needs a supporting document (e.g. PSA birth or
//   marriage certificate, court order, government ID); a spelling correction
//   needs a reason and confirmation that it's the same person. The clinic
//   verifies identity at the next visit.
// - A personal representative (parent, guardian, caregiver) acts on the
//   person's behalf; the record stays the person's (HIPAA §164.502(g)).
//   Changing the name never moves the passport to someone else.
import { loadHealthDetails, setHealthDetail } from "@/lib/intake/healthDetails";

const KEY = "lubin.passport.nameHistory.v1";
export const NAME_HISTORY_EVENT = "lubin-passport-name-history";

export type NameChangeReason = "first-entry" | "spelling" | "legal-change";

export const NAME_CHANGE_REASONS: {
  value: Exclude<NameChangeReason, "first-entry">;
  label: string;
  help: string;
  needsDocument: boolean;
}[] = [
  {
    value: "spelling",
    label: "Correct a spelling mistake",
    help: "Same person, name was typed wrong. A document is optional but helps the clinic verify faster.",
    needsDocument: false,
  },
  {
    value: "legal-change",
    label: "Legal name has changed",
    help: "For example after marriage, adoption or a court order. A supporting document is required.",
    needsDocument: true,
  },
];

export const NAME_DOCUMENT_EXAMPLES =
  "PSA birth certificate, marriage certificate, court order, or a government ID";

export type NameChange = {
  id: string;
  from: string | null;
  to: string;
  reason: NameChangeReason;
  reasonLabel: string;
  documentName?: string;
  /** Who made the change, e.g. "You · Parent or guardian". */
  by: string;
  at: number;
  /** The clinic confirms identity at the next visit. */
  status: "awaiting-verification" | "recorded";
};

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(NAME_HISTORY_EVENT));
}

export function loadNameHistory(): NameChange[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as NameChange[]) : [];
  } catch {
    return [];
  }
}

function saveNameHistory(list: NameChange[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
}

/** Earlier legal names, most recent first, never including the current one. */
export function previousNames(): string[] {
  const current = (loadHealthDetails()["identity.fullName"] ?? "").trim().toLowerCase();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const change of [...loadNameHistory()].sort((a, b) => b.at - a.at)) {
    const from = change.from?.trim();
    if (!from) continue;
    const k = from.toLowerCase();
    if (k === current || seen.has(k)) continue;
    seen.add(k);
    out.push(from);
  }
  return out;
}

/**
 * The only way the legal name on the passport changes. Records the change,
 * keeps the previous name, and never touches who the passport belongs to.
 */
export function recordLegalName(input: {
  to: string;
  reason: NameChangeReason;
  documentName?: string;
  by: string;
}) {
  if (typeof window === "undefined") return;
  const from = loadHealthDetails()["identity.fullName"]?.trim() || null;
  const to = input.to.trim().replace(/\s+/g, " ");
  if (!to || to === from) return;
  const reasonLabel =
    input.reason === "first-entry"
      ? "Name added"
      : NAME_CHANGE_REASONS.find((r) => r.value === input.reason)?.label ?? input.reason;
  const entry: NameChange = {
    id: `nc_${Date.now().toString(36)}`,
    from,
    to,
    reason: input.reason,
    reasonLabel,
    documentName: input.documentName,
    by: input.by,
    at: Date.now(),
    status: input.reason === "first-entry" ? "recorded" : "awaiting-verification",
  };
  saveNameHistory([entry, ...loadNameHistory()]);
  setHealthDetail("identity.fullName", to);
  emit();
}

export function formatNameChangeDate(at: number): string {
  return new Date(at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
