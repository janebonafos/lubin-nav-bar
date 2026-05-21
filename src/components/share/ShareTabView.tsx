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
  Lightbulb,
} from "lucide-react";
import ShareConsentModal from "./ShareConsentModal";
import ShareOptionsModal from "./ShareOptionsModal";
import { buildSummary, mockSummary, RANGE_OPTIONS, type RangeKey } from "@/lib/share/summary";
import type { RecipientId } from "@/lib/share/shareStore";

type MoodCheckin = { id: string; mood: number; note: string; date: string };

export default function ShareTabView({
  checkins,
  isGuest,
  onRequestSignup,
  onStartCheckin,
  sharerName = "You",
}: {
  checkins: MoodCheckin[];
  isGuest: boolean;
  onRequestSignup: () => void;
  onStartCheckin?: () => void;
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

  const summary = useMemo(() => {
    const real = buildSummary(range, { checkins });
    // Fall back to a populated mock so the user can preview what a shared
    // summary will look like before they have enough real data.
    if (!real.hasAnyData) return mockSummary();
    return real;
  }, [range, checkins]);

  // Show the preview to everyone (guests included). Sharing/downloading
  // still requires an account — gated below via requireAccount().
  const showEmpty = false;
  void mounted;

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

      {isGuest && (
        <aside className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-[#ECE7F6] bg-[#F4F0FB] p-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-white text-[#7E6BAF] shadow-sm">
              <Lock className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[#3D2E6B]">
                Create a free account to share
              </p>
              <p className="text-xs leading-normal text-[#7E6BAF]">
                Sharing securely with a provider requires an account so your
                data stays protected.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRequestSignup}
            className="inline-flex flex-none items-center gap-2 rounded-xl bg-[#7E6BAF] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#3D2E6B]"
          >
            Create account
            <ArrowRight className="h-4 w-4" />
          </button>
        </aside>
      )}
      {showEmpty ? (
        <EmptyState onStart={onStartCheckin} />
      ) : (
        <>
          {/* Range pill toggle */}
          <div className="flex flex-col gap-4 pt-2 md:flex-row md:items-center md:justify-between">
            <div
              role="tablist"
              aria-label="Time range"
              className="inline-flex rounded-xl bg-[#ECE7F6] p-1"
            >
              {RANGE_OPTIONS.map((opt) => {
                const active = range === opt.id;
                return (
                  <button
                    key={opt.id}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setRange(opt.id)}
                    className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "bg-white text-[#3D2E6B] shadow-sm"
                        : "text-[#7E6BAF] hover:text-[#3D2E6B]"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#7E6BAF]/70">
              <CalendarDays className="h-3.5 w-3.5" />
              Showing {summary.dateSpan}
            </p>
          </div>

          {/* Document — stacked paper artifact */}
          <div className="relative">
            {/* Paper stack shadow card behind */}
            <div
              aria-hidden
              className="absolute inset-0 translate-y-1 -rotate-[0.5deg] rounded-2xl border border-[#ECE7F6] bg-white shadow-sm"
            />
            <article
              id="share-summary-print"
              className="relative overflow-hidden rounded-2xl border border-[#ECE7F6] bg-white shadow-xl"
            >
              <header className="flex items-end justify-between gap-3 border-b border-[#ECE7F6] bg-gradient-to-br from-[#ECE7F6] to-white p-6">
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#7E6BAF]">
                    Lubin.AI • Wellbeing Summary
                  </p>
                  <h3 className="text-2xl font-bold text-[#3D2E6B]">{sharerName}</h3>
                </div>
                <div className="rounded-full border border-[#ECE7F6] bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#7E6BAF] shadow-sm">
                  {summary.rangeLabel}
                </div>
              </header>

              <div className="space-y-10 p-6 md:p-8">
                {/* Section 1: Feeling */}
                <section className="space-y-4">
                  <h4 className="border-b border-dashed border-[#ECE7F6] pb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#7E6BAF]">
                    How you've been feeling
                  </h4>
                  <div className="space-y-4">
                    <p className="text-base leading-relaxed text-[#3D2E6B]">
                      {summary.insight}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <ArtifactChip label="Mood" value={summary.moodLabel} />
                      <ArtifactChip label="Stress" value={summary.stressLabel} />
                      <ArtifactChip label="Direction" value={summary.directionLabel} />
                    </div>
                  </div>
                </section>

                {/* Section 2: Coming up */}
                {summary.themes.length > 0 && (
                  <section className="space-y-4">
                    <h4 className="border-b border-dashed border-[#ECE7F6] pb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#7E6BAF]">
                      What's been coming up most
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {summary.themes.map((t) => (
                        <div
                          key={t.label}
                          className="cursor-default rounded-lg border border-[#7E6BAF]/30 bg-white px-3 py-1 text-xs font-bold text-[#7E6BAF] transition-all hover:bg-[#7E6BAF] hover:text-white"
                        >
                          {t.label}{" "}
                          <span className="ml-1 font-normal opacity-60">
                            {t.count}×
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Section 3: Support */}
                <section className="space-y-4">
                  <h4 className="border-b border-dashed border-[#ECE7F6] pb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#7E6BAF]">
                    Support &amp; care
                  </h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <SupportStat
                      value={summary.support.resourcesAccessed}
                      label="Resources accessed"
                    />
                    <SupportStat
                      value={summary.support.checkinsCompleted}
                      label="Check-ins completed"
                    />
                    <SupportStat
                      value={summary.support.appointmentsBooked}
                      label={
                        summary.support.appointmentsBooked === 1
                          ? "Appointment"
                          : "Appointments"
                      }
                    />
                  </div>
                </section>
              </div>

              <footer className="flex items-center justify-between border-t border-[#ECE7F6] bg-[#FAF8FD] px-6 py-4 md:px-8">
                <p className="text-[9px] font-medium uppercase tracking-widest text-[#7E6BAF]">
                  Generated by Health Passport
                </p>
                <div className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wide text-[#7E6BAF]">
                  <Lock className="h-3 w-3" />
                  User-owned data
                </div>
              </footer>
            </article>
          </div>

          {/* Safety / review banner */}
          <aside className="flex items-start gap-4 rounded-r-xl border-l-4 border-[#7E6BAF] bg-[#F4F0FB]/50 p-4">
            <Eye className="mt-0.5 h-5 w-5 flex-none text-[#7E6BAF]" />
            <p className="text-sm leading-relaxed">
              <span className="font-bold text-[#3D2E6B]">
                Review this summary before sharing
              </span>
              <span className="text-[#7E6BAF]">
                {" "}— Only you choose what gets shared. Nothing is sent
                automatically.
              </span>
            </p>
          </aside>

          {/* Actions */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => requireAccount(() => window.print())}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-[#ECE7F6] bg-white px-8 py-3.5 text-sm font-semibold text-[#3D2E6B] transition-all hover:bg-[#ECE7F6]"
              >
                <Download className="h-4 w-4" />
                Download Summary
              </button>
              <button
                type="button"
                onClick={() => requireAccount(() => setConsentOpen(true))}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#7E6BAF] px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#7E6BAF]/20 transition-all hover:-translate-y-0.5 hover:bg-[#3D2E6B]"
              >
                <Send className="h-4 w-4" />
                Share with a provider
              </button>
            </div>
            <p className="text-center text-[11px] italic text-[#7E6BAF]">
              This summary helps you reflect and share context. It is not a
              diagnosis.
            </p>
          </div>
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

function ArtifactChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#ECE7F6] bg-[#FAF8FD] px-3 py-1.5 text-xs font-medium text-[#3D2E6B]">
      <span className="font-semibold text-[#7E6BAF]">{label}</span> {value}
    </span>
  );
}

function SupportStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-[#FAF8FD] p-3">
      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-white text-base font-bold text-[#3D2E6B] ring-1 ring-[#ECE7F6]">
        {value}
      </div>
      <p className="text-[11px] font-medium leading-tight text-[#7E6BAF]">
        {label}
      </p>
    </div>
  );
}

function EmptyState({ onStart }: { onStart?: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-[32px] border border-[#ECE7F6] bg-white p-10 text-center shadow-[0_30px_80px_-30px_rgba(126,107,175,0.35)] md:p-16">
      {/* Decorative soft background blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-[#ECE7F6] opacity-30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-[#F4F0FB] opacity-60 blur-3xl"
      />

      {/* Ghost preview + floating icon */}
      <div className="relative mb-12 flex h-32 w-full flex-col items-center justify-center">
        {/* Blurred skeleton layers behind the icon */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex -translate-y-2 flex-col items-center justify-center gap-3 opacity-20 blur-[8px]"
        >
          <div className="h-4 w-3/4 rounded-full bg-[#7E6BAF]" />
          <div className="h-4 w-1/2 rounded-full bg-[#7E6BAF]" />
          <div className="h-4 w-2/3 rounded-full bg-[#7E6BAF]" />
        </div>

        {/* Floating icon with soft halo */}
        <div className="relative z-10">
          <div
            aria-hidden
            className="absolute inset-0 scale-150 rounded-full bg-[#7E6BAF] opacity-10 blur-xl"
          />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white bg-[#F4F0FB] shadow-sm">
            <Lightbulb className="h-7 w-7 text-[#7E6BAF]" strokeWidth={1.6} />
            <Sparkles
              className="absolute -right-2 -top-2 h-5 w-5 text-[#7E6BAF] opacity-70"
              strokeWidth={2}
            />
          </div>
        </div>
      </div>

      {/* Copy */}
      <div className="relative z-10 space-y-3">
        <h3 className="text-2xl font-semibold text-[#3D2E6B]">
          Your future summaries will live here
        </h3>
        <p className="mx-auto max-w-md text-base leading-relaxed text-[#7E6BAF]">
          Nothing to share yet — once you've checked in a few times, you'll be
          able to create a simple summary to share.
        </p>
      </div>

      {/* CTA */}
      <div className="relative z-10 pt-7">
        {onStart ? (
          <button
            type="button"
            onClick={onStart}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7E6BAF] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_12px_24px_-8px_rgba(126,107,175,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#3D2E6B] hover:shadow-[0_16px_28px_-10px_rgba(61,46,107,0.5)] active:translate-y-0"
          >
            Start your first check-in
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <Link
            to="/my-health-passport"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7E6BAF] px-7 py-3.5 text-sm font-semibold text-white no-underline shadow-[0_12px_24px_-8px_rgba(126,107,175,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#3D2E6B] hover:shadow-[0_16px_28px_-10px_rgba(61,46,107,0.5)] active:translate-y-0"
          >
            Start your first check-in
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}