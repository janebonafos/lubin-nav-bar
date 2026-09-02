// Opaque handoff for opening a prescription document in its own tab without
// putting patient, medication or prescription data in the URL.
//
// Prototype only: the payload is held in local browser storage under a random
// opaque key, and the URL carries nothing but that key.

import type { RxCountry } from "./store";
import type { SignedPrescriptionDocument } from "./documents";

export type PrescriptionView = {
  /** Local appointment key used to load a draft prescription. */
  appointmentId: string;
  country: RxCountry;
  clientName?: string;
  providerName?: string;
  draft?: boolean;
  /** Signed document id, when the tab should render the issued record. */
  docId?: string;
  /** Inline signed record, so the new tab renders even without the store. */
  document?: SignedPrescriptionDocument;
  createdAt: number;
};

const KEY_PREFIX = "lubin.rxView.v1:";
const MAX_AGE = 60 * 60 * 1000;

function opaqueId(): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `demo-rx-${rand}`;
}

/** Stores the view payload locally and returns the opaque route id. */
export function stashPrescriptionView(view: Omit<PrescriptionView, "createdAt">): string {
  const id = opaqueId();
  if (typeof window === "undefined") return id;
  try {
    prunePrescriptionViews();
    window.localStorage.setItem(
      KEY_PREFIX + id,
      JSON.stringify({ ...view, createdAt: Date.now() } satisfies PrescriptionView),
    );
  } catch {
    /* noop — the route falls back to the signed-document store. */
  }
  return id;
}

export function readPrescriptionView(id: string): PrescriptionView | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + id);
    if (!raw) return null;
    return JSON.parse(raw) as PrescriptionView;
  } catch {
    return null;
  }
}

function prunePrescriptionViews() {
  const now = Date.now();
  for (let i = window.localStorage.length - 1; i >= 0; i--) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith(KEY_PREFIX)) continue;
    try {
      const v = JSON.parse(window.localStorage.getItem(key) ?? "{}") as PrescriptionView;
      if (!v.createdAt || now - v.createdAt > MAX_AGE) window.localStorage.removeItem(key);
    } catch {
      window.localStorage.removeItem(key);
    }
  }
}
