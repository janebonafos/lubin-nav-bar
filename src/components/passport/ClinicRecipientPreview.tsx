import { useEffect, useState } from "react";
import { CheckCircle2, EyeOff, Info, Stethoscope, UserSquare2 } from "lucide-react";

import DemoQr from "@/components/passport/DemoQr";
import { groupMedications, formatMedDate } from "@/lib/passport/medications";
import { DEMO_RECORDS, formatRecordDate } from "@/lib/passport/records";
import { PASSPORT_VISITS } from "@/lib/passport/visits";

type Recipient = "reception" | "clinician";

/**
 * Simulated clinic-recipient preview. Nothing is sent anywhere: this shows the
 * patient what reception staff would see versus what a clinician would see when
 * a Health Passport is presented at a clinic. Demo data is fictional.
 */
export default function ClinicRecipientPreview({
  patientName = "Maria Santos",
  managedBy = null,
  previousNames = [],
}: {
  patientName?: string;
  /** Account holder's relationship when they manage the passport for the patient. */
  managedBy?: string | null;
  previousNames?: string[];
}) {
  const [recipient, setRecipient] = useState<Recipient>("reception");
  const [meds, setMeds] = useState<ReturnType<typeof groupMedications>>({ current: [], past: [] });

  useEffect(() => {
    setMeds(groupMedications());
  }, []);

  const lastVisit = PASSPORT_VISITS.find((v) => v.kind === "completed");

  return (
    <section
      className="rounded-2xl border border-[#E3DBF5]/60 bg-[#FBF9FF]/90 p-6 shadow-md shadow-[#3D2E6B]/5 backdrop-blur-xl sm:p-8"
      aria-label="Clinic recipient preview"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <h3 className="text-[15px] font-bold text-[#3D2E6B]">
            What the clinic sees when you share
          </h3>
          <p className="mt-1 text-[13px] leading-relaxed text-[#6F6889]">
            Reception staff only need to confirm who you are. A clinician sees the health
            information you chose to share. Switch between the two to see the difference.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#FDF6E7] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#6B4E10]">
          <Info className="h-3.5 w-3.5" /> Simulated preview
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Toggle active={recipient === "reception"} onClick={() => setRecipient("reception")}>
          <UserSquare2 className="h-4 w-4" /> Reception staff
        </Toggle>
        <Toggle active={recipient === "clinician"} onClick={() => setRecipient("clinician")}>
          <Stethoscope className="h-4 w-4" /> Clinician
        </Toggle>
      </div>

      <div className="mt-5 rounded-2xl border border-[#DCD4F0] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EFEAFA] pb-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#A79BC7]">
              {recipient === "reception" ? "Front desk view" : "Consultation view"}
            </p>
            <p className="mt-1 text-[15px] font-bold text-[#2C2B4B]">{patientName}</p>
            <p className="text-[12.5px] text-[#6F6889]">
              Born Apr 12, 1991 · Passport ID LBN-4821-9037
            </p>
          </div>
          <DemoQr seed="LBN-4821-9037" className="h-16 w-16" />
        </div>

        {recipient === "reception" ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Row label="Name on card">
              {patientName}
              {previousNames.length > 0 && (
                <span className="mt-0.5 block text-[12px] font-normal text-[#6F6889]">
                  Previously known as {previousNames.join(", ")}
                </span>
              )}
            </Row>
            {managedBy && (
              <Row label="Account managed by">{managedBy} · acts on the patient's behalf</Row>
            )}
            <Row label="Date of birth">Apr 12, 1991</Row>
            <Row label="Passport ID">LBN-4821-9037</Row>
            <Row label="Contact number">+63 917 555 0134</Row>
            <Row label="Emergency contact">Jose Santos · Brother · +63 917 555 0199</Row>
            <Row label="Appointment">
              {lastVisit ? "Follow-up · Dr. Reyes Mendoza" : "Walk-in"}
            </Row>
            <div className="sm:col-span-2 rounded-xl bg-[#F3F0FA] px-4 py-3">
              <p className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#3D2E6B]">
                <EyeOff className="h-4 w-4" /> Health details are hidden from reception
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-[#6F6889]">
                Medications, allergies, visits, results and wellbeing answers are not shown here.
                Reception can only confirm identity and check you in.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <Block title="Shared by the patient">
              <p className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#256B47]">
                <CheckCircle2 className="h-4 w-4" /> Access valid for 7 days · can be revoked any
                time
              </p>
            </Block>
            <Block title="Allergies and alerts">
              No known drug allergies · No bipolar history reported (patient-provided)
            </Block>
            <Block title="Current medications">
              {meds.current.length ? (
                <ul className="space-y-1.5">
                  {meds.current.map((m) => (
                    <li key={m.id}>
                      <span className="font-semibold text-[#3D2E6B]">
                        {m.name} {m.strength}
                      </span>{" "}
                      · {m.frequency} ·{" "}
                      {m.source === "prescribed"
                        ? `Prescribed${m.prescriber ? ` by ${m.prescriber}` : ""}`
                        : "Patient reports taking"}{" "}
                      · since {formatMedDate(m.startDate)}
                    </li>
                  ))}
                </ul>
              ) : (
                "None recorded"
              )}
            </Block>
            <Block title="Most recent visit">
              {lastVisit
                ? `${lastVisit.reason} · ${lastVisit.clinician} (${lastVisit.clinicianRole}) · ${lastVisit.clinic}`
                : "No completed visits recorded"}
            </Block>
            <Block title="Recent results and records">
              <ul className="space-y-1.5">
                {DEMO_RECORDS.slice(0, 3).map((r) => (
                  <li key={r.id}>
                    <span className="font-semibold text-[#3D2E6B]">{r.title}</span> ·{" "}
                    {formatRecordDate(r.date)} · {r.source}
                  </li>
                ))}
              </ul>
            </Block>
            <Block title="Wellbeing (shared by choice)">
              PHQ-9 score 9 · Mild · Aug 29, 2026 · Daily check-ins show improving sleep over the
              last two weeks
            </Block>
          </div>
        )}
      </div>

      <p className="mt-3 text-[12px] text-[#8A7FB0]">
        Prototype only — no information leaves this device, no clinic account is created, and the QR
        code is decorative.
      </p>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#A79BC7]">{label}</p>
      <p className="mt-0.5 text-[13px] font-medium text-[#3D2E6B]">{children}</p>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#EFEAFA] bg-[#FBF9FF]/70 px-4 py-3">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#A79BC7]">{title}</p>
      <div className="mt-1 text-[12.5px] leading-relaxed text-[#4B4570]">{children}</div>
    </div>
  );
}

function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-10 items-center gap-2 rounded-[12px] px-4 text-[13px] font-semibold transition ${
        active
          ? "bg-[#5B4A93] text-white shadow-sm"
          : "border border-[#DCD4F0] bg-white text-[#5B4B8A] hover:bg-[#F6F4FC]"
      }`}
    >
      {children}
    </button>
  );
}
