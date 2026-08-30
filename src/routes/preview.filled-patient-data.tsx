// Developer preview: opens the Miguel Santos session-review appointment with the
// patient's shared health card data already filled into the prescription's
// clinical profile, so the "everything documented" state can be reviewed
// without completing the client sharing flow by hand.
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, RotateCcw } from "lucide-react";
import { fallbackPrescription } from "@/lib/prescription/demo";
import { savePrescription, genRxId, type PatientSafetyInfo } from "@/lib/prescription/store";
import { medSafetySignature, runSafetyReview } from "@/lib/prescription/safety";
import { seedDemoSharedGrant, clearDemoSharedGrant } from "@/lib/share/demoSharedGrant";

export const Route = createFileRoute("/preview/filled-patient-data")({
  component: FilledPatientDataPreview,
  head: () => ({
    meta: [
      { title: "Preview: patient data already filled — Lubin" },
      {
        name: "description",
        content:
          "Open the prescriber workspace with the patient's shared health card details already documented, to review the filled clinical profile and safety review.",
      },
      { property: "og:title", content: "Preview: patient data already filled — Lubin" },
      {
        property: "og:description",
        content:
          "Prescriber workspace preview with a complete clinical profile sourced from the client's shared health card.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const APPT_ID = "c9";
const CLIENT = "Miguel Santos";

const APPOINTMENT = {
  id: APPT_ID,
  client: CLIENT,
  day: "SUN",
  date: "30",
  month: "AUG",
  time: "4:00 PM",
  timezone: "PHT (GMT+8)",
  duration: "30 min",
  type: "Psychiatry consultation (medication review)",
  sessionFormat: "Individual",
  mode: "Video",
  status: "session_review",
  notes:
    "Discussed low mood and poor sleep over the past two months. No current medication. Agreed to consider starting treatment.",
  amount: "₱3,200",
  paymentStatus: "Paid",
  prescriptionEligible: true,
  payoutStatus: "pending_review",
};

/** Clinical profile matching the details the client shared on their health card. */
function sharedPatientInfo(): PatientSafetyInfo {
  const now = Date.now();
  return {
    allergyState: "documented",
    allergyEntries: [
      {
        id: genRxId(),
        name: "Penicillin",
        detail: "Rash reported in childhood",
        status: "active",
        reactionType: "allergy",
        severity: "moderate",
        source: "passport",
        updatedAt: now,
      },
    ],
    medicationState: "documented",
    medicationEntries: [
      {
        id: genRxId(),
        name: "Sertraline",
        strength: "50 mg",
        dose: "50 mg",
        frequency: "Every morning",
        route: "Oral",
        taking: "yes",
        status: "active",
        source: "passport",
        updatedAt: now,
      },
    ],
    conditionState: "documented",
    conditionEntries: [
      {
        id: genRxId(),
        name: "Anxiety",
        status: "active",
        source: "passport",
        updatedAt: now,
      },
      {
        id: genRxId(),
        name: "Bipolar II",
        status: "active",
        source: "passport",
        updatedAt: now,
      },
    ],
    pregnancyStatus: "not-applicable",
    bipolarHistory: "present",
    bipolarDetail: "Bipolar II reported on the client's shared health card",
    dob: "1994-03-03",
    sex: "male",
    address: "24 Mabini Street, Quezon City, Metro Manila",
    encounterLocation: "Quezon City, Philippines",
    phone: "+63 917 555 0142",
    email: "miguel.santos@example.com",
    labs: "Thyroid function and liver panel within normal range",
    labsAt: new Date(now - 21 * 86_400_000).toISOString().slice(0, 10),
    updatedAt: now,
  };
}

function FilledPatientDataPreview() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [cleared, setCleared] = useState(false);

  const openFilled = () => {
    try {
      window.localStorage.setItem(
        "lubin.providerProfile.v1",
        JSON.stringify({
          name: "Dr. Maria Santos",
          displayName: "Dr. Maria Santos",
          profession: "Psychiatrist",
          credentialsVerified: true,
          prescribingCredentialsVerified: true,
          prescribingJurisdictions: ["PH", "US"],
        }),
      );

      // The client shared their health card for this appointment.
      seedDemoSharedGrant({
        appointmentId: APPT_ID,
        providerName: "Dr. Maria Santos",
        appointmentLabel: "Psychiatry consultation · Sun 30 Aug, 4:00 PM",
      });

      const rx = fallbackPrescription(APPT_ID, true);
      const info = sharedPatientInfo();
      const med = { ...(rx.suggestions?.[0] ?? rx.medications[0]) } as NonNullable<
        typeof rx.suggestions
      >[number];
      med.approved = false;
      med.checks = runSafetyReview(med, info);
      med.safetySignature = medSafetySignature(med);

      savePrescription({
        ...rx,
        patientInfo: info,
        medications: [med],
        suggestions: [],
        suggestedAt: undefined,
      });

      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(APPOINTMENT))));
      navigate({ to: "/appointment/details", search: { id: APPT_ID, d: encoded } });
    } catch {
      setError("This preview needs browser storage to be enabled.");
    }
  };

  const reset = () => {
    try {
      clearDemoSharedGrant(APPT_ID);
      savePrescription(fallbackPrescription(APPT_ID, false));
      setCleared(true);
    } catch {
      setError("This preview needs browser storage to be enabled.");
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9FF] px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-[22px] font-semibold text-[#2C2B4B]">
          Patient data already filled — preview
        </h1>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#7E6BAF]">
          Opens {CLIENT}&rsquo;s session review (Sun 30 Aug, 4:00 PM) as if the client had already
          shared their health card: allergies, current medication, conditions, bipolar history, date
          of birth, pregnancy status and recent labs are documented, and the medication is in the
          prescription so the safety review reflects a complete profile.
        </p>
        {error && <p className="mt-4 text-[13px] text-[#9B4A4A]">{error}</p>}
        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={openFilled}
            className="flex w-full items-start gap-4 rounded-[12px] border border-[#EAE2F6] bg-white px-5 py-4 text-left transition hover:border-[#D6CCEC] hover:bg-[#FCFAFF]"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-semibold text-[#2C2B4B]">
                Open with the shared data filled in
              </span>
              <span className="mt-1 block text-[13px] leading-relaxed text-[#7E6BAF]">
                Clinical profile complete, sourced from the client&rsquo;s shared health card.
              </span>
            </span>
            <ArrowRight className="mt-1 h-4 w-4 flex-none text-[#A89BD0]" />
          </button>
          <button
            type="button"
            onClick={reset}
            className="flex w-full items-start gap-4 rounded-[12px] border border-[#EAE2F6] bg-white px-5 py-4 text-left transition hover:border-[#D6CCEC] hover:bg-[#FCFAFF]"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-semibold text-[#2C2B4B]">
                Reset back to the empty state
              </span>
              <span className="mt-1 block text-[13px] leading-relaxed text-[#7E6BAF]">
                {cleared
                  ? "Cleared — nothing shared, nothing documented."
                  : "Removes the shared health card and clears the documented profile."}
              </span>
            </span>
            <RotateCcw className="mt-1 h-4 w-4 flex-none text-[#A89BD0]" />
          </button>
        </div>
      </div>
    </div>
  );
}
