import { useCallback, useEffect, useState } from "react";

const KEY = "lubin.reviewedFlags.v1";
const CHANGE_EVENT = "lubin-reviewed-flags-change";

function loadSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed.filter((id) => typeof id === "string" && id.length > 0));
  } catch {
    return new Set();
  }
}

function saveSet(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...ids]));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* noop */
  }
}

export function isReviewed(attemptId: string): boolean {
  return loadSet().has(attemptId);
}

function normalizeIds(input: string | string[]): string[] {
  const arr = Array.isArray(input) ? input : [input];
  return arr.filter((id) => typeof id === "string" && id.length > 0);
}

export function markReviewed(attemptIds: string | string[]) {
  const ids = normalizeIds(attemptIds);
  if (ids.length === 0) return;
  const next = loadSet();
  for (const id of ids) {
    next.add(id);
  }
  saveSet(next);
}

export function useReviewedFlags(): {
  reviewedIds: Set<string>;
  markReviewed: (attemptIds: string | string[]) => void;
} {
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setReviewedIds(loadSet());
    const handler = () => setReviewedIds(loadSet());
    window.addEventListener(CHANGE_EVENT, handler);
    return () => window.removeEventListener(CHANGE_EVENT, handler);
  }, []);

  const mark = useCallback((attemptIds: string | string[]) => {
    const ids = normalizeIds(attemptIds);
    if (ids.length === 0) return;
    const next = loadSet();
    for (const id of ids) {
      next.add(id);
    }
    saveSet(next);
  }, []);

  return { reviewedIds, markReviewed: mark };
}
