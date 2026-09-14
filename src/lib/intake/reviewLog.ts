// Per-item clinician review notes for the Health Passport (frontend prototype,
// localStorage only).
//
// Rules this module exists to enforce in the design:
// - everything the patient enters is usable straight away and labelled
//   "Patient-provided";
// - a clinician review is recorded ONLY for the specific item a clinician
//   explicitly reviewed during an appointment, with who and when;
// - an appointment never marks the whole passport as verified, and a missing
//   review never blocks creating, viewing, updating, downloading or sharing.

const KEY = "lubin.passport.itemReviews.v1";
const SEED_FLAG = "lubin.passport.itemReviews.seed.v1";

export type ItemReview = {
  /** Health detail field id, e.g. "medication.list". */
  fieldId: string;
  reviewedBy: string;
  role: string;
  /** Epoch ms. */
  at: number;
  /** Where the review happened, in plain language. */
  context?: string;
};

export type ItemReviewMap = Record<string, ItemReview>;

export function loadItemReviews(): ItemReviewMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as ItemReviewMap) : {};
  } catch {
    return {};
  }
}

export function recordItemReview(review: ItemReview): void {
  if (typeof window === "undefined") return;
  const next = { ...loadItemReviews(), [review.fieldId]: review };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* noop */
  }
}

/** Demo records so the reviewed-item design is visible in the prototype. */
export function ensureDemoItemReviews(): void {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(SEED_FLAG)) return;
    window.localStorage.setItem(SEED_FLAG, "1");
  } catch {
    return;
  }
  recordItemReview({
    fieldId: "medication.list",
    reviewedBy: "Dr. Reyes Mendoza",
    role: "Psychiatrist",
    at: new Date("2026-08-29T10:20:00Z").getTime(),
    context: "Medication review appointment",
  });
  recordItemReview({
    fieldId: "history.allergies",
    reviewedBy: "Dr. Reyes Mendoza",
    role: "Psychiatrist",
    at: new Date("2026-08-29T10:24:00Z").getTime(),
    context: "Medication review appointment",
  });
}

export function reviewLabel(review: ItemReview): string {
  const when = new Date(review.at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `Reviewed by ${review.reviewedBy} · ${when}`;
}
