import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowRight,
  CalendarDays,
  Download,
  Eye,
  Lock,
  Share2,
  Sparkles,
  Lightbulb,
} from "lucide-react";
import ShareConsentModal from "./ShareConsentModal";
import ShareOptionsModal from "./ShareOptionsModal";
import { buildSummary, mockSummary, INCLUDE_OPTIONS, RANGE_OPTIONS, type RangeKey } from "@/lib/share/summary";
import type { RecipientId } from "@/lib/share/shareStore";
import BookedProviderShareCard from "./BookedProviderShareCard";
import type { ClientUpcomingAppointment } from "@/components/profile/ClientAppointmentsSection";
import {
  createProviderGrant,
  updateProviderGrant,
  getProviderGrant,
  revokeProviderGrant,
  type ProviderShareGrant,
} from "@/lib/share/providerShareStore";

type MoodCheckin = { id: string; mood: number; note: string; date: string };

const SITE_FONT = "Inter, sans-serif";

export default function ShareTabView({
  checkins,
  isGuest,
  onRequestSignup,
  onStartCheckin,
  sharerName = "You",
  upcomingAppointments = [],
  autoOpenAppointmentId,
  onAutoOpenHandled,
}: {
  checkins: MoodCheckin[];
  isGuest: boolean;
  onRequestSignup: () => void;
  onStartCheckin?: () => void;
  sharerName?: string;
  upcomingAppointments?: ClientUpcomingAppointment[];
  autoOpenAppointmentId?: string | null;
  onAutoOpenHandled?: () => void;
}) {
  const [range, setRange] = useState<RangeKey>("30d");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [confirmed, setConfirmed] = useState<{
    includedKeys: string[];
    recipient: RecipientId;
    attemptIds?: string[];
  } | null>(null);
  // Provider (appointment-linked) sharing state
  const [providerAppt, setProviderAppt] = useState<ClientUpcomingAppointment | null>(null);
  const [providerMode, setProviderMode] = useState<"share" | "update" | null>(null);
  const [viewingGrant, setViewingGrant] = useState<ProviderShareGrant | null>(null);
  const [expandedApptId, setExpandedApptId] = useState<string | null>(null);
  const [submittingApptId, setSubmittingApptId] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ClientUpcomingAppointment | null>(null);

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

  // Empty state only when there's truly no data. Guests with no data see the
  // empty state with a Create account CTA; guests with data see the preview
  // and only get prompted to sign up when they click Share.
  const hasData = useMemo(
    () => buildSummary(range, { checkins }).hasAnyData,
    [range, checkins],
  );
  const showEmpty = mounted && !hasData;

  const requireAccount = (action: () => void) => {
    if (isGuest) {
      onRequestSignup();
      return;
    }
    action();
  };

  const openProviderConsent = (
    appt: ClientUpcomingAppointment,
    mode: "share" | "update" = "share",
  ) => {
    requireAccount(() => {
      setProviderAppt(appt);
      setProviderMode(mode);
      setExpandedApptId(appt.id);
    });
  };

  // Auto-open from deep link (e.g. from payment success page)
  useEffect(() => {
    if (!autoOpenAppointmentId || !mounted) return;
    const appt = upcomingAppointments.find(
      (a) => a.id === autoOpenAppointmentId,
    );
    if (appt && !getProviderGrant(appt.id)) {
      openProviderConsent(appt, "share");
    }
    onAutoOpenHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenAppointmentId, mounted, upcomingAppointments.length]);

  const closeInline = () => {
    setProviderAppt(null);
    setProviderMode(null);
    setExpandedApptId(null);
  };

  const scrollToAppt = (id: string) => {
    if (typeof window === "undefined") return;
    requestAnimationFrame(() => {
      const el = document.getElementById(`appt-share-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  };

  return (
    <div className="grid gap-6">
      {/* Booked-provider share cards (appointment-linked) */}
      {upcomingAppointments.length > 0 && (
        <section className="overflow-hidden rounded-3xl border border-[#F4F0FB] bg-white shadow-xl shadow-[#2D245A]/[0.06]">
          <div className="px-6 pb-4 pt-6 sm:px-8 sm:pt-8">
            <div className="mb-1 flex items-end justify-between gap-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#7C69BA]">
                Share with your booked providers
              </p>
              <span className="text-xs font-medium text-[#7C69BA]/60">
                {upcomingAppointments.length}{" "}
                {upcomingAppointments.length === 1 ? "appointment" : "appointments"}
              </span>
            </div>
            <h2 className="mb-2 text-2xl font-bold text-[#2D245A]">
              Upcoming appointments
            </h2>
            <p className="text-sm leading-relaxed text-[#4A3E7F]/70">
              Pick an appointment to choose what your provider sees before your session. Nothing is shared without your permission.
            </p>
          </div>
          <div className="px-4 pb-6 sm:px-6 sm:pb-8">
            <div className="flex flex-col space-y-3">
              {upcomingAppointments.map((a) => (
                <div key={a.id} id={`appt-share-${a.id}`}>
                <BookedProviderShareCard
                  key={a.id}
                  appointment={a}
                  highlight={a.id === autoOpenAppointmentId}
                  onReviewAndShare={() => openProviderConsent(a, "share")}
                  onUpdate={() => openProviderConsent(a, "update")}
                  onViewShared={(g) => setViewingGrant(g)}
                  expanded={expandedApptId === a.id}
                  onToggleExpand={(next) => {
                    if (next) {
                      const grant = getProviderGrant(a.id);
                      openProviderConsent(a, grant ? "update" : "share");
                    } else {
                      closeInline();
                    }
                  }}
                  expandedContent={
                    expandedApptId === a.id && providerAppt?.id === a.id ? (() => {
                      const existing = getProviderGrant(a.id);
                      const currentIds = summary.attemptsInRange.map((x) => x.id);
                      const initialAttemptIds =
                        existing && existing.includedKeys.includes("assessments")
                          ? existing.snapshot.attemptsInRange
                              .map((x) => x.id)
                              .filter((id) => currentIds.includes(id))
                          : undefined;
                      const effectiveMode: "share" | "update" =
                        existing ? "update" : "share";
                      return (
                      <ShareConsentModal
                        open={true}
                        summary={summary}
                        onRangeChange={setRange}
                        providerContext={{
                          providerName: a.providerName,
                          appointmentLabel: a.fullLabel,
                        }}
                        submitting={submittingApptId === a.id}
                        mode={effectiveMode}
                        initialIncluded={existing?.includedKeys}
                        initialAttemptIds={initialAttemptIds}
                        onRevoke={
                          existing ? () => setRevokeTarget(a) : undefined
                        }
                        onConfirm={(r) => {
                          const filteredSummary = r.attemptIds
                            ? {
                                ...summary,
                                attemptsInRange: summary.attemptsInRange.filter(
                                  (att) => r.attemptIds!.includes(att.id),
                                ),
                              }
                            : summary;
                          if (submittingApptId) return;
                          setSubmittingApptId(a.id);
                          const isUpdate = effectiveMode === "update";
                          window.setTimeout(() => {
                            if (isUpdate) {
                              updateProviderGrant(a.id, {
                                includedKeys: r.includedKeys,
                                snapshot: filteredSummary,
                              });
                              toast.success("Shared information updated", {
                                description: `${a.providerName} will see your updated summary before your session.`,
                              });
                            } else {
                              createProviderGrant({
                                appointmentId: a.id,
                                providerName: a.providerName,
                                appointmentLabel: a.fullLabel,
                                appointmentTs: a.ts,
                                includedKeys: r.includedKeys,
                                snapshot: filteredSummary,
                              });
                              toast.success("Health Passport shared", {
                                description: `${a.providerName} can now view your summary before your session.`,
                              });
                            }
                            setSubmittingApptId(null);
                            closeInline();
                            scrollToAppt(a.id);
                          }, 700);
                        }}
                      />
                      );
                    })() : null
                  }
                />
                </div>
              ))}
            </div>
          </div>
          <div className="h-1 bg-gradient-to-r from-transparent via-[#7C69BA]/10 to-transparent" />
        </section>
      )}

      {upcomingAppointments.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[#ECE7F6]" />
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#A29EB6]">
            Other ways to share
          </p>
          <div className="h-px flex-1 bg-[#ECE7F6]" />
        </div>
      )}

      <header>
        <h2
          className="text-2xl md:text-3xl font-bold text-[#3D2E6B] tracking-tight"
          style={{ fontFamily: SITE_FONT }}
        >
          Share My Summary
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#6B6684]">
          Create a general summary you can share with anyone — a therapist,
          doctor, counselor, or someone you trust. You choose the recipient,
          what to include, and when to share.
        </p>
      </header>

      {!mounted ? null : showEmpty ? (
        <EmptyState
          onStart={onStartCheckin}
          isGuest={isGuest}
          onCreateAccount={onRequestSignup}
        />
      ) : (
        <>
          {/* Range pill toggle */}
          <div className="flex flex-col gap-4 pt-2 md:flex-row md:items-center md:justify-between">
            <div
              role="tablist"
              aria-label="Time range"
              className="inline-flex self-start rounded-lg border border-[#E9E4F4] bg-white p-1 shadow-sm"
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
                        ? "bg-[#7C69BA] text-white shadow-sm"
                        : "text-[#6B6684] hover:text-[#3D2E6B]"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#A29EB6]">
              <CalendarDays className="h-3.5 w-3.5" />
              Showing {summary.dateSpan}
            </p>
          </div>

          {/* Document */}
          <div className="relative">
            <article
              id="share-summary-print"
              className="relative overflow-hidden rounded-[28px] border border-white bg-white shadow-[0_24px_60px_-24px_rgba(74,62,127,0.18)] ring-1 ring-[#EFEAF8]"
            >
              <header className="flex items-start justify-between gap-3 border-b border-[#F0EDF8] bg-gradient-to-br from-[#F7F4FC] via-white to-white px-7 py-7 md:px-9">
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#A29EB6]">
                    Lubin.AI • Wellbeing Summary
                  </p>
                  <h3
                    className="text-3xl font-bold text-[#2D245A] leading-none tracking-tight"
                    style={{ fontFamily: SITE_FONT }}
                  >
                    {sharerName}
                  </h3>
                </div>
                <div className="rounded-lg border border-[#E1DAF1] bg-[#F5F1FB] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#7C69BA]">
                  {summary.rangeLabel}
                </div>
              </header>

              <div className="space-y-12 p-7 md:p-10">
                {/* Section 1: Feeling */}
                <section className="space-y-5">
                  <SectionEyebrow>How you've been feeling</SectionEyebrow>
                  <div className="space-y-4">
                    <p className="max-w-2xl text-base leading-relaxed text-[#3D2E6B]">
                      {summary.insight}
                    </p>
                    <div className="flex flex-wrap gap-2.5">
                      <ArtifactChip label="Mood" value={summary.moodLabel} dot="#7C69BA" />
                      <ArtifactChip label="Stress" value={summary.stressLabel} dot="#7C69BA" />
                      <ArtifactChip label="Direction" value={summary.directionLabel} dot="#7C69BA" />
                    </div>
                  </div>
                </section>

                {/* Section 2: Coming up */}
                {summary.themes.length > 0 && (
                  <section className="space-y-5">
                    <SectionEyebrow>What's been coming up most</SectionEyebrow>
                    <div className="flex flex-wrap gap-2.5">
                      {summary.themes.map((t) => (
                        <div
                          key={t.label}
                          className="inline-flex items-center gap-2 rounded-xl border border-[#E1DAF1] bg-[#F8F5FE] px-3.5 py-2 text-xs font-semibold text-[#7C69BA]"
                        >
                          {t.label}
                          <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold text-[#7C69BA] ring-1 ring-[#E9E4F4]">
                            {t.count}×
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Section 3: Support */}
                <section className="space-y-5">
                  <SectionEyebrow>Support &amp; care</SectionEyebrow>
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

              <footer className="flex items-center justify-between border-t border-[#F0EDF8] bg-[#FBFAFE] px-7 py-4 md:px-9">
                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#A29EB6]">
                  Generated by Health Passport
                </p>
                <div className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.22em] text-[#7C69BA]">
                  <Lock className="h-3 w-3" />
                  User-owned data
                </div>
              </footer>
            </article>
          </div>

          {/* Safety / review banner */}
          <aside className="flex items-center gap-4 rounded-2xl border border-[#E1DAF1] bg-[#F4F0FB] p-4 shadow-sm">
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-white text-[#7C69BA] shadow-inner">
              <Eye className="h-5 w-5" />
            </div>
            <p className="text-sm leading-relaxed text-[#4A3E7F]">
              <span className="font-bold">
                Review this summary before sharing
              </span>
              {" "}— Only you choose what gets shared. Nothing is sent
              automatically.
            </p>
          </aside>

          {/* Choose what to share — always visible, no extra click needed */}
          {!optionsOpen && (
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-[#ECE7F6]" />
              <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#A29EB6]">
                <Share2 className="h-3 w-3" />
                Choose what to share
              </p>
              <div className="h-px flex-1 bg-[#ECE7F6]" />
            </div>
          )}

          {!optionsOpen && (
            <ShareConsentModal
              open={true}
              summary={summary}
              onRangeChange={setRange}
              onConfirm={(r) => {
                requireAccount(() => {
                  setConfirmed(r);
                  setOptionsOpen(true);
                });
              }}
            />
          )}

          <div className="flex flex-col gap-3">
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => requireAccount(() => window.print())}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#E1DAF1] bg-white px-8 py-3.5 text-sm font-semibold text-[#3D2E6B] shadow-sm transition-all hover:border-[#7C69BA]/40 hover:bg-[#FBFAFE]"
              >
                <Download className="h-4 w-4" />
                Download Summary
              </button>
            </div>
            <p className="text-center text-[11px] italic text-[#A29EB6]">
              This summary helps you reflect and share context. It is not a
              diagnosis.
            </p>
          </div>

          {optionsOpen && confirmed && (
            <ShareOptionsModal
              open={optionsOpen}
              onBack={() => {
                setOptionsOpen(false);
                setConfirmed(null);
              }}
              onClose={() => {
                setOptionsOpen(false);
                setConfirmed(null);
              }}
              includedKeys={confirmed.includedKeys}
              recipient={confirmed.recipient}
              summary={
                confirmed.attemptIds
                  ? {
                      ...summary,
                      attemptsInRange: summary.attemptsInRange.filter((a) =>
                        confirmed.attemptIds!.includes(a.id),
                      ),
                    }
                  : summary
              }
            />
          )}
        </>
      )}

      {/* View-what-was-shared read-only sheet */}
      {viewingGrant && (
        <ViewSharedSheet
          grant={viewingGrant}
          onClose={() => setViewingGrant(null)}
        />
      )}

      {revokeTarget && (
        <RevokeConfirmDialog
          providerName={revokeTarget.providerName}
          onCancel={() => setRevokeTarget(null)}
          onConfirm={() => {
            const appt = revokeTarget;
            revokeProviderGrant(appt.id);
            toast.success("Access revoked", {
              description: `${appt.providerName} can no longer view this snapshot.`,
            });
            setRevokeTarget(null);
            closeInline();
            scrollToAppt(appt.id);
          }}
        />
      )}
    </div>
  );
}

function RevokeConfirmDialog({
  providerName,
  onCancel,
  onConfirm,
}: {
  providerName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-[24px] border border-[#ECE7F6] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pb-2 pt-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#A29EB6]">
            Revoke access
          </p>
          <h3 className="mt-1 text-lg font-bold text-[#2D245A]">
            Stop sharing with {providerName}?
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#5A4A8A]">
            {providerName} will immediately lose access to the Health Passport
            snapshot you shared. This cannot be undone — you can share again
            later if you change your mind.
          </p>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2 border-t border-[#F0EDF8] px-6 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-[12px] border border-[#ECE7F6] bg-white px-5 py-2 text-sm font-semibold text-[#3D2E6B] transition hover:bg-[#FBFAFE]"
          >
            Keep sharing
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-[12px] bg-[#7C69BA] px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(124,105,186,0.55)] transition hover:-translate-y-0.5 hover:bg-[#6857A3]"
          >
            Revoke access
          </button>
        </div>
      </div>
    </div>
  );
}

function ViewSharedSheet({
  grant,
  onClose,
}: {
  grant: ProviderShareGrant;
  onClose: () => void;
}) {
  const expiresLabel = new Date(grant.expiresAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-[24px] border border-[#ECE7F6] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[#F0EDF8] px-6 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#A29EB6]">
            Snapshot shared with {grant.providerName}
          </p>
          <p className="mt-1 text-sm text-[#3D2E6B]">
            For {grant.appointmentLabel} · Available until {expiresLabel}
          </p>
        </div>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto px-6 py-5 text-sm text-[#3D2E6B]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#7E6BAF]">
              Included
            </p>
            <ul className="mt-2 space-y-1">
              {grant.includedKeys.map((k) => (
                <li key={k} className="text-[13px]">
                  • {INCLUDE_OPTIONS.find((o) => o.key === k)?.label ?? k}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#7E6BAF]">
              Summary snapshot
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-[#4A3E7F]">
              {grant.snapshot.insight}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#F0EDF8] px-6 py-3">
          <button
            type="button"
            onClick={() => {
              if (
                typeof window !== "undefined" &&
                !window.confirm(
                  `Revoke ${grant.providerName}'s access to your Health Passport?`,
                )
              )
                return;
              revokeProviderGrant(grant.appointmentId);
              toast.success("Access revoked", {
                description: `${grant.providerName} can no longer view this snapshot.`,
              });
              onClose();
            }}
            className="rounded-lg border border-[#7C69BA]/15 bg-white px-5 py-2 text-sm font-semibold text-[#4A3E7F] transition hover:bg-[#F7F4FC]"
          >
            Revoke access
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#7C69BA] px-5 py-2 text-sm font-semibold text-white hover:bg-[#6857A3]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.22em] text-[#A29EB6]">
        {children}
      </span>
      <div className="h-px w-full bg-gradient-to-r from-[#EFEAF8] to-transparent" />
    </div>
  );
}

