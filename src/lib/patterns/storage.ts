import type { Attempt, InProgress } from "./types";

const COMPLETED_KEY = "completed_attempts";
const IN_PROGRESS_PREFIX = "lubinai_inprogress_";
const LEGACY_IN_PROGRESS_PREFIX = "inprogress_";
const INTRO_SEEN_PREFIX = "intro_seen_";

export const INPROGRESS_EVENT = "lubinai:inprogress-changed";

const isBrowser = () => typeof window !== "undefined";

function emitInProgressChanged() {
  if (!isBrowser()) return;
  try {
    window.dispatchEvent(new CustomEvent(INPROGRESS_EVENT));
  } catch {
    /* no-op */
  }
}

export function loadAttempts(): Attempt[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(COMPLETED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAttempt(attempt: Attempt): void {
  if (!isBrowser()) return;
  const all = loadAttempts();
  all.push(attempt);
  window.localStorage.setItem(COMPLETED_KEY, JSON.stringify(all));
}

export function getAttemptsFor(assessmentId: string): Attempt[] {
  return loadAttempts()
    .filter((a) => a.assessmentId === assessmentId)
    .sort((a, b) => b.takenAt - a.takenAt);
}

export function getLatestAttempt(assessmentId: string): Attempt | null {
  const list = getAttemptsFor(assessmentId);
  return list[0] ?? null;
}

export function loadInProgress(assessmentId: string): InProgress | null {
  if (!isBrowser()) return null;
  try {
    let raw = window.localStorage.getItem(IN_PROGRESS_PREFIX + assessmentId);
    if (!raw) {
      // Backward compat: migrate any legacy record.
      const legacy = window.localStorage.getItem(
        LEGACY_IN_PROGRESS_PREFIX + assessmentId,
      );
      if (!legacy) return null;
      raw = legacy;
      try {
        window.localStorage.setItem(IN_PROGRESS_PREFIX + assessmentId, legacy);
        window.localStorage.removeItem(LEGACY_IN_PROGRESS_PREFIX + assessmentId);
      } catch {
        /* no-op */
      }
    }
    const parsed = JSON.parse(raw) as Partial<InProgress>;
    if (!parsed || !Array.isArray(parsed.answers)) return null;
    const answers = parsed.answers as (number | null)[];
    const answered = answers.filter((v) => v !== null).length;
    return {
      assessmentId: parsed.assessmentId ?? assessmentId,
      assessmentName: parsed.assessmentName ?? "",
      total: parsed.total ?? answers.length,
      answeredCount: parsed.answeredCount ?? answered,
      lastIndex: parsed.lastIndex ?? Math.max(0, answered - 1),
      answers,
      currentIndex: parsed.currentIndex ?? Math.min(answered, answers.length - 1),
      startedAt: parsed.startedAt ?? parsed.updatedAt ?? Date.now(),
      updatedAt: parsed.updatedAt ?? Date.now(),
    };
  } catch {
    return null;
  }
}

export function saveInProgress(value: InProgress): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(
      IN_PROGRESS_PREFIX + value.assessmentId,
      JSON.stringify(value),
    );
    emitInProgressChanged();
  } catch {
    /* no-op: quota or serialization errors are non-critical */
  }
}

export function clearInProgress(assessmentId: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(IN_PROGRESS_PREFIX + assessmentId);
    window.localStorage.removeItem(LEGACY_IN_PROGRESS_PREFIX + assessmentId);
    emitInProgressChanged();
  } catch {
    /* no-op */
  }
}

export function hasSeenIntro(assessmentId: string): boolean {
  if (!isBrowser()) return false;
  return window.localStorage.getItem(INTRO_SEEN_PREFIX + assessmentId) === "1";
}

export function markIntroSeen(assessmentId: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(INTRO_SEEN_PREFIX + assessmentId, "1");
}

export function listAllInProgress(allIds: string[]): InProgress[] {
  return allIds
    .map((id) => loadInProgress(id))
    .filter((x): x is InProgress => !!x)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Alias matching the spec name. */
export function readAllInProgress(allIds: string[]): InProgress[] {
  return listAllInProgress(allIds);
}