/**
 * Data for the patient's "Manage sharing" area.
 *
 * Prototype only: real grants come from the local provider-share store, and a
 * couple of fictional entries are always included so the design is reviewable.
 * Access activity is simulated — nothing is fetched from any clinic.
 */
import { INCLUDE_OPTIONS } from "@/lib/share/summary";
import {
  listAllProviderGrants,
  revokeProviderGrant,
  type ProviderShareGrant,
} from "@/lib/share/providerShareStore";

export type AccessActivity = {
  at: number;
  /** Plain-language line, e.g. "Dr. Reyes Mendoza opened your summary". */
  text: string;
  kind: "shared" | "updated" | "opened" | "expired" | "stopped";
};

export type SharedAccess = {
  id: string;
  who: string;
  role?: string;
  context: string;
  /** Plain-language list of what was shared. */
  what: string[];
  sharedAt: number;
  expiresAt: number;
  status: "active" | "expired" | "stopped";
  activity: AccessActivity[];
  /** Fictional example rather than something the patient actually shared. */
  demo?: boolean;
};

const DAY = 24 * 60 * 60 * 1000;

function labels(keys: string[]): string[] {
  return keys.map((k) => INCLUDE_OPTIONS.find((o) => o.key === k)?.label ?? k);
}

function fromGrant(g: ProviderShareGrant): SharedAccess {
  const status: SharedAccess["status"] = g.revoked
    ? "stopped"
    : g.expiresAt < Date.now()
      ? "expired"
      : "active";
  const activity: AccessActivity[] = [
    { at: g.createdAt, text: `You shared your Health Passport with ${g.providerName}`, kind: "shared" },
  ];
  if (g.updatedAt) {
    activity.push({
      at: g.updatedAt,
      text: `You updated what ${g.providerName} can see`,
      kind: "updated",
    });
  }
  if (g.revokedAt) {
    activity.push({ at: g.revokedAt, text: `You stopped ${g.providerName}'s access`, kind: "stopped" });
  }
  if (status === "expired") {
    activity.push({ at: g.expiresAt, text: "Access expired automatically", kind: "expired" });
  }
  return {
    id: g.appointmentId,
    who: g.providerName,
    context: g.appointmentLabel,
    what: labels(g.includedKeys),
    sharedAt: g.createdAt,
    expiresAt: g.expiresAt,
    status,
    activity: activity.sort((a, b) => b.at - a.at),
  };
}

const now = Date.now();

/** Fictional examples so every state is visible in the prototype. */
export const DEMO_ACCESSES: SharedAccess[] = [
  {
    id: "demo-mercy-clinic",
    who: "Mercy Family Clinic",
    role: "Reception check-in",
    context: "Walk-in visit · Sep 12, 2026",
    what: ["Name, date of birth and Passport ID", "Contact and emergency contact"],
    sharedAt: now - 2 * DAY,
    expiresAt: now + 5 * DAY,
    status: "active",
    demo: true,
    activity: [
      { at: now - 2 * DAY + 3600_000, text: "Reception opened your health card", kind: "opened" },
      { at: now - 2 * DAY, text: "You shared your health card at check-in", kind: "shared" },
    ],
  },
  {
    id: "demo-dr-reyes",
    who: "Dr. Reyes Mendoza",
    role: "Psychiatrist",
    context: "Medication review · Aug 29, 2026",
    what: [
      "Medications and allergies",
      "Health details you saved",
      "Visit history and results",
    ],
    sharedAt: now - 16 * DAY,
    expiresAt: now - 9 * DAY,
    status: "expired",
    demo: true,
    activity: [
      { at: now - 9 * DAY, text: "Access expired automatically", kind: "expired" },
      { at: now - 15 * DAY, text: "Dr. Reyes Mendoza opened your summary", kind: "opened" },
      { at: now - 16 * DAY, text: "You shared your Health Passport", kind: "shared" },
    ],
  },
  {
    id: "demo-dr-cruz",
    who: "Dr. Alina Cruz",
    role: "Family doctor",
    context: "Cough consultation · Jul 14, 2026",
    what: ["Medications and allergies", "Health details you saved"],
    sharedAt: now - 60 * DAY,
    expiresAt: now - 52 * DAY,
    status: "stopped",
    demo: true,
    activity: [
      { at: now - 55 * DAY, text: "You stopped Dr. Alina Cruz's access", kind: "stopped" },
      { at: now - 59 * DAY, text: "Dr. Alina Cruz opened your summary", kind: "opened" },
      { at: now - 60 * DAY, text: "You shared your Health Passport", kind: "shared" },
    ],
  },
];

const STOPPED_DEMO_KEY = "lubin.passport.sharing.demoStopped.v1";

function stoppedDemoIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STOPPED_DEMO_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function stopAccess(access: SharedAccess): void {
  if (access.demo) {
    const next = Array.from(new Set([...stoppedDemoIds(), access.id]));
    try {
      window.localStorage.setItem(STOPPED_DEMO_KEY, JSON.stringify(next));
    } catch {
      /* prototype only */
    }
    window.dispatchEvent(new Event("lubin-provider-shares-change"));
    return;
  }
  revokeProviderGrant(access.id);
}

export function listSharedAccess(): SharedAccess[] {
  const stopped = stoppedDemoIds();
  const demo = DEMO_ACCESSES.map((a) =>
    stopped.includes(a.id)
      ? {
          ...a,
          status: "stopped" as const,
          activity: [
            { at: Date.now(), text: `You stopped ${a.who}'s access`, kind: "stopped" as const },
            ...a.activity,
          ],
        }
      : a,
  );
  const real = listAllProviderGrants().map(fromGrant);
  return [...real, ...demo].sort((a, b) => b.sharedAt - a.sharedAt);
}

export function formatDateTime(at: number): string {
  return new Date(at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function expiryText(access: SharedAccess): string {
  if (access.status === "stopped") return "You stopped this access";
  const days = Math.ceil((access.expiresAt - Date.now()) / DAY);
  if (access.status === "expired") return `Expired ${formatDateTime(access.expiresAt)}`;
  return `Expires ${formatDateTime(access.expiresAt)}${days > 0 ? ` · in ${days} day${days === 1 ? "" : "s"}` : ""}`;
}
