import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, ChevronRight, Lock } from "lucide-react";

import {
  formatUpdatedAt,
  healthDetailsProgress,
  healthDetailsUpdatedAt,
  loadHealthDetails,
  subscribeHealthDetails,
  type HealthDetails,
} from "@/lib/intake/healthDetails";
import { loadAttempts } from "@/lib/patterns/storage";
import { ASSESSMENTS } from "@/lib/patterns/assessments";
import { getAssessmentStatus } from "@/lib/patterns/scoring";
import {
  listSignedPrescriptions,
  subscribePrescriptionDocuments,
  type SignedPrescriptionDocument,
} from "@/lib/prescription/documents";
import { ensureSamplePrescriptionRecord } from "@/lib/prescription/sampleRecord";
import { passportId } from "@/lib/intake/healthDetails";

type PassportDestination =
  | "card"
  | "share"
  | "details"
  | "visits"
  | "prescriptions"
  | "patterns"
  | "records";

export default function PassportHome({
  ownerName = "Maria Santos",
  onNavigate,
}: {
  ownerName?: string;
  onNavigate: (destination: PassportDestination) => void;
}) {
  const [details, setDetails] = useState<HealthDetails>({});
  const [prescriptions, setPrescriptions] = useState<SignedPrescriptionDocument[]>([]);
  const [attempts, setAttempts] = useState(() => loadAttempts());
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  useEffect(() => {
    ensureSamplePrescriptionRecord();
    const refreshDetails = () => {
      setDetails(loadHealthDetails());
      setUpdatedAt(healthDetailsUpdatedAt());
    };
    const refreshPrescriptions = () => setPrescriptions(listSignedPrescriptions());
    refreshDetails();
    refreshPrescriptions();
    setAttempts(loadAttempts());
    const stopDetails = subscribeHealthDetails(refreshDetails);
    const stopPrescriptions = subscribePrescriptionDocuments(refreshPrescriptions);
    return () => {
      stopDetails();
      stopPrescriptions();
    };
  }, []);

  const progress = useMemo(() => healthDetailsProgress(details), [details]);
  const name = details["identity.fullName"] || details["identity.preferredName"] || ownerName;
  const currentMedication =
    details["medication.list"] ||
    prescriptions[0]?.medications
      .map((medication) => medication.genericName || medication.name)
      .filter(Boolean)
      .join(", ") ||
    "Nothing recorded";
  const allergy = details["history.allergies"] || "Not added";
  const latestAttempt = [...attempts].sort((a, b) => b.takenAt - a.takenAt)[0];
  const latestAssessment = latestAttempt
    ? ASSESSMENTS.find((assessment) => assessment.id === latestAttempt.assessmentId)
    : undefined;
  const latestStatus = latestAttempt && latestAssessment
    ? getAssessmentStatus(
        latestAttempt.assessmentId,
        latestAttempt.score,
        latestAssessment.maxScore,
        latestAssessment.lowerIsBetter,
      ).label
    : "Mild";

  const readiness = [
    { label: "Identity", ready: Boolean(details["identity.fullName"] || details["identity.dob"]) },
    { label: "Emergency contact", ready: Boolean(details["emergency.name"] || details["emergency.none"]) },
    { label: "Medications", ready: Boolean(details["medication.list"]) },
    { label: "Allergies", ready: Boolean(details["history.allergies"]) },
    { label: "Care history", ready: Boolean(details["care.previous"] || details["care.clinicians"]) },
  ];

  const pct = Math.round((progress.filled / Math.max(progress.total, 1)) * 100);

  return (
    <section
      aria-label="Health Passport overview"
      className="font-body grid grid-cols-1 gap-8 lg:grid-cols-12"
    >
      {/* Main column: hero + summary cards */}
      <div className="flex flex-col gap-8 lg:col-span-8">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-[2rem] bg-brand-lavender p-8 md:p-10">
          <div className="relative z-10 max-w-md">
            <h2 className="font-display mb-4 text-3xl leading-tight text-brand-purple-dark md:text-4xl">
              Your health information, ready for your next visit.
            </h2>
            <p className="mb-8 leading-relaxed text-brand-purple-dark/70">
              Keep your details, visits, medications, and records together.
              Choose what to share with your care team.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onNavigate("card")}
                className="rounded-full bg-brand-purple px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-brand-purple-dark"
              >
                Show health card
              </button>
              <button
                type="button"
                onClick={() => onNavigate("share")}
                className="rounded-full border border-brand-purple/20 bg-white/80 px-6 py-3 text-sm font-semibold text-brand-purple-dark backdrop-blur-sm transition-all hover:bg-white"
              >
                Use at a clinic
              </button>
              <button
                type="button"
                onClick={() => onNavigate("details")}
                className="rounded-full border border-brand-purple/20 bg-white/80 px-6 py-3 text-sm font-semibold text-brand-purple-dark backdrop-blur-sm transition-all hover:bg-white"
              >
                Review my details
              </button>
            </div>
          </div>
          {/* Decorative graphic */}
          <div className="absolute right-[-10%] top-[-10%] h-64 w-64 rounded-full bg-brand-purple-accent/30 opacity-50 blur-3xl" />
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <RecordCard
            eyebrow="Recent Checkup"
            title="Medication review"
            meta="Dr. Reyes Mendoza · Aug 29, 2026"
            action="View checkups"
            onClick={() => onNavigate("visits")}
          />
          <RecordCard
            eyebrow="Medications"
            title={currentMedication}
            meta={`${prescriptions.length || 1} issued prescription${(prescriptions.length || 1) === 1 ? "" : "s"} · Allergies: ${allergy}`}
            action="View prescriptions"
            onClick={() => onNavigate("prescriptions")}
          />
          <RecordCard
            eyebrow="Records and Results"
            title="Lab results, imaging, vaccinations"
            meta="7 documents · Newest Aug 29, 2026"
            action="View records"
            onClick={() => onNavigate("records")}
          />
          <RecordCard
            eyebrow="Latest Result"
            title={latestAttempt?.assessmentName || "Mood & wellbeing check"}
            meta={`${latestStatus} · ${latestAttempt ? new Date(latestAttempt.takenAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Sep 8, 2026"}`}
            action="View results"
            onClick={() => onNavigate("patterns")}
          />
          <RecordCard
            eyebrow="Wellbeing"
            title="Check-ins and patterns"
            meta="Mood, sleep, stress monitoring active"
            action="View patterns"
            onClick={() => onNavigate("patterns")}
            wide
          />
        </div>
      </div>

      {/* Readiness sidebar */}
      <aside className="lg:col-span-4">
        <div className="sticky top-8 rounded-[2rem] bg-brand-purple-dark p-8 text-white">
          <div className="mb-8 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-purple-accent">
              Ready to present
            </span>
            <Lock className="h-5 w-5 text-brand-purple-accent" strokeWidth={1.5} />
          </div>

          <div className="mb-10">
            <h3 className="font-display mb-1 text-3xl">{name}</h3>
            <p className="text-sm text-brand-purple-accent">
              Passport {passportId()}
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <div className="mb-2 flex justify-between text-xs">
                <span className="text-brand-purple-accent">Details added</span>
                <span className="font-bold">
                  {progress.filled} of {progress.total}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-brand-lavender"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <div className="space-y-4 border-t border-white/10 pt-6">
              {readiness.map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center gap-3 text-sm ${item.ready ? "" : "opacity-60"}`}
                >
                  {item.ready ? (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-purple">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </div>
                  ) : (
                    <div className="h-5 w-5 rounded-full border border-white/20" />
                  )}
                  <span>
                    {item.label}
                    {item.label === "Allergies" && !item.ready ? " (None known)" : ""}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-8">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-brand-purple-accent">
                Last updated
              </p>
              <p className="text-xs italic text-white/40">
                {formatUpdatedAt(updatedAt)}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </section>
  );
}

function RecordCard({
  eyebrow,
  title,
  meta,
  action,
  onClick,
  wide = false,
}: {
  eyebrow: string;
  title: string;
  meta: string;
  action: string;
  onClick: () => void;
  wide?: boolean;
}) {
  return (
    <article
      className={`flex flex-col justify-between rounded-2xl border border-brand-purple/10 bg-white p-6 shadow-sm transition-shadow hover:shadow-md ${wide ? "md:col-span-2" : ""}`}
    >
      <div>
        <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-brand-purple/60">
          {eyebrow}
        </div>
        <h3 className="font-display mb-1 text-xl text-brand-purple-dark">
          {title}
        </h3>
        <p className="text-sm text-brand-purple-dark/60">{meta}</p>
      </div>
      <button
        type="button"
        onClick={onClick}
        className="group mt-6 flex w-fit items-center gap-1 text-sm font-semibold text-brand-purple transition-colors hover:text-brand-purple-dark"
      >
        {action}
        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </button>
    </article>
  );
}
