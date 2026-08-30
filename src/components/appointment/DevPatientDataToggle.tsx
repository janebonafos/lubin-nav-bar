// Developer-only toggle: fills the patient's clinical profile with the details
// a client would have shared from their Health Passport, so the "everything
// documented" state can be reviewed without completing the sharing flow.
// Flip it off to go straight back to the empty state.
import { useEffect, useState } from "react";
import { FlaskConical } from "lucide-react";
import {
  loadPrescription,
  savePrescription,
  genRxId,
  type PatientSafetyInfo,
} from "@/lib/prescription/store";
import { medSafetySignature, runSafetyReview } from "@/lib/prescription/safety";
import { fallbackPrescription } from "@/lib/prescription/demo";
import { seedDemoSharedGrant, clearDemoSharedGrant } from "@/lib/share/demoSharedGrant";

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
      { id: genRxId(), name: "Anxiety", status: "active", source: "passport", updatedAt: now },
      { id: genRxId(), name: "Bipolar II", status: "active", source: "passport", updatedAt: now },
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

export function DevPatientDataToggle({
  appointmentId,
  providerName = "Dr. Maria Santos",
  appointmentLabel,
}: {
  appointmentId: string;
  providerName?: string;
  appointmentLabel?: string;
}) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    try {
      const rx = loadPrescription(appointmentId);
      setOn(rx.patientInfo?.medicationState === "documented");
    } catch {
      /* noop */
    }
  }, [appointmentId]);

  const fill = () => {
    seedDemoSharedGrant({
      appointmentId,
      providerName,
      appointmentLabel: appointmentLabel ?? "Session review",
    });
    const rx = loadPrescription(appointmentId);
    const base = rx.medications.some((m) => m.name.trim())
      ? rx
      : fallbackPrescription(appointmentId, true);
    const info = sharedPatientInfo();
    const source = base.medications.find((m) => m.name.trim()) ?? base.suggestions?.[0];
    const meds = source
      ? [
          (() => {
            const med = { ...source, approved: false };
            med.checks = runSafetyReview(med, info);
            med.safetySignature = medSafetySignature(med);
            return med;
          })(),
        ]
      : base.medications;
    savePrescription({
      ...base,
      patientInfo: info,
      medications: meds,
      suggestions: [],
      suggestedAt: undefined,
    });
  };

  const clear = () => {
    clearDemoSharedGrant(appointmentId);
    savePrescription(fallbackPrescription(appointmentId, false));
  };

  const toggle = () => {
    try {
      if (on) clear();
      else fill();
      setOn(!on);
    } catch {
      /* storage unavailable */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title="Developer reference only"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-full border border-[#EAE2F6] bg-white/95 px-3.5 py-2 text-[12px] font-semibold text-[#2C2B4B] shadow-lg backdrop-blur transition hover:border-[#D6CCEC]"
    >
      <FlaskConical className="h-3.5 w-3.5 text-[#A89BD0]" />
      <span>Patient data filled</span>
      <span
        className={`relative h-4 w-7 rounded-full transition ${on ? "bg-[#6D4FCF]" : "bg-[#E3DCF2]"}`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${on ? "left-3.5" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}
