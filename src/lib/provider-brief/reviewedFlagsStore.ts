import { useCallback, useEffect, useState } from "react";

const KEY = "lubin.reviewedFlags.v1";
const META_KEY = "lubin.reviewedFlagsMeta.v1";
const CHANGE_EVENT = "lubin-reviewed-flags-change";

function keyFor(scope?: string): string {
  return scope ? `${KEY}:${scope}` : KEY;
}

function metaKeyFor(scope?: string): string {
  return scope ? `${META_KEY}:${scope}` : META_KEY;
}

export type ReviewMeta = { at: number; by?: string };

export function loadReviewMeta(scope?: string): Record<string, ReviewMeta> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(metaKeyFor(scope));
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveReviewMeta(scope: string | undefined, ids: string[], by?: string) {
  if (typeof window === "undefined") return;
  try {
    const meta = loadReviewMeta(scope);
    const at = Date.now();
    for (const id of ids) {
      if (!meta[id]) meta[id] = { at, by };
    }
    window.localStorage.setItem(metaKeyFor(scope), JSON.stringify(meta));
  } catch {
    /* noop */
  }
}

function loadSet(scope?: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(keyFor(scope));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed.filter((id) => typeof id === "string" && id.length > 0));
  } catch {
    return new Set();
  }
}

function saveSet(scope: string | undefined, ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(keyFor(scope), JSON.stringify([...ids]));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* noop */
  }
}

export function isReviewed(attemptId: string, scope?: string): boolean {
  return loadSet(scope).has(attemptId);
}

function normalizeIds(input: string | string[]): string[] {
  const arr = Array.isArray(input) ? input : [input];
  return arr.filter((id) => typeof id === "string" && id.length > 0);
}

export function markReviewed(attemptIds: string | string[], scope?: string, by?: string) {
  const ids = normalizeIds(attemptIds);
  if (ids.length === 0) return;
  const next = loadSet(scope);
  for (const id of ids) {
    next.add(id);
  }
  saveReviewMeta(scope, ids, by);
  saveSet(scope, next);
}

export function useReviewedFlags(scope?: string): {
  reviewedIds: Set<string>;
  reviewMeta: Record<string, ReviewMeta>;
  markReviewed: (attemptIds: string | string[], by?: string) => void;
} {
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [reviewMeta, setReviewMeta] = useState<Record<string, ReviewMeta>>({});

  useEffect(() => {
    setReviewedIds(loadSet(scope));
    setReviewMeta(loadReviewMeta(scope));
    const handler = () => {
      setReviewedIds(loadSet(scope));
      setReviewMeta(loadReviewMeta(scope));
    };
    window.addEventListener(CHANGE_EVENT, handler);
    return () => window.removeEventListener(CHANGE_EVENT, handler);
  }, [scope]);

  const mark = useCallback(
    (attemptIds: string | string[], by?: string) => {
      const ids = normalizeIds(attemptIds);
      if (ids.length === 0) return;
      const next = loadSet(scope);
      for (const id of ids) {
        next.add(id);
      }
      saveReviewMeta(scope, ids, by);
      saveSet(scope, next);
    },
    [scope],
  );

  return { reviewedIds, reviewMeta, markReviewed: mark };
}
