import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { ArrowRight, PlayCircle, X } from "lucide-react";
import {
  INPROGRESS_EVENT,
  readAllInProgress,
} from "@/lib/patterns/storage";
import { ASSESSMENT_IDS, ASSESSMENTS_BY_SLUG } from "@/lib/patterns/assessments";
import type { InProgress } from "@/lib/patterns/types";

const DISMISS_KEY = "lubinai_inprogress_banner_dismissed";

function readDismissed(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function writeDismissed(value: Record<string, number>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DISMISS_KEY, JSON.stringify(value));
  } catch {
    /* no-op */
  }
}

function findSlug(assessmentId: string): string | null {
  for (const slug in ASSESSMENTS_BY_SLUG) {
    if (ASSESSMENTS_BY_SLUG[slug].id === assessmentId) return slug;
  }
  return null;
}

export default function SessionRestoreBanner() {
  const location = useLocation();
  const [mostRecent, setMostRecent] = useState<InProgress | null>(null);
  const [dismissed, setDismissed] = useState<Record<string, number>>({});

  const refresh = () => {
    const all = readAllInProgress(ASSESSMENT_IDS);
    setMostRecent(all[0] ?? null);
  };

  useEffect(() => {
    setDismissed(readDismissed());
    refresh();
    const onChange = () => refresh();
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key.startsWith("lubinai_inprogress_")) refresh();
    };
    window.addEventListener(INPROGRESS_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(INPROGRESS_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  if (!mostRecent) return null;

  // Hide while user is actively inside that assessment runner.
  const slug = findSlug(mostRecent.assessmentId);
  if (slug && location.pathname === `/patterns/${slug}`) return null;

  // Respect dismissal for this specific in-progress session.
  const dismissedAt = dismissed[mostRecent.assessmentId];
  if (dismissedAt && dismissedAt >= mostRecent.updatedAt) return null;

  if (!slug) return null;

  const name = mostRecent.assessmentName || "Check-in";
  const q = Math.min(mostRecent.answeredCount + 1, mostRecent.total);

  const handleDismiss = () => {
    const next = { ...dismissed, [mostRecent.assessmentId]: Date.now() };
    setDismissed(next);
    writeDismissed(next);
  };

  return (
    <div className="fixed inset-x-0 top-3 z-[60] flex justify-center px-3 pointer-events-none">
      <div className="pointer-events-auto flex w-full max-w-[640px] items-center gap-3 rounded-2xl border border-white/70 bg-white/95 px-4 py-3 shadow-[0_18px_44px_-22px_rgba(126,107,175,0.55)] backdrop-blur-md">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-brand-lavender/70 text-brand-purple">
          <PlayCircle className="h-4 w-4" strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold text-brand-purple-dark">
            {name}
          </p>
          <p className="truncate text-[12px] text-brand-purple-dark/65">
            Question {q} of {mostRecent.total} · pick up where you left off
          </p>
        </div>
        <Link
          to="/patterns/$slug"
          params={{ slug }}
          className="inline-flex flex-none items-center gap-1 rounded-full bg-brand-purple px-3.5 py-1.5 text-[12.5px] font-semibold text-white no-underline shadow-sm transition hover:bg-brand-purple-dark"
        >
          Continue
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
        </Link>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-brand-purple-dark/55 transition hover:bg-brand-purple/10 hover:text-brand-purple-dark"
        >
          <X className="h-4 w-4" strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}