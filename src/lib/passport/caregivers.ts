// Who else can manage this Health Passport.
//
// A passport often isn't managed by the person it describes: a parent handles a
// teen's care, an adult child handles a parent's. This store keeps the list of
// trusted people, the access level each one has, and which of them (if any) is
// currently acting on the passport owner's behalf.
//
// Demo persistence is localStorage. In production these rows belong in a
// `passport_delegates` table keyed by owner user id, with invites sent by email
// and access enforced server-side (RLS) — never client-side.

export type CaregiverRole = "view" | "manage";
export type CaregiverStatus = "invited" | "active" | "revoked";

export type Caregiver = {
  id: string;
  name: string;
  email: string;
  relationship: string;
  role: CaregiverRole;
  status: CaregiverStatus;
  invitedAt: string;
  acceptedAt?: string;
};

const KEY = "lubin.passportCaregivers";
const ACTING_KEY = "lubin.passportActingAs";
export const CAREGIVERS_EVENT = "lubin:passport-caregivers";

export const RELATIONSHIP_OPTIONS = [
  "Parent or guardian",
  "Adult child",
  "Spouse or partner",
  "Sibling",
  "Friend",
  "Care coordinator",
  "Other",
];

export const ROLE_META: Record<
  CaregiverRole,
  { label: string; blurb: string }
> = {
  view: {
    label: "Can view",
    blurb:
      "Sees the passport and upcoming sessions. Can't change details or share anything.",
  },
  manage: {
    label: "Can manage",
    blurb:
      "Can add health details, answer provider questions and approve sharing on your behalf.",
  },
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(CAREGIVERS_EVENT));
}

export function loadCaregivers(): Caregiver[] {
  return read<Caregiver[]>(KEY, []).filter((c) => c.status !== "revoked");
}

export function inviteCaregiver(input: {
  name: string;
  email: string;
  relationship: string;
  role: CaregiverRole;
}): Caregiver {
  const all = read<Caregiver[]>(KEY, []);
  const caregiver: Caregiver = {
    id: `cg_${Date.now().toString(36)}`,
    name: input.name.trim(),
    email: input.email.trim(),
    relationship: input.relationship,
    role: input.role,
    status: "invited",
    invitedAt: new Date().toISOString(),
  };
  write(KEY, [...all, caregiver]);
  return caregiver;
}

export function updateCaregiverRole(id: string, role: CaregiverRole) {
  const all = read<Caregiver[]>(KEY, []);
  write(
    KEY,
    all.map((c) => (c.id === id ? { ...c, role } : c)),
  );
}

/** Demo helper: stands in for the caregiver accepting their emailed invite. */
export function markCaregiverAccepted(id: string) {
  const all = read<Caregiver[]>(KEY, []);
  write(
    KEY,
    all.map((c) =>
      c.id === id
        ? { ...c, status: "active" as CaregiverStatus, acceptedAt: new Date().toISOString() }
        : c,
    ),
  );
}

export function revokeCaregiver(id: string) {
  const all = read<Caregiver[]>(KEY, []);
  write(
    KEY,
    all.map((c) => (c.id === id ? { ...c, status: "revoked" as CaregiverStatus } : c)),
  );
  if (loadActingAs() === id) setActingAs(null);
}

/** Id of the caregiver currently acting on the owner's behalf, if any. */
export function loadActingAs(): string | null {
  return read<string | null>(ACTING_KEY, null);
}

export function setActingAs(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) window.localStorage.setItem(ACTING_KEY, JSON.stringify(id));
  else window.localStorage.removeItem(ACTING_KEY);
  window.dispatchEvent(new Event(CAREGIVERS_EVENT));
}

export function subscribeCaregivers(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key === KEY || e.key === ACTING_KEY) cb();
  };
  window.addEventListener(CAREGIVERS_EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CAREGIVERS_EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}
