// Read-only patient medical profile for the prescriber.
//
// It shows only two things, deliberately kept short:
//   1. Clinical information recorded for this prescription (safety review inputs)
//   2. What the client explicitly shared from their Health Passport
// Nothing here is editable — the safety rail remains the place to record data.
import { useEffect, useMemo, useState } from "react";
import { X, Check, ChevronDown } from "lucide-react";

import type { PatientSafetyInfo } from "@/lib/prescription/store";
import { infoLabel, infoRecordedSummary, type InfoKey } from "@/lib/prescription/safety";
import { sharedSafetyResponses } from "@/lib/prescription/sharedSafety";
import { getAnyProviderGrant } from "@/lib/share/providerShareStore";
import { ASSESSMENTS } from "@/lib/patterns/assessments";
import { getAssessmentStatus } from "@/lib/patterns/scoring";

const PROFILE_KEYS: InfoKey[] = [
  "allergies",
  "currentMedications",
  "conditions",
  "bipolarHistory",
  "age",
  "pregnancy",
  "labs",
];

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PatientProfileDrawer({
  open,
  onClose,
  appointmentId,
  clientName,
  patientInfo,
  visitMeds,
}: {
  open: boolean;
  onClose: () => void;
  appointmentId: string;
  clientName?: string;
  patientInfo?: PatientSafetyInfo;
  visitMeds?: { name: string }[];
}) {
  const [showAllResults, setShowAllResults] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const grant = useMemo(() => (open ? getAnyProviderGrant(appointmentId) : null), [open, appointmentId]);
  const safety = useMemo(() => (open ? sharedSafetyResponses(appointmentId) : []), [open, appointmentId]);

  const shareActive = !!grant && !grant.revoked && grant.expiresAt > Date.now();
  const sharedAssessments = shareActive && grant?.includedKeys?.includes("assessments");

  /** Latest attempt per assessment, newest first. */
  const results = useMemo(() => {
    if (!sharedAssessments) return [];
    const attempts = [...(grant?.snapshot?.attemptsInRange ?? [])].sort(
      (a, b) => b.takenAt - a.takenAt,
    );
    const seen = new Set<string>();
    const out: {
      name: string;
      clinicalName: string;
      score: number;
      maxScore: number;
      label: string;
      tone: string;
      takenAt: number;
    }[] = [];
    for (const a of attempts) {
      if (seen.has(a.assessmentId)) continue;
      const meta = ASSESSMENTS.find((m) => m.id === a.assessmentId);
      if (!meta) continue;
      seen.add(a.assessmentId);
      const status = getAssessmentStatus(meta.id, a.score, meta.maxScore, meta.lowerIsBetter);
      out.push({
        name: meta.name,
        clinicalName: meta.clinicalName,
        score: a.score,
        maxScore: meta.maxScore,
        label: status.label,
        tone: status.tone,
        takenAt: a.takenAt,
      });
    }
    return out;
  }, [grant, sharedAssessments]);

  if (!open) return null;

  const visibleResults = showAllResults ? results : results.slice(0, 3);

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <button
        type="button"
        aria-label="Close patient profile"
        onClick={onClose}
        className="absolute inset-0 bg-[#2C2B4B]/40"
      />
      <aside
        role="dialog"
        aria-label={`Medical profile for ${clientName || "the client"}`}
        className="relative flex h-full w-full max-w-[480px] flex-col bg-white shadow-2xl"
      >
        <header className="flex items-start gap-3 border-b border-[#F1ECF9] px-7 py-6">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#7E6BAF]">
              Medical profile · read only
            </p>
            <h2 className="mt-1 truncate text-xl font-bold tracking-tight text-[#3D2E6B]">
              {clientName || "Client"}
            </h2>
            <p className="mt-1 text-[12px] text-[#7E6BAF]">
              {shareActive
                ? `Shared for this appointment${grant?.dateRangeLabel ? ` · ${grant.dateRangeLabel}` : ""}`
                : "No active sharing — only information recorded here is shown"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#A89BD0] transition-colors hover:bg-[#F7F5FB] hover:text-[#5A4A8A]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-7 overflow-y-auto px-7 py-6">
          {/* 1 — Clinical information recorded for this prescription */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8C86A0]">
              Clinical information
            </h3>
            <ul className="mt-3 divide-y divide-[#F1EDFA]">
              {PROFILE_KEYS.map((key) => {
                const value = infoRecordedSummary(key, patientInfo, visitMeds);
                const recorded = !!value?.trim();
                return (
                  <li key={key} className="flex items-start gap-3 py-2.5">
                    <span className="mt-0.5 w-[42%] shrink-0 text-[12.5px] font-semibold text-[#2C2B4B]">
                      {infoLabel(key)}
                    </span>
                    <span
                      className={`flex-1 text-[12.5px] leading-relaxed ${
                        recorded ? "text-[#5A4A8A]" : "text-[#9A93AE]"
                      }`}
                    >
                      {recorded ? value : "Not documented"}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-[11.5px] leading-relaxed text-[#8C86A0]">
              “Not documented” is not the same as “none” — record it in the safety review before
              relying on it.
            </p>
          </section>

          {/* 2 — What the client shared */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8C86A0]">
              Shared from the Health Passport
            </h3>
            {!shareActive ? (
              <p className="mt-3 text-[12.5px] leading-relaxed text-[#5A4A8A]">
                {clientName || "The client"} has not shared Health Passport information for this
                appointment, or the access window has ended.
              </p>
            ) : (
              <div className="mt-3 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {[
                    { l: "Mood", v: grant?.snapshot?.moodLabel },
                    { l: "Stress", v: grant?.snapshot?.stressLabel },
                    { l: "Direction", v: grant?.snapshot?.directionLabel },
                  ]
                    .filter((p) => !!p.v)
                    .map((p) => (
                      <span
                        key={p.l}
                        className="rounded-full bg-[#F5F2FB] px-3 py-1 text-[12px] text-[#5A4A8A]"
                      >
                        <span className="font-semibold text-[#3D2E6B]">{p.l}</span> · {p.v}
                      </span>
                    ))}
                </div>

                {results.length === 0 ? (
                  <p className="text-[12.5px] leading-relaxed text-[#5A4A8A]">
                    No assessment results were included in what was shared.
                  </p>
                ) : (
                  <>
                    <ul className="space-y-2">
                      {visibleResults.map((r) => (
                        <li
                          key={r.clinicalName}
                          className="flex items-center gap-3 rounded-xl border border-[#EDE9F7] px-3.5 py-2.5"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-semibold text-[#2C2B4B]">
                              {r.name}{" "}
                              <span className="font-normal text-[#7E6BAF]">({r.clinicalName})</span>
                            </span>
                            <span className="block text-[11.5px] text-[#8C86A0]">
                              {r.score}/{r.maxScore} · {fmtDate(r.takenAt)}
                            </span>
                          </span>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${r.tone}`}
                          >
                            {r.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {results.length > 3 && (
                      <button
                        type="button"
                        onClick={() => setShowAllResults((v) => !v)}
                        className="inline-flex items-center gap-1 text-[12px] font-bold uppercase tracking-tight text-[#6E4FD3]"
                      >
                        {showAllResults ? "Show fewer" : `Show all ${results.length} results`}
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition-transform ${showAllResults ? "rotate-180" : ""}`}
                        />
                      </button>
                    )}
                  </>
                )}

                {safety.length > 0 && (
                  <div className="rounded-xl border border-[#EADFC4] bg-[#FDF8EC] px-4 py-3">
                    <p className="text-[12.5px] font-semibold text-[#8A6A20]">
                      Safety-related response{safety.length === 1 ? "" : "s"} to review
                    </p>
                    <ul className="mt-2 space-y-2.5">
                      {safety.map((s, i) => (
                        <li key={i} className="text-[12px] leading-relaxed text-[#5A4A8A]">
                          <span className="block font-semibold text-[#3D2E6B]">
                            {s.assessmentName} ({s.clinicalName}) · {fmtDate(s.takenAt)}
                          </span>
                          {s.itemText}
                          <span className="mt-0.5 block font-semibold text-[#3D2E6B]">
                            Client&rsquo;s response: “{s.response}”
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <footer className="border-t border-[#F1ECF9] px-7 py-4">
          <p className="flex items-start gap-2 text-[11.5px] leading-relaxed text-[#8C86A0]">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6E4FD3]" />
            Client-reported information shared with consent. It is not a medical record and does not
            replace your own history taking.
          </p>
        </footer>
      </aside>
    </div>
  );
}