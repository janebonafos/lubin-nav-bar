import type { Attempt, InProgress } from "./types";

const COMPLETED_KEY = "completed_attempts";
const IN_PROGRESS_PREFIX = "inprogress_";
const INTRO_SEEN_PREFIX = "intro_seen_";

const isBrowser = () => typeof window !== "undefined";

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
    const raw = window.localStorage.getItem(IN_PROGRESS_PREFIX + assessmentId);
    if (!raw) return null;
    return JSON.parse(raw) as InProgress;
  } catch {
    return null;
  }
}

export function saveInProgress(value: InProgress): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(
    IN_PROGRESS_PREFIX + value.assessmentId,
    JSON.stringify(value),
  );
}

export function clearInProgress(assessmentId: string): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(IN_PROGRESS_PREFIX + assessmentId);
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
    .filter((x): x is InProgress => !!x);
}