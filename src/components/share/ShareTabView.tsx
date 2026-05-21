import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  Download,
  Eye,
  Lock,
  Send,
  Sparkles,
} from "lucide-react";
import ShareConsentModal from "./ShareConsentModal";
import ShareOptionsModal from "./ShareOptionsModal";
import { buildSummary, RANGE_OPTIONS, type RangeKey } from "@/lib/share/summary";
import type { RecipientId } from "@/lib/share/shareStore";

type MoodCheckin = { id: string; mood: number; note: string; date: string };

export default function ShareTabView({
  checkins,
  isGuest,
  onRequestSignup,
  sharerName = "You",
}: {
  checkins: MoodCheckin[];
  isGuest: boolean;
  onRequestSignup: () => void;
  sharerName?: string;
}) {
  const [range, setRange] = useState<RangeKey>("30d");
  const [consentOpen, setConsentOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [confirmed, setConfirmed] = useState<{
    includedKeys: string[];
    recipient: RecipientId;
  } | null>(null);

  // mounted flag so SSR & first-paint don't mismatch on localStorage reads
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const summary = useMemo(
    () => buildSummary(range, { checkins }),
    [range, checkins],
  );

  const showEmpty = mounted && (isGuest || !summary.hasAnyData);

  const requireAccount = (action: () => void) => {
    if (isGuest) {
      onRequestSignup();
      return;
    }
    action();
  };

  return (
    <div className="grid gap-6">
      <header>
        <h2 className="text-2xl md:text-3xl font-bold text-[#3D2E6B]">
          Share My Summary
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#5A4A8A]">
          Create a summary you can share when you're ready, a simple recap of
          how you've been feeling, in plain language. You decide what to share
          and when.
        </p>
      </header>

      {showEmpty ? (
        <EmptyState />
      ) : (
        <>
          {/* Range pill toggle */}
          <div className="flex flex-wrap items-center gap-3">
            <div
              role="tablist"
              aria-label="Time range"
              className="inline-flex rounded-full border border-[#ECE7F6] bg-white p-1 shadow-[0_4px_20px_rgba(126,107,175,0.06)]"
            >
              {RANGE_OPTIONS.map((opt) => {
                const active = range === opt.id;
                return (
                  <button
                    key={opt.id}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setRange(opt.id)}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "bg-gradient-to-r from-[#7E6BAF] to-[#6A5A98] text-white shadow-[0_6px_14px_-6px_rgba(126,107,175,0.55)]"
                        : "text-[#5A4A8A] hover:text-[#3D2E6B]"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <p className="inline-flex items-center gap-1.5 text-xs text-[#5A4A8A]">
              <CalendarDays className="h-3.5 w-3.5" />
              Showing {summary.rangeLabel} · {summary.dateSpan}
            </p>
          </div>

          {/* Document-style preview card */}
          <article
            id="share-summary-print"
            className="overflow-hidden rounded-3xl bg-white shadow-[0_30px_80px_-30px_rgba(126,107,175,0.45)] ring-1 ring-[#ECE7F6]"
          >
            <header className="bg-gradient-to-br from-[#ECE7F6] via-[#F4F0FB] to-[#FAF8FD] px-6 py-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7E6BAF]">
                Lubin.AI · Wellbeing summary
              </p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-[#3D2E6B]">{sharerName}</h3>
                <span className="rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold text-[#5A4A8A] ring-1 ring-[#ECE7F6]">
                  {summary.rangeLabel}
                </span>
              </div>
            </header>

            <div className="space-y-4 p-6">
              <div className="rounded-2xl bg-gradient-to-br from-[#F4F0FB] to-white p-5 ring-1 ring-[#ECE7F6]">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7E6BAF]">
                  How you've been feeling
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#3D2E6B]">
                  {summary.insight}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Chip label="Mood" value={summary.moodLabel} />
                  <Chip label="Stress" value={summary.stressLabel} />
                  <Chip label="Direction" value={summary.directionLabel} />
                </div>
              </div>

              {summary.themes.length > 0 && (
                <div className="rounded-2xl bg-[#FAF8FD] p-5 ring-1 ring-[#ECE7F6]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7E6BAF]">
                    What's been coming up most
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {summary.themes.map((t) => (
                      <li
                        key={t.label}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-[#3D2E6B] ring-1 ring-[#ECE7F6]"
                      >
                        {t.label}
                        <span className="text-[10px] font-semibold text-[#7E6BAF]">
                          {t.count}×
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-2xl bg-[#FAF8FD] p-5 ring-1 ring-[#ECE7F6]">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7E6BAF]">
                  Support & care
                </p>
                <ul className="mt-3 space-y-1.5 text-sm text-[#3D2E6B]">
                  <li>📅 {summary.support.resourcesAccessed} resources accessed</li>
                  <li>💬 {summary.support.checkinsCompleted} check-ins completed</li>
                  <li>📋 {summary.support.appointmentsBooked} appointment{summary.support.appointmentsBooked === 1 ? "" : "s"} booked</li>
                </ul>
              </div>
            </div>

            <footer className="flex items-center justify-between gap-3 border-t border-[#ECE7F6] bg-[#FAF8FD] px-6 py-3 text-[11px] text-[#5A4A8A]">
              <span>Summary based on {summary.rangeLabel.toLowerCase()}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 font-semibold text-[#7E6BAF] ring-1 ring-[#ECE7F6]">
                <Lock className="h-3 w-3" /> User-owned
              </span>
            </footer>
          </article>

          {/* Review banner */}
          <aside className="flex items-start gap-3 rounded-2xl border border-[#ECE7F6] bg-[#F4F0FB] p-4">
            <Eye className="mt-0.5 h-5 w-5 flex-none text-[#7E6BAF]" />
            <p className="text-sm leading-relaxed text-[#3D2E6B]">
              <strong>Review this summary before sharing</strong> — Only you
              choose what gets shared and with whom. Nothing is sent
              automatically.
            </p>
          </aside>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={() => requireAccount(() => window.print())}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#ECE7F6] bg-white px-5 py-2.5 text-sm font-semibold text-[#3D2E6B] transition hover:border-[#7E6BAF]/40"
            >
              <Download className="h-4 w-4" />
              Download Summary
            </button>
            <button
              type="button"
              onClick={() => requireAccount(() => setConsentOpen(true))}
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#7E6BAF] to-[#6A5A98] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(126,107,175,0.55)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(61,46,107,0.55)]"
            >
              <Send className="h-4 w-4" />
              Share with a provider
            </button>
          </div>

          <p className="text-center text-xs italic text-[#5A4A8A]">
            This summary helps you reflect and share context. It is not a
            diagnosis.
          </p>
        </>
      )}

      <ShareConsentModal
        open={consentOpen}
        onClose={() => setConsentOpen(false)}
        summary={summary}
        onConfirm={(r) => {
          setConfirmed(r);
          setConsentOpen(false);
          setOptionsOpen(true);
        }}
      />
      {confirmed && (
        <ShareOptionsModal
          open={optionsOpen}
          onBack={() => {
            setOptionsOpen(false);
            setConsentOpen(true);
          }}
          onClose={() => setOptionsOpen(false)}
          includedKeys={confirmed.includedKeys}
          recipient={confirmed.recipient}
          summary={summary}
        />
      )}
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs text-[#5A4A8A] ring-1 ring-[#ECE7F6]">
      <span className="font-semibold text-[#7E6BAF]">{label}</span>
      <span className="text-[#3D2E6B]">{value}</span>
    </span>
  );
}

function EmptyState() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#ECE7F6] bg-white p-8 text-center shadow-[0_10px_30px_-22px_rgba(126,107,175,0.35)]">
      {/* blurred ghost preview */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-6 top-6 space-y-3 opacity-40 blur-[3px]"
      >
        <div className="h-4 w-1/3 rounded-full bg-[#ECE7F6]" />
        <div className="h-20 rounded-2xl bg-gradient-to-br from-[#F4F0FB] to-white" />
        <div className="h-12 rounded-2xl bg-[#FAF8FD]" />
      </div>

      <div className="relative pt-40">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F4F0FB] text-[#7E6BAF]">
          <Sparkles className="h-5 w-5" />
        </div>
        <p className="mt-4 text-sm leading-relaxed text-[#5A4A8A]">
          Nothing to share yet — once you've checked in a few times, you'll be
          able to create a simple summary to share.
        </p>
        <Link
          to="/check-in"
          className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#7E6BAF] to-[#6A5A98] px-5 py-2.5 text-sm font-semibold text-white no-underline shadow-[0_8px_20px_-6px_rgba(126,107,175,0.55)] hover:-translate-y-0.5 transition"
        >
          Start your first check-in
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}