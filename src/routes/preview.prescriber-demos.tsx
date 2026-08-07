import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { fallbackPrescription } from "@/lib/prescription/demo";
import { savePrescription } from "@/lib/prescription/store";

export const Route = createFileRoute("/preview/prescriber-demos")({
  component: PrescriberDemos,
  head: () => ({
    meta: [
      { title: "Prescriber demo states — Lubin" },
      {
        name: "description",
        content:
          "Open a fixed prescriber demo state — Philippine prescriber, United States prescriber, or a US controlled-substance case requiring EPCS signing.",
      },
      { property: "og:title", content: "Prescriber demo states — Lubin" },
      {
        property: "og:description",
        content: "Deterministic prescribing demo states for reviewing the full signing flow.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type DemoState = {
  key: string;
  title: string;
  detail: string;
  apptId: string;
  provider: { name: string; jurisdictions: ("PH" | "US")[] };
  jurisdiction: "PH" | "US";
  client: string;
  amount: string;
  controlled?: boolean;
};

// Credentials behind these accounts are held by Lubin's verification records and
// never expire on a rolling date, so the full signing flow stays reviewable.
const DEMOS: DemoState[] = [
  {
    key: "ph",
    title: "Philippine prescriber — active credentials",
    detail:
      "Dr. Mateo Reyes, verified for the Philippines with PRC, PTR and S2 on file. Generic prescribing and the PH prescription layout apply.",
    apptId: "preview-rx-ph",
    provider: { name: "Dr. Mateo Reyes", jurisdictions: ["PH"] },
    jurisdiction: "PH",
    client: "Anna Reyes",
    amount: "₱2,500",
  },
  {
    key: "us",
    title: "United States prescriber — active credentials",
    detail:
      "Dr. Ana Villaruel, verified for California with state licence and NPI on file. Standard (non-controlled) signing.",
    apptId: "preview-rx-us",
    provider: { name: "Dr. Ana Villaruel", jurisdictions: ["US"] },
    jurisdiction: "US",
    client: "Grace Miller",
    amount: "$180",
  },
  {
    key: "us-controlled",
    title: "US controlled substance — EPCS signing",
    detail:
      "Dr. James Whitfield, verified DEA authority with a certified EPCS provider, identity proofing and a registered two-factor token.",
    apptId: "preview-rx-us-epcs",
    provider: { name: "Dr. James Whitfield", jurisdictions: ["US"] },
    jurisdiction: "US",
    client: "Daniel Cole",
    amount: "$180",
    controlled: true,
  },
];

function PrescriberDemos() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const open = (demo: DemoState) => {
    try {
      window.localStorage.setItem(
        "lubin.providerProfile.v1",
        JSON.stringify({
          name: demo.provider.name,
          displayName: demo.provider.name,
          profession: "Psychiatrist",
          credentialsVerified: true,
          prescribingCredentialsVerified: true,
          prescribingJurisdictions: demo.provider.jurisdictions,
        }),
      );

      const now = new Date(Date.now() - 60 * 60 * 1000);
      const appt = {
        id: demo.apptId,
        status: "upcoming",
        client: demo.client,
        day: now.toLocaleDateString("en-US", { weekday: "short" }),
        date: String(now.getDate()),
        month: now.toLocaleDateString("en-US", { month: "short" }),
        time: now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        duration: "45 min",
        type: "Psychiatric consultation",
        sessionFormat: "Individual",
        mode: "Video",
        amount: demo.amount,
        paymentStatus: "Paid",
        prescriptionEligible: true,
        jurisdiction: demo.jurisdiction,
        notes:
          "Follow-up for moderate depressive episode. Symptoms partially improved, sleep still disrupted. Discussed medication options, side effects and monitoring plan; patient agreed to continue pharmacological treatment.",
      };

      savePrescription(fallbackPrescription(demo.apptId, false));
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(appt))));
      navigate({
        to: "/appointment/details",
        search: { id: demo.apptId, d: encoded },
      });
    } catch {
      setError("This preview needs browser storage to be enabled.");
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9FF] px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-[22px] font-semibold text-[#2C2B4B]">Prescriber demo states</h1>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#7E6BAF]">
          Each state opens a past psychiatry appointment with clinical notes already recorded, so
          the prescription step is unlocked and the whole signing flow can be reviewed.
        </p>
        {error && <p className="mt-4 text-[13px] text-[#9B4A4A]">{error}</p>}
        <ul className="mt-6 space-y-3">
          {DEMOS.map((demo) => (
            <li key={demo.key}>
              <button
                type="button"
                onClick={() => open(demo)}
                className="flex w-full items-start gap-4 rounded-2xl border border-[#EAE2F6] bg-white px-5 py-4 text-left transition hover:border-[#D6CCEC] hover:bg-[#FCFAFF]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-semibold text-[#2C2B4B]">
                    {demo.title}
                  </span>
                  <span className="mt-1 block text-[13px] leading-relaxed text-[#7E6BAF]">
                    {demo.detail}
                  </span>
                  {demo.controlled && (
                    <span className="mt-2 inline-flex rounded-full bg-[#F1ECFD] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#5A3EB8]">
                      Two-factor EPCS signing
                    </span>
                  )}
                </span>
                <ArrowRight className="mt-1 h-4 w-4 flex-none text-[#A89BD0]" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}