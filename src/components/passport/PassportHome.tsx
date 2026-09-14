import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarCheck,
  Check,
  ClipboardList,
  FileHeart,
  HeartPulse,
  Lock,
  Pill,
  Share2,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  healthDetailsProgress,
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

type PassportDestination = "card" | "share" | "details" | "visits" | "prescriptions" | "patterns";

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

  useEffect(() => {
    ensureSamplePrescriptionRecord();
    const refreshDetails = () => setDetails(loadHealthDetails());
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

  return (
    <section className="space-y-5" aria-label="Health Passport overview">
      <div className="overflow-hidden rounded-[12px] border border-brand-purple/15 bg-card shadow-sm">
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)] lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-brand-purple">
              <FileHeart className="h-4 w-4" />
              <span className="text-[11px] font-bold uppercase tracking-[0.15em]">Health Passport</span>
            </div>
            <h2 className="mt-3 max-w-2xl text-2xl font-bold leading-tight text-brand-purple-dark sm:text-3xl">
              Your health information, ready for your next visit.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-brand-purple-dark/65 sm:text-[15px]">
              Keep your details, visits, medications, and records together. Choose what to share with your care team.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <ActionButton
                icon={UserRound}
                title="Show health card"
                detail="Present a readable summary at your next visit."
                onClick={() => onNavigate("card")}
                primary
              />
              <ActionButton
                icon={Share2}
                title="Use at a clinic"
                detail="Choose the records to share with your care team."
                onClick={() => onNavigate("share")}
              />
              <ActionButton
                icon={ClipboardList}
                title="Review my details"
                detail="Check and update the details saved in your passport."
                onClick={() => onNavigate("details")}
              />
            </div>
          </div>

          <div className="rounded-[12px] bg-brand-purple-dark p-5 text-primary-foreground shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary-foreground/55">Ready to present</p>
                <p className="mt-1 truncate text-lg font-semibold">{name}</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-[8px] bg-primary-foreground/10 px-2 py-1 text-[10px] font-semibold text-primary-foreground/80">
                <Lock className="h-3 w-3" /> Private
              </span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-primary-foreground/10 pt-4">
              <div>
                <p className="text-[10px] uppercase text-primary-foreground/45">Details added</p>
                <p className="mt-1 text-sm font-semibold">{progress.filled} of {progress.total}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-primary-foreground/45">Last reviewed</p>
                <p className="mt-1 text-sm font-semibold">Sep 14, 2026</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-brand-purple/10 bg-brand-lavender/35 px-5 py-4 sm:px-7">
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {readiness.map((item) => (
              <span key={item.label} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-brand-purple-dark/70">
                <span className={`flex h-4 w-4 items-center justify-center rounded-full ${item.ready ? "bg-brand-purple text-primary-foreground" : "border border-brand-purple/25 bg-card text-brand-purple/35"}`}>
                  {item.ready ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
                </span>
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <RecordCard
          icon={CalendarCheck}
          eyebrow="Recent checkup"
          title="Medication review"
          meta="Dr. Reyes Mendoza · Aug 29, 2026"
          detail="Follow-up completed · Review again in four weeks"
          action="View checkups"
          onClick={() => onNavigate("visits")}
        />
        <RecordCard
          icon={Pill}
          eyebrow="Medications"
          title={currentMedication}
          meta={`${prescriptions.length || 1} issued prescription${(prescriptions.length || 1) === 1 ? "" : "s"}`}
          detail={`Allergies: ${allergy}`}
          action="View prescriptions"
          onClick={() => onNavigate("prescriptions")}
        />
        <RecordCard
          icon={ClipboardList}
          eyebrow="Latest result"
          title={latestAttempt?.assessmentName || "Mood & wellbeing check"}
          meta={`${latestStatus} · ${latestAttempt ? new Date(latestAttempt.takenAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Sep 8, 2026"}`}
          detail="Clinically informed check-in · Kept private until you share it"
          action="View results"
          onClick={() => onNavigate("patterns")}
        />
        <RecordCard
          icon={HeartPulse}
          eyebrow="Wellbeing"
          title="Check-ins and patterns"
          meta="Mood, sleep, stress, and what has been helping"
          detail="Mental wellbeing remains part of your whole health picture"
          action="View patterns"
          onClick={() => onNavigate("patterns")}
        />
      </div>
    </section>
  );
}

function RecordCard({
  icon: Icon,
  eyebrow,
  title,
  meta,
  detail,
  action,
  onClick,
}: {
  icon: typeof CalendarCheck;
  eyebrow: string;
  title: string;
  meta: string;
  detail: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <article className="flex min-h-48 flex-col rounded-[12px] border border-brand-purple/15 bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 text-brand-purple">
        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-brand-purple/10"><Icon className="h-4 w-4" /></span>
        <p className="text-[10px] font-bold uppercase tracking-[0.15em]">{eyebrow}</p>
      </div>
      <h3 className="mt-4 text-[16px] font-bold text-brand-purple-dark">{title}</h3>
      <p className="mt-1 text-[12.5px] font-medium text-brand-purple-dark/65">{meta}</p>
      <p className="mt-2 text-[12px] leading-relaxed text-brand-purple-dark/50">{detail}</p>
      <button type="button" onClick={onClick} className="mt-auto flex items-center gap-1 pt-4 text-[12.5px] font-semibold text-brand-purple hover:text-brand-purple-dark">
        {action} <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </article>
  );
}