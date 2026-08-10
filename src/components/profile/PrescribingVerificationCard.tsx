// Prescribing tier of provider verification, surfaced inside the profile
// Verification tab so prescribers see the same requirements here as they do
// on the locked prescription card in an appointment.
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Pill, ShieldCheck, ArrowUpRight, Clock, AlertCircle } from "lucide-react";

import { isPrescriber } from "@/lib/prescription/store";
import {
  applicationGaps,
  applicationStage,
  completedStepCount,
  loadApplication,
  STEP_ORDER,
  STEP_TITLES,
  stepComplete,
  type ApplicationStage,
  type VerificationApplication,
} from "@/lib/prescription/verificationApplication";
import { localProviderProfile } from "@/lib/prescription/useVerifiedPrescribing";

const STAGE_COPY: Record<ApplicationStage, { label: string; body: string; cta: string }> = {
  "not-started": {
    label: "Not started",
    body: "Prescribing on Lubin needs a separate check of your prescribing credentials. Until that is submitted and verified, the prescription step stays locked on your appointments.",
    cta: "Start prescribing verification",
  },
  "in-progress": {
    label: "In progress",
    body: "You have started your prescribing verification. The items below are still missing, and prescribing stays locked until they are submitted and verified.",
    cta: "Continue prescribing verification",
  },
  submitted: {
    label: "In review",
    body: "Your prescribing credentials are with Lubin for review against the issuing registers. Prescribing unlocks once the review is complete.",
    cta: "View verification status",
  },
};

export function PrescribingVerificationCard() {
  const [profession, setProfession] = useState<string | undefined>(undefined);
  const [app, setApp] = useState<VerificationApplication | null>(null);

  useEffect(() => {
    setProfession(localProviderProfile().profession);
    setApp(loadApplication());
  }, []);

  if (!isPrescriber(profession)) return null;

  const stage = applicationStage(app);
  const copy = STAGE_COPY[stage];
  const gaps = app ? applicationGaps(app) : [];
  const done = app ? completedStepCount(app) : 0;

  return (
    <section className="rounded-[28px] border border-[#E4DAF6] bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F4EEFB] text-[#3D2E6B]">
            <Pill className="h-5 w-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-[#3D2E6B]">Prescribing verification</h3>
              <span
                className={
                  stage === "submitted"
                    ? "inline-flex items-center gap-1 rounded-full bg-[#EFE8FB] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#3D2E6B]"
                    : "inline-flex items-center gap-1 rounded-full bg-[#FBF6E9] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8A6D1F]"
                }
              >
                {stage === "submitted" ? <Clock className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                {copy.label}
              </span>
            </div>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#5B4B85]">{copy.body}</p>
            <p className="mt-2 text-xs text-[#7E6BAF]">
              Separate from practice verification above — being a doctor on Lubin does not by itself grant
              prescribing authority.
            </p>
          </div>
        </div>
        <Link
          to="/prescribing-verification"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#3D2E6B] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2D2250]"
        >
          {copy.cta}
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7E6BAF]">
              Submission steps
            </p>
            <span className="text-xs font-medium text-[#7E6BAF]">
              {done} of {STEP_ORDER.length} complete
            </span>
          </div>
          <ul className="mt-3 space-y-2">
            {STEP_ORDER.map((step, i) => {
              const complete = app ? stepComplete(app, step) : false;
              return (
                <li key={step} className="flex items-center gap-3 text-sm">
                  <span
                    className={
                      complete
                        ? "grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#3D2E6B] text-[11px] font-semibold text-white"
                        : "grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[#D8C7F0] text-[11px] font-semibold text-[#7E6BAF]"
                    }
                  >
                    {complete ? <ShieldCheck className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className={complete ? "text-[#3D2E6B]" : "text-[#5B4B85]"}>
                    {STEP_TITLES[step]}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7E6BAF]">
            {gaps.length > 0 ? "Still needed before you can prescribe" : "Nothing outstanding"}
          </p>
          {gaps.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {gaps.slice(0, 6).map((g) => (
                <li key={g} className="flex gap-2 text-sm text-[#5B4B85]">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7E6BAF]" />
                  {g}
                </li>
              ))}
              {gaps.length > 6 && (
                <li className="text-xs text-[#7E6BAF]">
                  and {gaps.length - 6} more item{gaps.length - 6 === 1 ? "" : "s"}
                </li>
              )}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[#5B4B85]">
              {stage === "submitted"
                ? "Everything you submitted is with Lubin. You will be notified once the review is decided."
                : "Open the verification page to review and submit your credentials."}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