function ArtifactChip({
  label,
  value,
  dot,
}: {
  label: string;
  value: string;
  dot?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-xl border border-[#E9E4F4] bg-white px-3.5 py-2 text-xs font-medium text-[#3D2E6B] shadow-sm">
      {dot ? (
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: dot }}
        />
      ) : null}
      <span className="font-semibold text-[#4A3E7F]">{label}</span>
      <span className="text-[#A29EB6]">{value}</span>
    </span>
  );
}

function SupportStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-[#EFEAF8] bg-[#FBFAFE] p-5 text-center transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
      <div
        className="text-3xl font-semibold text-[#2D245A]"
        style={{ fontFamily: SITE_FONT }}
      >
        {value}
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6B6684]">
        {label}
      </p>
    </div>
  );
}

function EmptyState({
  onStart,
  isGuest,
  onCreateAccount,
}: {
  onStart?: () => void;
  isGuest?: boolean;
  onCreateAccount?: () => void;
}) {
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
      <div className="relative z-10 flex flex-col items-center gap-3 pt-7 sm:flex-row sm:justify-center">
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
        {isGuest && onCreateAccount && (
          <button
            type="button"
            onClick={onCreateAccount}
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#ECE7F6] bg-white px-7 py-3.5 text-sm font-semibold text-[#3D2E6B] transition-all duration-300 hover:bg-[#ECE7F6]"
          >
            Create an account
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}